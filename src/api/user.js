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
 * 分页查询用户（管理端）
 * @param {object} params { pageNum, pageSize, keyword? }
 */
export function pageUsers(params = {}) {
  return request.get('/user/page', { params })
}

/**
 * 启用/禁用用户账号（管理端）
 * @param {number|string} id
 * @param {number} status 0禁用 1启用
 */
export function updateUserStatus(id, status) {
  return request.put(`/user/status/${id}`, null, { params: { status } })
}

/**
 * 平台数据看板统计（管理端）
 * 总量 + 近6个月注册/商家/商品/收益趋势 + 在售商品分类占比
 */
export function fetchAdminStats() {
  return request.get('/user/admin/stats')
}

/**
 * 图表明细下钻（管理端，点击图表数据点弹窗展示）
 * @param {'user'|'merchant'|'product'|'revenue'|'category'} type
 * @param {string} [month] 格式 2026-10（category 类型不传）
 * @param {string} [name] 分类名称（type=category 时必传）
 */
export function fetchStatsDetail(type, month, name) {
  const params = { type }
  if (month) params.month = month
  if (name) params.name = name
  return request.get('/user/admin/stats/detail', { params })
}

/**
 * 修改密码（需登录，服务端校验旧密码）
 * @param {string} oldPassword 原密码
 * @param {string} newPassword 新密码（8-20 位，含大小写字母/数字/特殊字符）
 */
export function updatePassword(oldPassword, newPassword) {
  return request.put('/user/password', null, {
    params: { oldPassword, newPassword },
  })
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
