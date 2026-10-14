# Quoter · Phase 1

React + TypeScript frontend, Cloudflare Worker API, and D1 database. Registration creates a private business for each account; verified email is required before using its data. All data APIs require an authenticated session and derive the business from that session. Legacy Demo Business records remain preserved and can be explicitly assigned to an empty account using the local import command below.

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

Apply `0001_initial.sql` (schema), `0002_quote_numbering.sql` (sequences), and `0003_branding.sql` (business name/logo/colors). Sequence allocation, quote insertion, and item insertion run in one transactional D1 batch. Organization selection is derived from the authenticated user, never an organization ID supplied by the frontend. No database was created remotely during implementation.

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

Subscriptions, invoices and public sharing are outside this phase.

## Simplified mobile workflow

The builder starts with an inline new customer or lets you choose an existing customer. Items use mobile cards without tax inputs, with visible add-item actions. Native date fields open the device calendar when supported. Compact quote cards show a two-line notes preview (or Sin notas), customer/date/total, status buttons (draft/sent/accepted/rejected), and icon buttons for viewing, editing and duplicating at the bottom. Deletion is available only to owners inside quote detail, with confirmation. Deleting moves the quote to the recoverable trash area while preserving its items and number sequence. `/settings` saves business name, PNG/JPEG/WebP logo (uploads up to 10 MB, automatically resized), and primary/secondary colors in D1. Branding appears in quote detail and in downloaded PDFs.

Additional endpoints: `PATCH /api/quotes/:id` (`{ "status": "sent" }`), `DELETE /api/quotes/:id`, and `GET/PUT /api/branding`.

## Editing quotes

Use Editar on a quote card or Editar cotización in the detail page. `/quotes/:id/edit` loads the existing customer, dates, ordered items, discount and notes. Cancel returns without saving. Saving sends `PUT /api/quotes/:id`; validation and calculation use the same server logic as creation. The quote ID, number and status are preserved; its items are replaced in the same D1 transaction as the header update. New or edited quotes use no taxes; historical taxed quotes show a warning before recalculating without taxes. No additional migration is required. `test:api` checks updates, preserved identity/status, recalculated totals, and failed validation leaving stored values intact.

## PDF download

Open a quote detail and click Descargar PDF. The PDF is generated locally in the browser and downloaded as `Q-0001.pdf`, without Cloudflare login or external document services. It uses the business name, logo and colors captured in the quote when it was created. It includes customer contact details, dates, status, ordered items, server-persisted totals, notes, repeated letterhead and page numbers. Long tables and notes flow to additional A4 pages. Historical tax amounts remain visible when present. The PDF does not change the quote status.

Set the brand before downloading; if its settings cannot load or a logo cannot be decoded, the UI reports an error. No database migration is needed. After updating the repository, run `npm ci` to install the new PDF dependencies. `npm test` covers document generation, authoritative totals, long-document pagination and invalid images. Download and logo inclusion were also checked in Chromium at mobile width, and the resulting PDF was visually reviewed. PDF output reflects the saved quote branding snapshot; updating the business does not silently change existing quotes.

## Branding snapshots and diagnostics

Run `npm run db:migrate` to apply `0004_quote_branding.sql`. Every new quote captures logo, name and both colors from its organization within the creation transaction. Editing items and changing status preserve that snapshot. Existing quotes have Mantener marca guardada and Actualizar a la marca actual actions in their detail. Explicit refresh uses `PATCH /api/quotes/:id` with `{ "refreshBranding": true }`.

Legacy records are initialized using the brand available at migration time. Earlier branding was never stored and cannot be recovered. Refresh replaces only that quote’s saved brand; it does not change other quotes.

