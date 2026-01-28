#!/bin/bash
# 最终修复并申请证书

DOMAIN="pihaha.top"

echo "========== 最终修复并申请证书 =========="
echo ""

# 1. 修复文件权限（关键步骤）
echo "1. 修复文件权限..."
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R nginx:nginx /var/www/html
sudo chmod -R 755 /var/www/html

# 确保验证目录权限正确
sudo chmod 755 /var/www/html
sudo chmod 755 /var/www/html/.well-known
sudo chmod 755 /var/www/html/.well-known/acme-challenge

echo "✅ 权限已修复"
echo "验证目录权限:"
ls -ld /var/www/html/.well-known/acme-challenge

# 2. 重新配置 Nginx（优化配置）
echo ""
echo "2. 重新配置 Nginx..."
sudo tee /etc/nginx/conf.d/cooking-app-backend.conf > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Let's Encrypt 验证路径（优先级最高）
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type text/plain;
        try_files \$uri =404;
        access_log off;
        log_not_found off;
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

# 3. 测试并重载 Nginx
echo ""
echo "3. 测试并重载 Nginx..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Nginx 配置已重载"
    sleep 2
else
    echo "❌ Nginx 配置测试失败"
    exit 1
fi

# 4. 创建测试文件并验证权限
echo ""
echo "4. 创建测试文件并验证..."
TEST_CONTENT="test-$(date +%s)"
echo "$TEST_CONTENT" | sudo tee /var/www/html/.well-known/acme-challenge/test > /dev/null
sudo chown nginx:nginx /var/www/html/.well-known/acme-challenge/test
sudo chmod 644 /var/www/html/.well-known/acme-challenge/test

echo "测试文件权限:"
ls -l /var/www/html/.well-known/acme-challenge/test

# 5. 测试外部访问
echo ""
echo "5. 测试外部访问..."
sleep 1
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/.well-known/acme-challenge/test" 2>&1)
RESPONSE=$(curl -s "http://$DOMAIN/.well-known/acme-challenge/test" 2>&1)

echo "HTTP 状态码: $HTTP_CODE"
echo "响应内容: $RESPONSE"

if [ "$HTTP_CODE" = "200" ] && [ "$RESPONSE" = "$TEST_CONTENT" ]; then
    echo "✅ 外部可以正确访问验证路径"
else
    echo "⚠️ 外部访问可能有问题"
    echo "HTTP 状态码: $HTTP_CODE"
    echo "期望内容: $TEST_CONTENT"
    echo "实际内容: $RESPONSE"
fi

# 清理测试文件
sudo rm -f /var/www/html/.well-known/acme-challenge/test

# 6. 清理可能存在的旧证书申请
echo ""
echo "6. 清理旧的证书申请记录..."
sudo certbot delete --cert-name $DOMAIN --non-interactive 2>/dev/null || echo "没有旧的证书记录"

# 7. 申请证书（使用详细模式以便调试）
echo ""
echo "7. 申请 Let's Encrypt 证书..."
echo "   这可能需要几分钟时间，请耐心等待..."

if sudo certbot certonly --webroot \
    -w /var/www/html \
    -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email admin@$DOMAIN \
    --preferred-challenges http \
    --verbose; then
    
    echo "✅ 证书申请成功！"
else
    echo "❌ 证书申请失败"
    echo ""
    echo "查看详细日志:"
    echo "sudo tail -50 /var/log/letsencrypt/letsencrypt.log"
    exit 1
fi

# 8. 配置 HTTPS
echo ""
echo "8. 配置 HTTPS..."
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
else
    echo "❌ 证书文件不存在"
    exit 1
fi

# 9. 配置自动续期
echo ""
echo "9. 配置自动续期..."
sudo systemctl enable certbot-renew.timer 2>/dev/null || true
sudo systemctl start certbot-renew.timer 2>/dev/null || true

# 10. 测试 HTTPS
echo ""
echo "10. 测试 HTTPS..."
sleep 2
if curl -k -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/health" | grep -q "200\|404\|500"; then
    echo "✅ HTTPS 连接成功"
else
    echo "⚠️ HTTPS 连接可能有问题，但证书已配置"
fi

# 完成
echo ""
echo "========== 配置完成 =========="
echo "✅ SSL 证书配置成功！"
echo ""
echo "HTTPS 地址: https://$DOMAIN"
echo ""
echo "下一步："
echo "1. 修改小程序配置: utils/cloudStorage.js"
echo "   apiBaseUrl: 'https://$DOMAIN'"
echo ""
echo "2. 在微信公众平台配置服务器域名"
echo ""
echo "测试: curl -k https://$DOMAIN/health"
echo ""
