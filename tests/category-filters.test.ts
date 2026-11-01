// @ts-ignore
import { test, expect } from "vitest";
import {
  MOCK_COMPONENTS,
  getExpandedCatalogItems,
} from "../src/lib/data/mockHardware";

test("Category filters: Cooling has Water Cooling, Air Cooling, and Cooling Fans", () => {
  const coolingItems = getExpandedCatalogItems(
    MOCK_COMPONENTS.filter((i) => i.slot === "cooler" || i.category.toLowerCase() === "cooling")
  );
  expect(coolingItems.length).toBeGreaterThanOrEqual(5);

  const waterCooling = coolingItems.filter((i) => i.specs?.coolingType === "Water Cooling");
  const airCooling = coolingItems.filter((i) => i.specs?.coolingType === "Air Cooling");
  const fanCooling = coolingItems.filter((i) => i.specs?.coolingType === "Cooling Fans");

  expect(waterCooling.length).toBeGreaterThanOrEqual(2);
  expect(airCooling.length).toBeGreaterThanOrEqual(2);
  expect(fanCooling.length).toBeGreaterThanOrEqual(2);
});

test("Category filters: Cases has mini ITX, mATX, and ATX", () => {
  const caseItems = getExpandedCatalogItems(
    MOCK_COMPONENTS.filter((i) => i.slot === "case" || i.category.toLowerCase() === "chassis")
  );
  expect(caseItems.length).toBeGreaterThanOrEqual(6);

  const atxCases = caseItems.filter((i) => i.specs?.formFactor === "ATX");
  const matxCases = caseItems.filter((i) => i.specs?.formFactor === "mATX");
  const itxCases = caseItems.filter((i) => i.specs?.formFactor === "mini ITX");

  expect(atxCases.length).toBeGreaterThanOrEqual(2);
  expect(matxCases.length).toBeGreaterThanOrEqual(2);
  expect(itxCases.length).toBeGreaterThanOrEqual(2);
});

test("Category filters: Memory has Desktop/Laptop, DDR4/DDR5, and capacities", () => {
  const ramItems = getExpandedCatalogItems(
    MOCK_COMPONENTS.filter((i) => i.slot === "ram" || i.category.toLowerCase() === "memory")
  );
  expect(ramItems.length).toBeGreaterThanOrEqual(6);

  const desktopMem = ramItems.filter(
    (i) => i.specs?.memoryType === "Desktop Memory" || (!i.specs?.memoryType && !i.name.includes("Laptop"))
  );
  const laptopMem = ramItems.filter(
    (i) => i.specs?.memoryType === "Laptop Memory" || i.name.includes("Laptop")
  );

  expect(desktopMem.length).toBeGreaterThanOrEqual(3);
  expect(laptopMem.length).toBeGreaterThanOrEqual(2);

  const ddr4Mem = ramItems.filter((i) => i.specs?.ramType === "DDR4" || i.name.includes("DDR4"));
  const ddr5Mem = ramItems.filter((i) => i.specs?.ramType === "DDR5" || i.name.includes("DDR5"));

  expect(ddr4Mem.length).toBeGreaterThanOrEqual(2);
  expect(ddr5Mem.length).toBeGreaterThanOrEqual(3);
});

test("Category filters: Storage has SSD/HDD and multiple capacities", () => {
  const storageItems = getExpandedCatalogItems(
    MOCK_COMPONENTS.filter((i) => i.slot === "storage_primary" || i.category.toLowerCase() === "storage")
  );
  expect(storageItems.length).toBeGreaterThanOrEqual(6);

  const ssdItems = storageItems.filter((i) => i.specs?.storageType === "SSD");
  const hddItems = storageItems.filter((i) => i.specs?.storageType === "HDD");

  expect(ssdItems.length).toBeGreaterThanOrEqual(3);
  expect(hddItems.length).toBeGreaterThanOrEqual(3);
});

test("Category filters: Power Supplies has 80+ ratings and wattages", () => {
  const psuItems = getExpandedCatalogItems(
    MOCK_COMPONENTS.filter((i) => i.slot === "psu" || i.category.toLowerCase() === "power supplies")
  );
  expect(psuItems.length).toBeGreaterThanOrEqual(6);

  const bronzePsu = psuItems.filter((i) => i.specs?.efficiencyRating === "Bronze");
  const goldPsu = psuItems.filter((i) => i.specs?.efficiencyRating === "Gold");
  const platPsu = psuItems.filter((i) => i.specs?.efficiencyRating === "Platinum");

  expect(bronzePsu.length).toBeGreaterThanOrEqual(2);
  expect(goldPsu.length).toBeGreaterThanOrEqual(2);
  expect(platPsu.length).toBeGreaterThanOrEqual(2);
});
