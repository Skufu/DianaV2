# Frontend Dockerfile - Multi-stage build
# Stage 1: Build React app
FROM node:20-alpine3.22 AS build

WORKDIR /app

# Accept build args for environment variables
ARG VITE_API_BASE=http://localhost:8080

ENV VITE_API_BASE=$VITE_API_BASE

RUN apk add --no-cache python3 make g++

# Install the frontend workspace using the root lockfile.
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace=frontend --legacy-peer-deps

# Copy source and build
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.29-alpine3.22

RUN apk upgrade --no-cache

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
