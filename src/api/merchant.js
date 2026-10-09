import request from '@/utils/request'

/**
 * 商家服务（网关前缀 /api/merchant）
 */

/**
 * 根据用户ID查询当前登录商家的店铺信息（用 userId 换 merchantId）
 * @param {number} userId 登录账号 userId
 * @returns Promise<Merchant> { id, userId, shopName, shopLogo, status, ... }
 */
export function getMerchantByUserId(userId) {
  return request.get(`/merchant/user/${userId}`)
}

/**
 * 根据商家ID查询店铺
 */
export function getMerchantById(id) {
  return request.get(`/merchant/${id}`)
}

/**
 * 分页查询全部商家（管理员筛选店铺用）
 */
export function pageMerchants(pageNum = 1, pageSize = 100) {
  return request.get('/merchant/page', {
    params: { pageNum, pageSize },
  })
}

/**
 * 更新商家店铺信息（商家维护店铺资料）
 * @param {object} data Merchant：{ id, shopName, shopLogo, contactPhone, ... }
 */
export function updateMerchant(data) {
  return request.put('/merchant/update', data)
}

/**
 * 商家入驻申请（用户提交认证信息，被拒后可重新提交）
 * @param {object} data Merchant：{ userId, shopName, businessLicense, licenseImage, contactPhone, shopLogo? }
 */
export function applyMerchant(data) {
  return request.post('/merchant/apply', data)
}

/**
 * 按状态分页查询商家（管理端审核用）
 * @param {number} status 0待审核 1已通过 2已拒绝
 */
export function pageMerchantsByStatus(status, pageNum = 1, pageSize = 20) {
  return request.get('/merchant/pageByStatus', {
    params: { status, pageNum, pageSize },
  })
}

/**
 * 审核商家（管理端：1通过并升级用户角色 2拒绝）
 */
export function auditMerchant(id, status) {
  return request.put(`/merchant/audit/${id}`, null, {
    params: { status },
  })
}
