# Momen API

NestJS + Prisma + PostgreSQL backend for the Momen storefront and admin
dashboard — one domain model, two consumers. See `../AGENTS.md` at the repo
root for the full product/domain spec this implements.

## Status

The full build sequence from `AGENTS.md` is implemented: **Auth & Users**,
**Products & Catalog**, **Orders**, **Measurement Profiles**, **Production**,
**Payments**, **Delivery**, **Promotions**, **CMS**, **Notifications**, and
**Audit Log**. Reviews, Wishlist, and a CRM-style Customers view are also in
since the schema's relations needed them.

`OrdersService.create` is fully server-computed end to end:
`deliveryFee`/`expressFee` are resolved from `DeliveryZone` data (not client
input — removed from `CreateOrderDto`), `discount` is a real number computed
from a validated `Coupon`, and a gift card can cover an order's full total
(`giftCardCode` on `CreateOrderDto`) — see "Delivery & Promotions" below.
Audit logging covers the mutation types AGENTS.md calls out by name as
"especially" important — price/stock/publish changes, refunds, measurement
edits, role changes — plus is easy to extend into any other service via
`AuditLogService.log(...)` (it's `@Global()`, injectable anywhere without an
import). Every module still has room to grow (see "Known scope cuts" at the
bottom), but nothing is a stub — every domain has a working, tested path
through it.

## Getting started

Requires **Node 20.9+** (this project was set up with Node 22) and a running
**PostgreSQL** instance.

```bash
npm install
cp .env.example .env   # if you don't already have one — see below
```

Point `DATABASE_URL` in `.env` at a real Postgres database — a few options:

- **Docker**: `docker run --name momen-db -e POSTGRES_USER=momen -e POSTGRES_PASSWORD=momen -e POSTGRES_DB=momen -p 5432:5432 -d postgres:16`
- **Postgres.app** (macOS) or any local install
- A hosted instance (Neon, Supabase, RDS, etc.)

Then:

```bash
npm run db:migrate   # applies prisma/schema.prisma, creates the database schema
npm run db:seed      # seeds roles, a super admin, measurement fields, a sample product,
                      # production/delivery/promotions data, and notification triggers+templates
                      # (the last of these isn't optional — see "Notifications" below)
npm run start:dev
```

The API listens on `http://localhost:4000/api` (prefix is `/api`), with
Swagger docs at `http://localhost:4000/docs`. Seeded super admin login is
printed by the seed script (`admin@momen.studio` / `momen-dev-2026` — **dev
only**, change immediately outside local development).

To actually take a payment in dev, set `PAYSTACK_SECRET_KEY` in `.env` to a
real Paystack **test** key (dashboard → Settings → API Keys & Webhooks) — see
"Payments" below for how the flow fits together.

## Project layout

```
prisma/schema.prisma   — the domain model (one schema, two consumers)
prisma/seed.ts          — roles, super admin, measurement fields, sample catalog
src/
  prisma/                — PrismaService (global)
  audit-log/              — actor/action/before-after logging (global)
  common/                 — guards, decorators, utils shared across modules
  auth/
    admin-auth/            — admin login/refresh/2FA/password reset
    customer-auth/         — customer signup/login/social/password reset
    rbac/                  — Role + AdminUser management
  catalog/
    products/               — full product CRUD; storefront reads only published
    categories/ collections/ tags/
    customization/          — customization groups + choices
    fabrics/ color-swatches/ size-options/   — shared libraries
  measurements/
    measurement-field-defs/ — admin-configured measurement catalog
    measurement-profiles/   — customer-owned, versioned
  orders/orders/           — order lifecycle, line items, timeline, notes
  production/
    production-staff/       — CRUD + computed activeOrders count
    production-timeline-rules/ — configurable standard/express days by scope + the resolver Orders calls
    production-queue/       — read model over Order's production fields, with overdue detection
  payments/
    payments-core.module.ts — PaymentsService + provider adapters (split out to avoid a module cycle — see its doc comment)
    providers/               — PaymentProviderAdapter interface + paystack/ implementation
    payment-provider-config/ — admin provider settings, keys always masked on read
    webhooks/                — signature-verified provider webhook endpoint
    refunds/                 — request → approve/reject → process workflow
  delivery/
    delivery-zones/          — CRUD + the checkout-time fee/timeline resolver
  promotions/
    coupons/                  — CRUD + validation/discount math + redemption ledger
    gift-cards/                — issue/balance-check/redeem, its own signed transaction ledger
  cms/
    pages/ blog/               — draft/scheduled/published content, same isEffectivelyPublished rule as products
    banners/ testimonials/ faqs/ navigation/ homepage/  — simpler CRUD, some with a public "active/visible only" read
    media/                     — local-disk upload (multer) + metadata; swap-the-storage-backend seam, see "CMS" below
  notifications/
    templates/ triggers/ log/  — EmailTemplate + NotificationTrigger CRUD, NotificationLogEntry read
    notifications.service.ts   — the one place "is event X configured to notify, on which channels" is answered
    order-notifications.listener.ts — bridges OrdersService/RefundsService/CustomerAuthService's events to it
    email-sender.service.ts    — logs instead of sending; the one thing to swap for a real provider
  customers/                — admin CRM aggregation over the above
  reviews/ wishlist/
```

