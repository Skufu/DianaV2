#!/usr/bin/env bash
set -euo pipefail

compose_cmd() {
  docker compose "$@"
}

login_registry() {
  if [ -n "${REGISTRY_USERNAME:-}" ] && [ -n "${REGISTRY_PASSWORD:-}" ]; then
    printf '%s' "${REGISTRY_PASSWORD}" | docker login "${REGISTRY:-ghcr.io}" -u "${REGISTRY_USERNAME}" --password-stdin
  fi
}

read_image_file() {
  local file="$1"
  if [ -f "${file}" ]; then
    head -n 1 "${file}" | tr -d '[:space:]'
  fi
}

ensure_image_available() {
  local image="$1"
  if docker image inspect "${image}" >/dev/null 2>&1; then
    return 0
  fi
  docker pull "${image}"
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

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required" >&2
  exit 1
fi

PREVIOUS_BACKEND_IMAGE="$(read_image_file .previous_backend_image)"
PREVIOUS_ML_IMAGE="$(read_image_file .previous_ml_image)"

if [ -z "${PREVIOUS_BACKEND_IMAGE}" ] || [ -z "${PREVIOUS_ML_IMAGE}" ]; then
  echo "No previous backend/ML image record found; cannot roll back automatically" >&2
  exit 1
fi

login_registry
ensure_image_available "${PREVIOUS_BACKEND_IMAGE}"
ensure_image_available "${PREVIOUS_ML_IMAGE}"

export DIANA_BACKEND_IMAGE="${PREVIOUS_BACKEND_IMAGE}"
export DIANA_ML_IMAGE="${PREVIOUS_ML_IMAGE}"

echo "Rolling back backend image: ${DIANA_BACKEND_IMAGE}"
echo "Rolling back ML image: ${DIANA_ML_IMAGE}"

compose_cmd up -d --no-build

wait_for_container_health ml-service http://localhost:5000/health
wait_for_container_health backend http://localhost:8080/api/v1/healthz
verify_public_health

printf '%s\n' "${DIANA_BACKEND_IMAGE}" > .current_backend_image
printf '%s\n' "${DIANA_ML_IMAGE}" > .current_ml_image

compose_cmd ps