Brand/PDF diagnostics are backend-only. No diagnostic panel is rendered in quote detail or Mi negocio, and old browser-stored logs are removed. Technical events are batched through authenticated, verified-account `POST /api/diagnostics` and written to Worker logs with source `quoter.brand-pdf` and the server-selected organization. The endpoint has no read route, allows only known events and technical metadata, and rate-limits submissions. Image contents, customer information and raw error strings are discarded; diagnostic delivery failures do not interrupt saving or PDF generation. For local troubleshooting, inspect the terminal running `npm run dev`; after deployment, inspect Cloudflare Worker logs. These are runtime logs, not a permanent database audit trail. Logo uploads are decoded and normalized to PNG at a maximum dimension of 640 px, progressively reducing dimensions until the stored image fits 400,000 characters. Uploads up to 10 MB are accepted. A failed upload blocks saving until retried or explicitly discarded. Save remains disabled while processing. Brand saves are read back from D1 and checked against the submitted data. To investigate a missing logo, select/upload, save and download while observing the backend logs. Changes must be saved before they apply to new quotes.

## Reusable product and service catalog

Apply `0005_catalog.sql` with `npm run db:migrate`. `/catalog` creates and edits reusable items scoped to the current organization. Types and billing units use native dropdowns with an Otra opción… field for custom values (product, service, consultation, advisory; unit, meter, hour, session, etc.). Each item has a cent-based unit price, description, optional estimated duration and validity date, last price-review date, and configurable warning interval (default 90 days). Saving an item marks its price reviewed today in Guatemala time. Expired prices and old prices display warnings in the catalog and quote picker; warnings ask for review but do not prevent a deliberate quote.

The quote builder offers Elegir del catálogo with search. Selected templates populate price, description, unit, time and validity; these values can be adjusted for the customer. Saved quotes retain a snapshot of line values even when catalog prices are updated or an item is archived. Archiving hides the item from new selection and preserves existing quote references. Most-sold sorting uses quantities on accepted quotes, not invoices or payments; units with different meanings are shown separately on their cards.

GET/POST `/api/catalog`, PUT/DELETE `/api/catalog/:id` support listing, creation, update and archival. Server validation checks organization membership for catalog references and rejects invalid prices, intervals and dates. Catalog IDs are tracked on quote items to compute accepted-quote usage.

### Billing additional

Each quote can have no additional, a fixed amount in cents, or a percentage. Percentage is applied to subtotal plus historical tax minus discount. The server calculates and rounds the additional to cents; the frontend displays a preview using the same calculator. API fields: `surchargeType` (`none`, `fixed`, `percent`), `surchargeValue` (integer cents for fixed, integer basis points for percent: 1200 = 12%). The returned `surcharge` is integer cents and included in total. The PDF and quote detail show the additional separately, along with line units, times and validity. This is an explicit quotation charge; no invoices or tax automation are implemented.

Tests cover review/expiry warnings, fixed/percentage rounding, catalog validation and archival, accepted-quote ranking, historical price preservation, and surcharge persistence. Mobile browser verification includes creation of a custom advisory/hour item, selection into a quote, expired-price warnings, percentage additional, save/edit and PDF contents.

## Accounts and separate businesses

Apply `0006_accounts.sql`. The UI offers register, login and logout. Registration requires a business name, unique normalized email and a password of 12–128 characters. It creates a new private organization in a transaction. Every account starts with its own business and can join other businesses through verified invitations; roles apply to the active business.

Passwords use Web Crypto PBKDF2-SHA256 with 100,000 iterations (the Cloudflare Workers per-call limit) and random per-user salts. Sessions use random 256-bit opaque tokens; only their SHA-256 digest is stored in D1. Session cookies are HttpOnly, SameSite=Strict, host-only and Secure with a __Host- prefix over HTTPS; local HTTP development uses a separate non-Secure cookie. Sessions expire after seven days. Logout revokes the token; login replaces any incoming session. Mutations require JSON, reject a supplied cross-origin Origin header and reject cross-site Sec-Fetch-Site metadata. Authenticated database writes recheck the session and required role in the same transaction (migration 0016). Authentication attempts are limited in D1 by email and IP over 15-minute windows. Deploy with HTTPS. Email verification and password recovery are implemented; see RESEND_SETUP.md.

