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
    mode: 'order', // 'order' 或 'edit'
    userInfo: null
  },

  onLoad(options) {
    console.log('===== kitchen onLoad 开始 =====');
    console.log('options:', options);
    
    try {
      // 确保 app 已经初始化
      if (!app.globalData.shopInfo) {
        console.log('app未初始化，强制初始化');
        app.initLocalData();
      }
      
      // 立即设置默认数据，防止页面空白
      this.setData({
        shopInfo: app.globalData.shopInfo || {
          id: 'shop_001',
          name: '我的小店',
          avatar: '',
          background: '',
          intro: '欢迎来到我的小店'
        },
        currentKitchen: app.globalData.currentKitchen || {
          id: 'kitchen_001',
          name: '主厨房',
          isDefault: true,
          admins: []
        },
        categories: wx.getStorageSync('categories') || [],
        recipes: [],
        filteredRecipes: []
      }, () => {
        console.log('初始数据设置完成');
      });
      
      // 延迟加载完整数据
      setTimeout(() => {
        console.log('开始加载完整数据');
        this.loadData();
        
        // 处理分享数据
        if (options && options.share) {
          this.handleShareData(options.share);
        }
      }, 300);
      
      console.log('===== kitchen onLoad 结束 =====');
    } catch (error) {
      console.error('onLoad 发生错误:', error);
      // 即使出错也设置基础数据
      this.setData({
        shopInfo: { id: 'shop_001', name: '我的小店', avatar: '', background: '', intro: '欢迎来到我的小店' },
        currentKitchen: { id: 'kitchen_001', name: '主厨房', isDefault: true, admins: [] },
        categories: [],
        recipes: [],
        filteredRecipes: []
      });
    }
  },

  onShow() {
    console.log('===== kitchen onShow 开始 =====');
    
    try {
      // 更新用户信息和管理员状态
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
      console.log('onShow - userInfo:', userInfo);
      
      this.setData({
        userInfo: userInfo,
        isAdmin: app.checkIsAdmin()
      });
      
      // ⭐ 关键修复：只重新加载 Storage 中的最新数据，不重新 setData recipes
      // 避免覆盖当前页面的 recipes 数据
      const recipes = wx.getStorageSync('recipes') || [];
      const categories = wx.getStorageSync('categories') || [];
      const currentKitchen = app.globalData.currentKitchen;
      
      if (currentKitchen) {
        const kitchenRecipes = recipes.filter(r => 
          !r.kitchenId || r.kitchenId === currentKitchen.id
        ).map(r => {
          const category = categories.find(c => c.id === r.categoryId);
          return Object.assign({}, r, {
            categoryName: category ? category.name : ''
          });
        });
        
        // 只在数据真的变化时才更新
        if (kitchenRecipes.length !== this.data.recipes.length) {
          console.log('检测到菜谱数量变化，更新数据');
          console.log('保持当前分类:', this.data.selectedCategory);
          // ⭐ 只更新 recipes 和 categories，不影响 selectedCategory
          this.setData({
            recipes: kitchenRecipes,
            categories: categories
          }, () => {
            // 保持当前分类进行筛选
            this.filterRecipes();
          });
        } else {
          // 数据没变，只更新筛选结果
          this.filterRecipes();
        }
      }
      
      this.updateCartCount();
      
      console.log('===== kitchen onShow 结束 =====');
    } catch (error) {
      console.error('onShow 发生错误:', error);
      wx.showToast({
        title: '页面加载出错',
        icon: 'none'
      });
    }
  },

  // 加载数据
  loadData() {
    console.log('===== loadData 开始 =====');
    
    try {
      // 尝试重新初始化数据
      if (!app.globalData.shopInfo || !app.globalData.currentKitchen) {
        console.log('globalData数据为空，尝试重新初始化');
        app.initLocalData();
        
        // 再次检查
        if (!app.globalData.shopInfo) {
          console.error('初始化后仍然没有shopInfo，使用硬编码默认值');
        }
      }
      
      const shopInfo = app.globalData.shopInfo;
      const currentKitchen = app.globalData.currentKitchen;
      
      console.log('loadData - shopInfo:', shopInfo);
      console.log('loadData - currentKitchen:', currentKitchen);
      
      // 如果还是没有数据，使用默认值
      const finalShopInfo = shopInfo || {
        id: 'shop_001',
        name: '我的小店',
        avatar: '',
        background: '',
        intro: '欢迎来到我的小店'
      };
      
      const finalCurrentKitchen = currentKitchen || {
        id: 'kitchen_001',
        name: '主厨房',
        isDefault: true,
        admins: []
      };
      
      console.log('最终使用的数据:');
      console.log('finalShopInfo:', finalShopInfo);
      console.log('finalCurrentKitchen:', finalCurrentKitchen);
      
      const categories = wx.getStorageSync('categories') || [];
      const recipes = wx.getStorageSync('recipes') || [];
      
      console.log('categories数量:', categories.length);
      console.log('recipes数量:', recipes.length);
      
      // 过滤当前厨房的菜谱，并添加分类名称
      const kitchenRecipes = recipes.filter(r => 
        !r.kitchenId || r.kitchenId === finalCurrentKitchen.id
      ).map(r => {
        const category = categories.find(c => c.id === r.categoryId);
        // 使用 Object.assign 替代展开运算符
        return Object.assign({}, r, {
          categoryName: category ? category.name : ''
        });
      });

      console.log('kitchenRecipes数量:', kitchenRecipes.length);

      // ⭐ 关键修复：不覆盖 selectedCategory，保持用户的选择
      const updateData = {
        shopInfo: finalShopInfo,
        currentKitchen: finalCurrentKitchen,
        categories: categories,
        recipes: kitchenRecipes,
        isAdmin: app.checkIsAdmin()
      };
      
      // 如果是首次加载（没有 selectedCategory），设置默认值
      if (!this.data.selectedCategory) {
        updateData.selectedCategory = 'all';
      }
      
      this.setData(updateData, () => {
        console.log('setData完成，开始过滤菜谱');
        console.log('当前分类:', this.data.selectedCategory);
        // 数据设置完成后再过滤，确保数据同步
        this.filterRecipes();
      });
      
      // 切换厨房时清空购物车
      this.clearCartIfKitchenChanged();
      
      console.log('===== loadData 结束 =====');
    } catch (error) {
      console.error('loadData 发生错误:', error);
      console.error('错误堆栈:', error.stack);
      
      // 即使出错也要设置基础数据
      this.setData({
        shopInfo: { id: 'shop_001', name: '我的小店', avatar: '', background: '', intro: '欢迎来到我的小店' },
        currentKitchen: { id: 'kitchen_001', name: '主厨房', isDefault: true, admins: [] },
        categories: wx.getStorageSync('categories') || [],
        recipes: [],
        filteredRecipes: [],
        isAdmin: false
      });
      
      wx.showToast({
        title: '数据加载出错',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 筛选菜谱
  filterRecipes() {
    console.log('filterRecipes 开始');
    console.log('recipes:', this.data.recipes);
    console.log('selectedCategory:', this.data.selectedCategory);
    console.log('searchKeyword:', this.data.searchKeyword);
    
    // 确保 recipes 数据存在
    if (!this.data.recipes || !Array.isArray(this.data.recipes)) {
      console.log('recipes为空或不是数组');
      this.setData({
        filteredRecipes: []
      });
      return;
    }
    
    // 使用 slice() 替代展开运算符创建数组副本
    let filtered = this.data.recipes.slice();
    console.log('开始筛选，总数:', filtered.length);
    
    // 按分类筛选
    if (this.data.selectedCategory && this.data.selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.categoryId === this.data.selectedCategory);
      console.log('按分类筛选后:', filtered.length);
    }
    
    // 按搜索关键词筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filtered = filtered.filter(r => 
        (r.name && r.name.toLowerCase().includes(keyword)) ||
        (r.description && r.description.toLowerCase().includes(keyword)) ||
        (r.categoryName && r.categoryName.toLowerCase().includes(keyword))
      );
      console.log('按关键词筛选后:', filtered.length);
    }

    // 必点菜优先
    filtered.sort((a, b) => {
      if (a.isMustHave && !b.isMustHave) return -1;
      if (!a.isMustHave && b.isMustHave) return 1;
      return 0;
    });

    console.log('最终筛选结果:', filtered.length);
    this.setData({
      filteredRecipes: filtered
    });
    
    console.log('filterRecipes 完成');
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
    if (e && e.stopPropagation) {
      e.stopPropagation(); // 阻止事件冒泡
    }
    
    // 检查是否已登录
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.nickName) {
      app.requireLogin(() => {
        // 登录成功后不需要重新调用，用户可以再次点击
      });
      return;
    }

    const id = e.currentTarget.dataset.id;
    
    if (!id) {
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
      return;
    }

    // 检查厨房信息
    if (!this.data.currentKitchen) {
      wx.showToast({
        title: '厨房信息错误',
        icon: 'none'
      });
      return;
    }

    // 查找菜谱：优先从 filteredRecipes（当前显示的列表）中查找
    let recipe = this.data.filteredRecipes && this.data.filteredRecipes.find(r => r.id === id);
    
    // 如果找不到，从 recipes 中查找
    if (!recipe && this.data.recipes) {
      recipe = this.data.recipes.find(r => r.id === id);
    }
    
    // 如果还是找不到，从本地存储中查找
    if (!recipe) {
      const allRecipes = wx.getStorageSync('recipes') || [];
      recipe = allRecipes.find(r => r.id === id);
    }
    
    // 如果仍然找不到，尝试重新加载数据后再查找
    if (!recipe) {
      wx.showToast({
        title: '正在重新加载...',
        icon: 'loading',
        duration: 1000
      });
      
      this.loadData();
      
      setTimeout(() => {
        let retryRecipe = this.data.filteredRecipes && this.data.filteredRecipes.find(r => r.id === id) || 
                          this.data.recipes && this.data.recipes.find(r => r.id === id);
        
        if (!retryRecipe) {
          const allRecipes = wx.getStorageSync('recipes') || [];
          retryRecipe = allRecipes.find(r => r.id === id);
        }
        
        if (!retryRecipe) {
          wx.showToast({
            title: '菜谱不存在，请刷新页面',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        
        this.addToCartWithRecipe(id, retryRecipe);
      }, 300);
      return;
    }
    
    // 找到菜谱，添加到购物车
    this.addToCartWithRecipe(id, recipe);
  },

  // 执行添加到购物车的操作
  addToCartWithRecipe(id, recipe) {
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
    
    // 查找购物车中是否已有该菜品
    const existingItem = cart.find(item => item.recipeId === id);
    
    if (existingItem) {
      // 如果已存在，增加数量
      existingItem.quantity += 1;
    } else {
      // 如果不存在，添加新项
      cart.push({
        recipeId: id,
        recipeName: recipe ? (recipe.name || '未知菜品') : '未知菜品',
        recipeImage: recipe ? (recipe.image || '') : '',
        price: recipe ? (recipe.price || 0) : 0,
        quantity: 1,
        kitchenId: this.data.currentKitchen.id
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

  // 跳转到购物车
  goToCart() {
    // 检查是否已登录
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.nickName) {
      app.requireLogin(() => {
        wx.navigateTo({
          url: '/pages/cart/cart'
        });
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/cart/cart'
    });
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
    // 检查是否为管理员
    if (!this.data.isAdmin) {
      // 检查是否是首次使用（没有管理员）
      const currentKitchen = app.globalData.currentKitchen;
      const admins = currentKitchen && currentKitchen.admins ? currentKitchen.admins : [];
      
      if (admins.length === 0 && currentKitchen && currentKitchen.isDefault) {
        // 首次使用，直接允许添加
        wx.navigateTo({
          url: '/pages/recipe/add/add'
        });
        return;
      }
      
      // 需要管理员权限
      wx.showModal({
        title: '需要管理员权限',
        content: '添加菜谱需要管理员权限。\n\n设置方法：\n1. 进入"我的" → "店铺设置" → "管理厨房"\n2. 选择当前厨房，点击"管理员"\n3. 添加您的昵称作为管理员',
        showCancel: true,
        confirmText: '去设置',
        cancelText: '知道了',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/shop/kitchen-list/kitchen-list'
            });
          }
        }
      });
      return;
    }
    
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
    // 检查是否已登录
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.nickName) {
      app.requireLogin(() => {
        // 登录成功后用户可以再次点击
      });
      return;
    }

    const cart = wx.getStorageSync('cart') || [];
    
    if (cart.length === 0) {
      wx.showModal({
        title: '购物车为空',
        content: '请先添加菜品到购物车，再邀请他人下单',
        showCancel: false
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

    // 生成分享数据
    const shareData = {
      type: 'invite_order',
      kitchenId: this.data.currentKitchen.id,
      kitchenName: this.data.currentKitchen.name,
      cart: cart.map(item => ({
        recipeId: item.recipeId,
        recipeName: item.recipeName,
        recipeImage: item.recipeImage,
        price: item.price,
        quantity: item.quantity
      })),
      totalPrice: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      timestamp: Date.now()
    };

    // 将分享数据编码为字符串（用于分享参数）
    const shareDataStr = encodeURIComponent(JSON.stringify(shareData));
    
    // 显示分享选项
    wx.showActionSheet({
      itemList: ['分享给微信好友', '生成分享图片', '复制分享链接'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 分享给微信好友（使用小程序分享功能）
          this.shareToWeChat(shareData);
        } else if (res.tapIndex === 1) {
          // 生成分享图片
          this.generateShareImage(shareData);
        } else if (res.tapIndex === 2) {
          // 复制分享链接
          this.copyShareLink(shareDataStr);
        }
      }
    });
  },

  // 分享给微信好友
  shareToWeChat(shareData) {
    // 保存分享数据到本地，供分享回调使用
    wx.setStorageSync('pending_share_data', shareData);
    
    wx.showModal({
      title: '分享提示',
      content: '请点击右上角"..."按钮，选择"转发"分享给好友',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 生成分享图片
  generateShareImage(shareData) {
    wx.showLoading({
      title: '生成图片中...'
    });

    // 这里可以使用 canvas 生成分享图片
    // 由于小程序 canvas API 较复杂，先提供文字分享方案
    const shareText = this.generateShareText(shareData);
    
    wx.setClipboardData({
      data: shareText,
      success: () => {
        wx.hideLoading();
        wx.showModal({
          title: '分享内容已复制',
          content: '已将订单信息复制到剪贴板，您可以粘贴到微信发送给好友',
          showCancel: false,
          confirmText: '知道了'
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },

  // 生成分享文本
  generateShareText(shareData) {
    const kitchenName = shareData.kitchenName || '我的厨房';
    let text = `🍽️ 邀请您一起点餐\n\n`;
    text += `📍 ${kitchenName}\n\n`;
    text += `📋 已选菜品：\n`;
    
    shareData.cart.forEach((item, index) => {
      text += `${index + 1}. ${item.recipeName} x${item.quantity}  ¥${(item.price * item.quantity).toFixed(2)}\n`;
    });
    
    text += `\n💰 总计：¥${shareData.totalPrice.toFixed(2)}\n\n`;
    text += `请打开小程序查看并确认下单`;
    
    return text;
  },

  // 复制分享链接
  copyShareLink(shareDataStr) {
    // 生成小程序路径（带参数）
    const path = `/pages/kitchen/kitchen?share=${shareDataStr}`;
    
    // 由于小程序无法直接生成可分享的链接，使用文本方式
    const shareText = `🍽️ 邀请您一起点餐\n\n`;
    const shareTextFull = this.generateShareText(JSON.parse(decodeURIComponent(shareDataStr)));
    shareTextFull += `\n\n小程序路径：${path}`;
    
    wx.setClipboardData({
      data: shareTextFull,
      success: () => {
        wx.showModal({
          title: '分享信息已复制',
          content: '已将订单信息复制到剪贴板，您可以粘贴发送给好友。好友打开小程序后会自动加载购物车。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  },

  // 处理分享数据（从分享进入时调用）
  handleShareData(shareDataStr) {
    try {
      const shareData = JSON.parse(decodeURIComponent(shareDataStr));
      
      if (shareData.type === 'invite_order' && shareData.cart) {
        // 检查是否是当前厨房
        if (shareData.kitchenId !== this.data.currentKitchen?.id) {
          wx.showModal({
            title: '厨房不匹配',
            content: `分享的订单来自"${shareData.kitchenName}"，当前在"${this.data.currentKitchen?.name || '其他厨房'}"。是否切换到该厨房？`,
            success: (res) => {
              if (res.confirm) {
                // 切换到分享的厨房
                const kitchens = wx.getStorageSync('kitchens') || [];
                const targetKitchen = kitchens.find(k => k.id === shareData.kitchenId);
                if (targetKitchen) {
                  app.switchKitchen(shareData.kitchenId);
                  setTimeout(() => {
                    this.loadShareCart(shareData);
                  }, 500);
                } else {
                  wx.showToast({
                    title: '厨房不存在',
                    icon: 'none'
                  });
                }
              }
            }
          });
          return;
        }

        // 加载分享的购物车
        this.loadShareCart(shareData);
      }
    } catch (e) {
      console.error('解析分享数据失败：', e);
    }
  },

  // 加载分享的购物车
  loadShareCart(shareData) {
    wx.showModal({
      title: '收到分享订单',
      content: `好友邀请您一起点餐，共${shareData.cart.length}个菜品，总计¥${shareData.totalPrice.toFixed(2)}。是否加入购物车？`,
      success: (res) => {
        if (res.confirm) {
          // 将分享的购物车合并到当前购物车
          let cart = wx.getStorageSync('cart') || [];
          
          // 如果当前购物车属于其他厨房，先清空
          if (cart.length > 0 && cart[0].kitchenId && cart[0].kitchenId !== shareData.kitchenId) {
            cart = [];
          }

          // 合并购物车（相同菜品合并数量）
          shareData.cart.forEach(shareItem => {
            const existingItem = cart.find(item => item.recipeId === shareItem.recipeId);
            if (existingItem) {
              existingItem.quantity += shareItem.quantity;
            } else {
              // 使用 Object.assign 替代展开运算符
              cart.push(Object.assign({}, shareItem, {
                kitchenId: shareData.kitchenId
              }));
            }
          });

          wx.setStorageSync('cart', cart);
          this.updateCartCount();

          wx.showToast({
            title: '已加入购物车',
            icon: 'success',
            duration: 1500
          });

          // 跳转到购物车页面
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/cart/cart'
            });
          }, 1500);
        }
      }
    });
  },

  // 图片加载错误处理
  onImageError(e) {
    const id = e.currentTarget.dataset.id;
    const recipe = this.data.recipes.find(r => r.id === id);
    if (recipe && !recipe.image) {
      // 图片加载失败，设置为空（使用 CSS 占位符）
      recipe.image = '';
      this.setData({
        recipes: this.data.recipes
      });
    }
  },

  // 分享功能（微信小程序分享）
  onShareAppMessage(res) {
    const cart = wx.getStorageSync('cart') || [];
    const pendingShareData = wx.getStorageSync('pending_share_data');
    
    // 如果有待分享的数据，使用它
    if (pendingShareData) {
      wx.removeStorageSync('pending_share_data');
      const shareDataStr = encodeURIComponent(JSON.stringify(pendingShareData));
      
      return {
        title: `邀请您一起点餐 - ${pendingShareData.kitchenName}`,
        path: `/pages/kitchen/kitchen?share=${shareDataStr}`,
        imageUrl: '' // 可以设置分享图片
      };
    }

    // 默认分享（分享当前页面）
    if (cart.length > 0 && this.data.currentKitchen) {
      const shareData = {
        type: 'invite_order',
        kitchenId: this.data.currentKitchen.id,
        kitchenName: this.data.currentKitchen.name,
        cart: cart.map(item => ({
          recipeId: item.recipeId,
          recipeName: item.recipeName,
          recipeImage: item.recipeImage,
          price: item.price,
          quantity: item.quantity
        })),
        totalPrice: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        timestamp: Date.now()
      };
      const shareDataStr = encodeURIComponent(JSON.stringify(shareData));
      
      return {
        title: `邀请您一起点餐 - ${this.data.currentKitchen.name}`,
        path: `/pages/kitchen/kitchen?share=${shareDataStr}`,
        imageUrl: ''
      };
    }

    // 普通分享
    return {
      title: `${this.data.shopInfo?.name || '我的小店'} - 电子菜单`,
      path: '/pages/kitchen/kitchen',
      imageUrl: ''
    };
  }
});
