import { AsyncLocalStorage } from "node:async_hooks";
import "server-only";
import { isDemoMode } from "@/lib/runtime/environment";
const stateKey=globalThis as typeof globalThis & {__demoTransactionContext?:AsyncLocalStorage<boolean>};
const context=stateKey.__demoTransactionContext ||= new AsyncLocalStorage<boolean>();
export async function demoTransaction<T>(work:()=>Promise<T>):Promise<T> {
  if(!isDemoMode())throw new Error("Demo transaction outside demo mode.");
  if(context.getStore())return work();
  const state=globalThis as typeof globalThis & {__demoCheckoutQueue?:Promise<void>;__demoRepositoryTables?:Map<string,Map<string,unknown>>};
  const previous=state.__demoCheckoutQueue || Promise.resolve();let release!:()=>void;
  state.__demoCheckoutQueue=new Promise(resolve=>{release=resolve;});await previous;
  const tables=state.__demoRepositoryTables!;
  const snapshot=new Map(Array.from(tables,([name,rows])=>[name,structuredClone(Array.from(rows.entries()))]));
  try {return await context.run(true,work);} catch(error) {
    for(const [name,rows] of Array.from(snapshot)){const table=tables.get(name)!;table.clear();for(const [id,value] of rows)table.set(id,value);}
    for(const name of Array.from(tables.keys()))if(!snapshot.has(name))tables.get(name)!.clear();
    throw error;
  } finally {release();}
}
