FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY gateway/package*.json ./
COPY gateway/tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code and shared modules
COPY gateway/src/ ./src/
COPY shared/ ./shared/

# Build the application
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY gateway/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health/live || exit 1

# Start the application
CMD ["node", "dist/src/main.js"]

