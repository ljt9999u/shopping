import request from '@/utils/request'

/**
 * 商品服务（/api/product）
 */

/**
 * 根据 ID 查询商品
 * @param {number|string} id
 */
export function getProductById(id) {
  return request.get(`/product/${id}`)
}

/**
 * 分页查询上架商品
 * @param {{ pageNum?: number, pageSize?: number }} params
 */
export function pageProducts(params = {}) {
  return request.get('/product/page', { params })
}

/**
 * 模糊搜索商品
 * @param {{ keyword: string, pageNum?: number, pageSize?: number }} params
 */
export function searchProducts(params) {
  return request.get('/product/search', { params })
}

/**
 * 按分类分页查询商品
 * @param {{ categoryId: number|string, pageNum?: number, pageSize?: number }} params
 */
export function pageByCategory(params) {
  return request.get('/product/category', { params })
}

/**
 * 分页查询商品评价
 * @param {number|string} productId
 * @param {{ pageNum?: number, pageSize?: number }} params
 */
export function listProductComments(productId, params = {}) {
  return request.get(`/product/comment/list/${productId}`, { params })
}

/**
 * 查询商品评价汇总（平均分、总数、好评率、星级分布、带图数）
 * @param {number|string} productId
 */
export function getCommentSummary(productId) {
  return request.get(`/product/comment/summary/${productId}`)
}
