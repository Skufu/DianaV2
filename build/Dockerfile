#### Builder stage: compile the Go server
FROM golang:1.21-alpine AS build
WORKDIR /app

# Enable modules and avoid CGO for simpler deployment
ENV CGO_ENABLED=0 GO111MODULE=on

# Pre-cache dependencies - copy from backend directory
COPY backend/go.* ./backend/
WORKDIR /app/backend
RUN go mod download

# Copy backend source and build
WORKDIR /app
COPY backend/ ./backend/
WORKDIR /app/backend
RUN go build -o /app/server ./cmd/server

#### Runtime stage: minimal image with certs
FROM alpine:3.19
WORKDIR /app

RUN apk add --no-cache ca-certificates curl

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/server /app/server

# Set ownership and switch to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/healthz || exit 1

EXPOSE 8080
CMD ["/app/server"]
