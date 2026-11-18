// Preloaded into validation processes and inherited by their Node subprocesses.
// Package/browser installation is a separate, explicitly networked stage.
const net = require('node:net');
const { syncBuiltinESMExports } = require('node:module');
function isLocal(host) {
  return host === undefined || host === '' || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(host).toLowerCase());
}
function reject() {
  const error = new Error('Outbound network is disabled during isolated validation.');
  error.code = 'ERR_VALIDATION_NETWORK';
  throw error;
}
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let options = args[0];
  if (Array.isArray(options)) options = options[0];
  if (options && typeof options === 'object') {
    if (!options.path && !isLocal(options.host || options.hostname)) reject();
  } else if (typeof options === 'number' && !isLocal(typeof args[1] === 'string' ? args[1] : undefined)) reject();
  return connect.apply(this, args);
};
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, ...rest) {
  const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!isLocal(target.hostname) || !['http:', 'https:'].includes(target.protocol)) reject();
  return originalFetch.call(this, input, ...rest);
};
syncBuiltinESMExports();
