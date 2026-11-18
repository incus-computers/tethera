import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
process.env.APP_ENV = 'demo';
process.env.NODE_ENV = 'development';
process.env.NEXT_DIST_DIR = '.next-validation-demo';
process.argv = [process.execPath, require.resolve('next/dist/bin/next'), 'dev',
  '--hostname', '127.0.0.1', '--port', '3217'];
await import(pathToFileURL(require.resolve('next/dist/bin/next')).href);
