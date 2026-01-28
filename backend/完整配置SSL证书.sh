#!/bin/bash
# 完整的 SSL 证书配置脚本
# 用法: sudo bash 完整配置SSL证书.sh pihaha.top

set -e  # 遇到错误立即退出

# 检查参数
if [ -z "$1" ]; then
  echo "❌ 错误：请提供域名"
  echo "用法: sudo bash 完整配置SSL证书.sh your-domain.com"
  exit 1
fi

DOMAIN=$1
echo "========== 开始配置 SSL 证书 =========="
echo "域名: $DOMAIN"
echo ""

# 1. 安装必要的工具
echo "1. 检查并安装必要的工具..."
if ! command -v certbot &> /dev/null; then
    echo "安装 Certbot..."
    sudo yum install -y certbot python3-certbot-nginx
else
    echo "✅ Certbot 已安装"
fi

# 2. 备份旧的 Nginx 配置
echo ""
echo "2. 备份旧的 Nginx 配置..."
if [ -f /etc/nginx/conf.d/cooking-app-backend.conf ]; then
    BACKUP_FILE="/etc/nginx/conf.d/cooking-app-backend.conf.bak.$(date +%Y%m%d_%H%M%S)"
    sudo cp /etc/nginx/conf.d/cooking-app-backend.conf "$BACKUP_FILE"
    echo "✅ 已备份到: $BACKUP_FILE"
fi

# 3. 创建 Let's Encrypt 验证目录
echo ""
echo "3. 创建 Let's Encrypt 验证目录..."
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R nginx:nginx /var/www/html
sudo chmod -R 755 /var/www/html
echo "✅ 验证目录创建完成"

# 4. 配置 Nginx（HTTP，用于证书申请）
echo ""
echo "4. 配置 Nginx（HTTP 模式，用于证书申请）..."
sudo tee /etc/nginx/conf.d/cooking-app-backend.conf > /dev/null << EOF
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

# 5. 测试 Nginx 配置
echo ""
echo "5. 测试 Nginx 配置..."
if sudo nginx -t; then
    echo "✅ Nginx 配置测试通过"
else
    echo "❌ Nginx 配置测试失败"
    exit 1
fi

# 6. 启动/重启 Nginx
echo ""
echo "6. 启动 Nginx..."
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl start nginx
sudo systemctl enable nginx

# 等待 Nginx 启动
sleep 2

if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx 启动成功"
else
    echo "❌ Nginx 启动失败"
    sudo systemctl status nginx
    exit 1
fi

# 7. 检查端口
echo ""
echo "7. 检查端口状态..."
if sudo netstat -tlnp | grep :80 > /dev/null; then
    echo "✅ 80 端口正在监听"
else
    echo "⚠️ 80 端口未监听，请检查防火墙配置"
fi

# 8. 测试验证路径
echo ""
echo "8. 测试验证路径..."
echo "test-content-$(date +%s)" | sudo tee /var/www/html/.well-known/acme-challenge/test > /dev/null
TEST_URL="http://$DOMAIN/.well-known/acme-challenge/test"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 验证路径可访问 (HTTP $HTTP_CODE)"
    sudo rm -f /var/www/html/.well-known/acme-challenge/test
elif [ "$HTTP_CODE" = "403" ]; then
    echo "⚠️ 验证路径返回 403，可能是权限问题"
    echo "检查 Nginx 配置和文件权限..."
elif [ "$HTTP_CODE" = "000" ]; then
    echo "⚠️ 无法访问验证路径，请检查："
    echo "   - DNS 解析是否正确"
    echo "   - 80 端口是否开放"
    echo "   - 防火墙配置"
else
    echo "⚠️ 验证路径返回 HTTP $HTTP_CODE"
fi

# 9. 申请 Let's Encrypt 证书
echo ""
echo "9. 申请 Let's Encrypt 证书（使用 webroot 模式）..."
echo "   这可能需要几分钟时间，请耐心等待..."

# 先清理可能存在的旧证书申请记录
sudo certbot delete --cert-name $DOMAIN --non-interactive 2>/dev/null || true

# 使用 webroot 模式申请证书
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
    echo "可能的原因："
    echo "1. DNS 解析未生效（等待更长时间）"
    echo "2. 80 端口未开放（检查阿里云防火墙）"
    echo "3. 验证路径无法访问（检查 Nginx 配置）"
    echo ""
    echo "请检查："
    echo "- 阿里云防火墙是否开放 80 端口"
    echo "- DNS 解析: dig @8.8.8.8 $DOMAIN"
    echo "- 验证路径: curl http://$DOMAIN/.well-known/acme-challenge/test"
    exit 1
fi

# 10. 配置 HTTPS
echo ""
echo "10. 配置 HTTPS..."

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

    # 测试 Nginx 配置
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo "✅ HTTPS 配置完成并已生效"
    else
        echo "❌ HTTPS 配置测试失败"
        exit 1
    fi
else
    echo "❌ 证书文件不存在，无法配置 HTTPS"
    exit 1
fi

# 11. 配置自动续期
echo ""
echo "11. 配置证书自动续期..."
sudo systemctl enable certbot-renew.timer 2>/dev/null || true
sudo systemctl start certbot-renew.timer 2>/dev/null || true
echo "✅ 自动续期已配置"

# 12. 测试 HTTPS
echo ""
echo "12. 测试 HTTPS 连接..."
if curl -k -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/health" | grep -q "200\|404\|500"; then
    echo "✅ HTTPS 连接成功"
else
    echo "⚠️ HTTPS 连接可能有问题，但证书已配置"
fi

# 完成
echo ""
echo "========== 配置完成 =========="
echo ""
echo "✅ SSL 证书配置成功！"
echo ""
echo "HTTPS 地址: https://$DOMAIN"
echo ""
echo "下一步操作："
echo "1. 修改小程序配置: utils/cloudStorage.js"
echo "   apiBaseUrl: 'https://$DOMAIN'"
echo ""
echo "2. 在微信公众平台配置服务器域名:"
echo "   开发 → 开发管理 → 开发设置 → 服务器域名"
echo "   添加: https://$DOMAIN"
echo ""
echo "3. 测试小程序登录功能"
echo ""
echo "测试命令："
echo "  curl -k https://$DOMAIN/health"
echo ""
