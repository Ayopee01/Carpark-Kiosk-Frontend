# Kiosk Frontend: Next.js standalone (node server.js)
# browser เรียก Backend ตรงที่ NEXT_PUBLIC_API_BASE_URL (เช่น https://api.<domain>) ค่าถูกฝังตอน build ต้อง build image ใหม่เมื่อเปลี่ยนค่า
# ตั้งใน .env บน server ไม่มีผล ต้องส่งเป็น build-arg (CI ใช้ GitHub Variable)

# ---------- deps ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build ----------
FROM node:24-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL
RUN test -n "$NEXT_PUBLIC_API_BASE_URL" || (echo "build-arg NEXT_PUBLIC_API_BASE_URL is required (เช่น https://api.<domain>)" && exit 1)
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
