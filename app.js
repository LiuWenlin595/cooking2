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
    // 初始化本地存储数据
    this.initLocalData();
    // 尝试从本地存储加载用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
    
    // 加载订单通知设置
    const orderNotification = wx.getStorageSync('orderNotification');
    if (orderNotification !== undefined) {
      this.globalData.orderNotification = orderNotification;
    }
  },

  // 初始化本地数据
  initLocalData() {
    // 初始化店铺信息
    const shopInfo = wx.getStorageSync('shopInfo');
    if (!shopInfo) {
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
      wx.setStorageSync('shopInfo', defaultShop);
      this.globalData.shopInfo = defaultShop;
      this.globalData.currentKitchen = defaultShop.kitchens[0];
    } else {
      this.globalData.shopInfo = shopInfo;
      const currentKitchen = shopInfo.kitchens.find(k => k.id === shopInfo.currentKitchenId);
      this.globalData.currentKitchen = currentKitchen || shopInfo.kitchens[0];
    }

    // 初始化菜谱数据
    const recipes = wx.getStorageSync('recipes');
    if (!recipes) {
      wx.setStorageSync('recipes', []);
    }

    // 初始化订单数据
    const orders = wx.getStorageSync('orders');
    if (!orders) {
      wx.setStorageSync('orders', []);
    }

    // 初始化分类数据
    const categories = wx.getStorageSync('categories');
    if (!categories) {
      const defaultCategories = [
        { id: 'cat_001', name: '田园时蔬', icon: '🥬' },
        { id: 'cat_002', name: '肉肉炒菜', icon: '🥩' },
        { id: 'cat_003', name: '硬核荤菜', icon: '🍖' },
        { id: 'cat_004', name: '水产海鲜', icon: '🐟' },
        { id: 'cat_005', name: '功夫炖汤', icon: '🍲' },
        { id: 'cat_006', name: '清爽凉拌', icon: '🥗' },
        { id: 'cat_007', name: '小吃速食', icon: '🍜' },
        { id: 'cat_008', name: '煎炸烤卤', icon: '🍗' },
        { id: 'cat_009', name: '炸锅美食', icon: '🍤' },
        { id: 'cat_010', name: '再来亿碗', icon: '🍚' }
      ];
      wx.setStorageSync('categories', defaultCategories);
    }
  },

  // 获取用户信息
  getUserInfo() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          this.globalData.userInfo = res.userInfo;
          wx.setStorageSync('userInfo', res.userInfo);
          resolve(res.userInfo);
        },
        fail: (err) => {
          const userInfo = wx.getStorageSync('userInfo');
          if (userInfo) {
            this.globalData.userInfo = userInfo;
            resolve(userInfo);
          } else {
            reject(err);
          }
        }
      });
    });
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
    if (!currentKitchen || !shopInfo) return false;
    
    const userInfo = this.globalData.userInfo;
    if (!userInfo) return false;

    // 检查当前用户是否在管理员列表中
    const admins = currentKitchen.admins || [];
    const isAdmin = admins.some(admin => 
      admin.nickName === userInfo.nickName || admin.openid === userInfo.openid
    );
    
    this.globalData.isAdmin = isAdmin;
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
