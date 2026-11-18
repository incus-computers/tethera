export function contentSecurityPolicy(nonce: string, development: boolean) {
  return ["default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""} https://maps.googleapis.com https://maps.gstatic.com`,
    "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com", "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://images.unsplash.com https://plus.unsplash.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.tile.openstreetmap.org https://unpkg.com",
    `connect-src 'self'${development ? " ws: wss:" : ""} https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.tile.openstreetmap.org`,
    "frame-src https://app.sandbox.midtrans.com https://app.midtrans.com", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"].join("; ");
}
