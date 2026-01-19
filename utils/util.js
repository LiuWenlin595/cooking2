// utils/util.js

// 格式化时间
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 生成唯一ID
const generateId = () => {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 深拷贝
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
}

// 防抖函数
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction() {
    // 使用 arguments 替代剩余参数
    const args = arguments;
    const context = this;
    const later = function() {
      clearTimeout(timeout);
      // 使用 apply 替代展开运算符
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

module.exports = {
  formatTime,
  generateId,
  deepClone,
  debounce
}
