#!/bin/bash
# 测试外部访问

DOMAIN="pihaha.top"

echo "========== 测试外部访问 =========="
echo ""

# 1. 测试健康检查
echo "1. 测试健康检查接口..."
curl -k -v https://$DOMAIN/health 2>&1 | head -30

echo ""
echo ""

# 2. 测试登录接口
echo "2. 测试登录接口（模拟小程序请求）..."
curl -k -X POST https://$DOMAIN/api/user/getOpenId \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0" \
  -d '{"code":"test_code_12345"}' \
  -v 2>&1 | head -40

echo ""
echo ""

# 3. 检查 Nginx 访问日志
echo "3. 检查最近的访问日志..."
sudo tail -5 /var/log/nginx/access.log

echo ""
echo "4. 检查最近的错误日志..."
sudo tail -5 /var/log/nginx/error.log

echo ""
echo "========== 测试完成 =========="
