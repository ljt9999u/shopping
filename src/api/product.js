import request from '@/utils/request'

/**
 * 商品服务（/api/product）
 */

// ==================== 通用查询 ====================

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

// ==================== 商家后台 ====================

/**
 * 按商家分页查询商品（含全部状态）
 * @param {number} merchantId
 * @param {{ status?: number|null, pageNum?: number, pageSize?: number }} params
 */
export function pageProductsByMerchant(merchantId, params = {}) {
  return request.get(`/product/merchant/${merchantId}`, { params })
}

/**
 * 新增商品
 * @param {object} product
 */
export function addProduct(product) {
  return request.post('/product/add', product)
}

/**
 * 更新商品
 * @param {object} product
 */
export function updateProduct(product) {
  return request.put('/product/update', product)
}

/**
 * 下架商品（逻辑删除）
 * @param {number|string} id
 */
export function deleteProduct(id) {
  return request.delete(`/product/${id}`)
}

// ==================== 管理员审核 ====================

/**
 * 分页查询待审核商品（status=2）
 * @param {{ pageNum?: number, pageSize?: number }} params
 */
export function pageAuditProducts(params = {}) {
  return request.get('/product/audit/list', { params })
}

/**
 * 审核商品
 * @param {number|string} id 商品ID
 * @param {1|0} status 1通过上架，0拒绝下架
 * @param {string} [rejectReason] 拒绝原因（拒绝时必填）
 */
export function auditProduct(id, status, rejectReason) {
  return request.put('/product/audit', null, {
    params: { id, status, rejectReason },
  })
}

/**
 * 管理端分页查询全部状态商品（可按状态、名称过滤）
 * @param {object} params { status?, keyword?, pageNum, pageSize }
 */
export function pageAdminProducts(params = {}) {
  return request.get('/product/admin/page', { params })
}

// ==================== 辅助数据 ====================

/**
 * 获取全部分类平铺列表（商家发布商品用，仅启用）
 */
export function listCategories() {
  return request.get('/category/list')
}

/**
 * 获取全部分类（管理员分类管理，含禁用）
 */
export function listAllCategories() {
  return request.get('/category/listAll')
}

/**
 * 新增分类（管理员）
 * @param {{ name: string, parentId?: number, icon?: string, sort?: number, status?: number }} data
 */
export function addCategory(data) {
  return request.post('/category/add', data)
}

/**
 * 更新分类（管理员）
 * @param {{ id: number, name?: string, parentId?: number, icon?: string, sort?: number, status?: number }} data
 */
export function updateCategory(data) {
  return request.put('/category/update', data)
}

/**
 * 启用/禁用分类（管理员）
 * @param {number|string} id
 * @param {0|1} status
 */
export function updateCategoryStatus(id, status) {
  return request.put(`/category/status/${id}`, null, { params: { status } })
}

/**
 * 删除分类（管理员，存在子分类时后端拒绝）
 * @param {number|string} id
 */
export function deleteCategory(id) {
  return request.delete(`/category/${id}`)
}

/**
 * 获取全部品牌列表（商家发布商品用）
 */
export function listBrands() {
  return request.get('/brand/list')
}

// ==================== 评价 ====================

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

/**
 * 商家：分页查询本店所有商品的评价（含隐藏）
 * @param {number|string} merchantId
 * @param {{ pageNum?: number, pageSize?: number }} params
 */
export function pageCommentsByMerchant(merchantId, params = {}) {
  return request.get(`/product/comment/merchant/${merchantId}`, {
    params: { pageNum: params.pageNum ?? 1, pageSize: params.pageSize ?? 10 },
  })
}

/**
 * 商家回复评价
 * @param {number|string} id 评价ID
 * @param {string} merchantReply 回复内容
 */
export function replyComment(id, merchantReply) {
  return request.put('/product/comment/reply', null, {
    params: { id, merchantReply },
  })
}
