#!/bin/bash
# 配置域名和 Let's Encrypt 证书的脚本
# 在服务器上执行

echo "========== 配置域名和 Let's Encrypt 证书 =========="

# 检查是否提供了域名参数
if [ -z "$1" ]; then
  echo "❌ 错误：请提供域名"
  echo "用法: sudo bash 配置域名和证书.sh your-domain.com"
  exit 1
fi

DOMAIN=$1
echo "配置域名: $DOMAIN"

# 1. 安装 Certbot
echo "1. 安装 Certbot..."
sudo yum install -y certbot python3-certbot-nginx

# 1.5. 清理旧的 Nginx 配置（避免冲突）
echo "1.5. 清理旧的 Nginx 配置..."
if [ -f /etc/nginx/conf.d/cooking-app-backend.conf ]; then
    echo "备份旧配置..."
    sudo cp /etc/nginx/conf.d/cooking-app-backend.conf /etc/nginx/conf.d/cooking-app-backend.conf.bak.$(date +%Y%m%d_%H%M%S)
fi

# 2. 配置 Nginx（临时配置，用于验证域名）
echo "2. 配置 Nginx（临时配置，仅用于证书申请）..."
sudo tee /etc/nginx/conf.d/cooking-app-backend.conf > /dev/null << EOF
# ⚠️ 重要：此配置仅用于 Let's Encrypt 证书申请
# 证书申请成功后，Certbot 会自动修改此配置添加 HTTPS

server {
    listen 80;
    server_name $DOMAIN;

    # Let's Encrypt 验证路径（必须允许访问）
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
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

# 创建 Let's Encrypt 验证目录
echo "创建 Let's Encrypt 验证目录..."
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R nginx:nginx /var/www/html
sudo chmod -R 755 /var/www/html

# 3. 测试 Nginx 配置
echo "3. 测试 Nginx 配置..."
sudo nginx -t

# 4. 重启 Nginx
echo "4. 重启 Nginx..."
sudo systemctl restart nginx

# 5. 申请 Let's Encrypt 证书
echo "5. 申请 Let's Encrypt 证书..."
echo "⚠️ 注意：申请证书前，请确保："
echo "   1. 域名已解析到服务器 IP: $(curl -s ifconfig.me)"
echo "   2. 80 端口已开放（用于域名验证）"
echo ""
read -p "按 Enter 继续申请证书..."

# 使用 standalone 模式申请证书（不依赖 Nginx 配置）
echo "使用 standalone 模式申请证书..."
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --preferred-challenges http

# 如果 standalone 模式失败，尝试使用 webroot 模式
if [ $? -ne 0 ]; then
    echo "standalone 模式失败，尝试 webroot 模式..."
    sudo certbot certonly --webroot -w /var/www/html -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
fi

# 证书申请成功后，配置 Nginx 使用证书
if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    echo "证书申请成功，配置 Nginx HTTPS..."
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
    echo "✅ Nginx HTTPS 配置完成"
else
    echo "❌ 证书申请失败，请检查错误信息"
    exit 1
fi

# 6. 配置自动续期
echo "6. 配置自动续期..."
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

echo ""
echo "========== 配置完成 =========="
echo "HTTPS 地址: https://$DOMAIN"
echo ""
echo "下一步："
echo "1. 在小程序中配置: apiBaseUrl: 'https://$DOMAIN'"
echo "2. 在微信公众平台配置服务器域名: $DOMAIN"
echo ""
