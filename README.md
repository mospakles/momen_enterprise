# Momen

Momen is a full-stack made-to-measure commerce platform: a Next.js 16 storefront and a NestJS/Prisma/PostgreSQL API with a permissioned admin portal.

## What is implemented

- Customer accounts: sign-up, login/logout, cookie sessions with refresh rotation, profile and password changes, password reset, saved addresses, measurements, wishlist, and order history.
- Commerce: catalog, customizable made-to-measure orders, server-side prices/coupons/delivery quotes, stock reservation, gift cards, bank transfer orders, and Paystack checkout/verification/webhooks.
- Admin: role/permission enforcement, catalog, inventory, customers, orders, production, delivery zones, promotions, refunds, payment-provider configuration, CMS, media uploads, notification rules, audit logs, and health checks.
- Platform services: PostgreSQL migration, Swagger at `/docs`, uploaded media at `/uploads`, Resend-compatible email delivery, and a Docker Compose development stack.

The implementation inventory and outstanding operational follow-ups are tracked in [docs/FULL_STACK_AUDIT.md](docs/FULL_STACK_AUDIT.md).

## Requirements

- Node 20.9+ (the repo includes `.nvmrc`; Node 22 is recommended)
- PostgreSQL 16+ or Docker

## Local setup

```bash
cp .env.example .env.local
cp server/.env.example server/.env
npm install
npm --prefix server install
```

Set a unique `JWT_ACCESS_SECRET`, database URL, and initial admin credentials in `server/.env`. The seed command intentionally refuses to create an administrator without `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

```bash
cd server
npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

In another terminal:

```bash
npm run dev
```

The storefront is available at `http://localhost:3000`, the admin login at `http://localhost:3000/admin/login`, the API at `http://localhost:4000/api`, and Swagger at `http://localhost:4000/docs`. Sign in to the admin with the `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` values used when running the seed command.

## Docker

Set `JWT_ACCESS_SECRET` in your shell, then run:

```bash
docker compose up --build
```

This starts Postgres, the API, and the storefront. Run the initial seed once after the API is healthy, providing the seed variables explicitly:

```bash
docker compose exec -e SEED_ADMIN_EMAIL=admin@example.com -e SEED_ADMIN_PASSWORD='use-a-unique-password' api npm run db:seed
```

## Production configuration

Configure the API environment variables from [server/.env.example](server/.env.example), particularly `DATABASE_URL`, `JWT_ACCESS_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, `AUTH_COOKIE_SAME_SITE`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_CALLBACK_URL`, `RESEND_API_KEY`, and `EMAIL_FROM`.

For a cross-site frontend/API deployment, HTTPS is mandatory and `AUTH_COOKIE_SAME_SITE=none`; otherwise use `lax`. Configure Paystack’s callback URL to `/checkout/payment-callback` and its webhook URL to `/api/payments/webhooks/paystack`.

`NEXT_PUBLIC_API_URL` is a browser-visible build-time setting; set it to the public API base ending in `/api` before building the frontend.

## Verification

```bash
nvm use
npx tsc --noEmit
npm --prefix server run build
npm run build -- --webpack
```

The webpack build option is useful in restricted local environments where Turbopack cannot create its CSS worker port.
