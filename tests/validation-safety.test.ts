import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// These tests validate the isolation mechanism rather than only its source text.
describe('validation isolation', () => {
  it('drops inherited provider tokens and Node preload options', async () => {
    const { validationEnvironment } = await import('../scripts/validation/environment.mjs');
    const result = validationEnvironment({ PATH: '/synthetic/bin', SYSTEMROOT: 'C:\\Windows',
      SUPABASE_SERVICE_ROLE_KEY: 'synthetic-secret', AWS_SECRET_ACCESS_KEY: 'synthetic-secret',
      RESEND_API_KEY: 'synthetic-secret', NODE_OPTIONS: '--require unexpected.cjs' });
    expect(result.PATH).toBe('/synthetic/bin');
    expect(result.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(result.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(result.RESEND_API_KEY).toBeUndefined();
    expect(result.NODE_OPTIONS).toBeUndefined();
    expect(result.NOTIFICATIONS_ENABLED).toBe('false');
  });

  it('copies source without env files and unlinks dependencies without deleting them', async () => {
    const { createValidationWorkspace } = await import('../scripts/validation/workspace.mjs');
    const fixture = await mkdtemp(path.join(tmpdir(), 'tethera-isolation-fixture-'));
    let workspace: any;
    try {
      await mkdir(path.join(fixture, 'src'));
      await mkdir(path.join(fixture, 'node_modules'));
      await writeFile(path.join(fixture, '.env.local'), 'PRIVATE_FIXTURE=must-not-copy');
      await writeFile(path.join(fixture, 'src', '.env.nested'), 'PRIVATE_FIXTURE=must-not-copy');
      await writeFile(path.join(fixture, 'src', 'sample.ts'), 'export const example = true;');
      await writeFile(path.join(fixture, 'node_modules', 'retained.txt'), 'dependency fixture');
      workspace = await createValidationWorkspace(fixture);
      expect(await readFile(path.join(workspace.root, 'src', 'sample.ts'), 'utf8')).toContain('example');
      await expect(access(path.join(workspace.root, '.env.local'))).rejects.toBeDefined();
      await expect(access(path.join(workspace.root, 'src', '.env.nested'))).rejects.toBeDefined();
      await workspace.dispose(); workspace = null;
      expect(await readFile(path.join(fixture, 'node_modules', 'retained.txt'), 'utf8')).toBe('dependency fixture');
    } finally {
      if (workspace) await workspace.dispose();
      const target = path.resolve(fixture);
      if (path.dirname(target) !== path.resolve(tmpdir()) || !path.basename(target).startsWith('tethera-isolation-fixture-')) throw new Error('Unsafe fixture cleanup.');
      await rm(target, { recursive: true, force: true });
    }
  });

  it('blocks real external fetch and raw sockets before connection, while allowing local fixtures', () => {
    const guard = path.resolve('scripts/validation/block-network.cjs');
    const script = `
      const net = require('node:net');
      const http = require('node:http');
      (async () => {
        try { await fetch('https://example.invalid/private'); process.exit(2); }
        catch (error) { if (error.code !== 'ERR_VALIDATION_NETWORK') throw error; }
        const socket = new net.Socket();
        try { socket.connect(443, 'example.invalid'); process.exit(3); }
        catch (error) { if (error.code !== 'ERR_VALIDATION_NETWORK') throw error; }
        const server = http.createServer((req, res) => res.end('fixture'));
        server.listen(0, '127.0.0.1', async () => {
          try {
            const response = await fetch('http://127.0.0.1:' + server.address().port);
            if (await response.text() !== 'fixture') process.exitCode = 4;
          } finally { server.closeAllConnections(); server.close(); }
        });
      })().catch(() => process.exit(5));
    `;
    const result = spawnSync(process.execPath, ['--require', guard, '-e', script], { encoding: 'utf8', timeout: 10000, windowsHide: true });
    expect(result.status, result.stderr).toBe(0);
  });
});
