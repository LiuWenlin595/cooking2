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
    this.checkAdminAccess();
  },

  onShow() {
    this.checkAdminAccess();
    this.loadData();
  },

  // 检查管理员权限
  checkAdminAccess() {
    const isAdmin = app.checkIsAdmin();
    
    if (!isAdmin) {
      wx.showModal({
        title: '权限不足',
        content: '您不是管理员，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    this.setData({
      isAdmin: true,
      currentKitchen: app.globalData.currentKitchen,
      shopInfo: app.globalData.shopInfo
    });
  },

  // 加载数据
  loadData() {
    const recipes = wx.getStorageSync('recipes') || [];
    const categories = wx.getStorageSync('categories') || [];
    const orders = wx.getStorageSync('orders') || [];
    const currentKitchen = app.globalData.currentKitchen;

    // 统计当前厨房的数据
    const kitchenRecipes = recipes.filter(r => 
      !r.kitchenId || r.kitchenId === currentKitchen.id
    );
    const kitchenOrders = orders.filter(o => 
      o.kitchenId === currentKitchen.id
    );

    this.setData({
      stats: {
        recipeCount: kitchenRecipes.length,
        categoryCount: categories.length,
        orderCount: kitchenOrders.length
      }
    });
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
