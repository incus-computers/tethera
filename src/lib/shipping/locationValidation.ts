import type { DeliveryLocation } from "./types";
export function validCustomerLocation(value: unknown): value is DeliveryLocation {
  if (!value || typeof value!=="object") return false;
  const p=value as DeliveryLocation;
  if (![p.address,p.subdistrict,p.city,p.province].every(v=>typeof v==="string"&&v.trim().length>=2&&v.length<=500) || !/^\d{5}$/.test(p.postalCode||"")) return false;
  if (p.latitude!==undefined || p.longitude!==undefined) {
    if (!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||p.latitude! < -11.5||p.latitude! > 6.5||p.longitude! < 94||p.longitude! > 142) return false;
  }
  return true;
}
