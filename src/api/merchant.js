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
