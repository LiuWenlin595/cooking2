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
    console.log('===== shop/settings onLoad 开始 =====');
    
    // ⭐ 修复：立即设置默认数据，确保页面有内容显示（防止真机白屏）
    this.setData({
      shopInfo: null,
      formData: {
        name: '',
        avatar: '',
        background: '',
        intro: ''
      },
      orderNotification: true
    }, () => {
      console.log('✅ 默认数据设置完成');
    });
    
    try {
      this.loadShopInfo();
    } catch (error) {
      console.error('onLoad 发生错误:', error);
      // 即使出错也保持默认数据显示
    }
  },

  // 加载店铺信息
  loadShopInfo() {
    try {
      let shopInfo = null;
      let orderNotification = true;
      
      try {
        shopInfo = app.globalData.shopInfo;
        orderNotification = app.globalData.orderNotification !== undefined ? app.globalData.orderNotification : true;
      } catch (e) {
        console.error('读取店铺信息失败:', e);
      }
      
      if (shopInfo) {
        this.setData({
          shopInfo,
          'formData.name': shopInfo.name || '',
          'formData.avatar': shopInfo.avatar || '',
          'formData.background': shopInfo.background || '',
          'formData.intro': shopInfo.intro || '',
          orderNotification
        });
      } else {
        // 如果没有店铺信息，设置默认值
        const defaultShopInfo = {
          id: 'shop_001',
          name: '我的小店',
          avatar: '',
          background: '',
          intro: '欢迎来到我的小店'
        };
        this.setData({
          shopInfo: defaultShopInfo,
          'formData.name': defaultShopInfo.name,
          'formData.avatar': defaultShopInfo.avatar,
          'formData.background': defaultShopInfo.background,
          'formData.intro': defaultShopInfo.intro,
          orderNotification
        });
      }
    } catch (error) {
      console.error('loadShopInfo 发生错误:', error);
      // 即使出错也设置默认值
      this.setData({
        shopInfo: { id: 'shop_001', name: '我的小店', avatar: '', background: '', intro: '' },
        'formData.name': '我的小店',
        orderNotification: true
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