Endpoints: POST `/api/auth/register`, POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/me`. All other API endpoints require the session. Customer/catalog/quote lookups and writes are scoped to its business; arbitrary organization IDs in request bodies cannot select another business.

### Keep your existing local data

The upgrade does not delete the previous demo business, customers, catalog, quotes or branding. Create your real account first, then, **before creating any data in its new empty business**, stop the server and run:

```bash
npm run account:import-demo -- your@email.com
```

This local command assigns the demo business to the existing account. It refuses an account with customers/catalog/quotes already present and refuses assigning a demo business already owned by another account. It preserves all records and leaves the original empty organization intact. Restart, sign out if needed, and sign in again. No automatic first-user takeover occurs. Remote data assignment is not exposed as an API operation.

### Tests after the upgrade

With the dev server running:

```bash
npm run test:auth
npm run test:api
```

Both suites require local email preview and register isolated temporary test accounts; API fixtures are created inside their own businesses and do not change your records. Test accounts remain in the development database. Repeated rapid test runs can encounter the authentication limiter. The auth suite verifies cross-business reads and mutations, foreign customer/catalog references, brand isolation, session revocation, JSON/origin protection, duplicate registration, weak passwords and throttling. Mobile UI registration, quote creation, persistence, logout and login were also verified.

## Email verification and password recovery

Apply `0007_email_security.sql`. Copy `.dev.vars.example` to `.dev.vars` if no local configuration exists, then restart Vite. Existing accounts must verify their email; their business data is preserved. Use Reenviar verificación and the local preview link to verify without a real provider. Verification also requires the current account password, revokes earlier sessions and requires a fresh login. Forgot-password links reset passwords and revoke all existing sessions. `npm run test:email` covers expiry, single-use races, purpose validation, session revocation and new-password login.

Production Resend setup, secure secret placement, sender DNS verification, public APP_URL and local testing instructions are documented in [RESEND_SETUP.md](RESEND_SETUP.md). Live delivery remains unvalidated until those settings are supplied. Public links/WhatsApp and invoicing remain deferred.

## Full business profile, organized quotes, and teams

Apply `0008_business_team.sql`. Existing accounts become owners of their existing business, and active sessions are initialized to that business. No customer, catalog, quote or logo is deleted.

### Profile and document defaults

Mi negocio now saves NIT, address, phone, business email and default payment conditions. New quotes capture these profile fields in the brand snapshot. Payment conditions are separately saved on the quote and can be customized in the builder. Updating a historical quote’s brand updates its letterhead only; it does not silently change its contractual payment conditions. Full contact information appears in the repeated PDF letterhead; payment conditions have a dedicated section. Legacy snapshots remain unchanged until explicitly refreshed.

### Quote organization

Quote cards offer accent-insensitive customer/number search, inclusive issue-date bounds, status filters and an expired-only toggle. Draft/sent quotes warn when past their expiry or due within seven days; accepted/rejected quotes do not display these offer-expiry warnings. Duplicate creates a new draft with the next organization number, today’s Guatemala issue date and no copied expiration. It keeps customer, prices, items, discount, surcharge, notes and payment conditions, recalculates server totals, and captures the current business profile. It opens the duplicate in the editor for review. POST `/api/quotes/:id/duplicate` is authorized for owners/editors.

### Team roles and memberships

Equipo is available to owners. Invitations target an email and an editor or viewer role, expire in three days, and are single-use. Acceptance requires a verified account with exactly that email. Register/verify first if needed, then reopen the invitation. Accepting adds membership and switches the current session to the invited business; the member’s personal business remains intact. Negocio selects the active business.

| Role | Capabilities in that business |
| --- | --- |
| Owner | All data, profile, team invitations/roles, removal and deletion |
| Editor | Read/PDF; create/edit customers, catalog and quotes; change status, duplicate and refresh quote brand; no business profile/team changes or deletion/archive |
| Viewer | Read and PDF download; no business-data mutations |

The owner cannot remove or demote the owner. Removing membership revokes sessions active in that business. Role checks occur on every API request; UI visibility is an additional convenience. Reload to reflect permissions changed by another team member. Browser requests carry expected user/business context so a session switched in another tab cannot silently write to the wrong workspace.

Endpoints: GET `/api/businesses`, POST `/api/businesses/switch`, GET `/api/team`, POST `/api/team/invitations`, DELETE `/api/team/invitations/:id`, PATCH/DELETE `/api/team/members/:userId`, POST `/api/invitations/accept`. Organization selection is validated against membership, not accepted as an arbitrary tenant ID.

Invitations use Resend when fully configured. Without sender/public URL/key, local preview works via the existing `.dev.vars` preview configuration. Real invitation delivery remains untested until Resend is configured. [RESEND_SETUP.md](RESEND_SETUP.md) applies; the invitation route is `/account/invite#token=...`.

