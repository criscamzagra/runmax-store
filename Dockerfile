FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY apps/backend/package.json ./
RUN npm install --omit=dev

FROM base AS builder
COPY apps/backend/package.json ./
RUN npm install
COPY apps/backend/ ./
RUN npx medusa build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.medusa ./.medusa
COPY apps/backend/medusa-config.ts ./medusa-config.ts
COPY apps/backend/package.json ./package.json
COPY apps/backend/src ./src
EXPOSE 9000
CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
