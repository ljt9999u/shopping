import request from '@/utils/request'

/**
 * 订单服务（网关前缀 /api/oride）
 * 订单状态：0待付款 1待发货 2待收货 3已完成 4已取消 5已退款
 * 支付方式：1微信 2支付宝 3余额
 */

/**
 * 创建订单
 * @param {object} data OrderPOJO：{ userId, addressId, remark, detailList:[{productId, quantity}] }
 * @returns Promise<OrderPOJO> 后端计算金额、填充商品快照、扣减库存
 */
export function createOrder(data) {
  return request.post('/oride/order/create', data)
}

/**
 * 根据订单 ID 查询
 */
export function getOrderById(id) {
  return request.get(`/oride/order/${id}`)
}

/**
 * 根据订单号查询
 */
export function getOrderByNo(orderNo) {
  return request.get(`/oride/order/no/${orderNo}`)
}

/**
 * 分页查询用户订单
 * @param {number} userId 用户ID
 * @param {object|number} opts 传对象 { status?, pageNum?, pageSize? }，或直接传 pageNum（兼容旧调用）
 */
export function pageUserOrders(userId, opts = {}, pageSize = 10) {
  if (typeof opts === 'number') {
    opts = { pageNum: opts, pageSize }
  }
  return request.get(`/oride/order/user/${userId}`, {
    params: { status: opts.status, pageNum: opts.pageNum ?? 1, pageSize: opts.pageSize ?? 10 },
  })
}

/**
 * 分页查询商家订单（商家端支付记录）
 * @param {number} merchantId 商家ID
 * @param {object} opts { status?, pageNum?, pageSize? } status 不传查全部
 */
export function pageMerchantOrders(merchantId, { status, pageNum = 1, pageSize = 10 } = {}) {
  return request.get(`/oride/order/merchant/${merchantId}`, {
    params: { status, pageNum, pageSize },
  })
}

/**
 * 管理员：分页查询全部订单/支付记录
 * @param {object} opts { merchantId?, status?, pageNum?, pageSize? }
 */
export function pageAllOrders({ merchantId, status, pageNum = 1, pageSize = 10 } = {}) {
  return request.get('/oride/order/all', {
    params: { merchantId, status, pageNum, pageSize },
  })
}

/**
 * 查询订单明细
 */
export function listOrderDetail(orderId) {
  return request.get(`/oride/order/detail/${orderId}`)
}

/**
 * 取消订单
 */
export function cancelOrder(orderId) {
  return request.put(`/oride/order/cancel/${orderId}`)
}

/**
 * 支付订单（沙箱异步回调不可达时，用于模拟支付成功）
 * @param {{ orderId:number, payMethod?:number, tradeNo?:string }} params
 */
export function payOrder({ orderId, payMethod = 2, tradeNo = '' }) {
  return request.post('/oride/order/pay', null, {
    params: { orderId, payMethod, tradeNo },
  })
}

/**
 * 支付宝沙箱：生成收银台 HTML 表单
 * @param {string} orderNo 订单号，订单须为「待付款」
 * @returns Promise<string> 表单 HTML，写入页面后自动提交跳转沙箱收银台
 */
export function alipayPayForm(orderNo) {
  return request.get(`/oride/pay/alipay/${orderNo}`)
}

/**
 * 查询订单物流（商家发货后生成）
 * @param {string} orderNo 订单号
 * @returns Promise<Logistics> { logisticsNo, company, status: 0待发货 1已发货 2已签收 }
 */
export function getLogistics(orderNo) {
  return request.get(`/oride/logistics/${orderNo}`)
}

/**
 * 确认收货（订单须为「待收货」）
 */
export function receiveOrder(orderId) {
  return request.put(`/oride/order/receive/${orderId}`)
}
