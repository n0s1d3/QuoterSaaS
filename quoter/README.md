# Quoter · Phase 1

React + TypeScript frontend, Cloudflare Worker API, and D1 database. This phase uses the seeded Demo Business organization, without authentication. Do not expose the API publicly with real customer information before adding authentication and organization authorization.

## Local development

Use Node 24 (Node 22.12+ is also supported by Vite) and npm. From `QuoterSaaS/quoter`:

```bash
# These writable paths are needed in the Codex cloud environment.
export npm_config_cache=/workspace/.npm-cache
export XDG_CONFIG_HOME=/workspace/.config
export WRANGLER_SEND_METRICS=false
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

No Cloudflare login is needed for local D1. Local data is persisted in the ignored `.wrangler/state` directory. Seed commands are repeatable and preserve existing records. Open the Vite address on your own machine. Routes: `/`, `/quotes`, `/quotes/new`, `/quotes/:id`, `/settings`. Customers are selected or created directly inside the quote builder.

## Database and manual Cloudflare configuration

`wrangler.jsonc` declares `quoter-db` with Worker binding `DB`. The all-zero `database_id` is explicitly a **local placeholder**, not a provisioned Cloudflare database. On your authenticated computer:

```bash
npx wrangler d1 create quoter-db
# Replace database_id in wrangler.jsonc with the returned database UUID.
npm run cf-typegen
npx wrangler d1 migrations apply quoter-db --remote
# Optional: populate a remote demo environment, never production customer data.
npx wrangler d1 execute quoter-db --remote --file seed.sql
# Deploy only when you choose to publish the demo application.
npm run deploy
```

Apply `0001_initial.sql` (schema), `0002_quote_numbering.sql` (sequences), and `0003_branding.sql` (business name/logo/colors). Sequence allocation, quote insertion, and item insertion run in one transactional D1 batch. Future organization selection should be derived from authenticated membership, replacing the current `demoOrganization` lookup. No database was created remotely during implementation.

## API

- `GET /api/customers`: demo organization customers.
- `POST /api/customers`: create a customer; name required, company/phone/email/taxId/address optional.
- `GET /api/quotes`: summaries including customer name and cent-based totals.
- `POST /api/quotes`: save customerId, issueDate, optional expiryDate/notes/discount, and 1–100 items (description, quantity, unitPrice, taxRate).
- `GET /api/quotes/:id`: customer, ordered items, dates, notes, and totals.

All money in API/database is integer cents (`35000` = Q 350.00). Quantities can be fractional. New quotes are tax-free: the backend uses taxRate=0 even if an old client supplies a tax rate. Previously saved taxed quotes retain their historical totals. Decimal arithmetic rounds each line subtotal and line tax half up to integer cents. The server recalculates totals and ignores client-supplied totals. Discounts exceeding subtotal plus tax are rejected rather than permitting negative totals. Error responses use `{ "error": "message" }` and appropriate 400/404/405/503/500 status codes.

## Verification

```bash
npm test             # Four calculation/money tests including fractional-cent rounding
npm run typecheck
npm run lint
npm run build
# With the local dev server running and seeds applied:
npm run test:api     # Invalid requests, concurrency, persistence and ignored client totals
```

`test:api` creates six smoke-test quotes and deletes one during validation. It also tests status changes and logo persistence. It supports `QUOTER_TEST_URL` to target another local port; use only a development database.

The UI was verified with Chromium: customer creation, quote builder live totals, save, detail refresh, quote-list navigation, dashboard, and mobile page loading. Example: 2 × Q 350.00, tax 12%, discount Q 10.00 → Q 774.00. Persisted database values: subtotal 70000, tax 8400, discount 1000, total 77400.

## Structure

- `src/pages`: dashboard/cards, inline customer quote builder, detail and brand settings.
- `src/lib`: money conversion/formatting, shared calculator, API client and types.
- `worker/routes`: customer and quote HTTP handlers.
- `worker/services`: quote validation and transactional creation.
- `worker/db`: organization/customer/quote queries.
- `migrations`, `seed.sql`: D1 schema and stable demo records.

Authentication, subscriptions, invoices and public sharing are outside this phase.

## Simplified mobile workflow

The builder starts with an inline new customer or lets you choose an existing customer. Items use mobile cards without tax inputs, with visible add-item actions. Native date fields open the device calendar when supported. Quote cards include item previews, customer/date/total, a status selector (draft/sent/accepted/rejected), and deletion with confirmation. Deleting also removes quote items while keeping number sequences. `/settings` saves business name, PNG/JPEG/WebP logo (up to 280 KB), and primary/secondary colors in D1. Branding appears in quote detail and in downloaded PDFs.

Additional endpoints: `PATCH /api/quotes/:id` (`{ "status": "sent" }`), `DELETE /api/quotes/:id`, and `GET/PUT /api/branding`.

## Editing quotes

Use Editar on a quote card or Editar cotización in the detail page. `/quotes/:id/edit` loads the existing customer, dates, ordered items, discount and notes. Cancel returns without saving. Saving sends `PUT /api/quotes/:id`; validation and calculation use the same server logic as creation. The quote ID, number and status are preserved; its items are replaced in the same D1 transaction as the header update. New or edited quotes use no taxes; historical taxed quotes show a warning before recalculating without taxes. No additional migration is required. `test:api` checks updates, preserved identity/status, recalculated totals, and failed validation leaving stored values intact.

## PDF download

Open a quote detail and click Descargar PDF. The PDF is generated locally in the browser and downloaded as `Q-0001.pdf`, without Cloudflare login or external document services. It uses the business name, logo and colors captured in the quote when it was created. It includes customer contact details, dates, status, ordered items, server-persisted totals, notes, repeated letterhead and page numbers. Long tables and notes flow to additional A4 pages. Historical tax amounts remain visible when present. The PDF does not change the quote status.

Set the brand before downloading; if its settings cannot load or a logo cannot be decoded, the UI reports an error. No database migration is needed. After updating the repository, run `npm ci` to install the new PDF dependencies. `npm test` covers document generation, authoritative totals, long-document pagination and invalid images. Download and logo inclusion were also checked in Chromium at mobile width, and the resulting PDF was visually reviewed. PDF output reflects the saved quote branding snapshot; updating the business does not silently change existing quotes.

## Branding snapshots and diagnostics

Run `npm run db:migrate` to apply `0004_quote_branding.sql`. Every new quote captures logo, name and both colors from its organization within the creation transaction. Editing items and changing status preserve that snapshot. Existing quotes have Mantener marca guardada and Actualizar a la marca actual actions in their detail. Explicit refresh uses `PATCH /api/quotes/:id` with `{ "refreshBranding": true }`.

Legacy records are initialized using the brand available at migration time. Earlier branding was never stored and cannot be recovered. Refresh replaces only that quote’s saved brand; it does not change other quotes.

Mi negocio and quote detail contain Diagnóstico de marca y PDF. It retains the latest 60 events in local browser storage and offers copy/clear. Records include image format, size, decode dimensions, save/read-back verification, snapshot use, PDF image insertion per page and errors. It excludes image contents and customer data. Logo uploads are decoded and normalized to PNG at a maximum dimension of 640 px. Save remains disabled while processing. Brand saves are read back from D1 and checked against the submitted data. To investigate a missing logo, select/upload, save, download, then copy the diagnostic log. Changes must be saved before they apply to new quotes.
