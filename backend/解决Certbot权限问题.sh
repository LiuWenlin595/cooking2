#!/bin/bash
# 解决 Certbot 权限问题并申请证书

DOMAIN="pihaha.top"

echo "========== 解决 Certbot 权限问题 =========="
echo ""

# 1. 确保目录权限正确
echo "1. 确保目录权限正确..."
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R nginx:nginx /var/www/html
sudo chmod -R 755 /var/www/html

# 2. 创建 Certbot 钩子脚本，自动修复文件权限
echo ""
echo "2. 创建 Certbot 钩子脚本..."
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/fix-permissions.sh > /dev/null << 'EOF'
#!/bin/bash
# Certbot 部署钩子：修复文件权限
chown -R nginx:nginx /var/www/html/.well-known/acme-challenge
chmod -R 755 /var/www/html/.well-known/acme-challenge
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/fix-permissions.sh

# 3. 配置 Nginx
echo ""
echo "3. 配置 Nginx..."
sudo tee /etc/nginx/conf.d/cooking-app-backend.conf > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Let's Encrypt 验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type text/plain;
        try_files \$uri =404;
        access_log off;
        log_not_found off;
        
        # 允许所有访问（包括 Let's Encrypt）
        allow all;
    }

    # 其他请求代理到后端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx 配置完成"

# 4. 使用 standalone 模式（临时停止 Nginx，避免权限问题）
echo ""
echo "4. 使用 standalone 模式申请证书..."
echo "   这将临时停止 Nginx..."

# 停止 Nginx
sudo systemctl stop nginx

# 申请证书
if sudo certbot certonly --standalone \
    -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email admin@$DOMAIN \
    --preferred-challenges http; then
    
    echo "✅ 证书申请成功！"
    
    # 启动 Nginx
    sudo systemctl start nginx
    
    # 配置 HTTPS
    echo ""
    echo "5. 配置 HTTPS..."
    if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
        sudo tee /etc/nginx/conf.d/cooking-app-backend.conf > /dev/null << EOF
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

        if sudo nginx -t; then
            sudo systemctl reload nginx
            echo "✅ HTTPS 配置完成"
        else
            echo "❌ HTTPS 配置失败"
            exit 1
        fi
    fi
else
    echo "❌ 证书申请失败"
    # 确保 Nginx 重新启动
    sudo systemctl start nginx
    exit 1
fi

# 6. 配置自动续期
echo ""
echo "6. 配置自动续期..."
sudo systemctl enable certbot-renew.timer 2>/dev/null || true
sudo systemctl start certbot-renew.timer 2>/dev/null || true

# 完成
echo ""
echo "========== 配置完成 =========="
echo "✅ SSL 证书配置成功！"
echo ""
echo "HTTPS 地址: https://$DOMAIN"
echo ""
echo "测试: curl -k https://$DOMAIN/health"
echo ""
