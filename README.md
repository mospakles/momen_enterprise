# Momen storefront

Next.js storefront and admin dashboard for Momen. The separate `momen-api` repository owns the NestJS API, PostgreSQL schema, and uploaded media. The storefront connects to it over HTTP.

## Local development

Use the Node version in `.nvmrc`. Start the API from `momen-api` and follow its README to set up PostgreSQL and the initial administrator. Then run these commands here:

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` for the storefront or `http://localhost:3000/admin/login` for the admin dashboard. The example connects to `http://localhost:4000/api`. Sign in with the administrator credentials used when seeding the API.

## Deployment

Set `NEXT_PUBLIC_API_URL` before building, including the `/api` suffix. Set `NEXT_PUBLIC_SITE_URL` to the storefront's public origin for canonical links and search indexing. In production, these values are `https://api.momenclothing.com/api` and `https://momenclothing.com` once those domains are configured. Only the API needs database, Paystack, JWT, or Resend credentials.

For a standalone Docker deployment, put the public variables in your shell or in Compose's `.env` and run `docker compose up --build`. If the frontend container and the API use a private network, `API_INTERNAL_URL` can point server-side catalogue reads to the API on that network.

## Campaign data

`src/lib/campaign-range.ts` supplies the editorial catalogue and lookbook. The API keeps a matching copy at `prisma/campaign-range.ts` for its import script. Update both files when campaign slugs, prices, or image assignments change. Live pricing and availability come from the API.

## Verification

```bash
npx tsc --noEmit
npm run build -- --webpack
```

See [the feature audit](docs/FULL_STACK_AUDIT.md) for storefront and API coverage.
