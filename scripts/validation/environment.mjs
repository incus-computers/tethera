// Application processes receive only OS essentials and explicit synthetic settings.
/** @param {Record<string, string | undefined>} source
 * @param {Record<string, string>} extra
 * @returns {Record<string, string | undefined>} */
export function validationEnvironment(source = process.env, extra = {}) {
  const allowed = new Set(['path', 'pathext', 'systemroot', 'windir', 'comspec', 'temp', 'tmp',
    'userprofile', 'homedrive', 'homepath', 'home', 'appdata', 'localappdata',
    'number_of_processors', 'processor_architecture', 'lang', 'lc_all',
    'playwright_browsers_path']);
  const env = Object.fromEntries(Object.entries(source).filter(([key]) => allowed.has(key.toLowerCase())));
  return { ...env, NEXT_TELEMETRY_DISABLED: '1', NOTIFICATIONS_ENABLED: 'false',
    WHATSAPP_ENABLED: 'false', MIDTRANS_PRODUCTION_ENABLED: 'false',
    BITESHIP_PRODUCTION_ENABLED: 'false', MIDTRANS_REFUNDS_ENABLED: 'false',
    TAX_POLICY_CONFIRMED: 'false', CI: '1', ...extra };
}
