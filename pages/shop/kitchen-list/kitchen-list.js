// pages/shop/kitchen-list/kitchen-list.js
const app = getApp();
const util = require('../../../utils/util.js');

Page({
  data: {
    shopInfo: null,
    kitchens: [],
    currentKitchenId: ''
  },

  onLoad() {
    this.loadKitchens();
  },

  // 加载厨房列表
  loadKitchens() {
    const shopInfo = app.globalData.shopInfo;
    if (shopInfo && shopInfo.kitchens) {
      this.setData({
        shopInfo,
        kitchens: shopInfo.kitchens,
        currentKitchenId: shopInfo.currentKitchenId || ''
      });
    } else {
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    }
  },

  // 切换厨房
  switchKitchen(e) {
    const kitchenId = e.currentTarget.dataset.id;
    if (!kitchenId) {
      wx.showToast({
        title: '厨房ID错误',
        icon: 'none'
      });
      return;
    }
    
    app.switchKitchen(kitchenId);
    this.setData({
      currentKitchenId: kitchenId
    });
    
    // 清空购物车（切换厨房时）
    wx.setStorageSync('cart', []);
    
    wx.showToast({
      title: '切换成功',
      icon: 'success',
      duration: 1500
    });
    
    // 延迟返回，让用户看到提示
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 添加厨房
  addKitchen() {
    wx.showModal({
      title: '添加厨房',
      editable: true,
      placeholderText: '请输入厨房名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const shopInfo = app.globalData.shopInfo;
          const newKitchen = {
            id: util.generateId(),
            name: res.content,
            isDefault: false,
            admins: []
          };
          
          shopInfo.kitchens.push(newKitchen);
          app.updateShopInfo(shopInfo);
          
          this.loadKitchens();
          
          wx.showToast({
            title: '添加成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 编辑厨房名称
  editKitchen(e) {
    const kitchenId = e.currentTarget.dataset.id;
    const kitchen = this.data.kitchens.find(k => k.id === kitchenId);
    if (!kitchen) return;

    wx.showModal({
      title: '编辑厨房',
      editable: true,
      placeholderText: '请输入厨房名称',
      content: kitchen.name,
      success: (res) => {
        if (res.confirm && res.content) {
          const shopInfo = app.globalData.shopInfo;
          const index = shopInfo.kitchens.findIndex(k => k.id === kitchenId);
          if (index !== -1) {
            shopInfo.kitchens[index].name = res.content;
            app.updateShopInfo(shopInfo);
            this.loadKitchens();
            
            wx.showToast({
              title: '修改成功',
              icon: 'success'
            });
          }
        }
      }
    });
  },

  // 删除厨房
  deleteKitchen(e) {
    const kitchenId = e.currentTarget.dataset.id;
    const kitchen = this.data.kitchens.find(k => k.id === kitchenId);
    if (!kitchen) return;

    if (kitchen.isDefault) {
      wx.showToast({
        title: '不能删除默认厨房',
        icon: 'none'
      });
      return;
    }

    if (this.data.kitchens.length <= 1) {
      wx.showToast({
        title: '至少保留一个厨房',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个厨房吗？',
      success: (res) => {
        if (res.confirm) {
          const shopInfo = app.globalData.shopInfo;
          shopInfo.kitchens = shopInfo.kitchens.filter(k => k.id !== kitchenId);
          
          // 如果删除的是当前厨房，切换到默认厨房
          if (shopInfo.currentKitchenId === kitchenId) {
            const defaultKitchen = shopInfo.kitchens.find(k => k.isDefault) || shopInfo.kitchens[0];
            shopInfo.currentKitchenId = defaultKitchen.id;
            app.globalData.currentKitchen = defaultKitchen;
          }
          
          app.updateShopInfo(shopInfo);
          this.loadKitchens();
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 管理管理员
  manageAdmins(e) {
    const kitchenId = e.currentTarget.dataset.id;
    const kitchen = this.data.kitchens.find(k => k.id === kitchenId);
    
    if (!kitchen) {
      wx.showToast({
        title: '厨房不存在',
        icon: 'none'
      });
      return;
    }
    
    wx.showActionSheet({
      itemList: ['添加管理员', '查看管理员列表'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.addAdmin(kitchenId);
        } else if (res.tapIndex === 1) {
          this.showAdmins(kitchen);
        }
      }
    });
  },

  // 添加管理员
  addAdmin(kitchenId) {
    wx.showModal({
      title: '添加管理员',
      content: '请输入要添加为管理员的微信昵称',
      editable: true,
      placeholderText: '输入微信昵称',
      success: (res) => {
        if (res.confirm && res.content) {
          const nickName = res.content.trim();
          
          if (!nickName) {
            wx.showToast({
              title: '昵称不能为空',
              icon: 'none'
            });
            return;
          }
          
          this.addAdminToKitchen(kitchenId, nickName);
        }
      }
    });
  },

  // 添加管理员到厨房
  addAdminToKitchen(kitchenId, nickName) {
    const shopInfo = app.globalData.shopInfo;
    const kitchen = shopInfo.kitchens.find(k => k.id === kitchenId);
    
    if (!kitchen) {
      wx.showToast({
        title: '厨房不存在',
        icon: 'none'
      });
      return;
    }

    if (!kitchen.admins) {
      kitchen.admins = [];
    }

    // 检查是否已存在
    const exists = kitchen.admins.some(a => a.nickName === nickName);

    if (exists) {
      wx.showToast({
        title: '该管理员已存在',
        icon: 'none'
      });
      return;
    }

    // 添加管理员
    const admin = {
      nickName: nickName,
      avatarUrl: '',
      addTime: new Date().toISOString()
    };

    kitchen.admins.push(admin);
    app.updateShopInfo(shopInfo);
    this.loadKitchens();

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  // 显示管理员列表
  showAdmins(kitchen) {
    const admins = kitchen.admins || [];
    if (admins.length === 0) {
      wx.showToast({
        title: '暂无管理员',
        icon: 'none'
      });
      return;
    }

    const adminNames = admins.map(a => a.nickName).join('、');
    wx.showModal({
      title: '管理员列表',
      content: adminNames,
      showCancel: false
    });
  }
});
