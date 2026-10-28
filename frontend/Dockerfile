# Stage 1: Build React SPA using Node 20 on Alpine
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci

# Copy frontend source code
COPY . .

# Bake in empty VITE_API_URL so requests use relative URLs (/api/...)
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

# Build static production assets into dist/
RUN npm run build

# Stage 2: Serve static files with Nginx Alpine
FROM nginx:alpine

# Remove default static files
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
