// app.js
const cloudStorage = require('./utils/cloudStorage');

App({
  globalData: {
    userInfo: null,
    shopInfo: null,
    currentKitchen: null,
    isAdmin: false,
    orderNotification: true,
    isInitialized: false, // ⭐ 添加初始化标志
    useCloudStorage: false // ⭐ 是否使用云存储（需要配置后端服务）
  },

  // ⭐ 添加全局错误处理
  onError(msg) {
    console.error('========== 全局错误 ==========');
    console.error('错误信息:', msg);
    // 在真机上可以显示错误提示
    try {
      wx.showToast({
        title: '发生错误，请查看控制台',
        icon: 'none',
        duration: 3000
      });
    } catch (e) {
      console.error('显示错误提示失败:', e);
    }
  },

  onLaunch() {
    console.log('========== App onLaunch 开始 ==========');
    
    try {
      // ⭐ 修复：初始化本地存储数据（使用 try-catch 包裹，避免真机上阻塞）
      try {
        this.initLocalData();
      } catch (initError) {
        console.error('❌ initLocalData 失败:', initError);
        // 尝试强制初始化
        try {
          this.forceInit();
        } catch (forceError) {
          console.error('❌ forceInit 也失败:', forceError);
        }
      }
      
      // 验证初始化结果
      if (!this.globalData.shopInfo) {
        console.error('❌ 初始化后 shopInfo 为空！');
        // 强制重新初始化
        try {
          this.forceInit();
        } catch (forceError) {
          console.error('❌ forceInit 失败:', forceError);
        }
      } else {
        console.log('✅ shopInfo 初始化成功');
      }
      
      if (!this.globalData.currentKitchen) {
        console.error('❌ 初始化后 currentKitchen 为空！');
      } else {
        console.log('✅ currentKitchen 初始化成功');
      }
      
      // ⭐ 修复：不自动加载缓存的用户信息
      // 用户必须主动点击登录按钮，通过 wx.getUserProfile 授权才能登录
      // 这样可以确保每次都是用户自己的微信账号登录
      console.log('ℹ️ 应用启动，等待用户主动登录');
      this.globalData.userInfo = null;
      
      // ⭐ 修复：安全地加载订单通知设置
      try {
        const orderNotification = wx.getStorageSync('orderNotification');
        if (orderNotification !== undefined) {
          this.globalData.orderNotification = orderNotification;
        }
      } catch (e) {
        console.error('读取 orderNotification 失败:', e);
      }
      
      // ⭐ 标记初始化完成
      this.globalData.isInitialized = true;
      
      console.log('========== App初始化完成 ==========');
      console.log('shopInfo:', this.globalData.shopInfo);
      console.log('currentKitchen:', this.globalData.currentKitchen);
      console.log('userInfo:', this.globalData.userInfo);
      console.log('isInitialized:', this.globalData.isInitialized);
    } catch (error) {
      console.error('❌ App onLaunch 发生错误:', error);
      console.error('错误堆栈:', error.stack);
      // 尝试强制初始化
      try {
        this.forceInit();
      } catch (forceError) {
        console.error('❌ forceInit 也失败:', forceError);
      }
    }
  },
  
  // 强制初始化（当正常初始化失败时调用）
  forceInit() {
    console.log('========== 执行强制初始化 ==========');
    try {
      const defaultShop = {
        id: 'shop_001',
        name: '我的小店',
        avatar: '',
        background: '',
        intro: '欢迎来到我的小店',
        kitchens: [
          {
            id: 'kitchen_001',
            name: '主厨房',
            isDefault: true,
            admins: []
          }
        ],
        currentKitchenId: 'kitchen_001'
      };
      
      // 强制写入
      wx.setStorageSync('shopInfo', defaultShop);
      this.globalData.shopInfo = defaultShop;
      this.globalData.currentKitchen = defaultShop.kitchens[0];
      
      console.log('✅ 强制初始化完成');
      console.log('shopInfo:', this.globalData.shopInfo);
      console.log('currentKitchen:', this.globalData.currentKitchen);
    } catch (error) {
      console.error('❌ 强制初始化也失败了:', error);
    }
  },

  // 初始化本地数据
  initLocalData() {
    console.log('========== 开始初始化本地数据 ==========');
    
    try {
      // 初始化店铺信息
      let shopInfo = null;
      try {
        shopInfo = wx.getStorageSync('shopInfo');
        console.log('读取到的shopInfo:', shopInfo);
      } catch (error) {
        console.error('读取shopInfo失败:', error);
      }
      
      if (!shopInfo || typeof shopInfo !== 'object' || !shopInfo.id) {
        console.log('shopInfo不存在或无效，创建默认数据');
        const defaultShop = {
          id: 'shop_001',
          name: '我的小店',
          avatar: '',
          background: '',
          intro: '欢迎来到我的小店',
          kitchens: [
            {
              id: 'kitchen_001',
              name: '主厨房',
              isDefault: true,
              admins: []
            }
          ],
          currentKitchenId: 'kitchen_001'
        };
        
        try {
          wx.setStorageSync('shopInfo', defaultShop);
          console.log('✅ shopInfo 写入成功');
        } catch (error) {
          console.error('❌ shopInfo 写入失败:', error);
        }
        
        this.globalData.shopInfo = defaultShop;
        this.globalData.currentKitchen = defaultShop.kitchens[0];
        console.log('✅ 默认数据创建完成');
      } else {
        console.log('使用现有shopInfo');
        this.globalData.shopInfo = shopInfo;
        
        // 确保 kitchens 数组存在
        if (!shopInfo.kitchens || !Array.isArray(shopInfo.kitchens) || shopInfo.kitchens.length === 0) {
          console.warn('⚠️ shopInfo.kitchens 不存在或为空，创建默认厨房');
          shopInfo.kitchens = [{
            id: 'kitchen_001',
            name: '主厨房',
            isDefault: true,
            admins: []
          }];
          shopInfo.currentKitchenId = 'kitchen_001';
          wx.setStorageSync('shopInfo', shopInfo);
        }
        
        const currentKitchen = shopInfo.kitchens.find(k => k.id === shopInfo.currentKitchenId);
        this.globalData.currentKitchen = currentKitchen || shopInfo.kitchens[0];
        console.log('✅ currentKitchen:', this.globalData.currentKitchen);
      }

      // 初始化菜谱数据
      try {
        const recipes = wx.getStorageSync('recipes');
        if (!recipes || !Array.isArray(recipes)) {
          wx.setStorageSync('recipes', []);
          console.log('✅ recipes 初始化为空数组');
        } else {
          console.log(`✅ recipes 已存在，共 ${recipes.length} 条`);
        }
      } catch (error) {
        console.error('❌ recipes 初始化失败:', error);
        wx.setStorageSync('recipes', []);
      }

      // 初始化订单数据
      try {
        const orders = wx.getStorageSync('orders');
        if (!orders || !Array.isArray(orders)) {
          wx.setStorageSync('orders', []);
          console.log('✅ orders 初始化为空数组');
        } else {
          console.log(`✅ orders 已存在，共 ${orders.length} 条`);
        }
      } catch (error) {
        console.error('❌ orders 初始化失败:', error);
        wx.setStorageSync('orders', []);
      }

      // 初始化分类数据
      try {
        const categories = wx.getStorageSync('categories');
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
          const defaultCategories = [
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
          wx.setStorageSync('categories', defaultCategories);
          console.log('✅ categories 初始化完成，共10个分类');
        } else {
          console.log(`✅ categories 已存在，共 ${categories.length} 个分类`);
        }
      } catch (error) {
        console.error('❌ categories 初始化失败:', error);
      }
      
      console.log('========== 本地数据初始化完成 ==========');
    } catch (error) {
      console.error('❌ initLocalData 发生严重错误:', error);
      console.error('错误堆栈:', error.stack);
      
      // 最后的保险措施
      this.globalData.shopInfo = {
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
      this.globalData.currentKitchen = this.globalData.shopInfo.kitchens[0];
    }
  },

  // 获取用户信息（包含登录）
  // ⭐ 修复：使用微信官方 API，必须用户主动授权，不能自动登录
  // 参考：https://developers.weixin.qq.com/miniprogram/dev/api/open-api/user-info/wx.getUserProfile.html
  // ⚠️ 重要：wx.getUserProfile 必须在用户点击事件中直接调用，不能延迟或包装
  getUserInfo() {
    return new Promise((resolve, reject) => {
      console.log('========== 开始获取用户信息（需要用户授权） ==========');
      console.log('⚠️ 注意：wx.getUserProfile 必须在用户点击事件中直接调用');
      
      // ⭐ 关键修复：使用 wx.getUserProfile 获取用户信息
      // 此接口会弹出授权弹窗，用户必须主动点击"允许"才能获取信息
      // ⚠️ 必须在用户点击事件中直接调用，不能延迟调用
      // ⚠️ 如果不在用户点击事件中调用，会返回错误
      wx.getUserProfile({
        desc: '用于完善用户资料和身份识别', // 必填，声明获取用户个人信息后的用途
        success: (profileRes) => {
          console.log('✅ wx.getUserProfile 成功，用户已授权');
          console.log('获取到的用户信息:', {
            nickName: profileRes.userInfo.nickName,
            avatarUrl: profileRes.userInfo.avatarUrl ? '已设置' : '未设置',
            gender: profileRes.userInfo.gender,
            country: profileRes.userInfo.country,
            province: profileRes.userInfo.province,
            city: profileRes.userInfo.city
          });
          
          const userInfo = profileRes.userInfo;
          
          // ⭐ 然后调用 wx.login 获取登录凭证 code
          // 参考：https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html
          wx.login({
            success: (loginRes) => {
              const code = loginRes.code;
              console.log('✅ wx.login 成功，code:', code.substring(0, 10) + '...');
              
              // ⭐ 保存用户信息（这是用户自己的微信账号信息）
              const completeUserInfo = {
                nickName: userInfo.nickName,
                avatarUrl: userInfo.avatarUrl,
                code: code, // 登录凭证，可以发送到后端换取 openid
                loginTime: new Date().toISOString(),
                // 添加更多用户信息字段
                gender: userInfo.gender || 0,
                country: userInfo.country || '',
                province: userInfo.province || '',
                city: userInfo.city || '',
                language: userInfo.language || 'zh_CN'
              };
              
              // ⭐ 清除旧的用户信息，确保使用新的授权信息
              this.globalData.userInfo = null;
              try {
                wx.removeStorageSync('userInfo');
              } catch (e) {
                console.error('清除旧用户信息失败:', e);
              }
              
              // 保存到全局数据和本地存储
              this.globalData.userInfo = completeUserInfo;
              try {
                wx.setStorageSync('userInfo', completeUserInfo);
                console.log('✅ 用户信息已保存到本地存储');
                console.log('保存的用户昵称:', completeUserInfo.nickName);
                console.log('保存的用户头像:', completeUserInfo.avatarUrl ? '已设置' : '未设置');
              } catch (e) {
                console.error('保存用户信息到本地存储失败:', e);
              }
              
              // 重新检查管理员状态
              this.checkIsAdmin();
              
              // ⭐ 如果启用云存储，登录后自动从云端同步数据
              if (this.globalData.useCloudStorage && cloudStorage) {
                console.log('开始从云端同步数据...');
                cloudStorage.syncAllDataFromCloud().then((cloudData) => {
                  console.log('✅ 云端数据同步成功');
                  // 更新全局数据
                  if (cloudData.shopInfo) {
                    this.globalData.shopInfo = cloudData.shopInfo;
                    if (cloudData.shopInfo.kitchens && cloudData.shopInfo.kitchens.length > 0) {
                      const currentKitchen = cloudData.shopInfo.kitchens.find(k => k.id === cloudData.shopInfo.currentKitchenId) || cloudData.shopInfo.kitchens[0];
                      this.globalData.currentKitchen = currentKitchen;
                    }
                  }
                  // 重新检查管理员状态
                  this.checkIsAdmin();
                }).catch(err => {
                  console.error('❌ 云端数据同步失败:', err);
                  // 同步失败不影响登录，继续使用本地数据
                });
              }
              
              console.log('========== 登录成功 ==========');
              resolve(completeUserInfo);
            },
            fail: (loginErr) => {
              console.error('❌ wx.login 失败:', loginErr);
              
              // ⭐ 即使 login 失败，也保存用户信息（因为用户已经授权了）
              // 但标记 code 为空，表示登录凭证获取失败
              const completeUserInfo = {
                nickName: userInfo.nickName,
                avatarUrl: userInfo.avatarUrl,
                code: '', // 登录凭证获取失败
                loginTime: new Date().toISOString(),
                gender: userInfo.gender || 0,
                country: userInfo.country || '',
                province: userInfo.province || '',
                city: userInfo.city || '',
                language: userInfo.language || 'zh_CN'
              };
              
              // ⭐ 清除旧的用户信息
              this.globalData.userInfo = null;
              try {
                wx.removeStorageSync('userInfo');
              } catch (e) {
                console.error('清除旧用户信息失败:', e);
              }
              
              this.globalData.userInfo = completeUserInfo;
              try {
                wx.setStorageSync('userInfo', completeUserInfo);
              } catch (e) {
                console.error('保存用户信息失败:', e);
              }
              
              this.checkIsAdmin();
              
              // ⭐ 即使 login 失败，用户信息已经获取，仍然 resolve
              // 但可以提示用户登录凭证获取失败
              console.warn('⚠️ 登录凭证获取失败，但用户信息已保存');
              resolve(completeUserInfo);
            }
          });
        },
        fail: (err) => {
          console.error('❌ wx.getUserProfile 失败:', err);
          console.error('错误详情:', JSON.stringify(err));
          
          // ⭐ 关键修复：无论什么错误，都不从缓存获取
          // 必须用户主动授权才能登录，不能自动登录
          if (err.errMsg && err.errMsg.indexOf('cancel') > -1) {
            console.log('用户取消了授权');
            reject({ 
              errMsg: 'getUserProfile:fail cancel',
              message: '您取消了授权，无法登录'
            });
            return;
          }
          
          // ⭐ 检查是否是"不在用户点击事件中调用"的错误
          if (err.errMsg && (err.errMsg.indexOf('getUserProfile:fail') > -1 || err.errMsg.indexOf('not in user click') > -1)) {
            console.error('⚠️ wx.getUserProfile 必须在用户点击事件中直接调用');
            reject({
              errMsg: err.errMsg,
              message: '登录失败：必须在用户点击事件中调用，请重试'
            });
            return;
          }
          
          // ⭐ 其他错误也不从缓存获取，必须重新授权
          console.error('获取用户信息失败，需要用户重新授权');
          reject({
            errMsg: err.errMsg || 'getUserProfile:fail',
            message: '获取用户信息失败，请重试'
          });
        }
      });
    });
  },

  // 检查是否已登录
  // ⭐ 注意：这个方法只检查登录状态，不会自动登录
  // 只检查 globalData，不检查缓存，确保必须用户主动授权
  checkLogin() {
    // 只检查 globalData（当前会话的登录状态）
    // 不检查缓存，确保用户必须主动登录
    if (this.globalData.userInfo && this.globalData.userInfo.nickName) {
      return true;
    }
    
    return false;
  },

  // 要求登录（如果未登录则提示）
  requireLogin(callback) {
    console.log('requireLogin被调用');
    
    if (this.checkLogin()) {
      // 已登录，直接执行回调
      console.log('用户已登录，执行回调');
      if (callback) {
        try {
          callback();
        } catch (err) {
          console.error('回调执行出错:', err);
        }
      }
      return true;
    } else {
      // 未登录，提示登录
      console.log('用户未登录，显示登录提示');
      wx.showModal({
        title: '需要登录',
        content: '请先登录后再进行操作',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            console.log('用户确认登录');
            this.getUserInfo().then((userInfo) => {
              console.log('登录成功:', userInfo);
              wx.showToast({
                title: '登录成功',
                icon: 'success',
                duration: 1500
              });
              // 登录成功后执行回调（不使用 setTimeout）
              if (callback) {
                try {
                  callback();
                } catch (err) {
                  console.error('回调执行出错:', err);
                }
              }
            }).catch((err) => {
              console.error('登录失败详情:', err);
              
              // 根据错误类型显示不同提示
              let errorMsg = '登录失败，请重试';
              
              if (err.errMsg && err.errMsg.indexOf('cancel') > -1) {
                errorMsg = '您取消了授权';
              } else if (err.errMsg && err.errMsg.indexOf('fail') > -1) {
                errorMsg = '登录失败，请检查网络';
              }
              
              wx.showModal({
                title: '登录失败',
                content: errorMsg,
                showCancel: false
              });
            });
          } else {
            console.log('用户取消登录');
          }
        }
      });
      return false;
    }
  },

  // 更新店铺信息（同时保存到本地和云端）
  updateShopInfo(shopInfo) {
    this.globalData.shopInfo = shopInfo;
    wx.setStorageSync('shopInfo', shopInfo);
    const currentKitchen = shopInfo.kitchens.find(k => k.id === shopInfo.currentKitchenId);
    this.globalData.currentKitchen = currentKitchen || shopInfo.kitchens[0];
    
    // ⭐ 如果启用云存储，同时上传到云端
    if (this.globalData.useCloudStorage && cloudStorage && this.globalData.userInfo && this.globalData.userInfo.openid) {
      cloudStorage.uploadData('shopInfo', shopInfo).catch(err => {
        console.error('上传shopInfo到云端失败:', err);
      });
    }
  },
  
  // ⭐ 保存数据到本地和云端（统一的数据保存方法）
  saveDataToLocalAndCloud(dataType, data) {
    // 保存到本地
    wx.setStorageSync(dataType, data);
    
    // 如果启用云存储，同时上传到云端
    if (this.globalData.useCloudStorage && cloudStorage && this.globalData.userInfo && this.globalData.userInfo.openid) {
      cloudStorage.uploadData(dataType, data).catch(err => {
        console.error(`上传${dataType}到云端失败:`, err);
      });
    }
  },

  // 切换厨房
  switchKitchen(kitchenId) {
    const shopInfo = this.globalData.shopInfo;
    const kitchen = shopInfo.kitchens.find(k => k.id === kitchenId);
    if (kitchen) {
      shopInfo.currentKitchenId = kitchenId;
      this.globalData.currentKitchen = kitchen;
      this.updateShopInfo(shopInfo);
    }
  },

  // 检查是否为管理员
  checkIsAdmin() {
    const shopInfo = this.globalData.shopInfo;
    const currentKitchen = this.globalData.currentKitchen;
    
    if (!shopInfo || !currentKitchen) {
      this.globalData.isAdmin = false;
      return false;
    }

    const admins = currentKitchen.admins || [];
    const userInfo = this.globalData.userInfo;
    
    // 如果是第一次使用（没有管理员），当前登录用户自动成为管理员
    if (admins.length === 0 && currentKitchen.isDefault && userInfo && userInfo.nickName) {
      const newAdmin = {
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl || '',
        addTime: new Date().toISOString()
      };
      admins.push(newAdmin);
      currentKitchen.admins = admins;
      this.updateShopInfo(shopInfo);
      this.globalData.isAdmin = true;
      console.log('首次使用，自动成为管理员:', userInfo.nickName);
      return true;
    }

    if (!userInfo || !userInfo.nickName) {
      this.globalData.isAdmin = false;
      return false;
    }

    // 检查当前用户的昵称是否在管理员列表中
    const isAdmin = admins.some(admin => admin.nickName === userInfo.nickName);

    this.globalData.isAdmin = isAdmin;
    console.log('管理员检查:', userInfo.nickName, '是否是管理员:', isAdmin);
    return isAdmin;
  },

  // 获取所有数据（用于导出）
  getAllData() {
    return {
      shopInfo: wx.getStorageSync('shopInfo'),
      recipes: wx.getStorageSync('recipes'),
      orders: wx.getStorageSync('orders'),
      categories: wx.getStorageSync('categories'),
      exportTime: new Date().toISOString()
    };
  },

  // 导入数据
  importData(data) {
    try {
      if (data.shopInfo) {
        wx.setStorageSync('shopInfo', data.shopInfo);
        this.globalData.shopInfo = data.shopInfo;
        const currentKitchen = data.shopInfo.kitchens.find(k => k.id === data.shopInfo.currentKitchenId);
        this.globalData.currentKitchen = currentKitchen || data.shopInfo.kitchens[0];
      }
      if (data.recipes) {
        wx.setStorageSync('recipes', data.recipes);
      }
      if (data.orders) {
        wx.setStorageSync('orders', data.orders);
      }
      if (data.categories) {
        wx.setStorageSync('categories', data.categories);
      }
      return true;
    } catch (e) {
      console.error('导入数据失败:', e);
      return false;
    }
  }
});
