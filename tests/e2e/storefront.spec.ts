import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const origin = 'http://127.0.0.1:3217';
test.beforeEach(async ({ context, request }) => {
  await context.addCookies([{name:"tethera_locale",value:"en",url:origin}]);
  const environment = await request.get('/api/auth/environment');
  expect(environment.ok()).toBe(true);
  expect((await environment.json()).demo).toBe(true);
  expect((await request.get('/api/storefront')).status()).toBe(200);
  // Compile/check the public reviews route before the browser fans out requests.
  // This also catches HTTP-level failures that direct route unit tests cannot see.
  expect((await request.get('/api/products/ram-1/reviews')).status()).toBe(200);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    // CDN images are synthetic fixtures; local images exercise the real optimizer.
    const imageSource = url.pathname === '/_next/image' ? url.searchParams.get('url') : url.pathname;
    if (route.request().resourceType() === 'image' && !imageSource?.startsWith('/api/uploads/') && imageSource !== '/incus-logo.png') {
      await route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1cAAAAASUVORK5CYII=', 'base64') });
    } else if (url.origin === origin) await route.continue();
    else await route.abort('blockedbyclient');
  });
});

test('real optimized images load and the storefront stays English without the retired top bar',async({page,context,request})=>{
  await context.addCookies([{name:'tethera_locale',value:'id',url:origin}]);
  const html=await(await request.get('/')).text();expect(html).toContain('lang="en"');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByLabel('Bahasa / Language',{exact:true})).toHaveCount(0);
  await expect(page.getByText(/Delivery within Indonesia.*Prices in Rupiah/)).toHaveCount(0);
  const src='/_next/image?url=%2Fincus-logo.png&w=256&q=75';
  const response=await request.get(src);expect(response.status()).toBe(200);expect(response.headers()['content-type']).toMatch(/^image\//);
  expect((await sharp(await response.body()).metadata()).width).toBeGreaterThan(0);
  await page.evaluate(src=>{const img=document.createElement('img');img.alt='Optimizer regression image';img.src=src;document.body.appendChild(img);},src);
  await expect.poll(()=>page.getByAltText('Optimizer regression image').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
});

test('staff can upload a real image in the dummy product gallery', async ({ page, request }) => {
  // Finish the development server's initial compilation before a browser starts
  // fetching its chunks; no response is substituted or retried.
  expect((await request.get('/admin')).status()).toBe(200);
  const hydrated = page.waitForResponse(r => r.url().endsWith('/api/auth/environment'), { timeout: 45000 });
  await page.goto('/admin');
  expect((await (await hydrated).json()).demo).toBe(true);
  await page.getByRole('button', { name: 'SUPER ADMIN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'SUPER ADMIN', exact: true })).toHaveCount(0);
  if(await page.getByRole('button',{name:'Open navigation menu',exact:true}).isVisible())await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
  await page.getByRole('button', { name: /^Products/ }).first().click();
  await page.getByRole('button', { name: 'Add Product', exact: true }).click();
  const bytes = await sharp({ create: { width: 32, height: 24, channels: 3, background: 'green' } }).png().toBuffer();
  const upload = page.waitForResponse(r => r.url().endsWith('/api/admin/upload') && r.request().method() === 'POST');
  await page.locator('input[type="file"]').last().setInputFiles({ name: 'browser-fixture.png', mimeType: 'image/png', buffer: bytes });
  const response = await upload;
  expect(response.status()).toBe(200);
  const result = await response.json();
  const served = await page.request.get(result.url);
  expect(served.status()).toBe(200);
  expect(served.headers()['content-type']).toBe('image/webp');
  expect(served.headers()['x-content-type-options']).toBe('nosniff');
  expect((await sharp(await served.body()).metadata()).width).toBe(32);
  const preview = page.getByAltText('Product photo 1', { exact: true });
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(32);
  const rejected = await page.request.post('/api/admin/upload', { multipart: {
    file: { name: 'active.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg onload="alert(1)"/>') },
  } });
  expect(rejected.status()).toBe(415);
  const retired = await page.request.get('/uploads/legacy.svg');
  expect(retired.status()).toBe(404);
});

test('variant cart, verified quote, dummy payment and original invoice agree', async ({ page, context }, testInfo) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/products/ram-1?variation=ram-1-white-32');
  await expect(page.getByText(/Demo environment.*simulated transactions/)).toBeVisible();
  const simulator = page.getByRole('region', { name: 'Delivery Simulation' });
  await simulator.getByRole('textbox', { name: 'Postcode', exact: true }).fill('10730');
  const estimateRequest = page.waitForRequest(r => r.url().endsWith('/api/shipping/product-estimate'));
  await simulator.getByRole('button', { name: 'Estimate delivery' }).click();
  expect((await estimateRequest).postDataJSON()).toEqual({ productId: 'ram-1', variantId: 'ram-1-white-32', quantity: 1, postalCode: '10730' });
  await expect(simulator.getByRole('heading', { name: 'Delivery Type', exact: true })).toBeVisible();
  await expect(simulator.getByRole('radio')).toHaveCount(3);
  await simulator.getByText('Standard Delivery', { exact: true }).click();
  await expect(simulator.getByRole('radio', { name: /Standard Delivery/ })).toBeChecked();
  const courier = simulator.getByRole('button', { pressed: false }).filter({ hasText: 'Rp' }).first();
  await courier.click();
  await expect(simulator.getByRole('button', { pressed: true })).toBeHidden();
  await expect(simulator.getByRole('radio', { name: /Standard Delivery.*Rp/ })).toBeChecked();
  await simulator.getByText('Standard Delivery', { exact: true }).click();
  await expect(simulator.getByRole('button', { pressed: true })).toBeVisible();
  for (const [action, quantity] of [['Increase', 2], ['Decrease', 1]] as const) {
    const refreshed = page.waitForResponse(response => response.url().endsWith('/api/shipping/product-estimate') &&
      response.request().postDataJSON()?.quantity === quantity);
    await page.getByRole('button', { name: `${action} quantity`, exact: true }).click();
    const estimate = await refreshed;
    expect(estimate.ok()).toBe(true);
    expect(estimate.request().postDataJSON().postalCode).toBe('10730');
    await expect(simulator.getByRole('radio', { name: /Standard Delivery.*Rp/ })).toBeChecked();
    await expect(simulator.getByRole('textbox', { name: 'Postcode', exact: true })).toHaveValue('10730');
  }
  await page.getByRole('button', { name: 'Add to Shopping Cart', exact: true }).click();
  const cart = page.getByRole('dialog', { name: 'Shopping Cart', exact: true });
  await expect(cart.getByText('Delivery Option', { exact: true })).toHaveCount(0);
  await expect(cart.getByText('Delivery is calculated at checkout.')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to checkout', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('radio', { name: /Click and Collect/ })).toBeChecked();
  await expect(page.locator('[data-persistent-header]')).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Contact the store', exact: true })).toHaveCount(0);
  await page.getByLabel('Email address', { exact: true }).fill('browser-buyer@example.test');
  await page.getByLabel('Contact phone', { exact: true }).fill('081234567890');
  await page.getByLabel('Pickup name', { exact: true }).fill('Browser Fixture');
  if (!await page.getByRole('button', { name: 'Review current total' }).isVisible()) {
    await page.getByRole('button', { name: /Show order summary/ }).click();
  }
  const quoteResponse = page.waitForResponse(r => r.url().endsWith('/api/checkout/quote') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Review current total' }).click();
  const quote = await (await quoteResponse).json();
  expect(quote.success, JSON.stringify(quote)).toBe(true);
  expect(quote.total).toBe(2349000);
  expect(quote.financialSnapshot.netAmount + quote.financialSnapshot.taxAmount).toBe(quote.total);
  await page.getByRole('checkbox',{name:'I accept the purchase terms and warranty policy',exact:true}).check();
  const createdResponse = page.waitForResponse(r => r.url().endsWith('/api/checkout/create-order'));
  await page.getByRole('button', { name: /^Pay now - / }).click();
  const created = await (await createdResponse).json();
  expect(created.success).toBe(true);
  await expect(page).toHaveURL(/\/checkout\/success\?orderNumber=/);
  await expect(page.getByRole('heading', { name: 'Payment received', exact: true })).toBeVisible();
  await expect(page.locator('[data-persistent-header]')).toBeVisible();
  const response = await page.request.get(`/api/orders/invoice?orderNumber=${encodeURIComponent(created.orderNumber)}`);
  const { document } = await response.json();
  expect(document.grandTotal).toBe(quote.total);
  expect(document.financialSnapshot).toEqual(quote.financialSnapshot);
  expect(document.financialSnapshot.lines[0].sku).toBe('COR-CMH32GX5M2B6000C30-W');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download invoice', exact: true }).click();
  const download = await downloadEvent;
  const invoiceFile = testInfo.outputPath('dummy-invoice.html');
  await download.saveAs(invoiceFile);
  const html = await readFile(invoiceFile, 'utf8');
  expect(html).toContain(created.orderNumber);
  expect(html).toContain('COR-CMH32GX5M2B6000C30-W');
  expect(html).toContain('2.349.000');
  expect(html).not.toContain('Official digital tax invoice');
  const resend = page.waitForResponse(r => r.url().endsWith('/api/orders/invoice/send'));
  await page.getByRole('button', { name: 'Resend invoice email', exact: true }).click();
  expect((await resend).status()).toBe(202);
  await expect(page.getByRole('status').filter({ hasText: 'Invoice email queued.' })).toBeVisible();
  const outsider = await context.browser()!.newContext();
  try { expect((await outsider.request.get(`${origin}/api/orders/invoice?orderNumber=${encodeURIComponent(created.orderNumber)}`)).status()).toBe(404); }
  finally { await outsider.close(); }
});

test('payment steps hide storefront navigation and keep payment status controls available', async ({ page, context }, testInfo) => {
  let checks = 0;
  await context.route('**/api/checkout/midtrans/status', async route => {
    checks++;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, state: 'pending' }) });
  });
  await page.goto('/checkout/payment?orderId=fixture-payment');
  await expect(page.getByRole('heading', { name: 'Payment status', exact: true })).toBeVisible();
  await expect(page.locator('[data-persistent-header]')).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Contact the store', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Contact the store', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check payment', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Check payment', exact: true }).click();
  await expect.poll(() => checks).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole('link', { name: 'View orders', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('focused-payment.png'), fullPage: true });
  await page.getByRole('link', { name: 'Return to checkout', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator('[data-persistent-header]')).toHaveCount(0);
  await page.goto('/components');
  await expect(page.locator('[data-persistent-header]')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('unpaid checkout cannot forge a bill or show a fabricated paid success', async ({ page, context }) => {
  await page.goto('/checkout/success?orderNumber=NOT-AN-OWNED-ORDER');
  await expect(page.getByRole('alert').filter({ hasText: 'Order not found' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Payment received' })).toHaveCount(0);
  await page.request.get('/api/checkout/session');
  const draft = { customer: { name: 'Negative Fixture', email: 'negative@example.test', phone: '081234567890' },
    fulfillmentType: 'click_and_collect', items: [{ id: 'cpu-1', quantity: 1, price: 1 }], total: 1 };
  const quoted = await page.request.post('/api/checkout/quote', { data: draft });
  const quote = await quoted.json();
  expect(quote.total).toBeGreaterThan(1);
  const key = randomUUID();
  expect((await page.request.post('/api/checkout/create-order', { data: { ...draft, expectedTotal: 1 }, headers: { 'Idempotency-Key': key } })).status()).toBe(409);
  const confirmed={...draft,expectedTotal:quote.total,policyAcceptance:{accepted:true,version:quote.policy.version,hash:quote.policy.hash,locale:"en"}};
  const saved = await page.request.post('/api/checkout/create-order', { data: confirmed, headers: { 'Idempotency-Key': key } });
  const order = await saved.json();
  expect(saved.status()).toBe(200);
  const replay = await page.request.post('/api/checkout/create-order', { data: confirmed, headers: { 'Idempotency-Key': key } });
  expect((await replay.json()).orderId).toBe(order.orderId);
  await page.goto(`/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}`);
  await expect(page.getByRole('heading', { name: 'Order received', exact: true })).toBeVisible();
  await expect(page.getByText(/payment is not confirmed yet/i)).toBeVisible();
  const outsider = await context.browser()!.newContext();
  try { expect((await outsider.request.get(`${origin}/api/admin/jobs`)).status()).toBe(401); }
  finally { await outsider.close(); }
});

test('customer sign-in and the admin dummy queue work through the browser', async ({ page }) => {
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
  await page.locator('#signin-identifier').fill('alex.gamer@example.com');
  await page.locator('#signin-password').fill('DemoOnly-2026!');
  await page.locator('form').filter({ has: page.locator('#signin-password') }).getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  const me = await page.request.get('/api/auth/me');
  expect((await me.json()).user.email).toBe('alex.gamer@example.com');
  await page.goto('/privacy/requests');
  await expect(page.getByRole('heading', {name:'Personal data requests',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Download account JSON',exact:true})).toBeDisabled();
  const sentCode=page.waitForResponse(r=>r.url().endsWith('/api/auth/send-otp'));
  await page.getByRole('button',{name:'Send fresh code',exact:true}).click();
  const codeReceipt=await(await sentCode).json();expect(codeReceipt.demo).toBe(true);
  await page.getByLabel('Verification code',{exact:true}).fill(codeReceipt.demoCode);
  await page.getByRole('button',{name:'Verify code',exact:true}).click();
  await expect(page.getByRole('button',{name:'Download account JSON',exact:true})).toBeEnabled();
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download account JSON',exact:true}).click();
  const download=await downloadEvent;const exported=JSON.parse(await readFile((await download.path())!,'utf8'));
  expect(exported.profile.email).toBe('alex.gamer@example.com');
  expect(JSON.stringify(exported)).not.toMatch(/token_hash|internal_evidence|password|cost_price/);
  await page.getByRole('combobox',{name:'Request type',exact:true}).selectOption('erasure');
  await page.getByLabel('Details (optional; do not send passwords or identity documents)',{exact:true}).fill('Dummy erasure request; assess retention before any action.');
  const submittedRequest=page.waitForResponse(r=>r.url().endsWith('/api/account/privacy')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Submit data request',exact:true}).click();
  const privacyReceipt=await(await submittedRequest).json();expect(privacyReceipt.success).toBe(true);
  await expect(page.getByRole('status').filter({hasText:'Request received for review.'})).toBeVisible();
  await page.goto('/admin');
  await page.getByRole('button', { name: 'SUPER ADMIN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'SUPER ADMIN', exact: true })).toHaveCount(0);
  // Select Orders using the real navigation after staff authentication.
  if(await page.getByRole("button",{name:"Open navigation menu",exact:true}).isVisible())await page.getByRole("button",{name:"Open navigation menu",exact:true}).click();
  await page.getByRole('button', { name: /^Orders/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Background jobs & notifications' })).toBeVisible();
  await expect(page.getByRole('heading',{name:'Operations & privacy review',exact:true})).toBeVisible();
  const privacyCard=page.locator('article').filter({hasText:privacyReceipt.request.id});
  await expect(privacyCard).toBeVisible();
  const respondToReview=(dialog: import('@playwright/test').Dialog)=>dialog.accept(dialog.message().startsWith('Customer-visible')?'Your request is being reviewed. No records were erased.':'PRIVATE-DUMMY-REVIEW-REFERENCE');
  page.on('dialog',respondToReview);
  const reviewed=page.waitForResponse(r=>r.url().endsWith('/api/admin/privacy')&&r.request().method()==='POST');
  await privacyCard.getByRole('button',{name:'Start review',exact:true}).click();
  expect((await reviewed).status()).toBe(200);page.off('dialog',respondToReview);
  await expect(privacyCard.getByText('erasure / in_review',{exact:true})).toBeVisible();
  const ownedPrivacy=await(await page.request.get('/api/account/privacy')).json();
  expect(JSON.stringify(ownedPrivacy)).not.toMatch(/PRIVATE-DUMMY-REVIEW-REFERENCE|internal_evidence|decided_by/);
  const ran = page.waitForResponse(r => r.url().endsWith('/api/admin/jobs') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Run dummy worker now', exact: true }).click();
  expect((await ran).status()).toBe(200);
  expect((await page.request.post('/api/admin/auth', { data: { email: 'support_agent@demo.example', password: 'DemoOnly-2026!' } })).ok()).toBe(true);
  expect((await page.request.get('/api/admin/jobs')).ok()).toBe(true);
  expect((await page.request.post('/api/admin/jobs', { data: { action: 'run_demo' } })).status()).toBe(403);
  expect((await page.request.get('/api/admin/privacy')).status()).toBe(403);
});

test('staff can search the complete dummy catalog and navigate result pages', async ({ page }) => {
  await page.goto('/admin');
  await page.getByRole('button', { name: 'SUPER ADMIN', exact: true }).click();
  await expect(page.getByRole('button', { name: 'SUPER ADMIN', exact: true })).toHaveCount(0);
  const batch = `Paging-${randomUUID().slice(0,8)}`;
  for(let n=0;n<52;n++) {
    const response = await page.request.post('/api/admin/products', { data: { name: `${batch} item ${n}`, brand: batch, sku: `${batch}-${n}`, retail_price: 1000, initial_stock: 3, category_slug: 'processors' } });
    expect(response.status()).toBe(200);
  }
  if(await page.getByRole('button',{name:'Open navigation menu',exact:true}).isVisible())await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
  await page.getByRole('button', { name: /^Products/ }).first().click();
  await page.getByLabel('Search all records', {exact:true}).fill(batch);
  const firstResponse=page.waitForResponse(r => r.url().includes('/api/admin/products?') && r.url().includes(batch));
  await page.getByRole('button',{name:'Search records',exact:true}).click();
  const first=await (await firstResponse).json();
  expect(first.products).toHaveLength(50); expect(first.pagination.total).toBe(52);
  await expect(page.getByRole('status').filter({hasText:'Page 1 of 2'})).toBeVisible();
  const secondResponse=page.waitForResponse(r => r.url().includes('/api/admin/products?') && new URL(r.url()).searchParams.get('page')==='2');
  await page.getByRole('button',{name:'Next page',exact:true}).click();
  const second=await (await secondResponse).json();
  expect(second.products).toHaveLength(2);
  expect(new Set([...first.products,...second.products].map(p=>p.id)).size).toBe(52);
  await expect(page.getByRole('status').filter({hasText:'Page 2 of 2'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Next page',exact:true})).toBeDisabled();
  await expect(page.getByText(second.products[0].name,{exact:true}).first()).toBeVisible();
});

test('English checkout and returns stay English despite a retired Indonesian preference',async({page,context})=>{
  await context.addCookies([{name:'tethera_locale',value:'id',url:origin}]);
  await page.goto('/products/ram-1?variation=ram-1-white-32');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByRole('status').filter({hasText:'Demo environment'})).toBeVisible();
  await page.getByRole('button',{name:'Add to Shopping Cart',exact:true}).click();
  await page.getByRole('button',{name:'Continue to checkout',exact:true}).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByLabel('Email address',{exact:true}).fill('bahasa-fixture@example.test');
  await page.getByLabel('Contact phone',{exact:true}).fill('08170815555');
  await page.getByLabel('Pickup name',{exact:true}).fill('Sukarno');
  const acknowledgement=page.getByRole('checkbox',{name:'I accept the purchase terms and warranty policy',exact:true});
  await expect(acknowledgement).not.toBeChecked();
  if(!await page.getByRole('button',{name:'Review current total',exact:true}).isVisible())await page.getByRole('button',{name:/Show order summary/}).click();
  const quote=page.waitForResponse(r=>r.url().endsWith('/api/checkout/quote')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Review current total',exact:true}).click();
  expect((await quote).status()).toBe(200);
  await acknowledgement.check();
  const createdResponse=page.waitForResponse(r=>r.url().endsWith('/api/checkout/create-order'));
  await page.getByRole('button',{name:/^Pay now -/}).click();
  const created=await(await createdResponse).json();expect(created.success).toBe(true);
  await expect(page.getByRole('heading',{name:'Payment received',exact:true})).toBeVisible();
  await page.goto('/warranty');
  await expect(page.getByRole('heading',{name:'Warranty and returns',exact:true})).toBeVisible();
  await expect(page.getByRole('status').filter({hasText:'Sample policies'})).toBeVisible();
  await page.getByRole('link',{name:'Submit or check a return request',exact:true}).click();
  await page.getByLabel('Order number',{exact:true}).fill(created.orderNumber);
  await page.getByLabel('Describe the issue',{exact:true}).fill('Contoh masalah perangkat untuk simulasi pemeriksaan.');
  await page.getByRole('button',{name:'Submit request',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Request received for assessment.'})).toBeVisible();
  await page.goto('/contact');
  await expect(page.getByText(/incuscomputers@gmail.com/).first()).toBeVisible();
  await expect(page.getByText('Mangga Dua Mall Lt. 3 No. 36, 10730',{exact:true}).first()).toBeVisible();
  expect(await page.locator('a[href^="https://wa.me/"]').count()).toBe(0);
  expect(await page.locator('a[href^="mailto:"]').count()).toBe(0);
  await expect(page.getByLabel('Bahasa / Language',{exact:true})).toHaveCount(0);
  await page.goto('/terms');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByRole('heading',{name:'Purchase terms',exact:true})).toBeVisible();
});
