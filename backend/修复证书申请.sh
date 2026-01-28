#!/bin/bash
# 修复证书申请的脚本

DOMAIN="pihaha.top"

echo "========== 修复证书申请 =========="

# 1. 先修复 Nginx 配置（使用 HTTP，不依赖证书）
echo "1. 修复 Nginx 配置（临时使用 HTTP）..."
sudo tee /etc/nginx/conf.d/cooking-app-backend.conf > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Let's Encrypt 验证路径
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

# 2. 创建验证目录
echo "2. 创建 Let's Encrypt 验证目录..."
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R nginx:nginx /var/www/html
sudo chmod -R 755 /var/www/html

# 3. 测试并启动 Nginx
echo "3. 测试并启动 Nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo "✅ Nginx 启动成功"
else
    echo "❌ Nginx 配置测试失败"
    exit 1
fi

# 4. 检查 80 端口是否可访问
echo "4. 检查 80 端口..."
if sudo netstat -tlnp | grep :80 > /dev/null; then
    echo "✅ 80 端口正在监听"
else
    echo "❌ 80 端口未监听"
    exit 1
fi

# 5. 测试 HTTP 访问
echo "5. 测试 HTTP 访问..."
curl -I http://$DOMAIN/.well-known/acme-challenge/test 2>&1 | head -1
if [ $? -eq 0 ]; then
    echo "✅ HTTP 访问正常"
else
    echo "⚠️ HTTP 访问可能有问题，但继续尝试申请证书..."
fi

# 6. 使用 webroot 模式申请证书（不需要停止 Nginx）
echo "6. 使用 webroot 模式申请证书..."
sudo certbot certonly --webroot \
    -w /var/www/html \
    -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email admin@$DOMAIN \
    --preferred-challenges http

# 7. 如果证书申请成功，配置 HTTPS
if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    echo "✅ 证书申请成功！"
    echo "7. 配置 HTTPS..."
    
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

    sudo nginx -t
    if [ $? -eq 0 ]; then
        sudo systemctl reload nginx
        echo "✅ HTTPS 配置完成！"
        echo ""
        echo "========== 配置成功 =========="
        echo "HTTPS 地址: https://$DOMAIN"
        echo ""
        echo "测试 HTTPS:"
        echo "curl -k https://$DOMAIN/health"
    else
        echo "❌ HTTPS 配置失败"
        exit 1
    fi
else
    echo "❌ 证书申请失败"
    echo ""
    echo "可能的原因："
    echo "1. 80 端口未开放（检查阿里云防火墙）"
    echo "2. DNS 解析未生效（等待更长时间）"
    echo "3. 网络连接问题"
    echo ""
    echo "请检查："
    echo "- 阿里云防火墙是否开放 80 端口"
    echo "- DNS 解析是否正确：dig @8.8.8.8 $DOMAIN"
    echo "- 服务器是否能访问外网"
    exit 1
fi
