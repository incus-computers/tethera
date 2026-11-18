const labels = {cpu:'Processor (CPU)',motherboard:'Motherboard',ram:'Memory (RAM)',gpu:'Graphics card',storage:'Storage',cooler:'CPU cooler',case:'Case',psu:'Power supply'};
const hints = {cpu:'Choose your processor and platform.',motherboard:'Match your processor socket and memory.',ram:'Choose a compatible memory kit.',gpu:'Choose your graphics card.',storage:'Choose a drive for your system and files.',cooler:'Choose a cooler that fits your processor and case.',case:'Check motherboard size and component clearance.',psu:'Choose enough capacity for your components.'};

function componentList() {
  const count=Object.values(build.parts).filter(Boolean).length;
  return `<section class="components-panel" aria-labelledby="components-heading"><div class="panel-heading"><h2 id="components-heading">Components</h2><span>${count} of 8 selected</span></div><div class="component-list">${categories.map(([key],index)=>{
    const p=item(key);
    return `<article class="component-row ${p?'filled':'unfilled'}" data-row="${key}"><span class="row-icon">${icon(key)}</span><div class="row-content"><span class="row-label">${labels[key]}</span>${p?`<h3>${p.name}</h3><p>${Object.values(p.specs).join(' · ')}</p>`:`<h3 class="empty-label">Not selected</h3><p>${hints[key]}</p>`}</div><div class="row-price">${p?`<strong>${money(p.price)}</strong>`:'<span>Required</span>'}</div><div class="row-actions"><button class="button ${p?'secondary':'primary'}" data-category="${key}" aria-label="${p?'Change':'Select'} ${labels[key].toLowerCase()}">${p?'Change':icon('plus')+' Select'}</button>${p?`<button class="remove-button" data-remove="${key}" aria-label="Remove ${labels[key].toLowerCase()}">${icon('close')}</button>`:'<span class="remove-spacer"></span>'}</div></article>`;
  }).join('')}</div></section>`;
}
function assembly() {
  return `<section class="assembly-panel"><div class="panel-heading"><h2>Assembly</h2><span>Optional service</span></div><div class="assembly-options">${Object.entries(services).map(([key,p])=>`<button class="assembly-option ${build.assembly===key?'selected':''}" data-service="${key}" aria-pressed="${build.assembly===key}"><span class="radio">${build.assembly===key?icon('check'):''}</span><span><strong>${p.name}</strong><small>${key==='parts'?'Receive the components for self-assembly.':'Assembly, cable management and basic stability checks.'}</small></span><b>${p.price?'+'+money(p.price):'No service fee'}</b></button>`).join('')}</div></section><button class="extras-link" data-extras>${icon('plus')}<span><strong>Add accessories</strong><small>${build.extras.length?`${build.extras.length} selected`:'Mouse and keyboard · optional'}</small></span>${icon('arrow')}</button>`;
}
function summaryPanel() {
  const t=totals(),report=checks(),count=Object.values(build.parts).filter(Boolean).length;
  const incomplete=categories.filter(([key])=>!item(key)).map(([key])=>labels[key]);
  return `<aside class="build-summary" aria-label="Build summary"><div class="summary-heading"><h2>Build summary</h2><span>${count}/8</span></div><div class="summary-total"><span>Estimated subtotal</span><strong data-total>${money(t.total)}</strong><small>Shipping and unselected components excluded.</small></div><div class="summary-breakdown"><div><span>Components</span><b>${money(t.parts)}</b></div><div><span>Assembly</span><b>${t.assembly?money(t.assembly):'Parts only'}</b></div>${t.extras?`<div><span>Accessories</span><b>${money(t.extras)}</b></div>`:''}</div><div class="completion"><div><span>${count} of 8 components selected</span><b>${Math.round(count/8*100)}%</b></div><div class="completion-track"><i style="width:${count/8*100}%"></i></div>${incomplete.length?`<p>Still needed: ${incomplete.join(', ').toLowerCase()}.</p>`:'<p>All core components selected.</p>'}</div><div class="compatibility-box ${report.conflicts.length?'warning':''}">${icon(report.conflicts.length?'alert':'shield')}<div><strong>${report.conflicts.length?`${report.conflicts.length} checks need attention`:report.pending.length?`${report.pending.length} checks pending`:'Core checks passed'}</strong><p>${report.conflicts.length?'Review the component conflicts.':report.pending.length?'Complete the remaining components to check fit.':'Final physical fit and BIOS still need review.'}</p><button data-checks>View build checks ${icon('arrow')}</button></div></div><div class="power-info"><div>${icon('psu')}<span>Estimated selected load</span><strong>${report.watts} W</strong></div><p>${report.recommended} W+ suggested · ${item('psu')?item('psu').watts+' W selected':'PSU not selected'}</p></div><button class="button primary summary-review" data-review>Review build ${icon('arrow')}</button><button class="save-later" data-save>${icon('save')} ${savedAt&&!dirty?'Saved on this device':'Save build for later'}</button><p class="summary-footnote">Final stock, pricing and fit are checked before ordering.</p></aside>`;
}
function picker() {
  const options=listProducts(),brands=[...new Set(catalog[active].map(p=>p.brand))];
  return `${dialogTop('COMPONENT SELECTION',`Select ${labels[active].toLowerCase()}`)}<div class="picker"><div class="picker-search">${icon('search')}<input id="product-search" aria-label="Search components" type="search" placeholder="Search by name or specification" value="${escape(query)}"></div><div class="picker-toolbar"><div class="brand-tabs" aria-label="Filter by brand">${['all',...brands].map(b=>`<button class="${brand===b?'active':''}" data-brand="${escape(b)}" aria-pressed="${brand===b}">${b==='all'?'All brands':b}</button>`).join('')}</div><label class="fit-filter"><input id="fit-only" type="checkbox" ${fitOnly?'checked':''}> Fit current build</label><select id="sort" aria-label="Sort components"><option value="featured" ${sort==='featured'?'selected':''}>Featured</option><option value="low" ${sort==='low'?'selected':''}>Price: low first</option><option value="high" ${sort==='high'?'selected':''}>Price: high first</option></select></div><div class="picker-results-label"><span>${options.length} sample options</span><span>Prices in IDR</span></div><div class="product-options">${options.length?options.map(p=>{
    const chosen=build.parts[active]===p.id,conflicts=conflictsFor(active,p);
    return `<article class="option ${chosen?'chosen':''}"><div class="option-top"><span>${p.brand}</span><label class="compare-pick"><input type="checkbox" data-compare="${p.id}" aria-label="Compare ${p.name}" ${comparisons.has(p.id)?'checked':''}> Compare</label></div><div class="option-art">${productArt(active,p)}</div><h3>${p.name}</h3><dl class="option-specs">${Object.entries(p.specs).map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>${conflicts.length?`<p class="option-warning">${icon('alert')} Other parts need to change.</p>`:''}<div class="option-bottom"><strong>${money(p.price)}</strong><button class="button ${chosen?'secondary':'primary'}" data-select="${p.id}">${chosen?icon('check')+' Selected':icon('plus')+' Select'}</button></div></article>`;
  }).join(''):`<div class="empty-results">${icon('search')}<h3>No matching components</h3><p>Change your search or turn off “Fit current build” to see alternatives.</p><button class="button secondary" data-clear-filters>Clear filters</button></div>`}</div><div class="picker-footer"><button class="button secondary" data-open-compare ${comparisons.size<2?'disabled':''}>${icon('compare')} Compare ${comparisons.size?`(${comparisons.size})`:''}</button><span>Select a component to return to your build.</span></div></div>`;
}
function listProducts() {
  const options=catalog[active].filter(p=>(brand==='all'||p.brand===brand)&&(!query||`${p.name} ${p.brand} ${Object.values(p.specs).join(' ')}`.toLowerCase().includes(query.toLowerCase()))&&(!fitOnly||conflictsFor(active,p).length===0));
  if(sort==='low')options.sort((a,b)=>a.price-b.price);if(sort==='high')options.sort((a,b)=>b.price-a.price);
  return options;
}
function refreshPicker(focusSearch=false) {
  const input=document.querySelector('#product-search'),cursor=input?.selectionStart;
  document.querySelector('#dialog-content').innerHTML=picker();
  if(focusSearch){const next=document.querySelector('#product-search');next.focus();next.setSelectionRange(cursor,cursor);}
}
function render({focusSearch=false}={}) {
  const t=totals();
  document.querySelector('#studio').innerHTML=`<div class="builder-intro"><div><div class="builder-breadcrumb">PC Builder <span>/</span><button data-rename>${escape(build.name)} ${icon('edit')}</button></div><h1>PC Builder</h1><p>Select your components, check compatibility and review your build.</p></div><div class="build-actions"><button class="button secondary" data-save>${icon('save')} Save build</button><button class="button secondary" data-share>${icon('share')} Share</button><button class="button reset-button" data-reset>${icon('reset')} Reset</button></div></div><div class="builder-layout"><div class="builder-main">${componentList()}${assembly()}<p class="preview-note">Interactive design preview. Specifications and prices are illustrative.</p></div>${summaryPanel()}</div><div class="mobile-total"><div><span>Estimated subtotal</span><strong>${money(t.total)}</strong></div><button class="button primary" data-review>Review build ${icon('arrow')}</button></div>`;
  const dialog=document.querySelector('#studio-dialog');
  if(dialog.open&&dialog.dataset.kind==='picker')refreshPicker(focusSearch);
}
function category(key) {
  active=key;brand='all';query='';sort='featured';comparisons=new Set();
  openDialog(picker(),'picker');
}
function select(id) {
  const p=catalog[active].find(p=>p.id===id);if(!p)return;
  const counterpart=active==='cpu'?'motherboard':active==='motherboard'?'cpu':null;
  if(counterpart&&item(counterpart)&&p.socket!==item(counterpart).socket){
    openDialog(`${dialogTop('PLATFORM CHANGE','Change processor platform?')}<p class="dialog-intro">${p.name} uses ${p.socket}. Your current ${counterpart==='cpu'?'processor':'motherboard'} uses ${item(counterpart).socket}.</p><div class="change-notice">${icon('alert')}<span><strong>${item(counterpart).name}</strong> will be removed so you can select a matching replacement.</span></div><div class="dialog-actions"><button class="button secondary" data-close>Keep current build</button><button class="button primary" data-platform="${id}" data-counterpart="${counterpart}">Change platform</button></div>`);return;
  }
  build.parts[active]=id;dirty=true;closeDialog();render();notify(`${labels[active]} updated.`);
}
function buildChecks() {
  const report=checks();
  openDialog(`${dialogTop('COMPATIBILITY','Build checks')}<p class="dialog-intro">Based on selected sample specifications. Pending checks need the remaining components.</p><div class="checks-list">${report.rows.map(row=>`<div class="check-row ${row.status}"><span>${icon(row.status==='pass'?'check':row.status==='conflict'?'alert':'plus')}</span><div><strong>${row.name}</strong><p>${row.detail}</p></div><small>${row.status==='pass'?'Checked':row.status==='conflict'?'Needs change':'Pending'}</small></div>`).join('')}</div><p class="manual-check">${icon('shield')} BIOS version, cable clearance and mounting positions still need a final review.</p>`);
}
function compare() {
  const options=catalog[active].filter(p=>comparisons.has(p.id));if(options.length<2)return;
  const keys=[...new Set(options.flatMap(p=>Object.keys(p.specs)))];
  openDialog(`${dialogTop('COMPONENT COMPARISON',`Compare ${labels[active].toLowerCase()}`)}<div class="compare-scroll"><table class="compare-table"><thead><tr><th>Specification</th>${options.map(p=>`<th>${productArt(active,p)}<span>${p.name}</span></th>`).join('')}</tr></thead><tbody>${keys.map(key=>`<tr><th>${key}</th>${options.map(p=>`<td>${p.specs[key]||'—'}</td>`).join('')}</tr>`).join('')}<tr><th>Price</th>${options.map(p=>`<td><strong>${money(p.price)}</strong></td>`).join('')}</tr><tr><th></th>${options.map(p=>`<td><button class="button ${build.parts[active]===p.id?'secondary':'primary'}" data-compare-select="${p.id}">${build.parts[active]===p.id?'Selected':'Select component'}</button></td>`).join('')}</tr></tbody></table></div><p class="dialog-footnote">Exact specifications vary by manufacturer model. Sample data is shown here.</p>`,'comparison');
}
function review() {
  const t=totals(),report=checks(),count=Object.values(build.parts).filter(Boolean).length;
  openDialog(`${dialogTop('BUILD REVIEW','Build summary')}<p class="dialog-intro">${count} of 8 core components selected.${count<8?' Choose the remaining components to complete your build.':''}</p><div class="review-list">${categories.map(([key])=>`<button data-review-category="${key}" class="${!item(key)?'missing':''}">${icon(key)}<span><small>${labels[key]}</small><strong>${escape(item(key)?.name||'Not selected')}</strong></span><b>${item(key)?money(item(key).price):'Select →'}</b></button>`).join('')}</div><div class="review-additions"><div><span>${services[build.assembly].name}</span><b>${money(t.assembly)}</b></div>${build.extras.map(key=>`<div><span>${accessories[key].name}</span><b>${money(accessories[key].price)}</b></div>`).join('')}</div>${report.conflicts.length?`<div class="change-notice">${icon('alert')}<span>${report.conflicts.map(c=>c.detail).join(' ')}</span></div>`:''}<div class="dialog-total"><span>Estimated subtotal</span><strong>${money(t.total)}</strong></div><div class="dialog-actions"><button class="button secondary" data-close>Back to build</button><button class="button primary" data-checks>View build checks</button></div><p class="dialog-footnote">Unselected components and shipping are excluded. This preview does not create an order.</p>`);
}
function extras() {
  openDialog(`${dialogTop('OPTIONAL EXTRAS','Accessories')}<div class="accessory-list">${Object.entries(accessories).map(([key,p])=>`<label><input type="checkbox" data-accessory="${key}" ${build.extras.includes(key)?'checked':''}><span><strong>${p.name}</strong><small>Sample accessory</small></span><b>${money(p.price)}</b></label>`).join('')}</div><div class="dialog-actions"><button class="button primary" data-close>Done ${icon('check')}</button></div>`);
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-close'))closeDialog();
  if(button.dataset.category)category(button.dataset.category);
  if(button.dataset.select)select(button.dataset.select);
  if(button.dataset.brand){brand=button.dataset.brand;refreshPicker();}
  if(button.dataset.remove){build.parts[button.dataset.remove]=null;dirty=true;render();}
  if(button.hasAttribute('data-checks'))buildChecks();
  if(button.hasAttribute('data-clear-filters')){query='';brand='all';fitOnly=false;refreshPicker();}
  if(button.hasAttribute('data-open-compare'))compare();
  if(button.dataset.compareSelect){select(button.dataset.compareSelect);}
  if(button.dataset.platform){build.parts[active]=button.dataset.platform;build.parts[button.dataset.counterpart]=null;dirty=true;closeDialog();render();notify('Platform changed. Select a matching replacement.');}
  if(button.hasAttribute('data-review'))review();
  if(button.hasAttribute('data-extras'))extras();
  if(button.dataset.reviewCategory)category(button.dataset.reviewCategory);
  if(button.dataset.service){build.assembly=button.dataset.service;dirty=true;render();}
  if(button.hasAttribute('data-save')){try{savedAt=new Date().toISOString();localStorage.setItem('incus-studio-v03',JSON.stringify({version:3,build,savedAt}));dirty=false;render();notify('Build saved on this device.');}catch{notify('Could not save here. Copy a share link instead.');}}
  if(button.hasAttribute('data-share')){const url=new URL(location.href);url.searchParams.set('build',JSON.stringify(build));try{await navigator.clipboard.writeText(url.href);notify('Build link copied.');}catch{openDialog(`${dialogTop('SHARE BUILD','Copy your build link')}<label class="share-field">Link<input readonly value="${escape(url.href)}"></label>`);}}
  if(button.hasAttribute('data-reset'))openDialog(`${dialogTop('RESET BUILD','Reset this sample build?')}<p class="dialog-intro">The current selections return to the sample configuration. Your saved build is kept until you save over it.</p><div class="dialog-actions"><button class="button secondary" data-close>Cancel</button><button class="button primary" data-confirm-reset>Reset build</button></div>`);
  if(button.hasAttribute('data-confirm-reset')){build=structuredClone(base);dirty=true;closeDialog();render();}
  if(button.hasAttribute('data-rename'))openDialog(`${dialogTop('BUILD NAME','Name your build')}<form id="name-form"><label class="name-field">Build name<input id="build-name-input" required maxlength="40" value="${escape(build.name)}" autocomplete="off"></label><div class="dialog-actions"><button type="button" class="button secondary" data-close>Cancel</button><button type="submit" class="button primary">Save name</button></div></form>`);
});
document.addEventListener('submit',event=>{if(event.target.id==='name-form'){event.preventDefault();build.name=document.querySelector('#build-name-input').value.trim()||'My PC build';dirty=true;closeDialog();render();}});
document.addEventListener('input',event=>{if(event.target.id==='product-search'){query=event.target.value;refreshPicker(true);}});
document.addEventListener('change',event=>{
  const target=event.target;
  if(target.id==='fit-only'){fitOnly=target.checked;refreshPicker();}
  if(target.id==='sort'){sort=target.value;refreshPicker();}
  if(target.dataset.compare){if(target.checked&&comparisons.size>=2){target.checked=false;notify('Compare two components at a time.');return;}target.checked?comparisons.add(target.dataset.compare):comparisons.delete(target.dataset.compare);const control=document.querySelector('[data-open-compare]');control.disabled=comparisons.size<2;control.innerHTML=`${icon('compare')} Compare ${comparisons.size?`(${comparisons.size})`:''}`;}
  if(target.dataset.accessory){build.extras=target.checked?[...build.extras.filter(k=>k!==target.dataset.accessory),target.dataset.accessory]:build.extras.filter(k=>k!==target.dataset.accessory);dirty=true;render();}
});
document.querySelector('#studio-dialog').addEventListener('close',()=>queueMicrotask(restoreFocus));
render();
