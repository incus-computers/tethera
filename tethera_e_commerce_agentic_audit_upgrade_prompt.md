{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "prompt_metadata": {
    "target_repository": "https://github.com/incus-computers/tethera",
    "gitingest_source": "https://gitingest.com/incus-computers/tethera",
    "version": "1.0.0",
    "purpose": "End-to-End E-Commerce Architecture Audit, Feature Gap Remediation, Admin Workflow Implementation, and System Optimization",
    "execution_mode": "autonomous_agent_workflow"
  },
  "agent_system_instructions": {
    "role": "Principal Full-Stack E-Commerce Architect & Staff Security Engineer",
    "primary_objective": "Inspect the local or ingested `incus-computers/tethera` codebase, map all existing customer and admin e-commerce workflows, identify missing production-critical capabilities, and systematically implement the architectural fixes, feature upgrades, and performance optimizations defined in this specification.",
    "execution_phases": [
      {
        "phase": 1,
        "name": "Codebase Discovery & Dependency Mapping",
        "instructions": [
          "Inspect package manifests (e.g., package.json, requirements.txt, Cargo.toml, go.mod) and environment templates (.env.example).",
          "Locate and parse the database schema / ORM definitions (e.g., Prisma, Drizzle, TypeORM, SQLAlchemy, Mongoose, or raw SQL migrations).",
          "Map all public customer routes/controllers, authentication middleware, webhook handlers, and admin dashboard routes.",
          "Generate an internal traceability matrix matching each requirement in `customer_pov_audit` and `admin_pov_audit` against existing files in `tethera`."
        ]
      },
      {
        "phase": 2,
        "name": "Gap Analysis & Prioritized Remediation Plan",
        "instructions": [
          "Flag P0 blockers (data corruption risks, floating-point money math, missing webhook idempotency, race-condition overselling, broken auth/RBAC).",
          "Flag P1 functional gaps (missing customer checkout/post-purchase flows, missing admin fulfillment/refund workflows).",
          "Flag P2 optimizations (query performance, caching, search indexing, bundle size, observability)."
        ]
      },
      {
        "phase": 3,
        "name": "Iterative Implementation & Verification",
        "instructions": [
          "Execute database migrations safely without destructive data loss.",
          "Implement backend service layer fixes with strict input validation (e.g., Zod/Pydantic) and ACID transactions.",
          "Build or upgrade frontend customer and admin UI components with optimistic updates, loading states, and error boundaries.",
          "Write integration and unit tests covering concurrency, payment webhooks, and RBAC."
        ]
      }
    ],
    "coding_constraints": [
      "NEVER represent monetary amounts as IEEE 754 floating-point numbers. Always store and calculate currency in integer minor units (e.g., cents) with an explicit ISO-4217 currency code.",
      "NEVER mutate or delete historical order line-item pricing when an admin updates or deletes a catalog product. Enforce immutable order item snapshots.",
      "NEVER rely solely on client-side redirect URLs to mark an order as paid or deduct stock. Payment gateway webhooks must be the single source of truth.",
      "ALWAYS wrap inventory checks, stock deductions, and order creation inside atomic database transactions with row-level locking or optimistic concurrency control."
    ]
  },
  "customer_pov_audit_and_missing_functions": {
    "overview": "Evaluate the storefront from initial landing through post-purchase support. Ensure the customer journey is resilient, fast, and self-serviceable.",
    "critical_capabilities": [
      {
        "id": "CUST-01",
        "domain": "Catalog Discovery, Search & Variant Resolution",
        "common_codebase_gaps": [
          "Products lack multi-dimensional SKU variants (e.g., Size/Color/Configuration combinations with distinct SKUs, prices, stock levels, and imagery).",
          "Search is restricted to naive SQL `ILIKE '%query%'` without typo tolerance,faceted filtering (price range, brand, availability, specs), or sorting.",
          "Out-of-stock variants are not dynamically disabled on the Product Detail Page (PDP) prior to clicking 'Add to Cart'."
        ],
        "required_implementation": {
          "database": "Introduce a `ProductVariant` / `SKU` entity linked to `Product`, storing variant-specific `sku_code`, `price_cents`, `compare_at_price_cents`, `stock_quantity`, `reserved_quantity`, `weight_grams`, and `attributes_json`.",
          "backend": "Build a faceted query endpoint supporting cursor/offset pagination, attribute filtering, price range bounds, stock status filtering, and deterministic sorting.",
          "frontend": "Implement URL-synced filter state (`?category=...&minPrice=...&sort=...`), instant SKU state resolution on the PDP, and 'Notify Me When Back in Stock' capture for depleted SKUs."
        }
      },
      {
        "id": "CUST-02",
        "domain": "Persistent Hybrid Cart & Session Merging",
        "common_codebase_gaps": [
          "Cart state exists only in browser `localStorage` (lost across devices and unvalidated against live database prices/stock) OR requires forced account login before adding items.",
          "Logging into an existing account overwrites or orphans items added during the anonymous browsing session.",
          "Stale cart items retain old prices or deleted products until checkout crashes."
        ],
        "required_implementation": {
          "database": "Create `Cart` and `CartItem` tables supporting both `user_id` (nullable) and `anonymous_session_token` (indexed UUID with TTL/expiry).",
          "backend": "Implement a cart-merge service triggered on login/registration that sums quantities for matching SKUs, caps them at available stock, and invalidates the anonymous cart. Re-validate live product availability and price changes on every cart fetch.",
          "frontend": "Display clear inline notifications in the cart drawer if an item's price changed or stock dropped below the requested quantity since it was added."
        }
      },
      {
        "id": "CUST-03",
        "domain": "Atomic Checkout, Inventory Reservation & Payment Integrity",
        "common_codebase_gaps": [
          "Race condition during high concurrency where two users buy the last item simultaneously because stock is only checked on cart load.",
          "Client sends total price directly from the frontend to the payment API instead of the server recalculating totals from database records.",
          "Orders are created only when the browser redirects to `/success`, losing orders if the user's browser closes mid-redirect."
        ],
        "required_implementation": {
          "database": "Add `InventoryReservation` (with `expires_at` timestamp, e.g., 15 minutes) and `ProcessedWebhookEvent` tables.",
          "backend": [
            "Calculate subtotal, discounts, shipping, and tax strictly on the server.",
            "When initializing a PaymentIntent / Checkout Session, open an ACID transaction (`SELECT ... FOR UPDATE`), verify `available_stock = stock_quantity - reserved_quantity >= requested_qty`, create a Pending Order and temporary `InventoryReservation`, and attach `order_id` to payment gateway metadata.",
            "Build an idempotent webhook handler (`POST /api/webhooks/payment`) that verifies cryptographic signatures, records the `event_id`, transitions the order to `PAID`, permanently deducts `stock_quantity`, clears the reservation, and enqueues confirmation emails.",
            "Run a scheduled cleanup job/cron to release expired reservations from abandoned checkouts."
          ]
        }
      },
      {
        "id": "CUST-04",
        "domain": "Dynamic Shipping, Tax Calculation & Address Validation",
        "common_codebase_gaps": [
          "Hardcoded flat-rate shipping or zero tax calculation.",
          "No distinction between billing and shipping addresses, or lack of postal code / state validation.",
          "No support for promotional discount codes or gift cards at checkout."
        ],
        "required_implementation": {
          "backend": "Create a modular shipping & tax calculation service supporting zone-based rules (country/state/postcode), weight/dimension tiers, free-shipping thresholds, and GST/VAT/Sales Tax calculation (inclusive vs. exclusive tax support). Validate promo codes against minimum spend, usage limits, expiry dates, and SKU eligibility.",
          "frontend": "Multi-step or accordion checkout with address autocomplete/validation, real-time shipping method selection, promo code input with instant breakdown updates, and saved address book selection for authenticated users."
        }
      },
      {
        "id": "CUST-05",
        "domain": "Post-Purchase Lifecycle, Order Tracking & Self-Service RMA",
        "common_codebase_gaps": [
          "No transactional emails sent upon order placement, shipment, or refund.",
          "Guest checkout users have no way to check their order status without an account.",
          "Customers cannot download tax invoices/receipts, cancel unshipped orders, or request returns (RMA)."
        ],
        "required_implementation": {
          "backend": [
            "Integrate an email/notification provider (e.g., Resend, SendGrid, Postmark, or SMTP) triggered via asynchronous background events for Order Confirmation, Shipping Confirmation (with tracking links), Password Reset, and Refund Processed.",
            "Provide a signed, high-entropy guest order lookup token (`/orders/track?token=...` or order number + email verification).",
            "Generate downloadable PDF tax invoices with line-item tax breakdowns.",
            "Allow customers to cancel orders while in `PENDING` or `PAID` (pre-fulfillment) state and submit Return Merchandise Authorization (RMA) requests for delivered items."
          ]
        }
      },
      {
        "id": "CUST-06",
        "domain": "Trust, Reviews, Wishlists & Account Security",
        "common_codebase_gaps": [
          "Anyone can post fake product reviews without having purchased the item.",
          "No wishlist / saved-for-later capability.",
          "Missing rate limiting on login/checkout, missing CSRF protection, and lack of password reset or OAuth flows."
        ],
        "required_implementation": {
          "backend": "Restrict review submission or badge reviews with a `verified_purchase` boolean by checking for a `COMPLETED`/`DELIVERED` order containing the SKU. Add rate limiting on authentication and checkout endpoints.",
          "frontend": "Add verified buyer badges, star rating histograms, user wishlist persistence, and full account profile management."
        }
      }
    ]
  },
  "admin_pov_audit_and_missing_workflows": {
    "overview": "Evaluate the back-office administration tools. Store operators must be able to run daily fulfillment, catalog management, customer support, and accounting without direct database manipulation.",
    "critical_workflows": [
      {
        "id": "ADMIN-01",
        "domain": "Order State Machine, Fulfillment & Split Shipments",
        "common_codebase_gaps": [
          "Orders only have a simple status string (`pending`, `completed`) with arbitrary transitions allowed.",
          "No workflow to pack items, attach carrier names and tracking numbers, handle partial/split shipments, or print packing slips."
        ],
        "required_implementation": {
          "database": "Create `Fulfillment` and `FulfillmentItem` tables linked to `Order`. Enforce strict state transitions: `PENDING_PAYMENT` -> `PAID` -> `PROCESSING` -> `PARTIALLY_FULFILLED` -> `FULFILLED` -> `DELIVERED` (plus `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`).",
          "backend": "Expose admin endpoints to create fulfillments for specific line-item quantities, attach `carrier`, `tracking_number`, and `tracking_url`, and automatically dispatch shipment notification emails.",
          "frontend": "Build an Admin Order Detail view showing payment timeline, fraud/risk indicators, customer contact info, fulfillment builder modal, printable packing slip view, and internal staff notes."
        }
      },
      {
        "id": "ADMIN-02",
        "domain": "Refunds, Returns (RMA) & Restocking Workflows",
        "common_codebase_gaps": [
          "Admins must log into Stripe/PayPal externally to refund a customer, leaving the e-commerce database out of sync with financial reality.",
          "Refunding an order does not distinguish between restocking returnable inventory vs. writing off damaged goods."
        ],
        "required_implementation": {
          "database": "Create `Refund` and `ReturnRequest` (RMA) tables tracking `amount_cents`, `reason`, `restock_items` boolean, `gateway_refund_id`, and `processed_by_admin_id`.",
          "backend": "Build an admin refund service that calls the payment gateway's refund API (supporting both full and partial line-item or custom-amount refunds), updates order financial status, optionally increments SKU stock in an audit-logged transaction, and sends a credit note email to the customer."
        }
      },
      {
        "id": "ADMIN-03",
        "domain": "Catalog Lifecycle, Soft Deletes & Bulk Operations",
        "common_codebase_gaps": [
          "Hard-deleting a product (`DELETE FROM products`) either fails due to foreign key constraints on past orders or cascades and wipes out historical order records.",
          "Products are immediately live upon creation with no `DRAFT` or `ARCHIVED` staging workflow.",
          "No bulk CSV import/export or bulk price/stock editor."
        ],
        "required_implementation": {
          "database": "Add `status` (`DRAFT`, `ACTIVE`, `ARCHIVED`) and `deleted_at` (soft delete timestamp) to `Product` and `ProductVariant`. Decouple `OrderItem` via immutable snapshot columns (`product_title_snapshot`, `variant_title_snapshot`, `sku_snapshot`, `unit_price_cents_snapshot`, `tax_rate_snapshot`).",
          "backend": "Implement CSV/JSON bulk import and export endpoints for products and inventory levels, plus a batch update endpoint for price/category/status changes.",
          "frontend": "Add multi-select data tables in the Admin Catalog view with bulk action toolbars, drag-and-drop media ordering, and SEO metadata fields (`slug`, `meta_title`, `meta_description`)."
        }
      },
      {
        "id": "ADMIN-04",
        "domain": "Inventory Ledger, Low-Stock Alerts & Warehouse Tracking",
        "common_codebase_gaps": [
          "Inventory is a single mutable integer column (`stock = 10`) with zero visibility into *why* stock changed (sale vs. manual admin edit vs. return vs. shrinkage).",
          "No automated alerts when popular items approach zero stock."
        ],
        "required_implementation": {
          "database": "Create an immutable `InventoryAdjustmentLedger` table recording `variant_id`, `delta_quantity`, `previous_quantity`, `new_quantity`, `reason_code` (`SALE`, `RESTOCK`, `RETURN`, `DAMAGE`, `MANUAL_AUDIT`), `reference_order_id`, and `actor_id`. Add `low_stock_threshold` per SKU.",
          "frontend": "Provide an Admin Inventory Dashboard highlighting low-stock and out-of-stock SKUs, with quick inline stock adjustment modals that require a reason code."
        }
      },
      {
        "id": "ADMIN-05",
        "domain": "Promotions, Discounts & Campaign Engine",
        "common_codebase_gaps": [
          "Discounts are either non-existent or limited to a single static percentage off the whole cart."
        ],
        "required_implementation": {
          "database": "Create `Promotion` / `Coupon` schema supporting `discount_type` (`PERCENTAGE`, `FIXED_AMOUNT`, `FREE_SHIPPING`, `BUY_X_GET_Y`), `code`, `starts_at`, `ends_at`, `max_global_uses`, `max_uses_per_user`, `min_subtotal_cents`, and eligible product/category relations.",
          "frontend": "Build an Admin Promotions manager to create, schedule, deactivate, and track redemption revenue/usage counts for discount codes."
        }
      },
      {
        "id": "ADMIN-06",
        "domain": "Role-Based Access Control (RBAC) & Immutable Audit Logs",
        "common_codebase_gaps": [
          "Authorization relies on a single `isAdmin: boolean` flag.",
          "No audit trail of which admin changed a product's price, issued a refund, or exported customer PII."
        ],
        "required_implementation": {
          "database": "Define granular roles (`SUPER_ADMIN`, `CATALOG_MANAGER`, `FULFILLMENT_OPERATOR`, `SUPPORT_AGENT`, `CUSTOMER`) and an append-only `AdminAuditLog` table (`actor_id`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `ip_address`, `created_at`).",
          "backend": "Enforce permission middleware on all `/api/admin/*` routes and automatically log all mutating admin operations."
        }
      },
      {
        "id": "ADMIN-07",
        "domain": "Business Intelligence, Financial Reporting & Customer CRM",
        "common_codebase_gaps": [
          "Admin dashboard shows only raw row counts instead of actionable financial and operational metrics.",
          "No customer CRM view showing lifetime value (LTV), order history, or ability to ban/flag fraudulent accounts."
        ],
        "required_implementation": {
          "backend": "Create aggregation endpoints calculating Gross Merchandise Value (GMV), Net Revenue (Gross minus Refunds, Discounts, Taxes), Average Order Value (AOV), conversion funnel drop-off, top-selling SKUs, and revenue by time period.",
          "frontend": "Build an Admin Analytics overview with date-range pickers, CSV accounting exports, and a Customer CRM directory."
        }
      }
    ]
  },
  "optimizations_and_architectural_improvements": {
    "database_and_query_optimizations": [
      {
        "id": "OPT-DB-01",
        "title": "Eliminate N+1 Queries & Add Composite Indexes",
        "action": "Audit all product listing, cart hydration, and order history queries. Eager-load or batch-fetch relations (`variants`, `images`, `categories`). Add composite database indexes on `(status, category_id, created_at)` for products, `(user_id, created_at DESC)` for orders, and unique indexes on `slug` and `sku_code`."
      },
      {
        "id": "OPT-DB-02",
        "title": "Full-Text Search & Trigram Indexing",
        "action": "Replace naive wildcard `LIKE '%term%'` queries (which cause full table scans) with PostgreSQL `tsvector` + GIN indexes, `pg_trgm` for fuzzy matching, or an external search index (Meilisearch / Typesense)."
      }
    ],
    "backend_and_caching_optimizations": [
      {
        "id": "OPT-BE-01",
        "title": "Asynchronous Background Job Queue",
        "action": "Decouple slow I/O tasks (sending emails, generating PDF invoices, syncing search indexes, resizing images, firing analytics webhooks) from HTTP request-response cycles using a job queue or event bus."
      },
      {
        "id": "OPT-BE-02",
        "title": "Stale-While-Revalidate Catalog Caching & On-Demand Invalidation",
        "action": "Cache public read-heavy endpoints (category trees, homepage featured products, product detail payloads) using Redis or HTTP Cache-Control / ISR tags, and trigger instant cache invalidation whenever an admin updates a product or stock reaches zero."
      },
      {
        "id": "OPT-BE-03",
        "title": "Strict API Contract Validation & Standardized Error Envelopes",
        "action": "Validate all incoming request bodies, query params, and webhook payloads with strict schema validators. Return consistent RFC 7807 Problem Details or structured error codes (`INSUFFICIENT_STOCK`, `PRICE_CHANGED`, `COUPON_EXPIRED`) so the UI can react deterministically."
      }
    ],
    "frontend_and_ux_optimizations": [
      {
        "id": "OPT-FE-01",
        "title": "Optimistic UI Updates & Debounced Cart Mutations",
        "action": "Apply optimistic state updates when users increment/decrement cart quantities, debouncing network requests (e.g., 300ms) to prevent API flooding and UI jitter."
      },
      {
        "id": "OPT-FE-02",
        "title": "Media Pipeline, Responsive Images & Core Web Vitals",
        "action": "Serve product imagery in modern formats (WebP/AVIF) with responsive `srcset` sizes, explicit aspect-ratio containers to prevent Cumulative Layout Shift (CLS), and priority preloading on the primary PDP hero image for optimal Largest Contentful Paint (LCP)."
      },
      {
        "id": "OPT-FE-03",
        "title": "SEO, OpenGraph & JSON-LD Structured Data",
        "action": "Inject `schema.org/Product` and `schema.org/BreadcrumbList` JSON-LD scripts on every product page (including price, currency, availability `InStock`/`OutOfStock`, and aggregate ratings) plus dynamic OpenGraph meta tags."
      }
    ]
  },
  "expected_agent_deliverables": {
    "step_1_audit_report": "Output a Markdown table mapping every `CUST-*`, `ADMIN-*`, and `OPT-*` item to the exact file paths in `incus-computers/tethera`, classifying each as `MISSING`, `PARTIAL`, or `COMPLETE`.",
    "step_2_schema_migration": "Generate the complete updated database schema and migration files implementing variants, cart persistence, immutable order snapshots, inventory reservations, fulfillments, refunds, coupons, and audit logs.",
    "step_3_code_implementation": "Implement the missing backend services, API routes, webhook handlers, and frontend customer/admin views modularly with full type safety.",
    "step_4_verification_suite": "Provide automated tests verifying concurrent checkout stock locking, webhook idempotency, cart merging, and admin RBAC enforcement."
  }
}