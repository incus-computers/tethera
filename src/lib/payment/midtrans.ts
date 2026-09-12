// Midtrans Payment Gateway Integration for Tethera E-Commerce

export type MidtransPaymentChannel =
  // QRIS
  | "qris"
  // Virtual Accounts
  | "bca_va"
  | "mandiri_bill"
  | "bni_va"
  | "bri_va"
  | "permata_va"
  | "cimb_va"
  // E-Wallets
  | "gopay"
  | "shopeepay"
  | "dana"
  | "ovo"
  // Cards
  | "credit_card"
  // Convenience Store
  | "indomaret"
  | "alfamart"
  // Cardless Credit / PayLater
  | "kredivo"
  | "akulaku";

export interface MidtransPaymentMethod {
  id: MidtransPaymentChannel;
  name: string;
  category: "qris" | "va" | "ewallet" | "card" | "store" | "paylater";
  categoryName: string;
  description: string;
  badge?: string;
  feePercentage?: number;
  feeFixed?: number;
  iconType: string;
  instructions: {
    title: string;
    steps: string[];
  }[];
}

export const MIDTRANS_PAYMENT_METHODS: MidtransPaymentMethod[] = [
  // 1. QRIS
  {
    id: "qris",
    name: "QRIS Instant Pay",
    category: "qris",
    categoryName: "QRIS",
    description: "Scan dynamic QR code with GoPay, OVO, DANA, BCA Mobile, Livin Mandiri, or any QRIS banking app.",
    badge: "Instant Verification",
    iconType: "qris",
    instructions: [
      {
        title: "How to Pay with QRIS",
        steps: [
          "Open your preferred mobile banking app (BCA Mobile, Livin' by Mandiri, etc.) or e-wallet (GoPay, OVO, DANA, ShopeePay).",
          "Select the 'Pay' or 'Scan QRIS' menu.",
          "Point your camera at the QR code displayed on the screen.",
          "Verify that the merchant name shows 'TETHERA HARDWARE' and the amount matches your order total.",
          "Enter your transaction PIN to complete payment.",
          "Your payment will be verified instantly within 5-10 seconds.",
        ],
      },
    ],
  },

  // 2. Bank Virtual Accounts
  {
    id: "bca_va",
    name: "BCA Virtual Account",
    category: "va",
    categoryName: "Virtual Account",
    description: "Pay via BCA Mobile (m-BCA), KlikBCA, or BCA ATM with instant 24/7 automatic confirmation.",
    badge: "Automated 24/7",
    iconType: "bca",
    instructions: [
      {
        title: "BCA Mobile (m-BCA)",
        steps: [
          "Open BCA Mobile and select m-BCA.",
          "Select 'm-Transfer' > 'BCA Virtual Account'.",
          "Enter the 15-digit BCA Virtual Account number.",
          "Confirm merchant name is 'Tethera E-Commerce' and payment total matches.",
          "Enter your m-BCA PIN to confirm transaction.",
        ],
      },
      {
        title: "BCA ATM",
        steps: [
          "Insert your BCA ATM card and enter your PIN.",
          "Select 'Transaksi Lainnya' > 'Transfer' > 'Ke Rek BCA Virtual Account'.",
          "Enter the BCA Virtual Account number and press 'Benar'.",
          "Review transaction details and press 'Ya' to pay.",
        ],
      },
    ],
  },
  {
    id: "mandiri_bill",
    name: "Mandiri Bill Payment",
    category: "va",
    categoryName: "Virtual Account",
    description: "Pay via Livin' by Mandiri (Yellow app), Mandiri Internet Banking, or Mandiri ATM.",
    badge: "Automated 24/7",
    iconType: "mandiri",
    instructions: [
      {
        title: "Livin' by Mandiri",
        steps: [
          "Open Livin' by Mandiri and log in.",
          "Select 'Bayar' > 'Cari Penyedia Jasa' > enter Company Code '70012' (Midtrans / Tethera).",
          "Enter the generated Payment Bill Key.",
          "Confirm payment amount and enter your Livin PIN.",
        ],
      },
      {
        title: "Mandiri ATM",
        steps: [
          "Insert Mandiri ATM card and PIN.",
          "Select 'Bayar/Beli' > 'Lainnya' > 'Multi Payment'.",
          "Enter Company Code '70012' and press 'Benar'.",
          "Enter your Payment Bill Key and confirm payment.",
        ],
      },
    ],
  },
  {
    id: "bni_va",
    name: "BNI Virtual Account",
    category: "va",
    categoryName: "Virtual Account",
    description: "Pay via BNI Mobile Banking, BNI Internet Banking, or BNI ATM.",
    badge: "Automated 24/7",
    iconType: "bni",
    instructions: [
      {
        title: "BNI Mobile Banking",
        steps: [
          "Open BNI Mobile Banking and log in.",
          "Select 'Pembayaran' > 'Virtual Account Billing'.",
          "Select 'Input Baru' and enter the 16-digit BNI VA Number.",
          "Verify the details and enter your Transaction Password.",
        ],
      },
    ],
  },
  {
    id: "bri_va",
    name: "BRI Virtual Account (BRIVA)",
    category: "va",
    categoryName: "Virtual Account",
    description: "Pay via BRImo app, Internet Banking BRI, or BRI ATM.",
    badge: "Automated 24/7",
    iconType: "bri",
    instructions: [
      {
        title: "BRImo (BRI Mobile)",
        steps: [
          "Open BRImo and log in.",
          "Select 'Pembayaran' > 'BRIVA'.",
          "Enter the 16-digit BRIVA Number.",
          "Verify the merchant name and total, then enter your BRImo PIN.",
        ],
      },
    ],
  },
  {
    id: "permata_va",
    name: "Permata Virtual Account",
    category: "va",
    categoryName: "Virtual Account",
    description: "Pay via PermataME mobile banking or any ATM with ALTO / Bersama network.",
    badge: "Automated 24/7",
    iconType: "permata",
    instructions: [
      {
        title: "PermataME Mobile",
        steps: [
          "Open PermataME and select 'Bayar Tagihan' > 'Virtual Account'.",
          "Enter the Permata Virtual Account number.",
          "Confirm payment amount and submit.",
        ],
      },
    ],
  },
  {
    id: "cimb_va",
    name: "CIMB Niaga Virtual Account",
    category: "va",
    categoryName: "Virtual Account",
    description: "Pay via OCTO Mobile or CIMB Niaga ATM.",
    badge: "Automated 24/7",
    iconType: "cimb",
    instructions: [
      {
        title: "OCTO Mobile CIMB",
        steps: [
          "Open OCTO Mobile and select 'Transfer' > 'Transfer to Other CIMB Niaga Account' or 'Virtual Account'.",
          "Enter the CIMB Virtual Account number.",
          "Confirm transaction details and enter your PIN.",
        ],
      },
    ],
  },

  // 3. E-Wallets
  {
    id: "gopay",
    name: "GoPay / GoPay Later",
    category: "ewallet",
    categoryName: "E-Wallet",
    description: "Instant redirect or push notification to your Gojek app with GoPay & GoPay Later support.",
    badge: "One-Click Checkout",
    iconType: "gopay",
    instructions: [
      {
        title: "GoPay Direct Push",
        steps: [
          "You will be redirected to the Gojek app or prompted to open your GoPay notification.",
          "Review payment details for Tethera.",
          "Choose GoPay Balance or GoPay Later 0%.",
          "Enter your 6-digit GoPay PIN to finalize.",
        ],
      },
    ],
  },
  {
    id: "shopeepay",
    name: "ShopeePay / SPayLater",
    category: "ewallet",
    categoryName: "E-Wallet",
    description: "Pay using ShopeePay balance or SPayLater installment directly via the Shopee app.",
    badge: "One-Click Checkout",
    iconType: "shopeepay",
    instructions: [
      {
        title: "Shopee App Payment",
        steps: [
          "Click the ShopeePay payment button to open your Shopee application.",
          "Check order total and choose ShopeePay or SPayLater.",
          "Enter your ShopeePay PIN.",
        ],
      },
    ],
  },
  {
    id: "dana",
    name: "DANA E-Wallet",
    category: "ewallet",
    categoryName: "E-Wallet",
    description: "Pay seamlessly using your registered DANA e-wallet account.",
    badge: "Instant",
    iconType: "dana",
    instructions: [
      {
        title: "DANA Web / App",
        steps: [
          "Enter your phone number registered with DANA.",
          "Enter the OTP sent to your phone and your DANA PIN.",
          "Confirm the transaction amount to complete.",
        ],
      },
    ],
  },
  {
    id: "ovo",
    name: "OVO SmartPay",
    category: "ewallet",
    categoryName: "E-Wallet",
    description: "Push notification sent straight to your OVO app for quick PIN authorization.",
    badge: "Push Notification",
    iconType: "ovo",
    instructions: [
      {
        title: "OVO Mobile App",
        steps: [
          "Enter your OVO registered phone number.",
          "Open the push notification received on your smartphone within 60 seconds.",
          "Authorize payment with your OVO Security Code.",
        ],
      },
    ],
  },

  // 4. Credit / Debit Cards
  {
    id: "credit_card",
    name: "Credit / Debit Card (Visa, Mastercard, JCB)",
    category: "card",
    categoryName: "Credit / Debit Card",
    description: "Secured with Midtrans 3D-Secure 2.0. Supports Visa, Mastercard, JCB, and American Express.",
    badge: "3D-Secure 2.0 Protected",
    iconType: "card",
    instructions: [
      {
        title: "Card Security Protocol",
        steps: [
          "Enter your 16-digit card number, valid expiration date (MM/YY), and 3-digit CVV.",
          "Your issuing bank will send a one-time password (OTP) via SMS.",
          "Input the OTP in the secure 3D-Secure verification window to finalize.",
        ],
      },
    ],
  },

  // 5. Convenience Stores
  {
    id: "indomaret",
    name: "Indomaret / Ceriamart",
    category: "store",
    categoryName: "Over the Counter",
    description: "Pay at any Indomaret or Ceriamart cashier across Indonesia using the payment code.",
    badge: "20,000+ Outlets",
    iconType: "indomaret",
    instructions: [
      {
        title: "Paying at Indomaret",
        steps: [
          "Show the 12-digit payment code to the Indomaret cashier.",
          "Inform the cashier you are making an e-commerce payment for 'Tethera / Midtrans'.",
          "Pay the exact cash amount and collect your printed payment receipt.",
        ],
      },
    ],
  },
  {
    id: "alfamart",
    name: "Alfamart / Alfamidi",
    category: "store",
    categoryName: "Over the Counter",
    description: "Pay with cash at any Alfamart, Alfamidi, Lawson, or Dan+Dan store.",
    badge: "18,000+ Outlets",
    iconType: "alfamart",
    instructions: [
      {
        title: "Paying at Alfamart",
        steps: [
          "Visit your nearest Alfamart or Alfamidi store.",
          "Tell the cashier: 'Pembayaran E-Commerce Midtrans / Tethera'.",
          "Show your payment code and complete payment with cash or debit.",
        ],
      },
    ],
  },

  // 6. Cardless Credit / PayLater
  {
    id: "kredivo",
    name: "Kredivo Installment",
    category: "paylater",
    categoryName: "Cardless Credit",
    description: "Buy now, pay in 30 days with 0% interest, or split into 3, 6, or 12-month low-interest installments.",
    badge: "0% 30-Day Interest",
    iconType: "kredivo",
    instructions: [
      {
        title: "Kredivo App Checkout",
        steps: [
          "Log into your Kredivo account with your registered phone number and PIN.",
          "Select your installment tenure (30 days, 3 months, 6 months, 12 months).",
          "Input OTP sent via SMS to verify order.",
        ],
      },
    ],
  },
  {
    id: "akulaku",
    name: "Akulaku PayLater",
    category: "paylater",
    categoryName: "Cardless Credit",
    description: "Flexible financing and installment plans without a physical credit card.",
    badge: "Instant Approval",
    iconType: "akulaku",
    instructions: [
      {
        title: "Akulaku Checkout",
        steps: [
          "Log into Akulaku with your mobile number.",
          "Select your preferred installment terms.",
          "Authorize payment via SMS verification.",
        ],
      },
    ],
  },
];

