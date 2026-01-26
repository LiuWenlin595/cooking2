// pages/admin/admin.js
const app = getApp();

Page({
  data: {
    isAdmin: false,
    currentKitchen: null,
    shopInfo: null,
    stats: {
      recipeCount: 0,
      categoryCount: 0,
      orderCount: 0
    }
  },

  onLoad() {
    console.log('===== admin/admin onLoad 开始 =====');
    
    // ⭐ 修复：立即设置默认数据，确保页面有内容显示（防止真机白屏）
    this.setData({
      isAdmin: false,
      currentKitchen: null,
      shopInfo: null,
      stats: {
        recipeCount: 0,
        categoryCount: 0,
        orderCount: 0
      }
    }, () => {
      console.log('✅ 默认数据设置完成');
    });
    
    try {
      this.checkAdminAccess();
    } catch (error) {
      console.error('onLoad 发生错误:', error);
      // 即使出错也保持默认数据显示
    }
  },

  onShow() {
    this.checkAdminAccess();
    this.loadData();
  },

  // 检查管理员权限
  checkAdminAccess() {
    try {
      let isAdmin = false;
      try {
        isAdmin = app.checkIsAdmin();
      } catch (e) {
        console.error('检查管理员权限失败:', e);
      }
      
      if (!isAdmin) {
        // ⭐ 修复：延迟显示提示，确保页面先渲染
        if (typeof wx.nextTick === 'function') {
          wx.nextTick(() => {
            wx.showModal({
              title: '权限不足',
              content: '您不是管理员，无法访问此页面',
              showCancel: false,
              success: () => {
                wx.navigateBack();
              }
            });
          });
        } else {
          setTimeout(() => {
            wx.showModal({
              title: '权限不足',
              content: '您不是管理员，无法访问此页面',
              showCancel: false,
              success: () => {
                wx.navigateBack();
              }
            });
          }, 500);
        }
        return;
      }

      let currentKitchen = null;
      let shopInfo = null;
      try {
        currentKitchen = app.globalData.currentKitchen;
        shopInfo = app.globalData.shopInfo;
      } catch (e) {
        console.error('读取数据失败:', e);
      }

      this.setData({
        isAdmin: true,
        currentKitchen: currentKitchen,
        shopInfo: shopInfo
      });
    } catch (error) {
      console.error('checkAdminAccess 发生错误:', error);
    }
  },

  // 加载数据
  loadData() {
    try {
      let recipes = [];
      let categories = [];
      let orders = [];
      let currentKitchen = null;
      
      try {
        recipes = wx.getStorageSync('recipes') || [];
        categories = wx.getStorageSync('categories') || [];
        orders = wx.getStorageSync('orders') || [];
        currentKitchen = app.globalData.currentKitchen;
      } catch (e) {
        console.error('读取数据失败:', e);
      }

      // 统计当前厨房的数据
      let kitchenRecipes = [];
      let kitchenOrders = [];
      
      if (currentKitchen && currentKitchen.id) {
        try {
          kitchenRecipes = recipes.filter(r => 
            !r.kitchenId || r.kitchenId === currentKitchen.id
          );
          kitchenOrders = orders.filter(o => 
            o.kitchenId === currentKitchen.id
          );
        } catch (e) {
          console.error('过滤数据失败:', e);
        }
      }

      this.setData({
        stats: {
          recipeCount: kitchenRecipes.length,
          categoryCount: categories.length,
          orderCount: kitchenOrders.length
        }
      });
    } catch (error) {
      console.error('loadData 发生错误:', error);
      // 即使出错也设置默认值
      this.setData({
        stats: {
          recipeCount: 0,
          categoryCount: 0,
          orderCount: 0
        }
      });
    }
  },

  // 管理菜谱
  manageRecipes() {
    wx.navigateTo({
      url: '/pages/admin/recipe-manage/recipe-manage'
    });
  },

  // 管理分类
  manageCategories() {
    wx.navigateTo({
      url: '/pages/shop/category-list/category-list'
    });
  },

  // 管理订单
  manageOrders() {
    wx.switchTab({
      url: '/pages/order/list/list'
    });
  },

  // 管理厨房
  manageKitchen() {
    wx.navigateTo({
      url: '/pages/shop/kitchen-list/kitchen-list'
    });
  },

  // 添加菜谱
  addRecipe() {
    wx.navigateTo({
      url: '/pages/recipe/add/add'
    });
  },

  // 店铺设置
  shopSettings() {
    wx.navigateTo({
      url: '/pages/shop/settings/settings'
    });
  }
});
