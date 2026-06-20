# TLS/SSL Deployment Guide for DianaV2

**Validation:** VAL-DP-003 - TLS/SSL Enabled  
**Last Updated:** 2026-04-02

---

## Overview

This guide documents the TLS/SSL configuration for DianaV2 production deployments. The implementation provides:

- **HTTPS enabled on all endpoints** (443 port)
- **Valid SSL certificate** (Let's Encrypt, not self-signed)
- **HTTP to HTTPS redirect** (80 → 443)
- **TLS 1.2+ only** (TLS 1.0 and 1.1 disabled)

---

## Architecture

### TLS Termination

TLS termination is handled by Nginx reverse proxy:

```
Client (HTTPS) → Nginx Proxy (443) → Backend (8080) → ML (5000)
                   ↓
              HTTP Redirect (80 → 443)
```

**Benefits:**
- Centralized certificate management
- Reduced backend load (SSL handled at edge)
- Simplified backend configuration
- Consistent security headers

### Services

| Service | Port | TLS Status |
|---------|------|------------|
| Nginx Proxy | 443 (HTTPS) | TLS Termination |
| Nginx Proxy | 80 (HTTP) | Redirect to HTTPS |
| Backend | 8080 (internal) | No TLS (proxied) |
| ML Service | 5000 (internal) | No TLS (proxied) |
| Frontend | 80 (internal) | Static files served by Nginx |
| PostgreSQL | 5432 (internal) | SSL connection optional |

---

## Files

### Configuration Files

| File | Purpose |
|------|---------|
| `frontend/nginx-ssl.conf` | Nginx configuration with TLS 1.2+, HSTS, security headers |
| `docker-compose.prod.yml` | Production compose file with TLS-enabled Nginx proxy |
| `scripts/setup-ssl.sh` | Let's Encrypt certificate setup script |
| `scripts/verify-tls.sh` | TLS verification and validation script |

### Nginx Configuration Highlights

**TLS Protocol Settings:**
```nginx
# TLS 1.2+ only (TLS 1.0 and 1.1 disabled for security)
ssl_protocols TLSv1.2 TLSv1.3;

# Strong cipher suites with forward secrecy
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...;

# HSTS header - browsers use HTTPS exclusively for 1 year
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

**HTTP to HTTPS Redirect:**
```nginx
# All HTTP requests redirect to HTTPS
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

---

## Deployment Steps

### Prerequisites

1. **Domain configured** - DNS A record pointing to server IP
2. **Ports open** - Firewall allows 80 and 443
3. **Server running** - Docker and docker-compose installed
4. **Email for Let's Encrypt** - Used for certificate registration

### Step 1: Obtain SSL Certificates

Run the SSL setup script:

```bash
# Install certbot and obtain certificate
./scripts/setup-ssl.sh \
  --domain api.diana.example.com \
  --email admin@example.com \
  --install

# For testing (staging certificate)
./scripts/setup-ssl.sh \
  --domain api.diana.example.com \
  --email admin@example.com \
  --staging
```

**Script Actions:**
- Installs certbot (if `--install` flag)
- Obtains Let's Encrypt certificate via ACME challenge
- Copies certificates to `/etc/nginx/ssl/`
- Sets up automatic renewal cron job
- Verifies TLS configuration

### Step 2: Configure Environment

Create `.env` file with production settings:

```env
# Domain (used for CORS and API URLs)
DOMAIN=api.diana.example.com

# Database (with SSL)
POSTGRES_USER=diana
POSTGRES_PASSWORD=changeme
POSTGRES_DB=diana
# DB_DSN: Optional override. Internal Compose Postgres defaults to sslmode=disable;
# use sslmode=require only for a TLS-enabled managed database.

# Authentication
JWT_SECRET=changeme

# CORS Origins (HTTPS)
CORS_ORIGINS=https://api.diana.example.com,https://diana.example.com

# ML Service
ML_API_KEY=changeme
MODEL_URL=http://ml:5000

# Frontend Build
VITE_API_BASE=https://api.diana.example.com/api/v1
```

### Step 3: Deploy with TLS

Deploy using production compose file:

```bash
# Build and deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs nginx-proxy
```

### Step 4: Verify TLS Configuration

Run the TLS verification script:

```bash
./scripts/verify-tls.sh --domain api.diana.example.com
```

**Expected Output:**
```
✅ HTTPS endpoint accessible
✅ Certificate is NOT self-signed
✅ HTTP redirects to HTTPS
✅ TLS 1.0 is DISABLED
✅ TLS 1.1 is DISABLED
✅ TLS 1.2 is ENABLED
✅ TLS 1.3 is ENABLED
✅ HSTS max-age >= 1 year
✅ ALL TLS/SSL VERIFICATIONS PASSED
VAL-DP-003: TLS/SSL Enabled - SATISFIED
```

### Step 5: External Verification

**SSL Labs Test:**
```
https://www.ssllabs.com/ssltest/analyze.html?d=api.diana.example.com
```

**Expected Grade:** A or A+ (TLS 1.2+, HSTS, no weak ciphers)

---

## Certificate Management

### Automatic Renewal

Certificates are renewed automatically via cron job:

```cron
# Daily renewal check at midnight
0 0 * * * certbot renew --quiet --post-hook 'nginx -s reload'
```

### Manual Renewal

```bash
# Check certificate status
certbot certificates

# Force renewal
certbot renew --force-renewal

# Reload nginx after renewal
nginx -s reload
# Or with Docker
docker-compose restart nginx-proxy
```

### Certificate Location

```
/etc/letsencrypt/live/<domain>/fullchain.pem  # Certificate chain
/etc/letsencrypt/live/<domain>/privkey.pem    # Private key

# Copies for Docker (if using volume mount)
/etc/nginx/ssl/fullchain.pem
/etc/nginx/ssl/privkey.pem
```

---

## Security Features

### TLS Configuration

| Feature | Status | Details |
|---------|--------|---------|
| TLS 1.0 | Disabled | Insecure, deprecated since 2020 |
| TLS 1.1 | Disabled | Insecure, deprecated since 2020 |
| TLS 1.2 | Enabled | Required minimum |
| TLS 1.3 | Enabled | Optimal performance and security |
| Cipher Suites | Strong | ECDHE + AESGCM/CHACHA20 |
| Forward Secrecy | Yes | ECDHE key exchange |

### HTTP Headers

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | HSTS - browsers use HTTPS exclusively |
| X-Frame-Options | SAMEORIGIN | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-XSS-Protection | 1; mode=block | XSS filter (legacy browsers) |
| Referrer-Policy | strict-origin-when-cross-origin | Privacy for referrer |
| Content-Security-Policy | default-src 'self' | XSS protection |

### OCSP Stapling

Enabled for improved SSL handshake performance:

```nginx
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
```

---

## Alternative: Cloud Provider TLS

### Render.com (Recommended for DianaV2)

Render provides automatic HTTPS on all web services:

1. **No configuration needed** - TLS handled by Render
2. **Automatic certificate** - Let's Encrypt via Render
3. **HTTP redirect** - Automatic
4. **TLS 1.2+** - Enforced by Render

**render.yaml** (existing):
```yaml
services:
  - type: web
    name: diana-backend
    # HTTPS automatic on *.onrender.com
    # Custom domain requires certificate in Render dashboard
```

### Vercel (Frontend)

Vercel provides automatic HTTPS for frontend:

1. Push to Vercel
2. HTTPS automatic on *.vercel.app
3. Custom domain: Add in Vercel dashboard

---

## Troubleshooting

### Certificate Errors

**Self-signed certificate warning:**
- Ensure Let's Encrypt certificate obtained (not staging)
- Check `scripts/setup-ssl.sh` ran without `--staging`

**Certificate expired:**
```bash
certbot renew --force-renewal
docker-compose restart nginx-proxy
```

**Certificate not found:**
```bash
# Check certificate location
ls /etc/letsencrypt/live/<domain>/
ls /etc/nginx/ssl/
```

### TLS Handshake Failures

**TLS 1.2 not working:**
- Check nginx configuration: `ssl_protocols TLSv1.2 TLSv1.3;`
- Verify OpenSSL version supports TLS 1.2/1.3

**Weak cipher warning:**
- Check `ssl_ciphers` in nginx-ssl.conf
- Ensure server prefers cipher order

### HTTP Not Redirecting

**HTTP still accessible:**
- Check nginx-ssl.conf has HTTP server block with `return 301`
- Verify port 80 mapped in docker-compose.prod.yml

---

## Validation Checklist

VAL-DP-003 verification:

- [ ] HTTPS enabled on all endpoints (curl -I https://<domain>/health)
- [ ] Valid SSL certificate (openssl s_client -connect <domain>:443)
- [ ] HTTP redirects to HTTPS (curl -I http://<domain>)
- [ ] TLS >= 1.2 (openssl s_client -tls1_2 -connect <domain>:443)
- [ ] TLS 1.0/1.1 disabled (openssl s_client -tls1 -connect should fail)
- [ ] HSTS header present (curl -I https://<domain>)
- [ ] SSL Labs grade A or higher

---

## References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Best Practices](https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices)

---

**Related Files:**
- `frontend/nginx-ssl.conf` - Nginx TLS configuration
- `docker-compose.prod.yml` - Production compose
- `scripts/setup-ssl.sh` - Certificate setup
- `scripts/verify-tls.sh` - TLS verification
