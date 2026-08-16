import request from '@/utils/request'

// 用户登录请求
export const userLoginService = (username, password) => {
  return request.post('/api/login', {
    username,
    password
  })
}

// 用户注册请求
export const userRegisterService = (username, password) => {
  return request.post('/api/register', {
    username,
    password
  })
}

//用户修改密码
export const userChangePwdService = (data) => {
  return request.put('/api/user/password', data)
}

// 注销账号
export const deleteAccountService = () => {
  return request.delete('/api/user')
}

// 用户修改头像
export const uploadAvatarService = (file) => {
  const formData = new FormData()
  formData.append('avatar', file)
  return request.post('/api/user/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // 页面内已自行处理上传错误提示（showNotify），跳过拦截器统一 toast，避免重复提示/残留
    suppressErrorToast: true
  })
}
