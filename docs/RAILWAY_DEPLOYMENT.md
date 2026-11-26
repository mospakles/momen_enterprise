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
SEED_ADMIN_NAME='Your Name' \
node dist/prisma/seed.js
```

With `NODE_ENV=production` the seed creates only what the app needs: roles,
the administrator, measurement fields, the production timeline rule, payment
provider config, and notification triggers. It skips the sample product,
delivery zone, `WELCOME10` coupon and demo tailor. Add `SEED_SAMPLE_DATA=true`
to include them on a test deployment. Checkout needs at least one delivery
zone, so create yours in the admin panel before launch.

Re-running the seed is safe: existing rows, including the administrator, are
left unchanged. To reset the administrator's password, delete that
`AdminUser` row first.

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

## 5. Going live on momenclothing.com

Use one registrable domain for both services so session cookies are
first-party (Safari and Chrome block third-party cookies):

| Service      | Custom domain               |
|--------------|-----------------------------|
| Storefront   | `momenclothing.com` (and `www.momenclothing.com` redirecting to it) |
| API          | `api.momenclothing.com`     |

Add each custom domain under the service's **Settings → Networking**, then
create the DNS records Railway shows at your registrar (a CNAME, or ALIAS/ANAME
for the bare domain if the registrar supports it). Railway issues the HTTPS
certificates automatically once DNS resolves.

**API (`momen-api`) variables for production:**

```dotenv
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET=[openssl rand -base64 48]
JWT_ACCESS_TTL=15m
CORS_ORIGIN=https://momenclothing.com,https://www.momenclothing.com
FRONTEND_URL=https://momenclothing.com
AUTH_COOKIE_SAME_SITE=lax
TRUST_PROXY=1
PAYSTACK_SECRET_KEY=[sk_live_... once Paystack activates the account]
PAYSTACK_CALLBACK_URL=https://momenclothing.com/checkout/payment-callback
RESEND_API_KEY=[from resend.com after verifying momenclothing.com]
EMAIL_FROM=momen. <hello@momenclothing.com>
SUPPORT_EMAIL=hello@momenclothing.com
```

`TRUST_PROXY` is the number of proxies in front of the API: 1 on Railway, 2 if
Cloudflare also proxies `api.momenclothing.com`. If it is wrong, every shopper
shares one rate limit and checkout starts failing under load.

With `NODE_ENV=production` the API refuses to start if any required value is
missing or still a placeholder, and the log says which one.

**Storefront (`momen_enterprise`) variables:**

```dotenv
NEXT_PUBLIC_API_URL=https://api.momenclothing.com/api
NEXT_PUBLIC_SITE_URL=https://momenclothing.com
# Optional, faster server-side reads over Railway's private network:
API_INTERNAL_URL=http://${{momen-api.RAILWAY_PRIVATE_DOMAIN}}:${{momen-api.PORT}}/api
```

Only the service whose `NEXT_PUBLIC_SITE_URL` is exactly
`https://momenclothing.com` is opened to search engines; any staging service
serves `Disallow: /` in robots.txt. Both public variables are baked in at build
time, so redeploy after changing them.

**Paystack live mode:** set the live Callback URL to
`https://momenclothing.com/checkout/payment-callback` and the live Webhook URL
to `https://api.momenclothing.com/api/payments/webhooks/paystack`.

**Catalogue on a fresh database:** after the first deploy and the admin seed
(section 1), load the menswear range from a Railway shell on `momen-api`:

```bash
node dist/prisma/scripts/add-menswear.js
```

It also links each bespoke style (Agbada, Kaftans, Jalabia, Shirts, Trousers)
to its measurement set. Its prices are placeholders: review every price in
Admin → Products before launch.

**After going live:** submit `https://momenclothing.com/sitemap.xml` in Google
Search Console, and paste a product link into WhatsApp to confirm the preview
shows the product photo and name.
