# Frontend Dockerfile - Multi-stage build
# Stage 1: Build React app
FROM node:20-alpine AS build

WORKDIR /app

# Accept build args for environment variables
ARG VITE_API_BASE=http://localhost:8080
ARG VITE_ML_BASE=http://localhost:5000

ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_ML_BASE=$VITE_ML_BASE

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
