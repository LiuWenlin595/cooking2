// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    isAdmin: false,
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
    
    // 如果未登录，直接提示（不使用 setTimeout）
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.nickName) {
      // 使用 wx.nextTick 确保页面渲染完成后显示
      wx.nextTick(() => {
        wx.showModal({
          title: '欢迎使用',
          content: '登录后可使用完整功能',
          confirmText: '立即登录',
          cancelText: '稍后',
          success: (res) => {
            if (res.confirm) {
              this.getUserInfo();
            }
          }
        });
      });
    }
  },

  onShow() {
    const isAdmin = app.checkIsAdmin();
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    this.setData({ 
      isAdmin,
      userInfo
    });
    this.loadStats();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
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
    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    app.getUserInfo().then((userInfo) => {
      wx.hideLoading();
      
      this.setData({
        userInfo,
        isAdmin: app.checkIsAdmin()
      });
      
      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500
      });
      
      // 刷新统计数据
      this.loadStats();
    }).catch((err) => {
      wx.hideLoading();
      
      console.error('获取用户信息失败:', err);
      
      // 根据错误类型显示不同提示
      let errorMsg = '登录失败，请重试';
      
      if (err.errMsg && err.errMsg.indexOf('cancel') > -1) {
        errorMsg = '您取消了授权';
      } else if (err.errMsg && err.errMsg.indexOf('fail') > -1) {
        errorMsg = '登录失败，请检查网络';
      } else if (err.errMsg) {
        errorMsg = '登录失败: ' + err.errMsg;
      }
      
      wx.showModal({
        title: '登录失败',
        content: errorMsg,
        showCancel: false
      });
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
  },

  // 跳转到分类管理
  goToCategoryList() {
    // 检查管理员权限
    if (!app.checkIsAdmin()) {
      wx.showModal({
        title: '权限不足',
        content: '只有管理员才能访问此功能',
        showCancel: false
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/shop/category-list/category-list'
    });
  },

  // 跳转到管理后台
  goToAdmin() {
    // 检查管理员权限
    if (!app.checkIsAdmin()) {
      wx.showModal({
        title: '权限不足',
        content: '只有管理员才能访问管理后台',
        showCancel: false
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  },


  // 更换账号
  switchAccount() {
    wx.showModal({
      title: '更换账号',
      content: '更换账号后需要重新登录并获取权限，确定要继续吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除用户信息（但保留其他数据）
          wx.removeStorageSync('userInfo');
          app.globalData.userInfo = null;
          app.globalData.isAdmin = false;
          
          // 重新登录
          app.getUserInfo().then((userInfo) => {
            this.setData({ 
              userInfo,
              isAdmin: app.checkIsAdmin()
            });
            
            this.loadStats();
            
            wx.showToast({
              title: '账号已切换',
              icon: 'success'
            });
          }).catch((err) => {
            console.error('登录失败:', err);
            this.setData({ 
              userInfo: null,
              isAdmin: false
            });
            
            wx.showToast({
              title: '切换失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后将无法使用需要登录的功能，确定要退出吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除用户信息（但保留其他数据）
          wx.removeStorageSync('userInfo');
          app.globalData.userInfo = null;
          app.globalData.isAdmin = false;
          
          this.setData({ 
            userInfo: null,
            isAdmin: false,
            stats: {
              recipeCount: 0,
              orderCount: 0,
              pendingOrderCount: 0,
              completedOrderCount: 0
            }
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  }
});
