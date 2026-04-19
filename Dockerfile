# ── Stage 1: Install ALL dependencies (for build) ──
FROM node:20-alpine AS deps
WORKDIR /app

# Native modules need build tools to compile
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build the Next.js app ──
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Rebuild better-sqlite3 for the Alpine/Linux target used by the runtime
RUN npm rebuild better-sqlite3

RUN npm run build

# ── Stage 3: Production-only dependency tree ──
# Reinstall with --omit=dev so typescript, @types/*, tailwind, postcss, etc.
# never reach the runtime image. Also strip non-musl prebuilt binaries that
# @napi-rs/canvas ships for other platforms (darwin/win32/linux-gnu/android).
FROM node:20-alpine AS prod-deps
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm rebuild better-sqlite3

# Prune platform-specific @napi-rs/canvas packages we don't need on Alpine
# (keep only linux-*-musl variants). Also drop pdfjs-dist's non-legacy build,
# cmap/font sources we don't ship, and test/type files.
RUN set -eux; \
    for d in node_modules/@napi-rs/canvas-*; do \
      case "$d" in \
        *linux-x64-musl*|*linux-arm64-musl*) ;; \
        *) rm -rf "$d" ;; \
      esac; \
    done; \
    rm -rf node_modules/pdfjs-dist/build \
           node_modules/pdfjs-dist/lib \
           node_modules/pdfjs-dist/types \
           node_modules/pdfjs-dist/web; \
    find node_modules -type d \( -name test -o -name tests -o -name __tests__ -o -name docs -o -name example -o -name examples \) -prune -exec rm -rf {} + ; \
    find node_modules -type f \( -name "*.md" -o -name "*.ts" -o -name "*.map" -o -name "LICENSE*" -o -name "CHANGELOG*" \) -delete ; \
    find node_modules -type f -name "*.d.ts" -delete

# ── Stage 4: Production image ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output (includes a minimal node_modules for the bundle)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN mkdir -p /app/public
COPY --from=builder /app/public ./public

# Runtime-required modules that Next.js externalizes (native + dynamic imports).
# Pulled from the slim prod-deps stage, not the full builder tree.
COPY --from=prod-deps /app/node_modules ./node_modules

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 8090
ENV PORT=8090
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
