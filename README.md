# Momen — Designed for the Man You Are

A production-quality Next.js storefront **and full admin business-operating-system**
for **Momen**, a premium African menswear house — traditional and contemporary
tailoring, made-to-measure, and a curated unisex edit.

## Brand positioning

Momen is primarily a **premium men's clothing brand**, with a smaller, clearly
curated unisex collection. The catalog is organized around:

- **Heritage** — Kaftans, Senator Wear, Agbada, Jalabia
- **Shirts** and **Pants**
- **Casual Wear** — T-shirts, polos, shorts, two-piece sets, resort wear
- **Accessories** — Footwear (Pam sandals), Belts, Bags, Caps, and other men's
  accessories, with "Complete the Look" cross-selling on product pages
- **Unisex** (`/unisex`) — a small, intentionally curated set of pieces (flagged
  per-product with `gender: "unisex"`), never the site's dominant identity

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 (custom design tokens — see `src/app/globals.css`) — a
  sophisticated masculine palette (ink, ivory, charcoal, deep brown, sand, olive,
  deep navy, burgundy, with brass as the metallic accent)
- Self-hosted variable fonts: Fraunces (display) + Manrope (body) via `@fontsource-variable`
- Client-side state via React Context, persisted to `localStorage` — structured so
  every store can be swapped for real API calls later (see "Connecting a backend")
- Zero chart/UI dependencies — the admin's tables, charts, and modals are all
  hand-built against the same design tokens as the storefront

## Getting started

Requires **Node 20.9+** (Next.js 16 requirement — check with `node -v`; run
`nvm use` if you have nvm installed, an `.nvmrc` is included).

```bash
npm install
npm run dev
```

Visit http://localhost:3000. The admin dashboard is at http://localhost:3000/admin
(redirects to `/admin/login` — demo accounts are listed on the login screen,
password `momen2026` for all of them).

## What's included

### Storefront

- **Homepage** — fully admin-controlled section list (hero, featured categories,
  new arrivals, signature collection, made-to-measure feature, how-it-works, promo
  banner, testimonials, newsletter), reorderable/hideable/editable from `/admin/homepage`
- **Mega-menu navigation** — New Arrivals · Clothing (Kaftans, Senator, Agbada,
  Jalabia, Shirts, Pants, Casual Wear) · Collections · Made-to-Measure · Accessories
  (Footwear, Belts, Bags, Caps, Other) · Unisex · About
- **Shop** (`/shop`) — filterable by category, collection, gender, size, price, and
  availability; deep-linkable via `?category=<slug>` from the mega-menu and homepage
- **Collections** (`/collections`, `/collections/[slug]`), **Unisex edit** (`/unisex`)
- **Product detail** (`/product/[slug]`) — gallery, tabs, "Complete the Look"
  cross-sell (accessory suggestions per product), and either a simple add-to-bag
  (ready-to-wear / basic made-to-measure) or a **"Customize This Design"** CTA into
  the full wizard for fully customizable pieces
- **Made-to-Measure** (`/made-to-measure`) — Step 1: choose a garment type (Kaftan,
  Senator, Agbada, Jalabia, Shirt, Pants, Two-Piece); Step 2: browse existing designs
  within it
- **Customization wizard** (`/customize/[slug]`) — the advanced MTM experience:
  **Customize** (fabric, primary/secondary/contrast colour with swatches + a native
  colour picker, style options like sleeve/collar/embroidery, standard size or
  measurements) → **Measurements** (saved profile / manual entry / guided
  illustrated flow with per-field instructions, common mistakes, and unusual-value
  warnings — skipped entirely for standard sizing) → **Preferences** ("Have
  something else in mind?" reference image upload with validation + "what should we
  take from this reference?", and a special-instructions field) → **Review** (full
  summary + live price breakdown: base + fabric + customizations) → adds a fully
  custom `CartItem` to the bag. Progress is autosaved to `localStorage` per design
  so nothing is lost switching steps or leaving the page.
- **My Measurements** (`/measurements`) — create, edit, delete multiple measurement
  profiles, with change history
- **Cart** (`/cart`), **Checkout** (`/checkout` — 5 steps) — delivery fees/timelines
  and express availability come from the admin's delivery zones, with live coupon
  validation; custom orders are flagged and priced correctly through checkout
- **Order Confirmation**, **Order Tracking** (`/orders/[id]`) with a visual timeline
- **Account** (`/account`) — overview, orders, measurements, addresses, wishlist,
  profile, payment
- **About**, **Contact**, **FAQ** (`/faq`), **Journal** (`/journal`, admin-managed
  blog), and any CMS page created in `/admin/pages` (Privacy Policy, Terms,
  Shipping/Returns policies, guides, custom landing pages) at `/<slug>`

### Admin dashboard (`/admin`)

A single-page-app style dashboard behind mock authentication + role-based access
control, covering every operational module of the business:

- **Dashboard** — revenue/order/customer/inventory KPIs, date-range filtering, and
  8 charts (revenue & orders over time, sales by collection/product, standard vs
  express, customer growth, payment status, order status)
- **Sales** — Orders (full detail, status workflow, filterable by Ready-to-Wear /
  Made-to-Measure / Custom / Accessory, a **Customization review tab** for custom
  orders walking the full approval workflow — Submitted → Under Review → Approved
  → Awaiting Customer Confirmation → Confirmed, with Request Clarification / Request
  New Measurements / Reject at each relevant step, plus a printable, consolidated
  **Production Brief** — fabric, colour, measurements, reference images, customer
  instructions, all in one place), Payments (+ provider settings), Refunds,
  Promotions, Discounts, Coupons, Gift Cards
