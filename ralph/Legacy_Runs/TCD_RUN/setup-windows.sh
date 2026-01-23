#!/bin/bash
# One-time Windows setup for Ralph
# Run this ONCE with admin privileges before using Ralph overnight

echo "🔧 Ralph Windows Setup"
echo "======================"
echo ""
echo "This will add Windows Firewall rules to allow Go servers."
echo "Run this in PowerShell as Administrator:"
echo ""
echo 'powershell -Command "Start-Process powershell -Verb runAs -ArgumentList '"'"'-Command \"New-NetFirewallRule -DisplayName Go -Direction Inbound -Program \\\"C:\\Program Files\\Go\\bin\\go.exe\\\" -Action Allow -ErrorAction SilentlyContinue; Write-Host Done\"'"'"'"'
echo ""
echo "Or copy-paste this into an elevated PowerShell:"
echo ""
cat << 'EOF'
New-NetFirewallRule -DisplayName "Go" -Direction Inbound -Program "C:\Program Files\Go\bin\go.exe" -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Go Temp Builds" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
Write-Host "✅ Firewall rules added"
EOF
