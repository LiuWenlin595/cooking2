// pages/kitchen/kitchen.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    shopInfo: null,
    currentKitchen: null,
    categories: [],
    selectedCategory: 'all',
    recipes: [],
    filteredRecipes: [],
    searchKeyword: '',
    showSearch: false,
    cartCount: 0,
    isAdmin: false,
    mode: 'order' // 'order' 或 'edit'
  },

  onLoad() {
    // 延迟加载，确保app.js初始化完成
    setTimeout(() => {
      this.loadData();
    }, 100);
  },

  onShow() {
    this.loadData();
    this.updateCartCount();
  },

  // 加载数据
  loadData() {
    const shopInfo = app.globalData.shopInfo;
    const currentKitchen = app.globalData.currentKitchen;
    
    // 检查必要数据
    if (!shopInfo || !currentKitchen) {
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
      return;
    }
    
    const categories = wx.getStorageSync('categories') || [];
    const recipes = wx.getStorageSync('recipes') || [];
    
    // 过滤当前厨房的菜谱，并添加分类名称
    const kitchenRecipes = recipes.filter(r => 
      !r.kitchenId || r.kitchenId === currentKitchen.id
    ).map(r => {
      const category = categories.find(c => c.id === r.categoryId);
      return {
        ...r,
        categoryName: category ? category.name : ''
      };
    });

    this.setData({
      shopInfo,
      currentKitchen,
      categories,
      recipes: kitchenRecipes,
      isAdmin: app.checkIsAdmin()
    });

    this.filterRecipes();
    // 切换厨房时清空购物车
    this.clearCartIfKitchenChanged();
  },

  // 筛选菜谱
  filterRecipes() {
    let filtered = [...this.data.recipes];
    
    // 按分类筛选
    if (this.data.selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.categoryId === this.data.selectedCategory);
    }
    
    // 按搜索关键词筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(keyword) ||
        (r.description && r.description.toLowerCase().includes(keyword)) ||
        (r.categoryName && r.categoryName.toLowerCase().includes(keyword))
      );
    }

    // 必点菜优先
    filtered.sort((a, b) => {
      if (a.isMustHave && !b.isMustHave) return -1;
      if (!a.isMustHave && b.isMustHave) return 1;
      return 0;
    });

    this.setData({
      filteredRecipes: filtered
    });
  },

  // 选择分类
  selectCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      selectedCategory: categoryId
    });
    this.filterRecipes();
  },

  // 切换模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      mode
    });
  },

  // 显示搜索
  showSearchInput() {
    this.setData({
      showSearch: true
    });
  },

  // 隐藏搜索
  hideSearch() {
    this.setData({
      showSearch: false,
      searchKeyword: ''
    });
    this.filterRecipes();
  },

  // 搜索输入（添加防抖）
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({
      searchKeyword: keyword
    });
    
    // 清除之前的定时器
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    
    // 防抖处理，300ms后执行搜索
    this.searchTimer = setTimeout(() => {
      this.filterRecipes();
    }, 300);
  },

  // 跳转到菜谱详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/recipe/detail/detail?id=${id}`
    });
  },

  // 添加菜谱到购物车
  addToCart(e) {
    const id = e.currentTarget.dataset.id;
    const recipe = this.data.recipes.find(r => r.id === id);
    if (!recipe) {
      wx.showToast({
        title: '菜谱不存在',
        icon: 'none'
      });
      return;
    }

    if (!this.data.currentKitchen) {
      wx.showToast({
        title: '厨房信息错误',
        icon: 'none'
      });
      return;
    }

    let cart = wx.getStorageSync('cart') || [];
    
    // 如果购物车属于其他厨房，先清空
    if (cart.length > 0 && cart[0].kitchenId && cart[0].kitchenId !== this.data.currentKitchen.id) {
      cart = [];
    }
    
    const existingItem = cart.find(item => item.recipeId === id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        recipeId: id,
        recipeName: recipe.name,
        recipeImage: recipe.image,
        price: recipe.price || 0,
        quantity: 1,
        kitchenId: this.data.currentKitchen.id // 记录厨房ID
      });
    }

    wx.setStorageSync('cart', cart);
    this.updateCartCount();
    
    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1500
    });
  },

  // 更新购物车数量
  updateCartCount() {
    const cart = wx.getStorageSync('cart') || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    this.setData({
      cartCount: count
    });
  },

  // 跳转到购物车/下单
  goToCart() {
    const cart = wx.getStorageSync('cart') || [];
    if (cart.length === 0) {
      wx.showToast({
        title: '购物车为空',
        icon: 'none'
      });
      return;
    }
    // 显示备注输入框
    this.showOrderRemarkInput();
  },

  // 显示订单备注输入
  showOrderRemarkInput() {
    wx.showModal({
      title: '订单备注',
      editable: true,
      placeholderText: '请输入订单备注（可选）',
      success: (res) => {
        if (res.confirm) {
          this.createOrder(res.content || '');
        }
      }
    });
  },

  // 创建订单
  createOrder(remark = '') {
    const cart = wx.getStorageSync('cart') || [];
    if (cart.length === 0) return;

    if (!this.data.currentKitchen) {
      wx.showToast({
        title: '厨房信息错误',
        icon: 'none'
      });
      return;
    }

    const order = {
      id: util.generateId(),
      kitchenId: this.data.currentKitchen.id,
      kitchenName: this.data.currentKitchen.name,
      items: cart.map(item => ({
        recipeId: item.recipeId,
        recipeName: item.recipeName,
        recipeImage: item.recipeImage,
        price: item.price,
        quantity: item.quantity
      })),
      totalPrice: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      status: 'pending',
      remark: remark || '', // 添加备注
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };

    let orders = wx.getStorageSync('orders') || [];
    orders.unshift(order);
    wx.setStorageSync('orders', orders);

    // 清空购物车
    wx.setStorageSync('cart', []);
    this.updateCartCount();

    wx.showToast({
      title: '下单成功',
      icon: 'success'
    });

    // 如果开启了订单通知
    if (app.globalData.orderNotification) {
      wx.showModal({
        title: '新订单',
        content: '您有新的订单，请及时处理',
        showCancel: false
      });
    }
  },

  // 检查并清空购物车（如果切换了厨房）
  clearCartIfKitchenChanged() {
    const cart = wx.getStorageSync('cart') || [];
    if (cart.length > 0 && cart[0].kitchenId) {
      // 如果购物车中有厨房ID，且与当前厨房不一致，清空购物车
      if (cart[0].kitchenId !== this.data.currentKitchen.id) {
        wx.setStorageSync('cart', []);
        this.updateCartCount();
      }
    }
  },

  // 添加菜谱
  addRecipe() {
    wx.navigateTo({
      url: '/pages/recipe/add/add'
    });
  },

  // 编辑菜谱
  editRecipe(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/recipe/add/add?id=${id}`
    });
  },

  // 删除菜谱
  deleteRecipe(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个菜谱吗？',
      success: (res) => {
        if (res.confirm) {
          let recipes = wx.getStorageSync('recipes') || [];
          recipes = recipes.filter(r => r.id !== id);
          wx.setStorageSync('recipes', recipes);
          this.loadData();
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 跳转到店铺设置
  goToSettings() {
    wx.navigateTo({
      url: '/pages/shop/settings/settings'
    });
  },

  // 切换厨房
  switchKitchen() {
    wx.navigateTo({
      url: '/pages/shop/kitchen-list/kitchen-list'
    });
  },

  // 邀请下单
  inviteOrder() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 图片加载错误处理
  onImageError(e) {
    const id = e.currentTarget.dataset.id;
    const recipe = this.data.recipes.find(r => r.id === id);
    if (recipe && !recipe.image) {
      // 如果图片加载失败且没有默认图片，设置默认图片
      recipe.image = '/images/default-recipe.png';
      this.setData({
        recipes: this.data.recipes
      });
    }
  }
});
