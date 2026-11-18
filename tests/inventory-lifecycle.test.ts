import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { db, BaseRepository, InventoryReservationRow } from "@/lib/db";
import { createOrderPOST } from "./support/checkout";
import { transitionInventory, expireReservations } from "@/lib/inventory/lifecycle";
import { POST as job } from "@/app/api/internal/inventory/expire/route";
let id:string,order:any;
beforeEach(async()=>{
 vi.restoreAllMocks();id=randomUUID();
 await db.products.create({id,sku:id,name:"Fixture",slug:id,brand:"Fixture",is_active:true,retail_price:1000,specs:{}});
 await db.inventory.create({id,store_id:"00000000-0000-0000-0000-000000000001",product_id:id,stock_on_hand:10,stock_reserved:0,low_stock_threshold:1});
 const result=await createOrderPOST(new NextRequest("http://localhost:3000/api/checkout/create-order",{method:"POST",body:JSON.stringify({customer:{name:"Fixture",email:"fixture@example.test",phone:"081234567890"},fulfillmentType:"click_and_collect",items:[{id,quantity:1}]})}));
 expect(result.status).toBe(200);order=await result.json();
});
describe("demo lifecycle and worker",()=>{
 it("parallel settlement calls consume once and return the same paid state",async()=>{
  const results=await Promise.all(Array.from({length:10},()=>transitionInventory(order.orderId,"settle","same-ref")));
  expect(results.every(r=>r.success)).toBe(true);expect(results.filter(r=>r.changed)).toHaveLength(1);
  const inv=(await db.inventory.findById(id))!;expect(inv.stock_on_hand).toBe(9);expect(inv.stock_reserved).toBe(0);
  expect(await db.inventoryLedger.getMovementsByOrder(order.orderId)).toHaveLength(1);
 });
 it("settlement/cancellation race has one winner and never inflates stock",async()=>{
  const results=await Promise.all([transitionInventory(order.orderId,"settle","ref"),transitionInventory(order.orderId,"cancel")]);
  expect(results.filter(r=>r.success)).toHaveLength(1);expect((await db.inventory.findById(id))!.stock_on_hand).toBe(9);
  expect((await transitionInventory(order.orderId,"pending")).status).toBe("ready_for_pickup");
 });
 it("repeated cancellation releases only this order's hold",async()=>{
  expect((await transitionInventory(order.orderId,"cancel")).success).toBe(true);
  expect((await transitionInventory(order.orderId,"cancel")).changed).toBe(false);
  expect((await transitionInventory(order.orderId,"settle","late")).success).toBe(false);
  expect((await db.inventory.findById(id))!.stock_on_hand).toBe(10);expect((await db.inventory.findById(id))!.stock_reserved).toBe(0);
 });
 it("expiry batch releases stale holds and rejects late payment",async()=>{
  const holds=new BaseRepository<InventoryReservationRow>("inventory_reservations");const hold=(await holds.findMany({order_id:order.orderId}))[0];
  await holds.update(hold.id,{expires_at:new Date(Date.now()-1000).toISOString()});await expireReservations();
  expect((await db.orders.findById(order.orderId))!.status).toBe("cancelled");expect((await db.inventory.findById(id))!.stock_reserved).toBe(0);
  expect((await transitionInventory(order.orderId,"settle","late")).success).toBe(false);
 });
 it("ledger failure rolls stock and order state back for a safe retry",async()=>{
  vi.spyOn(db.inventoryLedger,"recordAdjustment").mockRejectedValueOnce(new Error("Injected storage failure"));
  await expect(transitionInventory(order.orderId,"settle","ref")).rejects.toThrow();
  expect((await db.inventory.findById(id))!.stock_on_hand).toBe(10);expect((await db.inventory.findById(id))!.stock_reserved).toBe(1);
  expect((await db.orders.findById(order.orderId))!.paid_at).toBeUndefined();
  expect((await transitionInventory(order.orderId,"settle","ref")).success).toBe(true);
 });
 it("expiry job requires its own configured secret",async()=>{
  const previous=process.env.INVENTORY_JOB_SECRET;process.env.INVENTORY_JOB_SECRET="fixture-job-secret-32-characters-long";
  try {expect((await job(new NextRequest("http://localhost/api/internal/inventory/expire",{method:"POST"}))).status).toBe(401);
   expect((await job(new NextRequest("http://localhost/api/internal/inventory/expire",{method:"POST",headers:{authorization:"Bearer "+process.env.INVENTORY_JOB_SECRET}}))).status).toBe(200);
  } finally {if(previous===undefined)delete process.env.INVENTORY_JOB_SECRET;else process.env.INVENTORY_JOB_SECRET=previous;}
 });
});
