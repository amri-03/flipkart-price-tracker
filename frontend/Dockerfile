# === Stage 1: Build compilation ===
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Pass the backend API URL during build time
ARG VITE_API_BASE_URL=http://localhost:5000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# === Stage 2: Serve compiled assets using Nginx ===
FROM nginx:alpine

# Copy the custom compiled static assets from Stage 1 to Nginx HTML folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
