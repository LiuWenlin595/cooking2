// pages/admin/recipe-manage/recipe-manage.js
const app = getApp();

Page({
  data: {
    recipes: [],
    categories: [],
    selectedCategory: 'all',
    searchKeyword: '',
    isAdmin: false
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

    this.setData({ isAdmin: true });
  },

  // 加载数据
  loadData() {
    const recipes = wx.getStorageSync('recipes') || [];
    const categories = wx.getStorageSync('categories') || [];
    const currentKitchen = app.globalData.currentKitchen;

    // 过滤当前厨房的菜谱
    const kitchenRecipes = recipes.filter(r => 
      !r.kitchenId || r.kitchenId === currentKitchen.id
    ).map(r => {
      const category = categories.find(c => c.id === r.categoryId);
      // 使用 Object.assign 替代展开运算符
      return Object.assign({}, r, {
        categoryName: category ? category.name : '未分类'
      });
    });

    this.setData({
      recipes: kitchenRecipes,
      categories
    });
  },

  // 搜索
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  // 选择分类
  selectCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      selectedCategory: categoryId
    });
  },

  // 获取过滤后的菜谱
  getFilteredRecipes() {
    // 使用 slice() 替代展开运算符
    let filtered = this.data.recipes.slice();

    // 按分类筛选
    if (this.data.selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.categoryId === this.data.selectedCategory);
    }

    // 按关键词筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filtered = filtered.filter(r =>
        (r.name && r.name.toLowerCase().includes(keyword)) ||
        (r.description && r.description.toLowerCase().includes(keyword))
      );
    }

    return filtered;
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
    const recipe = this.data.recipes.find(r => r.id === id);

    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${recipe.name}"吗？`,
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

  // 查看详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/recipe/detail/detail?id=${id}`
    });
  }
});
