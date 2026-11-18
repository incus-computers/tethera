// Maintainer codemod: wrap HTTP exports and remove raw diagnostics from legacy catches.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
function files(root) { return fs.readdirSync(root, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(path.join(root,e.name)) : [path.join(root,e.name)]); }
const methods = new Set(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']);
for (const file of [...files('src/app/api'), ...files('src/lib')].filter(f=>f.endsWith('.ts') && !f.endsWith('telemetry.ts'))) {
  let text = fs.readFileSync(file,'utf8');
  const source = ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true), edits=[];
  let logging=false, wrapper=false;
  const api = file.replaceAll('\\','/').startsWith('src/app/api/');
  const wrapped = text.includes('from "@/lib/operations/apiProtection"');
  function visit(node) {
    if(ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(source)==='console' && ['log','warn','error'].includes(node.expression.name.text)) {
      edits.push([node.getStart(source),node.end,'safeFailure()']); logging=true; return;
    }
    if(api && ts.isBinaryExpression(node) && node.operatorToken.kind===ts.SyntaxKind.BarBarToken && /^(error|err|e)\.message$/.test(node.left.getText(source)) && ts.isStringLiteral(node.right)) {
      edits.push([node.getStart(source),node.end,node.right.getText(source)]); return;
    }
    if(api && ts.isCallExpression(node) && node.expression.getText(source)==='internalServerErrorProblem' && node.arguments[0] && /^(error|err|e)\.message$/.test(node.arguments[0].getText(source))) edits.push([node.arguments[0].getStart(source),node.arguments[0].end,'"Service temporarily unavailable. Please retry."']);
    if(api && ts.isPropertyAssignment(node) && node.name.getText(source)==='error' && /^(error|err|e)\.message$/.test(node.initializer.getText(source))) {
      // Leave deliberate typed domain errors alone; the response wrapper scrubs all 5xx.
      if(!node.parent.parent?.getText(source).includes('instanceof')) edits.push([node.initializer.getStart(source),node.initializer.end,'"Service temporarily unavailable. Please retry."']);
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
  if(api && !wrapped) for(const statement of source.statements) {
    const exported = statement.modifiers?.find(m=>m.kind===ts.SyntaxKind.ExportKeyword);
    if(!exported)continue;
    if(ts.isFunctionDeclaration(statement) && methods.has(statement.name?.text)) {
      const method=statement.name.text;
      edits.push([exported.getStart(source),exported.end,'']);
      edits.push([statement.name.getStart(source),statement.name.end,`protected${method}`]);
      edits.push([statement.end,statement.end,`\nexport const ${method} = withApiProtection(protected${method});`]); wrapper=true;
    }
    if(ts.isVariableStatement(statement)) for(const declaration of statement.declarationList.declarations) if(methods.has(declaration.name.getText(source)) && declaration.initializer) {
      edits.push([declaration.initializer.getStart(source),declaration.initializer.getStart(source),'withApiProtection(']);
      edits.push([declaration.initializer.end,declaration.initializer.end,')']); wrapper=true;
    }
  }
  if(!edits.length)continue;
  for(const [start,end,replacement] of edits.sort((a,b)=>b[0]-a[0]||b[1]-a[1])) text=text.slice(0,start)+replacement+text.slice(end);
  if(logging && !text.includes('import { safeFailure }'))text='import { safeFailure } from "@/lib/operations/telemetry";\n'+text;
  if(wrapper)text='import { withApiProtection } from "@/lib/operations/apiProtection";\n'+text;
  fs.writeFileSync(file,text,'utf8');
}
