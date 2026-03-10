# Etapa 1: Instalar dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
# Usamos npm ci para una instalación limpia y exacta
RUN npm ci

# Etapa 2: Constructor (Builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar Prisma Client ANTES del build
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED 1
# ¡IMPORTANTE! Asegúrate de tener 'output: "standalone"' en tu next.config.js
RUN npm run build

# Etapa 3: Corredor (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
# Cloud Run requiere que el puerto sea configurable o usar el 8080 por defecto
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiamos solo lo necesario desde el output standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Si usas Prisma, necesitamos los archivos generados y el motor
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

# Exponemos el puerto que usa Cloud Run
EXPOSE 8080

# Next.js standalone se ejecuta llamando a server.js
CMD ["node", "server.js"]