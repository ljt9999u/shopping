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

/**
 * 根据 ID 查询用户完整信息（密码已脱敏）
 * @param {number|string} id
 */
export function getUserById(id) {
  return request.get(`/user/${id}`)
}

/**
 * 修改个人资料（昵称、邮箱、头像、性别）
 * 用户 ID 由网关注入，无需也无法在 body 指定
 * @param {{ nickname?: string, email?: string, avatar?: string, gender?: number }} data
 */
export function updateProfile(data) {
  return request.put('/user/update', data)
}
