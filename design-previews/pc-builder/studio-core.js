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
const base = {name:'My PC build', parts:{cpu:'ryzen7',motherboard:'b650',ram:'ram32',gpu:'4070s',storage:'ssd1',cooler:null,case:null,psu:'psu850'}, assembly:'parts',extras:[]};
const services = {parts:{name:'Parts only',price:0},build:{name:'Incus assembly',price:250000}};
const accessories = {mouse:{name:'Wireless gaming mouse',price:799000},keyboard:{name:'Mechanical keyboard',price:1299000}};
let build=structuredClone(base), active='gpu', mode='inspiration', brand='all', fitOnly=true, query='', sort='featured', comparisons=new Set(), dirty=false;
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
  else {const saved=JSON.parse((localStorage.getItem('incus-studio-v03')||localStorage.getItem('incus-studio-v02'))||'null');if([2,3].includes(saved?.version)){restore(saved.build);savedAt=saved.savedAt;}}
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
function openDialog(content, kind='standard') {
  const dialog=document.querySelector('#studio-dialog');
  if(!dialog.open){
    lastFocus=document.activeElement;
    lastFocusSelector=lastFocus?.dataset.category?'[data-category="'+lastFocus.dataset.category+'"]':['data-review','data-price','data-open-compare','data-extras','data-rename','data-reset','data-share','data-checks'].filter(attr=>lastFocus?.hasAttribute(attr)).map(attr=>'['+attr+']')[0]||'';
  }
  dialog.dataset.kind=kind;
  document.querySelector('#dialog-content').innerHTML=content;
  dialog.showModal();
}
function closeDialog(){document.querySelector('#studio-dialog').close();queueMicrotask(restoreFocus);}
const dialogTop = (label,title) => `<div class="dialog-top"><div><span class="eyebrow">${label}</span><h2 id="dialog-heading">${title}</h2></div><button class="icon-button" data-close aria-label="Close dialog">${icon('close')}</button></div>`;

