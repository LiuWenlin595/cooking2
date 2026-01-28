#!/bin/bash
# 上传文件到服务器的脚本
# 在本地电脑执行

SERVER_IP="47.112.167.11"
SERVER_USER="root"
PROJECT_DIR="/opt/cooking-app-backend"

echo "========== 上传文件到服务器 =========="
echo "服务器: $SERVER_USER@$SERVER_IP"
echo "目标目录: $PROJECT_DIR"
echo ""

# 检查文件是否存在
if [ ! -f "simple-server.js" ]; then
    echo "❌ 错误：找不到 simple-server.js 文件"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ 错误：找不到 package.json 文件"
    exit 1
fi

# 自动接受SSH密钥（首次连接）
echo "首次连接服务器，需要确认SSH密钥..."
ssh-keyscan -H $SERVER_IP >> ~/.ssh/known_hosts 2>/dev/null

# 上传文件
echo "上传文件..."
scp -o StrictHostKeyChecking=no simple-server.js package.json $SERVER_USER@$SERVER_IP:$PROJECT_DIR/

if [ -f "一键部署.sh" ]; then
    scp -o StrictHostKeyChecking=no 一键部署.sh $SERVER_USER@$SERVER_IP:$PROJECT_DIR/
    ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "chmod +x $PROJECT_DIR/一键部署.sh"
fi

echo ""
echo "✅ 文件上传完成"
echo ""
echo "下一步："
echo "1. 连接到服务器: ssh $SERVER_USER@$SERVER_IP"
echo "2. 进入目录: cd $PROJECT_DIR"
echo "3. 运行部署脚本: ./一键部署.sh"
echo "   或手动执行: bash 一键部署.sh"
