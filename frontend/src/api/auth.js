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

//用户修改密码（#36：请求体平铺，不再包 { data }）
export const userChangePwdService = (data) => {
  return request.put('/api/user/password', data)
}

// 注销账号（#39）
export const deleteAccountService = () => {
  return request.delete('/api/user')
}

// 用户修改头像
export const uploadAvatarService = (file) => {
  const formData = new FormData()
  formData.append('avatar', file)
  return request.post('/api/user/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
