# ── Stage 1: Install ALL dependencies (for build) ──
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build the Next.js app ──
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm rebuild better-sqlite3
RUN npm run build

# ── Stage 3: Minimal runtime dependencies ──
# Next.js standalone already bundles react/next/openai/markdown/etc. into
# .next/standalone/node_modules. The ONLY modules standalone doesn't bundle
# are the ones we externalized (native addons + dynamic-import consumers).
# So we install ONLY those here — not the full production tree.
FROM node:20-alpine AS prod-deps
WORKDIR /app

RUN apk add --no-cache python3 make g++

# Hand-written minimal package.json — pin the same versions as the lockfile.
# Anything not listed here is assumed to be bundled into the standalone output.
COPY package.json package-lock.json ./
RUN node -e "const p=require('./package.json');const keep=['better-sqlite3','pdf-parse','pdf-lib','pdfjs-dist','@napi-rs/canvas','mammoth','xlsx','jszip'];const d={};for(const k of keep)d[k]=p.dependencies[k];require('fs').writeFileSync('package.json',JSON.stringify({name:'runtime',version:'1.0.0',dependencies:d},null,2));require('fs').rmSync('package-lock.json');"
RUN npm install --omit=dev --no-audit --no-fund && npm rebuild better-sqlite3

# Aggressive prune: kill docs, tests, sourcemaps, type decls, non-legacy pdfjs
# builds, pdf-parse test PDFs, and non-musl @napi-rs prebuilds.
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
           node_modules/pdfjs-dist/web \
           node_modules/pdfjs-dist/image_decoders \
           node_modules/pdf-parse/test \
           node_modules/xlsx/types \
           node_modules/xlsx/docbits \
           node_modules/xlsx/misc ; \
    find node_modules -type d \( -name test -o -name tests -o -name __tests__ -o -name docs -o -name doc -o -name example -o -name examples -o -name ".github" -o -name "coverage" -o -name "benchmark" -o -name "benchmarks" \) -prune -exec rm -rf {} + ; \
    find node_modules -type f \( -name "*.md" -o -name "*.markdown" -o -name "*.map" -o -name "LICENSE*" -o -name "CHANGELOG*" -o -name "HISTORY*" -o -name "AUTHORS*" -o -name "CONTRIBUTORS*" -o -name ".npmignore" -o -name ".eslintrc*" -o -name ".prettierrc*" -o -name "tsconfig*.json" -o -name "*.ts" ! -name "*.d.ts" \) -delete ; \
    find node_modules -type f -name "*.d.ts" -delete

# ── Stage 4: Production image ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# ── Web search (Tavily) ──
# Baked default so the image is portable to any host without extra config.
# Override at run-time with `-e TAVILY_API_KEY=...` or via compose.
ENV TAVILY_API_KEY=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

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone output — self-contained Next.js server with its own node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN mkdir -p /app/public
COPY --from=builder /app/public ./public

# Merge the minimal externalized modules into the standalone node_modules tree
COPY --from=prod-deps /app/node_modules ./node_modules

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 8090
ENV PORT=8090
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
