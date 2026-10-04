import request from '@/utils/request'

/**
 * 用户登录
 * @param {{ phone: string, password: string }} data
 * @returns {Promise<object>} LoginVO（含 JWT token）
 */
export function login(data) {
  return request.post('/user/login', data)
}

/**
 * 用户注册（角色由服务端强制为 USER）
 * @param {{ username: string, password: string, phone: string }} data
 * @returns {Promise<object>} RegisterVO
 */
export function register(data) {
  return request.post('/user/register', data)
}

/**
 * 获取当前登录用户信息（从 JWT 解析）
 */
export function getUserInfo() {
  return request.get('/user/info')
}
