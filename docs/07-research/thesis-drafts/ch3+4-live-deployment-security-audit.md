# Chapter 3+4 Live Deployment Security Audit

Date checked: 2026-05-30

Scope: external live deployment checks for the Chapter 3+4 deployment and security claims. The audit target was the backend host `diana-v2.duckdns.org`, with the configured browser frontend origin `https://diana-v2.vercel.app`. Operator-level VPS checks were completed over Tailscale SSH, with the final post-remediation verification recorded at 2026-05-29 21:43:16 UTC.

## Summary Verdict

The live deployment supports the manuscript's bounded security claims for public ingress, TLS availability, CORS allow-list behavior, host firewall posture, external service-port exposure, database TLS, backend-mediated ML access, and ML API-key enforcement. Sensitive values were not printed during the audit; only configuration state, status codes, and redacted connection facts were recorded.

## Live Checks

| Area | Evidence | Result |
|---|---|---|
| DNS | `diana-v2.duckdns.org` resolved to `143.198.222.21`; no AAAA record was returned | Verified target host |
| Public ports | Ports 80 and 443 accepted TCP connections; ports 22, 8080, 5000, 5001, and 5432 timed out from local and GitHub Actions external audit machines | Effective external exposure limited to HTTP/HTTPS from these vantage points |
| Host firewall and listeners | Operator audit over Tailscale SSH showed UFW active with default incoming deny, outgoing allow, routed deny; SSH allowed only from `100.64.0.0/10`; Docker published Caddy on 80/443 while backend 8080 and ML 5000 were exposed only to the Docker network | Host firewall and listener posture verified |
| HTTP to HTTPS | `http://diana-v2.duckdns.org/` returned `308 Permanent Redirect` to HTTPS | Redirect verified |
| TLS certificate | HTTPS presented a Let's Encrypt E8 certificate with subject/SAN `diana-v2.duckdns.org`, valid from 2026-05-09 to 2026-08-07; OpenSSL certificate verification returned OK | TLS certificate verified |
| TLS protocols | TLS 1.2 and TLS 1.3 handshakes succeeded; local OpenSSL did not offer TLS 1.0/1.1 because those protocols are disabled client-side | Modern TLS support verified; legacy-protocol rejection should be rechecked with a dedicated scanner if required |
| Security headers | HTTPS responses included HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, and Content-Security-Policy | Header evidence present |
| Backend health | `https://diana-v2.duckdns.org/api/v1/healthz` returned HTTP 200 with `{"status":"ok"}` | Backend live |
| Production CORS | Preflight from `https://diana-v2.vercel.app` returned HTTP 204 with allow-origin and allow-credentials headers; preflight from `https://dianav2.vercel.app`, `https://diana.skufu.dev`, `https://evil.example`, and `http://localhost:4000` returned 403 or did not resolve | CORS allow-list behavior verified |
| Authenticated operations health | Admin operations health returned healthy backend, database ping, and ML health statuses | Backend, database, and ML health verified through application-level health endpoint |
| ML public exposure | Public `/ml/health`, `/ml/predict`, and `/predict` paths returned 404; direct ports 5000 and 5001 timed out | Direct public ML exposure was not observed |
| Backend-mediated ML access | Unauthenticated `/api/v1/ml/health` returned 401; authenticated `/api/v1/ml/insights/metrics` returned 200 through the backend proxy without a browser-supplied `X-API-Key` | Browser access is mediated by backend authentication; backend proxy can reach ML |
| ML API-key runtime state | Initial live logs showed `ML_API_KEY` was not configured. The VPS `.env` and compose configuration were corrected, backend and ML containers were recreated, both containers reported `ML_API_KEY` configured, and direct internal no-key and fake-key requests to `/insights/metrics` returned 401 | Live ML-service API-key enforcement verified after operational remediation |
| Database public exposure | Port 5432 timed out externally; authenticated operations health reported database ping succeeded | Public DB listener not observed; DB connectivity verified |
| Database TLS mode | Operator audit showed the backend DSN uses `sslmode=require` against Neon; a redacted `psql \conninfo` check using the same DSN reported a TLSv1.3 connection with cipher `TLS_AES_256_GCM_SHA384` | Runtime database TLS verified for the configured backend DSN |
| Remote operator audit attempt | Manual GitHub Actions run `26663133943` repeated the external checks successfully; its remote host step returned `REMOTE_AUDIT=skipped_missing_deploy_ssh_secrets` | No direct host firewall, container environment, or database-session evidence was collected through Actions |
| Direct operator audit path | Tailscale SSH to the VPS succeeded; final redacted operator summary showed UFW active, Docker publishing only Caddy on 80/443, backend/ML internal container ports only, `DB_DSN_SSLMODE=require`, TLSv1.3 database connection, and ML no-key/fake-key status 401 | Operator-level evidence collected successfully outside GitHub Actions |

## Claim-To-Evidence Review

| Manuscript Claim Type | Current Evidence | Review Outcome |
|---|---|---|
| Implemented workflow | Frontend screenshots, route/component code, backend/ML health, authenticated ML metrics proxy, and test evidence in `thesis-readiness-audit.md` | Supported as implemented prototype workflow |
| Secured ingress | Live HTTP/HTTPS behavior, TLS certificate, security headers, external port checks, CORS checks, UFW status, Docker published-port inventory, and repository reverse-proxy configs | Supported for bounded prototype deployment claims |
| Validated model | Metrics checker, model artifacts, nested LOGO tables, leakage results, and calibration/cluster artifacts | Supported as internal NHANES validation, not external clinical validation |
| Evaluated system | Backend/ML/frontend test counts, screenshot provenance, doctor qualitative review, and deployment audit | Supported for technical evaluation and qualitative face-validity review; UAT, accessibility audit, and production load testing remain pending |
| Database TLS | Backend runtime DSN reports `sslmode=require`; redacted `psql \conninfo` against the same DSN reports TLSv1.3 | Supported for the active backend database connection string |
| ML API-key enforcement | Backend and ML containers report `ML_API_KEY` configured; direct internal ML no-key and fake-key requests return 401; authenticated backend proxy requests return 200 | Supported for the current live deployment |

## Remaining Security Evidence Needed

- Dedicated TLS scan if the defense committee requires explicit proof that TLS 1.0 and TLS 1.1 are refused by the server rather than unavailable from the local OpenSSL client.
- Production load testing with authenticated users, database writes, and ML calls.
- Formal security review for clinical deployment, especially browser-token storage, XSS hardening, session strategy, and route-level navigation behavior.
