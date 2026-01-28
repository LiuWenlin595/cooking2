#!/bin/bash
# 修复 403 问题并申请证书

DOMAIN="pihaha.top"

echo "========== 修复 403 问题并申请证书 =========="
echo ""

# 1. 确保目录和文件权限正确
echo "1. 修复目录和文件权限..."
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R nginx:nginx /var/www/html
sudo chmod -R 755 /var/www/html
echo "✅ 权限已修复"

# 2. 检查并修复 SELinux（如果启用）
echo ""
echo "2. 检查 SELinux..."
if command -v getenforce &> /dev/null; then
    if [ "$(getenforce)" != "Disabled" ]; then
        echo "SELinux 已启用，配置上下文..."
        if command -v semanage &> /dev/null; then
            sudo semanage fcontext -a -t httpd_sys_content_t '/var/www/html(/.*)?' 2>/dev/null || true
            sudo restorecon -Rv /var/www/html 2>/dev/null || true
            echo "✅ SELinux 上下文已配置"
        else
            echo "⚠️ 未安装 semanage，跳过 SELinux 配置"
        fi
    else
        echo "✅ SELinux 已禁用"
    fi
else
    echo "✅ 未安装 SELinux"
fi

# 3. 重新配置 Nginx，确保验证路径正确
echo ""
echo "3. 重新配置 Nginx..."
sudo tee /etc/nginx/conf.d/cooking-app-backend.conf > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Let's Encrypt 验证路径（必须放在最前面，优先级最高）
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type text/plain;
        try_files \$uri =404;
        access_log off;
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

# 4. 测试并重载 Nginx
echo ""
echo "4. 测试并重载 Nginx..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Nginx 配置已重载"
    sleep 2
else
    echo "❌ Nginx 配置测试失败"
    exit 1
fi

# 5. 创建测试文件并测试外部访问
echo ""
echo "5. 测试外部访问..."
TEST_CONTENT="test-$(date +%s)"
echo "$TEST_CONTENT" | sudo tee /var/www/html/.well-known/acme-challenge/test > /dev/null

# 等待一下让文件系统同步
sleep 1

# 从外部测试
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/.well-known/acme-challenge/test" 2>&1)
echo "外部访问 HTTP 状态码: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    RESPONSE=$(curl -s "http://$DOMAIN/.well-known/acme-challenge/test")
    echo "响应内容: $RESPONSE"
    if [ "$RESPONSE" = "$TEST_CONTENT" ]; then
        echo "✅ 外部可以正确访问验证路径"
    else
        echo "⚠️ 响应内容不匹配，但可以访问"
    fi
elif [ "$HTTP_CODE" = "403" ]; then
    echo "❌ 仍然返回 403"
    echo ""
    echo "可能的原因："
    echo "1. 阿里云防火墙未开放 80 端口（最可能）"
    echo "2. Nginx 配置问题"
    echo "3. 文件权限问题"
    echo ""
    echo "请检查："
    echo "- 阿里云控制台 → 轻量应用服务器 → 防火墙 → 确认 80 端口已开放"
    echo "- 执行诊断脚本: bash 诊断403问题.sh"
    exit 1
elif [ "$HTTP_CODE" = "000" ]; then
    echo "❌ 无法连接"
    echo "请检查："
    echo "- 阿里云防火墙是否开放 80 端口"
    echo "- DNS 解析是否正确"
    exit 1
else
    echo "⚠️ 返回 HTTP $HTTP_CODE"
fi

# 清理测试文件
sudo rm -f /var/www/html/.well-known/acme-challenge/test

# 6. 申请证书
echo ""
echo "6. 申请 Let's Encrypt 证书..."
if sudo certbot certonly --webroot \
    -w /var/www/html \
    -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email admin@$DOMAIN \
    --preferred-challenges http \
    --force-renewal; then
    
    echo "✅ 证书申请成功！"
else
    echo "❌ 证书申请失败"
    echo ""
    echo "请执行诊断脚本查看详细信息:"
    echo "bash 诊断403问题.sh"
    exit 1
fi

# 7. 配置 HTTPS
echo ""
echo "7. 配置 HTTPS..."
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

# 8. 配置自动续期
echo ""
echo "8. 配置自动续期..."
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
