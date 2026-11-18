const glyphs = {
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4M9 9h6v6H9z"/>',
  motherboard: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h6v6H8zm0 10h8m1-10v6"/>',
  ram: '<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 10v4m4-4v4m4-4v4m4-4v4M6 17v3m4-3v3m4-3v3m4-3v3"/>',
  gpu: '<rect x="2" y="5" width="19" height="13" rx="2"/><circle cx="8" cy="11.5" r="3"/><circle cx="16" cy="11.5" r="3"/><path d="M5 18v3m12-3v3M21 8h2m-2 6h2"/>',
  storage: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 10h5v4H7zm10-2v8M3 11H1m2 3H1"/>',
  cooler: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 10c-7-10 10-9 2 1m0 2c10 7-7 12-3 1m-1-2c-12 2-4-12 1-2"/>',
  case: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 6h6m-6 4h6"/><circle cx="12" cy="16" r="2"/>',
  psu: '<path d="m13 2-8 12h6l-1 8 9-12h-6z"/>',
  check: '<path d="m5 12 4 4L19 6"/>', arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  save: '<path d="M5 3h12l3 3v15H4V3zm3 0v6h8V3M8 21v-8h8v8"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  share: '<circle cx="18" cy="4" r="3"/><circle cx="5" cy="12" r="3"/><circle cx="18" cy="20" r="3"/><path d="m8 10 7-4M8 14l7 4"/>',
  shield: '<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6z"/><path d="m8 12 3 3 5-6"/>',
  compare: '<path d="M8 3v18M16 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>',
  alert: '<path d="m12 3 10 18H2zM12 9v5m0 3v1"/>',
  edit: '<path d="m4 16 12-12 4 4L8 20H4zm10-10 4 4"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 9M3 3v7h7"/>',
};
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name] || glyphs.cpu}</svg>`;
const money = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const catalog = {
  cpu: [
    {id:'ryzen7', name:'AMD Ryzen 7 7800X3D', brand:'AMD', line:'8 cores. A focused gaming foundation.', price:6499000, specs:{Socket:'AM5',Cores:'8 / 16',Power:'120 W'}, socket:'AM5', watts:120},
    {id:'ryzen9', name:'AMD Ryzen 9 7950X3D', brand:'AMD', line:'More cores for a mixed creative workload.', price:8999000, specs:{Socket:'AM5',Cores:'16 / 32',Power:'120 W'}, socket:'AM5', watts:120},
    {id:'intel7', name:'Intel Core i7-14700K', brand:'Intel', line:'An alternative platform for your build.', price:6299000, specs:{Socket:'LGA1700',Cores:'20 / 28',Power:'253 W max'}, socket:'LGA1700', watts:253},
  ],
  motherboard: [
    {id:'b650', name:'MSI B650 Tomahawk WiFi', brand:'MSI', line:'A full-size AM5 foundation with WiFi.', price:3499000, specs:{Socket:'AM5',Memory:'DDR5',Format:'ATX'}, socket:'AM5', memory:'DDR5', form:'ATX'},
    {id:'b650m', name:'ASUS TUF B650M-PLUS WiFi', brand:'ASUS', line:'AM5 in a smaller footprint.', price:3299000, specs:{Socket:'AM5',Memory:'DDR5',Format:'mATX'}, socket:'AM5', memory:'DDR5', form:'mATX'},
    {id:'z790', name:'MSI Z790 Gaming Plus WiFi', brand:'MSI', line:'An Intel foundation with DDR5 memory.', price:4199000, specs:{Socket:'LGA1700',Memory:'DDR5',Format:'ATX'}, socket:'LGA1700', memory:'DDR5', form:'ATX'},
  ],
  ram: [
    {id:'ram32', name:'Corsair Vengeance 32 GB', brand:'Corsair', line:'A balanced dual-channel memory kit.', price:1899000, specs:{Capacity:'2 × 16 GB',Type:'DDR5',Speed:'6000 MT/s'}, memory:'DDR5'},
    {id:'ram64', name:'G.Skill Trident Z5 64 GB', brand:'G.Skill', line:'More capacity for heavier projects.', price:3499000, specs:{Capacity:'2 × 32 GB',Type:'DDR5',Speed:'6000 MT/s'}, memory:'DDR5'},
  ],
  gpu: [
    {id:'4070s', name:'GeForce RTX 4070 SUPER', brand:'NVIDIA', line:'A balanced starting point.', price:10999000, specs:{Memory:'12 GB GDDR6X',Power:'220 W',Length:'267 mm'}, watts:220, length:267, badge:'Balanced choice'},
    {id:'4070ti', name:'GeForce RTX 4070 Ti SUPER', brand:'NVIDIA', line:'Extra video memory for your next project.', price:13999000, specs:{Memory:'16 GB GDDR6X',Power:'285 W',Length:'336 mm'}, watts:285, length:336, badge:'More room to create'},
    {id:'7900xt', name:'Radeon RX 7900 XT', brand:'AMD', line:'More VRAM. A different direction.', price:12999000, specs:{Memory:'20 GB GDDR6',Power:'315 W',Length:'313 mm'}, watts:315, length:313, badge:'Extra video memory'},
  ],
  storage: [
    {id:'ssd1', name:'Samsung 990 PRO 1 TB', brand:'Samsung', line:'A fast home for your system and apps.', price:1499000, specs:{Capacity:'1 TB',Interface:'PCIe 4.0',Format:'M.2 NVMe'}},
    {id:'ssd2', name:'Samsung 990 PRO 2 TB', brand:'Samsung', line:'More space for games and working files.', price:2499000, specs:{Capacity:'2 TB',Interface:'PCIe 4.0',Format:'M.2 NVMe'}},
  ],
  cooler: [
    {id:'air', name:'DeepCool AK400', brand:'DeepCool', line:'A straightforward air-cooling option.', price:599000, specs:{Type:'Air tower',Height:'155 mm',Socket:'AM5 / LGA1700'}, height:155},
    {id:'airplus', name:'Thermalright Peerless Assassin', brand:'Thermalright', line:'A dual-tower air-cooling alternative.', price:899000, specs:{Type:'Dual tower',Height:'157 mm',Socket:'AM5 / LGA1700'}, height:157},
    {id:'aio', name:'Arctic Liquid Freezer III 240', brand:'Arctic', line:'A liquid-cooling option with a 240 mm radiator.', price:1799000, specs:{Type:'Liquid AIO',Radiator:'240 mm',Socket:'AM5 / LGA1700'}, radiator:240},
  ],
  case: [
    {id:'airflow', name:'Corsair 4000D Airflow', brand:'Corsair', line:'A clean mid-tower built around airflow.', price:1599000, specs:{Format:'ATX / mATX',GPU:'Up to 360 mm',Cooler:'Up to 170 mm'}, forms:['ATX','mATX'], gpuMax:360, coolerMax:170, radiatorMax:280},
    {id:'compact', name:'Compact mATX case', brand:'Incus sample', line:'A smaller footprint, with closer fit limits.', price:999000, specs:{Format:'mATX',GPU:'Up to 300 mm',Cooler:'Up to 155 mm'}, forms:['mATX'], gpuMax:300, coolerMax:155, radiatorMax:240},
  ],
  psu: [
    {id:'psu850', name:'Corsair RM850e', brand:'Corsair', line:'Headroom for your core components.', price:2095000, specs:{Capacity:'850 W',Rating:'80+ Gold',Cables:'Modular'}, watts:850},
    {id:'psu650', name:'Corsair RM650', brand:'Corsair', line:'A lower-capacity power option.', price:1499000, specs:{Capacity:'650 W',Rating:'80+ Gold',Cables:'Modular'}, watts:650},
    {id:'psu1000', name:'Seasonic Focus GX-1000', brand:'Seasonic', line:'More capacity for a higher-power system.', price:2899000, specs:{Capacity:'1000 W',Rating:'80+ Gold',Cables:'Modular'}, watts:1000},
  ],
};
const categories = [
  ['cpu','Processor','Start with your platform.'], ['motherboard','Motherboard','The foundation for every connection.'],
  ['ram','Memory','Give your work room to breathe.'], ['gpu','Graphics card','Bring it to life.'],
  ['storage','Storage','A home for everything you make.'], ['cooler','CPU cooling','Keep your next idea running cool.'],
  ['case','Case','Find the right home.'], ['psu','Power supply','Power the whole picture.'],
];
const base = {name:'Afterhours', parts:{cpu:'ryzen7',motherboard:'b650',ram:'ram32',gpu:'4070s',storage:'ssd1',cooler:null,case:null,psu:'psu850'}, assembly:'parts',extras:[]};
const services = {parts:{name:'Parts only',price:0},build:{name:'Incus assembly',price:250000}};
const accessories = {mouse:{name:'Wireless gaming mouse',price:799000},keyboard:{name:'Mechanical keyboard',price:1299000}};
let build=structuredClone(base), active='gpu', mode='inspiration', brand='all', fitOnly=true, query='', sort='featured', comparisons=new Set(['4070s','4070ti']), dirty=false;
let savedAt=null, lastFocus=null, toastTimer;
function item(key) { return catalog[key].find(p=>p.id===build.parts[key]) || null; }
function restore(candidate) {
  if(!candidate || typeof candidate!=='object' || !candidate.parts) return;
  build.name=typeof candidate.name==='string' ? candidate.name.trim().slice(0,40)||'Untitled build' : base.name;
  for(const [key, options] of Object.entries(catalog)) build.parts[key]=options.some(p=>p.id===candidate.parts[key])?candidate.parts[key]:null;
  build.assembly=Object.hasOwn(services,candidate.assembly)?candidate.assembly:'parts';
  build.extras=Array.isArray(candidate.extras)?Object.keys(accessories).filter(k=>candidate.extras.includes(k)):[];
}
try {
  const shared=new URLSearchParams(location.search).get('build');
  if(shared) restore(JSON.parse(shared));
  else {const saved=JSON.parse(localStorage.getItem('incus-studio-v02')||'null');if(saved?.version===2){restore(saved.build);savedAt=saved.savedAt;}}
} catch { /* A corrupt or old preview cannot prevent a new sample build. */ }

function totals() {
  const parts=Object.keys(catalog).reduce((sum,key)=>sum+(item(key)?.price||0),0);
  const extras=build.extras.reduce((sum,key)=>sum+accessories[key].price,0);
  return {parts,extras,assembly:services[build.assembly].price,total:parts+extras+services[build.assembly].price};
}
function checks(parts=build.parts) {
  const pick=key=>catalog[key].find(p=>p.id===parts[key]);
  const cpu=pick('cpu'),board=pick('motherboard'),ram=pick('ram'),gpu=pick('gpu'),cooler=pick('cooler'),box=pick('case'),psu=pick('psu');
  const rows=[];
  const add=(name,ready,pass,ok,bad)=>rows.push({name,status:!ready?'pending':pass?'pass':'conflict',detail:!ready?'Choose the remaining part to check.':pass?ok:bad});
  add('Processor + motherboard',cpu&&board,cpu?.socket===board?.socket,`${cpu?.socket||''} socket match.`,`Processor and motherboard sockets differ.`);
  add('Memory platform',board&&ram,board?.memory===ram?.memory,'DDR5 memory matches the board.','Memory and motherboard types differ.');
  add('Graphics card clearance',gpu&&box,(gpu?.length||0)<=(box?.gpuMax||0),`${gpu?.length||0} mm card / ${box?.gpuMax||0} mm case limit.`,'Graphics card exceeds the sample case clearance.');
  add('Motherboard + case',board&&box,box?.forms.includes(board?.form),`${board?.form||''} board supported by case.`,'Motherboard format is not supported by this case.');
  add('Cooler clearance',cooler&&box,cooler?.radiator?cooler.radiator<=box?.radiatorMax:cooler?.height<=box?.coolerMax,cooler?.radiator?'Radiator size is listed as supported.':'Cooler height is within the listed case limit.','Cooler exceeds the listed case clearance.');
  const watts=(cpu?.watts||0)+(gpu?.watts||0)+85;
  const recommended=Math.ceil(watts/0.7/50)*50;
  add('Power headroom',cpu&&gpu&&psu,(psu?.watts||0)>=recommended,`${recommended} W+ suggested / ${psu?.watts||0} W selected.`,'Selected PSU is below this sample headroom estimate.');
  return {rows,watts,recommended,conflicts:rows.filter(r=>r.status==='conflict'),pending:rows.filter(r=>r.status==='pending')};
}
function conflictsFor(key, product) {
  const related={cpu:['Processor + motherboard','Power headroom'],motherboard:['Processor + motherboard','Memory platform','Motherboard + case'],ram:['Memory platform'],gpu:['Graphics card clearance','Power headroom'],storage:[],cooler:['Cooler clearance'],case:['Graphics card clearance','Motherboard + case','Cooler clearance'],psu:['Power headroom']};
  return checks({...build.parts,[key]:product.id}).conflicts.filter(row=>related[key].includes(row.name));
}
function gpuArt(id) {
  return `<svg class="gpu-illustration" viewBox="0 0 260 140" fill="none" aria-hidden="true"><defs><linearGradient id="metal-${id}" x1="30" y1="20" x2="210" y2="110"><stop stop-color="#64717d"/><stop offset="1" stop-color="#19232e"/></linearGradient></defs><path d="M17 35 45 19h194v74l-28 22H18z" fill="url(#metal-${id})" stroke="#728596"/><path d="M18 35h193l28-16M211 35v80" stroke="#9aaab7"/><path d="M30 116h144v8H30z" fill="#b9a173"/>${[65,130,193].map(x=>`<g transform="translate(${x},70)"><circle r="26" fill="#101923" stroke="#8094a4"/><circle r="20" fill="#263644"/>${Array.from({length:7},(_,j)=>`<path d="M0-3C-12-27 20-24 8-6Z" fill="#5b7183" transform="rotate(${j*51.4})"/>`).join('')}<circle r="6" fill="#0c1823" stroke="#8a9baa"/></g>`).join('')}</svg>`;
}
function productArt(key,p) { return key==='gpu'?gpuArt(p.id):`<span class="component-art ${key}">${icon(key)}</span>`; }
function notify(text) {const el=document.querySelector('.toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);}
let lastFocusSelector='';
function restoreFocus(){if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});else if(lastFocusSelector)document.querySelector(lastFocusSelector)?.focus({preventScroll:true});}
function openDialog(content) {lastFocus=document.activeElement;lastFocusSelector=['data-review','data-price','data-open-compare','data-extras','data-rename','data-reset','data-share'].filter(attr=>lastFocus?.hasAttribute(attr)).map(attr=>`[${attr}]`)[0]||'';document.querySelector('#dialog-content').innerHTML=content;document.querySelector('#studio-dialog').showModal();}
function closeDialog(){document.querySelector('#studio-dialog').close();queueMicrotask(restoreFocus);}
const dialogTop = (label,title) => `<div class="dialog-top"><div><span class="eyebrow">${label}</span><h2 id="dialog-heading">${title}</h2></div><button class="icon-button" data-close aria-label="Close dialog">${icon('close')}</button></div>`;

function componentRail() {
  return `<aside class="component-rail" aria-label="Build components"><div class="rail-heading"><span class="eyebrow">YOUR COMPONENTS</span><span class="rail-counter">${Object.values(build.parts).filter(Boolean).length} <i>/ 8</i></span></div><div class="rail-items">${categories.map(([key,label],index)=>{
    const p=item(key);return `<button class="rail-item ${active===key?'active':''} ${!p?'empty':''}" data-category="${key}" aria-pressed="${active===key}"><span class="rail-icon">${icon(key)}</span><span class="rail-copy"><small>${String(index+1).padStart(2,'0')} / ${label}</small><strong>${escape(p?.name||`Choose ${label.toLowerCase()}`)}</strong></span><span class="rail-status">${p?icon('check'):icon('plus')}</span></button>`;
  }).join('')}</div><button class="rail-extras" data-extras>${icon('plus')} Accessories & setup <span>${build.extras.length?build.extras.length:'Optional'}</span></button><div class="rail-note">${icon('save')}<span>${dirty?'Unsaved changes':savedAt?'Saved on this device':'A little progress goes a long way.'}<button data-save>${dirty?'Save your progress':savedAt?'Save again':'Save and finish later'}</button></span></div></aside>`;
}
function stage() {
  const report=checks(), count=Object.values(build.parts).filter(Boolean).length;
  let content='';
  if(mode==='inspiration') content=`<div class="inspiration-photo"><img src="assets/pc.jpg" alt="Example black desktop PC with blue lighting, shown as build inspiration"><div class="image-caption"><span class="eyebrow">CREATE YOUR NEXT CHAPTER</span><h2>Power has a<br>personal side.</h2></div><div class="inspiration-label">${icon('case')} INSPIRATION IMAGE</div><p class="image-note">This photo is inspiration. Your final PC’s appearance depends on the parts you choose.</p></div>`;
  if(mode==='parts') content=`<div class="stage-parts"><div class="stage-title"><span class="eyebrow">THE BUILD SO FAR</span><h2>Every part has a purpose.</h2><p>Review your choices. Select a row to change a component.</p></div>${categories.map(([key,label])=>`<button class="part-list-row" data-category="${key}">${icon(key)}<span><small>${label}</small><strong>${escape(item(key)?.name||'Not selected')}</strong></span><b>${item(key)?money(item(key).price):'Choose →'}</b></button>`).join('')}</div>`;
  if(mode==='checks') content=`<div class="stage-checks"><div class="stage-title"><span class="eyebrow">FIT, BEFORE FINISH</span><h2>A little certainty.<br>A better build.</h2><p>Checks use the sample specifications below. They do not replace a final physical-fit review.</p></div>${report.rows.map(row=>`<div class="check-row ${row.status}"><span class="check-icon">${icon(row.status==='pass'?'check':row.status==='conflict'?'alert':'plus')}</span><div><strong>${row.name}</strong><p>${row.detail}</p></div><small>${row.status==='pass'?'Checked':row.status==='conflict'?'Needs change':'Pending'}</small></div>`).join('')}<div class="manual-check">${icon('shield')}<span>BIOS version, exact cable clearances and mounting positions still need a final review.</span></div></div>`;
  return `<section class="build-stage" aria-label="Build preview"><div class="stage-tabs" role="tablist" aria-label="Build view">${[['inspiration','Inspiration'],['parts','Parts list'],['checks','Build checks']].map(([value,label])=>`<button role="tab" id="tab-${value}" aria-controls="stage-panel" tabindex="${mode===value?'0':'-1'}" aria-selected="${mode===value}" data-mode="${value}">${label}${value==='checks'?`<span>${report.conflicts.length||report.pending.length}</span>`:''}</button>`).join('')}<span class="stage-build-count">${String(count).padStart(2,'0')} / 08</span></div><div id="stage-panel" class="stage-content" role="tabpanel" aria-labelledby="tab-${mode}" tabindex="0">${content}</div><div class="stage-status"><span><i class="live-dot"></i> ${count} parts selected</span><button data-mode="checks">${report.conflicts.length?`${report.conflicts.length} checks need attention`:count<8?`${8-count} parts left to choose`:'Core sample checks complete'} ${icon('arrow')}</button></div></section>`;
}
function listProducts() {
  let options=catalog[active].filter(p=>(brand==='all'||p.brand===brand)&&(!query||`${p.name} ${p.brand} ${Object.values(p.specs).join(' ')}`.toLowerCase().includes(query.toLowerCase()))&&(!fitOnly||conflictsFor(active,p).length===0));
  if(sort==='low')options.sort((a,b)=>a.price-b.price);if(sort==='high')options.sort((a,b)=>b.price-a.price);
  return options;
}
function picker() {
  const [,label,heading]=categories.find(c=>c[0]===active), options=listProducts(), brands=[...new Set(catalog[active].map(p=>p.brand))];
  return `<section class="picker" aria-label="Choose ${label.toLowerCase()}"><div class="picker-heading"><span class="eyebrow">${String(categories.findIndex(c=>c[0]===active)+1).padStart(2,'0')} / ${label.toUpperCase()}</span><h2>${heading}</h2><p>Pick the part that fits your priorities.</p></div><div class="picker-search">${icon('search')}<input id="product-search" aria-label="Search components" type="search" value="${escape(query)}" placeholder="Search ${label.toLowerCase()}…"><span>/</span></div><div class="picker-tools"><label><input id="fit-only" type="checkbox" ${fitOnly?'checked':''}> Fit current build <span title="Checks use sample specifications">ⓘ</span></label><label class="sort-label">Sort<select id="sort" aria-label="Sort components"><option value="featured" ${sort==='featured'?'selected':''}>Featured</option><option value="low" ${sort==='low'?'selected':''}>Price: low first</option><option value="high" ${sort==='high'?'selected':''}>Price: high first</option></select></label></div><div class="brand-tabs" aria-label="Filter by brand"><button data-brand="all" class="${brand==='all'?'active':''}" aria-pressed="${brand==='all'}">All</button>${brands.map(b=>`<button data-brand="${escape(b)}" class="${brand===b?'active':''}" aria-pressed="${brand===b}">${b}</button>`).join('')}<span>${options.length} options</span></div><div class="product-options">${options.length?options.map((p,index)=>{
    const chosen=build.parts[active]===p.id, conflicts=conflictsFor(active,p);
    return `<article class="option ${chosen?'chosen':''}"><div class="option-image">${productArt(active,p)}</div><div class="option-top"><span>${p.brand}</span><label class="compare-pick"><input type="checkbox" data-compare="${p.id}" aria-label="Compare ${p.name}" ${comparisons.has(p.id)?'checked':''}><span>Compare</span></label></div><h3>${p.name}</h3><p class="option-description">${p.line}</p><div class="option-specs">${Object.entries(p.specs).map(([key,value])=>`<span><small>${key}</small><b>${value}</b></span>`).join('')}</div><div class="option-bottom"><strong>${money(p.price)}</strong><button data-select="${p.id}" aria-label="${chosen?'Selected':'Select'} ${p.name}" class="${chosen?'selected-button':'choose-button'}">${chosen?icon('check'):icon('plus')} ${chosen?'Selected':'Select'}</button></div>${conflicts.length?`<p class="option-warning">${icon('alert')} Changes needed elsewhere in your build</p>`:chosen?'<div class="selected-line">Currently in your build</div>':''}</article>`;
  }).join(''):`<div class="empty-results">${icon('search')}<h3>No parts match these filters.</h3><p>Try another search or turn off “Fit current build” to see alternatives.</p><button class="text-button" data-clear-filters>Clear filters</button></div>`}</div><div class="picker-footer"><button class="compare-button" data-open-compare ${comparisons.size<2?'disabled':''}>${icon('compare')} Compare ${comparisons.size?`(${comparisons.size})`:''}</button><span>Sample catalog · IDR pricing</span></div></section>`;
}
function footer() {
  const t=totals(),report=checks(),count=Object.values(build.parts).filter(Boolean).length;
  return `<section class="finishing"><div class="power-panel"><span class="eyebrow">A LITTLE ROOM TO GROW</span><div class="power-heading">${icon('psu')}<strong>Power, in perspective.</strong><span>${report.watts} W <i>/ ${item('psu')?.watts||'—'} W</i></span></div><div class="power-track"><i style="width:${Math.min(100,report.watts/(item('psu')?.watts||report.recommended)*100)}%"></i></div><p>Estimated component draw · ${report.recommended} W+ suggested with headroom.</p></div><div class="assembly-panel"><span class="eyebrow">FINISH IT YOUR WAY</span><div class="assembly-options">${Object.entries(services).map(([key,service])=>`<button data-service="${key}" class="${build.assembly===key?'active':''}" aria-pressed="${build.assembly===key}"><span class="radio">${build.assembly===key?icon('check'):''}</span><span><strong>${service.name}</strong><small>${key==='parts'?'You take it from here.':'Assembly and basic stability checks.'}</small></span><b>${service.price?'+'+money(service.price):'No service fee'}</b></button>`).join('')}</div></div><button class="extras-card" data-extras>${icon('plus')}<span><strong>The finishing touches.</strong><small>${build.extras.length?`${build.extras.length} accessories selected`:'Add a mouse or keyboard.'}</small></span>${icon('arrow')}</button></section><div class="order-bar"><div class="order-state">${icon(report.conflicts.length?'alert':'shield')}<span><strong>${report.conflicts.length?'Let’s resolve the fit checks.':count<8?'Your next PC is taking shape.':'Ready for a closer look.'}</strong><small>${report.conflicts.length?'Review the highlighted checks before proceeding.':count<8?`${8-count} core parts still to choose. Save now or keep exploring.`:'Review every component before moving forward.'}</small></span></div><button class="price-toggle" data-price aria-label="View price breakdown"><span>Build subtotal ${icon('plus')}</span><strong data-total>${money(t.total)}</strong><small>${count<8?'Remaining components not included':'Before shipping; sample prices'}${t.assembly?' · assembly included':''}</small></button><button class="button primary review-build" data-review>${count<8?'Review progress':'Review build'} ${icon('arrow')}</button></div><p class="bottom-note">Final stock, pricing and physical fit are checked before ordering. Component specifications and prices in this design preview are illustrative.</p>`;
}
function render({focusSearch=false,focusSelected=false}={}) {
  const search=document.querySelector('#product-search'),cursor=search?.selectionStart;
  document.querySelector('#studio').innerHTML=`<div class="studio-intro"><div class="intro-copy"><span class="eyebrow">INCUS / CUSTOM SYSTEMS</span><h1>Your vision. <em>Built different.</em></h1><p>A machine shaped around what you do. Make every part count.</p></div><div class="build-identity"><span class="build-number">01</span><span><small>YOUR PERSONAL BUILD</small><button class="build-name" data-rename>${escape(build.name)} ${icon('edit')}</button></span></div><div class="build-actions"><button class="button secondary" data-save>${icon('save')} Save build</button><button class="icon-button" data-share aria-label="Share sample build">${icon('share')}</button><button class="icon-button" data-reset aria-label="Reset sample build">${icon('reset')}</button></div></div><div class="workspace">${componentRail()}${stage()}${picker()}</div>${footer()}`;
  document.querySelectorAll('.rail-items,.brand-tabs').forEach(rail=>{const current=rail.querySelector('.active');if(current&&rail.scrollWidth>rail.clientWidth)rail.scrollLeft=current.offsetLeft-rail.offsetLeft-(rail.clientWidth-current.clientWidth)/2;});
  if(focusSelected){const list=document.querySelector('.product-options'),chosen=list?.querySelector('.chosen');if(chosen&&list.scrollHeight>list.clientHeight)list.scrollTop=chosen.offsetTop-list.offsetTop-10;}
  if(focusSearch){const input=document.querySelector('#product-search');input.focus();input.setSelectionRange(cursor,cursor);}
}
function category(key) {active=key;brand='all';query='';sort='featured';comparisons=new Set(catalog[key].slice(0,2).map(p=>p.id));render({focusSelected:true});if(innerWidth<850)document.querySelector('.picker').scrollIntoView({behavior:'smooth',block:'start'});}
function select(id) {
  const product=catalog[active].find(p=>p.id===id);if(!product)return;
  // Socket changes get an explicit explanation before another selection is removed.
  const counterpart=active==='cpu'?'motherboard':active==='motherboard'?'cpu':null;
  if(counterpart&&item(counterpart)&&product.socket!==item(counterpart).socket){
    openDialog(`${dialogTop('A DIFFERENT FOUNDATION','This changes your platform.')}<p class="dialog-intro">${product.name} uses <strong>${product.socket}</strong>. Your current ${counterpart==='cpu'?'processor':'motherboard'} uses <strong>${item(counterpart).socket}</strong>.</p><div class="change-notice">${icon('alert')}<span>We’ll remove <b>${item(counterpart).name}</b> from this sample build so you can choose a matching replacement.</span></div><div class="dialog-actions"><button class="button secondary" data-close>Keep current build</button><button class="button primary" data-platform="${id}" data-counterpart="${counterpart}">Change platform ${icon('arrow')}</button></div>`);return;
  }
  build.parts[active]=id;dirty=true;render({focusSelected:true});
  notify(`${product.name} selected.`);
}
function priceBreakdown(){const t=totals();openDialog(`${dialogTop('YOUR BUILD, ITEM BY ITEM','No surprises in the subtotal.')}<div class="price-lines">${categories.map(([key,label])=>`<div><span>${label}<small>${escape(item(key)?.name||'Not selected')}</small></span><b>${item(key)?money(item(key).price):'—'}</b></div>`).join('')}<div><span>Assembly<small>${services[build.assembly].name}</small></span><b>${money(t.assembly)}</b></div>${build.extras.map(key=>`<div><span>${accessories[key].name}</span><b>${money(accessories[key].price)}</b></div>`).join('')}</div><div class="dialog-total"><span>Sample subtotal</span><strong>${money(t.total)}</strong></div><p class="dialog-footnote">Unselected components and shipping are excluded. Final prices and availability are checked before ordering.</p>`);}
function compare(){
  const options=catalog[active].filter(p=>comparisons.has(p.id));if(options.length<2)return;
  const keys=[...new Set(options.flatMap(p=>Object.keys(p.specs)))];
  openDialog(`${dialogTop('SIDE BY SIDE','The details make the difference.')}<p class="dialog-intro">Compare sample specifications for your ${categories.find(c=>c[0]===active)[1].toLowerCase()}.</p><div class="compare-scroll"><table class="compare-table"><thead><tr><th>Component</th>${options.map(p=>`<th>${productArt(active,p)}<span>${p.name}</span></th>`).join('')}</tr></thead><tbody>${keys.map(key=>`<tr><th>${key}</th>${options.map(p=>`<td>${p.specs[key]||'—'}</td>`).join('')}</tr>`).join('')}<tr><th>Sample price</th>${options.map(p=>`<td><strong>${money(p.price)}</strong></td>`).join('')}</tr><tr><th></th>${options.map(p=>`<td><button class="button ${build.parts[active]===p.id?'secondary':'primary'}" data-compare-select="${p.id}">${build.parts[active]===p.id?'Selected':'Choose this part'}</button></td>`).join('')}</tr></tbody></table></div><p class="dialog-footnote">Exact specifications vary by manufacturer model. These entries illustrate the comparison experience.</p>`);
}
function review(){
  const count=Object.values(build.parts).filter(Boolean).length, report=checks();
  openDialog(`${dialogTop('BUILD REVIEW / '+escape(build.name),count<8?'A strong start. A little more to go.':report.conflicts.length?'A few details need attention.':'Your next chapter starts here.')}<p class="dialog-intro">${count} of 8 core components selected. ${count<8?'Complete the remaining parts before ordering.':'Review the selected components and fit notes.'}</p><div class="review-list">${categories.map(([key,label])=>`<button data-review-category="${key}" class="${!item(key)?'missing':''}">${icon(key)}<span><small>${label}</small><strong>${escape(item(key)?.name||'Still to choose')}</strong></span><b>${item(key)?money(item(key).price):'Choose →'}</b></button>`).join('')}</div><div class="review-additions"><div><span>${services[build.assembly].name}</span><b>${money(services[build.assembly].price)}</b></div>${build.extras.map(key=>`<div><span>${accessories[key].name}</span><b>${money(accessories[key].price)}</b></div>`).join('')}</div>${report.conflicts.length?`<div class="change-notice">${icon('alert')}<span>${report.conflicts.map(c=>c.detail).join(' ')}</span></div>`:''}<div class="dialog-total"><span>Sample subtotal</span><strong>${money(totals().total)}</strong></div><div class="dialog-actions"><button class="button secondary" data-close>Keep building</button><button class="button primary" data-review-checks>Review build checks ${icon('arrow')}</button></div><p class="dialog-footnote">This preview does not create an order or take payment. BIOS, mounting and final physical fit still require review.</p>`);
}
function extras(){openDialog(`${dialogTop('THE FINISHING TOUCHES','Make the whole setup yours.')}<p class="dialog-intro">Optional accessories, kept separate from your core components.</p><div class="accessory-list">${Object.entries(accessories).map(([key,p])=>`<label><input type="checkbox" data-accessory="${key}" ${build.extras.includes(key)?'checked':''}><span><strong>${p.name}</strong><small>Sample accessory</small></span><b>${money(p.price)}</b></label>`).join('')}</div><div class="dialog-actions"><button class="button primary" data-close>Done ${icon('check')}</button></div>`);}

document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-close'))closeDialog();
  if(button.dataset.category)category(button.dataset.category);
  if(button.dataset.mode){mode=button.dataset.mode;render();}
  if(button.dataset.select)select(button.dataset.select);
  if(button.dataset.brand){brand=button.dataset.brand;render();}
  if(button.hasAttribute('data-clear-filters')){query='';brand='all';fitOnly=false;render();}
  if(button.hasAttribute('data-open-compare'))compare();
  if(button.dataset.compareSelect){const id=button.dataset.compareSelect;closeDialog();select(id);}
  if(button.dataset.platform){build.parts[active]=button.dataset.platform;build.parts[button.dataset.counterpart]=null;dirty=true;closeDialog();render();notify('Platform changed. Choose a matching replacement to continue.');}
  if(button.hasAttribute('data-review'))review();
  if(button.hasAttribute('data-price'))priceBreakdown();
  if(button.hasAttribute('data-extras'))extras();
  if(button.dataset.reviewCategory){closeDialog();category(button.dataset.reviewCategory);}
  if(button.hasAttribute('data-review-checks')){closeDialog();mode='checks';render();if(innerWidth<850)document.querySelector('.build-stage').scrollIntoView({behavior:'smooth'});}
  if(button.dataset.service){build.assembly=button.dataset.service;dirty=true;render();}
  if(button.hasAttribute('data-save')){try{savedAt=new Date().toISOString();localStorage.setItem('incus-studio-v02',JSON.stringify({version:2,build,savedAt}));dirty=false;render();notify('Your sample build is saved on this device.');}catch{notify('This browser could not save the build. You can copy a share link instead.');}}
  if(button.hasAttribute('data-share')){const url=new URL(location.href);url.searchParams.set('build',JSON.stringify(build));try{await navigator.clipboard.writeText(url.href);notify('Build link copied. It includes sample selections, not personal data.');}catch{openDialog(`${dialogTop('SHARE YOUR IDEA','Your build, ready to share.')}<label class="share-field">Copy this link<input readonly value="${escape(url.href)}"></label><p class="dialog-footnote">This link opens the design preview, not a live order.</p>`);}}
  if(button.hasAttribute('data-reset'))openDialog(`${dialogTop('A FRESH DIRECTION','Start again from the sample?')}<p class="dialog-intro">This resets the current preview. A build you previously saved stays on this device until you save over it.</p><div class="dialog-actions"><button class="button secondary" data-close>Keep this build</button><button class="button primary" data-confirm-reset>Reset preview</button></div>`);
  if(button.hasAttribute('data-confirm-reset')){build=structuredClone(base);active='gpu';mode='inspiration';brand='all';query='';fitOnly=true;sort='featured';comparisons=new Set(['4070s','4070ti']);dirty=true;closeDialog();render();}
  if(button.hasAttribute('data-rename'))openDialog(`${dialogTop('MAKE IT PERSONAL','Give your build a name.')}<form id="name-form"><label class="name-field">Build name<input id="build-name-input" required maxlength="40" value="${escape(build.name)}" autocomplete="off"></label><div class="dialog-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary" type="submit">Save name ${icon('check')}</button></div></form>`);
});
document.addEventListener('submit',event=>{if(event.target.id==='name-form'){event.preventDefault();build.name=document.querySelector('#build-name-input').value.trim()||'Untitled build';dirty=true;closeDialog();render();}});
document.addEventListener('input',event=>{if(event.target.id==='product-search'){query=event.target.value;render({focusSearch:true});}});
document.addEventListener('change',event=>{
  const target=event.target;
  if(target.id==='fit-only'){fitOnly=target.checked;render();}
  if(target.id==='sort'){sort=target.value;render();}
  if(target.dataset.compare){if(target.checked&&comparisons.size>=2){target.checked=false;notify('Compare two parts at a time. Deselect one to choose another.');return;}target.checked?comparisons.add(target.dataset.compare):comparisons.delete(target.dataset.compare);document.querySelector('[data-open-compare]').disabled=comparisons.size<2;document.querySelector('[data-open-compare]').innerHTML=`${icon('compare')} Compare ${comparisons.size?`(${comparisons.size})`:''}`;}
  if(target.dataset.accessory){build.extras=target.checked?[...build.extras.filter(k=>k!==target.dataset.accessory),target.dataset.accessory]:build.extras.filter(k=>k!==target.dataset.accessory);dirty=true;render();}
});
document.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)&&document.activeElement.matches('.stage-tabs [role=tab]')){event.preventDefault();const tabs=['inspiration','parts','checks'];mode=event.key==='Home'?tabs[0]:event.key==='End'?tabs[2]:tabs[(tabs.indexOf(mode)+(event.key==='ArrowRight'?1:2))%3];render();document.querySelector(`#tab-${mode}`).focus();return;}if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();document.querySelector('#product-search')?.focus();}});
document.querySelector('#studio-dialog').addEventListener('close',()=>queueMicrotask(restoreFocus));
render({focusSelected:true});
