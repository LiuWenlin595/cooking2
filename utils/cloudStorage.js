// utils/cloudStorage.js
// 阿里云OSS云存储服务工具类

/**
 * 云存储配置
 * ⚠️ 注意：需要配置你的后端服务器地址
 */
const config = {
  // 后端服务器地址（需要替换为你的实际地址）
  apiBaseUrl: 'https://your-server.com/api',
  // 或者使用阿里云函数计算地址
  // apiBaseUrl: 'https://your-function.aliyuncs.com/api'
};

/**
 * 获取用户唯一标识（openid）
 * 需要通过后端接口获取，因为小程序无法直接获取openid
 * ⭐ 注意：如果用户信息中已有 openid，直接返回；否则需要通过 code 获取
 */
function getUserOpenId() {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    // 如果已经有 openid，直接返回
    if (userInfo && userInfo.openid) {
      resolve(userInfo.openid);
      return;
    }
    
    // 如果没有 code，无法获取 openid
    if (!userInfo || !userInfo.code) {
      reject(new Error('用户未登录或code不存在'));
      return;
    }
    
    // 调用后端接口获取openid
    wx.request({
      url: `${config.apiBaseUrl}/user/getOpenId`,
      method: 'POST',
      data: {
        code: userInfo.code
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          const openid = res.data.data.openid;
          // 保存openid到用户信息中
          userInfo.openid = openid;
          app.globalData.userInfo = userInfo;
          wx.setStorageSync('userInfo', userInfo);
          resolve(openid);
        } else {
          reject(new Error(res.data.message || '获取openid失败'));
        }
      },
      fail: (err) => {
        console.error('获取openid失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 上传数据到云存储
 * @param {string} dataType - 数据类型：'shopInfo', 'recipes', 'orders', 'categories'
 * @param {any} data - 要保存的数据
 */
function uploadData(dataType, data) {
  return new Promise(async (resolve, reject) => {
    try {
      // 获取用户openid
      const openid = await getUserOpenId();
      
      // 准备上传的数据
      const uploadData = {
        openid: openid,
        dataType: dataType,
        data: data,
        timestamp: new Date().toISOString()
      };
      
      // 调用后端接口上传数据
      wx.request({
        url: `${config.apiBaseUrl}/data/upload`,
        method: 'POST',
        data: uploadData,
        header: {
          'content-type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            console.log(`✅ ${dataType} 上传成功`);
            resolve(res.data);
          } else {
            console.error(`❌ ${dataType} 上传失败:`, res.data.message);
            reject(new Error(res.data.message || '上传失败'));
          }
        },
        fail: (err) => {
          console.error(`❌ ${dataType} 上传失败:`, err);
          reject(err);
        }
      });
    } catch (error) {
      console.error(`❌ ${dataType} 上传失败:`, error);
      reject(error);
    }
  });
}

/**
 * 从云存储下载数据
 * @param {string} dataType - 数据类型：'shopInfo', 'recipes', 'orders', 'categories'
 */
function downloadData(dataType) {
  return new Promise(async (resolve, reject) => {
    try {
      // 获取用户openid
      const openid = await getUserOpenId();
      
      // 调用后端接口下载数据
      wx.request({
        url: `${config.apiBaseUrl}/data/download`,
        method: 'POST',
        data: {
          openid: openid,
          dataType: dataType
        },
        header: {
          'content-type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            console.log(`✅ ${dataType} 下载成功`);
            resolve(res.data.data);
          } else {
            console.log(`ℹ️ ${dataType} 不存在或下载失败，返回空数据`);
            // 如果数据不存在，返回默认值
            resolve(getDefaultData(dataType));
          }
        },
        fail: (err) => {
          console.error(`❌ ${dataType} 下载失败:`, err);
          // 下载失败时返回默认值
          resolve(getDefaultData(dataType));
        }
      });
    } catch (error) {
      console.error(`❌ ${dataType} 下载失败:`, error);
      // 下载失败时返回默认值
      resolve(getDefaultData(dataType));
    }
  });
}

/**
 * 获取默认数据
 */
function getDefaultData(dataType) {
  switch (dataType) {
    case 'shopInfo':
      return {
        id: 'shop_001',
        name: '我的小店',
        avatar: '',
        background: '',
        intro: '欢迎来到我的小店',
        kitchens: [{
          id: 'kitchen_001',
          name: '主厨房',
          isDefault: true,
          admins: []
        }],
        currentKitchenId: 'kitchen_001'
      };
    case 'recipes':
      return [];
    case 'orders':
      return [];
    case 'categories':
      return [
        { id: 'cat_001', name: '田园时蔬' },
        { id: 'cat_002', name: '肉肉炒菜' },
        { id: 'cat_003', name: '硬核荤菜' },
        { id: 'cat_004', name: '水产海鲜' },
        { id: 'cat_005', name: '功夫炖汤' },
        { id: 'cat_006', name: '清爽凉拌' },
        { id: 'cat_007', name: '小吃速食' },
        { id: 'cat_008', name: '煎炸烤卤' },
        { id: 'cat_009', name: '炸锅美食' },
        { id: 'cat_010', name: '再来亿碗' }
      ];
    default:
      return null;
  }
}

/**
 * 同步所有数据到云存储
 */
function syncAllDataToCloud() {
  return new Promise(async (resolve, reject) => {
    try {
      const app = getApp();
      
      // 获取所有本地数据
      const shopInfo = wx.getStorageSync('shopInfo');
      const recipes = wx.getStorageSync('recipes') || [];
      const orders = wx.getStorageSync('orders') || [];
      const categories = wx.getStorageSync('categories') || [];
      
      // 依次上传所有数据
      const uploadPromises = [];
      
      if (shopInfo) {
        uploadPromises.push(uploadData('shopInfo', shopInfo));
      }
      uploadPromises.push(uploadData('recipes', recipes));
      uploadPromises.push(uploadData('orders', orders));
      uploadPromises.push(uploadData('categories', categories));
      
      await Promise.all(uploadPromises);
      
      console.log('✅ 所有数据已同步到云存储');
      resolve();
    } catch (error) {
      console.error('❌ 同步数据到云存储失败:', error);
      reject(error);
    }
  });
}

/**
 * 从云存储同步所有数据
 */
function syncAllDataFromCloud() {
  return new Promise(async (resolve, reject) => {
    try {
      wx.showLoading({
        title: '同步数据中...',
        mask: true
      });
      
      // 依次下载所有数据
      const [shopInfo, recipes, orders, categories] = await Promise.all([
        downloadData('shopInfo'),
        downloadData('recipes'),
        downloadData('orders'),
        downloadData('categories')
      ]);
      
      // 保存到本地存储
      if (shopInfo) {
        wx.setStorageSync('shopInfo', shopInfo);
        const app = getApp();
        app.globalData.shopInfo = shopInfo;
        if (shopInfo.kitchens && shopInfo.kitchens.length > 0) {
          const currentKitchen = shopInfo.kitchens.find(k => k.id === shopInfo.currentKitchenId) || shopInfo.kitchens[0];
          app.globalData.currentKitchen = currentKitchen;
        }
      }
      
      wx.setStorageSync('recipes', recipes);
      wx.setStorageSync('orders', orders);
      wx.setStorageSync('categories', categories);
      
      wx.hideLoading();
      
      console.log('✅ 所有数据已从云存储同步');
      resolve({ shopInfo, recipes, orders, categories });
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 从云存储同步数据失败:', error);
      reject(error);
    }
  });
}

module.exports = {
  uploadData,
  downloadData,
  syncAllDataToCloud,
  syncAllDataFromCloud,
  getUserOpenId,
  config
};
