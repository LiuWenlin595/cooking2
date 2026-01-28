#!/bin/bash
# 修复 Nginx 配置：使用 IPv4 地址连接后端

DOMAIN="pihaha.top"

echo "========== 修复 Nginx 配置 =========="
echo ""

# 检查当前配置
echo "1. 检查当前 Nginx 配置..."
sudo cat /etc/nginx/conf.d/cooking-app-backend.conf

echo ""
echo "2. 修复配置（使用 127.0.0.1 而不是 localhost，避免 IPv6 问题）..."

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
        # ⭐ 关键修复：使用 127.0.0.1 而不是 localhost，避免 IPv6 解析问题
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 添加超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# 测试配置
echo ""
echo "3. 测试 Nginx 配置..."
if sudo nginx -t; then
    echo "✅ Nginx 配置测试通过"
    
    # 重载 Nginx
    echo ""
    echo "4. 重载 Nginx..."
    sudo systemctl reload nginx
    
    # 等待一下
    sleep 2
    
    # 测试连接
    echo ""
    echo "5. 测试连接..."
    echo "本地 HTTPS 测试:"
    curl -k -s -o /dev/null -w "HTTP %{http_code}\n" https://localhost/health
    
    echo ""
    echo "✅ 配置修复完成"
    echo ""
    echo "现在可以测试外部访问:"
    echo "curl -k https://$DOMAIN/health"
else
    echo "❌ Nginx 配置测试失败"
    exit 1
fi
