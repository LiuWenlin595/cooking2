#!/bin/bash
# 使用 DNS-01 验证申请证书（不需要 HTTP 访问）

DOMAIN="pihaha.top"

echo "========== 使用 DNS-01 验证申请证书 =========="
echo ""
echo "⚠️ 注意：DNS-01 验证需要手动添加 DNS TXT 记录"
echo ""

# 1. 申请证书（使用 DNS-01 验证）
echo "1. 申请证书（使用 DNS-01 验证）..."
echo "   这将提示你添加 DNS TXT 记录"
echo ""

if sudo certbot certonly --manual \
    -d $DOMAIN \
    --preferred-challenges dns \
    --non-interactive \
    --agree-tos \
    --email admin@$DOMAIN \
    --manual-public-ip-logging-ok; then
    
    echo "✅ 证书申请成功！"
else
    echo ""
    echo "❌ 证书申请失败"
    echo ""
    echo "如果提示需要添加 DNS TXT 记录，请："
    echo "1. 在阿里云 DNS 控制台添加 TXT 记录"
    echo "2. 等待 DNS 传播（5-30 分钟）"
    echo "3. 重新运行此脚本"
    exit 1
fi

# 2. 配置 HTTPS
echo ""
echo "2. 配置 HTTPS..."
if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    # 确保 Nginx 正在运行
    sudo systemctl start nginx 2>/dev/null || true
    
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
else
    echo "❌ 证书文件不存在"
    exit 1
fi

# 完成
echo ""
echo "========== 配置完成 =========="
echo "✅ SSL 证书配置成功！"
echo ""
echo "HTTPS 地址: https://$DOMAIN"
echo ""
