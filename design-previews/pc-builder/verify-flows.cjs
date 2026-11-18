const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const baseUrl = 'http://127.0.0.1:3218/flows.html';
const failures = [], completed = [];
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1120}});
    page.on('pageerror',error=>failures.push(error.message));
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.hostname!=='127.0.0.1'||route.request().method()!=='GET'){
        failures.push('Unexpected request: '+route.request().method()+' '+url.origin);
        return route.abort();
      }
      return route.continue();
    });
    const open=async flow=>{await page.goto(baseUrl+'?flow='+flow);await page.evaluate(()=>document.fonts.ready);};
    const price=async text=>expect(page.locator('[data-total]')).toHaveText(text);
    await open('inline');
    await price('Rp 26.490.000');
    await expect(page.locator('.accordion-part')).toHaveCount(8);
    await page.locator('[data-pick="4070ti"]').click();
    await price('Rp 29.490.000');
    await expect(page.locator('dialog')).not.toBeVisible();
    await expect(page.locator('[data-open="gpu"]').first()).toHaveAttribute('aria-expanded','true');
    await page.locator('.summary-next [data-open="cooler"]').click();
    await page.locator('[data-pick="air"]').click();
    await price('Rp 30.089.000');
    await page.locator('.summary-next [data-open="case"]').click();
    await page.locator('[data-pick="airflow"]').click();
    await price('Rp 31.688.000');
    await page.locator('[data-review]').first().click();
    await expect(page.getByRole('dialog')).toContainText('Rp 31.688.000');
    await expect(page.getByRole('dialog')).toContainText('All eight components selected');
    await page.keyboard.press('Escape');
    completed.push('Inline: selection stays in the list; missing parts, subtotal and review reconcile.');
    await open('guided');
    await page.locator('[data-pick="4070ti"]').click();
    await price('Rp 29.490.000');
    await page.locator('[data-continue="storage"]').click();
    await expect(page.locator('h1')).toHaveText('Choose your storage.');
    await page.locator('.wizard-bottom [data-step="gpu"]').click();
    await expect(page.locator('[data-pick="4070ti"]')).toContainText('Selected');
    await page.locator('[data-step="cooler"]').click();
    await page.locator('[data-continue="case"]').click();
    await expect(page.locator('h1')).toHaveText('Choose your cpu cooler.');
    await expect(page.locator('.toast')).toContainText('Select a cpu cooler first.');
    await page.locator('[data-pick="air"]').click();
    await page.locator('[data-continue="case"]').click();
    await page.locator('[data-pick="airflow"]').click();
    await price('Rp 31.688.000');
    await page.locator('[data-continue="psu"]').click();
    await page.locator('.wizard-bottom [data-review]').click();
    await expect(page.getByRole('dialog')).toContainText('All eight components selected');
    await page.locator('[data-close]').last().click();
    completed.push('Guided: next/back preserve selections; empty steps block progress; review reconciles.');
    await open('preset');
    await price('Rp 28.688.000');
    await expect(page.locator('.choice').filter({has:page.locator('[data-pick="4070ti"]')})).toContainText('+Rp 3.000.000');
    await page.locator('[data-pick="4070ti"]').click();
    await price('Rp 31.688.000');
    await expect(page.locator('.choice').filter({has:page.locator('[data-pick="4070s"]')})).toContainText('−Rp 3.000.000');
    await page.locator('[data-starter="expanded"]').click();
    await price('Rp 34.188.000');
    await page.locator('[data-starter="compact"]').click();
    await price('Rp 27.888.000');
    await expect(page.locator('[data-pick="4070ti"]')).toBeDisabled();
    await expect(page.locator('[data-pick="7900xt"]')).toBeDisabled();
    await expect(page.locator('.fit-warning').first()).toContainText('300');
    await page.locator('[data-upgrade="case"]').click();
    await page.locator('[data-pick="airflow"]').click();
    await price('Rp 28.488.000');
    await page.locator('[data-upgrade="gpu"]').click();
    await expect(page.locator('[data-pick="4070ti"]')).toBeEnabled();
    await page.locator('[data-pick="4070ti"]').click();
    await price('Rp 31.488.000');
    completed.push('Preset: all starter totals and upgrade/downgrade differences reconcile; compact-case clearance blocks oversized GPUs until case is changed.');
    for(const flow of ['inline','guided','preset']){
      for(const width of [320,390,768,1024,1440,1920]){
        await page.setViewportSize({width,height:width<600?844:1120});
        await open(flow);
        const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).length}));
        expect(metrics.scroll,flow+' at '+width).toBeLessThanOrEqual(width);
        expect(metrics.broken).toBe(0);
        if(width<540){const footer=await page.locator(flow==='inline'?'.compact-summary':flow==='guided'?'.wizard-bottom':'.preset-bottom').boundingBox();expect(footer.height).toBeLessThan(160);expect(Math.round(footer.y+footer.height)).toBe(844);}
        if(width===390||width===1440)await page.screenshot({path:path.join(root,'renders',`flow-${flow}-${width===390?'mobile':'desktop'}.png`),fullPage:width!==390});
      }
    }
    completed.push('All three workflows render at 320, 390, 768, 1024, 1440 and 1920px without page overflow or broken images.');
    await page.setViewportSize({width:390,height:844});
    await open('preset');
    await page.locator('[data-starter="compact"]').click();
    await expect(page.locator('[data-pick="4070ti"]')).toBeDisabled();
    await page.locator('[data-upgrade="case"]').click();
    await page.locator('[data-pick="airflow"]').click();
    await price('Rp 28.488.000');
    await page.locator('[data-review]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-review]')).toBeFocused();
    completed.push('Mobile starter selection, compatible swaps, review and keyboard close/focus work.');
    expect(failures).toEqual([]);
    fs.writeFileSync(path.join(root,'flow-verification.json'),JSON.stringify({passed:true,completed,failures},null,2)+'\n');
    console.log(JSON.stringify({passed:true,completed},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
