// pages/shop/settings/settings.js
const app = getApp();

Page({
  data: {
    shopInfo: null,
    formData: {
      name: '',
      avatar: '',
      background: '',
      intro: ''
    },
    orderNotification: true
  },

  onLoad() {
    this.loadShopInfo();
  },

  // 加载店铺信息
  loadShopInfo() {
    const shopInfo = app.globalData.shopInfo;
    const orderNotification = app.globalData.orderNotification;
    if (shopInfo) {
      this.setData({
        shopInfo,
        'formData.name': shopInfo.name || '',
        'formData.avatar': shopInfo.avatar || '',
        'formData.background': shopInfo.background || '',
        'formData.intro': shopInfo.intro || '',
        orderNotification
      });
    }
  },

  // 输入处理
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
  },

  onIntroInput(e) {
    this.setData({
      'formData.intro': e.detail.value
    });
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          'formData.avatar': tempFilePath
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

  // 选择背景图
  chooseBackground() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          'formData.background': tempFilePath
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
  previewAvatar() {
    if (this.data.formData.avatar) {
      wx.previewImage({
        urls: [this.data.formData.avatar]
      });
    }
  },

  previewBackground() {
    if (this.data.formData.background) {
      wx.previewImage({
        urls: [this.data.formData.background]
      });
    }
  },

  // 切换订单通知
  toggleOrderNotification(e) {
    const value = e.detail.value;
    this.setData({
      orderNotification: value
    });
    app.globalData.orderNotification = value;
    wx.setStorageSync('orderNotification', value);
  },

  // 保存设置
  saveSettings() {
    const formData = this.data.formData;
    
    if (!formData.name) {
      wx.showToast({
        title: '请输入店铺名称',
        icon: 'none'
      });
      return;
    }

    // 使用 Object.assign 替代展开运算符
    const shopInfo = Object.assign({}, app.globalData.shopInfo, {
      name: formData.name,
      avatar: formData.avatar,
      background: formData.background,
      intro: formData.intro
    });

    app.updateShopInfo(shopInfo);
    
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 管理厨房
  manageKitchens() {
    wx.navigateTo({
      url: '/pages/shop/kitchen-list/kitchen-list'
    });
  }
});
