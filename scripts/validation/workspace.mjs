import { cp, lstat, mkdir, mkdtemp, realpath, rm, symlink, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const inputs = ['src', 'public', 'supabase', 'tests', 'scripts', 'docs', 'package.json',
  'package-lock.json', 'next.config.mjs', 'next-env.d.ts', 'tsconfig.json',
  'tailwind.config.ts', 'tailwind.config.js', 'postcss.config.mjs', 'postcss.config.js',
  'vitest.config.mjs', 'playwright.config.ts', '.nvmrc'];

export async function createValidationWorkspace(source, { linkDependencies = true } = {}) {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, 'tethera-validation-'));
  // Retain the exact created/resolved path so cleanup cannot escape this directory.
  const resolved = await realpath(root);
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('tethera-validation-')) {
    throw new Error('Invalid validation workspace.');
  }
  const dependencies = path.join(resolved, 'node_modules');
  let linked = false;
  try {
    for (const name of inputs) {
      const input = path.join(source, name);
      try { await lstat(input); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      await cp(input, path.join(resolved, name), { recursive: true, filter: async candidate => {
        if (path.basename(candidate).startsWith('.env')) return false;
        return !(await lstat(candidate)).isSymbolicLink();
      } });
    }
    if (linkDependencies) {
      await symlink(await realpath(path.join(source, 'node_modules')), dependencies,
        process.platform === 'win32' ? 'junction' : 'dir');
      linked = true;
    }
    await mkdir(path.join(resolved, '.validation-home'), { recursive: true });
    return { root: resolved, async dispose() {
      // Unlink the dependency junction before recursive removal; never traverse it.
      if (linked) { await unlink(dependencies); linked = false; }
      if (await realpath(resolved) !== resolved || path.dirname(resolved) !== parent) {
        throw new Error('Validation cleanup target changed.');
      }
      await rm(resolved, { recursive: true, force: true, maxRetries: 3 });
    } };
  } catch (error) {
    if (linked) await unlink(dependencies);
    await rm(resolved, { recursive: true, force: true, maxRetries: 3 });
    throw error;
  }
}
