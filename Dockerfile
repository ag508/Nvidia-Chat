# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app

# better-sqlite3 requires build tools to compile native addon
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build the Next.js app ──
FROM node:20-alpine AS builder
WORKDIR /app

# Need build tools again for npm rebuild
RUN apk add --no-cache python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Rebuild better-sqlite3 for the current Alpine/Linux target
RUN npm rebuild better-sqlite3

RUN npm run build

# ── Stage 3: Production image ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the built app (standalone output includes node_modules needed at runtime)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create the data directory for SQLite and give ownership to nextjs user
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
