# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
# Prisma necesita openssl en Alpine
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY prisma ./prisma
RUN npx prisma generate

FROM base AS runtime
ENV NODE_ENV=production
# node_modules de producción + cliente Prisma generado
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY . .
RUN chmod +x docker-entrypoint.sh \
  && mkdir -p /data/uploads \
  && chown -R node:node /app /data
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["./docker-entrypoint.sh"]
