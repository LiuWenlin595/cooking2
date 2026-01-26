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
    console.log('===== admin/recipe-manage onLoad 开始 =====');
    
    // ⭐ 修复：立即设置默认数据，确保页面有内容显示（防止真机白屏）
    this.setData({
      recipes: [],
      categories: [],
      selectedCategory: 'all',
      searchKeyword: '',
      isAdmin: false
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

      this.setData({ isAdmin: true });
    } catch (error) {
      console.error('checkAdminAccess 发生错误:', error);
    }
  },

  // 加载数据
  loadData() {
    try {
      let recipes = [];
      let categories = [];
      let currentKitchen = null;
      
      try {
        recipes = wx.getStorageSync('recipes') || [];
        categories = wx.getStorageSync('categories') || [];
        currentKitchen = app.globalData.currentKitchen;
      } catch (e) {
        console.error('读取数据失败:', e);
      }

      // 过滤当前厨房的菜谱
      let kitchenRecipes = [];
      if (currentKitchen && currentKitchen.id) {
        try {
          kitchenRecipes = recipes.filter(r => 
            !r.kitchenId || r.kitchenId === currentKitchen.id
          ).map(r => {
            const category = categories.find(c => c.id === r.categoryId);
            // 使用 Object.assign 替代展开运算符
            return Object.assign({}, r, {
              categoryName: category ? category.name : '未分类'
            });
          });
        } catch (e) {
          console.error('处理菜谱数据失败:', e);
        }
      }

      this.setData({
        recipes: kitchenRecipes,
        categories: categories
      });
    } catch (error) {
      console.error('loadData 发生错误:', error);
      // 即使出错也设置默认值
      this.setData({
        recipes: [],
        categories: []
      });
    }
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
