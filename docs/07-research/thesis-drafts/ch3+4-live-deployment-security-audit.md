# Chapter 3+4 Live Deployment Security Audit

Date checked: 2026-05-30

Scope: external live deployment checks for the Chapter 3+4 deployment and security claims. The audit target was the backend host `diana-v2.duckdns.org`, with the configured browser frontend origin `https://diana-v2.vercel.app`.

## Summary Verdict

The live deployment supports the manuscript's bounded security claims for public ingress, TLS availability, CORS allow-list behavior, external service-port exposure, and backend-mediated ML access. The audit does not prove runtime database TLS mode because the active database connection string and database session settings are not exposed through public endpoints.

## Live Checks

| Area | Evidence | Result |
|---|---|---|
| DNS | `diana-v2.duckdns.org` resolved to `143.198.222.21`; no AAAA record was returned | Verified target host |
| Public ports | Ports 80 and 443 accepted TCP connections; ports 22, 8080, 5000, 5001, and 5432 timed out from the external audit machine | Effective external exposure limited to HTTP/HTTPS from this vantage point |
| HTTP to HTTPS | `http://diana-v2.duckdns.org/` returned `308 Permanent Redirect` to HTTPS | Redirect verified |
| TLS certificate | HTTPS presented a Let's Encrypt E8 certificate with subject/SAN `diana-v2.duckdns.org`, valid from 2026-05-09 to 2026-08-07; OpenSSL certificate verification returned OK | TLS certificate verified |
| TLS protocols | TLS 1.2 and TLS 1.3 handshakes succeeded; local OpenSSL did not offer TLS 1.0/1.1 because those protocols are disabled client-side | Modern TLS support verified; legacy-protocol rejection should be rechecked with a dedicated scanner if required |
| Security headers | HTTPS responses included HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, and Content-Security-Policy | Header evidence present |
| Backend health | `https://diana-v2.duckdns.org/api/v1/healthz` returned HTTP 200 with `{"status":"ok"}` | Backend live |
| Production CORS | Preflight from `https://diana-v2.vercel.app` returned HTTP 204 with allow-origin and allow-credentials headers; preflight from `https://dianav2.vercel.app`, `https://diana.skufu.dev`, `https://evil.example`, and `http://localhost:4000` returned 403 or did not resolve | CORS allow-list behavior verified |
| Authenticated operations health | Admin operations health returned healthy backend, database ping, and ML health statuses | Backend, database, and ML health verified through application-level health endpoint |
| ML public exposure | Public `/ml/health`, `/ml/predict`, and `/predict` paths returned 404; direct ports 5000 and 5001 timed out | Direct public ML exposure was not observed |
| Backend-mediated ML access | Unauthenticated `/api/v1/ml/health` returned 401; authenticated `/api/v1/ml/insights/metrics` returned 200 through the backend proxy without a browser-supplied `X-API-Key` | Browser access is mediated by backend authentication; backend proxy can reach ML |
| Database public exposure | Port 5432 timed out externally; authenticated operations health reported database ping succeeded | Public DB listener not observed; DB connectivity verified |
| Database TLS mode | Public endpoints do not expose `DB_DSN` or database session settings | Not externally verifiable; requires host or managed-database console check |

## Claim-To-Evidence Review

| Manuscript Claim Type | Current Evidence | Review Outcome |
|---|---|---|
| Implemented workflow | Frontend screenshots, route/component code, backend/ML health, authenticated ML metrics proxy, and test evidence in `thesis-readiness-audit.md` | Supported as implemented prototype workflow |
| Secured ingress | Live HTTP/HTTPS behavior, TLS certificate, security headers, external port checks, CORS checks, and repository reverse-proxy configs | Supported for bounded prototype deployment claims |
| Validated model | Metrics checker, model artifacts, nested LOGO tables, leakage results, and calibration/cluster artifacts | Supported as internal NHANES validation, not external clinical validation |
| Evaluated system | Backend/ML/frontend test counts, screenshot provenance, doctor qualitative review, and deployment audit | Supported for technical evaluation and qualitative face-validity review; UAT, accessibility audit, and production load testing remain pending |
| Database TLS | Production configuration examples use `sslmode=require`, but live runtime DSN/session state was not visible externally | Do not claim live DB TLS verification until operator-level evidence is collected |

## Remaining Security Evidence Needed

- Operator-level confirmation of runtime database TLS mode, such as a redacted `DB_DSN` showing `sslmode=require` or a database-session query proving SSL is in use.
- Dedicated TLS scan if the defense committee requires explicit proof that TLS 1.0 and TLS 1.1 are refused by the server rather than unavailable from the local OpenSSL client.
- Production load testing with authenticated users, database writes, and ML calls.
- Formal security review for clinical deployment, especially browser-token storage, XSS hardening, session strategy, and route-level navigation behavior.
