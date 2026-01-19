// pages/cart/cart.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    cart: [],
    totalPrice: 0,
    totalCount: 0,
    currentKitchen: null
  },

  onLoad() {
    // ⭐ 修复：检查登录状态，不使用递归回调
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.nickName) {
      // 显示提示并跳转
      wx.showModal({
        title: '需要登录',
        content: '查看购物车需要先登录',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          } else {
            wx.navigateBack();
          }
        }
      });
      return;
    }

    this.loadCart();
  },

  onShow() {
    // 检查是否已登录
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.nickName) {
      // 未登录则返回
      return;
    }

    this.loadCart();
  },

  // 加载购物车数据
  loadCart() {
    const cart = wx.getStorageSync('cart') || [];
    const currentKitchen = app.globalData.currentKitchen;
    
    // 为每个商品计算小计
    const cartWithSubtotal = cart.map(item => {
      return Object.assign({}, item, {
        subtotal: (item.price * item.quantity).toFixed(2)
      });
    });
    
    // 计算总价和总数量
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    this.setData({
      cart: cartWithSubtotal,
      currentKitchen,
      totalPrice,
      totalPriceStr: totalPrice.toFixed(2),
      totalCount
    });
  },

  // 增加数量
  increaseQuantity(e) {
    const index = e.currentTarget.dataset.index;
    let cart = this.data.cart;
    
    if (cart[index]) {
      cart[index].quantity += 1;
      this.saveCart(cart);
    }
  },

  // 减少数量
  decreaseQuantity(e) {
    const index = e.currentTarget.dataset.index;
    let cart = this.data.cart;
    
    if (cart[index]) {
      if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
        this.saveCart(cart);
      } else {
        // 数量为1时，提示是否删除
        this.confirmDelete(index);
      }
    }
  },

  // 确认删除
  confirmDelete(index) {
    const item = this.data.cart[index];
    wx.showModal({
      title: '确认删除',
      content: `确定要从购物车中移除"${item.recipeName}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.deleteItem(index);
        }
      }
    });
  },

  // 删除商品
  deleteItem(index) {
    let cart = this.data.cart;
    cart.splice(index, 1);
    this.saveCart(cart);
    
    wx.showToast({
      title: '已移除',
      icon: 'success',
      duration: 1500
    });
  },

  // 保存购物车
  saveCart(cart) {
    wx.setStorageSync('cart', cart);
    this.loadCart();
  },

  // 清空购物车
  clearCart() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空购物车吗？',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('cart', []);
          this.loadCart();
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  },

  // 去结算（下单）
  checkout() {
    if (this.data.cart.length === 0) {
      wx.showToast({
        title: '购物车为空',
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
          this.createOrder(res.content || '');
        }
      }
    });
  },

  // 创建订单
  createOrder(remark = '') {
    const cart = this.data.cart;
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
      totalPrice: this.data.totalPrice,
      status: 'pending',
      remark: remark || '',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };

    let orders = wx.getStorageSync('orders') || [];
    orders.unshift(order);
    wx.setStorageSync('orders', orders);

    // 清空购物车
    wx.setStorageSync('cart', []);

    wx.showToast({
      title: '下单成功',
      icon: 'success',
      duration: 2000
    });

    // 如果开启了订单通知
    if (app.globalData.orderNotification) {
      setTimeout(() => {
        wx.showModal({
          title: '新订单',
          content: '您有新的订单，请及时处理',
          showCancel: false
        });
      }, 2000);
    }

    // 延迟返回首页
    setTimeout(() => {
      wx.navigateBack();
    }, 2000);
  },

  // 跳转到菜谱详情
  goToRecipeDetail(e) {
    const recipeId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/recipe/detail/detail?id=${recipeId}`
    });
  },

  // 返回首页
  goBack() {
    wx.navigateBack();
  }
});
