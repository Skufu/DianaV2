#!/usr/bin/env bash
set -euo pipefail

required_env() {
  local missing=0
  for name in "$@"; do
    if [ -z "${!name:-}" ]; then
      echo "Missing required environment variable: ${name}" >&2
      missing=1
    fi
  done
  return "${missing}"
}

compose_cmd() {
  docker compose "$@"
}

login_registry() {
  if [ -n "${REGISTRY_USERNAME:-}" ] && [ -n "${REGISTRY_PASSWORD:-}" ]; then
    printf '%s' "${REGISTRY_PASSWORD}" | docker login "${REGISTRY:-ghcr.io}" -u "${REGISTRY_USERNAME}" --password-stdin
  fi
}

container_image() {
  local container="$1"
  docker inspect "${container}" --format '{{.Config.Image}}' 2>/dev/null || true
}

write_previous_images() {
  container_image diana-backend > .previous_backend_image
  container_image diana-ml > .previous_ml_image
}

wait_for_container_health() {
  local service="$1"
  local url="$2"
  local attempts="${3:-30}"

  for attempt in $(seq 1 "${attempts}"); do
    if compose_cmd exec -T "${service}" curl -fsS "${url}" >/dev/null; then
      echo "${service} is healthy"
      return 0
    fi
    echo "Waiting for ${service} health (${attempt}/${attempts})"
    sleep 3
  done

  echo "${service} did not become healthy" >&2
  compose_cmd logs --tail=80 "${service}" >&2 || true
  return 1
}

verify_public_health() {
  if [ -z "${PUBLIC_HEALTH_URL:-}" ]; then
    return 0
  fi

  for attempt in $(seq 1 10); do
    if curl -fsS "${PUBLIC_HEALTH_URL}" >/dev/null; then
      echo "Public health check passed: ${PUBLIC_HEALTH_URL}"
      return 0
    fi
    echo "Waiting for public health (${attempt}/10)"
    sleep 3
  done

  echo "Public health check failed: ${PUBLIC_HEALTH_URL}" >&2
  return 1
}

required_env BACKEND_IMAGE ML_IMAGE IMAGE_TAG

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required" >&2
  exit 1
fi

mkdir -p logs
write_previous_images
login_registry

export DIANA_BACKEND_IMAGE="${BACKEND_IMAGE}:${IMAGE_TAG}"
export DIANA_ML_IMAGE="${ML_IMAGE}:${IMAGE_TAG}"

echo "Deploying backend image: ${DIANA_BACKEND_IMAGE}"
echo "Deploying ML image: ${DIANA_ML_IMAGE}"

compose_cmd pull backend ml-service
compose_cmd up -d --no-build --remove-orphans

wait_for_container_health ml-service http://localhost:5000/health
wait_for_container_health backend http://localhost:8080/api/v1/healthz
verify_public_health

printf '%s\n' "${DIANA_BACKEND_IMAGE}" > .current_backend_image
printf '%s\n' "${DIANA_ML_IMAGE}" > .current_ml_image

compose_cmd ps
