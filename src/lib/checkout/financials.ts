/** Whole-IDR commercial arithmetic. This is not a statutory tax-invoice engine. */
export const MAX_IDR=9_999_999_999;
export function idr(value:unknown,label="amount"):number{
 if(typeof value!=="number"||!Number.isSafeInteger(value)||value<0||value>MAX_IDR)throw new Error(`Invalid integer IDR ${label}.`);return value;
}
export function rateBps(rate:number){const bps=rate*10000;if(!Number.isFinite(rate)||rate<0||rate>1||Math.abs(bps-Math.round(bps))>1e-7)throw new Error("Invalid effective tax rate.");return Math.round(bps);}
export function splitIncluded(gross:number,bps:number){
 idr(gross);if(!Number.isInteger(bps)||bps<0||bps>10000)throw new Error("Invalid effective tax rate.");
 const denominator=BigInt(10000+bps),numerator=BigInt(gross)*BigInt(10000);
 const net=Number((numerator+denominator/BigInt(2))/denominator);return {gross,net,tax:gross-net};
}
export function allocateIdr(total:number,weights:number[]){
 idr(total,"discount");weights.forEach(n=>idr(n,"allocation basis"));const sum=weights.reduce((a,b)=>a+b,0);idr(sum);
 if(total>sum)throw new Error("Discount exceeds its eligible amount.");if(!sum)return weights.map(()=>0);
 const denominator=BigInt(sum),shares=weights.map(n=>Number(BigInt(total)*BigInt(n)/denominator));
 let remaining=total-shares.reduce((a,b)=>a+b,0);
 const ranks=weights.map((n,i)=>({i,remainder:BigInt(total)*BigInt(n)%denominator})).sort((a,b)=>a.remainder===b.remainder?a.i-b.i:a.remainder>b.remainder?-1:1);
 for(const {i} of ranks)if(remaining>0&&weights[i]>shares[i]){shares[i]++;remaining--;}
 if(remaining)throw new Error("Discount allocation failed.");return shares;
}
export interface CommercialTaxPolicy {code:string;rateBps:number;mode:"inclusive"|"not_collected"}
export interface FinancialLine {index:number;name:string;sku:string|null;kind:"merchandise"|"assembly";unitPrice:number;quantity:number;beforeDiscount:number;discount:number;gross:number;net:number;tax:number}
export interface FinancialSnapshot {
 version:1;currency:"IDR";taxPolicy:CommercialTaxPolicy;lines:FinancialLine[];
 shipping:{beforeDiscount:number;discount:number;gross:number;net:number;tax:number};
 merchandiseSubtotal:number;assemblyFee:number;shippingFee:number;discountAmount:number;total:number;netAmount:number;taxAmount:number;
}
export function buildFinancialSnapshot(input:{lines:Array<{name:string;sku?:string|null;kind:"merchandise"|"assembly";unitPrice:number;quantity:number}>;shippingFee:number;discount:number;discountWeights:number[];taxPolicy:CommercialTaxPolicy}):FinancialSnapshot{
 const bps=input.taxPolicy.rateBps;if(!["inclusive","not_collected"].includes(input.taxPolicy.mode)||!Number.isInteger(bps)||bps<0||bps>10000||!input.taxPolicy.code||(input.taxPolicy.mode==="not_collected"&&bps!==0))throw new Error("Invalid commercial tax policy.");
 const amounts=input.lines.map(line=>{idr(line.unitPrice);if(!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>100)throw new Error("Invalid financial quantity.");return idr(line.unitPrice*line.quantity);}).concat(idr(input.shippingFee));
 if(input.discountWeights.length!==amounts.length||input.discountWeights.some((n,i)=>n>amounts[i]))throw new Error("Invalid discount basis.");
 const discounts=allocateIdr(input.discount,input.discountWeights);
 const lines=input.lines.map((line,index)=>({...line,sku:line.sku||null,index,beforeDiscount:amounts[index],discount:discounts[index],...splitIncluded(amounts[index]-discounts[index],bps)}));
 const shipping={beforeDiscount:input.shippingFee,discount:discounts[discounts.length-1],...splitIncluded(input.shippingFee-discounts[discounts.length-1],bps)};
 const result:FinancialSnapshot={version:1,currency:"IDR",taxPolicy:{...input.taxPolicy},lines,shipping,merchandiseSubtotal:lines.filter(l=>l.kind==="merchandise").reduce((sum,l)=>sum+l.beforeDiscount,0),assemblyFee:lines.filter(l=>l.kind==="assembly").reduce((sum,l)=>sum+l.beforeDiscount,0),shippingFee:input.shippingFee,discountAmount:input.discount,total:lines.reduce((sum,l)=>sum+l.gross,shipping.gross),netAmount:lines.reduce((sum,l)=>sum+l.net,shipping.net),taxAmount:lines.reduce((sum,l)=>sum+l.tax,shipping.tax)};
 assertFinancialSnapshot(result);return result;
}
export function assertFinancialSnapshot(value:any):asserts value is FinancialSnapshot{
 if(value?.version!==1||value.currency!=="IDR"||!Array.isArray(value.lines)||!value.lines.length||value.lines.length>200||!value.taxPolicy)throw new Error("Financial breakdown unavailable.");
 if(typeof value.taxPolicy.code!=="string"||!/^\w[\w.-]{0,79}$/.test(value.taxPolicy.code)||!["inclusive","not_collected"].includes(value.taxPolicy.mode)||(value.taxPolicy.mode==="not_collected"&&value.taxPolicy.rateBps!==0))throw new Error("Invalid commercial tax policy.");
 const numbers=[value.merchandiseSubtotal,value.assemblyFee,value.shippingFee,value.discountAmount,value.total,value.netAmount,value.taxAmount];numbers.forEach(n=>idr(n));
 let gross=0,discount=0,net=0,tax=0,merchandise=0,assembly=0;
 value.lines.forEach((line:any,index:number)=>{[line.unitPrice,line.beforeDiscount,line.discount,line.gross,line.net,line.tax].forEach(n=>idr(n));if(line.index!==index||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>100||!["merchandise","assembly"].includes(line.kind)||line.beforeDiscount!==line.unitPrice*line.quantity||line.beforeDiscount-line.discount!==line.gross||line.net+line.tax!==line.gross||splitIncluded(line.gross,value.taxPolicy.rateBps).net!==line.net)throw new Error("Inconsistent financial line.");gross+=line.gross;discount+=line.discount;net+=line.net;tax+=line.tax;if(line.kind==="merchandise")merchandise+=line.beforeDiscount;else assembly+=line.beforeDiscount;});
 const s=value.shipping;[s?.beforeDiscount,s?.discount,s?.gross,s?.net,s?.tax].forEach(n=>idr(n));
 if(s.beforeDiscount!==value.shippingFee||s.beforeDiscount-s.discount!==s.gross||s.net+s.tax!==s.gross||splitIncluded(s.gross,value.taxPolicy.rateBps).net!==s.net||merchandise!==value.merchandiseSubtotal||assembly!==value.assemblyFee||gross+s.gross!==value.total||net+s.net!==value.netAmount||tax+s.tax!==value.taxAmount||discount+s.discount!==value.discountAmount||value.netAmount+value.taxAmount!==value.total)throw new Error("Inconsistent financial totals.");
}
