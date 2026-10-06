# Working State & Task Context

## Active Goal
Implement order confirmation redirection, transaction choice, invoice download, and automatic invoice email dispatch to the customer's registered email address upon product purchase.

## Anti-Slop Status
- **Mode**: during (global preference from `%APPDATA%\antislop\settings.json`)
- **Copywriting**: No em dashes (`—`) in any agent-written copy, UI, or comments.
- **Accessibility**: Minimum 44px tap targets (`min-h-[44px]`), WCAG AA compliant color contrast, visible focus rings (`focus-visible:ring-2 focus-visible:ring-emerald-500`).
- **Functionality**: Every interactive element is fully functional with real destinations, loading states, and error handling. No dead links or fake data.
- **Verification**: Verified via Next.js production build (`npm run build`) and test run of `sendInvoiceEmail`.

## Architecture & Workflows

### 1. Purchase & Confirmation Flow
1. Customer completes checkout on `/checkout`.
2. Order is saved via `/api/checkout/create-order` and processed via `/api/checkout/midtrans/charge`.
3. Snapshot is stored in `sessionStorage.getItem("tethera_last_order")`.
4. Invoice email is immediately dispatched to `customer_email` via `sendInvoiceEmail`.
5. Customer is routed to:
   `/checkout/success?orderNumber=[ORDER_NUMBER]&paymentId=[PAYMENT_ID]`
6. Success Page displays:
   - Primary Heading: `Purchase Successful! Your Order has been received. ([ORDER_NUMBER])`
   - Primary Choice 1: "Go to Transaction Page" (`/transactions`)
   - Primary Choice 2: "Download Invoice" (Direct file download of tax invoice)
   - Status Notice: Reassurance that an invoice was sent to the registered email address, with a working "Resend to Email" button.

### 2. Transaction Page (`/transactions`)
- Displays verified customer transactions and orders.
- Loads live data from `/api/account/orders` for authenticated users and seamlessly falls back to `sessionStorage` for guest checkouts.
- Each transaction provides order status, payment reference, item summary, and direct "Download Invoice" functionality.
- Also supports "Send to Email" and deep linking to account live tracking (`/account?tab=current_orders`).

### 3. Invoice Delivery & Email Service
- `sendInvoiceEmail` in `src/lib/notifications/email.ts`:
  - Structured modular template with itemized table, subtotal, PPN 11% tax, delivery/pickup details, and payment confirmation.
  - Dispatches via Resend API when `RESEND_API_KEY` is present or logs structured dispatch in local/dev environments.
- API Endpoints:
  - `POST /api/orders/invoice/send`: Sends or resends an invoice to a customer's registered email.
  - `GET /api/orders/invoice/download`: Downloads the official invoice document (`force-dynamic`).
- Client Utility:
  - `src/lib/utils/invoiceDownload.ts`: Generates and triggers instant browser file download of formatted tax invoice.

## Task Checklist
- [x] Announce antislop active mode: `during (global preference)`
- [x] Create `working.md` and `gemini.md` (with antislop pointer block)
- [x] Implement `sendInvoiceEmail` in `src/lib/notifications/email.ts`
- [x] Connect `sendInvoiceEmail` to `/api/checkout/midtrans/charge/route.ts` and `/api/checkout/payment-success/route.ts`
- [x] Create API route `/api/orders/invoice/send/route.ts`
- [x] Create API route `/api/orders/invoice/download/route.ts` and client helper `src/lib/utils/invoiceDownload.ts`
- [x] Update `/checkout/success/page.tsx` with heading `Purchase Successful! Your Order has been received. ([orderNumber])`, choice buttons, and email confirmation
- [x] Create dedicated `/transactions/page.tsx` with order history, status, and invoice download
- [x] Build & typecheck verification (28/28 static and dynamic routes compiled with 0 errors)
