// Apply reviewed, exact message entries to customer TSX. No network or machine
// translation is involved. Re-running only adds keys not already wrapped in t().
import ts from 'typescript';
import { readFile, writeFile } from 'node:fs/promises';
const messages=JSON.parse(await readFile('src/lib/i18n/id.json','utf8'));
const files=[
 'src/app/checkout/page.tsx','src/app/checkout/success/page.tsx','src/app/checkout/payment/page.tsx',
 'src/app/auth/page.tsx','src/app/auth/recover/page.tsx','src/app/account/page.tsx','src/app/transactions/page.tsx','src/app/orders/track/page.tsx',
 'src/app/products/[id]/page.tsx','src/app/components/page.tsx','src/app/components/[category]/page.tsx','src/app/page.tsx',
 'src/components/navigation/PersistentHeader.tsx','src/components/navigation/CartDrawer.tsx',
 'src/components/products/BackInStockModal.tsx','src/components/products/ProductReviewsSection.tsx',
 'src/components/shipping/GlobalLocationModal.tsx','src/components/shipping/GoogleMapPicker.tsx',
 'src/components/orders/FinancialSummary.tsx','src/components/ui/CollectionPager.tsx',
];
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&nbsp;/g,' ');
for(const file of files){
 const source=await readFile(file,'utf8'),sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const edits=[],roots=new Set();
 function root(node){for(let p=node.parent;p;p=p.parent)if(ts.isFunctionDeclaration(p)&&p.parent===sf&&p.body&&/^[A-Z]/.test(p.name?.text||'Default'))return p;return null;}
 function add(node,replacement){const fn=root(node);if(!fn)return;edits.push({start:node.getStart(sf),end:node.end,text:replacement});roots.add(fn);}
 function visit(node){
  if(ts.isJsxText(node)){
   const value=decode(node.getText(sf)).replace(/\s+/g,' ').trim();
   if(messages[value])add(node,`{t(${JSON.stringify(value)})}`);
  }else if(ts.isJsxAttribute(node)&&node.initializer&&ts.isStringLiteral(node.initializer)&&['placeholder','title','aria-label','alt'].includes(node.name.getText(sf))){
   const value=decode(node.initializer.text);if(messages[value])add(node.initializer,`{t(${JSON.stringify(value)})}`);
  }else if(ts.isStringLiteral(node)&&messages[node.text]){
   const p=node.parent;
   if(ts.isCallExpression(p)&&p.expression.getText(sf)==='t')return;
   const condition=ts.isConditionalExpression(p)&&(p.whenTrue===node||p.whenFalse===node);
   const label=ts.isPropertyAssignment(p)&&['label','title','description','text','placeholder'].includes(p.name.getText(sf));
   const error=(ts.isCallExpression(p)||ts.isNewExpression(p))&&/^(set\w*Error|Error|alert)$/.test(p.expression.getText(sf));
   if(condition||label||error)add(node,`t(${JSON.stringify(node.text)})`);
  }
  ts.forEachChild(node,visit);
 }
 visit(sf);
 if(!edits.length)continue;
 for(const fn of roots){const body=fn.body.getText(sf);if(!/const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useTranslation\(/.test(body))edits.push({start:fn.body.getStart(sf)+1,end:fn.body.getStart(sf)+1,text:'\n  const {t}=useTranslation();'});}
 if(!source.includes('import { useTranslation }')&&!source.includes('import { useTranslation,'))edits.push({start:sf.statements[0].end,end:sf.statements[0].end,text:'\nimport { useTranslation } from "@/components/storefront/StorefrontProvider";'});
 let output=source;for(const edit of edits.sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+edit.text+output.slice(edit.end);
 await writeFile(file,output,'utf8');
 console.log(`${file}: ${edits.length} reviewed substitutions`);
}
