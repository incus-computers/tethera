const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');
const origin='http://127.0.0.1:3218',renders=path.join(__dirname,'renders');
(async()=>{
  const browser=await chromium.launch({headless:true}),results=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1120}}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/studio.html',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
    await expect(page.locator('h1')).toHaveText('PC Builder');await expect(page.locator('.component-row')).toHaveCount(8);
    await expect(page.locator('[data-total]')).toHaveText('Rp 26.490.000');await expect(page.locator('main img')).toHaveCount(0);
    await page.screenshot({path:path.join(renders,'studio-v03-desktop.png')});
    results.push('Eight original-style rows, a separate summary and no inspiration hero.');
    await page.locator('[data-category="gpu"]').click();await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('[data-select]')).toHaveCount(3);await expect(page.locator('[data-open-compare]')).toBeDisabled();
    await page.locator('#product-search').fill('Radeon');await expect(page.locator('[data-select]')).toHaveCount(1);await page.locator('#product-search').fill('');
    await page.screenshot({path:path.join(renders,'studio-v03-picker.png')});
    await page.locator('[data-compare="4070s"]').check();await page.locator('[data-compare="4070ti"]').check();await page.locator('[data-open-compare]').click();
    await expect(page.locator('.compare-table')).toContainText('16 GB GDDR6X');await page.locator('[data-compare-select="4070ti"]').click();
    await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.locator('[data-row="gpu"]')).toContainText('GeForce RTX 4070 Ti SUPER');
    await expect(page.locator('[data-total]')).toHaveText('Rp 29.490.000');
    results.push('Focused selection, search and deliberate comparison return to the component list.');
    await page.locator('[data-remove="ram"]').click();await expect(page.locator('[data-total]')).toHaveText('Rp 27.591.000');
    for(const [key,id] of [['ram','ram32'],['cooler','air'],['case','airflow']]){await page.locator(`[data-category="${key}"]`).click();await page.locator(`[data-select="${id}"]`).click();}
    await page.locator('[data-service="build"]').click();await expect(page.locator('[data-total]')).toHaveText('Rp 31.938.000');
    await page.locator('[data-extras]').click();await page.locator('[data-accessory="mouse"]').check();await page.getByRole('button',{name:'Done',exact:true}).click();
    await expect(page.locator('[data-total]')).toHaveText('Rp 32.737.000');
    await page.locator('[data-checks]').click();await expect(page.locator('.check-row.pass')).toHaveCount(6);await expect(page.locator('.manual-check')).toContainText('BIOS');await page.keyboard.press('Escape');
    await page.locator('.summary-review').click();await expect(page.locator('.dialog-total')).toContainText('Rp 32.737.000');await expect(page.locator('.review-additions')).toContainText('Incus assembly');await page.keyboard.press('Escape');
    results.push('Remove/replace, assembly, extras, checks and the price breakdown reconcile.');
    await page.locator('[data-rename]').click();await page.locator('#build-name-input').fill('My PC / 01');await page.getByRole('button',{name:'Save name',exact:true}).click();
    await page.locator('.build-actions [data-save]').click();await page.reload({waitUntil:'networkidle'});await expect(page.locator('[data-rename]')).toHaveText('My PC / 01');await expect(page.locator('[data-total]')).toHaveText('Rp 32.737.000');
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__share=value;}}}));await page.locator('[data-share]').click();
    await expect.poll(()=>page.evaluate(()=>window.__share||'')).toContain('build=');const sharedContext=await browser.newContext(),shared=await sharedContext.newPage();
    await shared.goto(await page.evaluate(()=>window.__share),{waitUntil:'networkidle'});await expect(shared.locator('[data-total]')).toHaveText('Rp 32.737.000');await sharedContext.close();
    results.push('Saved names/selections restore, and shared links reproduce the subtotal in a fresh context.');
    await page.locator('[data-category="cpu"]').click();await page.locator('#fit-only').uncheck();await page.locator('[data-select="intel7"]').click();
    await expect(page.getByRole('dialog')).toContainText('Change processor platform?');await page.getByRole('button',{name:'Keep current build',exact:true}).click();await expect(page.locator('[data-total]')).toHaveText('Rp 32.737.000');
    await page.locator('[data-category="cpu"]').click();await page.locator('[data-select="intel7"]').click();await page.locator('[data-platform="intel7"]').click();
    await expect(page.locator('[data-row="motherboard"]')).toContainText('Not selected');await expect(page.locator('[data-total]')).toHaveText('Rp 29.038.000');
    await page.locator('[data-category="motherboard"]').click();await page.locator('#fit-only').check();await expect(page.locator('[data-select="z790"]')).toBeVisible();await page.locator('[data-select="z790"]').click();await expect(page.locator('[data-total]')).toHaveText('Rp 33.237.000');
    results.push('Platform changes require confirmation and remove only the mismatched part.');
    await page.locator('[data-category="storage"]').click();await page.locator('#product-search').fill('no matching component');await expect(page.locator('.empty-results')).toBeVisible();await page.locator('[data-clear-filters]').click();await expect(page.locator('[data-select]')).toHaveCount(2);await page.keyboard.press('Escape');
    await page.locator('[data-rename]').click();await page.locator('#build-name-input').fill('<img src=x onerror=alert(1)>');await page.getByRole('button',{name:'Save name',exact:true}).click();await expect(page.locator('[data-rename] img')).toHaveCount(0);
    if(errors.length)throw new Error(errors.join('\n'));results.push('Empty search recovery and escaped names work without script errors.');await context.close();
    const viewports=[];
    for(const width of [320,390,768,1024,1440,1920]){
      const ctx=await browser.newContext({viewport:{width,height:width<701?900:1120},isMobile:width<701,hasTouch:width<701}),p=await ctx.newPage();await p.goto(origin+'/studio.html',{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
      const metrics=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length}));if(metrics.overflow||metrics.brokenImages)throw new Error(JSON.stringify({width,...metrics}));
      if(width===390){await p.screenshot({path:path.join(renders,'studio-v03-mobile.png')});await p.locator('[data-category="cooler"]').click();await p.locator('[data-select="air"]').click();await expect(p.locator('[data-total]')).toHaveText('Rp 27.089.000');await p.locator('.mobile-total [data-review]').click();await expect(p.getByRole('dialog')).toBeVisible();await p.getByRole('button',{name:'Back to build',exact:true}).click();await p.locator('[data-category="gpu"]').click();await p.screenshot({path:path.join(renders,'studio-v03-mobile-picker.png')});}
      viewports.push({width,...metrics});await ctx.close();
    }
    results.push('Mobile selection/review works; six widths have no page overflow or missing images.');
    const report={passed:true,version:3,date:new Date().toISOString(),results,viewports};await fs.writeFile(path.join(__dirname,'studio-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
