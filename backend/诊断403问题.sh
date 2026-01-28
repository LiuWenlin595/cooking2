#!/bin/bash
# 诊断 403 问题的脚本

DOMAIN="pihaha.top"

echo "========== 诊断 403 问题 =========="
echo ""

# 1. 检查验证文件是否存在
echo "1. 检查验证文件..."
TEST_FILE="/var/www/html/.well-known/acme-challenge/test"
echo "test-content-$(date +%s)" | sudo tee "$TEST_FILE" > /dev/null
if [ -f "$TEST_FILE" ]; then
    echo "✅ 验证文件存在: $TEST_FILE"
    echo "文件内容: $(cat $TEST_FILE)"
    echo "文件权限: $(ls -l $TEST_FILE)"
else
    echo "❌ 验证文件不存在"
fi

# 2. 检查目录权限
echo ""
echo "2. 检查目录权限..."
echo "/var/www/html 权限:"
ls -ld /var/www/html
echo ""
echo "/var/www/html/.well-known 权限:"
ls -ld /var/www/html/.well-known 2>/dev/null || echo "目录不存在"
echo ""
echo "/var/www/html/.well-known/acme-challenge 权限:"
ls -ld /var/www/html/.well-known/acme-challenge 2>/dev/null || echo "目录不存在"

# 3. 检查 Nginx 配置
echo ""
echo "3. 检查 Nginx 配置..."
echo "当前配置:"
sudo cat /etc/nginx/conf.d/cooking-app-backend.conf

# 4. 检查 Nginx 错误日志
echo ""
echo "4. 检查 Nginx 错误日志（最近 20 行）..."
sudo tail -20 /var/log/nginx/error.log 2>/dev/null || echo "无错误日志"

# 5. 检查 Nginx 访问日志
echo ""
echo "5. 检查 Nginx 访问日志（最近 10 行）..."
sudo tail -10 /var/log/nginx/access.log 2>/dev/null || echo "无访问日志"

# 6. 从外部测试访问
echo ""
echo "6. 从外部测试访问..."
echo "测试 URL: http://$DOMAIN/.well-known/acme-challenge/test"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/.well-known/acme-challenge/test" 2>&1)
echo "HTTP 状态码: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 外部可以访问"
elif [ "$HTTP_CODE" = "403" ]; then
    echo "❌ 外部返回 403，可能是权限或配置问题"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "❌ 无法连接，可能是防火墙问题"
else
    echo "⚠️ 返回 HTTP $HTTP_CODE"
fi

# 7. 检查防火墙
echo ""
echo "7. 检查防火墙状态..."
if command -v firewall-cmd &> /dev/null; then
    if sudo systemctl is-active --quiet firewalld; then
        echo "FirewallD 状态: 运行中"
        echo "开放的端口:"
        sudo firewall-cmd --list-ports
    else
        echo "FirewallD 状态: 未运行（可能使用阿里云安全组）"
    fi
else
    echo "未安装 FirewallD（使用阿里云安全组）"
fi

# 8. 检查端口监听
echo ""
echo "8. 检查端口监听..."
echo "80 端口:"
sudo netstat -tlnp | grep :80 || echo "未监听"
echo ""
echo "443 端口:"
sudo netstat -tlnp | grep :443 || echo "未监听"

# 9. 测试本地访问
echo ""
echo "9. 测试本地访问..."
LOCAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/.well-known/acme-challenge/test")
echo "本地 HTTP 状态码: $LOCAL_CODE"

# 10. 检查 SELinux（如果启用）
echo ""
echo "10. 检查 SELinux 状态..."
if command -v getenforce &> /dev/null; then
    SELINUX_STATUS=$(getenforce)
    echo "SELinux 状态: $SELINUX_STATUS"
    if [ "$SELINUX_STATUS" != "Disabled" ]; then
        echo "⚠️ SELinux 已启用，可能需要配置上下文"
        echo "尝试设置上下文:"
        echo "sudo semanage fcontext -a -t httpd_sys_content_t '/var/www/html(/.*)?'"
        echo "sudo restorecon -Rv /var/www/html"
    fi
else
    echo "未安装 SELinux 工具"
fi

echo ""
echo "========== 诊断完成 =========="
