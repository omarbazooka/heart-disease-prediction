FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN npx prisma generate

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
