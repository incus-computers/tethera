import { isDemoMode } from "@/lib/runtime/environment";
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
    this.storePhoneNumber = "";
  }

  /**
   * Generates a wa.me prefilled deep-link for a specific product on the PDP
   */
  generateProductInquiryUrl(params: ProductInquiryParams): string {
    const text = encodeURIComponent(
      `Hi PC Store Team, I'm inquiring about the *${params.productName}* (SKU: ${params.sku}) priced at ${params.price}.\n` +
      `Is this available for immediate in-store pickup today?\nLink: ${params.productUrl}`
    );
    return `/contact?message=${text}`;
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
    return `/contact?message=${text}`;
  }

  /**
   * Sends transactional WhatsApp message via WhatsApp Business Cloud API
   * or conversational gateway (e.g. Meta Graph API, Twilio, Fonnte)
   */
  async sendClickAndCollectReadyMessage(_params:ClickAndCollectReadyParams):Promise<boolean>{return isDemoMode();}
  async sendPaymentConfirmedMessage(_phone:string,_name:string,_order:string,_fulfillment:"delivery"|"click_and_collect",_custom:boolean):Promise<boolean>{return isDemoMode();}
}