Run `npm run test:business` with a preview-mode local server to check complete-profile snapshots, defaults, duplication, invitation ownership, role permissions, switching, member removal and revocation. The local suite creates isolated test businesses. Mobile UI and PDF contents were also verified.

## Compact business dashboard

Resumen uses miniature quote links with customer, one-line notes, state, date, total and expiry hint; clicking a miniature opens quote detail. Ver todas opens the full Cotizaciones cards with stacked icon actions. Dashboard charts and reminders share a compact two-column layout on wide screens, reflow on smaller screens and keep search/date/status filters in a collapsed Filtrar resumen section. Its compact counters and six-month grouped bar chart show accepted quote totals and potential totals in GTQ. Potential includes only draft/sent quotes without expiry or with expiry on/after the current Guatemala date; rejected and expired pending quotes are excluded. Amounts are quote values, not payments received or net profit. Monthly grouping uses issue date, and a collapsible table exposes exact values. Search/date/status filters apply to counters, charts and quote reminders, including quotes beyond the six visible cards; catalog price reminders refer to the full active business catalog.

The category chart counts each quote once per distinct current catalog category, with manual/unlinked lines under Sin categoría. Multi-category quote counts can exceed the quote count. Categories are derived in the organization-scoped quotes list; no new migration is needed. Reminders show expired quotes, upcoming expiry within seven days, drafts and active catalog prices needing review, with links to detail or catalog. Status changes immediately refresh totals and reminders. `npm test` covers totals, expiry boundaries, deduplication, empty data and month/year boundaries; local browser checks cover API category isolation, live updates, filtering, reminder navigation and 320/390/1280 px layouts.

## Dark interface and navigation

The application uses the supplied navy/burgundy/red/orange/yellow palette through `src/theme.css`, with a dark sidebar, compact header search, account menu, themed forms and access pages. Business branding saved for PDFs is independent of the interface theme. The sidebar can collapse on desktop and becomes a drawer on mobile; the drawer supports Escape, focus return, background scroll locking and inert hidden/background navigation. Account and business permissions remain enforced by the existing API.

Header search opens `/quotes?search=...` and searches customer or quote number within the active business. Repeated searches on the same route remount the list with the new query. The dashboard status ring links to `/quotes?status=draft|sent|accepted|rejected`; unsupported status values fall back to all. Dashboard notes thumbnails and reminders remain available. The design has been checked at 320/390/768/1280/1920 px, including authentication, search, status filtering, navigation, business profile, catalog, team, quote creation and PDF download. No database migration is needed.

## Consolidation: backups, recovery, history and pagination

Apply `0009_data_management.sql` with `npm run db:migrate`. This additive migration preserves existing customers, catalog, quotes and branding. New quote deletions move the quote to a recoverable trash area; records deleted permanently before this migration cannot be recovered. Trashed quotes are excluded from normal reads, accepted sales ranking and dashboard totals. Owners can restore them with their original number, items, status and brand from **Datos y recuperación** (`/data`). No permanent-delete or automatic-purge operation is exposed.

