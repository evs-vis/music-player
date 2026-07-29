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

//
