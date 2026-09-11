import "server-only";
import { BaseRepository } from "./base.repository";
import { Order, OrderItem, CourierDispatchInfo } from "../types";
import { inventoryRepository } from "./inventory.repository";

const INITIAL_SAMPLE_ORDERS: Order[] = [
  {
    id: "ord-1001",
    order_number: "TET-2026-0901",
    customer_id: "cust-001",
    customer_name: "Alex Rivera",
    customer_email: "alex.gamer@example.com",
    customer_phone: "+62 812-3456-7890",
    fulfillment_type: "delivery",
    shipping_address: {
      street: "Jl. Sudirman No. 45, RT.01/RW.02",
      unit: "Apt 12B",
      subdistrict: "Karet Tengsin",
      city: "Jakarta Pusat",
      province: "DKI Jakarta",
      postalCode: "10220",
      country: "Indonesia",
      deliveryNotes: "Call security lobby upon arrival",
    },
    subtotal: 16598000,
    shipping_fee: 45000,
    assembly_fee: 0,
    total: 16643000,
    status: "order_received",
    payment_method: "BCA Virtual Account",
    payment_reference: "VA-88092147",
    notes: "Please pack with extra air bubble wrap.",
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
  },
  {
    id: "ord-1002",
    order_number: "TET-2026-0902",
    customer_id: "cust-002",
    customer_name: "Budi Santoso",
    customer_email: "budi.builder@techcorp.id",
    customer_phone: "+62 819-8765-4321",
    fulfillment_type: "delivery",
    shipping_address: {
      street: "Jl. Boulevard Barat Raya Blok XC No. 8",
      subdistrict: "Kelapa Gading Barat",
      city: "Jakarta Utara",
      province: "DKI Jakarta",
      postalCode: "14240",
      country: "Indonesia",
      deliveryNotes: "Hardware Lab 2nd floor",
    },
    subtotal: 28990000,
    shipping_fee: 65000,
    assembly_fee: 250000,
    total: 29305000,
    status: "order_accepted",
    payment_method: "QRIS Instant Pay",
    payment_reference: "QRIS-771239",
    notes: "Custom PC build with thermal stress testing requested.",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
  },
  {
    id: "ord-1003",
    order_number: "TET-2026-0903",
    customer_id: "cust-003",
    customer_name: "Citra Lestari",
    customer_email: "citra.vfx@studio.com",
    customer_phone: "+62 856-1122-3344",
    fulfillment_type: "delivery",
    shipping_address: {
      street: "Jl. Senopati No. 88",
      unit: "Studio 3",
      subdistrict: "Selong",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      postalCode: "12110",
      country: "Indonesia",
      deliveryNotes: "Reception desk open 09:00 - 18:00",
    },
    subtotal: 42800000,
    shipping_fee: 55000,
    assembly_fee: 0,
    total: 42855000,
    status: "finding_stock",
    payment_method: "Mandiri Direct Debit",
    payment_reference: "MDR-992144",
    notes: "Picking items from Aisle A-01 and Storage Rack B.",
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 90 mins ago
  },
  {
    id: "ord-1004",
    order_number: "TET-2026-0904",
    customer_id: "cust-004",
    customer_name: "Dimas Prasetyo",
    customer_email: "dimas.p@gmail.com",
    customer_phone: "+62 813-9876-5432",
    fulfillment_type: "delivery",
    shipping_address: {
      street: "Jl. Kemang Raya No. 12",
      subdistrict: "Bangka",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      postalCode: "12730",
      country: "Indonesia",
    },
    subtotal: 7199000,
    shipping_fee: 35000,
    assembly_fee: 0,
    total: 7234000,
    status: "finding_courier",
    payment_method: "GoPay Instant",
    payment_reference: "GOPAY-110992",
    notes: "Items packed in anti-static tamper-evident box. Ready for courier assignment.",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
  },
  {
    id: "ord-1005",
    order_number: "TET-2026-0905",
    customer_id: "cust-005",
    customer_name: "Eko Wicaksono",
    customer_email: "eko.w@designhaus.co",
    customer_phone: "+62 878-2233-4455",
    fulfillment_type: "delivery",
    shipping_address: {
      street: "Jl. Danau Sunter Utara No. 19",
      subdistrict: "Sunter Agung",
      city: "Jakarta Utara",
      province: "DKI Jakarta",
      postalCode: "14350",
      country: "Indonesia",
    },
    subtotal: 21499000,
    shipping_fee: 32000,
    assembly_fee: 0,
    total: 21531000,
    status: "on_delivery",
    courier_info: {
      provider: "gojek",
      service_code: "gosend-instant",
      service_name: "GoSend Instant",
      driver_name: "Rahmat Hidayat",
      driver_phone: "+62 812-9988-7766",
      vehicle_plate: "B 4821 SIK",
      tracking_id: "GOSEND-JKT-882190",
      tracking_url: "https://gofleet.gojek.com/track/GOSEND-JKT-882190",
      dispatched_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      estimated_arrival: "25 - 35 mins",
      status: "in_transit",
    },
    payment_method: "BCA Virtual Account",
    payment_reference: "VA-9908123",
    notes: "Courier in transit. Driver carrying thermal-padded transport pouch.",
    created_at: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
  },
  {
    id: "ord-1006",
    order_number: "TET-2026-0906",
    customer_id: "cust-006",
    customer_name: "Grace Tan",
    customer_email: "grace.tan@cyber.sg",
    customer_phone: "+62 811-3344-5566",
    fulfillment_type: "delivery",
    shipping_address: {
      street: "Jl. Pluit Karang Cantik No. 5",
      subdistrict: "Pluit",
      city: "Jakarta Utara",
      province: "DKI Jakarta",
      postalCode: "14450",
      country: "Indonesia",
    },
    subtotal: 9399000,
    shipping_fee: 28000,
    assembly_fee: 0,
    total: 9427000,
    status: "delivery_arrived",
    courier_info: {
      provider: "grab",
      service_code: "grabexpress-instant",
      service_name: "GrabExpress Instant",
      driver_name: "Hendri Pratama",
      driver_phone: "+62 818-4455-6677",
      vehicle_plate: "B 6512 TYY",
      tracking_id: "GRABEX-JKT-551201",
      dispatched_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      delivered_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      status: "arrived",
    },
    payment_method: "OVO Instant",
    payment_reference: "OVO-441908",
    notes: "Package handed to recipient and signed digitally.",
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: "ord-1007",
    order_number: "TET-2026-0907",
    customer_id: "cust-007",
    customer_name: "Faris Alamsyah",
    customer_email: "faris.alam@yahoo.com",
    customer_phone: "+62 821-7788-9900",
    fulfillment_type: "click_and_collect",
    pickup_code: "7419",
    subtotal: 14500000,
    shipping_fee: 0,
    assembly_fee: 0,
    total: 14500000,
    status: "ready_for_pickup",
    payment_method: "BCA Virtual Account",
    payment_reference: "VA-1123490",
    notes: "Ready at Mangga Dua Flagship Counter 1. PIN sent to customer.",
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];

const INITIAL_SAMPLE_ORDER_ITEMS: OrderItem[] = [
  {
    id: "item-1",
    order_id: "ord-1001",
    product_id: "cpu-1",
    quantity: 1,
    unit_price: 7199000,
    is_custom_build: false,
  },
  {
    id: "item-2",
    order_id: "ord-1001",
    product_id: "cpu-2",
    quantity: 1,
    unit_price: 9399000,
    is_custom_build: false,
  },
  {
    id: "item-3",
    order_id: "ord-1002",
    product_id: "gpu-1",
    quantity: 1,
    unit_price: 18999000,
    is_custom_build: false,
  },
  {
    id: "item-4",
    order_id: "ord-1002",
    product_id: "cpu-3",
    quantity: 1,
    unit_price: 6499000,
    is_custom_build: false,
  },
  {
    id: "item-5",
    order_id: "ord-1003",
    product_id: "gpu-3",
    quantity: 2,
    unit_price: 21400000,
    is_custom_build: false,
  },
  {
    id: "item-6",
    order_id: "ord-1004",
    product_id: "cpu-1",
    quantity: 1,
    unit_price: 7199000,
    is_custom_build: false,
  },
  {
    id: "item-7",
    order_id: "ord-1005",
    product_id: "gpu-2",
    quantity: 1,
    unit_price: 21499000,
    is_custom_build: false,
  },
  {
    id: "item-8",
    order_id: "ord-1006",
    product_id: "cpu-2",
    quantity: 1,
    unit_price: 9399000,
    is_custom_build: false,
  },
  {
    id: "item-9",
    order_id: "ord-1007",
    product_id: "cpu-4",
    quantity: 1,
    unit_price: 14500000,
    is_custom_build: false,
  },
];

export class OrdersRepository extends BaseRepository<Order> {
  private itemsRepository: BaseRepository<OrderItem>;

  constructor() {
    super("orders", INITIAL_SAMPLE_ORDERS);
    this.itemsRepository = new BaseRepository<OrderItem>("order_items", INITIAL_SAMPLE_ORDER_ITEMS);
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return this.findOne({ order_number: orderNumber });
  }

  async getOrderWithItems(orderId: string): Promise<{ order: Order | null; items: OrderItem[] }> {
    const order = await this.findById(orderId);
    if (!order) return { order: null, items: [] };

    const client = this.getClient();
    if (!client) {
      const items = await this.itemsRepository.findMany({ order_id: orderId });
      return { order, items };
    }

    const { data: items } = await client
      .from("order_items")
      .select("*, products(sku, name, retail_price)")
      .eq("order_id", orderId);

    return { order, items: (items as OrderItem[]) || [] };
  }

  async createOrderWithItems(
    orderData: Partial<Order>,
    items: Partial<OrderItem>[]
  ): Promise<{ order: Order; items: OrderItem[] }> {
    const order = await this.create(orderData);
    const createdItems: OrderItem[] = [];

    for (const item of items) {
      const created = await this.itemsRepository.create({
        ...item,
        order_id: order.id,
      });
      createdItems.push(created);
    }

    return { order, items: createdItems };
  }

  async updateStage(
    orderId: string,
    nextStatus: Order["status"],
    courierInfo?: CourierDispatchInfo | null
  ): Promise<Order | null> {
    const patch: Partial<Order> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    if (courierInfo !== undefined) {
      patch.courier_info = courierInfo;
    }
    return this.update(orderId, patch);
  }

  /**
   * Transition order to payment_received / ready_for_pickup and lock inventory.
   */
  async processPaymentSuccess(
    orderId: string,
    paymentReference: string = "PAY-SUCCESS"
  ): Promise<{ success: boolean; status?: string; error?: string; reservedItems?: any[] }> {
    const client = this.getClient();

    // If real Supabase is connected, call the atomic PostgreSQL procedure
    if (client) {
      const { data: rpcResult, error: rpcError } = await client.rpc(
        "process_order_payment_success",
        {
          p_order_id: orderId,
          p_payment_reference: paymentReference,
        }
      );

      if (rpcError || !rpcResult?.success) {
        return {
          success: false,
          error: rpcResult?.error || rpcError?.message || "Payment processing failed.",
        };
      }

      return {
        success: true,
        status: rpcResult.status,
        reservedItems: rpcResult.reserved_items,
      };
    }

    // Local in-memory fallback execution
    const order = await this.findById(orderId);
    if (!order) return { success: false, error: "Order not found." };

    const items = await this.itemsRepository.findMany({ order_id: orderId });
    const reservedItems: any[] = [];

    for (const item of items) {
      if (item.product_id) {
        const res = await inventoryRepository.reserveStock(item.product_id, item.quantity);
        if (!res.success) {
          return { success: false, error: res.error };
        }
        reservedItems.push({ product_id: item.product_id, quantity: item.quantity });
      }
    }

    const isCustomPc = items.some((i) => i.is_custom_build || i.custom_build_id);
    const nextStatus = isCustomPc
      ? "assembly_in_progress"
      : order.fulfillment_type === "click_and_collect"
      ? "ready_for_pickup"
      : "order_accepted";

    const pickupCode =
      order.fulfillment_type === "click_and_collect"
        ? Math.floor(1000 + Math.random() * 9000).toString()
        : null;

    const updated = await this.update(orderId, {
      status: nextStatus,
      payment_reference: paymentReference,
      pickup_code: pickupCode,
      paid_at: new Date().toISOString(),
    });

    return {
      success: true,
      status: updated?.status || nextStatus,
      reservedItems,
    };
  }
}

export const ordersRepository = new OrdersRepository();
