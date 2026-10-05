import request from '@/utils/request'

/**
 * 购物车服务（/api/cart）
 * Cart 字段：id, userId, productId, specId, quantity, checked
 * 列表项额外含：productName, productImage, price, stock, productStatus, subtotal, valid
 */

/**
 * 加入购物车（同商品会合并数量）
 * @param {{ userId: number, productId: number, quantity?: number, specId?: number }} data
 */
export function addToCart(data) {
  return request.post('/cart/add', data)
}

/**
 * 查询购物车列表（含汇总：items / totalAmount / totalCount / validCount）
 * @param {number|string} userId
 */
export function listCart(userId) {
  return request.get(`/cart/list/${userId}`)
}

/**
 * 统计购物车种类数（角标）
 * @param {number|string} userId
 */
export function countCart(userId) {
  return request.get(`/cart/count/${userId}`)
}

/**
 * 修改购物车项数量
 * @param {number|string} id 购物车项 ID
 * @param {number} quantity
 */
export function updateQuantity(id, quantity) {
  return request.put(`/cart/quantity/${id}`, null, { params: { quantity } })
}

/**
 * 修改勾选状态：0 取消 1 勾选
 * @param {number|string} id
 * @param {number} checked
 */
export function updateChecked(id, checked) {
  return request.put(`/cart/checked/${id}`, null, { params: { checked } })
}

/**
 * 删除单个购物车项
 * @param {number|string} id
 */
export function deleteCartItem(id) {
  return request.delete(`/cart/${id}`)
}