Only owners can export/restore business data or view the business-wide history. The full JSON export includes business profile/logo, customers, active/archived catalog, quotes, line items, per-quote branding/payment snapshots and trash. It excludes accounts, passwords, sessions, memberships, invitations, diagnostic logs and audit records. CSV includes quote values in GTQ and neutralizes spreadsheet formulas. JSON export/restore is bounded to 8 MiB and 2000 total customer/catalog/quote/item records; larger datasets require a database-level backup. Export validates those bounds rather than creating an oversized file the app cannot restore.

Restoration updates existing records inside the active business instead of creating copies. The preview reports created/updated counts for customers, catalog and quotes; the owner explicitly confirms overwriting matching data. Existing quote IDs/numbers are retained, items are replaced transactionally, and records absent from the file are preserved. Cross-business imports use stable business-scoped identities, so importing the same source file again updates its earlier imported records without touching the source business. New quotes alone consume destination sequence numbers. Historical tax/totals, brand snapshots and trash state are restored. The business profile is kept unless its replacement checkbox is explicitly selected.

A server preview checks schema, references, monetary calculations and counts. Its token is tied to the owner, active business, overwrite mode and validated content hash, expires in 15 minutes, and is consumed in the same transaction as the updates. Concurrent submissions cannot apply a review twice. JSON batches keep D1 query counts low. Neither backups nor restore import account access. Copies created by the previous additive restoration are not automatically deleted or merged, because their identity cannot be inferred reliably.

Quote creation/edit/status/brand/trash/recovery/import and backup export/restore actions record actor and time in D1. Histories begin at this upgrade; old actions cannot be reconstructed. Quote history is readable by business members with quote access; the full history and trash are owner-only and paginated at 25 rows. Quote mutations and their audit records commit together. Edits also reject a concurrent revision change during their transaction, preserving the existing items on conflict.

The UI quote list now uses server-side search/date/state/expiry filters and 12-row pages; SQL treats `%`, `_` and backslash in search as literal characters and handles Spanish accents. `/api/dashboard` computes filtered totals, monthly sums, category counts and reminders across all matching active quotes, returning only six recent previews. Dashboard totals are not limited to the current quote page. Legacy unpaged GET `/api/quotes` remains available for existing scripts. A paged list uses `?paged=true&page=1&size=12`; sizes are limited to 50. Quote detail labels and financial validation messages are in Spanish.

### Permanent browser and data tests

With a local preview-mode development server running, tests create isolated accounts and leave their fixtures in local D1. Never run them against production. `npm ci` installs the added Playwright dependency; install its browser once:

```powershell
npx playwright install chromium
npm run test:data
npm run test:ui
```

`test:data` checks business isolation, owner-only data operations, backup validation, spreadsheet safety, ID remapping, one-use concurrent restore, audit events, trash preservation and server pagination/dashboard totals. `test:ui` checks real login/logout, search, pagination, state changes, PDF, history, trash recovery, backup download/review/import and layouts at 320/390/768/1280/1920 px. Both are tracked in the repository. Set `QUOTER_TEST_URL` when Vite uses another local port. `QUOTER_BROWSER_PATH` can point to an already installed Chromium instead of downloading Playwright's browser. Optional `QUOTER_TEST_IP` isolates synthetic local fixture rate-limit buckets during repeated runs; it does not disable application limits.

## Business plans and capacity

Apply migrations through `0011_paid_capacity_plans.sql`. Existing businesses keep their assigned tier; new businesses start with Plan 1 capacity. No tier is marketed as free. Existing records and team access are preserved, even when already over a limit. Plans are provisional capacity limits, without prices or monthly resets:

| Plan | Quotes outside trash | Active catalog | Members + pending seats |
| --- | ---: | ---: | ---: |
| Plan 1 | 25 | 15 | 1 |
| Plan 2 | 50 | 25 | 3 |
| Plan 3 | 100 | 50 | 5 |

