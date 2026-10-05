<script setup>
import { reactive, ref } from 'vue'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { pageUserOrders, alipayPayForm, getLogistics, receiveOrder } from '@/api/order'

const auth = useAuthStore()
const toastMsg = ref('')

const loading = ref(false)
const errorMsg = ref('')
const orders = ref([])
const activeStatus = ref(null)
const page = reactive({ pageNum: 1, pageSize: 5, total: 0, pages: 0 })

const logisticsMap = ref({}) // orderNo -> Logistics
const receivingId = ref(null)
const payingId = ref(null)

const tabs = [
  { label: '全部订单', value: null },
  { label: '待付款', value: 0 },
  { label: '待发货', value: 1 },
  { label: '待收货', value: 2 },
  { label: '已完成', value: 3 },
  { label: '已取消', value: 4 },
  { label: '已退款', value: 5 },
]

const STATUS_TEXT = {
  0: '待付款',
  1: '待发货',
  2: '待收货',
  3: '已完成',
  4: '已取消',
  5: '已退款',
}

const PAY_TEXT = { 1: '微信支付', 2: '支付宝', 3: '余额支付' }

const LOGISTICS_TEXT = { 0: '待发货', 1: '运输中', 2: '已签收' }

function pad(n) {
  return String(n).padStart(2, '0')
}

// 兼容 Jackson 默认数组格式 [y,m,d,h,mi,s] 与 ISO 字符串
function fmtTime(t) {
  if (!t) return '—'
  if (Array.isArray(t)) {
    const [y, m, d, h = 0, mi = 0] = t
    return `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(mi)}`
  }
  return String(t).replace('T', ' ').slice(0, 16)
}

/* 已发货的订单（待收货/已完成）查询物流信息 */
async function loadLogistics(list) {
  const shipped = list.filter((o) => o.status === 2 || o.status === 3)
  await Promise.all(
    shipped.map(async (o) => {
      try {
        logisticsMap.value[o.orderNo] = await getLogistics(o.orderNo)
      } catch {
        /* 无物流记录时静默忽略 */
      }
    }),
  )
}

async function loadOrders() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await pageUserOrders(auth.userId, {
      status: activeStatus.value,
      pageNum: page.pageNum,
      pageSize: page.pageSize,
    })
    orders.value = data.list || []
    page.total = data.total
    page.pages = data.pages
    await loadLogistics(orders.value)
  } catch (e) {
    errorMsg.value = e?.message || '订单加载失败'
  } finally {
    loading.value = false
  }
}

function switchTab(value) {
  if (activeStatus.value === value) return
  activeStatus.value = value
  page.pageNum = 1
  loadOrders()
}

function goPage(target) {
  if (target < 1 || target > page.pages || target === page.pageNum) return
  page.pageNum = target
  loadOrders()
}

/* 待付款订单：唤起支付宝沙箱收银台 */
async function payNow(order) {
  payingId.value = order.id
  try {
    const formHtml = await alipayPayForm(order.orderNo)
    const holder = document.createElement('div')
    holder.setAttribute('style', 'display:none')
    holder.innerHTML = formHtml
    document.body.appendChild(holder)
    const form = holder.querySelector('form')
    if (form) {
      // 表单自带的自动提交脚本在 innerHTML 中不会执行，这里手动提交
      form.submit()
    } else {
      document.open()
      document.write(formHtml)
      document.close()
    }
  } catch (e) {
    payingId.value = null
    showToast(e?.message || '唤起支付宝沙箱失败，请稍后再试')
  }
}

/* 待收货订单：确认收货 */
async function confirmReceive(order) {
  receivingId.value = order.id
  try {
    await receiveOrder(order.id)
    showToast('已确认收货，感谢您的信任')
    await loadOrders()
  } catch (e) {
    showToast(e?.message || '确认收货失败')
  } finally {
    receivingId.value = null
  }
}

let toastTimer = null
function showToast(msg) {
  toastMsg.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMsg.value = ''
  }, 3000)
}

loadOrders()
</script>

