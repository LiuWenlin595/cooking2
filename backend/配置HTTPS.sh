#!/bin/bash
# 配置 HTTPS 的脚本
# 在服务器上执行

echo "========== 配置 HTTPS =========="

# 1. 安装 Nginx
echo "1. 安装 Nginx..."
sudo yum install -y nginx

# 2. 安装 Certbot（用于申请 Let's Encrypt 免费证书）
echo "2. 安装 Certbot..."
sudo yum install -y certbot python3-certbot-nginx

# 3. 配置 Nginx（使用自签名证书，因为IP地址无法申请Let's Encrypt证书）
echo "3. 生成自签名证书..."

# 创建证书目录
sudo mkdir -p /etc/nginx/ssl

# 生成自签名证书（有效期1年）
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/server.key \
  -out /etc/nginx/ssl/server.crt \
  -subj "/C=CN/ST=State/L=City/O=Organization/CN=47.112.167.11"

# 4. 配置 Nginx
echo "4. 配置 Nginx..."
sudo tee /etc/nginx/conf.d/cooking-app-backend.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name 47.112.167.11;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 47.112.167.11;

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 5. 测试 Nginx 配置
echo "5. 测试 Nginx 配置..."
sudo nginx -t

# 6. 启动 Nginx
echo "6. 启动 Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# 7. 配置防火墙
echo "7. 配置防火墙..."
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

echo ""
echo "========== HTTPS 配置完成 =========="
echo "HTTPS 地址: https://47.112.167.11"
echo ""
echo "⚠️ 注意："
echo "1. 使用的是自签名证书，浏览器会显示不安全警告（这是正常的）"
echo "2. 小程序中需要在小程序配置中允许自签名证书"
echo "3. 正式发布时建议申请域名并使用 Let's Encrypt 免费证书"
echo ""
echo "测试 HTTPS:"
echo "curl -k https://47.112.167.11/health"
