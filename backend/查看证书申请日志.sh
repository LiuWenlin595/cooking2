#!/bin/bash
# 查看证书申请日志

echo "========== Let's Encrypt 日志 =========="
echo ""
echo "最近 50 行日志:"
sudo tail -50 /var/log/letsencrypt/letsencrypt.log

echo ""
echo "========== 检查验证文件 =========="
echo ""
echo "验证目录中的文件:"
ls -la /var/www/html/.well-known/acme-challenge/ 2>/dev/null || echo "目录为空或不存在"

echo ""
echo "========== 检查 Nginx 配置 =========="
echo ""
sudo cat /etc/nginx/conf.d/cooking-app-backend.conf

echo ""
echo "========== 测试验证路径 =========="
echo ""
echo "测试访问验证路径:"
curl -v "http://pihaha.top/.well-known/acme-challenge/test" 2>&1 | head -20
