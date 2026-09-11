/**
 * WhatsApp Integration Service
 * Provides deep-linking for pre-purchase chat inquiries and
 * transactional notification dispatching (Order Confirmations, Click & Collect PINs).
 */

export interface ProductInquiryParams {
  productName: string;
  sku: string;
  price: string;
  productUrl: string;
}

export interface PCBuildInquiryParams {
  buildSlug: string;
  buildUrl: string;
  estimatedWattage: number;
  totalPrice: string;
}

export interface ClickAndCollectReadyParams {
  customerPhone: string;
  customerName: string;
  orderNumber: string;
  pickupCode: string; // 4-digit PIN
  storeName: string;
  storeAddress: string;
  tradingHours: string;
  qrUrl: string;
}

export class WhatsAppNotificationService {
  private storePhoneNumber: string;

  constructor() {
    this.storePhoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_STORE_PHONE || "6281234567890";
  }

  /**
   * Generates a wa.me prefilled deep-link for a specific product on the PDP
   */
  generateProductInquiryUrl(params: ProductInquiryParams): string {
    const text = encodeURIComponent(
      `Hi PC Store Team, I'm inquiring about the *${params.productName}* (SKU: ${params.sku}) priced at ${params.price}.\n` +
      `Is this available for immediate in-store pickup today?\nLink: ${params.productUrl}`
    );
    return `https://wa.me/${this.storePhoneNumber}?text=${text}`;
  }

  /**
   * Generates a wa.me prefilled deep-link for a Custom PC build configuration
   */
  generateBuilderInquiryUrl(params: PCBuildInquiryParams): string {
    const text = encodeURIComponent(
      `Hi PC Store Technician! I've configured a custom PC build on your website:\n` +
      `🖥️ *Build Config*: ${params.buildUrl}\n` +
      `⚡ *Estimated Wattage*: ${params.estimatedWattage}W\n` +
      `💰 *Total*: ${params.totalPrice}\n\n` +
      `Could you please review component compatibility and cooler clearance before I place my order?`
    );
    return `https://wa.me/${this.storePhoneNumber}?text=${text}`;
  }

  /**
   * Sends transactional WhatsApp message via WhatsApp Business Cloud API
   * or conversational gateway (e.g. Meta Graph API, Twilio, Fonnte)
   */
  async sendClickAndCollectReadyMessage(params: ClickAndCollectReadyParams): Promise<boolean> {
    const apiKey = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    const message = 
      `🚨 *Your Order is Ready for Collection!*\n\n` +
      `Dear ${params.customerName},\n` +
      `Your order *#${params.orderNumber}* is assembled, verified, and waiting at our counter.\n\n` +
      `🔑 *Pickup PIN*: *${params.pickupCode}*\n` +
      `📍 *Location*: ${params.storeName}\n` +
      `🏢 *Address*: ${params.storeAddress}\n` +
      `🕒 *Hours Today*: ${params.tradingHours}\n\n` +
      `📱 *Show Barcode/QR*: ${params.qrUrl}\n\n` +
      `_Please present this PIN along with a valid photo ID upon pickup._`;

    // Direct HTTP call to WhatsApp Cloud API / provider
    try {
      if (apiKey && phoneId) {
        const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: params.customerPhone.replace(/\D/g, ""),
            type: "text",
            text: { body: message }
          })
        });
        return response.ok;
      } else {
        console.log(`[WHATSAPP MOCK DISPATCH] Sent to ${params.customerPhone}:\n${message}`);
        return true;
      }
    } catch (err) {
      console.error("Failed to dispatch WhatsApp notification:", err);
      return false;
    }
  }

  /**
   * Sends payment confirmation message
   */
  async sendPaymentConfirmedMessage(
    customerPhone: string,
    customerName: string,
    orderNumber: string,
    fulfillmentType: "delivery" | "click_and_collect",
    isCustomPc: boolean
  ): Promise<boolean> {
    const actionText = isCustomPc
      ? "Our technicians have commenced assembly and 24h stress-testing."
      : fulfillmentType === "click_and_collect"
      ? "Our team is preparing your order for counter pickup."
      : "Your order is being packed for courier dispatch.";

    const message =
      `✅ *Payment Confirmed - Order #${orderNumber}*\n\n` +
      `Thank you, ${customerName}! Your payment was successful and all items are reserved.\n` +
      `⚙️ *Next Step*: ${actionText}\n\n` +
      `We will notify you via WhatsApp the moment it is ready!`;

    console.log(`[WHATSAPP MOCK DISPATCH] Sent to ${customerPhone}:\n${message}`);
    return true;
  }
}