<template>
  <HomeLayout>
    <section class="banner">
      <div class="container">
        <div class="banner-inner fade-up">
          <div>
            <p class="banner-en latin">My Orders</p>
            <h1>我的订单</h1>
            <p class="banner-desc">支付记录与物流轨迹，皆可在此安心查看</p>
          </div>
          <span class="banner-mark">❒</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <!-- 状态筛选 -->
        <div class="tabs">
          <button
            v-for="t in tabs"
            :key="t.label"
            type="button"
            class="tab"
            :class="{ active: activeStatus === t.value }"
            @click="switchTab(t.value)"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- 加载 / 错误 / 空态 -->
        <div v-if="loading" class="state card">
          <span class="state-icon">❋</span>
          <p>订单加载中…</p>
        </div>
        <div v-else-if="errorMsg" class="state card">
          <span class="state-icon">！</span>
          <p>{{ errorMsg }}</p>
        </div>
        <div v-else-if="orders.length === 0" class="state card">
          <span class="state-icon">❋</span>
          <p>暂无相关订单，去挑一件心仪的美物吧</p>
        </div>

        <!-- 订单列表 -->
        <div v-else class="order-list">
          <article v-for="order in orders" :key="order.id" class="order-card card">
            <div class="order-top">
              <div class="order-meta">
                <span class="order-no latin">{{ order.orderNo }}</span>
                <span class="order-time muted">{{ fmtTime(order.createTime) }}</span>
              </div>
              <span class="status-badge" :class="`st-${order.status}`">
                {{ STATUS_TEXT[order.status] }}
              </span>
            </div>

            <!-- 商品明细 -->
            <ul class="goods">
              <li v-for="d in order.detailList" :key="d.id" class="goods-item">
                <div class="thumb">
                  <img v-if="d.productImage" :src="d.productImage" :alt="d.productName" />
                  <span v-else class="thumb-fallback">素</span>
                </div>
                <div class="goods-info">
                  <p class="goods-name">
                    {{ d.productName }}
                    <em v-if="d.specName" class="goods-spec">{{ d.specName }}</em>
                  </p>
                  <p class="muted">¥{{ d.price }} × {{ d.quantity }}</p>
                </div>
                <p class="goods-subtotal serif">¥{{ d.subtotal }}</p>
              </li>
            </ul>

            <!-- 支付记录 + 物流情况 -->
            <div class="order-info">
              <div class="info-block">
                <p class="info-label">支付记录</p>
                <p class="info-value">
                  实付 <em class="amount serif">¥{{ order.payAmount }}</em>
                </p>
                <p class="muted">
                  {{ order.payTime ? `支付方式：${PAY_TEXT[order.payMethod] || '未知'}` : '尚未支付' }}
                </p>
                <p v-if="order.payTime" class="muted">支付时间：{{ fmtTime(order.payTime) }}</p>
              </div>

              <div class="info-block">
                <p class="info-label">发货情况</p>
                <template v-if="logisticsMap[order.orderNo]">
                  <p class="info-value">{{ logisticsMap[order.orderNo].company }}</p>
                  <p class="muted latin">单号：{{ logisticsMap[order.orderNo].logisticsNo }}</p>
                  <p class="muted">状态：{{ LOGISTICS_TEXT[logisticsMap[order.orderNo].status] || '—' }}</p>
                </template>
                <p v-else class="muted logistics-empty">
                  {{ order.status === 1 ? '商家备货中，发货后可查看物流' : order.status === 0 ? '付款后安排发货' : '暂无物流信息' }}
                </p>
              </div>

              <div class="actions">
                <button
                  v-if="order.status === 0"
                  type="button"
                  class="btn btn-primary btn-sm"
                  :disabled="payingId === order.id"
                  @click="payNow(order)"
                >
                  {{ payingId === order.id ? '正在跳转…' : '去支付' }}
                </button>
                <button
                  v-if="order.status === 2"
                  type="button"
                  class="btn btn-outline btn-sm"
                  :disabled="receivingId === order.id"
                  @click="confirmReceive(order)"
                >
                  {{ receivingId === order.id ? '确认中…' : '确认收货' }}
                </button>
              </div>
            </div>
          </article>
        </div>

        <!-- 分页 -->
        <div v-if="!loading && !errorMsg && page.total > 0" class="pagination">
          <button
            type="button"
            class="page-btn"
            :disabled="page.pageNum <= 1"
            @click="goPage(page.pageNum - 1)"
          >
            ← 上一页
          </button>
          <span class="page-info latin">{{ page.pageNum }} / {{ Math.max(page.pages, 1) }}</span>
          <button
            type="button"
            class="page-btn"
            :disabled="page.pageNum >= page.pages"
            @click="goPage(page.pageNum + 1)"
          >
            下一页 →
          </button>
        </div>
      </div>
    </section>

    <transition name="toast">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </transition>
  </HomeLayout>
</template>

<style scoped>
/* ---------------- Banner ---------------- */
.banner {
  padding: 36px 0 8px;
}

.banner-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 44px 56px;
  border-radius: var(--radius-lg);
  background: linear-gradient(120deg, var(--color-primary-deep) 0%, var(--color-primary) 55%, var(--color-pink) 100%);
  box-shadow: var(--shadow-md);
}

