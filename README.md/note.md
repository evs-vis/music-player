useXxxStore() 必须在 Pinia 挂载之后调用，所以只能写在函数、组件 setup、或 main.js 里 app.use(pinia) 之后，绝对不能写在任何模块的顶层

## 登录页业务
  1.输入采集与初步过滤