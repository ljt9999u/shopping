<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { getMerchantByUserId } from '@/api/merchant'
import { pageMerchantOrders } from '@/api/order'

const router = useRouter()

const auth = useAuthStore()
const toast = ref('')

// ---------- 店铺与支付记录 ----------
const merchantId = ref(null)
const shopName = ref('')
const loading = ref(false)
const errorMsg = ref('')
const orders = ref([])
const activeStatus = ref(null)

const page = reactive({ pageNum: 1, pageSize: 5, total: 0, pages: 0 })

// 经营概览（真实数据）
const totalOrders = ref('—')
const toShipCount = ref('—')

const tabs = [
  { label: '全部订单', value: null },
  { label: '待付款', value: 0 },
  { label: '待发货', value: 1 },
  { label: '待收货', value: 2 },
  { label: '已完成', value: 3 },
  { label: '已取消', value: 4 },
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

async function loadOrders() {
  if (!merchantId.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await pageMerchantOrders(merchantId.value, {
      status: activeStatus.value,
      pageNum: page.pageNum,
      pageSize: page.pageSize,
    })
    orders.value = data.list || []
    page.total = data.total
    page.pages = data.pages
  } catch (e) {
    errorMsg.value = e.message || '订单加载失败'
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

// ---------- 页面初始化：userId 换 merchantId ----------
;(async () => {
  try {
    const m = await getMerchantByUserId(auth.userId)
    merchantId.value = m.id
    shopName.value = m.shopName
    await Promise.all([
      loadOrders(),
      pageMerchantOrders(m.id, { pageNum: 1, pageSize: 1 }).then((d) => {
        totalOrders.value = d.total
      }),
      pageMerchantOrders(m.id, { status: 1, pageNum: 1, pageSize: 1 }).then((d) => {
        toShipCount.value = d.total
      }),
    ])
  } catch (e) {
    errorMsg.value = e.message || '未找到当前账号对应的店铺'
  }
})()

const stats = [
  { label: '店铺总订单', value: totalOrders, en: 'Orders' },
  { label: '待发货', value: toShipCount, en: 'To Ship' },
  { label: '在售商品', value: '—', en: 'On Sale' },
  { label: '商品评价', value: '—', en: 'Reviews' },
]

const menus = [
  { icon: '📦', title: '商品管理', desc: '发布商品 · 上下架 · 库存', path: '/merchant/products' },
  { icon: '🗂', title: '分类管理', desc: '商品分类 · 新增维护', path: '/merchant/categories' },
  { icon: '🚚', title: '物流发货', desc: '填写单号 · 安排发货' },
  { icon: '🏪', title: '店铺资料', desc: '店铺信息 · 入驻资料维护' },
  { icon: '💬', title: '评价管理', desc: '查看买家评价与反馈' },
  { icon: '📍', title: '收货地址', desc: '店铺收货 · 退货地址' },
]

let toastTimer = null
function comingSoon() {
  toast.value = '功能即将上线，敬请期待'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 3000)
}

function handleMenuClick(menu) {
  if (menu.path) {
    router.push(menu.path)
  } else {
    comingSoon()
  }
}
</script>

<template>
  <HomeLayout>
    <!-- 欢迎横幅 -->
    <section class="banner">
      <div class="container">
        <div class="banner-inner fade-up">
          <div>
            <p class="banner-en latin">Merchant Center</p>
            <h1>{{ auth.username || '商家朋友' }}，生意安昌</h1>
            <p class="banner-desc">
              {{ shopName || '好物自有知音' }}，愿每件匠心都被温柔以待
            </p>
          </div>
          <span class="banner-mark">✦</span>
        </div>
      </div>
    </section>

    <!-- 经营概览 -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>经营概览</h2>
        </div>
        <div class="stat-grid">
          <div v-for="s in stats" :key="s.label" class="stat-card card">
            <p class="stat-value serif">{{ s.value.value ?? s.value }}</p>
            <p class="stat-label">{{ s.label }}</p>
            <p class="stat-en latin">{{ s.en }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 支付记录 -->
    <section class="section">
      <div class="container">
        <div class="section-head record-head">
          <div>
            <p class="section-en latin">Payment Records</p>
            <h2>支付记录</h2>
          </div>
        </div>

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
          <p>记录加载中…</p>
        </div>
        <div v-else-if="errorMsg" class="state card">
          <span class="state-icon">！</span>
          <p>{{ errorMsg }}</p>
        </div>
        <div v-else-if="orders.length === 0" class="state card">
          <span class="state-icon">❋</span>
          <p>暂无相关记录</p>
        </div>

        <!-- 订单记录列表 -->
        <div v-else class="order-list">
          <article v-for="order in orders" :key="order.id" class="order-card card">
            <div class="order-top">
              <span class="order-no latin">{{ order.orderNo }}</span>
              <span class="status-badge" :class="`st-${order.status}`">
                {{ STATUS_TEXT[order.status] }}
              </span>
            </div>

            <div class="order-body">
              <!-- 买家 -->
              <div class="buyer">
                <p class="buyer-name serif">{{ order.username || `用户#${order.userId}` }}</p>
                <p class="muted">买家 ID：{{ order.userId }}</p>
              </div>

              <!-- 商品 -->
              <ul class="goods">
                <li v-for="d in order.detailList" :key="d.id" class="goods-item">
                  <div class="thumb">
                    <img v-if="d.productImage" :src="d.productImage" :alt="d.productName" />
                    <span v-else class="thumb-fallback">素</span>
                  </div>
                  <p class="goods-name">
                    {{ d.productName }}
                    <em class="goods-qty">× {{ d.quantity }}</em>
                  </p>
                </li>
              </ul>

              <!-- 金额与支付信息 -->
              <div class="pay">
                <p class="amount serif">¥{{ order.payAmount }}</p>
                <p class="muted">{{ PAY_TEXT[order.payMethod] || '未支付' }}</p>
                <p class="muted pay-time">{{ fmtTime(order.payTime) }}</p>
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

    <!-- 经营功能 -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>店铺管理</h2>
        </div>
        <div class="menu-grid">
          <button
            v-for="m in menus"
            :key="m.title"
            class="menu-card card"
            type="button"
            @click="handleMenuClick(m)"
          >
            <span class="menu-icon">{{ m.icon }}</span>
            <span class="menu-title serif">{{ m.title }}</span>
            <span class="menu-desc">{{ m.desc }}</span>
          </button>
        </div>
      </div>
    </section>

    <transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
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
  padding: 48px 56px;
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
  font-size: 32px;
  letter-spacing: 0.1em;
}

.banner-desc {
  margin-top: 12px;
  color: rgba(253, 248, 243, 0.9);
  font-size: 14px;
  letter-spacing: 0.08em;
}

.banner-mark {
  font-size: 56px;
  color: rgba(253, 248, 243, 0.55);
}

/* ---------------- Section ---------------- */
.section {
  margin-top: 64px;
}

.section-head {
  margin-bottom: 34px;
}

.section-head h2 {
  font-size: 24px;
  letter-spacing: 0.2em;
}

.section-en {
  margin-bottom: 6px;
  font-size: 13px;
  letter-spacing: 0.3em;
  color: var(--color-text-placeholder);
}

/* ---------------- 统计卡 ---------------- */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.stat-card {
  padding: 30px 26px;
}

.stat-value {
  font-size: 38px;
  color: var(--color-accent);
  line-height: 1.2;
}

.stat-label {
  margin-top: 10px;
  font-size: 14px;
  letter-spacing: 0.1em;
  color: var(--color-text-regular);
}

.stat-en {
  margin-top: 2px;
  font-size: 12px;
  letter-spacing: 0.2em;
  color: var(--color-text-placeholder);
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

/* ---------------- 订单记录 ---------------- */
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

.order-body {
  display: grid;
  grid-template-columns: 150px 1fr 170px;
  gap: 28px;
  padding-top: 18px;
}

.buyer-name {
  font-size: 16px;
  letter-spacing: 0.06em;
}

.muted {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--color-text-placeholder);
}

.goods {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goods-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.thumb {
  width: 52px;
  height: 52px;
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
  font-size: 18px;
  color: var(--color-primary);
}

.goods-name {
  font-size: 14px;
  color: var(--color-text-regular);
  letter-spacing: 0.04em;
}

.goods-qty {
  margin-left: 8px;
  font-style: normal;
  color: var(--color-text-secondary);
}

.pay {
  text-align: right;
}

.amount {
  font-size: 22px;
  color: var(--color-accent);
  letter-spacing: 0.04em;
}

.pay-time {
  white-space: nowrap;
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

/* ---------------- 菜单卡 ---------------- */
.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.menu-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 32px 30px;
  text-align: left;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.menu-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-md);
}

.menu-icon {
  font-size: 28px;
}

.menu-title {
  font-size: 18px;
  letter-spacing: 0.12em;
}

.menu-desc {
  font-size: 13px;
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
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .menu-grid {
    grid-template-columns: 1fr;
  }

  .banner-inner {
    padding: 36px 30px;
  }

  .banner-mark {
    display: none;
  }

  .order-body {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .pay {
    text-align: left;
  }
}
</style>