Each domain is its own NestJS module (service + controller(s) + DTOs),
matching the structure in `AGENTS.md`. Storefront-facing and admin-facing
routes are split into separate controllers within the same module wherever
the read/write surface differs (e.g. `ProductsController` vs
`AdminProductsController`) — same service, same underlying tables, admin
just gets a privileged view.

## Auth model

Two independent JWT strategies (`admin-jwt`, `customer-jwt`), same access
token secret, disambiguated by a `type` claim so one token can't be replayed
as the other. Admin routes additionally run `PermissionsGuard`, which checks
`@Permissions(resource, action)` metadata against the calling admin's role
(`RolePermission` rows, flattened into a `Set<"resource:action">` at auth
time). Refresh tokens are opaque random values, stored only as a SHA-256
hash, rotated on every use. There's no global auth guard — every controller
opts into `@UseGuards(...)` explicitly; `@Public()` is documentation, not
enforcement (see the decorator's doc comment for why).

## Production

`ProductionTimelineRule` rows (scope: global/product/collection/garment/
country, each with its own standard/express day range) are resolved by
`ProductionTimelineResolverService` — most specific scope wins per line
item, an order with several items uses the slowest item's range, and a
product with no matching rule at any scope falls back to its own stored
`productionDays*` fields (so the rules table can be empty on day one without
breaking estimates). `OrdersService.create` calls this to set
`estimatedCompletion`/`productionExpectedCompletionDate` at checkout, and to
set `productionPriority` (express = 90, standard = 40 — see the constants at
the top of `orders.service.ts`) so express orders sort first in the queue.
`GET /admin/production-queue` is the derived "queue" view — no separate
queue table, it's `Order` rows in `production_queue`/`in_production`/
`quality_check`/`ready_for_dispatch` joined with staff/item info, with
`overdue` computed from `productionExpectedCompletionDate` vs now.

## Payments

Everything routes through `PaymentProviderAdapter`
(`payments/providers/payment-provider.interface.ts`) — `PaymentsService`,
`RefundsService`, and the webhook controller never call a provider's SDK or
HTTP API directly, only this interface. `PaystackProvider` is the only
implementation; adding Flutterwave/Stripe later means writing a new adapter
and registering it in `PaymentsService`'s `adapters` map, not touching
business logic.

Flow: `POST /payments/initialize` (guest or logged-in, ownership checked
either way) creates a `PaymentTransaction` row and returns Paystack's
authorization URL; the frontend redirects there. On return, `GET
/payments/verify/:reference` **and** the `POST /payments/webhooks/paystack`
webhook both call `adapter.verifyTransaction` directly with Paystack rather
than trusting the callback URL's or webhook payload's own status field —
whichever arrives first is what actually flips `Order.paymentStatus`
(`OrdersService.setPaymentStatus`, which is also what finalizes the stock
reservation into a real decrement). The webhook needs the *raw* request
body to check its HMAC signature before JSON parsing touches it — see
`rawBody: true` in `main.ts`.

Refunds are a separate `Refund` model with its own `requested → approved/
rejected → processed` states (`payments/refunds/`). `approve` is a decision;
`process` is the actual (irreversible) provider call — kept as separate
steps on purpose. Provider API keys live in `PaymentProviderConfig` for the
admin UI to manage (enable/disable, test/live, masked display — real values
never round-trip in an API response) but the actual HTTP calls in
`PaystackProvider` read from `PAYSTACK_SECRET_KEY` in the environment, not
that table — wiring the adapter to read the DB config instead is a
reasonable next step once there's a real secrets-management story, but
putting live provider secrets in a database column your own admin API can
read out is not a default you want without one.

## Delivery & Promotions

`DeliveryZonesService.quote(country, speed, subtotal)` is what
`OrdersService.create` now calls instead of trusting client-sent fees: it
matches the destination country (case-insensitively) against a
`DeliveryZone`'s `countries` list, rejects checkout outright if no active
zone covers that country or if express is requested somewhere that doesn't
offer it, and waives the standard fee (not the express upcharge) once the
subtotal clears `freeDeliveryThreshold`. The zone's day range also feeds
`estimatedDelivery` (`estimatedCompletion` + the zone's shipping days),
alongside `ProductionTimelineResolverService`'s production estimate.

Coupons: `CouponsService.validate` runs every rule a coupon can carry
(active/date window/usage limit/min order value/per-customer limit/scope)
and throws a customer-facing reason for the first one that fails — see
`coupon-validation.util.ts`'s `computeCouponDiscount`, a pure function
(no DB access) so the discount math itself is unit-tested directly rather
than through a mocked Prisma client. Scope matters for *what* gets
discounted, not just *whether* the coupon applies: a `product`- or
`collection`-scoped coupon only discounts the matching line items, not the
whole cart — a 50%-off-this-product coupon on a $100 item in a $150 cart
takes $50 off, not $75. Redemption is tracked in its own
`CouponRedemption` table (not just an incremented counter) specifically so
`perCustomerLimit` is enforceable and so a coupon's `value` can change later
without rewriting what a past order was actually charged.

Gift cards currently cover an order's *entire* total or not at all —
`Order` has a single `paymentMethod`, not a split-tender breakdown, so
`OrdersService.create` rejects a gift card that doesn't fully cover the
total rather than silently applying it as a partial, unaccounted-for
discount. A fully-covering gift card settles the order immediately at
creation (`paymentStatus: 'paid'`, stock decremented directly rather than
just reserved, `payment_confirmed` already marked complete on the
timeline) — no provider round trip needed. `GiftCardTransaction` is a
signed ledger (negative = redeemed, positive = issued), so `balance` is
always reconstructable/auditable from history rather than a bare mutable
counter. Split-tender (gift card covering *part* of an order, remainder via
provider) is the natural next step if it's wanted — it would need a new
field on `Order` to record the split, which the current schema doesn't have.

## CMS

`CMSPage`/`BlogPost` reuse the same "scheduled becomes visible the moment
`publishAt` passes" rule products/categories/collections use — see
`common/utils/publish-status.util.ts`'s `isEffectivelyPublished` (moved
there from the catalog module once CMS needed the identical logic; the one
wrinkle is that `CMSPage`/`BlogPost` name their status field `status` to
match the frontend's own type, not `publishStatus` like Product/Category/
Collection do — so the call site passes `{ publishStatus: page.status, ... }`
rather than the row directly). Homepage sections support drag-reorder via
`PATCH /admin/homepage-sections/reorder` (an ordered id array → rewritten
`sortOrder`s in one transaction), matching the frontend's page-builder UI.

Media uploads go to local disk (`uploads/`, gitignored) via multer —
filenames are never trusted from the client (path traversal, collisions),
only a fixed image/video MIME whitelist is accepted, and there's a 25MB cap.
Files are served back statically at `/uploads/*` (outside the `/api` prefix
— see `useStaticAssets` in `main.ts`). Swapping this for S3/Cloudinary later
means changing `media-storage.config.ts`'s `storage` and how `MediaAsset.url`
gets built in `media-assets.service.ts` — nothing else in the app touches
the storage backend directly. Width/height extraction for images isn't
implemented (would need an image-processing dependency like `sharp`, not
currently pulled in).

## Notifications

One fan-out point: `NotificationsService.dispatch(event, recipient,
variables)` looks up the `NotificationTrigger` row for that
`NotificationEvent`, does nothing if it's missing or disabled, otherwise
renders the matching `EmailTemplate` (`render-template.util.ts`'s
`renderTemplate` — a pure `{{token}}` substitution, unit-tested directly)
and calls `EmailSenderService.send`, which currently just logs instead of
delivering anything — the one seam to swap for SES/SendGrid/Postmark/etc.
Every attempt (including channels that aren't email, which are logged as
`queued` since in-app/SMS delivery isn't implemented) writes a
`NotificationLogEntry`, so "did this actually fire" is answerable from
`GET /admin/notification-log` without grepping application logs.

Nothing calls `dispatch` directly from business logic — `OrdersService`,
`RefundsService`, and `CustomerAuthService` emit plain domain events
(`order.created`, `order.status_changed`, `order.payment_status_changed`,
`order.clarification_requested`, `refund.processed`, `customer.created`) via
the `EventEmitter2` they already had for other purposes, and
`order-notifications.listener.ts` is the one place that maps those events to
`NotificationEvent`s and dispatches. **The seed script's `seedNotifications()`
is not optional sample data** — every `NotificationEvent` needs a trigger
row with `enabled: true` or `dispatch` silently no-ops for it; skipping the
seed (or deleting those rows) makes the whole module inert without erroring.

Building this listener surfaced a real gap in `OrdersService`: a payment
confirmed via Paystack (`PaymentsService.syncTransactionStatus` →
`setPaymentStatus(id, 'paid')`) used to only ever update `Order.paymentStatus`
— `Order.status` and the timeline stayed at `order_placed` until an admin
manually advanced them, even though payment had actually gone through. Fixed
by extracting `updateStatus`'s timeline-advancement logic into a shared
`advanceTimelineAndStatus` helper that `setPaymentStatus` now also calls
(guarded to only move forward from `order_placed`, so it can't regress an
order an admin already pushed further along) — same fix pass also caught
`updateStatus`'s timeline query having no `orderBy`, relying on undefined
Postgres row order to line up with `sortOrder`.

## Key design decisions worth knowing before extending this

- **Order line items snapshot pricing** (`OrderLineItem.productName`,
  `unitPrice`, etc.) rather than embedding a live product reference — a
  price edit after checkout never rewrites history. The API reconstructs a
  minimal `product` sub-object on read so existing frontend code reading
  `item.product.name` / `.images[0]` / `.price` keeps working.
- **Stock reservation**: placing an order increments `Product.reservedQuantity`
  (a soft hold); `setPaymentStatus(id, 'paid')` converts that into a real
  `stockQuantity` decrement, `'failed'` or `cancel()` releases the hold.
  Made-to-measure products never reserve stock (nothing to reserve).
- **`Product.stock`** (the `"in-stock"|"low-stock"|...` status) is computed
  on read from `stockQuantity`/`reservedQuantity`/`lowStockThreshold`, not
  stored — see `catalog/products/product-derived.util.ts`.
- **Pricing is fully server-resolved** — `subtotal`/`discount`/`deliveryFee`/
  `expressFee`/`total` are all computed inside `OrdersService.create` from
  live Product/Coupon/DeliveryZone data; nothing about the final charged
  amount is trusted from the client except which products/quantities/coupon
  code/gift card code were requested.
- **Enum string mapping**: Prisma enum members are valid JS identifiers
  (`made_to_measure`), but the frontend's TS unions use the original
  hyphenated/Title-Case strings (`"made-to-measure"`, `"Order Placed"`).
  Every enum in `schema.prisma` uses `@map(...)` to keep the *database* and
  *API JSON* values identical to what the frontend already expects — the
  Prisma-generated TS enum name is an internal implementation detail.

## Scripts

| Script | What it does |
|---|---|
| `npm run start:dev` | Watch mode |
| `npm run build` | `nest build` (TypeScript → `dist/`) |
| `npm run lint` | ESLint (project uses its own `.eslintrc.js` — see note below) |
| `npm test` | Unit tests (Jest) |
| `npm run test:e2e` | E2E tests — needs a real database, since `PrismaModule` connects on boot |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | `prisma db seed` |
| `npm run db:studio` | `prisma studio` — browse the database visually |

**Note on `build` vs `test` type-checking**: `nest build` uses
`tsconfig.build.json`, which excludes `*.spec.ts` — a spec file with a stale
constructor call (e.g. after adding a new constructor param to a service)
will build clean but fail `npx jest` with a real `TS2554` error. `npm run
build` passing is not enough confidence that spec files still compile; run
`npx tsc --noEmit -p tsconfig.json` (the whole project, specs included) or
just run the tests.

**Note on linting**: this directory sits inside the Next.js frontend's repo,
which has its own flat `eslint.config.mjs` one level up. ESLint's flat-config
auto-detection can pick that up instead of this project's legacy
`.eslintrc.js` depending on how it's invoked. If `npm run lint` produces
Next.js-flavored errors (e.g. "Pages directory cannot be found"), run it with
`ESLINT_USE_FLAT_CONFIG=false npm run lint` to force legacy resolution.

## Known scope cuts

Every domain from `AGENTS.md` has a working implementation, but a few things
were deliberately left for later rather than gold-plated now:

- **Split-tender gift card payment** (partial coverage, remainder via
  provider) — `Order` has a single `paymentMethod`, not a split breakdown;
  see "Delivery & Promotions" above.
- **Real email delivery** — `EmailSenderService` logs instead of sending;
  see "Notifications" above for the swap point. Password reset and the
  admin-invite flow likewise hand back a raw token today (`AdminAuthService`/
  `CustomerAuthService`/`AdminUsersService`) rather than emailing a link —
  wiring those through `NotificationsService`/a template is the natural
  next step once "email delivery" itself is real.
- **Image dimension extraction** on upload (`MediaAsset.width`/`height`
  stay unset) — needs an image-processing dependency (e.g. `sharp`) not
  currently installed.
- **Audit log coverage** is real but not exhaustive — wired into product
  price/stock/publish changes, role changes, refund approve/reject/process,
  and admin-initiated measurement profile edits (the four AGENTS.md names
  explicitly as "especially" important), plus is trivial to extend into any
  other service's mutations (`AuditLogService` is global, just inject it).
- **In-app/SMS notification channels** are accepted by `NotificationTrigger.channels`
  and logged as `queued`, but nothing actually delivers them yet — only email is real.
