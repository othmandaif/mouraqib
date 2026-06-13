FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS builder
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

RUN npx playwright install chromium --with-deps

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server.js"]
