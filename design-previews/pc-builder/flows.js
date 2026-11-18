const flowNames={inline:'Inline selection',guided:'Guided setup',preset:'Start with a build',...window.flowVariantNames};
const flowParams=new URLSearchParams(location.search);
let currentFlow=Object.hasOwn(flowNames,flowParams.get('flow'))?flowParams.get('flow'):(document.body.dataset.defaultFlow||'inline');
let expanded='gpu',starter='standard';
active='gpu';
const names={cpu:'Processor',motherboard:'Motherboard',ram:'Memory',gpu:'Graphics card',storage:'Storage',cooler:'CPU cooler',case:'Case',psu:'Power supply'};
const coreKeys=categories.map(([key])=>key);
const starters={
  standard:{label:'Ryzen + RTX',subtitle:'Standard configuration',parts:{...base.parts,cooler:'air',case:'airflow'}},
  expanded:{label:'Ryzen 9 + RTX Ti',subtitle:'More CPU cores and video memory',parts:{...base.parts,cpu:'ryzen9',gpu:'4070ti',cooler:'air',case:'airflow'}},
  compact:{label:'Compact Ryzen + RTX',subtitle:'Smaller mATX configuration',parts:{...base.parts,motherboard:'b650m',cooler:'air',case:'compact'}},
};
function startFlow(flow){currentFlow=flow;active='gpu';expanded='gpu';starter='standard';build=structuredClone(base);build.name='My PC build';if(['preset','packages','split','tiles'].includes(flow))build.parts=structuredClone(starters.standard.parts);}
startFlow(currentFlow);
const count=()=>Object.values(build.parts).filter(Boolean).length;
const total=()=>coreKeys.reduce((sum,key)=>sum+(item(key)?.price||0),0);
const starterTotal=id=>coreKeys.reduce((sum,key)=>sum+(catalog[key].find(p=>p.id===starters[id].parts[key])?.price||0),0);
const issues=(key,p)=>conflictsFor(key,p);
function fitDetail(key,p,conflict){return key==='gpu'&&item('case')&&p.length>item('case').gpuMax?`${p.length} mm card exceeds this case's ${item('case').gpuMax} mm clearance.`:conflict.detail;}
function choiceCards(key,delta=false){
  const chosen=item(key);
  return `<div class="choice-grid ${delta?'upgrade-list':''}">${catalog[key].map(p=>{
    const selected=build.parts[key]===p.id,conflicts=issues(key,p),difference=p.price-(chosen?.price||0);
    return `<article class="choice ${selected?'selected':''}"><div class="choice-brand"><span>${p.brand}</span>${selected?`<span class="selected-tag">${icon('check')} Selected</span>`:''}</div><div class="choice-art">${productArt(key,p)}</div><div class="choice-name"><h3>${p.name}</h3><span>${Object.values(p.specs).join(' · ')}</span></div><dl class="choice-specs">${Object.entries(p.specs).map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><div class="choice-footer"><strong>${delta?(selected?'Included':`${difference>=0?'+':'−'}${money(Math.abs(difference))}`):money(p.price)}</strong><button data-pick="${p.id}" data-key="${key}" class="button ${selected?'secondary':'primary'}" ${conflicts.length?'disabled':''}>${selected?icon('check')+' Selected':delta?'Swap part':'Select'}</button></div>${conflicts.length?`<p class="fit-warning">${icon('alert')} ${fitDetail(key,p,conflicts[0])}</p>`:''}</article>`;
  }).join('')}</div>`;
}
function compactSummary(){
  const report=checks();
  return `<aside class="compact-summary"><h2>Your build</h2><span class="subtotal-label">Components subtotal</span><strong class="total" data-total>${money(total())}</strong><p>Assembly and shipping excluded.</p><div class="summary-progress"><span>${count()} of 8 parts selected</span><i><b style="width:${count()/8*100}%"></b></i></div><div class="summary-status">${icon('shield')}<span>${report.conflicts.length?`${report.conflicts.length} checks need attention`:count()<8?'Choose the remaining parts to check fit.':'Core sample checks passed. Final review still needed.'}</span></div><div class="summary-next"><span>Next to complete</span>${coreKeys.filter(key=>!item(key)).map(key=>`<button data-open="${key}">${icon('plus')} ${names[key]} ${icon('arrow')}</button>`).join('')||'<strong>All core parts selected</strong>'}</div><button class="button primary" data-review>Review build ${icon('arrow')}</button><button class="text-button" data-review>View all selected parts</button></aside>`;
}
function inlineFlow(){return `<section class="page-intro"><div><span class="eyebrow">CONCEPT 1 / CHOOSE WITHOUT LEAVING THE LIST</span><h1>Build your PC.</h1><p>Open a component, choose a part, and keep going.</p></div><span class="quiet-count">${count()} / 8 components</span></section><div class="inline-layout"><section class="accordion-list">${coreKeys.map((key,index)=>{
  const p=item(key),open=expanded===key;
  return `<article class="accordion-part ${open?'open':''}"><button class="part-toggle" data-open="${key}" aria-expanded="${open}"><span class="part-index">${String(index+1).padStart(2,'0')}</span><span class="part-symbol">${icon(key)}</span><span class="part-heading"><strong>${names[key]}</strong><span>${p?p.name:'Choose a component'}</span></span><span class="part-cost">${p?money(p.price):'Not selected'}</span><span class="expand-label">${open?'Close':p?'Change':'Select'} ${icon(open?'close':'plus')}</span></button>${open?`<div class="inline-choices"><div class="inline-context"><span>${catalog[key].length} sample options</span><span>Compare specifications below</span></div>${choiceCards(key)}<div class="inline-next"><span>Selections update your total immediately.</span><button data-open="${coreKeys[(index+1)%8]}">Next: ${names[coreKeys[(index+1)%8]]} ${icon('arrow')}</button></div></div>`:''}</article>`;
}).join('')}</section>${compactSummary()}</div>`;}
function guidedFlow(){
  const index=coreKeys.indexOf(active),previous=coreKeys[Math.max(0,index-1)],next=coreKeys[Math.min(7,index+1)];
  return `<div class="guided-top"><span class="eyebrow">CONCEPT 2 / ONE DECISION AT A TIME</span><button class="text-button" data-review>${count()} selected parts ${icon('arrow')}</button></div><nav class="step-track" aria-label="Build steps">${coreKeys.map((key,i)=>`<button data-step="${key}" class="${active===key?'active':''}" aria-current="${active===key?'step':'false'}"><span>${active!==key&&item(key)?icon('check'):String(i+1).padStart(2,'0')}</span><strong>${names[key]}</strong></button>`).join('')}</nav><section class="wizard-heading"><div><span class="step-caption">STEP ${index+1} OF 8</span><h1>Choose your ${names[active].toLowerCase()}.</h1><p>Select a part below. You can revisit any previous choice above.</p></div><span class="selected-part-label">${item(active)?icon('check')+' Selection saved':'Selection needed'}</span></section>${choiceCards(active)}<div class="guided-help">${icon('shield')}<span>Checks use the selected sample specifications. Case clearance and final physical fit need all relevant parts.</span></div><div class="wizard-bottom"><div><span>Components subtotal</span><strong data-total>${money(total())}</strong></div><button class="button secondary" data-step="${previous}" ${index===0?'disabled':''}>← Back</button><button class="button primary" ${index===7?'data-review':`data-continue="${next}"`}>${index===7?'Review build':`Next: ${names[next]}`} ${icon('arrow')}</button></div>`;
}
function presetFlow(){
  return `<section class="page-intro"><div><span class="eyebrow">CONCEPT 3 / START COMPLETE, THEN CUSTOMIZE</span><h1>Choose a starting build.</h1><p>Every option includes all eight core components. Change only what you need.</p></div><span class="quiet-count">Parts-only sample builds</span></section><div class="starter-grid" aria-label="Starting configurations">${Object.entries(starters).map(([id,s])=>`<button class="starter-card ${starter===id?'active':''}" data-starter="${id}" aria-pressed="${starter===id}"><span class="starter-icon">${icon(id==='compact'?'case':'cpu')}</span><span class="starter-copy"><strong>${s.label}</strong><span>${s.subtitle}</span></span><span class="starter-price">${money(starterTotal(id))}<small>8 parts included</small></span><span class="starter-check">${starter===id?icon('check'):icon('plus')}</span></button>`).join('')}</div><div class="preset-layout"><section class="included-build"><div class="included-heading"><span><h2>Included in your build</h2><p>Select any component to see swap options.</p></span><span class="complete-tag">${icon('check')} ${count()} / 8 selected</span></div><div class="included-grid">${coreKeys.map(key=>`<button data-upgrade="${key}" class="${active===key?'active':''}">${icon(key)}<span><small>${names[key]}</small><strong>${item(key)?.name||'Not selected'}</strong></span>${icon('edit')}</button>`).join('')}</div><div class="preset-status">${icon('shield')}<span>Swaps are checked against the selected parts. A final physical-fit review is still required.</span></div></section><section class="upgrades"><div class="upgrade-heading"><span class="eyebrow">CUSTOMIZE ONE COMPONENT</span><h2>Change ${names[active].toLowerCase()}</h2><p>Price differences are shown against your current part.</p></div>${choiceCards(active,true)}</section></div><div class="preset-bottom"><div><span>Your customized build</span><strong data-total>${money(total())}</strong><small>Components only · assembly and shipping excluded</small></div><span class="preset-bottom-note">${checks().conflicts.length?'Review fit checks before continuing.':'All eight core components selected.'}</span><button class="button primary" data-review>Review build ${icon('arrow')}</button></div>`;
}
function renderFlow(){
  document.body.dataset.flow=currentFlow;
  document.querySelectorAll('button[data-flow]').forEach(b=>{b.classList.toggle('active',b.dataset.flow===currentFlow);b.setAttribute('aria-pressed',b.dataset.flow===currentFlow);});
  document.querySelector('#flow-app').innerHTML=({inline:inlineFlow,guided:guidedFlow,preset:presetFlow,...window.flowVariants})[currentFlow]();
  document.title=`${flowNames[currentFlow]} — Incus builder concept`;
  history.replaceState(null,'',`?flow=${currentFlow}`);
  for(const list of document.querySelectorAll('.step-track,.starter-grid,.parts-rail,.build-switch')){const chosen=list.querySelector('.active');if(chosen&&list.scrollWidth>list.clientWidth)list.scrollLeft=chosen.offsetLeft-list.offsetLeft-(list.clientWidth-chosen.clientWidth)/2;}
}
function reviewFlow(){
  const report=checks();
  openDialog(`${dialogTop('SAMPLE BUILD','Selected components')}<div class="review-parts">${coreKeys.map(key=>`<div>${icon(key)}<span><small>${names[key]}</small><strong>${item(key)?.name||'Not selected'}</strong></span><b>${item(key)?money(item(key).price):'—'}</b></div>`).join('')}</div><div class="review-total"><span>Components subtotal</span><strong>${money(total())}</strong></div><p class="review-note">${report.conflicts.length?report.conflicts.map(c=>c.detail).join(' '):count()<8?`${8-count()} core components still to choose.`:'All eight components selected; final physical fit and BIOS need review.'} Assembly and shipping are excluded. This preview does not create an order.</p><button class="button primary" data-close>Back to builder</button>`);
}
document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.flow){startFlow(b.dataset.flow);renderFlow();scrollTo(0,0);}
  if(b.dataset.open){active=b.dataset.open;expanded=expanded===active?null:active;renderFlow();}
  if(b.dataset.step){active=b.dataset.step;renderFlow();scrollTo(0,0);}
  if(b.dataset.continue){if(!item(active)){notify(`Select a ${names[active].toLowerCase()} first.`);return;}active=b.dataset.continue;renderFlow();scrollTo(0,0);}
  if(b.dataset.starter){starter=b.dataset.starter;build.parts=structuredClone(starters[starter].parts);active='gpu';renderFlow();}
  if(b.dataset.upgrade){active=b.dataset.upgrade;renderFlow();if(innerWidth<=800)document.querySelector('.upgrades')?.scrollIntoView({block:'start'});}
  if(b.dataset.restore){const key=b.dataset.restore,p=catalog[key].find(p=>p.id===starters[starter].parts[key]);if(issues(key,p).length){notify('Restore the starting build to reset these linked parts together.');return;}build.parts[key]=p.id;renderFlow();}
  if(b.hasAttribute('data-restore-build')){build.parts=structuredClone(starters[starter].parts);renderFlow();}
  if(b.dataset.pick){const key=b.dataset.key,p=catalog[key].find(p=>p.id===b.dataset.pick);if(!p||issues(key,p).length)return;build.parts[key]=p.id;renderFlow();}
  if(b.hasAttribute('data-review'))reviewFlow();
  if(b.hasAttribute('data-close'))closeDialog();
});
document.querySelector('#studio-dialog').addEventListener('close',()=>queueMicrotask(restoreFocus));
renderFlow();
