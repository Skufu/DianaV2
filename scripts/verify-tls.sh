#!/bin/bash
# TLS/SSL Verification Script for DianaV2 Production Deployment
# Validates VAL-DP-003: TLS/SSL Enabled
#
# Usage:
#   ./scripts/verify-tls.sh --domain api.diana.example.com
#
# Checks:
#   - HTTPS enabled on all endpoints
#   - Valid SSL certificate (not self-signed)
#   - HTTP redirects to HTTPS
#   - TLS version >= 1.2

set -e

# Parse arguments
DOMAIN=""
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 --domain <domain> [--verbose]"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$DOMAIN" ]]; then
    echo "Error: --domain is required"
    exit 1
fi

echo "=========================================="
echo "DianaV2 TLS/SSL Verification"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=========================================="

PASS_COUNT=0
FAIL_COUNT=0

# Function to log result
log_result() {
    local status="$1"
    local message="$2"
    
    if [[ "$status" == "PASS" ]]; then
        echo "✅ $message"
        ((PASS_COUNT++))
    elif [[ "$status" == "FAIL" ]]; then
        echo "❌ $message"
        ((FAIL_COUNT++))
    else
        echo "⚠️  $message"
    fi
}

# ==========================================
# Check 1: HTTPS Enabled
# ==========================================
echo ""
echo "=== Check 1: HTTPS Enabled ==="

HTTPS_RESPONSE=$(curl -sI "https://$DOMAIN" --connect-timeout 10 2>&1)
HTTPS_STATUS=$(echo "$HTTPS_RESPONSE" | head -1 | grep -oE "HTTP/[0-9.]+ [0-9]+" || echo "FAILED")

if echo "$HTTPS_STATUS" | grep -q "HTTP/[0-9.]+ 200\|HTTP/[0-9.]+ 301\|HTTP/[0-9.]+ 302"; then
    log_result "PASS" "HTTPS endpoint accessible (Status: $(echo "$HTTPS_STATUS" | grep -oE "[0-9]+"))"
else
    log_result "FAIL" "HTTPS endpoint not accessible (Response: $HTTPS_STATUS)"
fi

if [[ "$VERBOSE" == true ]]; then
    echo "HTTPS Response Headers:"
    echo "$HTTPS_RESPONSE" | head -10
fi

# ==========================================
# Check 2: Valid SSL Certificate (Not Self-Signed)
# ==========================================
echo ""
echo "=== Check 2: Valid SSL Certificate ==="

CERT_INFO=$(openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>&1 | openssl x509 -noout -issuer -subject -dates 2>&1)

if echo "$CERT_INFO" | grep -q "issuer"; then
    CERT_ISSUER=$(echo "$CERT_INFO" | grep "issuer=" | sed 's/issuer=//')
    CERT_SUBJECT=$(echo "$CERT_INFO" | grep "subject=" | sed 's/subject=//')
    CERT_EXPIRY=$(echo "$CERT_INFO" | grep "notAfter=" | sed 's/notAfter=/Not After: /')
    
    echo "Issuer: $CERT_ISSUER"
    echo "Subject: $CERT_SUBJECT"
    echo "Expiry: $CERT_EXPIRY"
    
    # Check if self-signed (issuer matches subject)
    if [[ "$CERT_ISSUER" == "$CERT_SUBJECT" ]]; then
        log_result "FAIL" "Certificate is self-signed (issuer matches subject)"
    else
        log_result "PASS" "Certificate is NOT self-signed (issuer differs from subject)"
        
        # Check for Let's Encrypt or known CA
        if echo "$CERT_ISSUER" | grep -qi "Let's Encrypt\|DigiCert\|GlobalSign\|Cloudflare\|Amazon"; then
            log_result "PASS" "Certificate issued by recognized CA ($CERT_ISSUER)"
        fi
    fi
    
    # Check certificate expiry
    CERT_EXPIRY_DATE=$(echo "$CERT_INFO" | grep "notAfter=" | sed 's/notAfter=/')
    EXPIRY_SECONDS=$(date -d "$CERT_EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$CERT_EXPIRY_DATE" +%s 2>/dev/null)
    CURRENT_SECONDS=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_SECONDS - $CURRENT_SECONDS) / 86400 ))
    
    if [[ $DAYS_UNTIL_EXPIPY -lt 0 ]]; then
        log_result "FAIL" "Certificate has EXPIRED"
    elif [[ $DAYS_UNTIL_EXPIPY -lt 7 ]]; then
        log_result "WARN" "Certificate expires in less than 7 days ($DAYS_UNTIL_EXPIPY days)"
    elif [[ $DAYS_UNTIL_EXPIPY -lt 30 ]]; then
        log_result "WARN" "Certificate expires in less than 30 days ($DAYS_UNTIL_EXPIPY days)"
    else
        log_result "PASS" "Certificate valid for $DAYS_UNTIL_EXPIPY days"
    fi
