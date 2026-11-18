const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
  const browser=await chromium.launch(),errors=[],completed=[];
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1120}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{
      if(new URL(route.request().url()).origin!=='http://127.0.0.1:3218'||route.request().method()!=='GET'){errors.push('Unexpected request');return route.abort();}
      return route.continue();
    });
    const open=async flow=>{await page.goto('http://127.0.0.1:3218/refinements.html'+(flow?'?flow='+flow:''));await page.evaluate(()=>document.fonts.ready);};
    const price=async value=>expect(page.locator('[data-total]')).toHaveText('Rp '+value);
    await open();
    await expect(page.locator('button[data-flow="packages"]')).toHaveAttribute('aria-pressed','true');
    await price('28.688.000');
    await page.locator('[data-pick="4070ti"]').click();
    await price('31.688.000');
    await expect(page.locator('.change-log')).toContainText('GeForce RTX 4070 Ti SUPER');
    await expect(page.locator('.changes-heading')).toContainText('+Rp 3.000.000');
    await page.locator('[data-restore="gpu"]').click();
    await price('28.688.000');
    await page.locator('[data-pick="7900xt"]').click();
    await page.locator('[data-restore-build]').click();
    await price('28.688.000');
    completed.push('Build & refine: inline swaps, exact totals, per-part undo and reset all.');
    await page.locator('button[data-flow="split"]').click();
    await expect(page.locator('table')).toHaveCount(1);
    await expect(page.getByRole('row',{name:/Change to total/})).toContainText('+Rp 3.000.000');
    await page.locator('[data-pick="4070ti"]').click();
    await price('31.688.000');
    await expect(page.getByRole('row',{name:/Change to total/})).toContainText('−Rp 3.000.000');
    await page.locator('[data-upgrade="ram"]').click();
    await page.locator('[data-pick="ram64"]').click();
    await price('33.288.000');
    await page.locator('[data-restore="ram"]').click();
    await price('31.688.000');
    completed.push('Parts & compare: aligned specifications, live differences, category switching and starter-part restore.');
    await page.locator('button[data-flow="tiles"]').click();
    await expect(page.locator('.part-tile')).toHaveCount(8);
    await page.locator('[data-pick="4070ti"]').click();
    await price('31.688.000');
    await expect(page.locator('.part-tile[data-open="gpu"]')).toContainText('Customized');
    await page.locator('[data-open="gpu"]').click();
    await expect(page.locator('.tile-expanded')).toHaveCount(0);
    await page.locator('[data-open="storage"]').click();
    await page.locator('[data-pick="ssd2"]').click();
    await price('32.688.000');
    completed.push('Build tiles: eight-part overview, expand/collapse shelves, customized markers and exact subtotal.');
    for(const flow of ['packages','split','tiles']){
      await open(flow);
      if(flow==='packages'){await expect(page.getByText('Start with',{exact:true})).toHaveCount(0);await page.locator('[data-open="motherboard"]').click();await page.locator('[data-pick="b650m"]').click();await page.locator('[data-open="case"]').click();await page.locator('[data-pick="compact"]').click();await page.locator('[data-open="gpu"]').click();}else await page.locator('[data-starter="compact"]').click();
      await price('27.888.000');
      await expect(page.locator('[data-pick="4070ti"]')).toBeDisabled();
      await expect(page.locator('.fit-warning').first()).toContainText('300 mm');
      await page.locator(flow==='split'?'[data-upgrade="case"]':'[data-open="case"]').click();
      await page.locator('[data-pick="airflow"]').click();
      await price('28.488.000');
      await page.locator(flow==='split'?'[data-upgrade="gpu"]':'[data-open="gpu"]').click();
      await expect(page.locator('[data-pick="4070ti"]')).toBeEnabled();
      await page.locator('[data-pick="4070ti"]').click();
      await price('31.488.000');
      await page.locator('[data-review]').click();
      await expect(page.getByRole('dialog')).toContainText('Rp 31.488.000');
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-review]')).toBeFocused();
      for(const width of [320,390,768,1024,1440,1920]){
        await page.setViewportSize({width,height:width<600?844:1120});
        await open(flow);
        const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length}));
        expect(metrics.scroll,flow+' at '+width).toBeLessThanOrEqual(width);
        expect(metrics.broken).toBe(0);
        if(width<540){const box=await page.locator(flow==='packages'?'.package-summary':'.refine-footer').boundingBox();expect(box.height).toBeLessThan(160);expect(Math.round(box.y+box.height)).toBe(844);}
        if(width===390||width===1440){
          if(width===1440)await page.setViewportSize({width,height:await page.evaluate(()=>document.documentElement.scrollHeight)});
          await page.screenshot({path:path.join(__dirname,'renders',`refine-${flow}-${width===390?'mobile':'desktop'}.png`),fullPage:false});
        }
      }
    }
    completed.push('All three: compact-case restrictions and corrective swaps, review/focus, six viewport widths, no overflow or missing images, compact mobile totals.');
    await page.setViewportSize({width:390,height:844});
    await open('tiles');
    await page.locator('[data-open="cpu"]').click();
    const row=await page.evaluate(()=>{const shelf=document.querySelector('.tile-expanded'),next=shelf.nextElementSibling;return {next:next?.dataset.open,selected:document.querySelector('.part-tile.active')?.dataset.open};});
    expect(row).toEqual({next:'ram',selected:'cpu'});
    await page.locator('[data-pick="ryzen9"]').click();
    await price('31.188.000');
    await page.locator('[data-review]').click();
    await expect(page.getByRole('dialog')).toContainText('Ryzen 9');
    completed.push('Mobile tile shelf opens below its two-tile row; selection and review work.');
    expect(errors).toEqual([]);
    fs.writeFileSync(path.join(__dirname,'refinement-verification.json'),JSON.stringify({passed:true,completed,errors},null,2)+'\n');
    console.log(JSON.stringify({passed:true,completed},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
