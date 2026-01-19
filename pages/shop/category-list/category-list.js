// pages/shop/category-list/category-list.js
const app = getApp();
const util = require('../../../utils/util.js');

Page({
  data: {
    categories: []
  },

  onLoad() {
    // 检查管理员权限
    if (!this.checkAdminPermission()) {
      return;
    }
    this.loadCategories();
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
    const isAdmin = app.checkIsAdmin();
    
    if (!isAdmin) {
      wx.showModal({
        title: '权限不足',
        content: '只有管理员才能管理分类',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return false;
    }
    
    return true;
  },

  // 加载分类列表
  loadCategories() {
    const categories = wx.getStorageSync('categories') || [];
    this.setData({
      categories
    });
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
