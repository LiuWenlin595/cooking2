#!/bin/bash
# 使用 DNS-01 验证申请证书的完整流程

DOMAIN="pihaha.top"

echo "========== 使用 DNS-01 验证申请证书 =========="
echo ""
echo "⚠️ 注意：此方法需要手动添加 DNS TXT 记录"
echo ""

# 1. 申请证书（交互式，需要手动添加 DNS 记录）
echo "1. 开始申请证书..."
echo ""
echo "接下来 Certbot 会提示你："
echo "  1. 添加一个 DNS TXT 记录"
echo "  2. 记录名称: _acme-challenge.$DOMAIN"
echo "  3. 记录值: Certbot 会提供一个随机字符串"
echo ""
echo "添加 DNS 记录后，等待 5-10 分钟让 DNS 传播，然后按 Enter 继续"
echo ""
read -p "按 Enter 开始申请证书..."

# 申请证书
sudo certbot certonly --manual \
    -d $DOMAIN \
    --preferred-challenges dns \
    --agree-tos \
    --email admin@$DOMAIN \
    --manual-public-ip-logging-ok

# 检查证书是否申请成功
if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
    echo ""
    echo "✅ 证书申请成功！"
    
    # 2. 配置 HTTPS
    echo ""
    echo "2. 配置 HTTPS..."
    
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
    
    # 3. 配置自动续期
    echo ""
    echo "3. 配置自动续期..."
    sudo systemctl enable certbot-renew.timer 2>/dev/null || true
    sudo systemctl start certbot-renew.timer 2>/dev/null || true
    
    # 4. 测试 HTTPS
    echo ""
    echo "4. 测试 HTTPS..."
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
else
    echo ""
    echo "❌ 证书申请失败"
    echo ""
    echo "可能的原因："
    echo "1. DNS TXT 记录未正确添加"
    echo "2. DNS 传播时间不够（需要等待 5-30 分钟）"
    echo "3. TXT 记录值输入错误"
    echo ""
    echo "请检查："
    echo "1. 在阿里云 DNS 控制台确认 TXT 记录已添加"
    echo "2. 使用以下命令验证 DNS 记录："
    echo "   dig _acme-challenge.$DOMAIN TXT"
    echo "3. 等待 DNS 传播后重新运行此脚本"
    exit 1
fi
