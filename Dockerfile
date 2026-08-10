FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies required for native C++ modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

FROM node:20-alpine

WORKDIR /app

# Copy dependencies and application source
COPY --from=builder /app /app

# Create upload directory and persistent sqlite volume target
RUN mkdir -p uploads

EXPOSE 3000

ENV PORT=3000 \
    NODE_ENV=production

CMD ["npm", "start"]
