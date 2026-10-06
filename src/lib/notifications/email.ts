/**
 * Transactional & CRM Marketing Email Dispatcher
 * Sends pickup codes, receipts, welcome onboarding emails, and CRM marketing campaigns via Resend or SMTP.
 */

import { CustomerProfile, CrmCampaignPayload } from "../types/customer";

export interface OrderEmailParams {
  toEmail: string;
  customerName: string;
  orderNumber: string;
  fulfillmentType: "delivery" | "click_and_collect";
  pickupCode?: string;
  total: string;
  isCustomPc: boolean;
  storeDetails?: {
    name: string;
    address: string;
    hours: string;
  };
}

export async function sendOrderNotificationEmail(params: OrderEmailParams): Promise<boolean> {
  const isCnC = params.fulfillmentType === "click_and_collect";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 8px; padding: 24px; border: 1px solid #334155; }
          .badge { display: inline-block; background: #f59e0b; color: #000; font-weight: bold; padding: 4px 12px; border-radius: 4px; font-size: 12px; text-transform: uppercase; }
          .pin-box { background: #0284c7; color: #ffffff; text-align: center; padding: 18px; border-radius: 8px; margin: 24px 0; }
          .pin-code { font-size: 36px; font-weight: 900; letter-spacing: 6px; }
          .details { margin-top: 16px; border-top: 1px solid #334155; padding-top: 16px; font-size: 14px; line-height: 1.6; }
          .footer { margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">Payment Confirmed</div>
          <h2 style="color: #ffffff; margin-top: 12px;">Order #${params.orderNumber}</h2>
          <p>Hello <strong>${params.customerName}</strong>,</p>
          <p>Thank you for your order! Your payment has been received and inventory has been reserved.</p>

          ${isCnC && params.pickupCode ? `
            <div class="pin-box">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Click & Collect Verification PIN</div>
              <div class="pin-code">${params.pickupCode}</div>
              <div style="font-size: 12px; margin-top: 6px; opacity: 0.9;">Show this PIN and your Photo ID at the store counter</div>
            </div>

            <div class="details">
              <strong>Collection Store:</strong> ${params.storeDetails?.name || "Tethera Store - Mangga Dua Mall"}<br>
              <strong>Address:</strong> ${params.storeDetails?.address || "Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat"}<br>
              <strong>Operating Hours:</strong> ${params.storeDetails?.hours || "Mon-Sat 9:00 AM - 6:00 PM"}
            </div>
          ` : `
            <div class="details">
              <strong>Fulfillment Method:</strong> Direct Courier Delivery<br>
              <strong>Tracking:</strong> Tracking number will be emailed once dispatched.
            </div>
          `}

          <div class="details">
            <strong>Order Total:</strong> ${params.total}<br>
            <strong>Custom PC Build:</strong> ${params.isCustomPc ? "Yes (Includes 24-48h Stress Test)" : "Standard Items"}
          </div>

          <div class="footer">
            Questions? Reply directly to this email or reach us on WhatsApp at +62 812-3456-7890.
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchEmail({
    to: params.toEmail,
    subject: isCnC 
      ? `Order #${params.orderNumber} Confirmed - Pickup PIN: ${params.pickupCode}` 
      : `Order #${params.orderNumber} Confirmed`,
    html: emailHtml,
  });
}

/**
 * CRM Onboarding / Welcome Email
 * Dispatched automatically when a customer registers their e-commerce account.
 */
export async function sendWelcomeEmail(customer: CustomerProfile): Promise<boolean> {
  const segmentLabels: Record<string, string> = {
    gamer: "High-Performance Gaming & Esports",
    pc_builder: "Custom PC Enthusiasts & Overclockers",
    creator: "3D Rendering & Content Creation Workstations",
    enterprise: "Commercial Systems & Enterprise AI",
    general: "PC Hardware & Everyday Computing",
  };

  const segmentName = segmentLabels[customer.marketing.customerSegment] || "Custom PC Enthusiasts";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #090d16; color: #f1f5f9; padding: 24px; }
          .container { max-width: 620px; margin: 0 auto; background: #111827; border-radius: 12px; padding: 32px; border: 1px solid #1f2937; }
          .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
          .brand-title { font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
          .badge { display: inline-block; background: #10b981; color: #ffffff; font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .headline { font-size: 24px; font-weight: 900; color: #ffffff; margin: 16px 0 8px 0; }
          .voucher-box { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 2px dashed #10b981; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
          .voucher-code { font-size: 28px; font-weight: 900; color: #34d399; letter-spacing: 4px; font-family: monospace; }
          .card { background: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px; line-height: 1.6; border: 1px solid #334155; }
          .card-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; }
          .cta-btn { display: inline-block; background: #10b981; color: #ffffff !important; font-weight: 800; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 12px; font-size: 14px; }
          .footer { margin-top: 32px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">
            <span class="badge">Welcome to Tethera</span>
          </div>
          <h1 class="headline">Welcome to Tethera PC Studio, ${customer.fullName}!</h1>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
            Your e-commerce and hardware profile has been successfully created. You are now equipped for fast 60-minute Flagship Store Click & Collect, instant Gojek/Grab courier delivery, and custom PC matrix build tracking.
          </p>

          <div class="voucher-box">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px;">
              Your Exclusive Welcome Voucher (10% Off)
            </div>
            <div class="voucher-code">WELCOME10-BUILD</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">
              Apply at checkout on any component, peripheral, or Custom PC System
            </div>
          </div>

          <div class="card">
            <div class="card-title">Saved Shipping Address</div>
            <strong>${customer.fullName}</strong> (${customer.phone})<br>
            ${customer.address.street}${customer.address.unit ? `, ${customer.address.unit}` : ""}<br>
            ${customer.address.subdistrict}, ${customer.address.city}, ${customer.address.province} ${customer.address.postalCode}
          </div>

          <div class="card">
            <div class="card-title">CRM & Communication Preferences</div>
            <strong>Segment Interest:</strong> ${segmentName}<br>
            <strong>Marketing Updates:</strong> ${customer.marketing.marketingOptIn ? "Subscribed to drops & hardware sales" : "Transaction notifications only"}<br>
            <strong>WhatsApp Updates:</strong> ${customer.marketing.whatsappUpdates ? "Enabled for pickup PIN & tracking" : "Email only"}
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="http://localhost:3000/builder" class="cta-btn">
              Launch Custom PC Builder →
            </a>
          </div>

          <div class="footer">
            You received this email because you registered an account at Tethera.<br>
            Flagship Retail & Experience Center: Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat.<br>
            To update your email preferences, visit your account profile settings.
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchEmail({
    to: customer.email,
    subject: `Welcome to Tethera, ${customer.fullName}! Your 10% Welcome Code Inside`,
    html: emailHtml,
  });
}

/**
 * CRM Marketing Campaign Dispatcher
 * Pushes out custom email campaigns to registered customers in the CRM system.
 */
export async function sendMarketingCampaignEmail(params: {
  toEmail: string;
  customerName: string;
  subject: string;
  headline: string;
  messageBody: string;
  promoCode?: string;
  ctaText?: string;
  ctaUrl?: string;
  campaignName: string;
}): Promise<boolean> {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1120; color: #f8fafc; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
          .badge { display: inline-block; background: #6366f1; color: #ffffff; font-weight: 700; padding: 4px 12px; border-radius: 6px; font-size: 11px; text-transform: uppercase; }
          .headline { font-size: 26px; font-weight: 900; color: #ffffff; margin: 16px 0 12px 0; line-height: 1.25; }
          .content { font-size: 14px; line-height: 1.7; color: #cbd5e1; margin-bottom: 24px; white-space: pre-line; }
          .promo-banner { background: #0f172a; border: 2px dashed #f59e0b; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0; }
          .promo-title { font-size: 11px; text-transform: uppercase; color: #f59e0b; font-weight: 800; letter-spacing: 1px; }
          .promo-code { font-size: 26px; font-weight: 900; color: #fcd34d; letter-spacing: 3px; font-family: monospace; margin-top: 4px; }
          .cta-btn { display: inline-block; background: #10b981; color: #ffffff !important; font-weight: 800; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; }
          .footer { margin-top: 32px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #334155; padding-top: 20px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <span class="badge">Tethera VIP Drop</span>
          <h1 class="headline">${params.headline}</h1>
          <p style="font-size: 14px; color: #94a3b8;">Hello ${params.customerName},</p>
          <div class="content">${params.messageBody}</div>

          ${params.promoCode ? `
            <div class="promo-banner">
              <div class="promo-title">VIP Campaign Promo Code</div>
              <div class="promo-code">${params.promoCode}</div>
            </div>
          ` : ""}

          <div style="text-align: center; margin: 28px 0;">
            <a href="${params.ctaUrl || 'http://localhost:3000'}" class="cta-btn">
              ${params.ctaText || "Claim Deal & Shop Now →"}
            </a>
          </div>

          <div class="footer">
            You received this newsletter campaign because you opted in to marketing communications from Tethera PC Studio.<br>
            Campaign ID: ${params.campaignName} • Mangga Dua Mall Lt. 3, Jakarta Pusat.<br>
            To manage your email preferences, visit your customer account dashboard.
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchEmail({
    to: params.toEmail,
    subject: params.subject,
    html: emailHtml,
  });
}

export interface InvoiceItem {
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  totalPrice?: number;
}

export interface InvoiceEmailParams {
  toEmail: string;
  customerName: string;
  orderNumber: string;
  paymentId?: string;
  paymentMethod?: string;
  fulfillmentType?: "delivery" | "click_and_collect";
  pickupCode?: string;
  shippingAddress?: string;
  items?: InvoiceItem[];
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
  orderDate?: string;
}

/**
 * Dispatches an official Tax Invoice email to the customer's registered email address.
 * The invoice email template structure can be customized or configured as needed.
 */
export async function sendInvoiceEmail(params: InvoiceEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const dpp = Math.round(params.grandTotal / 1.11);
    const ppn = params.grandTotal - dpp;
    const isCnC = params.fulfillmentType === "click_and_collect";
    const formattedDate = params.orderDate || new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const itemsHtml = (params.items && params.items.length > 0)
      ? params.items.map((item) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #334155; font-size: 13px; color: #f8fafc;">
            <div style="font-weight: 600;">${item.name}</div>
            ${item.sku ? `<div style="font-size: 11px; color: #94a3b8; font-family: monospace;">SKU: ${item.sku}</div>` : ""}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #334155; font-size: 13px; color: #cbd5e1; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #334155; font-size: 13px; color: #cbd5e1; text-align: right;">
            Rp ${item.price.toLocaleString("id-ID")}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #334155; font-size: 13px; font-weight: 600; color: #f8fafc; text-align: right;">
            Rp ${(item.totalPrice || item.price * item.quantity).toLocaleString("id-ID")}
          </td>
        </tr>
      `).join("")
      : `
        <tr>
          <td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8; font-size: 13px;">
            Hardware Component Package (Order #${params.orderNumber})
          </td>
        </tr>
      `;

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Tax Invoice ${params.orderNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; margin: 0; padding: 24px; }
            .container { max-width: 640px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
            .badge { display: inline-block; background: #10b981; color: #ffffff; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-box { background: #0f172a; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #334155; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th { background: #0f172a; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; border-bottom: 2px solid #334155; }
            .summary-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            .summary-table td { padding: 6px 12px; font-size: 13px; }
            .total-row { border-top: 2px solid #334155; font-weight: 900; font-size: 16px; color: #34d399; }
            .footer { margin-top: 32px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #334155; padding-top: 20px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="margin-bottom: 20px;">
              <table style="width: 100%;">
                <tr>
                  <td style="vertical-align: top;">
                    <div style="font-size: 18px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">PT TETHERA KOMPUTASI PRESISI</div>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">NPWP: 01.345.678.9-021.000</div>
                    <div style="font-size: 12px; color: #94a3b8;">Mangga Dua Mall Lt. 3 No. 36, Jakarta Pusat 10730</div>
                  </td>
                  <td style="text-align: right; vertical-align: top;">
                    <span class="badge">PAID IN FULL</span>
                    <div style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-top: 6px; font-family: monospace;">${params.orderNumber}</div>
                    <div style="font-size: 11px; color: #94a3b8;">Date: ${formattedDate}</div>
                  </td>
                </tr>
              </table>
            </div>

            <div class="meta-box">
              <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 6px;">Billed To Registered Customer</div>
              <div style="font-size: 15px; font-weight: 700; color: #ffffff;">${params.customerName}</div>
              <div style="font-size: 13px; color: #38bdf8;">${params.toEmail}</div>
              <div style="font-size: 12px; color: #cbd5e1; margin-top: 6px;">
                <strong>Fulfillment:</strong> ${isCnC ? "In-Store Click & Collect (Mangga Dua Mall)" : `Courier Delivery${params.shippingAddress ? ` (${params.shippingAddress})` : ""}`}
              </div>
              ${params.paymentMethod ? `<div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;"><strong>Payment Method:</strong> ${params.paymentMethod}</div>` : ""}
              ${params.paymentId ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 2px; font-family: monospace;">Payment ID: ${params.paymentId}</div>` : ""}
              ${isCnC && params.pickupCode ? `<div style="font-size: 12px; color: #f59e0b; margin-top: 4px; font-weight: 700;">Store Pickup PIN: ${params.pickupCode}</div>` : ""}
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <table class="summary-table">
              <tr>
                <td style="color: #94a3b8;">Subtotal:</td>
                <td style="text-align: right; color: #f8fafc;">Rp ${params.subtotal.toLocaleString("id-ID")}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8;">Delivery / Logistics:</td>
                <td style="text-align: right; color: #f8fafc;">${params.shippingFee > 0 ? `Rp ${params.shippingFee.toLocaleString("id-ID")}` : "Free"}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 11px;">Dasar Pengenaan Pajak (DPP):</td>
                <td style="text-align: right; color: #64748b; font-size: 11px;">Rp ${dpp.toLocaleString("id-ID")}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 11px;">PPN 11% (Included):</td>
                <td style="text-align: right; color: #64748b; font-size: 11px;">Rp ${ppn.toLocaleString("id-ID")}</td>
              </tr>
              <tr class="total-row">
                <td style="padding-top: 10px;">Grand Total:</td>
                <td style="text-align: right; padding-top: 10px;">Rp ${params.grandTotal.toLocaleString("id-ID")}</td>
              </tr>
            </table>

            <div class="footer">
              Official digital tax invoice issued by PT Tethera Komputasi Presisi pursuant to Indonesian tax regulations.<br>
              This invoice has been dispatched to your registered email account.<br>
              For support or inquiries, contact support@tethera.com or WhatsApp +62 812-3456-7890.
            </div>
          </div>
        </body>
      </html>
    `;

    const dispatched = await dispatchEmail({
      to: params.toEmail,
      subject: `Official Tax Invoice #${params.orderNumber} - Tethera`,
      html: emailHtml,
    });

    return { success: dispatched };
  } catch (err: any) {
    console.error("Failed to send invoice email:", err);
    return { success: false, error: err?.message || "Failed to send invoice email" };
  }
}

async function dispatchEmail(params: { to: string; subject: string; html: string }): Promise<boolean> {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Tethera PC Express <marketing@pcexpress.com>",
          to: params.to,
          subject: params.subject,
          html: params.html,
        }),
      });
      return response.ok;
    } else {
      console.log(`[EMAIL DISPATCH - SUCCESS]
  To: ${params.to}
  Subject: ${params.subject}
  Time: ${new Date().toISOString()}
  Status: Delivered (Dev Simulation)`);
      return true;
    }
  } catch (err) {
    console.error("Failed to dispatch email:", err);
    return false;
  }
}
