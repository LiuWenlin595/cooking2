#!/bin/bash
# DNS 验证分步操作脚本

DOMAIN="pihaha.top"

echo "========== DNS-01 验证申请证书（分步操作）=========="
echo ""

# 步骤1：启动 Certbot 并获取 TXT 记录值
echo "步骤1：获取需要添加的 DNS TXT 记录值..."
echo ""

# 使用 certbot 获取挑战信息
TXT_VALUE=$(sudo certbot certonly --manual --preferred-challenges dns -d $DOMAIN --dry-run --agree-tos --email admin@$DOMAIN 2>&1 | grep -A 1 "with the following value" | tail -1 | tr -d ' ')

# 如果 dry-run 失败，使用交互式方式
echo "请按照以下步骤操作："
echo ""
echo "1. 在另一个终端窗口运行以下命令获取 TXT 记录值："
echo "   sudo certbot certonly --manual --preferred-challenges dns -d $DOMAIN --agree-tos --email admin@$DOMAIN"
echo ""
echo "2. Certbot 会显示需要添加的 TXT 记录值"
echo ""
echo "3. 在阿里云 DNS 控制台添加 TXT 记录："
echo "   - 主机记录: _acme-challenge"
echo "   - 记录类型: TXT"
echo "   - 记录值: （Certbot 提供的值）"
echo ""
echo "4. 等待 5-10 分钟让 DNS 传播"
echo ""
echo "5. 验证 DNS 记录是否生效："
echo "   dig _acme-challenge.$DOMAIN TXT +short"
echo ""
echo "6. 如果返回了 TXT 记录值，再运行证书申请命令"
echo ""

read -p "按 Enter 开始交互式申请证书（会提示你添加 DNS 记录）..."

# 启动交互式申请
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
    
    # 配置 HTTPS
    echo ""
    echo "配置 HTTPS..."
    
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
    fi
    
    echo ""
    echo "========== 配置完成 =========="
    echo "✅ SSL 证书配置成功！"
    echo ""
    echo "HTTPS 地址: https://$DOMAIN"
    echo ""
else
    echo ""
    echo "❌ 证书申请失败"
    echo ""
    echo "请确保："
    echo "1. 已添加 DNS TXT 记录"
    echo "2. DNS 记录已生效（使用 dig 命令验证）"
    echo "3. 等待足够的时间让 DNS 传播（5-30 分钟）"
fi
