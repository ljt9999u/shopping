<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { getOrderByNo, payOrder } from '@/api/order'

const route = useRoute()
const router = useRouter()

const orderNo = ref(route.query.out_trade_no || '')
const order = ref(null)
const loading = ref(true)
const simulating = ref(false)
const errorMsg = ref('')

/* 查询次数：本地异步回调可能延迟，最多轮询约 40 秒 */
let pollTimer = null
let polls = 0
const MAX_POLLS = 16

const statusText = computed(() => {
  if (!order.value) return ''
  return ['待付款', '待发货', '待收货', '已完成', '已取消', '已退款'][order.value.status] || ''
})

const paid = computed(() => order.value && order.value.status >= 1 && order.value.status <= 3)
const cancelled = computed(() => order.value && (order.value.status === 4 || order.value.status === 5))

function formatPrice(val) {
  return Number(val || 0).toFixed(2)
}

async function queryOrder() {
  if (!orderNo.value) {
    loading.value = false
    errorMsg.value = '未获取到订单号'
    return
  }
  try {
    order.value = await getOrderByNo(orderNo.value)
    if (paid.value || cancelled.value) {
      stopPolling()
      loading.value = false
      return
    }
  } catch (e) {
    errorMsg.value = e?.message || '订单查询失败'
  }
  polls += 1
  if (polls >= MAX_POLLS) {
    stopPolling()
    loading.value = false
    return
  }
  pollTimer = setTimeout(queryOrder, 2500)
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

async function refreshNow() {
  stopPolling()
  loading.value = true
  polls = 0
  await queryOrder()
}

/**
 * 沙箱环境兜底：未配置公网 notify 地址时，支付宝异步通知无法到达后端，
 * 订单会一直停留在待付款。此处调用后端支付接口在测试环境确认支付成功。
 */
async function simulatePaid() {
  if (!order.value) return
  simulating.value = true
  errorMsg.value = ''
  try {
    await payOrder({
      orderId: order.value.id,
      payMethod: 2,
      tradeNo: route.query.trade_no || `SANDBOX_${orderNo.value}`,
    })
    await queryOrder()
  } catch (e) {
    errorMsg.value = e?.message || '确认支付状态失败'
  } finally {
    simulating.value = false
  }
}

onMounted(() => {
  queryOrder()
})

onUnmounted(stopPolling)
</script>

<template>
  <HomeLayout>
    <div class="pay-result container">
      <section class="result-card card fade-up">
        <!-- 支付成功 -->
        <template v-if="paid">
          <p class="result-icon success">✦</p>
          <h1 class="serif">支付成功</h1>
          <p class="result-sub">感谢你的信任，好物正在安排备货</p>
        </template>

        <!-- 已取消 / 已退款 -->
        <template v-else-if="cancelled">
          <p class="result-icon cancel">×</p>
          <h1 class="serif">订单已{{ statusText }}</h1>
          <p class="result-sub">订单号：{{ orderNo }}</p>
        </template>

        <!-- 查询中 / 待确认 -->
        <template v-else>
          <p v-if="loading" class="result-icon loading">◌</p>
          <p v-else class="result-icon pending">❋</p>
          <h1 class="serif">{{ loading ? '支付结果确认中' : '暂未收到支付确认' }}</h1>
          <p class="result-sub">
            沙箱环境若未配置公网回调，支付状态可能延迟
          </p>
        </template>

        <!-- 订单信息 -->
        <div v-if="order" class="order-box">
          <p><span>订单号</span><em>{{ order.orderNo }}</em></p>
          <p><span>订单状态</span><em>{{ statusText }}</em></p>
          <p><span>实付金额</span><em class="amount">¥{{ formatPrice(order.payAmount) }}</em></p>
        </div>

        <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

        <!-- 操作 -->
        <div class="result-actions">
          <button class="btn btn-primary" type="button" @click="router.push('/shop')">
            继续逛逛
          </button>

          <template v-if="!paid && !cancelled">
            <button class="btn btn-outline" type="button" :disabled="loading" @click="refreshNow">
              我已支付，刷新状态
            </button>
            <button
              class="btn btn-outline"
              type="button"
              :disabled="simulating || loading"
              @click="simulatePaid"
            >
              {{ simulating ? '确认中…' : '沙箱模拟确认支付（测试）' }}
            </button>
          </template>
        </div>

        <p class="result-tip">
          本站为个人测试网站，消费均为测试数据；「沙箱模拟确认支付」仅供无公网回调时的测试使用
        </p>
      </section>
    </div>
  </HomeLayout>
</template>

<style scoped>
.pay-result {
  padding: 70px 24px 90px;
}

.result-card {
  max-width: 540px;
  margin: 0 auto;
  padding: 52px 44px;
  text-align: center;
}

.result-icon {
  font-size: 44px;
  line-height: 1;
}

.result-icon.success {
  color: var(--color-primary);
}

.result-icon.cancel {
  color: var(--color-text-placeholder);
  font-size: 50px;
}

.result-icon.pending {
  color: var(--color-accent);
}

.result-icon.loading {
  color: var(--color-primary);
  animation: spin 1.4s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result-card h1 {
  margin-top: 18px;
  font-size: 26px;
  letter-spacing: 0.18em;
}

.result-sub {
  margin-top: 12px;
  font-size: 13.5px;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
}

/* 订单信息 */
.order-box {
  margin: 30px 0 8px;
  padding: 20px 24px;
  background: var(--color-bg-soft);
  border-radius: 12px;
  text-align: left;
}

.order-box p {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-size: 13.5px;
  padding: 6px 0;
}

.order-box span {
  color: var(--color-text-secondary);
}

.order-box em {
  font-style: normal;
}

.order-box .amount {
  color: var(--color-accent);
  font-weight: 600;
}

.error-text {
  margin-top: 14px;
  font-size: 13px;
  color: var(--color-accent);
}

/* 操作 */
.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 30px;
}

.result-actions .btn {
  padding: 10px 26px;
  font-size: 13.5px;
  letter-spacing: 0.1em;
}

.result-tip {
  margin-top: 26px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-text-placeholder);
}

@media (max-width: 560px) {
  .result-card {
    padding: 40px 24px;
  }
}
</style>
