# API + workers MalafiPro. Debian (pas Alpine) : Chromium/Playwright n'est pas supporté sur Alpine.
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
# Lockfile facultatif (monorepo : le package-lock.json est à la racine)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM base AS builder
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
 && npx playwright install --with-deps chromium \
 && rm -rf /root/.npm
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
EXPOSE 3001
# Les migrations (ajouts seulement) sont appliquées à chaque déploiement, puis le serveur démarre
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
