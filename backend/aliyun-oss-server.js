// backend/aliyun-oss-server.js
// 阿里云OSS后端服务示例代码（Node.js + Express）
// 需要部署到服务器或使用阿里云函数计算

const express = require('express');
const OSS = require('ali-oss');
const axios = require('axios');

const app = express();
app.use(express.json());

// ⚠️ 配置你的阿里云OSS信息
const ossConfig = {
  region: 'oss-cn-hangzhou', // 你的OSS区域
  accessKeyId: 'your-access-key-id',
  accessKeySecret: 'your-access-key-secret',
  bucket: 'your-bucket-name'
};

// 创建OSS客户端
const client = new OSS(ossConfig);

// 微信小程序配置
const wxConfig = {
  appId: 'your-miniprogram-appid',
  appSecret: 'your-miniprogram-secret'
};

/**
 * 获取用户openid
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
    
    // 调用微信接口获取openid
    const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: wxConfig.appId,
        secret: wxConfig.appSecret,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });
    
    if (response.data.errcode) {
      return res.json({
        success: false,
        message: response.data.errmsg || '获取openid失败'
      });
    }
    
    res.json({
      success: true,
      data: {
        openid: response.data.openid,
        session_key: response.data.session_key
      }
    });
  } catch (error) {
    console.error('获取openid失败:', error);
    res.json({
      success: false,
      message: '服务器错误'
    });
  }
});

/**
 * 上传数据到OSS
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
    
    // OSS文件路径：users/{openid}/{dataType}.json
    const objectKey = `users/${openid}/${dataType}.json`;
    
    // 将数据转换为JSON字符串
    const dataString = JSON.stringify(data);
    
    // 上传到OSS
    const result = await client.put(objectKey, Buffer.from(dataString), {
      'Content-Type': 'application/json'
    });
    
    console.log(`✅ 数据上传成功: ${objectKey}`);
    
    res.json({
      success: true,
      data: {
        url: result.url,
        objectKey: objectKey
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
 * 从OSS下载数据
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
    
    // OSS文件路径：users/{openid}/{dataType}.json
    const objectKey = `users/${openid}/${dataType}.json`;
    
    try {
      // 从OSS下载数据
      const result = await client.get(objectKey);
      const data = JSON.parse(result.content.toString());
      
      console.log(`✅ 数据下载成功: ${objectKey}`);
      
      res.json({
        success: true,
        data: data
      });
    } catch (error) {
      // 如果文件不存在，返回空数据
      if (error.code === 'NoSuchKey') {
        console.log(`ℹ️ 文件不存在: ${objectKey}`);
        res.json({
          success: true,
          data: null
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('下载数据失败:', error);
    res.json({
      success: false,
      message: '下载失败: ' + error.message
    });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

// 如果使用阿里云函数计算，导出handler函数
exports.handler = async (event, context) => {
  // 函数计算的handler实现
  // 需要根据阿里云函数计算的格式实现
};