All quote states and expired quotes outside trash count. Archived catalog and trash do not count; the owner counts as a team member, and unique unexpired invitations reserve seats until accepted, revoked or expired. Reinviting the same email does not consume another seat. The owner-only **Plan y uso** page (`/plan`, GET `/api/plans`) displays usage, limits and warnings from 80% capacity. Mutation/route changes refresh notices; quota failures explain which resource reached its limit. Business switching keeps usage isolated.

SQLite triggers enforce limits inside write transactions, covering creation, duplication, trash recovery, catalog reactivation, team invitations/acceptance and bulk backup restores. Failed writes roll back their sequence allocation, token consumption and related changes. Backup restores release archived/trash capacity before additions, and cannot import or modify the business plan. Existing data can still be read/edited when over quota; new resource additions are blocked until capacity is freed or the plan changes. A downgrade does not delete records or team memberships.

`PATCH /api/plans` is a simulation for owners only when `EMAIL_MODE=preview` and the request origin is localhost/127.0.0.1/::1. It records an audit event, applies real local capacity limits, and does not activate a subscription or charge money. Public deployments reject this endpoint even if preview mode was mistakenly enabled; their plan changes require trusted administrative provisioning until a billing integration is implemented. No checkout, subscription billing, prices or payment provider are implemented.

`npm run test:plans` covers concurrent quote quotas/rollback, duplication, editing at capacity, trash recovery, downgrade preservation, catalog/reactivation, backup enforcement, reserved seats/resends/acceptance, role restrictions and business isolation. Unit tests check warning thresholds and reject plan simulation outside local preview. The permanent browser suite also verifies local plan switching; additional mobile/desktop checks exercised usage warnings and 320/390/768/1280/1920 px layouts.

### Manual activation after a P2P payment

The operator verifies the bank/wallet payment outside Quoter, then uses the business ID shown on **Plan y uso**. From `quoter`:

```sh
npm run plan:activate -- --business BUSINESS_ID --plan 2 --reference bank-transfer-123 --operator admin@example.com
```

This defaults to the local database. Only add `--remote` when administering the published Cloudflare D1 database with your own Wrangler credentials. Apply migrations on that database first. Do not share database credentials with customers. The command assigns the tier and records the operator, payment reference, timestamp and previous tier atomically. References are globally unique: repeating the same business/plan/reference is a no-op, and reusing a reference for another business or plan fails. A repeat does not undo a subsequent plan change. A new payment requires a new reference. Tests may target an isolated local database with `QUOTER_IMPORT_STATE`.

Internal tier IDs remain `gratis`, `pro`, `negocio` for migration compatibility; displayed names are Plan 1/2/3. Existing records remain accessible even above the new limits. There is no checkout, automatic payment verification or recurring charge. New businesses receive a seven-day trial, followed by read-only access unless a P2P payment has been activated. Prices still need to be defined before launch. The public API cannot activate a paid plan; the local preview switch is only a simulation.

`npm run test:activation` verifies manual assignment and audit, unique-reference conflicts, replay safety, missing businesses and downgrades against isolated local fixture accounts.

### Customer identity during JSON restore

Apply migrations through `0012_backup_customer_aliases.sql`. Restore reuses customers within the destination business by their own ID, saved source-ID aliases, or an exact match of all six fields (name, company, phone, email, tax ID, address; leading/trailing whitespace and empty optional fields are normalized). Different contact details do not match by name alone. Customers with identical complete profiles covered by the import are consolidated only after the restore confirmation; the preview reports how many existing copies will be merged. If all optional fields are empty, identical names represent identical complete profiles and will consolidate; provide distinguishing contact details for different people with the same name.

Live and trashed quotes, including quotes absent from the backup, are relinked before duplicate customer rows are removed. Persistent aliases preserve imported identities when contact data changes in a later backup. Conflicting updates to one target are rejected. Cleanup, aliases, imported rows and audit run in the same single-use restore transaction; quota failures roll everything back. Customers not matched by this backup remain untouched. Existing databases are not automatically cleaned by the migration: review and confirm a JSON restore to consolidate existing exact copies. `npm run test:customer-import` covers this regression, changed source IDs, repeated imports, updated contact data, homonyms, foreign-business matching and quote links.

