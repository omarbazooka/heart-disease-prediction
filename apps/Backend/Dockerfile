FROM node:22-bookworm-slim

WORKDIR /app

# Prisma requires OpenSSL at runtime; ca-certificates keeps TLS connections
# to Neon and external APIs reliable inside the slim image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN npx prisma generate

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
