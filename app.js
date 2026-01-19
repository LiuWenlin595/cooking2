// app.js
App({
  globalData: {
    userInfo: null,
    shopInfo: null,
    currentKitchen: null,
    isAdmin: false,
    orderNotification: true
  },

  onLaunch() {
    console.log('========== App onLaunch 开始 ==========');
    
    try {
      // 初始化本地存储数据
      this.initLocalData();
      
      // 验证初始化结果
      if (!this.globalData.shopInfo) {
        console.error('❌ 初始化后 shopInfo 为空！');
        // 强制重新初始化
        this.forceInit();
      } else {
        console.log('✅ shopInfo 初始化成功');
      }
      
      if (!this.globalData.currentKitchen) {
        console.error('❌ 初始化后 currentKitchen 为空！');
      } else {
        console.log('✅ currentKitchen 初始化成功');
      }
      
      // 尝试从本地存储加载用户信息
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.globalData.userInfo = userInfo;
        console.log('✅ 加载缓存的用户信息:', userInfo);
      } else {
        console.log('ℹ️ 没有缓存的用户信息');
      }
      
      // 加载订单通知设置
      const orderNotification = wx.getStorageSync('orderNotification');
      if (orderNotification !== undefined) {
        this.globalData.orderNotification = orderNotification;
      }
      
      console.log('========== App初始化完成 ==========');
      console.log('shopInfo:', this.globalData.shopInfo);
      console.log('currentKitchen:', this.globalData.currentKitchen);
      console.log('userInfo:', this.globalData.userInfo);
    } catch (error) {
      console.error('❌ App onLaunch 发生错误:', error);
      console.error('错误堆栈:', error.stack);
      // 尝试强制初始化
      this.forceInit();
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
  getUserInfo() {
    return new Promise((resolve, reject) => {
      console.log('开始获取用户信息...');
      
      // ⭐ 关键修复：先调用 wx.getUserProfile（必须在用户手势上下文中立即调用）
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (profileRes) => {
          console.log('wx.getUserProfile 成功');
          const userInfo = profileRes.userInfo;
          
          // 然后再调用 wx.login 获取 code
          wx.login({
            success: (loginRes) => {
              const code = loginRes.code;
              console.log('wx.login 成功，code:', code);
              
              // 保存用户信息
              const completeUserInfo = {
                nickName: userInfo.nickName,
                avatarUrl: userInfo.avatarUrl,
                code: code,
                loginTime: new Date().toISOString()
              };
              
              this.globalData.userInfo = completeUserInfo;
              wx.setStorageSync('userInfo', completeUserInfo);
              console.log('用户信息已保存:', completeUserInfo);
              
              // 重新检查管理员状态
              this.checkIsAdmin();
              
              resolve(completeUserInfo);
            },
            fail: (loginErr) => {
              console.error('wx.login 失败:', loginErr);
              
              // 即使 login 失败，也保存用户信息（不带 code）
              const completeUserInfo = {
                nickName: userInfo.nickName,
                avatarUrl: userInfo.avatarUrl,
                code: '',
                loginTime: new Date().toISOString()
              };
              
              this.globalData.userInfo = completeUserInfo;
              wx.setStorageSync('userInfo', completeUserInfo);
              console.log('用户信息已保存(无code):', completeUserInfo);
              
              this.checkIsAdmin();
              resolve(completeUserInfo);
            }
          });
        },
        fail: (err) => {
          console.error('wx.getUserProfile 失败:', err);
          
          // 如果用户取消授权，不从缓存获取
          if (err.errMsg && err.errMsg.indexOf('cancel') > -1) {
            reject({ errMsg: 'getUserProfile:fail cancel' });
            return;
          }
          
          // 其他错误，尝试从缓存获取
          const userInfo = wx.getStorageSync('userInfo');
          if (userInfo && userInfo.nickName) {
            console.log('从缓存获取用户信息');
            this.globalData.userInfo = userInfo;
            this.checkIsAdmin();
            resolve(userInfo);
          } else {
            reject(err);
          }
        }
      });
    });
  },

  // 检查是否已登录
  checkLogin() {
    const userInfo = this.globalData.userInfo || wx.getStorageSync('userInfo');
    return !!(userInfo && userInfo.nickName);
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

  // 更新店铺信息
  updateShopInfo(shopInfo) {
    this.globalData.shopInfo = shopInfo;
    wx.setStorageSync('shopInfo', shopInfo);
    const currentKitchen = shopInfo.kitchens.find(k => k.id === shopInfo.currentKitchenId);
    this.globalData.currentKitchen = currentKitchen || shopInfo.kitchens[0];
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
