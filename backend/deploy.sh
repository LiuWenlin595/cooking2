#!/bin/bash
# 后端服务部署脚本
# 适用于 AlibabaCloudLinux

echo "========== 开始部署后端服务 =========="

# 1. 更新系统
echo "1. 更新系统..."
sudo yum update -y

# 2. 安装 Node.js 和 npm
echo "2. 安装 Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# 检查 Node.js 版本
node -v
npm -v

# 3. 安装 PM2（进程管理器）
echo "3. 安装 PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# 4. 创建项目目录
echo "4. 创建项目目录..."
PROJECT_DIR="/opt/cooking-app-backend"
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# 5. 复制项目文件
echo "5. 复制项目文件..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# 6. 安装依赖
echo "6. 安装项目依赖..."
npm install

# 7. 创建配置文件
echo "7. 创建配置文件..."
cat > $PROJECT_DIR/.env << EOF
# 服务器配置
PORT=3000
NODE_ENV=production

# 阿里云OSS配置
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name

# 微信小程序配置
WX_APP_ID=your-miniprogram-appid
WX_APP_SECRET=your-miniprogram-secret
EOF

echo "✅ 配置文件已创建，请编辑 $PROJECT_DIR/.env 填入实际配置"

# 8. 创建 systemd 服务文件（可选，使用 PM2 管理）
echo "8. 配置 PM2..."
pm2 start aliyun-oss-server.js --name cooking-app-backend
pm2 save
pm2 startup

echo "========== 部署完成 =========="
echo "请执行以下步骤："
echo "1. 编辑 $PROJECT_DIR/.env 文件，填入实际配置"
echo "2. 重启服务: pm2 restart cooking-app-backend"
echo "3. 查看日志: pm2 logs cooking-app-backend"
echo "4. 配置防火墙开放 3000 端口"
