# Tethera Server-Side Database Architecture

All database operations in Tethera are strictly encapsulated on the **server side**. Client components and browser bundles never have direct access to database credentials or SQL query builders, keeping database keys secure and making table management intuitive and modular.

---

## 📁 Directory Structure

```text
src/lib/db/
├── client.ts                 # Server-only Supabase client (service role & env safety)
├── types.ts                  # TypeScript interfaces matching PostgreSQL schema
├── index.ts                  # Consolidated `db` entry point
├── README.md                 # This documentation
└── repositories/             # Modular table repositories (one file per table)
    ├── base.repository.ts    # Generic CRUD & query builder class
    ├── products.repository.ts
    ├── categories.repository.ts
    ├── stores.repository.ts
    ├── inventory.repository.ts
    ├── orders.repository.ts
    ├── customBuilds.repository.ts
    ├── customers.repository.ts
    └── marketplace.repository.ts
```

---

## 🚀 How to Add a New Table (in 3 Simple Steps)

Whenever you create a new table in PostgreSQL / Supabase, follow this 3-step pattern:

### Step 1: Define the Type in `src/lib/db/types.ts`

Add your table interface:

```typescript
// src/lib/db/types.ts
export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at?: string;
}
```

### Step 2: Create a Repository in `src/lib/db/repositories/`

Create a new file, for example `src/lib/db/repositories/reviews.repository.ts`:

```typescript
// src/lib/db/repositories/reviews.repository.ts
import "server-only";
import { BaseRepository } from "./base.repository";
import { ProductReview } from "../types";

export class ReviewsRepository extends BaseRepository<ProductReview> {
  constructor() {
    // Pass table name and optional initial fallback items
    super("product_reviews", []);
  }

  // Add any custom queries specific to this table:
  async getByProductId(productId: string): Promise<ProductReview[]> {
    return this.findMany({ product_id: productId }, { orderBy: "created_at", orderDirection: "desc" });
  }

  async getAverageRating(productId: string): Promise<number> {
    const reviews = await this.getByProductId(productId);
    if (!reviews.length) return 0;
    return reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
  }
}

export const reviewsRepository = new ReviewsRepository();
```

### Step 3: Register in `src/lib/db/index.ts`

Export your new repository in `src/lib/db/index.ts`:

```typescript
import { reviewsRepository } from "./repositories/reviews.repository";

export const db = {
  // ...existing repositories
  reviews: reviewsRepository,
};
```

**That's it!** You can now perform typed CRUD operations on your new table anywhere on the server:

```typescript
import { db } from "@/lib/db";

// In an API route, Server Action, or Server Component:
const reviews = await db.reviews.getByProductId("prod-123");
const newReview = await db.reviews.create({
  product_id: "prod-123",
  rating: 5,
  comment: "Runs cool and quiet!",
});
```

---

## 🛠 Available Built-in Methods on Any Table

Every repository inheriting from `BaseRepository<T>` automatically receives:

| Method | Description |
| :--- | :--- |
| `db.<tableName>.findById(id)` | Get record by primary key ID |
| `db.<tableName>.findOne(filter)` | Find first record matching column criteria |
| `db.<tableName>.findMany(filter?, options?)` | List records with filtering, pagination (`limit`/`offset`), and ordering (`orderBy`/`orderDirection`) |
| `db.<tableName>.create(data)` | Insert a new record and return the created entity |
| `db.<tableName>.update(id, data)` | Update an existing row by ID |
| `db.<tableName>.delete(id)` | Delete a row by ID |
| `db.<tableName>.count(filter?)` | Count matching records |
| `db.<tableName>.query()` | Access the raw Supabase query builder for joins, RPCs, and custom SQL |

---

## 🔒 Security & Server Isolation

- Every file in `src/lib/db/` includes `import "server-only";`.
- If client code accidentally tries to import `@/lib/db`, Next.js will halt the build and prevent secret leakage.
- Database calls use `SUPABASE_SERVICE_ROLE_KEY` on the server, avoiding client-side Row Level Security bypass issues and preventing key exposure in browser inspect tools.

---

## ⚙️ Environment Variables

Add these to `.env.local` to connect your live Supabase database:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key
```

*Note: If environment variables are omitted during local offline testing, repositories operate seamlessly in safe mock fallback mode without crashing.*
