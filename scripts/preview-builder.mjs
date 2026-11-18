// Run the current builder in a disposable demo copy, without reading .env.local.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createValidationWorkspace } from './validation/workspace.mjs';
import { validationEnvironment } from './validation/environment.mjs';

const source = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const workspace = await createValidationWorkspace(source);
const require = createRequire(path.join(workspace.root, 'package.json'));
const origin = 'http://127.0.0.1:3219';
const env = validationEnvironment(process.env, {
  APP_ENV: 'demo', NODE_ENV: 'development', APP_URL: origin, NEXT_DIST_DIR: '.next-builder-preview',
  HOME: path.join(workspace.root, '.validation-home'), USERPROFILE: path.join(workspace.root, '.validation-home'),
});
console.log(`Builder demo: ${origin}/builder`);
console.log(`Prebuilt editing example: ${origin}/products/pb-1 (Customize this PC)`);
console.log('Disposable sample data. No environment files or real provider credentials are loaded.');
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3219'], {
  cwd: workspace.root, env, stdio: 'inherit', windowsHide: true,
});
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (!stopping) { stopping = true; child.kill(signal); }
});
try {
  process.exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 0));
  });
} finally { await workspace.dispose(); }
