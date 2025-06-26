#!/bin/bash

# Security Setup Script for FCS Marketplace
# Run as sudo: sudo bash security-setup.sh

# Exit on error
set -e

echo "=== Starting Security Setup ==="

# Update system packages
echo "=== Updating system packages ==="
apt-get update
apt-get upgrade -y

# Install necessary security packages
echo "=== Installing security packages ==="
apt-get install -y fail2ban ufw certbot python3-certbot-nginx 

# Configure firewall
echo "=== Configuring firewall ==="
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Set up fail2ban for brute force protection
echo "=== Configuring fail2ban ==="
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
EOF

systemctl restart fail2ban

# Set up HTTPS with Let's Encrypt (replace example.com with your domain)
echo "=== IMPORTANT: Update the domain name below before running this command ==="
echo "certbot --nginx -d example.com -d www.example.com"

# Add security headers to Nginx
echo "=== Adding security headers to Nginx ==="
cat > /etc/nginx/conf.d/security-headers.conf << EOF
# Security headers
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Enable OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;

# Modern SSL configuration (update paths to your certificates)
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;

# Enable rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/s;
EOF

# Add login rate limiting to your Nginx site
echo "
# Example of applying rate limiting to a location (add to your site config):
location /api/auth {
    limit_req zone=login burst=10 nodelay;
    proxy_pass http://localhost:3000;
}

location /api/ {
    limit_req zone=api burst=20;
    proxy_pass http://localhost:3000;
}
"

# Setup log monitoring
echo "=== Setting up log monitoring ==="
apt-get install -y logwatch

# Configure automatic security updates
echo "=== Setting up automatic security updates ==="
apt-get install -y unattended-upgrades
cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}";
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
    "\${distro_id}:\${distro_codename}-updates";
};
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

echo "=== Security server setup completed ==="
echo "IMPORTANT: Remember to customize domain names and paths in this script before running!"
echo "           Review Nginx configurations and update CSP headers for your specific needs."
echo "=== Next, install the application security packages with npm ===" 