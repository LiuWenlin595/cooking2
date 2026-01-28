#!/bin/bash
# 检查防火墙和安全策略

DOMAIN="pihaha.top"

echo "========== 检查防火墙和安全策略 =========="
echo ""

# 1. 检查是否有其他防火墙
echo "1. 检查系统防火墙..."
if command -v firewall-cmd &> /dev/null; then
    if sudo systemctl is-active --quiet firewalld; then
        echo "FirewallD 状态: 运行中"
        sudo firewall-cmd --list-all
    else
        echo "FirewallD 状态: 未运行"
    fi
else
    echo "未安装 FirewallD"
fi

# 2. 检查 iptables
echo ""
echo "2. 检查 iptables..."
if command -v iptables &> /dev/null; then
    echo "iptables 规则:"
    sudo iptables -L -n | head -20
else
    echo "未安装 iptables"
fi

# 3. 检查是否有安全软件
echo ""
echo "3. 检查安全软件..."
if [ -f /etc/selinux/config ]; then
    echo "SELinux 状态: $(getenforce)"
fi

# 4. 测试从不同位置访问
echo ""
echo "4. 测试访问..."
echo "从服务器本地访问:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost/.well-known/acme-challenge/test" || echo "无法访问"

echo ""
echo "从外部访问（使用域名）:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://$DOMAIN/.well-known/acme-challenge/test" || echo "无法访问"

# 5. 检查 Nginx 访问日志中的 403 记录
echo ""
echo "5. 检查 Nginx 访问日志中的 403 记录（最近 20 条）:"
sudo grep "403" /var/log/nginx/access.log 2>/dev/null | tail -20 || echo "没有 403 记录"

# 6. 检查是否有 WAF 或安全策略
echo ""
echo "6. 检查 Nginx 模块..."
sudo nginx -V 2>&1 | grep -i "module" | head -10

# 7. 检查 Let's Encrypt IP 范围
echo ""
echo "7. Let's Encrypt 常用 IP 范围:"
echo "   - 可能被防火墙阻止"
echo "   - 建议临时允许所有 IP 访问 80 端口进行验证"

echo ""
echo "========== 建议 =========="
echo ""
echo "如果 Let's Encrypt 一直返回 403，可能的原因："
echo "1. 阿里云安全组或防火墙阻止了 Let's Encrypt 的 IP"
echo "2. 有 WAF（Web 应用防火墙）阻止了请求"
echo "3. Nginx 配置有问题"
echo ""
echo "解决方案："
echo "1. 检查阿里云安全组，确保 80 端口对所有 IP 开放"
echo "2. 临时禁用任何 WAF 或安全策略"
echo "3. 使用 DNS-01 验证（不需要 HTTP 访问）"
echo ""