### Monthly plans, trial and read-only expiry

Apply `0013_subscription_lifecycle.sql`. New businesses receive seven days from registration, using Plan 1 capacity. Existing businesses receive seven days from migration; those with a prior administrative payment activation receive a month from migration as a transition. These initial dates are applied once, not each restart or login. Historical activation rows keep unknown period dates rather than inventing their original terms.

Each **new, verified** P2P reference passed to `npm run plan:activate` immediately assigns the selected tier and adds one calendar month from the latest of now, the existing paid-through timestamp or the unexpired trial deadline. Early payments preserve unused days; late payments start from now. Calendar arithmetic uses Guatemala time (UTC-6), keeps the local time and clamps dates absent from the next month (Jan 31 → Feb 28/29). Tier changes take effect immediately; no automatic price calculation or proration is implemented. A repeated reference records no new month and does not undo later payments. The same activation command is used for renewals; use a new reference for each verified payment.

`GET /api/subscription` is available to verified members and exposes the active business's trial/active/expired state and deadline. Owner-only `/api/plans` also returns the last ten payment activation references and periods. **Plan y uso** displays validity and history. Global in-app notices show trial days, warn within seven days of paid expiry, and explain read-only mode. They refresh on navigation/focus, every minute and at the known deadline. No external reminder email is sent. An editor open at expiry retains unsaved input but disables submission.

At the exact deadline, API guards and SQLite triggers reject business mutations with HTTP 403 / `SUBSCRIPTION_EXPIRED`; no scheduled job is needed. Quote creation/edit/status/delete/duplicate, catalog/customer writes, branding, team changes, invitation acceptance into an expired destination, trash recovery and backup restoration are blocked. Queries, PDF generation, owner JSON/CSV exports, session/security actions and business switching remain available. Technical diagnostics and owner backup previews can still create internal logs or temporary preview tokens, but cannot change business content. Users cannot reset dates through plan preview, branding or backup JSON. Local plan switches change capacities only; they do not extend validity. Authenticated role permissions still apply during paid or trial access.

`npm run test:subscription` verifies trial expiry, API/database enforcement, read/export continuity, early/late renewal, receipt idempotency, calendar boundaries, invitations and backup isolation. `npm run test:subscription-ui` checks live expiry without draft loss, disabled writes, PDF/backup downloads, renewed access and 320–1920px layouts. Both require a local preview server; the UI suite also requires Chromium. Payment prices, verification and customer payment instructions are still administered outside Quoter.

### Master account and privacy-limited platform administration

Apply `0014_platform_admin.sql`. Configure the single master email through a trusted terminal, never through an application account:

```sh
npm run admin:master -- --email your-personal-address@example.com
```

This defaults to local D1. The designation can precede registration: register that address normally and verify its email to unlock **Administración** (`/admin`). No password is created by the command. An existing verified, enabled account gains the navigation entry after refreshing or signing in again. The email is stored in D1, not in tracked code or public configuration. For a published database, apply migrations there and explicitly add `--remote` with your own Wrangler credentials. A new designation replaces the previous master and revokes the previous master's sessions. There is no self-service promotion API; form flags or tenant roles never grant platform privileges. Recovery of a disabled master or changes to the master email require the trusted database operator.

The master panel supports paginated business/account lookup, enabling/disabling subscriber accounts, suspending/resuming businesses, and assigning/renewing a plan after manual P2P payment verification. It shows business ID/name/currency, subscriber account IDs and membership roles, plan capacities, verification/access status, validity dates and operational counts. Search accepts business names and IDs. It excludes subscriber email addresses, quotation customers (including their IDs), quotes, monetary values, catalog, notes, branding/contact details, documents, credentials and raw tenant backups. Administrative routes use explicit column projections and do not query customer/catalog/quote tables. Platform privileges grant no tenant membership, impersonation, private export or arbitrary SQL facility: normal tenant endpoints retain their existing membership checks.

