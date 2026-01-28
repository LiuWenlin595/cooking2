# DNS-01 验证申请证书详细步骤

## 当前状态

Certbot 已经提示你需要添加以下 DNS TXT 记录：

- **记录名称**：`_acme-challenge.pihaha.top`
- **记录值**：`3bYQICR8hJQE3lOTwcKexMx6pd6YSv-n22kgsmqsMPk`

## 操作步骤

### 步骤1：在阿里云 DNS 控制台添加 TXT 记录

1. **登录阿里云控制台**
   - 访问：https://dns.console.aliyun.com

2. **找到域名 `pihaha.top`**
   - 点击域名进入解析设置

3. **添加 TXT 记录**
   - 点击"添加记录"
   - 填写以下信息：
     ```
     主机记录: _acme-challenge
     记录类型: TXT
     记录值: 3bYQICR8hJQE3lOTwcKexMx6pd6YSv-n22kgsmqsMPk
     TTL: 600（或默认值）
     ```
   - 点击"确认"保存

### 步骤2：等待 DNS 传播

DNS 记录需要时间传播到全球 DNS 服务器，通常需要：
- **最快**：5-10 分钟
- **一般**：15-30 分钟
- **最长**：48 小时（很少见）

### 步骤3：验证 DNS 记录是否生效

在服务器上执行：

```bash
dig _acme-challenge.pihaha.top TXT +short
```

**如果返回：**
```
"3bYQICR8hJQE3lOTwcKexMx6pd6YSv-n22kgsmqsMPk"
```

说明 DNS 记录已生效，可以继续下一步。

**如果返回空或错误：**
- 等待更长时间（再等 10-20 分钟）
- 检查 DNS 记录是否正确添加
- 尝试使用其他 DNS 服务器查询：
  ```bash
  dig @8.8.8.8 _acme-challenge.pihaha.top TXT +short
  dig @223.5.5.5 _acme-challenge.pihaha.top TXT +short
  ```

### 步骤4：重新申请证书

DNS 记录生效后，在服务器上执行：

```bash
cd /opt/cooking-app-backend
sudo certbot certonly --manual \
    -d pihaha.top \
    --preferred-challenges dns \
    --agree-tos \
    --email admin@pihaha.top \
    --manual-public-ip-logging-ok
```

**注意：**
- Certbot 会再次显示需要添加的 TXT 记录值
- **如果值相同**，说明你之前添加的记录还在，直接按 Enter 继续
- **如果值不同**，需要更新 DNS 记录为新值，然后等待传播后再按 Enter

### 步骤5：配置 HTTPS

证书申请成功后，执行以下命令配置 HTTPS：

```bash
# 配置 Nginx HTTPS
sudo tee /etc/nginx/conf.d/cooking-app-backend.conf > /dev/null << 'EOF'
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name pihaha.top;
    return 301 https://$server_name$request_uri;
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    server_name pihaha.top;

    ssl_certificate /etc/letsencrypt/live/pihaha.top/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pihaha.top/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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

# 测试并重载 Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤6：测试 HTTPS

```bash
curl -k https://pihaha.top/health
```

如果返回 JSON 数据，说明 HTTPS 配置成功！

## 常见问题

### Q1: DNS 记录添加后多久生效？
A: 通常 5-30 分钟，最长 48 小时。

### Q2: 如何验证 DNS 记录是否生效？
A: 使用 `dig _acme-challenge.pihaha.top TXT +short` 命令。

### Q3: Certbot 提示的 TXT 值每次都不一样？
A: 是的，每次申请都会生成新的随机值。如果重新运行 Certbot，需要更新 DNS 记录为新值。

### Q4: 证书申请失败怎么办？
A: 
1. 检查 DNS 记录是否正确添加
2. 等待更长时间让 DNS 传播
3. 使用 `dig` 命令验证 DNS 记录
4. 查看 Certbot 日志：`sudo tail -50 /var/log/letsencrypt/letsencrypt.log`

## 下一步

证书配置成功后：
1. 修改小程序配置：`utils/cloudStorage.js`，设置 `apiBaseUrl: 'https://pihaha.top'`
2. 在微信公众平台配置服务器域名
3. 测试小程序登录功能
