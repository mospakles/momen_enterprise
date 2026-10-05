# Full-stack feature audit

Audit date: 2026-10-05

This checklist is the implementation tracker for the existing storefront and
admin UI. A checked item means the complete path is backed by the API and
database, not merely that the screen renders.

## Shared platform

- [x] Browser API client with consistent errors, credentials, and session refresh
- [x] PostgreSQL migrations and opt-in first-admin seed
- [x] Secure customer and admin sessions with server-side revocation
- [x] Backend validation, throttling, security headers, CORS, request limits
- [x] Permission-aware admin navigation/actions plus server-side RBAC
- [x] API documentation and health/readiness endpoints
- [x] Production email adapter and notification log
- [x] Validated local media uploads with a storage adapter seam
- [x] Environment contract, Docker Compose, and clean-machine setup documentation

## Storefront

- [x] `/` homepage sections, categories, collections, featured products, banners,
  testimonials, and newsletter content load from persisted CMS/catalog data
- [x] Navigation and mega-menu load persisted categories, collections, and links
- [x] `/shop` search/filter/sort/availability views use persisted products
- [x] `/collections` and `/collections/[slug]` use persisted collections/products
- [x] `/product/[slug]` uses persisted product/customization/review data
- [x] `/accessories`, `/unisex`, and `/made-to-measure` use persisted catalog data
- [x] `/customize/[slug]` loads fabrics, colours, sizes, customization groups, and
  measurement definitions from the API; reference files use real upload storage
- [x] Cart remains a browser draft, while authenticated wishlist is persisted
- [x] Customer registration, login, logout, current profile, session rotation,
  password reset, and change-password are real server flows
- [x] `/account` profile, orders, addresses, wishlist, and payment history are real
- [x] `/measurements` CRUD and history are customer-owned and persisted
- [x] `/checkout` validates coupon/delivery/pricing server-side and creates an order
- [x] Card checkout redirects to Paystack; bank-transfer orders remain pending
- [x] `/checkout/confirmation` and `/orders/[id]` read persisted order state
- [x] Customer refund requests are persisted and ownership checked
- [x] `/faq`, `/journal`, `/journal/[slug]`, and `/<slug>` use published CMS data
- [x] Newsletter subscription is persisted and confirmation is sent
- [x] Contact form submissions are persisted and notify support

## Admin identity and access

- [x] `/admin/login` authenticates against hashed credentials and optional TOTP
- [x] Admin routes reject missing/expired sessions and refresh securely
- [x] Sidebar, routes, and actions respect the signed-in role
- [x] `/admin/admin-users` invite/update/disable/delete flows use the API
- [x] `/admin/roles` role/permission CRUD uses the API
- [x] First-super-admin creation is driven by environment/CLI, never hardcoded in production

## Admin sales and operations

- [x] `/admin` dashboard KPIs/charts use persisted orders/customers/catalog
- [x] `/admin/orders` list/detail/status/notes/cancel/duplicate/customization review
  and production brief operate on persisted orders
- [x] `/admin/payments` transactions and provider configuration use persisted data
- [x] `/admin/refunds` request/approve/reject/process flows use provider-backed APIs
- [x] `/admin/promotions`, `/admin/discounts`, and `/admin/coupons` use coupon CRUD
- [x] `/admin/gift-cards` issue/status/balance/history are persisted
- [x] `/admin/production` queue, calendar, staff assignment, and timeline rules persist
- [x] `/admin/delivery` zone and fee configuration persists

## Admin catalog and customers

- [x] `/admin/products` CRUD, bulk edits, publish scheduling, inventory, relations,
  SEO, media, sizing, measurement, fabric, and customization settings persist
- [x] `/admin/collections` and `/admin/categories` CRUD persist
- [x] `/admin/fabrics`, `/admin/colours`, `/admin/sizes`, and
  `/admin/customization-options` CRUD persist
- [x] `/admin/inventory` stock edits and history use server audit data
- [x] `/admin/customers` CRM status/tags/notes and aggregate detail use the API
- [x] `/admin/measurements` field definitions and customer profiles persist
- [x] `/admin/reviews` moderation/response/featured/delete flows persist
- [x] `/admin/wishlist` is computed from persisted customer wishlists

## Admin content, engagement, and administration

- [x] `/admin/homepage` section editing, visibility, and ordering persist
- [x] `/admin/media` multipart upload, metadata, filtering, and delete persist
- [x] `/admin/pages`, `/admin/navigation`, `/admin/banners`, `/admin/testimonials`,
  `/admin/faqs`, and `/admin/blog` CRUD persist
- [x] `/admin/notifications` trigger configuration and delivery logs use the API
- [x] `/admin/email-templates` CRUD, preview, and test-send use the API
- [x] `/admin/analytics` and `/admin/reports` use persisted data and protected exports
- [x] `/admin/settings` persists general, currency, tax, checkout, notification,
  integration, and production defaults
- [x] `/admin/audit-logs` reads immutable server audit records
- [x] `/admin/system-health` reports configured API/database/storage/email/provider status

## Operational follow-up

- Provision a managed object store/CDN before horizontally scaling API containers;
  local upload storage is intentionally suitable only for single-node deployments.
- Configure production Paystack, Resend, DNS, HTTPS, and `AUTH_COOKIE_SAME_SITE`
  values in the deployment environment; none of these secrets are checked in.
- Connect a first-party analytics provider if traffic/funnel metrics (sessions,
  conversion, acquisition source, or abandonment) are required. The dashboard
  intentionally reports only persisted commerce data until then.