else
    log_result "FAIL" "Could not retrieve certificate information"
fi

# ==========================================
# Check 3: HTTP Redirects to HTTPS
# ==========================================
echo ""
echo "=== Check 3: HTTP to HTTPS Redirect ==="

HTTP_RESPONSE=$(curl -sI "http://$DOMAIN" --connect-timeout 10 -L --max-redirs 1 2>&1)
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | head -1 | grep -oE "HTTP/[0-9.]+ [0-9]+" || echo "FAILED")
REDIRECT_LOCATION=$(echo "$HTTP_RESPONSE" | grep -i "^location:" | sed 's/location: //' || echo "")

if echo "$HTTP_STATUS" | grep -q "HTTP/[0-9.]+ 301\|HTTP/[0-9.]+ 302\|HTTP/[0-9.]+ 308"; then
    if echo "$REDIRECT_LOCATION" | grep -qi "https://"; then
        log_result "PASS" "HTTP redirects to HTTPS (Location: $REDIRECT_LOCATION)"
    else
        log_result "FAIL" "HTTP redirects but NOT to HTTPS (Location: $REDIRECT_LOCATION)"
    fi
elif echo "$HTTP_STATUS" | grep -q "HTTP/[0-9.]+ 200"; then
    log_result "FAIL" "HTTP endpoint returns 200 (no redirect to HTTPS)"
else
    log_result "WARN" "HTTP endpoint behavior unclear (Status: $HTTP_STATUS)"
fi

if [[ "$VERBOSE" == true ]]; then
    echo "HTTP Response Headers:"
    echo "$HTTP_RESPONSE" | head -10
fi

# ==========================================
# Check 4: TLS Version >= 1.2
# ==========================================
echo ""
echo "=== Check 4: TLS Version Support ==="

# Check TLS 1.0 (should be disabled)
TLS10_CHECK=$(openssl s_client -connect "$DOMAIN:443" -tls1 </dev/null 2>&1)
if echo "$TLS10_CHECK" | grep -q "handshake failure\|no protocols available\|error"; then
    log_result "PASS" "TLS 1.0 is DISABLED (secure)"
else
    log_result "FAIL" "TLS 1.0 is ENABLED (insecure - should be disabled)"
fi

# Check TLS 1.1 (should be disabled)
TLS11_CHECK=$(openssl s_client -connect "$DOMAIN:443" -tls1_1 </dev/null 2>&1)
if echo "$TLS11_CHECK" | grep -q "handshake failure\|no protocols available\|error"; then
    log_result "PASS" "TLS 1.1 is DISABLED (secure)"
else
    log_result "FAIL" "TLS 1.1 is ENABLED (insecure - should be disabled)"
fi

# Check TLS 1.2 (should be enabled)
TLS12_CHECK=$(openssl s_client -connect "$DOMAIN:443" -tls1_2 </dev/null 2>&1)
if echo "$TLS12_CHECK" | grep -q "Protocol.*TLSv1.2"; then
    log_result "PASS" "TLS 1.2 is ENABLED"
else
    log_result "FAIL" "TLS 1.2 is NOT enabled (required for production)"
fi

# Check TLS 1.3 (should be enabled if possible)
TLS13_CHECK=$(openssl s_client -connect "$DOMAIN:443" -tls1_3 </dev/null 2>&1)
if echo "$TLS13_CHECK" | grep -q "Protocol.*TLSv1.3"; then
    log_result "PASS" "TLS 1.3 is ENABLED (optimal)"
else
    log_result "WARN" "TLS 1.3 is NOT enabled (optional but recommended)"
fi

# ==========================================
# Check 5: Cipher Suite Strength
# ==========================================
echo ""
echo "=== Check 5: Cipher Suite Strength ==="

