// backend/simple-server.js
// 简化版后端服务（不使用OSS，直接存储在服务器本地）
// 适用于轻量应用服务器，数据量不大的情况

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// 支持 JSON 请求体
app.use(express.json());

// 配置 CORS（允许小程序跨域请求）
app.use(cors({
  origin: '*', // 生产环境建议设置为具体的小程序域名
  credentials: true
}));

// ⚠️ 从环境变量读取配置或使用默认值
const wxConfig = {
  appId: process.env.WX_APP_ID || 'your-miniprogram-appid',
  appSecret: process.env.WX_APP_SECRET || 'your-miniprogram-secret'
};

// 数据存储目录（存储在服务器本地）
const DATA_DIR = process.env.DATA_DIR || '/opt/cooking-app-backend/data';

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('✅ 创建数据目录:', DATA_DIR);
}

// 验证配置
if (wxConfig.appId === 'your-miniprogram-appid') {
  console.warn('⚠️ 警告：请配置微信小程序信息！');
}

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    storage: '本地存储'
  });
});

/**
 * 获取用户openid
 * POST /api/user/getOpenId
 * Body: { code: "微信登录凭证" }
 */
app.post('/api/user/getOpenId', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.json({
        success: false,
        message: 'code不能为空'
      });
    }
    
    console.log('收到获取 openid 请求，code:', code.substring(0, 10) + '...');
    
    // 调用微信接口获取openid
    const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: wxConfig.appId,
        secret: wxConfig.appSecret,
        js_code: code,
        grant_type: 'authorization_code'
      },
      timeout: 10000 // 10秒超时
    });
    
    if (response.data.errcode) {
      console.error('微信接口返回错误:', response.data);
      return res.json({
        success: false,
        message: response.data.errmsg || '获取openid失败',
        errcode: response.data.errcode
      });
    }
    
    console.log('✅ 获取 openid 成功:', response.data.openid);
    
    res.json({
      success: true,
      data: {
        openid: response.data.openid,
        session_key: response.data.session_key
      }
    });
  } catch (error) {
    console.error('获取openid失败:', error.message);
    res.json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

/**
 * 上传数据到服务器本地
 * POST /api/data/upload
 * Body: { openid: "用户openid", dataType: "数据类型", data: {} }
 */
app.post('/api/data/upload', async (req, res) => {
  try {
    const { openid, dataType, data } = req.body;
    
    if (!openid || !dataType || !data) {
      return res.json({
        success: false,
        message: '参数不完整'
      });
    }
    
    // 用户数据目录：data/users/{openid}/
    const userDir = path.join(DATA_DIR, 'users', openid);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // 文件路径：data/users/{openid}/{dataType}.json
    const filePath = path.join(userDir, `${dataType}.json`);
    
    // 将数据保存为JSON文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`✅ 数据上传成功: ${filePath}`);
    
    res.json({
      success: true,
      data: {
        filePath: filePath,
        message: '数据已保存到服务器本地'
      }
    });
  } catch (error) {
    console.error('上传数据失败:', error);
    res.json({
      success: false,
      message: '上传失败: ' + error.message
    });
  }
});

/**
 * 从服务器本地下载数据
 * POST /api/data/download
 * Body: { openid: "用户openid", dataType: "数据类型" }
 */
app.post('/api/data/download', async (req, res) => {
  try {
    const { openid, dataType } = req.body;
    
    if (!openid || !dataType) {
      return res.json({
        success: false,
        message: '参数不完整'
      });
    }
    
    // 文件路径：data/users/{openid}/{dataType}.json
    const filePath = path.join(DATA_DIR, 'users', openid, `${dataType}.json`);
    
    try {
      // 读取文件
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        console.log(`✅ 数据下载成功: ${filePath}`);
        
        res.json({
          success: true,
          data: data
        });
      } else {
        // 文件不存在，返回空数据
        console.log(`ℹ️ 文件不存在: ${filePath}`);
        res.json({
          success: true,
          data: null
        });
      }
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('下载数据失败:', error);
    res.json({
      success: false,
      message: '下载失败: ' + error.message
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('========== 后端服务启动成功（本地存储版）==========');
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`数据存储目录: ${DATA_DIR}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`获取 openid: POST http://localhost:${PORT}/api/user/getOpenId`);
  console.log('================================================');
});