- **Catalog** — Products (gender, product type — ready-to-wear / made-to-measure /
  customizable / accessory —, sizing mode, a sizes checklist + free-text fallback,
  an optional size chart, customization options, fabric assignment, reference-image/
  instructions toggles, measurement assignment, SEO, scheduling), Collections,
  Categories, **Fabrics** (the library the customization wizard draws from, with
  per-fabric pricing), **Colours** (the single centralized swatch library every
  product and the wizard draw primary/secondary/contrast colourways from), **Sizes**
  (the canonical, reorderable size run products check off from), **Customization
  Options** (style-level choice groups — sleeve, collar, embroidery, monogram, and
  any new group — fully admin-managed, no code changes needed to add or reprice
  one), Inventory
- **Customers** — CRM profile with orders/measurements/addresses/notes, Measurements
  (field configuration — including common mistakes, valid ranges, and an optional
  instructional video link used by the wizard's guided flow — and customer
  profiles), Reviews, Wishlist
- **Fulfillment** — Production (board, calendar, staff assignment, timeline rules),
  Delivery (zones, fees, express settings)
- **Content Management** — Homepage builder, Media Library (drag-and-drop upload),
  Pages, Navigation, Banners, Testimonials, FAQs, Blog/Journal
- **Engagement** — Notifications (event triggers), Email Templates (live preview +
  test send)
- **Insights** — Analytics, Reports (CSV export for every domain)
- **Administration** — Settings, Admin Users, Roles & Permissions (granular
  resource×action matrix), Audit Logs, System Health

Plus: collapsible grouped sidebar, global ⌘K search across orders/customers/
products/collections/coupons, breadcrumbs, notifications bell with live alerts
(low stock, overdue production, pending refunds).

## Admin ↔ storefront connection

The dashboard isn't a mock — it's the storefront's data source. Both read from the
same `AdminStoreProvider` context (`src/lib/admin/store.tsx`), which wraps the whole
app in `src/app/layout.tsx`. Concretely:

- Editing a product's price/images/stock/gender/publish status in `/admin/products`
  changes the shop, product page, and homepage immediately.
- Toggling a product's "Customizable" flag switches it between the simple add-to-bag
  flow and the full Made-to-Measure wizard on the storefront.
- Adding/pricing a fabric in `/admin/fabrics` makes it selectable (with that price)
  in the customization wizard for every product it's assigned to.
- Adding a colour in `/admin/colours` or a size in `/admin/sizes` makes it
  selectable everywhere that library is used — no product needs its own copy.
- Adding, repricing, or retiring a style option in `/admin/customization-options`
  changes what customers can choose (and what it costs) in the wizard immediately,
  with no code change.
- Submitting a custom order (reference images and/or special instructions) puts it
  through the Custom Order Approval Workflow in `/admin/orders`; requesting
  clarification notifies the customer and surfaces a banner + confirmation button
  on their order tracking page; the order's timeline picks up a "Customization
  Review" stage automatically, and the same order is one click from a printable
  Production Brief.
- Unpublishing a product or collection removes it from the storefront.
- Reordering/hiding/editing homepage sections in `/admin/homepage` changes the
  homepage.
- Editing delivery zones or production settings changes checkout's fees and
  estimated timelines.
- Editing measurement fields in `/admin/measurements` changes the measurement
  capture form and the wizard's guided flow (globally and per-product, via each
  product's override).
- Publishing a CMS page, FAQ, or blog post in the CMS modules makes it live at its
  storefront route.
- Admin mutations are logged to the Audit Log with actor/action/before/after.

## Connecting a real backend

Every store follows the same pattern: seed from a constant, hydrate from
`localStorage` on mount, persist on change, expose actions through a context hook.
To connect a real API:

1. `src/lib/admin/store.tsx` — replace each `usePersistentState(key, seed)` call
   with a query/mutation (e.g. React Query); the `useAdminStore()` public surface
   (and therefore every admin page and storefront consumer) doesn't need to change.
2. `src/lib/orders-context.tsx`, `cart-context.tsx`, `measurement-context.tsx` —
   same pattern for orders/cart/measurements.
3. `src/lib/admin/auth-context.tsx` — replace `login()`'s plaintext check against
   seed `AdminUser.demoPassword` with a real auth API; this is clearly marked as
   demo-only and is the one thing in this codebase that must never ship as-is.
4. Checkout's payment step is a UI shell only — plug in your payment provider at
   the "Place Order" handler in `src/app/checkout/page.tsx`; provider credentials
   are already modeled (masked) in `/admin/payments`.
5. Reference images in the customization wizard are stored as `data:` URIs client-
   side (capped at ~1.8MB/file) for the demo — swap `FileReader.readAsDataURL` in
   `src/app/customize/[slug]/page.tsx` for a real upload endpoint.

## Notes

- Product photography uses deterministic placeholder images (`picsum.photos`) —
  swap the URLs in `mock-data.ts` / the Media Library for real editorial menswear
  photography.
- Currency formatting assumes NGN throughout (`src/lib/format.ts`).
- Demo admin credentials are intentionally insecure (plaintext, client-side) — see
  the disclaimer on `/admin/login`.