Every administrative mutation requires the master's current password, checked against the active designation and stored password hash. Successful password confirmations reset their attempt counter; ten failed attempts lock further confirmations for 15 minutes. The UI clears the password after each action and never stores it in browser persistence. Same-origin JSON mutation protections also apply. Disabling an account revokes all its sessions and rejects login until enabled; passwords, memberships and business content are preserved. The master cannot deactivate itself through the panel. Suspending a business makes it read-only for all members with API/SQLite enforcement; reading, PDF generation and owner backups remain available. Resuming a business does not extend its billing deadline. Renewing a suspended business does not automatically unsuspend it or reactivate disabled accounts. Administration remains accessible when the master's own business is expired or suspended.

Panel payments reuse the atomic monthly activation trigger and unique receipt references; repeating the same reference never adds another month. The panel does not list previous payment references or amounts. Its central audit returns only actor/target IDs, action, timestamp, plan ID and access state. No password, receipt reference or tenant content is placed in that audit. Tenant payment audit entries identify the actor as “Administración de Quoter”; the master personal email is not disclosed to the tenant through those panel actions. Payment verification is still manual; no provider or automatic charge is introduced.

`npm run test:admin` checks authorization and handover, verified-email gating, private-field exclusions, tenant isolation, password confirmation/CSRF, account/session controls, business suspension, plan renewal/idempotency and audit. With `QUOTER_BROWSER_PATH` it also checks admin operations and layouts at 320/390/768/1280/1920 px. **Run it only against an isolated local database/server**, because it configures temporary master addresses. The runner requires `QUOTER_ADMIN_ISOLATED=1`, `QUOTER_TEST_URL` and `QUOTER_IMPORT_STATE`, and rejects the normal default state directory. Example from `quoter` (use a fresh temporary path):

```sh
npm run build
npx wrangler d1 migrations apply quoter-db --local --persist-to /tmp/quoter-admin-tests
npx wrangler dev --config dist/quoter/wrangler.json --persist-to /tmp/quoter-admin-tests --port 5184 --ip 127.0.0.1
# In another terminal; EMAIL_MODE=preview is required for local email fixtures.
QUOTER_ADMIN_ISOLATED=1 QUOTER_IMPORT_STATE=/tmp/quoter-admin-tests QUOTER_TEST_URL=http://127.0.0.1:5184 QUOTER_BROWSER_PATH=/usr/bin/chromium npm run test:admin
```

Registration requires `confirmPassword` to match `password` exactly, both in the UI and POST `/api/auth/register`; login does not require confirmation. The verified, enabled designated master receives permanent validity for its original business when it still owns it. This is a dynamic privilege, not a distant expiration date or imported billing field: changing the master removes it, and membership in other businesses does not extend their plans. Business suspension still applies, and the assigned capacity limits remain. The master starts at `/admin` after login or opening `/`; its ordinary business dashboard remains available at `/overview`.

## Security review

See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for the October 2026 findings, patches, validation and remaining risks. Apply all migrations, including `0016_atomic_request_authorization.sql`, before running the updated Worker. The review covers SQL binding, tenant isolation, password hashes, session revocation, email-token consumption, CSRF, browser headers and request-size limits. `npm run test:security` performs adversarial checks with local fixture accounts; set `QUOTER_TEST_URL` and the matching `QUOTER_IMPORT_STATE` directory. With `QUOTER_BROWSER_PATH`, use a compiled-assets server to validate CSP and PDF downloads.

## Admin second factor and launch progress

Apply migration `0017_admin_mfa.sql`, then run `npm run mfa:setup` and restart the local server. The designated verified master must enroll an authenticator before using Administration. See [ADMIN_MFA.md](ADMIN_MFA.md) for enrollment, secret handling, one-use recovery, operator reset and isolated tests. [ROADMAP.md](ROADMAP.md) records the estimated 83% launch readiness and remaining production gates. No remote deployment or real email delivery was performed in this stage.
