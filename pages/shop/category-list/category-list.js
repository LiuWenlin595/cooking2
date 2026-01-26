// pages/shop/category-list/category-list.js
const app = getApp();
const util = require('../../../utils/util.js');

Page({
  data: {
    categories: []
  },

  onLoad() {
    console.log('===== shop/category-list onLoad 开始 =====');
    
    // ⭐ 修复：立即设置默认数据，确保页面有内容显示（防止真机白屏）
    this.setData({
      categories: []
    }, () => {
      console.log('✅ 默认数据设置完成');
    });
    
    try {
      // 检查管理员权限（延迟检查，确保页面先显示）
      if (!this.checkAdminPermission()) {
        return;
      }
      this.loadCategories();
    } catch (error) {
      console.error('onLoad 发生错误:', error);
      // 即使出错也保持默认数据显示
    }
  },

  onShow() {
    // 检查管理员权限
    if (!this.checkAdminPermission()) {
      return;
    }
    this.loadCategories();
  },

  // 检查管理员权限
  checkAdminPermission() {
    try {
      let isAdmin = false;
      try {
        isAdmin = app.checkIsAdmin();
      } catch (e) {
        console.error('检查管理员权限失败:', e);
      }
      
      if (!isAdmin) {
        // ⭐ 修复：延迟显示提示，确保页面先渲染
        if (typeof wx.nextTick === 'function') {
          wx.nextTick(() => {
            wx.showModal({
              title: '权限不足',
              content: '只有管理员才能管理分类',
              showCancel: false,
              success: () => {
                wx.navigateBack();
              }
            });
          });
        } else {
          setTimeout(() => {
            wx.showModal({
              title: '权限不足',
              content: '只有管理员才能管理分类',
              showCancel: false,
              success: () => {
                wx.navigateBack();
              }
            });
          }, 500);
        }
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('checkAdminPermission 发生错误:', error);
      return false;
    }
  },

  // 加载分类列表
  loadCategories() {
    try {
      let categories = [];
      try {
        categories = wx.getStorageSync('categories') || [];
      } catch (e) {
        console.error('读取分类数据失败:', e);
      }
      
      this.setData({
        categories: categories
      });
    } catch (error) {
      console.error('loadCategories 发生错误:', error);
      // 即使出错也设置空数组
      this.setData({
        categories: []
      });
    }
  },

  // 添加分类
  addCategory() {
    wx.showModal({
      title: '添加分类',
      editable: true,
      placeholderText: '请输入分类名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const name = res.content.trim();
          if (!name) {
            wx.showToast({
              title: '分类名称不能为空',
              icon: 'none'
            });
            return;
          }

          // 检查分类名称是否已存在
          const categories = wx.getStorageSync('categories') || [];
          const exists = categories.some(c => c.name === name);
          if (exists) {
            wx.showToast({
              title: '分类名称已存在',
              icon: 'none'
            });
            return;
          }

          // 直接保存分类
          this.saveCategory(name);
        }
      }
    });
  },

  // 保存分类
  saveCategory(name) {
    const categories = wx.getStorageSync('categories') || [];
    const newCategory = {
      id: util.generateId(),
      name: name
    };

    categories.push(newCategory);
    wx.setStorageSync('categories', categories);
    this.loadCategories();

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  // 编辑分类
  editCategory(e) {
    const id = e.currentTarget.dataset.id;
    const categories = wx.getStorageSync('categories') || [];
    const category = categories.find(c => c.id === id);
    
    if (!category) {
      wx.showToast({
        title: '分类不存在',
        icon: 'none'
      });
      return;
    }

    // 直接修改名称
    this.editCategoryName(id, category);
  },

  // 修改分类名称
  editCategoryName(id, category) {
    wx.showModal({
      title: '修改分类名称',
      editable: true,
      placeholderText: '请输入新的分类名称',
      content: category.name,
      success: (res) => {
        if (res.confirm && res.content) {
          const newName = res.content.trim();
          if (!newName) {
            wx.showToast({
              title: '分类名称不能为空',
              icon: 'none'
            });
            return;
          }

          // 检查分类名称是否已存在（排除当前分类）
          const categories = wx.getStorageSync('categories') || [];
          const exists = categories.some(c => c.name === newName && c.id !== id);
          if (exists) {
            wx.showToast({
              title: '分类名称已存在',
              icon: 'none'
            });
            return;
          }

          // 更新分类名称
          const updatedCategories = categories.map(c => {
            if (c.id === id) {
              // 使用 Object.assign 替代展开运算符
              return Object.assign({}, c, { name: newName });
            }
            return c;
          });

          wx.setStorageSync('categories', updatedCategories);
          this.loadCategories();

          wx.showToast({
            title: '修改成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 删除分类
  deleteCategory(e) {
    const id = e.currentTarget.dataset.id;
    const categories = wx.getStorageSync('categories') || [];
    const category = categories.find(c => c.id === id);
    
    if (!category) {
      wx.showToast({
        title: '分类不存在',
        icon: 'none'
      });
      return;
    }

    // 检查是否有菜谱使用该分类
    const recipes = wx.getStorageSync('recipes') || [];
    const hasRecipes = recipes.some(r => r.categoryId === id);

    if (hasRecipes) {
      wx.showModal({
        title: '无法删除',
        content: '该分类下还有菜谱，请先删除或移动这些菜谱',
        showCancel: false
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除分类"${category.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          const updatedCategories = categories.filter(c => c.id !== id);
          wx.setStorageSync('categories', updatedCategories);
          this.loadCategories();

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  }
});
