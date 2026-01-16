// pages/recipe/detail/detail.js
const app = getApp();
const util = require('../../../utils/util.js');

Page({
  data: {
    recipe: null,
    isAdmin: false
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      this.loadRecipe(id);
    }
    this.setData({
      isAdmin: app.checkIsAdmin()
    });
  },

  // 加载菜谱详情
  loadRecipe(id) {
    const recipes = wx.getStorageSync('recipes') || [];
    const recipe = recipes.find(r => r.id === id);
    if (recipe) {
      // 获取分类名称
      const categories = wx.getStorageSync('categories') || [];
      const category = categories.find(c => c.id === recipe.categoryId);
      recipe.categoryName = category ? category.name : '';
      
      this.setData({
        recipe
      });
    } else {
      wx.showToast({
        title: '菜谱不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 添加到购物车
  addToCart() {
    const recipe = this.data.recipe;
    if (!recipe) return;

    const currentKitchen = app.globalData.currentKitchen;
    if (!currentKitchen) {
      wx.showToast({
        title: '厨房信息错误',
        icon: 'none'
      });
      return;
    }

    let cart = wx.getStorageSync('cart') || [];
    
    // 如果购物车属于其他厨房，先清空
    if (cart.length > 0 && cart[0].kitchenId && cart[0].kitchenId !== currentKitchen.id) {
      cart = [];
    }
    
    const existingItem = cart.find(item => item.recipeId === recipe.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeImage: recipe.image,
        price: recipe.price || 0,
        quantity: 1,
        kitchenId: currentKitchen.id // 记录厨房ID
      });
    }

    wx.setStorageSync('cart', cart);
    
    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1500
    });
  },

  // 快速下单
  quickOrder() {
    const recipe = this.data.recipe;
    if (!recipe) return;

    const currentKitchen = app.globalData.currentKitchen;
    if (!currentKitchen) {
      wx.showToast({
        title: '厨房信息错误',
        icon: 'none'
      });
      return;
    }

    // 显示备注输入框
    wx.showModal({
      title: '订单备注',
      editable: true,
      placeholderText: '请输入订单备注（可选）',
      success: (res) => {
        if (res.confirm) {
          this.createQuickOrder(res.content || '');
        }
      }
    });
  },

  // 创建快速订单
  createQuickOrder(remark = '') {
    const recipe = this.data.recipe;
    const currentKitchen = app.globalData.currentKitchen;

    const order = {
      id: util.generateId(),
      kitchenId: currentKitchen.id,
      kitchenName: currentKitchen.name,
      items: [{
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeImage: recipe.image,
        price: recipe.price || 0,
        quantity: 1
      }],
      totalPrice: recipe.price || 0,
      status: 'pending',
      remark: remark || '', // 添加备注
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };

    let orders = wx.getStorageSync('orders') || [];
    orders.unshift(order);
    wx.setStorageSync('orders', orders);

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

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 编辑菜谱
  editRecipe() {
    const recipe = this.data.recipe;
    if (!recipe) return;
    
    wx.navigateTo({
      url: `/pages/recipe/add/add?id=${recipe.id}`
    });
  },

  // 删除菜谱
  deleteRecipe() {
    const recipe = this.data.recipe;
    if (!recipe) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个菜谱吗？',
      success: (res) => {
        if (res.confirm) {
          let recipes = wx.getStorageSync('recipes') || [];
          recipes = recipes.filter(r => r.id !== recipe.id);
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
  },

  // 跳转到制作链接
  goToRecipeLink() {
    const recipe = this.data.recipe;
    if (!recipe || !recipe.recipeLink) {
      wx.showToast({
        title: '暂无制作链接',
        icon: 'none'
      });
      return;
    }

    // 检查链接格式
    const link = recipe.recipeLink.trim();
    if (!link) {
      wx.showToast({
        title: '链接无效',
        icon: 'none'
      });
      return;
    }

    // 尝试直接打开链接
    if (link.startsWith('http://') || link.startsWith('https://')) {
      wx.showActionSheet({
        itemList: ['在浏览器中打开', '复制链接'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 在浏览器中打开
            wx.setClipboardData({
              data: link,
              success: () => {
                wx.showModal({
                  title: '提示',
                  content: '链接已复制，请在浏览器中打开',
                  showCancel: false
                });
              }
            });
          } else if (res.tapIndex === 1) {
            // 复制链接
            wx.setClipboardData({
              data: link,
              success: () => {
                wx.showToast({
                  title: '链接已复制',
                  icon: 'success'
                });
              }
            });
          }
        }
      });
    } else {
      // 如果不是完整URL，只复制
      wx.setClipboardData({
        data: link,
        success: () => {
          wx.showToast({
            title: '链接已复制',
            icon: 'success'
          });
        }
      });
    }
  }
});
