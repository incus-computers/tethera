const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const origin = 'http://127.0.0.1:3218';
const renders = path.join(__dirname, 'renders');

(async () => {
  await fs.mkdir(renders, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1120 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin + '/studio-v02.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[data-total]')).toHaveText('Rp 26.490.000');
    await page.screenshot({ path: path.join(renders, 'studio-v02-desktop.png') });
    results.push('Default six-part build totals Rp 26.490.000.');

    await page.locator('[data-open-compare]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.compare-table')).toContainText('16 GB GDDR6X');
    await page.screenshot({ path: path.join(renders, 'studio-v02-compare.png') });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.locator('[data-select="4070ti"]').click();
    await expect(page.locator('[data-total]')).toHaveText('Rp 29.490.000');
    results.push('Component comparison opens; choosing another GPU updates the subtotal.');

    await page.locator('[data-category="cooler"]').click();
    await page.locator('[data-select="air"]').click();
    await page.locator('[data-category="case"]').click();
    await page.locator('[data-select="airflow"]').click();
    await page.locator('[data-service="build"]').click();
    await expect(page.locator('[data-total]')).toHaveText('Rp 31.938.000');
    await page.locator('.rail-extras').click();
    await page.locator('[data-accessory="mouse"]').check();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.locator('[data-total]')).toHaveText('Rp 32.737.000');
    results.push('Core parts, assembly and optional accessories reconcile correctly.');

    await page.locator('[data-category="gpu"]').click();
    await page.getByRole('tab', { name: /Build checks/ }).click();
    await expect(page.locator('.check-row.pass')).toHaveCount(6);
    await expect(page.locator('.manual-check')).toContainText('BIOS');
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.locator('.toast')).not.toHaveClass(/visible/);
    await page.screenshot({ path: path.join(renders, 'studio-v02-checks.png') });
    await page.locator('[data-review]').click();
    await expect(page.locator('.review-additions')).toContainText('Incus assembly');
    await expect(page.locator('.dialog-total')).toContainText('Rp 32.737.000');
    await page.screenshot({ path: path.join(renders, 'studio-v02-review.png') });
    await page.keyboard.press('Escape');
    results.push('Six sample checks pass after completion; final physical review remains explicit.');

    await page.locator('[data-rename]').click();
    await page.locator('#build-name-input').fill('Midnight / 01');
    await page.getByRole('button', { name: 'Save name', exact: true }).click();
    await page.locator('.build-actions [data-save]').click();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.build-name')).toContainText('Midnight / 01');
    await expect(page.locator('[data-total]')).toHaveText('Rp 32.737.000');
    results.push('Saved sample build, name, service and accessories restore after reload.');

    // Capture the share URL without touching the user's actual clipboard.
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__studioShare = text; } } }));
    await page.locator('[data-share]').click();
    await expect.poll(() => page.evaluate(() => window.__studioShare || '')).toContain('build=');
    const link = await page.evaluate(() => window.__studioShare);
    const sharedContext = await browser.newContext();
    const shared = await sharedContext.newPage();
    await shared.goto(link, { waitUntil: 'networkidle' });
    await expect(shared.locator('[data-total]')).toHaveText('Rp 32.737.000');
    await expect(shared.locator('.build-name')).toContainText('Midnight / 01');
    await sharedContext.close();
    results.push('A copied link restores the same sample in a fresh browser context.');

    await page.locator('[data-category="cpu"]').click();
    await page.locator('#fit-only').uncheck();
    await page.locator('[data-select="intel7"]').click();
    await expect(page.getByRole('dialog')).toContainText('This changes your platform.');
    await page.getByRole('button', { name: 'Keep current build', exact: true }).click();
    await expect(page.locator('[data-total]')).toHaveText('Rp 32.737.000');
    await page.locator('[data-select="intel7"]').click();
    await page.locator('[data-platform="intel7"]').click();
    await expect(page.locator('[data-total]')).toHaveText('Rp 29.038.000');
    await page.locator('[data-category="motherboard"]').click();
    await page.locator('#fit-only').check();
    await expect(page.locator('[data-select="z790"]')).toBeVisible();
    await page.locator('[data-select="z790"]').click();
    await expect(page.locator('[data-total]')).toHaveText('Rp 33.237.000');
    results.push('A platform change requires confirmation and removes only the mismatched counterpart.');

    await page.locator('[data-reset]').click();
    await page.locator('[data-confirm-reset]').click();
    await page.locator('[data-select="4070ti"]').click();
    await page.locator('[data-category="case"]').click();
    await page.locator('#fit-only').uncheck();
    await page.locator('[data-select="compact"]').click();
    await page.locator('[data-category="motherboard"]').click();
    await page.locator('#fit-only').check();
    await expect(page.locator('[data-select="b650m"]')).toBeVisible();
    await page.locator('[data-select="b650m"]').click();
    await page.locator('[data-category="gpu"]').click();
    await expect(page.locator('[data-select]')).toHaveCount(1);
    await expect(page.locator('[data-select="4070s"]')).toBeVisible();
    await page.locator('[data-select="4070s"]').click();
    results.push('Fit filters ignore unrelated conflicts and still offer corrective part choices.');

    await page.locator('#product-search').fill('nothing matches this');
    await expect(page.locator('.empty-results')).toBeVisible();
    await page.locator('[data-clear-filters]').click();
    await expect(page.locator('[data-select]')).toHaveCount(3);
    await page.getByRole('tab', { name: 'Inspiration', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Parts list', exact: true })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: /Build checks/ })).toHaveAttribute('aria-selected', 'true');
    results.push('Search recovery and keyboard navigation work.');
    await page.locator('[data-rename]').click();
    await page.locator('#build-name-input').fill('<img src=x onerror=alert(1)>');
    await page.getByRole('button', { name: 'Save name', exact: true }).click();
    await expect(page.locator('.build-name')).toContainText('<img src=x onerror=alert(1)>');
    await expect(page.locator('.build-name img')).toHaveCount(0);
    if (errors.length) throw new Error(errors.join('\n'));
    results.push('Build names render as text, with no browser script errors.');
    await context.close();

    const viewports=[];
    for(const width of [320,390,768,1024,1440,1920]) {
      const ctx=await browser.newContext({viewport:{width,height:width<851?900:1120},isMobile:width<521,hasTouch:width<521});
      const p=await ctx.newPage();await p.goto(origin+'/studio-v02.html',{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
      const metrics=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,missingImages:[...document.images].filter(img=>!img.complete||!img.naturalWidth).length}));
      if(metrics.overflow||metrics.missingImages)throw new Error(`Viewport ${width}: ${JSON.stringify(metrics)}`);
      if(width===390){
        await p.screenshot({path:path.join(renders,'studio-v02-mobile.png')});
        await p.evaluate(()=>scrollTo({top:document.querySelector('.picker').getBoundingClientRect().top+scrollY-12,behavior:'instant'}));
        await p.screenshot({path:path.join(renders,'studio-v02-mobile-picker.png')});
        await p.locator('[data-category="cooler"]').click();await p.locator('[data-select="air"]').click();
        await expect(p.locator('[data-total]')).toHaveText('Rp 27.089.000');
        await p.locator('[data-review]').click();await expect(p.getByRole('dialog')).toBeVisible();
      }
      viewports.push({width,...metrics});await ctx.close();
    }
    results.push('Mobile component selection and review work; six viewport widths have no page overflow or missing images.');
    const report={passed:true,date:new Date().toISOString(),results,viewports};
    await fs.writeFile(path.join(__dirname,'studio-verification.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
