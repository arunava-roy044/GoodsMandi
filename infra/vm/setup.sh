#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 VM to run GoodsMandi.
# Run it ONCE, as root, over SSH. See SETUP.md, "Hosting on an Azure VM".
#
#   sudo SUPABASE_URL='https://xxxx.supabase.co' \
#        SUPABASE_ANON_KEY='eyJ...' \
#        DEPLOY_PUBKEY='ssh-ed25519 AAAA... github-deploy' \
#        DOMAIN='goodsmandi.malaysiawest.cloudapp.azure.com' \
#        bash setup.sh
#
# It is safe to run again: it only fixes up what is missing or changed.
set -euo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY}"
: "${DEPLOY_PUBKEY:?set DEPLOY_PUBKEY (the public half of the GitHub deploy key)}"
: "${DOMAIN:?set DOMAIN (the address people will type, e.g. the VM DNS name)}"

if [ "$(id -u)" -ne 0 ]; then echo "Run this as root (sudo)." >&2; exit 1; fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Installing packages"
apt-get update -y
apt-get install -y ca-certificates curl gnupg nginx certbot python3-certbot-nginx unattended-upgrades

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" != "22" ]; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Users and folders"
# 'deploy' receives the files from GitHub; 'goodsmandi' only runs the site.
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
id goodsmandi >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin goodsmandi
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "$DEPLOY_PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
install -d -m 755 -o deploy -g deploy /opt/goodsmandi /opt/goodsmandi/releases
# Next.js writes its cache here; each release links .next/cache to it
install -d -m 755 -o goodsmandi -g goodsmandi /opt/goodsmandi/cache

# The deploy user may restart the site and nothing else as root
cat > /etc/sudoers.d/goodsmandi-deploy <<'SUDO'
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart goodsmandi, /usr/bin/systemctl is-active goodsmandi
SUDO
chmod 440 /etc/sudoers.d/goodsmandi-deploy
visudo -cf /etc/sudoers.d/goodsmandi-deploy >/dev/null

echo "==> Site settings"
cat > /etc/goodsmandi.env <<ENV
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
ENV
chmod 640 /etc/goodsmandi.env
chown root:goodsmandi /etc/goodsmandi.env

cat > /etc/systemd/system/goodsmandi.service <<'UNIT'
[Unit]
Description=GoodsMandi website
After=network.target

[Service]
User=goodsmandi
Group=goodsmandi
WorkingDirectory=/opt/goodsmandi/current
EnvironmentFile=/etc/goodsmandi.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable goodsmandi

echo "==> nginx"
# Supabase login cookies make response headers bigger than nginx's default
# buffers ("upstream sent too big header" -> 502 for signed-in users)
cat > /etc/nginx/conf.d/goodsmandi-buffers.conf <<'BUF'
proxy_buffer_size 32k;
proxy_buffers 8 32k;
proxy_busy_buffers_size 64k;
large_client_header_buffers 4 32k;
BUF
cat > /etc/nginx/sites-available/goodsmandi <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    client_max_body_size 10m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/goodsmandi /etc/nginx/sites-enabled/goodsmandi
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx || systemctl restart nginx

echo
echo "Done. Next:"
echo "  1. Run the 'Deploy to Azure VM' workflow on GitHub (the site starts after its first deploy)."
echo "  2. Then get HTTPS:   sudo certbot --nginx -d $DOMAIN --redirect -m YOUR_EMAIL --agree-tos -n"
