FROM node:20-bookworm-slim AS base
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM base AS builder
# Valeurs lues AU BUILD par Next.js (redéployer après modification)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CONTACT_TEL=+212607167594
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_CONTACT_TEL=$NEXT_PUBLIC_CONTACT_TEL NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
