#!/bin/bash
# 检查服务器状态

echo "========== 检查服务器状态 =========="
echo ""

# 1. 检查 Node.js 后端服务
echo "1. 检查 Node.js 后端服务（3000端口）..."
if sudo netstat -tlnp | grep :3000 > /dev/null; then
    echo "✅ 3000 端口正在监听"
    sudo netstat -tlnp | grep :3000
else
    echo "❌ 3000 端口未监听，后端服务可能未运行"
    echo "请检查: pm2 list"
fi

# 2. 检查 Nginx 状态
echo ""
echo "2. 检查 Nginx 状态..."
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx 正在运行"
    sudo systemctl status nginx --no-pager | head -10
else
    echo "❌ Nginx 未运行"
    echo "请启动: sudo systemctl start nginx"
fi

# 3. 检查端口监听
echo ""
echo "3. 检查端口监听..."
echo "80 端口:"
sudo netstat -tlnp | grep :80 || echo "未监听"
echo ""
echo "443 端口:"
sudo netstat -tlnp | grep :443 || echo "未监听"

# 4. 检查 Nginx 配置
echo ""
echo "4. 检查 Nginx 配置..."
if sudo nginx -t; then
    echo "✅ Nginx 配置正确"
else
    echo "❌ Nginx 配置有错误"
fi

# 5. 检查证书文件
echo ""
echo "5. 检查证书文件..."
if [ -f /etc/letsencrypt/live/pihaha.top/fullchain.pem ]; then
    echo "✅ 证书文件存在"
    ls -lh /etc/letsencrypt/live/pihaha.top/*.pem
else
    echo "❌ 证书文件不存在"
fi

# 6. 测试本地连接
echo ""
echo "6. 测试本地连接..."
echo "HTTP (80):"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost/health || echo "无法连接"
echo ""
echo "HTTPS (443):"
curl -k -s -o /dev/null -w "HTTP %{http_code}\n" https://localhost/health || echo "无法连接"

# 7. 检查 Nginx 错误日志
echo ""
echo "7. 检查 Nginx 错误日志（最近 10 行）..."
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "无错误日志"

# 8. 检查 PM2 进程
echo ""
echo "8. 检查 PM2 进程..."
if command -v pm2 &> /dev/null; then
    pm2 list
else
    echo "PM2 未安装"
fi

echo ""
echo "========== 检查完成 =========="
