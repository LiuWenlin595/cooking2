# 云存储配置指南

## 概述

本小程序已集成阿里云OSS云存储功能，可以将数据保存到云端，实现多设备同步。

## 架构说明

由于小程序无法直接访问阿里云OSS，需要通过后端服务器中转：

```
小程序 → 后端服务器 → 阿里云OSS
```

## 配置步骤

### 1. 配置阿里云OSS

1. **创建OSS Bucket**
   - 登录阿里云控制台
   - 进入OSS服务
   - 创建Bucket（建议选择与小程序服务器相同的区域）
   - 记录Bucket名称和区域

2. **获取AccessKey**
   - 在阿里云控制台创建AccessKey
   - 记录AccessKeyId和AccessKeySecret
   - ⚠️ 注意：不要将AccessKey暴露在前端代码中

### 2. 部署后端服务

#### 方案A：使用服务器部署

1. **安装依赖**
   ```bash
   cd backend
   npm install
   ```

2. **配置信息**
   - 编辑 `backend/aliyun-oss-server.js`
   - 修改 `ossConfig` 中的配置：
     ```javascript
     const ossConfig = {
       region: 'oss-cn-hangzhou', // 你的OSS区域
       accessKeyId: 'your-access-key-id',
       accessKeySecret: 'your-access-key-secret',
       bucket: 'your-bucket-name'
     };
     ```
   - 修改 `wxConfig` 中的小程序配置：
     ```javascript
     const wxConfig = {
       appId: 'your-miniprogram-appid',
       appSecret: 'your-miniprogram-secret'
     };
     ```

3. **启动服务**
   ```bash
   npm start
   ```

4. **配置域名**
   - 将服务器地址配置到小程序中
   - 编辑 `utils/cloudStorage.js`：
     ```javascript
     const config = {
       apiBaseUrl: 'https://your-server.com/api'
     };
     ```

#### 方案B：使用阿里云函数计算

1. **创建函数**
   - 在阿里云函数计算中创建新函数
   - 选择Node.js运行时
   - 上传 `backend/aliyun-oss-server.js` 代码

2. **配置环境变量**
   - 在函数配置中添加环境变量：
     - OSS_REGION
     - OSS_ACCESS_KEY_ID
     - OSS_ACCESS_KEY_SECRET
     - OSS_BUCKET
     - WX_APP_ID
     - WX_APP_SECRET

3. **配置触发器**
   - 创建HTTP触发器
   - 获取函数URL

4. **配置小程序**
   - 编辑 `utils/cloudStorage.js`：
     ```javascript
     const config = {
       apiBaseUrl: 'https://your-function.aliyuncs.com/api'
     };
     ```

### 3. 配置小程序

1. **修改云存储配置**
   - 编辑 `utils/cloudStorage.js`
   - 修改 `config.apiBaseUrl` 为你的后端服务地址

2. **配置服务器域名**
   - 在微信公众平台 → 开发 → 开发管理 → 开发设置
   - 添加服务器域名到"request合法域名"

## 数据存储结构

数据在OSS中的存储路径：

```
users/
  └── {openid}/
      ├── shopInfo.json      # 店铺信息
      ├── recipes.json       # 菜谱数据
      ├── orders.json        # 订单数据
      └── categories.json    # 分类数据
```

## 使用方法

### 在代码中使用云存储

```javascript
const cloudStorage = require('../../utils/cloudStorage');

// 上传数据
cloudStorage.uploadData('recipes', recipes).then(() => {
  console.log('上传成功');
});

// 下载数据
cloudStorage.downloadData('recipes').then((data) => {
  console.log('下载成功', data);
});

// 同步所有数据到云端
cloudStorage.syncAllDataToCloud().then(() => {
  console.log('同步成功');
});

// 从云端同步所有数据
cloudStorage.syncAllDataFromCloud().then((data) => {
  console.log('同步成功', data);
});
```

## 安全注意事项

1. **不要在前端代码中暴露AccessKey**
   - AccessKey必须保存在后端服务器
   - 使用环境变量或配置文件管理

2. **使用HTTPS**
   - 确保所有API请求使用HTTPS
   - 配置SSL证书

3. **验证用户身份**
   - 后端需要验证用户的openid
   - 防止数据被非法访问

4. **数据加密**
   - 敏感数据建议加密存储
   - 使用OSS的服务器端加密功能

## 故障排查

### 1. 上传失败
- 检查后端服务是否正常运行
- 检查OSS配置是否正确
- 检查网络连接

### 2. 下载失败
- 检查数据是否存在
- 检查openid是否正确
- 检查OSS权限配置

### 3. 获取openid失败
- 检查小程序AppID和AppSecret是否正确
- 检查code是否有效（code只能使用一次）
- 检查微信接口是否正常

## 测试

1. **测试上传**
   - 在小程序中创建一些数据
   - 调用上传接口
   - 在OSS控制台检查文件是否存在

2. **测试下载**
   - 清除本地数据
   - 调用下载接口
   - 检查数据是否正确恢复

3. **测试多设备同步**
   - 在设备A上创建数据并上传
   - 在设备B上下载数据
   - 检查数据是否一致
