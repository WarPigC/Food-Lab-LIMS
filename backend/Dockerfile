FROM node:20-alpine

# Set server timezone and install tzdata, curl for health checks, and build dependencies for native modules
RUN apk add --no-cache tzdata curl python3 make g++

WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Kolkata
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && apk del python3 make g++

# Copy application source code including runtime assets and templates
COPY . .

# Ensure non-root node user owns all application files
RUN chown -R node:node /app

USER node

EXPOSE 5000

CMD ["node", "server.js"]
