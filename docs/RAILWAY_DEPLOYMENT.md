# Railway deployment

Momen is two applications, not one process. Deploy the repository as two
Railway services alongside the existing Postgres service:

- `momen_enterprise`: existing storefront service, repository root `/`, using the root `Dockerfile`
- `momen-api`: root directory `/server`, using `server/Dockerfile`
- `Postgres`: the existing Railway database service

Do not point the storefront directly at Postgres. Only `momen-api` receives
`DATABASE_URL`; browsers communicate with the API over HTTPS.

## 1. API service

Create another service from the same GitHub repository, name it `momen-api`,
and set its root directory to `/server`. Railway will detect the Dockerfile in
that directory. Generate a public domain under **Settings → Networking** and
set the health-check path to `/api/health`.

Attach a persistent volume mounted at `/app/uploads`. Without this volume,
media uploaded through the CMS disappears when the container is redeployed.

Add these variables to `momen-api`. Values containing `${{...}}` are Railway
reference variables and should be entered exactly as shown. Replace the
bracketed placeholders with real values.

```dotenv
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET=[generate a unique random value of at least 32 bytes]
JWT_ACCESS_TTL=15m
CORS_ORIGIN=https://${{momen_enterprise.RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://${{momen_enterprise.RAILWAY_PUBLIC_DOMAIN}}
AUTH_COOKIE_SAME_SITE=none
PAYSTACK_SECRET_KEY=[Paystack test secret key beginning sk_test_]
PAYSTACK_CALLBACK_URL=https://${{momen_enterprise.RAILWAY_PUBLIC_DOMAIN}}/checkout/payment-callback
RESEND_API_KEY=
EMAIL_FROM=Momen <hello@example.com>
SUPPORT_EMAIL=hello@example.com
```

Notes:

- Railway supplies `PORT`; do not set it manually.
- Keep `PAYSTACK_SECRET_KEY`, `JWT_ACCESS_SECRET`, seed credentials, and email
  credentials only on the API service. Never add them to `momen_enterprise` or use a
  `NEXT_PUBLIC_` prefix.
- Use `AUTH_COOKIE_SAME_SITE=none` with separate generated Railway domains;
  both services must use HTTPS. When using your own `shop.example.com` and
  `api.example.com` domains, use `lax`. Custom domains under one shared domain
  also avoid browsers' third-party-cookie restrictions.
- Leave email variables empty only while testing. In production the API
  intentionally treats a missing email provider as degraded.

The API container runs `prisma migrate deploy` before starting NestJS. After
the first healthy deployment, create the initial administrator once from a
Railway shell:

```bash
SEED_ADMIN_EMAIL=admin@example.com \
SEED_ADMIN_PASSWORD='use-a-unique-long-password' \
node dist/prisma/seed.js
```

This seed also creates sample catalog data, delivery rules, and promotions.
Use it for the initial test deployment, then review that data before launch.
Do not run it blindly against an existing production database.

Do not save these seed credentials as long-lived service variables unless they
are still required. Remove them after the seed succeeds.

## 2. Storefront service

Use the existing GitHub service `momen_enterprise`. Keep
its root directory at `/`, generate a public domain, and set:

```dotenv
NEXT_PUBLIC_API_URL=https://${{momen-api.RAILWAY_PUBLIC_DOMAIN}}/api
```

`NEXT_PUBLIC_API_URL` is embedded into browser JavaScript during `next build`.
Changing it must trigger a new storefront deployment. The Dockerfile declares
it as a build argument so Railway can inject the service variable correctly.

The storefront requires no database URL and no Paystack key.

## 3. Paystack test configuration

Keep the Paystack account in **Test Mode** until checkout, verification, and
webhook delivery have all been exercised successfully. In Paystack's
**API Keys & Webhooks** test configuration, set:

```text
Callback URL: https://<storefront-domain>/checkout/payment-callback
Webhook URL:  https://<momen-api-domain>/api/payments/webhooks/paystack
```

The callback is for the shopper's browser. The webhook targets the API and is
verified with Paystack's `x-paystack-signature` HMAC before the application
re-verifies the transaction with Paystack.

Only the secret key is required by this integration. It initializes payments
server-side and redirects customers to Paystack's hosted checkout, so no
Paystack public key belongs in the frontend.

## 4. Verification

After both deployments are healthy:

1. Open `https://<momen-api-domain>/api/health`; it must return JSON with
   `"status":"ok"`.
2. Open `https://<momen-api-domain>/docs`; Swagger should load.
3. Open the storefront and confirm its browser requests target the public API
   domain, not `localhost:4000`.
4. Sign in at `/admin/login` using the seeded administrator.
5. Place a small order with a Paystack test card and confirm that the callback
   reaches `/checkout/payment-callback` and the order becomes paid.
6. In Paystack's webhook event history, confirm the API returned HTTP 200.
7. Redeploy `momen-api` and confirm uploaded media still exists, proving the
   `/app/uploads` volume is attached correctly.

When switching to live payments, first complete Paystack activation, replace
only `PAYSTACK_SECRET_KEY` with the `sk_live_...` value, and configure the live
callback and webhook fields separately. Run one low-value real transaction
before opening checkout to customers.
