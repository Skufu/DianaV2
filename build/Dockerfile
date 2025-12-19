#### Builder stage: compile the Go server
FROM golang:1.21-alpine AS build
WORKDIR /app

# Enable modules and avoid CGO for simpler deployment
ENV CGO_ENABLED=0 GO111MODULE=on

# Pre-cache dependencies
COPY go.* ./
RUN go mod download

# Copy source and build
COPY . .
RUN go build -o server ./cmd/server

#### Runtime stage: minimal image with certs
FROM alpine:3.19
WORKDIR /app

RUN apk add --no-cache ca-certificates
COPY --from=build /app/server /app/server

EXPOSE 8080
CMD ["/app/server"]

