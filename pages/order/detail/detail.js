// pages/order/detail/detail.js
const app = getApp();
const util = require('../../../utils/util.js');

Page({
  data: {
    order: null,
    isAdmin: false
  },

  onLoad(options) {
    console.log('===== order/detail onLoad 开始 =====');
    
    // ⭐ 修复：立即设置默认数据，确保页面有内容显示（防止真机白屏）
    this.setData({
      order: null,
      isAdmin: false
    }, () => {
      console.log('✅ 默认数据设置完成');
    });
    
    try {
      const id = options ? options.id : null;
      if (id) {
        this.loadOrder(id);
      } else {
        // 如果没有ID，显示错误并返回
        wx.showToast({
          title: '订单ID错误',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
      
      try {
        this.setData({
          isAdmin: app.checkIsAdmin()
        });
      } catch (e) {
        console.error('检查管理员权限失败:', e);
      }
    } catch (error) {
      console.error('onLoad 发生错误:', error);
      // 即使出错也保持默认数据显示
    }
  },

  // 加载订单详情
  loadOrder(id) {
    try {
      let orders = [];
      try {
        orders = wx.getStorageSync('orders') || [];
      } catch (e) {
        console.error('读取订单数据失败:', e);
      }
      
      const order = orders.find(o => o.id === id);
      if (order) {
        this.setData({
          order: order
        });
      } else {
        wx.showToast({
          title: '订单不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('loadOrder 发生错误:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 接单（管理员）
  acceptOrder() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      });
      return;
    }

    const order = this.data.order;
    if (order.status !== 'pending') {
      wx.showToast({
        title: '订单状态不正确',
        icon: 'none'
      });
      return;
    }

    let orders = wx.getStorageSync('orders') || [];
    const index = orders.findIndex(o => o.id === order.id);
    if (index !== -1) {
      orders[index].status = 'processing';
      orders[index].updateTime = new Date().toISOString();
      wx.setStorageSync('orders', orders);
      
      this.setData({
        'order.status': 'processing',
        'order.updateTime': orders[index].updateTime
      });
      
      wx.showToast({
        title: '接单成功',
        icon: 'success'
      });
    }
  },

  // 出餐（管理员）
  completeOrder() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      });
      return;
    }

    const order = this.data.order;
    if (order.status !== 'processing') {
      wx.showToast({
        title: '订单状态不正确',
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
          const index = orders.findIndex(o => o.id === order.id);
          if (index !== -1) {
            orders[index].status = 'completed';
            orders[index].updateTime = new Date().toISOString();
            wx.setStorageSync('orders', orders);
            
            this.setData({
              'order.status': 'completed',
              'order.updateTime': orders[index].updateTime
            });
            
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
