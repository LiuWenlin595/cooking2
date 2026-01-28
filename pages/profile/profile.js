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
    console.log('===== profile onLoad 开始 =====');
    
    // ⭐ 修复：立即设置默认数据，确保页面有内容显示（防止真机白屏）
    this.setData({
      userInfo: null,
      isAdmin: false,
      stats: {
        recipeCount: 0,
        orderCount: 0,
        pendingOrderCount: 0,
        completedOrderCount: 0
      }
    }, () => {
      console.log('✅ 默认数据设置完成');
    });
    
    try {
      // 加载用户信息和统计数据
      this.loadUserInfo();
      this.loadStats();
      
      // ⭐ 修复：不自动检查缓存，只检查 globalData
      // 如果未登录，延迟显示提示（确保页面先渲染）
      try {
        // ⭐ 只检查 globalData，不检查缓存
        // 确保用户必须主动点击登录按钮授权
        const userInfo = app.globalData.userInfo;
        if (!userInfo || !userInfo.nickName) {
          // 使用 wx.nextTick 或 setTimeout 确保页面渲染完成后显示
          if (typeof wx.nextTick === 'function') {
            wx.nextTick(() => {
              wx.showModal({
                title: '欢迎使用',
                content: '登录后可使用完整功能',
                confirmText: '立即登录',
                cancelText: '稍后',
                success: (res) => {
                  if (res.confirm) {
                    // ⭐ 用户点击确认后，直接调用 getUserInfo
                    // 这会触发 wx.getUserProfile，弹出授权弹窗
                    this.getUserInfo();
                  }
                }
              });
            });
          } else {
            setTimeout(() => {
              wx.showModal({
                title: '欢迎使用',
                content: '登录后可使用完整功能',
                confirmText: '立即登录',
                cancelText: '稍后',
                success: (res) => {
                  if (res.confirm) {
                    // ⭐ 用户点击确认后，直接调用 getUserInfo
                    this.getUserInfo();
                  }
                }
              });
            }, 500);
          }
        }
      } catch (e) {
        console.error('检查登录状态失败:', e);
      }
    } catch (error) {
      console.error('onLoad 发生错误:', error);
      // 即使出错也保持默认数据显示
    }
  },

  onShow() {
    // ⭐ 修复：只从 globalData 获取，不自动从缓存加载
    const isAdmin = app.checkIsAdmin();
    const userInfo = app.globalData.userInfo; // 不检查缓存
    this.setData({ 
      isAdmin: isAdmin,
      userInfo: userInfo
    });
    this.loadStats();
  },

  // 加载用户信息
  // ⭐ 修复：只从 globalData 加载，不自动从缓存加载
  // 确保用户必须主动授权才能登录
  loadUserInfo() {
    try {
      // ⭐ 只检查 globalData，不检查缓存
      // 如果 globalData 中没有，说明用户未登录，需要主动授权
      const userInfo = app.globalData.userInfo;
      
      if (userInfo && userInfo.nickName) {
        this.setData({
          userInfo: userInfo
        });
        console.log('✅ 已加载用户信息:', userInfo.nickName);
      } else {
        // 未登录，设置为 null
        this.setData({
          userInfo: null
        });
        console.log('ℹ️ 用户未登录，需要主动授权');
      }
    } catch (error) {
      console.error('loadUserInfo 发生错误:', error);
      this.setData({
        userInfo: null
      });
    }
  },

  // 加载统计数据
  loadStats() {
    try {
      let recipes = [];
      let orders = [];
      let currentKitchen = null;
      
      try {
        recipes = wx.getStorageSync('recipes') || [];
      } catch (e) {
        console.error('读取菜谱数据失败:', e);
      }
      
      try {
        orders = wx.getStorageSync('orders') || [];
      } catch (e) {
        console.error('读取订单数据失败:', e);
      }
      
      try {
        currentKitchen = app.globalData.currentKitchen;
      } catch (e) {
        console.error('获取厨房信息失败:', e);
      }
      
      if (!currentKitchen || !currentKitchen.id) {
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
      let kitchenRecipes = [];
      try {
        kitchenRecipes = recipes.filter(r => 
          !r.kitchenId || r.kitchenId === currentKitchen.id
        );
      } catch (e) {
        console.error('过滤菜谱失败:', e);
      }
      
      // 过滤当前厨房的订单
      let kitchenOrders = [];
      try {
        kitchenOrders = orders.filter(o => 
          o.kitchenId === currentKitchen.id
        );
      } catch (e) {
        console.error('过滤订单失败:', e);
      }

      this.setData({
        stats: {
          recipeCount: kitchenRecipes.length,
          orderCount: kitchenOrders.length,
          pendingOrderCount: kitchenOrders.filter(o => o.status === 'pending').length,
          completedOrderCount: kitchenOrders.filter(o => o.status === 'completed').length
        }
      });
    } catch (error) {
      console.error('loadStats 发生错误:', error);
      // 即使出错也设置默认值
      this.setData({
        stats: {
          recipeCount: 0,
          orderCount: 0,
          pendingOrderCount: 0,
          completedOrderCount: 0
        }
      });
    }
  },

  // 获取用户信息
  // ⭐ 修复：参考微信官方文档，使用 wx.login() 获取 code，然后通过后端换取 openid
  // 参考：https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html
  // 参考：https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html
  getUserInfo() {
    console.log('========== 用户点击登录按钮 ==========');
    console.log('使用 wx.login() 获取用户 code');
    
    // ⭐ 关键修复：先清除所有缓存，确保不会使用旧的授权信息
    console.log('清除旧的用户信息和授权缓存...');
    app.globalData.userInfo = null;
    try {
      wx.removeStorageSync('userInfo');
      console.log('✅ 已清除缓存的用户信息');
    } catch (e) {
      console.error('清除用户信息失败:', e);
    }
    
    wx.showLoading({
      title: '登录中...',
      mask: true
    });
    
    // ⭐ 第一步：调用 wx.login() 获取临时登录凭证 code
    // wx.login() 不需要用户授权，可以直接调用
    // 参考：https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          const code = loginRes.code;
          console.log('✅ wx.login 成功，code:', code.substring(0, 10) + '...');
          
          // ⭐ 第二步：将 code 发送到后端，换取 openid 和 session_key
          // 后端需要调用微信服务器的 code2Session 接口
          // 参考：https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html
          this.getUserOpenIdFromBackend(code).then((userData) => {
            wx.hideLoading();
            
            // ⭐ 保存用户信息（包含 openid）
            const completeUserInfo = {
              openid: userData.openid,
              session_key: userData.session_key,
              code: code,
              loginTime: new Date().toISOString(),
              // 用户昵称和头像需要用户授权才能获取，这里先不获取
              nickName: userData.nickName || '微信用户',
              avatarUrl: userData.avatarUrl || ''
            };
            
            // 保存到全局数据和本地存储
            app.globalData.userInfo = completeUserInfo;
            try {
              wx.setStorageSync('userInfo', completeUserInfo);
              console.log('✅ 用户信息已保存');
              console.log('用户 openid:', completeUserInfo.openid);
            } catch (e) {
              console.error('保存用户信息失败:', e);
            }
            
            // 重新检查管理员状态
            app.checkIsAdmin();
            
            this.setData({
              userInfo: completeUserInfo,
              isAdmin: app.checkIsAdmin()
            });
            
            wx.showToast({
              title: '登录成功',
              icon: 'success',
              duration: 1500
            });
            
            // 刷新统计数据
            this.loadStats();
            
            console.log('========== 登录成功 ==========');
            
            // ⭐ 可选：如果需要获取用户昵称和头像，可以提示用户授权
            // 但这不是必须的，openid 已经可以唯一标识用户
            this.optionalGetUserProfile();
          }).catch((err) => {
            wx.hideLoading();
            console.error('❌ 获取 openid 失败:', err);
            
            wx.showModal({
              title: '登录失败',
              content: '无法获取用户身份，请检查网络连接或联系管理员',
              showCancel: false
            });
          });
        } else {
          wx.hideLoading();
          console.error('❌ wx.login 失败: code 为空');
          wx.showModal({
            title: '登录失败',
            content: '无法获取登录凭证，请重试',
            showCancel: false
          });
        }
      },
      fail: (loginErr) => {
        wx.hideLoading();
        console.error('❌ wx.login 失败:', loginErr);
        wx.showModal({
          title: '登录失败',
          content: '登录失败，请重试',
          showCancel: false
        });
      }
    });
  },
  
  // ⭐ 从后端获取 openid
  // 后端需要调用微信服务器的 code2Session 接口
  getUserOpenIdFromBackend(code) {
    return new Promise((resolve, reject) => {
      const app = getApp();
      const cloudStorage = require('../../utils/cloudStorage');
      const apiBaseUrl = cloudStorage.config.apiBaseUrl;
      
      // 如果后端服务未配置，使用模拟数据（仅用于测试）
      if (apiBaseUrl === 'https://your-server.com/api' || apiBaseUrl === 'https://your-server.com' || !apiBaseUrl || apiBaseUrl.includes('your-server')) {
        console.warn('⚠️ 后端服务未配置，使用模拟 openid（仅用于测试）');
        console.warn('⚠️ 请参考"后端服务配置说明.md"配置后端服务');
        console.warn('⚠️ 模拟 openid 仅用于开发测试，不能用于生产环境');
        
        // ⭐ 改进：基于 code 生成稳定的模拟 openid
        // 这样同一个 code 会生成相同的 openid（在 code 有效期内）
        // 使用简单的哈希算法，确保相同 code 生成相同 openid
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
          const char = code.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        const mockOpenid = 'mock_' + Math.abs(hash).toString(36) + '_' + code.substring(0, 8);
        
        console.warn('⚠️ 模拟 openid:', mockOpenid);
        console.warn('⚠️ 要获取真实的 openid，请配置后端服务');
        
        resolve({
          openid: mockOpenid,
          session_key: 'mock_session_key',
          nickName: '微信用户',
          avatarUrl: ''
        });
        return;
      }
      
      // 调用后端接口获取 openid
      wx.request({
        url: `${apiBaseUrl}/api/user/getOpenId`,
        method: 'POST',
        data: {
          code: code
        },
        header: {
          'content-type': 'application/json'
        },
        // ⭐ 添加超时和兼容性配置
        timeout: 10000,  // 10秒超时
        enableHttp2: false,  // 禁用 HTTP/2，使用 HTTP/1.1（小程序兼容性更好）
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            console.log('✅ 获取 openid 成功');
            resolve(res.data.data);
          } else {
            reject(new Error(res.data.message || '获取 openid 失败'));
          }
        },
        fail: (err) => {
          console.error('获取 openid 失败:', err);
          console.error('错误详情:', JSON.stringify(err, null, 2));
          
          // 提供更详细的错误信息
          let errorMessage = '网络请求失败';
          if (err.errMsg) {
            if (err.errMsg.includes('certificate') || err.errMsg.includes('SSL') || err.errMsg.includes('TLS')) {
              errorMessage = 'SSL证书验证失败，请检查服务器证书配置';
            } else if (err.errMsg.includes('timeout')) {
              errorMessage = '请求超时，请检查网络连接';
            } else if (err.errMsg.includes('fail')) {
              errorMessage = '无法连接到服务器，请检查服务器是否正常运行';
            }
          }
          
          wx.showModal({
            title: '登录失败',
            content: `${errorMessage}\n\n请确认：\n1. 服务器是否正常运行\n2. 网络连接是否正常\n3. 开发者工具中是否关闭了"不校验合法域名"`,
            showCancel: false
          });
          
          reject(new Error(errorMessage));
        }
      });
    });
  },
  
  // ⭐ 可选：获取用户昵称和头像（需要用户授权）
  // 这不是必须的，openid 已经可以唯一标识用户
  optionalGetUserProfile() {
    // 可以提示用户是否授权获取昵称和头像
    // 但这不是必须的，不影响登录功能
    console.log('ℹ️ 如需获取用户昵称和头像，可以调用 wx.getUserProfile');
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
          // ⭐ 修复：清除所有用户信息，包括全局数据和本地存储
          wx.removeStorageSync('userInfo');
          app.globalData.userInfo = null;
          app.globalData.isAdmin = false;
          
          // 更新页面状态
          this.setData({ 
            userInfo: null,
            isAdmin: false
          });
          
          // ⭐ 修复：直接调用 getUserInfo，让用户重新授权
          // 必须在用户点击事件中直接调用，不能延迟
          this.getUserInfo();
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
