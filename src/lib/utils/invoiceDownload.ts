/**
 * Utility to generate and download an official itemized Tax Invoice (Faktur Pajak)
 * formatted for print and record-keeping without third-party PDF server requirements.
 */

export interface InvoiceDownloadData {
  orderNumber: string;
  paymentId?: string;
  paymentChannel?: string;
  createdAt?: string;
  customer?: {
    name: string;
    email: string;
    phone: string;
  };
  fulfillmentMethod?: "delivery" | "click_and_collect";
  shippingAddress?: {
    street: string;
    unit?: string;
    subdistrict: string;
    city: string;
    province?: string;
    postalCode: string;
  };
  courier?: {
    courierName: string;
    serviceName: string;
    price: number;
    etd?: string;
  } | null;
  items?: {
    id: string;
    name: string;
    sku?: string;
    brand?: string;
    price: number;
    quantity: number;
  }[];
  customPCs?: {
    id: string;
    name: string;
    totalPrice: number;
    isPrebuilt?: boolean;
    serviceTier?: {
      name: string;
    };
    parts?: Record<string, { name: string }>;
  }[];
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
}

export function generateInvoiceHtml(order: InvoiceDownloadData): string {
  const dpp = Math.round(order.grandTotal / 1.11);
  const ppn = order.grandTotal - dpp;
  const dateFormatted = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("id-ID");

  const standardItemsRows = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <div style="font-weight: 600; color: #0f172a;">${item.name}</div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">SKU: ${item.sku || "N/A"}${item.brand ? ` | Brand: ${item.brand}` : ""}</div>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #334155;">
          ${item.quantity}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #334155;">
          Rp ${item.price.toLocaleString("id-ID")}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; text-align: right; color: #0f172a;">
          Rp ${(item.price * item.quantity).toLocaleString("id-ID")}
        </td>
      </tr>`
    )
    .join("");

  const customPcRows = (order.customPCs || [])
    .map((pc) => {
      const partsSummary = pc.parts
        ? Object.entries(pc.parts)
            .map(([slot, part]) => `<span style="display:inline-block; margin-right:8px;">${slot.toUpperCase()}: ${part.name}</span>`)
            .join(" | ")
        : "";
      return `
      <tr style="background-color: #f8fafc;">
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <div style="font-weight: 700; color: #0f172a;">${pc.name} (${pc.isPrebuilt ? "Turnkey Pre-Built" : "Custom Built System"})</div>
          ${partsSummary ? `<div style="font-size: 11px; color: #475569; margin-top: 4px;">${partsSummary}</div>` : ""}
          ${pc.serviceTier ? `<div style="font-size: 11px; color: #059669; font-weight: 600;">Service: ${pc.serviceTier.name}</div>` : ""}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center; color: #334155;">1</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #334155;">
          Rp ${pc.totalPrice.toLocaleString("id-ID")}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; text-align: right; color: #0f172a;">
          Rp ${pc.totalPrice.toLocaleString("id-ID")}
        </td>
      </tr>`;
    })
    .join("");

  const allRows = standardItemsRows + customPcRows || `
    <tr>
      <td colspan="4" style="padding: 16px; text-align: center; color: #64748b; font-size: 13px;">
        Hardware Component Package
      </td>
    </tr>
  `;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Tax Invoice ${order.orderNumber} - PT Tethera Komputasi Presisi</title>
  <style>
    @media print {
      body { margin: 0; padding: 12mm; background: #fff !important; color: #000 !important; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
      .container { border: none !important; box-shadow: none !important; max-width: 100% !important; padding: 0 !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      margin: 0;
      padding: 32px 16px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .header-table td { vertical-align: top; }
    .company-title { font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .company-subtitle { font-size: 12px; color: #64748b; margin-top: 3px; line-height: 1.4; }
    .badge {
      display: inline-block;
      background: #059669;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .meta-grid {
      display: table;
      width: 100%;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
    }
    .meta-cell {
      display: table-cell;
      width: 50%;
      padding: 16px;
      vertical-align: top;
      font-size: 12px;
      line-height: 1.5;
    }
    .meta-cell:first-child { border-right: 1px solid #e2e8f0; }
    .meta-title { font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; margin-bottom: 4px; }
    .table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    .table th {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }
    .summary-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
    .summary-table { width: 340px; border-collapse: collapse; font-size: 12px; }
    .summary-table td { padding: 6px 8px; }
    .total-row {
      border-top: 2px solid #0f172a;
      font-size: 15px;
      font-weight: 900;
      color: #047857;
    }
    .footer {
      margin-top: 32px;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
      text-align: center;
    }
    .action-bar {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
    }
    .btn-primary { background: #0f172a; color: #ffffff; border: none; }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <button class="btn btn-primary" onclick="window.print()">Print or Save as PDF</button>
  </div>
  <div class="container">
    <table class="header-table">
      <tr>
        <td>
          <div class="company-title">PT TETHERA KOMPUTASI PRESISI</div>
          <div class="company-subtitle">
            NPWP: 01.345.678.9-021.000<br>
            Mangga Dua Mall Lt. 3 No. 36, Jl. Mangga Dua Raya, Jakarta Pusat 10730<br>
            Email: billing@tethera.com | Tel: +62 21 6230 8899
          </div>
        </td>
        <td style="text-align: right;">
          <span class="badge">PAID IN FULL</span>
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 6px; font-family: monospace;">${order.orderNumber}</div>
          <div style="font-size: 11px; color: #64748b;">Issued: ${dateFormatted}</div>
        </td>
      </tr>
    </table>

    <div class="meta-grid">
      <div class="meta-cell">
        <div class="meta-title">Customer &amp; Billing Details</div>
        <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${order.customer?.name || "Valued Customer"}</div>
        <div style="color: #475569;">Email: ${order.customer?.email || "customer@example.com"}</div>
        <div style="color: #475569; font-family: monospace;">Phone: ${order.customer?.phone || "+62 812-3456-7890"}</div>
        ${order.paymentChannel ? `<div style="margin-top: 4px; color: #0f172a;"><strong>Payment Method:</strong> ${order.paymentChannel.toUpperCase()}</div>` : ""}
        ${order.paymentId ? `<div style="color: #64748b; font-family: monospace; font-size: 11px;">Payment ID: ${order.paymentId}</div>` : ""}
      </div>
      <div class="meta-cell">
        <div class="meta-title">Fulfillment &amp; Delivery Destination</div>
        ${
          order.fulfillmentMethod === "click_and_collect"
            ? `<div style="font-weight: 700; color: #047857;">In-Store Click &amp; Collect</div>
               <div style="color: #475569;">Flagship Experience Store: Mangga Dua Mall Lt. 3 No. 36</div>
               <div style="color: #64748b; font-size: 11px;">Trading Hours: Mon-Sat 09:00 - 18:00 WIB</div>`
            : `<div style="font-weight: 700; color: #0f172a;">Courier Delivery Dispatch</div>
               <div style="color: #475569;">${order.shippingAddress?.street || "Address provided at checkout"}${order.shippingAddress?.unit ? `, ${order.shippingAddress.unit}` : ""}</div>
               <div style="color: #475569;">${order.shippingAddress?.subdistrict || ""}, ${order.shippingAddress?.city || "Jakarta"} ${order.shippingAddress?.postalCode || ""}</div>
               ${order.courier ? `<div style="color: #047857; font-size: 11px; margin-top: 2px;">Courier: ${order.courier.courierName} ${order.courier.serviceName}</div>` : ""}`
        }
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Item Description</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          <th style="text-align: right; width: 130px;">Unit Price</th>
          <th style="text-align: right; width: 140px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${allRows}
      </tbody>
    </table>

    <div class="summary-wrap">
      <table class="summary-table">
        <tr>
          <td style="color: #64748b;">Gross Subtotal:</td>
          <td style="text-align: right; font-weight: 600; color: #0f172a;">Rp ${order.subtotal.toLocaleString("id-ID")}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Fulfillment / Shipping:</td>
          <td style="text-align: right; font-weight: 600; color: #0f172a;">
            ${order.shippingFee > 0 ? `Rp ${order.shippingFee.toLocaleString("id-ID")}` : "Free"}
          </td>
        </tr>
        <tr style="color: #94a3b8; font-size: 11px;">
          <td>Dasar Pengenaan Pajak (DPP):</td>
          <td style="text-align: right;">Rp ${dpp.toLocaleString("id-ID")}</td>
        </tr>
        <tr style="color: #94a3b8; font-size: 11px;">
          <td>PPN 11% (Included):</td>
          <td style="text-align: right;">Rp ${ppn.toLocaleString("id-ID")}</td>
        </tr>
        <tr class="total-row">
          <td style="padding-top: 10px;">Grand Total:</td>
          <td style="text-align: right; padding-top: 10px;">Rp ${order.grandTotal.toLocaleString("id-ID")}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      Official digital tax invoice issued by PT Tethera Komputasi Presisi pursuant to Indonesian tax regulations.<br>
      A copy of this invoice has been sent to ${order.customer?.email || "your registered email"}.<br>
      For technical support or warranty validation, visit tethera.com or contact support@tethera.com.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers an immediate browser file download for the official invoice document.
 */
export function downloadInvoiceFile(order: InvoiceDownloadData): void {
  if (typeof window === "undefined") return;

  const htmlContent = generateInvoiceHtml(order);
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `Invoice-${order.orderNumber || "Tethera"}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
