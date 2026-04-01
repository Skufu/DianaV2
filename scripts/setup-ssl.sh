#!/bin/bash
# SSL Certificate Setup Script for DianaV2 Production Deployment
# This script sets up Let's Encrypt certificates using certbot
#
# Usage:
#   ./scripts/setup-ssl.sh --domain api.diana.example.com --email admin@example.com
#
# Prerequisites:
#   - Domain configured and pointing to server IP
#   - Port 80 and 443 open on firewall
#   - Nginx/web server running on port 80 (for ACME challenge)
#
# Validation: VAL-DP-003 - TLS/SSL Enabled

set -e

# Parse arguments
DOMAIN=""
EMAIL=""
STAGING=false
INSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --staging)
            STAGING=true
            shift
            ;;
        --install)
            INSTALL=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 --domain <domain> --email <email> [--staging] [--install]"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$DOMAIN" ]]; then
    echo "Error: --domain is required"
    exit 1
fi

if [[ -z "$EMAIL" ]]; then
    echo "Error: --email is required for Let's Encrypt registration"
    exit 1
fi

echo "=========================================="
echo "DianaV2 SSL Certificate Setup"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Staging: $STAGING"
echo "=========================================="

# Install certbot if requested
if [[ "$INSTALL" == true ]]; then
    echo ""
    echo "Installing certbot..."
    
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        yum install -y certbot python3-certbot-nginx
    elif command -v dnf &> /dev/null; then
        dnf install -y certbot python3-certbot-nginx
    elif command -v brew &> /dev/null; then
        brew install certbot
    else
        echo "Error: Could not detect package manager. Please install certbot manually."
        exit 1
    fi
    
    echo "✅ certbot installed"
fi

# Check if certbot is available
if ! command -v certbot &> /dev/null; then
    echo "Error: certbot not found. Install with --install flag or manually."
    exit 1
fi

# Create SSL directory
SSL_DIR="/etc/nginx/ssl"
mkdir -p "$SSL_DIR"

# Set certbot command with staging flag if requested
CERTBOT_CMD="certbot certonly --nginx"
if [[ "$STAGING" == true ]]; then
    echo ""
    echo "⚠️  Using Let's Encrypt STAGING environment"
    echo "Certificates will not be trusted by browsers"
    echo "Remove --staging flag for production certificates"
    CERTBOT_CMD="$CERTBOT_CMD --test-cert"
fi

# Obtain certificate
echo ""
echo "Obtaining SSL certificate for $DOMAIN..."
$CERTBOT_CMD \
    --domain "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --keep-or-renew \
    --non-interactive

# Check if certificate was obtained
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
if [[ -d "$CERT_PATH" ]]; then
    echo ""
    echo "✅ Certificate obtained successfully"
    echo "Certificate path: $CERT_PATH"
    
    # Copy certificates to nginx SSL directory for Docker compatibility
    echo ""
    echo "Copying certificates to nginx SSL directory..."
    cp "$CERT_PATH/fullchain.pem" "$SSL_DIR/fullchain.pem"
    cp "$CERT_PATH/privkey.pem" "$SSL_DIR/privkey.pem"
    
    # Set proper permissions
    chmod 644 "$SSL_DIR/fullchain.pem"
    chmod 600 "$SSL_DIR/privkey.pem"
    
    echo "✅ Certificates copied to $SSL_DIR"
else
    echo ""
    echo "❌ Certificate not found at expected path"
    exit 1
fi

# Set up automatic renewal
echo ""
echo "Setting up automatic certificate renewal..."

# Create renewal cron job
CRON_JOB="0 0 * * * certbot renew --quiet --post-hook 'cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/fullchain.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/privkey.pem && nginx -s reload'"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "certbot renew"; then
    echo "⚠️  Existing certbot renewal cron job found - skipping"
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Automatic renewal cron job added (runs daily at midnight)"
fi

# Display certificate info
echo ""
echo "=========================================="
echo "Certificate Information"
echo "=========================================="
openssl x509 -in "$SSL_DIR/fullchain.pem" -noout -subject -dates -issuer

# Verify TLS configuration
echo ""
echo "=========================================="
echo "TLS Verification"
echo "=========================================="

# Check TLS version support
echo "Checking TLS 1.2+ support..."
TLS_CHECK=$(openssl s_client -connect "$DOMAIN:443" -tls1_2 </dev/null 2>&1 | grep "Protocol")
if echo "$TLS_CHECK" | grep -q "TLSv1.2"; then
    echo "✅ TLS 1.2 supported"
fi

TLS13_CHECK=$(openssl s_client -connect "$DOMAIN:443" -tls1_3 </dev/null 2>&1 | grep "Protocol")
if echo "$TLS13_CHECK" | grep -q "TLSv1.3"; then
    echo "✅ TLS 1.3 supported"
fi

# Check HTTP to HTTPS redirect
echo ""
echo "Checking HTTP to HTTPS redirect..."
REDIRECT_CHECK=$(curl -sI "http://$DOMAIN" | grep -E "^HTTP|^Location")
if echo "$REDIRECT_CHECK" | grep -q "301\|302"; then
    echo "✅ HTTP redirects to HTTPS"
else
    echo "⚠️  HTTP redirect not detected - ensure nginx is configured"
fi

echo ""
echo "=========================================="
echo "SSL Setup Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Configure nginx to use certificates: $SSL_DIR/fullchain.pem, $SSL_DIR/privkey.pem"
echo "  2. Restart nginx: nginx -s reload or docker-compose restart frontend"
echo "  3. Run TLS verification: ./scripts/verify-tls.sh --domain $DOMAIN"
echo "  4. Test SSL Labs: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo "Certificate renewal: Automatic (daily cron at midnight)"
echo "Manual renewal: certbot renew"
echo ""
