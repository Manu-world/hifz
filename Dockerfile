# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_CONFIG_MINIMUM_RELEASE_AGE=0
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma:generate \
 && pnpm build \
 && pnpm prune --prod

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["pnpm", "start", "-H", "0.0.0.0", "-p", "3000"]
