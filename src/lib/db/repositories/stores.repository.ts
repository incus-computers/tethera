import "server-only";
import { BaseRepository } from "./base.repository";
import { Store } from "../types";

export const FLAGSHIP_STORE_ID = "00000000-0000-0000-0000-000000000001";

const INITIAL_STORES: Store[] = [
  {
    id: FLAGSHIP_STORE_ID,
    name: "Flagship Retail & Experience Center",
    slug: "flagship-store",
    address: "Mangga Dua Mall Lt. 3 No. 36",
    city: "Jakarta Pusat",
    province: "DKI Jakarta",
    postal_code: "10730",
    phone: "+62 21 555 0199",
    whatsapp: "+62 812 3456 7890",
    email: "flagship@tethera.com",
    latitude: -6.1352,
    longitude: 106.8294,
    is_active: true,
    is_click_and_collect: true,
    pickup_lead_time_minutes: 60,
    trading_hours: {
      mon: "09:00 - 18:00",
      tue: "09:00 - 18:00",
      wed: "09:00 - 18:00",
      thu: "09:00 - 18:00",
      fri: "09:00 - 18:00",
      sat: "09:00 - 17:00",
      sun: "10:00 - 15:00",
    },
  },
];

export class StoresRepository extends BaseRepository<Store> {
  constructor() {
    super("stores", INITIAL_STORES);
  }

  async getFlagshipStore(): Promise<Store> {
    const store = await this.findById(FLAGSHIP_STORE_ID);
    return store || INITIAL_STORES[0];
  }
}

export const storesRepository = new StoresRepository();
