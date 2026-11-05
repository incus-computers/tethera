// @ts-ignore
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FluxOrdersTab } from "@/components/admin/FluxOrdersTab";
import { canDispatchOrder, isOrderDispatched } from "@/lib/utils/orderWorkflow";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...rest }: any) => {
    return React.createElement("img", { src, alt, ...rest });
  },
}));

const mockOrderAccepted = {
  id: "ord-test-101",
  order_number: "TET-2026-9999",
  customer_id: "cust-999",
  customer_name: "Budi Pratama",
  customer_email: "budi.pratama@example.com",
  customer_phone: "+62 812-3456-7890",
  status: "order_accepted",
  total: 18500000,
  subtotal: 18450000,
  shipping_fee: 50000,
  shipping_address: {
    street: "Jl. Sudirman No. 100",
    city: "Jakarta Pusat",
    province: "DKI Jakarta",
    postalCode: "10220",
    deliveryNotes: "Leave at front desk",
  },
  items: [
    {
      id: "item-1",
      product_id: "prod-gpu-4080",
      name: "NVIDIA GeForce RTX 4080 Super",
      quantity: 1,
      unit_price: 18450000,
      sku: "GPU-RTX4080-SUP",
    },
  ],
};

const mockOrderReadyForDispatch = {
  ...mockOrderAccepted,
  id: "ord-test-102",
  order_number: "TET-2026-8888",
  status: "ready_for_dispatch",
};

const mockOrderDispatched = {
  ...mockOrderAccepted,
  id: "ord-test-103",
  order_number: "TET-2026-7777",
  status: "dispatched",
  courier_provider: "jne",
  courier_service_code: "jne-reg",
  waybill_id: "JNE-99887766",
};

const mockOrderCourierFailed = {
  ...mockOrderAccepted,
  id: "ord-test-104",
  order_number: "TET-2026-6666",
  status: "courier_failed",
};

describe("FluxOrdersTab - Workflow-Driven Dispatch and Simplified Inline View", () => {
  it("does not render exclusive order management or open exclusive management page buttons", () => {
    const html = renderToStaticMarkup(
      <FluxOrdersTab
        orders={[mockOrderAccepted]}
        initialExpandedOrderId="ord-test-101"
        onInspectOrder={vi.fn()}
        onOpenDispatchModal={vi.fn()}
        onUpdateStatus={vi.fn()}
        onOpenRejectModal={vi.fn()}
      />
    );

    expect(html).not.toContain("Exclusive Order Management");
    expect(html).not.toContain("Open Exclusive Management Page");
  });

  it("does not allow editing dispatch when order is before Ready for Dispatch", () => {
    const html = renderToStaticMarkup(
      <FluxOrdersTab
        orders={[mockOrderAccepted]}
        initialExpandedOrderId="ord-test-101"
        onInspectOrder={vi.fn()}
        onOpenDispatchModal={vi.fn()}
        onUpdateStatus={vi.fn()}
        onOpenRejectModal={vi.fn()}
      />
    );

    // Row action shouldn't have dispatch button
    expect(html).not.toContain('title="Find Courier &amp; Dispatch"');
    // Notice in expanded view
    expect(html).toContain("Dispatch available when Ready for Dispatch");
  });

  it("enables find courier and dispatch when order is in Ready for Dispatch", () => {
    const html = renderToStaticMarkup(
      <FluxOrdersTab
        orders={[mockOrderReadyForDispatch]}
        initialExpandedOrderId="ord-test-102"
        onInspectOrder={vi.fn()}
        onOpenDispatchModal={vi.fn()}
        onUpdateStatus={vi.fn()}
        onOpenRejectModal={vi.fn()}
      />
    );

    // Find Courier button is active and visible
    expect(html).toContain("Find Courier &amp; Dispatch");
    expect(html).toContain("Find Courier");
  });

  it("hides find courier option once order is dispatched", () => {
    const html = renderToStaticMarkup(
      <FluxOrdersTab
        orders={[mockOrderDispatched]}
        initialExpandedOrderId="ord-test-103"
        onInspectOrder={vi.fn()}
        onOpenDispatchModal={vi.fn()}
        onUpdateStatus={vi.fn()}
        onOpenRejectModal={vi.fn()}
      />
    );

    // Option to find courier is no longer there
    expect(html).not.toContain("Find Courier &amp; Dispatch");
    expect(html).toContain("Courier Dispatched");
    expect(html).toContain("Waybill Active");
  });

  it("re-enables courier dispatch if there is a courier rejection or failure", () => {
    const html = renderToStaticMarkup(
      <FluxOrdersTab
        orders={[mockOrderCourierFailed]}
        initialExpandedOrderId="ord-test-104"
        onInspectOrder={vi.fn()}
        onOpenDispatchModal={vi.fn()}
        onUpdateStatus={vi.fn()}
        onOpenRejectModal={vi.fn()}
      />
    );

    // Re-dispatch is available
    expect(html).toContain("Find Courier &amp; Dispatch");
  });

  it("maintains minimum 44px tap target heights for interactive buttons", () => {
    const html = renderToStaticMarkup(
      <FluxOrdersTab
        orders={[mockOrderReadyForDispatch]}
        initialExpandedOrderId="ord-test-102"
        onInspectOrder={vi.fn()}
        onOpenDispatchModal={vi.fn()}
        onUpdateStatus={vi.fn()}
        onOpenRejectModal={vi.fn()}
      />
    );

    expect(html).toContain("min-h-[44px]");
  });

  it("strictly contains zero em dashes in any rendered text or attributes", () => {
    const html = renderToStaticMarkup(
      <FluxOrdersTab
        orders={[mockOrderReadyForDispatch]}
        initialExpandedOrderId="ord-test-102"
        onInspectOrder={vi.fn()}
        onOpenDispatchModal={vi.fn()}
        onUpdateStatus={vi.fn()}
        onOpenRejectModal={vi.fn()}
      />
    );

    expect(html).not.toContain("—");
  });
});
