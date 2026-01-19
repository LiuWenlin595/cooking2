// pages/recipe/add/add.js
const app = getApp();
const util = require('../../../utils/util.js');

Page({
  data: {
    recipeId: null,
    isEdit: false,
    categories: [],
    categoryIndex: 0,
    selectedCategoryName: '',
    formData: {
      name: '',
      categoryId: '',
      description: '',
      image: '',
      serving: '',
      duration: '',
      difficulty: '',
      recipeLink: '',
      isMustHave: false,
      price: 0,
      rating: 0,
      monthlySales: 0
    },
    difficultyOptions: ['简单', '中等', '困难'],
    difficultyIndex: 0,
    selectedDifficulty: ''
  },

  onLoad(options) {
    // 检查管理员权限
    if (!this.checkAdminPermission()) {
      return;
    }
    
    const id = options.id;
    if (id) {
      this.setData({
        recipeId: id,
        isEdit: true
      });
      this.loadRecipe(id);
    } else {
      this.loadCategories();
    }
  },

  // 检查管理员权限
  checkAdminPermission() {
    const isAdmin = app.checkIsAdmin();
    const currentKitchen = app.globalData.currentKitchen;
    
    // 检查是否是首次使用（没有管理员的默认厨房）
    const admins = currentKitchen && currentKitchen.admins ? currentKitchen.admins : [];
    const isFirstTime = admins.length === 0 && currentKitchen && currentKitchen.isDefault;
    
    if (!isAdmin && !isFirstTime) {
      wx.showModal({
        title: '权限不足',
        content: '只有管理员才能添加或编辑菜谱',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return false;
    }
    
    return true;
  },

  // 加载分类
  loadCategories() {
    const categories = wx.getStorageSync('categories') || [];
    this.setData({
      categories
    });
    // 如果有选中的分类，设置索引
    if (this.data.formData.categoryId) {
      const index = categories.findIndex(c => c.id === this.data.formData.categoryId);
      if (index !== -1) {
        this.setData({
          categoryIndex: index,
          selectedCategoryName: categories[index].name
        });
      }
    }
  },

  // 加载菜谱（编辑模式）
  loadRecipe(id) {
    const recipes = wx.getStorageSync('recipes') || [];
    const recipe = recipes.find(r => r.id === id);
    if (recipe) {
      const difficultyIndex = this.data.difficultyOptions.findIndex(d => d === recipe.difficulty);
      this.setData({
        'formData': recipe,
        selectedDifficulty: recipe.difficulty || '',
        difficultyIndex: difficultyIndex !== -1 ? difficultyIndex : 0
      });
      // 加载分类后设置分类索引
      this.loadCategories();
    }
  },

  // 输入处理
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
  },

  onCategoryChange(e) {
    const index = parseInt(e.detail.value);
    const category = this.data.categories[index];
    if (category) {
      this.setData({
        'formData.categoryId': category.id,
        categoryIndex: index,
        selectedCategoryName: category.name
      });
    }
  },

  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    });
  },

  onServingInput(e) {
    this.setData({
      'formData.serving': e.detail.value
    });
  },

  onDurationInput(e) {
    this.setData({
      'formData.duration': e.detail.value
    });
  },

  onDifficultyChange(e) {
    const index = parseInt(e.detail.value);
    const difficulty = this.data.difficultyOptions[index];
    this.setData({
      'formData.difficulty': difficulty,
      difficultyIndex: index,
      selectedDifficulty: difficulty
    });
  },

  onRecipeLinkInput(e) {
    this.setData({
      'formData.recipeLink': e.detail.value
    });
  },

  onPriceInput(e) {
    this.setData({
      'formData.price': parseFloat(e.detail.value) || 0
    });
  },

  // 切换必点菜
  toggleMustHave() {
    this.setData({
      'formData.isMustHave': !this.data.formData.isMustHave
    });
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 这里可以上传到服务器，暂时使用本地路径
        this.setData({
          'formData.image': tempFilePath
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 预览图片
  previewImage() {
    if (this.data.formData.image) {
      wx.previewImage({
        urls: [this.data.formData.image]
      });
    }
  },

  // 保存菜谱
  saveRecipe() {
    const formData = this.data.formData;
    
    // 验证必填项
    if (!formData.name) {
      wx.showToast({
        title: '请输入菜名',
        icon: 'none'
      });
      return;
    }

    if (!formData.categoryId) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      });
      return;
    }

    let recipes = wx.getStorageSync('recipes') || [];
    
    if (this.data.isEdit) {
      // 编辑模式
      const index = recipes.findIndex(r => r.id === this.data.recipeId);
      if (index !== -1) {
        // 使用 Object.assign 替代展开运算符
        recipes[index] = Object.assign({}, recipes[index], formData, {
          updateTime: new Date().toISOString()
        });
      }
    } else {
      // 新增模式
      const currentKitchen = app.globalData.currentKitchen;
      if (!currentKitchen) {
        wx.showToast({
          title: '厨房信息错误',
          icon: 'none'
        });
        return;
      }
      
      // 使用 Object.assign 替代展开运算符
      const newRecipe = Object.assign({}, formData, {
        id: util.generateId(),
        kitchenId: currentKitchen.id,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      });
      recipes.push(newRecipe);
    }

    wx.setStorageSync('recipes', recipes);
    
    wx.showToast({
      title: this.data.isEdit ? '保存成功' : '添加成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 删除菜谱
  deleteRecipe() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个菜谱吗？',
      success: (res) => {
        if (res.confirm) {
          let recipes = wx.getStorageSync('recipes') || [];
          recipes = recipes.filter(r => r.id !== this.data.recipeId);
          wx.setStorageSync('recipes', recipes);
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      }
    });
  }
});