export interface MidtransGeneratedPayment {
  paymentId: string;
  orderNumber: string;
  channel: MidtransPaymentChannel;
  channelName: string;
  amount: number;
  vaNumber?: string;
  billKey?: string;
  billerCode?: string;
  qrString?: string;
  paymentCode?: string;
  expiryTime: string;
  status: "pending" | "settlement" | "expire" | "cancel";
}

/**
 * Generates realistic Midtrans transaction data and identifiers
 */
export function generateMidtransPaymentDetails(
  orderNumber: string,
  channel: MidtransPaymentChannel,
  amount: number
): MidtransGeneratedPayment {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const paymentId = `MID-${dateStr}-TRX${randomSuffix}`;

  // Expiry time set to 24 hours from now
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const method = MIDTRANS_PAYMENT_METHODS.find((m) => m.id === channel) || MIDTRANS_PAYMENT_METHODS[0];

  let vaNumber: string | undefined;
  let billKey: string | undefined;
  let billerCode: string | undefined;
  let qrString: string | undefined;
  let paymentCode: string | undefined;

  switch (channel) {
    case "bca_va":
      vaNumber = `70012${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      break;
    case "mandiri_bill":
      billerCode = "70012";
      billKey = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      break;
    case "bni_va":
      vaNumber = `8808${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      break;
    case "bri_va":
      vaNumber = `88810${Math.floor(10000000000 + Math.random() * 90000000000)}`;
      break;
    case "permata_va":
      vaNumber = `8778${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      break;
    case "cimb_va":
      vaNumber = `5919${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      break;
    case "qris":
      qrString = `00020101021226590014ID.LINKAJA.WWW01189360091100223533210215TETHERA-${orderNumber}51450015ID.OR.GOPAY.WWW0215ID1020023912853520458125303360540${amount}5802ID5916TETHERA HARDWARE6007JAKARTA61051073062070703A016304`;
      break;
    case "indomaret":
      paymentCode = `IND${Math.floor(100000000 + Math.random() * 900000000)}`;
      break;
    case "alfamart":
      paymentCode = `ALFA${Math.floor(100000000 + Math.random() * 900000000)}`;
      break;
    default:
      break;
  }

  return {
    paymentId,
    orderNumber,
    channel,
    channelName: method.name,
    amount,
    vaNumber,
    billKey,
    billerCode,
    qrString,
    paymentCode,
    expiryTime: expiry,
    status: "pending",
  };
}
