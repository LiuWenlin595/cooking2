#!/bin/bash
# 配置 Nginx 使用 pihaha.top 的 HTTPS 证书

DOMAIN="pihaha.top"

echo "========== 配置 Nginx 使用新证书 =========="
echo "域名: $DOMAIN"
echo ""

# 1. 写入 Nginx 配置
echo "1. 写入 /etc/nginx/conf.d/cooking-app-backend.conf ..."

sudo tee /etc/nginx/conf.d/cooking-app-backend.conf > /dev/null << EOF
# 80 端口：全部重定向到 HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# 443 端口：HTTPS + 反向代理到 Node.js 3000
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # 使用 Let's Encrypt 签发的证书
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

# 2. 检查 Nginx 配置
echo ""
echo "2. 检查 Nginx 配置语法..."
sudo nginx -t
if [ $? -ne 0 ]; then
  echo "❌ Nginx 配置有错误，请根据上面的提示修改后再试"
  exit 1
fi

# 3. 重载 Nginx
echo ""
echo "3. 重载 Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Nginx 已使用新证书配置完成"
echo "你可以在本机测试：curl -k https://$DOMAIN/health"
echo "=================================================="
