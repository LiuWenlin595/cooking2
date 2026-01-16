// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    stats: {
      recipeCount: 0,
      orderCount: 0,
      pendingOrderCount: 0,
      completedOrderCount: 0
    }
  },

  onLoad() {
    this.loadUserInfo();
    this.loadStats();
  },

  onShow() {
    this.loadStats();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({
        userInfo
      });
    }
  },

  // 加载统计数据
  loadStats() {
    const recipes = wx.getStorageSync('recipes') || [];
    const orders = wx.getStorageSync('orders') || [];
    const currentKitchen = app.globalData.currentKitchen;
    
    if (!currentKitchen) {
      this.setData({
        stats: {
          recipeCount: 0,
          orderCount: 0,
          pendingOrderCount: 0,
          completedOrderCount: 0
        }
      });
      return;
    }
    
    // 过滤当前厨房的菜谱
    const kitchenRecipes = recipes.filter(r => 
      !r.kitchenId || r.kitchenId === currentKitchen.id
    );
    
    // 过滤当前厨房的订单
    const kitchenOrders = orders.filter(o => 
      o.kitchenId === currentKitchen.id
    );

    this.setData({
      stats: {
        recipeCount: kitchenRecipes.length,
        orderCount: kitchenOrders.length,
        pendingOrderCount: kitchenOrders.filter(o => o.status === 'pending').length,
        completedOrderCount: kitchenOrders.filter(o => o.status === 'completed').length
      }
    });
  },

  // 获取用户信息
  getUserInfo() {
    app.getUserInfo().then((userInfo) => {
      this.setData({
        userInfo
      });
    }).catch((err) => {
      console.error('获取用户信息失败:', err);
    });
  },

  // 导出数据
  exportData() {
    wx.showActionSheet({
      itemList: ['导出所有数据', '仅导出菜谱'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 导出所有数据
          this.exportAllData();
        } else if (res.tapIndex === 1) {
          // 仅导出菜谱
          this.exportRecipesOnly();
        }
      }
    });
  },

  // 导出所有数据
  exportAllData() {
    const data = app.getAllData();
    const dataStr = JSON.stringify(data, null, 2);
    
    wx.setClipboardData({
      data: dataStr,
      success: () => {
        wx.showModal({
          title: '导出成功',
          content: '所有数据已复制到剪贴板，请粘贴保存',
          showCancel: false
        });
      },
      fail: () => {
        wx.showToast({
          title: '导出失败',
          icon: 'none'
        });
      }
    });
  },

  // 仅导出菜谱
  exportRecipesOnly() {
    const recipes = wx.getStorageSync('recipes') || [];
    const currentKitchen = app.globalData.currentKitchen;
    
    // 过滤当前厨房的菜谱
    let kitchenRecipes = recipes;
    if (currentKitchen) {
      kitchenRecipes = recipes.filter(r => 
        !r.kitchenId || r.kitchenId === currentKitchen.id
      );
    }
    
    const data = {
      recipes: kitchenRecipes,
      categories: wx.getStorageSync('categories') || [],
      exportTime: new Date().toISOString(),
      exportType: 'recipes_only'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    
    wx.setClipboardData({
      data: dataStr,
      success: () => {
        wx.showModal({
          title: '导出成功',
          content: `已导出 ${kitchenRecipes.length} 个菜谱，数据已复制到剪贴板`,
          showCancel: false
        });
      },
      fail: () => {
        wx.showToast({
          title: '导出失败',
          icon: 'none'
        });
      }
    });
  },

  // 导入数据
  importData() {
    wx.showModal({
      title: '导入数据',
      content: '请将JSON数据复制到剪贴板后点击确定\n注意：导入会覆盖现有数据！',
      success: (res) => {
        if (res.confirm) {
          wx.getClipboardData({
            success: (clipRes) => {
              try {
                const data = JSON.parse(clipRes.data);
                
                // 验证数据格式
                if (!data || typeof data !== 'object') {
                  wx.showToast({
                    title: '数据格式错误',
                    icon: 'none'
                  });
                  return;
                }
                
                // 再次确认
                wx.showModal({
                  title: '确认导入',
                  content: '导入数据将覆盖现有数据，确定要继续吗？',
                  success: (confirmRes) => {
                    if (confirmRes.confirm) {
                      const success = app.importData(data);
                      if (success) {
                        wx.showModal({
                          title: '导入成功',
                          content: '数据已成功导入，请刷新页面查看',
                          showCancel: false,
                          success: () => {
                            // 重新加载数据
                            this.loadStats();
                            // 刷新其他页面
                            const pages = getCurrentPages();
                            pages.forEach(page => {
                              if (page.onShow) {
                                page.onShow();
                              }
                            });
                          }
                        });
                      } else {
                        wx.showToast({
                          title: '导入失败',
                          icon: 'none'
                        });
                      }
                    }
                  }
                });
              } catch (e) {
                console.error('导入数据错误:', e);
                wx.showToast({
                  title: '数据格式错误',
                  icon: 'none'
                });
              }
            },
            fail: () => {
              wx.showToast({
                title: '读取剪贴板失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 清空数据
  clearData() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有数据吗？此操作不可恢复！',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          // 重新初始化
          app.initLocalData();
          
          wx.showToast({
            title: '清空成功',
            icon: 'success'
          });
          
          setTimeout(() => {
            this.loadStats();
            // 返回首页
            wx.switchTab({
              url: '/pages/kitchen/kitchen'
            });
          }, 1500);
        }
      }
    });
  },

  // 跳转到店铺设置
  goToSettings() {
    wx.navigateTo({
      url: '/pages/shop/settings/settings'
    });
  }
});
