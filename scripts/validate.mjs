import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { validationEnvironment } from './validation/environment.mjs';
import { createValidationWorkspace } from './validation/workspace.mjs';

const source = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const stageAt = args.indexOf('--stage');
const stage = stageAt < 0 ? 'all' : args[stageAt + 1];
if (!['all', 'unit', 'build', 'browser'].includes(stage) || args.some(a => !['--stage', stage, '--clean-install'].includes(a))) {
  throw new Error('Usage: npm run validate -- [--stage unit|build|browser|all] [--clean-install]');
}
const expectedNode = (await readFile(path.join(source, '.nvmrc'), 'utf8')).trim();
if (process.versions.node !== expectedNode) throw new Error(`Use Node ${expectedNode} from .nvmrc for reproducible validation.`);
const reportRoot = path.join(source, 'validation-results', `${new Date().toISOString().replace(/[:.]/g, '-')}-${stage}`);
await mkdir(reportRoot, { recursive: true });
const workspace = await createValidationWorkspace(source, { linkDependencies: !args.includes('--clean-install') });
const require = createRequire(path.join(workspace.root, 'package.json'));
const env = validationEnvironment(process.env, { APP_ENV: 'validation',
  VALIDATION_RESULTS_DIR: reportRoot,
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.platform === 'win32' ? (process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local')) : process.platform === 'darwin' ? path.join(homedir(), 'Library', 'Caches') : (process.env.XDG_CACHE_HOME || path.join(homedir(), '.cache')), 'ms-playwright'), NODE_OPTIONS: '--require ./scripts/validation/block-network.cjs',
  NEXT_DIST_DIR: '.next-validation', APP_URL: 'http://127.0.0.1:3217',
  BACKGROUND_JOB_SECRET: 'isolated-worker-fixture-not-a-real-secret',
  HOME: path.join(workspace.root, '.validation-home'),
  USERPROFILE: path.join(workspace.root, '.validation-home'),
});
const results = [];
async function run(name, executable, commandArgs, extra = {}) {
  console.log(`\n[validation] ${name}`);
  const started = Date.now();
  const code = await new Promise((resolve, reject) => {
    const child = spawn(executable, commandArgs, { cwd: workspace.root, env: { ...env, ...extra }, stdio: 'inherit', shell: false, windowsHide: true });
    child.once('error', reject);
    child.once('exit', (exitCode, signal) => resolve(signal ? 1 : exitCode ?? 1));
  });
  results.push({ name, code, milliseconds: Date.now() - started });
  if (code !== 0) throw new Error(`${name} failed (exit ${code}).`);
}
let failed = false;
try {
  if (args.includes('--clean-install')) {
    const npmCli = process.env.npm_execpath;
    if (!npmCli) throw new Error('Invoke --clean-install through npm run validate.');
    const npmConfig = path.join(workspace.root, '.validation-npmrc');
    await writeFile(npmConfig, 'registry=https://registry.npmjs.org/\naudit=false\nfund=false\n');
    await run('Clean locked dependency install', process.execPath, [npmCli, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
      NODE_OPTIONS: '', NPM_CONFIG_USERCONFIG: npmConfig, NPM_CONFIG_GLOBALCONFIG: npmConfig + '.global',
    });
  }
  if (stage === 'unit' || stage === 'all') {
    await run('Unit, API, migration and security regressions', process.execPath, [path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs'), 'run'], { APP_ENV: 'demo', NODE_ENV: 'test' });
    await run('TypeScript', process.execPath, [require.resolve('typescript/bin/tsc'), '--noEmit', '--incremental', 'false', '--pretty', 'false']);
  }
  if (stage === 'build' || stage === 'all') {
    await run('Isolated production compilation', process.execPath, [require.resolve('next/dist/bin/next'), 'build'], { NODE_ENV: 'production' });
  }
  if (stage === 'browser' || stage === 'all') {
    await run('Desktop and mobile dummy browser journeys', process.execPath, [require.resolve('@playwright/test/cli'), 'test'], { NODE_ENV: 'test' });
  }
} catch (error) {
  failed = true;
  console.error(`[validation] ${error.message}`);
} finally {
  await writeFile(path.join(reportRoot, 'summary.json'), JSON.stringify({ passed: !failed, node: process.version, stage, results }, null, 2));
  await workspace.dispose();
}
console.log(`[validation] Reports: ${path.relative(source, reportRoot)}`);
process.exitCode = failed ? 1 : 0;
