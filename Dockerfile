FROM node:20-alpine AS base
WORKDIR /app

FROM base AS builder
COPY apps/backend/package.json ./
RUN npm install
COPY apps/backend/ ./
RUN npx medusa build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/.medusa/server ./
RUN npm install --omit=dev
EXPOSE 9000
CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
