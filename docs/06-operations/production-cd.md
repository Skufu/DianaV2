# DianaV2 Production CD

This is the current production deployment model:

- Vercel serves the React frontend from `frontend/`.
- The VPS serves only the Go backend, Python ML service, and Caddy.
- NeonDB is the production database through `DATABASE_URL`.
- The repository root `docker-compose.yml` and `docker-compose.prod.yml` are not the production VPS stack.

## Source Of Truth

| Area | Source |
| --- | --- |
| Frontend deploy | Vercel Git integration on `main`, using `frontend/vercel.json` |
| Backend image | `.github/workflows/cd.yml` builds `ghcr.io/skufu/diana-backend:sha-<commit>` |
| ML image | `.github/workflows/cd.yml` builds `ghcr.io/skufu/diana-ml:sha-<commit>` |
| VPS compose | `deployment/vps/docker-compose.yml` |
| Reverse proxy | `deployment/Caddyfile` |
| Deploy script | `deployment/vps/deploy-images.sh` |
| Rollback script | `deployment/vps/rollback-images.sh` |

## GitHub Configuration

Create these repository secrets before enabling production deploys:

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | Tailscale DNS name or Tailscale IP for the VPS |
| `DEPLOY_USER` | SSH user, currently `root` |
| `DEPLOY_SSH_KEY` | Private SSH key allowed to access the VPS over Tailscale |
| `TAILSCALE_AUTHKEY` | Reusable, ephemeral, pre-approved auth key for the GitHub runner |
| `REGISTRY_USERNAME` | GitHub user or bot account with GHCR read access |
| `REGISTRY_PASSWORD` | Fine-grained PAT or classic PAT with package read access |

The workflow uses `GITHUB_TOKEN` to push images from GitHub Actions to GHCR. The separate registry username/password are for the VPS to pull those images.

Production deploys use the `Production` GitHub Environment. Current expected rules:

1. Required reviewer: `Skufu`.
2. Custom deployment branch/tag policies: `main` and `v*`.
3. Environment secrets remain empty unless a value must differ from repository secrets.

## VPS Requirements

The VPS directory is `/opt/dianav2`. It must keep its existing sensitive `.env` file. The CD workflow copies only compose, Caddy, and deployment scripts; it does not overwrite `.env`.

Required `.env` keys on the VPS:

```bash
DATABASE_URL=postgres://...
JWT_SECRET=...
ML_API_KEY=...
CORS_ALLOWED_ORIGINS=https://diana-v2.vercel.app
```

Optional but supported:

```bash
MODEL_VERSION=binary_v2_no_bp
DIANA_LOG_MAX_BYTES=5242880
DIANA_LOG_MAX_BACKUPS=3
RATE_LIMIT_PER_MINUTE=600
METRICS_TOKEN=...
ENABLE_SWAGGER=false
TRUSTED_PROXIES=172.16.0.0/12
```

The host must have Docker Compose v2 and Caddy data volumes should be left intact.

The ML service also depends on model artifacts stored on the VPS, not baked into the application image:

```text
/opt/dianav2/models/binary_v2_no_bp/
```

That directory must include `model_hashes.json` because production ML startup enforces SHA256 integrity checks before loading `.joblib` artifacts. Generate it after placing or updating model files. From a DianaV2 repo checkout with the same `models/binary_v2_no_bp/` layout:

```bash
python3 scripts/dev/generate-model-hashes.py
```

Then copy the generated `model_hashes.json` alongside the production model files. If the helper script is not present where the VPS model files live, generate the same JSON from the current files before deploying. `deploy-images.sh` checks for the directory and hash file before restarting containers so a missing model mount does not take production down.

## Deploy Flow

On a matching push to `main`, or on a `v*` tag:

1. Build the backend image from `build/Dockerfile`.
2. Build the ML image from `Ian_ML/Dockerfile`.
3. Push immutable `sha-<commit>` tags to GHCR.
4. Join the tailnet with the Tailscale GitHub Action.
5. Copy `deployment/vps/docker-compose.yml`, `deployment/Caddyfile`, and the deploy scripts to `/opt/dianav2`.
6. Pull the exact immutable image tags on the VPS.
7. Restart Caddy, backend, and ML through Docker Compose.
8. Verify ML `/health`, backend `/api/v1/healthz`, and public backend health.

Frontend deploys are intentionally separate. Vercel rebuilds the SPA from `main`; no frontend Docker image is built or deployed by this workflow.

## Rollback

Before a deploy, `deploy-images.sh` records the currently running images:

```text
/opt/dianav2/.previous_backend_image
/opt/dianav2/.previous_ml_image
```

If the deploy step fails, GitHub Actions runs `rollback-images.sh` automatically. To roll back manually:

```bash
ssh hermes-vps
cd /opt/dianav2
./rollback-images.sh
```

Rollback is image-based. It no longer depends on rebuilding old source on the 2GB droplet.

## Do Not Use For Production

Do not copy these files to `/opt/dianav2` as the production stack:

- `docker-compose.yml`
- `docker-compose.prod.yml`
- `frontend/nginx-ssl.conf`

Those files describe a different stack with a frontend container, Nginx TLS, Certbot, and local Postgres. Production currently uses Vercel, Caddy, backend, ML, and NeonDB.
