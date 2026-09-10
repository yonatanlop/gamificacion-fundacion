#!/bin/sh
set -e

echo "[entrypoint] Sincronizando esquema de base de datos (prisma db push)..."
npx prisma db push --skip-generate

echo "[entrypoint] Ejecutando seed (idempotente)..."
node prisma/seed.js || echo "[entrypoint] seed terminó con advertencias (se continúa)."

echo "[entrypoint] Iniciando API..."
exec node src/index.js
