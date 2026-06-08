#!/usr/bin/env bash
set -euo pipefail

npm run install:all

cd tenx-api-next
npx prisma generate
npx prisma migrate deploy
cd ..

npm run build:hostinger

echo "✅ Hostinger build completed. Start with: npm start"
