#!/bin/bash
# 一键部署脚本（服务器本地存储版）
# 适用于 AlibabaCloudLinux

echo "========== 开始部署后端服务（本地存储版）=========="

# 服务器IP
SERVER_IP="47.112.167.11"

# 1. 更新系统
echo "1. 更新系统..."
sudo yum update -y

# 2. 安装 Node.js 和 npm
echo "2. 安装 Node.js..."
if ! command -v node &> /dev/null; then
    echo "安装 Node.js 18..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
else
    echo "Node.js 已安装: $(node -v)"
fi

# 检查 Node.js 版本
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# 3. 安装 PM2（进程管理器）
echo "3. 安装 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    sudo npm install -g pm2
else
    echo "PM2 已安装: $(pm2 -v)"
fi

# 4. 创建项目目录
echo "4. 创建项目目录..."
PROJECT_DIR="/opt/cooking-app-backend"
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# 5. 进入项目目录
cd $PROJECT_DIR

# 6. 安装依赖
echo "6. 安装项目依赖..."
if [ -f "package.json" ]; then
    npm install
else
    echo "安装依赖包..."
    npm init -y
    npm install express axios cors
fi

# 7. 创建配置文件
echo "7. 创建配置文件..."
cat > $PROJECT_DIR/.env << 'EOF'
# 服务器配置
PORT=3000
NODE_ENV=production
DATA_DIR=/opt/cooking-app-backend/data

# 微信小程序配置
WX_APP_ID=wxc3444090274b6825
WX_APP_SECRET=709e1351be01dac7f40c9102352b3655
EOF

echo "✅ 配置文件已创建"

# 8. 创建数据目录
echo "8. 创建数据目录..."
mkdir -p $PROJECT_DIR/data
chmod 755 $PROJECT_DIR/data

# 9. 停止旧服务（如果存在）
echo "9. 停止旧服务..."
pm2 stop cooking-app-backend 2>/dev/null || true
pm2 delete cooking-app-backend 2>/dev/null || true

# 10. 启动服务
echo "10. 启动服务..."
if [ -f "simple-server.js" ]; then
    pm2 start simple-server.js --name cooking-app-backend
else
    echo "❌ 错误：找不到 simple-server.js 文件"
    echo "请确保 simple-server.js 文件在 $PROJECT_DIR 目录中"
    exit 1
fi

# 11. 保存 PM2 配置
pm2 save

# 12. 设置开机自启
echo "12. 设置开机自启..."
pm2 startup | grep -v "PM2" | bash || true

# 13. 配置防火墙
echo "13. 配置防火墙..."
if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
    sudo firewall-cmd --reload 2>/dev/null || true
    echo "✅ 防火墙已配置"
else
    echo "⚠️ 未找到 firewall-cmd，请手动配置防火墙开放 3000 端口"
fi

# 14. 测试服务
echo "14. 测试服务..."
sleep 2
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ 服务运行正常"
    curl http://localhost:3000/health
else
    echo "⚠️ 服务可能未正常启动，请检查日志: pm2 logs cooking-app-backend"
fi

echo ""
echo "========== 部署完成 =========="
echo "服务地址: http://$SERVER_IP:3000"
echo "健康检查: http://$SERVER_IP:3000/health"
echo ""
echo "常用命令："
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs cooking-app-backend"
echo "  重启服务: pm2 restart cooking-app-backend"
echo "  停止服务: pm2 stop cooking-app-backend"
echo ""
echo "数据存储位置: $PROJECT_DIR/data"
echo "====================================="
