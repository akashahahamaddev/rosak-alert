FROM node:20-slim AS builder

WORKDIR /app

# Install build tools for native C++ addons (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

FROM node:20-slim

WORKDIR /app

COPY --from=builder /app /app

RUN mkdir -p uploads

EXPOSE 3000

ENV PORT=3000 \
    NODE_ENV=production

CMD ["npm", "start"]
