import request from '@/utils/request'

/**
 * 收货地址管理（接口归属商家服务，网关前缀 /api/merchant/address）
 * UserAddress 字段：id, userId, consignee, phone, province, city, district, detail, isDefault
 */

/**
 * 查询用户所有地址（默认地址排在最前）
 * @param {number|string} userId
 */
export function listAddresses(userId) {
  return request.get(`/merchant/address/user/${userId}`)
}

/**
 * 查询用户默认地址
 * @param {number|string} userId
 */
export function getDefaultAddress(userId) {
  return request.get(`/merchant/address/default/${userId}`)
}

/**
 * 新增地址
 * @param {object} data UserAddress
 */
export function addAddress(data) {
  return request.post('/merchant/address/add', data)
}

/**
 * 更新地址
 * @param {object} data UserAddress
 */
export function updateAddress(data) {
  return request.put('/merchant/address/update', data)
}

/**
 * 设置默认地址
 * @param {number|string} userId
 * @param {number|string} addressId
 */
export function setDefaultAddress(userId, addressId) {
  return request.put('/merchant/address/default', null, {
    params: { userId, addressId },
  })
}

/**
 * 删除地址
 * @param {number|string} id
 */
export function deleteAddress(id) {
  return request.delete(`/merchant/address/${id}`)
}
