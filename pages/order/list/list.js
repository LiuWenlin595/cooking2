// pages/order/list/list.js
const app = getApp();
const util = require('../../../utils/util.js');

Page({
  data: {
    orders: [],
    filteredOrders: [],
    statusFilter: 'all', // 'all', 'pending', 'processing', 'completed'
    isAdmin: false
  },

  onLoad() {
    // ⭐ 修复：检查登录状态，不使用递归回调
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.nickName) {
      // 显示提示并跳转
      wx.showModal({
        title: '需要登录',
        content: '查看订单需要先登录',
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

    // 设置管理员状态并加载订单
    this.setData({
      isAdmin: app.checkIsAdmin()
    });
    this.loadOrders();
  },

  onShow() {
    // 检查是否已登录
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.nickName) {
      // 未登录则返回
      return;
    }

    // 重新检查管理员权限
    this.setData({
      isAdmin: app.checkIsAdmin()
    });
    this.loadOrders();
  },

  // 加载订单
  loadOrders() {
    const orders = wx.getStorageSync('orders') || [];
    const currentKitchen = app.globalData.currentKitchen;
    
    // 过滤当前厨房的订单
    let kitchenOrders = orders;
    if (currentKitchen) {
      kitchenOrders = orders.filter(o => o.kitchenId === currentKitchen.id);
    }
    
    // 按创建时间倒序排列
    kitchenOrders.sort((a, b) => {
      try {
        return new Date(b.createTime) - new Date(a.createTime);
      } catch (e) {
        return 0;
      }
    });
    
    this.setData({
      orders: kitchenOrders
    });
    this.filterOrders();
  },

  // 筛选订单
  filterOrders() {
    // 使用 slice() 替代展开运算符
    let filtered = this.data.orders.slice();
    
    // 按状态筛选
    if (this.data.statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === this.data.statusFilter);
    }

    this.setData({
      filteredOrders: filtered
    });
  },

  // 切换状态筛选
  switchStatusFilter(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({
      statusFilter: status
    });
    this.filterOrders();
  },

  // 跳转到订单详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order/detail/detail?id=${id}`
    });
  },

  // 接单（管理员）
  acceptOrder(e) {
    const id = e.currentTarget.dataset.id;
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      });
      return;
    }

    let orders = wx.getStorageSync('orders') || [];
    const order = orders.find(o => o.id === id);
    if (order && order.status === 'pending') {
      order.status = 'processing';
      order.updateTime = new Date().toISOString();
      wx.setStorageSync('orders', orders);
      this.loadOrders();
      
      wx.showToast({
        title: '接单成功',
        icon: 'success'
      });
    }
  },

  // 出餐（管理员）
  completeOrder(e) {
    const id = e.currentTarget.dataset.id;
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认出餐',
      content: '确定该订单已完成出餐吗？',
      success: (res) => {
        if (res.confirm) {
          let orders = wx.getStorageSync('orders') || [];
          const order = orders.find(o => o.id === id);
          if (order && order.status === 'processing') {
            order.status = 'completed';
            order.updateTime = new Date().toISOString();
            wx.setStorageSync('orders', orders);
            this.loadOrders();
            
            wx.showToast({
              title: '出餐成功',
              icon: 'success'
            });
          }
        }
      }
    });
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      const year = date.getFullYear();
      const month = ('0' + (date.getMonth() + 1)).slice(-2);
      const day = ('0' + date.getDate()).slice(-2);
      const hour = ('0' + date.getHours()).slice(-2);
      const minute = ('0' + date.getMinutes()).slice(-2);
      return `${year}-${month}-${day} ${hour}:${minute}`;
    } catch (e) {
      return timeStr;
    }
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'pending': '待处理',
      'processing': '制作中',
      'completed': '已完成'
    };
    return statusMap[status] || status;
  },

  // 获取状态颜色
  getStatusColor(status) {
    const colorMap = {
      'pending': '#f39c12',
      'processing': '#3498db',
      'completed': '#2ecc71'
    };
    return colorMap[status] || '#999';
  }
});