.banner-en {
  font-size: 15px;
  letter-spacing: 0.34em;
  color: rgba(253, 248, 243, 0.85);
}

.banner-inner h1 {
  margin-top: 10px;
  color: #fdf8f3;
  font-size: 30px;
  letter-spacing: 0.14em;
}

.banner-desc {
  margin-top: 12px;
  color: rgba(253, 248, 243, 0.9);
  font-size: 14px;
  letter-spacing: 0.08em;
}

.banner-mark {
  font-size: 52px;
  color: rgba(253, 248, 243, 0.55);
}

/* ---------------- Section ---------------- */
.section {
  margin-top: 56px;
  padding-bottom: 40px;
}

/* ---------------- 状态筛选 ---------------- */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 28px;
}

.tab {
  padding: 9px 24px;
  font-size: 13.5px;
  letter-spacing: 0.1em;
  color: var(--color-text-regular);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  transition: all 0.3s ease;
}

.tab:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-deep);
}

.tab.active {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

/* ---------------- 订单卡片 ---------------- */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.order-card {
  padding: 24px 30px;
}

.order-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--color-divider);
}

.order-meta {
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.order-no {
  font-size: 15px;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}

.status-badge {
  padding: 5px 18px;
  font-size: 12.5px;
  letter-spacing: 0.12em;
  border-radius: var(--radius-pill);
}

.status-badge.st-0 {
  color: var(--color-primary-deep);
  background: var(--color-primary-soft);
}

.status-badge.st-1 {
  color: var(--color-accent-deep);
  background: var(--color-pink-soft);
}

.status-badge.st-2 {
  color: #6e7c5f;
  background: #e6eadf;
}

.status-badge.st-3 {
  color: var(--color-text-secondary);
  background: var(--color-bg-soft);
}

.status-badge.st-4,
.status-badge.st-5 {
  color: var(--color-text-placeholder);
  background: var(--color-border-light);
}

/* ---------------- 商品明细 ---------------- */
.goods {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.goods-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.thumb {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border-light);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: var(--font-serif);
  font-size: 20px;
  color: var(--color-primary);
}

.goods-info {
  flex: 1;
}

.goods-name {
  font-size: 14px;
  color: var(--color-text-regular);
  letter-spacing: 0.04em;
}

.goods-spec {
  margin-left: 8px;
  font-style: normal;
  font-size: 12px;
  color: var(--color-text-placeholder);
}

.goods-subtotal {
  font-size: 15px;
  color: var(--color-text-secondary);
}

/* ---------------- 支付记录 + 物流 ---------------- */
.order-info {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 24px;
  padding-top: 18px;
}

.info-label {
  margin-bottom: 10px;
  font-size: 12.5px;
  letter-spacing: 0.22em;
  color: var(--color-text-placeholder);
}

.info-value {
  font-size: 14px;
  color: var(--color-text-regular);
}

.amount {
  font-size: 18px;
  color: var(--color-accent);
}

.muted {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--color-text-placeholder);
}

.logistics-empty {
  margin-top: 2px;
}

.actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.btn-sm {
  padding: 9px 26px;
  font-size: 13.5px;
}

/* ---------------- 状态占位 ---------------- */
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px 20px;
  color: var(--color-text-secondary);
  font-size: 14px;
  letter-spacing: 0.1em;
}

.state-icon {
  font-size: 30px;
  color: var(--color-primary);
}

/* ---------------- 分页 ---------------- */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 26px;
  margin-top: 36px;
}

.page-btn {
  padding: 10px 26px;
  font-size: 13.5px;
  letter-spacing: 0.08em;
  color: var(--color-text-regular);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  transition: all 0.3s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary-deep);
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.page-info {
  font-size: 15px;
  letter-spacing: 0.14em;
  color: var(--color-text-secondary);
}

/* ---------------- Toast ---------------- */
.toast {
  position: fixed;
  left: 50%;
  bottom: 48px;
  transform: translateX(-50%);
  padding: 12px 28px;
  background: rgba(61, 48, 40, 0.92);
  color: #fdf8f3;
  font-size: 14px;
  letter-spacing: 0.08em;
  border-radius: var(--radius-pill);
  z-index: 999;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

/* ---------------- 响应式 ---------------- */
@media (max-width: 900px) {
  .banner-inner {
    padding: 34px 30px;
  }

  .banner-mark {
    display: none;
  }

  .order-info {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .actions {
    flex-direction: row;
  }
}
</style>