CIPHERS=$(openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>&1 | grep "Cipher    :" | sed 's/Cipher    : //')

if [[ -n "$CIPHERS" ]]; then
    echo "Current cipher: $CIPHERS"
    
    # Check for strong cipher patterns (AESGCM, ECDHE, CHACHA20)
    if echo "$CIPHERS" | grep -qiE "AES.*GCM|ECDHE|CHACHA20"; then
        log_result "PASS" "Strong cipher suite in use ($CIPHERS)"
    else
        log_result "WARN" "Cipher suite may not be optimal ($CIPHERS)"
    fi
fi

# ==========================================
# Check 6: HSTS Header
# ==========================================
echo ""
echo "=== Check 6: HSTS (HTTP Strict Transport Security) ==="

HTTPS_HEADERS=$(curl -sI "https://$DOMAIN" --connect-timeout 10 2>&1)
HSTS_HEADER=$(echo "$HTTPS_HEADERS" | grep -i "Strict-Transport-Security" || echo "")

if [[ -n "$HSTS_HEADER" ]]; then
    HSTS_VALUE=$(echo "$HSTS_HEADER" | sed 's/Strict-Transport-Security: //' | tr -d '\r')
    echo "HSTS: $HSTS_VALUE"
    
    # Check max-age
    MAX_AGE=$(echo "$HSTS_VALUE" | grep -oE "max-age=[0-9]+" | grep -oE "[0-9]+")
    if [[ -n "$MAX_AGE" ]]; then
        if [[ $MAX_AGE -ge 31536000 ]]; then
            log_result "PASS" "HSTS max-age >= 1 year (31536000 seconds)"
        else
            log_result "WARN" "HSTS max-age less than 1 year ($MAX_AGE seconds)"
        fi
    fi
    
    # Check includeSubDomains
    if echo "$HSTS_VALUE" | grep -qi "includeSubDomains"; then
        log_result "PASS" "HSTS includes subdomains"
    else
        log_result "WARN" "HSTS does not include subdomains"
    fi
    
    # Check preload
    if echo "$HSTS_VALUE" | grep -qi "preload"; then
        log_result "PASS" "HSTS preload directive present"
    fi
else
    log_result "WARN" "HSTS header not present (recommended for production)"
fi

# ==========================================
# Check 7: Security Headers
# ==========================================
echo ""
echo "=== Check 7: Security Headers ==="

# X-Frame-Options
XFO=$(echo "$HTTPS_HEADERS" | grep -i "X-Frame-Options" || echo "")
if [[ -n "$XFO" ]]; then
    log_result "PASS" "X-Frame-Options header present ($(echo "$XFO" | sed 's/X-Frame-Options: //' | tr -d '\r'))"
else
    log_result "WARN" "X-Frame-Options header not present"
fi

# X-Content-Type-Options
 XCTO=$(echo "$HTTPS_HEADERS" | grep -i "X-Content-Type-Options" || echo "")
if [[ -n "$XCTO" ]]; then
    log_result "PASS" "X-Content-Type-Options header present ($(echo "$XCTO" | sed 's/X-Content-Type-Options: //' | tr -d '\r'))"
else
    log_result "WARN" "X-Content-Type-Options header not present"
fi

# X-XSS-Protection
XXSS=$(echo "$HTTPS_HEADERS" | grep -i "X-XSS-Protection" || echo "")
if [[ -n "$XXSS" ]]; then
    log_result "PASS" "X-XSS-Protection header present ($(echo "$XXSS" | sed 's/X-XSS-Protection: //' | tr -d '\r'))"
else
    log_result "WARN" "X-XSS-Protection header not present"
fi

# ==========================================
# Summary
# ==========================================
echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"
echo ""

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo "✅ ALL TLS/SSL VERIFICATIONS PASSED"
    echo ""
    echo "VAL-DP-003: TLS/SSL Enabled - SATISFIED"
    echo ""
    echo "Additional verification options:"
    echo "  - SSL Labs: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    echo "  - Testssl.sh: https://github.com/drwetter/testssl.sh"
    echo ""
    exit 0
else
    echo "❌ SOME VERIFICATIONS FAILED"
    echo ""
    echo "Review failed checks above and fix issues before production deployment."
    echo ""
    exit 1
fi
