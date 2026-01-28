#!/bin/bash
# 优化 Nginx 配置以更好地支持微信小程序

DOMAIN="pihaha.top"

echo "========== 优化 Nginx 配置支持小程序 =========="
echo ""

# 优化配置
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
    
    # ⭐ 优化：支持 TLS 1.2 和 1.3，确保小程序兼容性
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # ⭐ 添加安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        # ⭐ 关键：使用 127.0.0.1 而不是 localhost，避免 IPv6 问题
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # ⭐ 重要：禁用 HTTP/2 代理，使用 HTTP/1.1（小程序兼容性更好）
        proxy_set_header Connection "";
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # ⭐ 添加超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # ⭐ 禁用缓冲，实时传输
        proxy_buffering off;
    }
}
EOF

# 测试配置
echo "测试 Nginx 配置..."
if sudo nginx -t; then
    echo "✅ Nginx 配置测试通过"
    
    # 重载 Nginx
    echo "重载 Nginx..."
    sudo systemctl reload nginx
    
    sleep 2
    
    # 测试
    echo ""
    echo "测试连接..."
    curl -k -s -o /dev/null -w "健康检查: HTTP %{http_code}\n" https://$DOMAIN/health
    
    echo ""
    echo "✅ 配置优化完成"
    echo ""
    echo "现在可以测试小程序登录功能"
else
    echo "❌ Nginx 配置测试失败"
    exit 1
fi
