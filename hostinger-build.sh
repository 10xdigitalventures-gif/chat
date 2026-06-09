#!/usr/bin/env bash
set -euo pipefail

npm run install:subapps

cd tenx-api-next
npx prisma generate
npx prisma migrate deploy
node prisma/seed-all.cjs
cd ..

npm run build:hostinger

echo "✅ Hostinger build completed. Start with: npm start"
