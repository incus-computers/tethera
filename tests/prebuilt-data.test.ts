// tests/prebuilt-data.test.ts
// @ts-ignore
import { describe, it, expect } from "vitest";
import { PREBUILT_SYSTEMS } from "../src/lib/data/mockHardware";

describe("Prebuilt Systems Data Integrity", () => {
  it("contains at least 6 complete prebuilt workstations", () => {
    expect(PREBUILT_SYSTEMS.length).toBeGreaterThanOrEqual(6);
  });

  it("ensures every prebuilt has all 8 required hardware component specs and price", () => {
    const requiredFields = [
      "id",
      "name",
      "sku",
      "brand",
      "category",
      "cpu",
      "gpu",
      "motherboard",
      "ram",
      "storage",
      "psu",
      "chassis",
      "cooling",
      "price",
      "sale_price",
      "images",
      "status",
    ];

    PREBUILT_SYSTEMS.forEach((pb) => {
      requiredFields.forEach((field) => {
        expect(pb, `Prebuilt ${pb.id || "unknown"} missing ${field}`).toHaveProperty(field);
        expect((pb as any)[field]).toBeTruthy();
      });
      expect(pb.images.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("contains zero em dashes in names, descriptions, or specs", () => {
    PREBUILT_SYSTEMS.forEach((pb) => {
      expect(pb.name).not.toContain("\u2014");
      expect(pb.description).not.toContain("\u2014");
      expect(pb.motherboard).not.toContain("\u2014");
    });
  });
});
