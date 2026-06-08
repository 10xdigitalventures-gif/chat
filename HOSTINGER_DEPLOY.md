# Hostinger One-Build Deployment

This repo runs as one Hostinger Node.js app:

- `/api/*` -> Next.js backend
- `/admin/*` -> Admin portal
- `/consultant/*` -> Consultant portal
- `/user/*` -> User portal
- `/` -> redirects to `/user/`

## Hostinger settings

Startup file:

```text
hostinger-server.js
```

Start command:

```bash
npm start
```

Build command:

```bash
bash hostinger-build.sh
```

## Required environment variables

```env
NODE_ENV=production
DATABASE_URL="file:./prod.db"
JWT_SECRET="CHANGE_THIS_TO_A_LONG_RANDOM_32_PLUS_CHAR_SECRET"
NEXTAUTH_SECRET="CHANGE_THIS_TO_A_LONG_RANDOM_32_PLUS_CHAR_SECRET"
NEXT_PUBLIC_URL="https://YOUR_DOMAIN.com"
STRIPE_SECRET_KEY="sk_test_or_live_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
```

## Manual build

```bash
npm run install:all
cd tenx-api-next
npx prisma migrate deploy
cd ..
npm run build:hostinger
```

## Start

```bash
npm start
```

URLs:

```text
https://YOUR_DOMAIN.com/user/
https://YOUR_DOMAIN.com/admin/
https://YOUR_DOMAIN.com/consultant/
https://YOUR_DOMAIN.com/api/...
```
