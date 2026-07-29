// postcss.config.js
module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 375,      // 设计稿宽度，通常 375（一倍图）
      unitPrecision: 5,        // 转换后保留的小数位
      viewportUnit: 'vw',      // 转换后的单位
      selectorBlackList: ['.ignore', '.hairlines'], // 不需要转换的类名
      minPixelValue: 1,        // 小于等于该值的 px 不转换
      mediaQuery: false      // 媒体查询里的 px 是否转换
     
    }
  }
};
