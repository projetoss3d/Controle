#!/bin/sh
set -e

echo "[entrypoint] aplicando schema (prisma db push)..."
npx prisma db push --skip-generate --accept-data-loss

echo "[entrypoint] rodando seed..."
node prisma/seed.js || echo "[entrypoint] seed falhou (continuando)"

echo "[entrypoint] iniciando backend..."
exec node dist/server.js
