<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { pageAllOrders } from '@/api/order'
import { pageMerchants, getMerchantById } from '@/api/merchant'
import { pageAuditProducts, auditProduct } from '@/api/product'
import { fetchAdminStats, fetchStatsDetail } from '@/api/user'

const auth = useAuthStore()
const router = useRouter()
const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2600)
}

// ---------- 支付记录 ----------
const loading = ref(false)
const errorMsg = ref('')
const orders = ref([])
const activeStatus = ref(null)
const merchantFilter = ref('')
const merchantMap = ref({})

const page = reactive({ pageNum: 1, pageSize: 5, total: 0, pages: 0 })
const totalOrders = ref('—')

const tabs = [
  { label: '全部状态', value: null },
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
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await pageAllOrders({
      merchantId: merchantFilter.value || undefined,
      status: activeStatus.value,
      pageNum: page.pageNum,
      pageSize: page.pageSize,
    })
    orders.value = data.list || []
    page.total = data.total
    page.pages = data.pages
  } catch (e) {
    errorMsg.value = e.message || '记录加载失败'
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

function onMerchantChange() {
  page.pageNum = 1
  loadOrders()
}

function goPage(target) {
  if (target < 1 || target > page.pages || target === page.pageNum) return
  page.pageNum = target
  loadOrders()
}

function shopName(merchantId) {
  return merchantMap.value[merchantId] || `店铺#${merchantId}`
}

// ---------- 商品审核 ----------
const auditLoading = ref(false)
const auditError = ref('')
const auditList = ref([])
const auditPage = reactive({ pageNum: 1, pageSize: 8, total: 0, pages: 0 })
const auditMerchantMap = ref({})
const auditingId = ref(null)

async function loadAudit() {
  auditLoading.value = true
  auditError.value = ''
  try {
    const data = await pageAuditProducts({
      pageNum: auditPage.pageNum,
      pageSize: auditPage.pageSize,
    })
    auditList.value = data.list || []
    auditPage.total = data.total
    auditPage.pages = data.pages
    // 批量补齐店铺名
    const ids = [...new Set(auditList.value.map((p) => p.merchantId).filter(Boolean))]
    const missing = ids.filter((id) => auditMerchantMap.value[id] === undefined)
    for (const id of missing) {
      try {
        const m = await getMerchantById(id)
        auditMerchantMap.value[id] = m.shopName
      } catch {
        auditMerchantMap.value[id] = `店铺#${id}`
      }
    }
  } catch (e) {
    auditError.value = e.message || '待审核商品加载失败'
  } finally {
    auditLoading.value = false
  }
}

async function approve(item) {
  if (!window.confirm(`确认通过「${item.name}」的审核？通过后商品将立即上架。`)) return
  auditingId.value = item.id
  try {
    await auditProduct(item.id, 1)
    showToast('审核通过，商品已上架')
    await loadAudit()
  } catch (e) {
    showToast(e.message || '审核失败')
  } finally {
    auditingId.value = null
  }
}

async function reject(item) {
  const reason = window.prompt(`请输入「${item.name}」的审核拒绝原因：`, '')
  if (reason === null) return
  if (!reason.trim()) {
    showToast('请填写拒绝原因')
    return
  }
  auditingId.value = item.id
  try {
    await auditProduct(item.id, 0, reason.trim())
    showToast('已拒绝，商品已下架')
    await loadAudit()
  } catch (e) {
    showToast(e.message || '操作失败')
  } finally {
    auditingId.value = null
  }
}

function goAuditPage(target) {
  if (target < 1 || target > auditPage.pages || target === auditPage.pageNum) return
  auditPage.pageNum = target
  loadAudit()
}

// ---------- 数据看板：统计 + 图表 ----------
const totalUsers = ref(0)
const totalProducts = ref(0)
const totalMerchants = ref(0)

const statItems = computed(() => [
  { label: '平台订单', value: totalOrders.value, en: 'Orders', action: () => scrollToSection('admin-orders') },
  { label: '注册用户', value: totalUsers.value, en: 'Users', action: () => router.push('/admin/users') },
  { label: '上架商品', value: totalProducts.value, en: 'Products', action: () => router.push('/admin/products') },
  { label: '入驻商家', value: totalMerchants.value, en: 'Merchants', action: () => router.push('/admin/merchants') },
])

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

const revenueChart = ref(null)
const usersChart = ref(null)
const merchantsChart = ref(null)
const productsChart = ref(null)
const pieChart = ref(null)
let chartInstances = []

function disposeCharts() {
  chartInstances.forEach((c) => c.dispose())
  chartInstances = []
}

function onWindowResize() {
  chartInstances.forEach((c) => c.resize())
}

function lineOption(name, months, data, color, unit = '') {
  return {
    title: { text: name, left: 10, top: 6, textStyle: { fontSize: 14, color: '#6b655c', fontWeight: 600 } },
    tooltip: { trigger: 'axis' },
    grid: { left: 56, right: 24, top: 48, bottom: 30 },
    xAxis: { type: 'category', data: months, boundaryGap: false },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name,
        type: 'line',
        smooth: true,
        data,
        itemStyle: { color },
        lineStyle: { width: 3, color },
        areaStyle: { opacity: 0.12, color },
      },
    ],
    unit,
  }
}

function renderCharts(d) {
  disposeCharts()
  const mk = (el, option, detailType) => {
    if (!el) return
    const c = echarts.init(el)
    c.setOption(option)
    // 点击数据点 → 明细下钻弹窗（折线图取月份，饼图取分类名）
    if (detailType) {
      c.on('click', (p) => {
        if (detailType === 'category') openDetail('category', null, p.name)
        else openDetail(detailType, p.name)
      })
    }
    chartInstances.push(c)
  }
  const months = d.months || []
  mk(revenueChart.value, lineOption('每月平台收益（元）', months, d.revenueTrend.map((i) => i.count), '#b4552d'), 'revenue')
  mk(usersChart.value, lineOption('用户注册趋势', months, d.userTrend.map((i) => i.count), '#4a6fa5'), 'user')
  mk(merchantsChart.value, lineOption('商家申请趋势', months, d.merchantTrend.map((i) => i.count), '#3d7a5a'), 'merchant')
  mk(productsChart.value, lineOption('每月商品发布', months, d.productTrend.map((i) => i.count), '#8a6db1'), 'product')
  mk(
    pieChart.value,
    {
      title: { text: '在售商品分类占比', left: 10, top: 6, textStyle: { fontSize: 14, color: '#6b655c', fontWeight: 600 } },
      tooltip: { trigger: 'item', formatter: '{b}: {c} 件（{d}%）' },
      legend: { bottom: 0, type: 'scroll' },
      series: [
        {
          type: 'pie',
          radius: ['36%', '64%'],
          center: ['50%', '46%'],
          data: (d.categoryPie || []).map((i) => ({ name: i.name || '未分类', value: i.value })),
          label: { formatter: '{b}\n{d}%' },
        },
      ],
    },
    'category',
  )
}

// ---------- 图表明细下钻弹窗 ----------
const MERCHANT_STATUS = { 0: '待审核', 1: '已通过', 2: '已拒绝' }
const PRODUCT_STATUS = { 0: '已下架', 1: '已上架', 2: '审核中' }
const ORDER_STATUS = { 1: '待发货', 2: '待收货', 3: '已完成' }

const DETAIL_COLUMNS = {
  user: [
    { key: 'id', label: 'ID' },
    { key: 'username', label: '用户名' },
    { key: 'phone', label: '手机号' },
    { key: 'createTime', label: '注册时间' },
  ],
  merchant: [
    { key: 'shopName', label: '店铺名称' },
    { key: 'username', label: '申请人' },
    { key: 'contactPhone', label: '联系电话' },
    { key: 'businessLicense', label: '执照号' },
    { key: 'status', label: '状态', fmt: (v) => MERCHANT_STATUS[v] ?? v },
    { key: 'createTime', label: '提交时间' },
  ],
  product: [
    { key: 'name', label: '商品名称' },
    { key: 'price', label: '价格', fmt: (v) => `¥${v}` },
    { key: 'status', label: '状态', fmt: (v) => PRODUCT_STATUS[v] ?? v },
    { key: 'createTime', label: '发布时间' },
  ],
  revenue: [
    { key: 'orderNo', label: '订单号' },
    { key: 'payAmount', label: '实付金额', fmt: (v) => `¥${v}` },
    { key: 'status', label: '订单状态', fmt: (v) => ORDER_STATUS[v] ?? v },
    { key: 'createTime', label: '下单时间' },
  ],
  category: [
    { key: 'name', label: '商品名称' },
    { key: 'price', label: '价格', fmt: (v) => `¥${v}` },
    { key: 'stock', label: '库存' },
    { key: 'createTime', label: '发布时间' },
  ],
}

const detail = reactive({
  visible: false,
  loading: false,
  type: 'user',
  title: '',
  rows: [],
  truncated: false,
})

async function openDetail(type, month, name) {
  detail.type = type
  detail.columns = DETAIL_COLUMNS[type] || []
  detail.rows = []
  detail.title = '明细加载中…'
  detail.visible = true
  detail.loading = true
  try {
    const d = await fetchStatsDetail(type, month, name)
    detail.title = d.title
    detail.rows = d.rows || []
    detail.truncated = !!d.truncated
  } catch (e) {
    detail.title = '明细加载失败'
    detail.rows = []
  } finally {
    detail.loading = false
  }
}

function closeDetail() {
  detail.visible = false
}

async function loadStats() {
  try {
    const d = await fetchAdminStats()
    totalUsers.value = d.totalUsers ?? 0
    totalProducts.value = d.totalProducts ?? 0
    totalMerchants.value = d.totalMerchants ?? 0
    await nextTick()
    renderCharts(d)
  } catch {
    // 统计接口失败不影响主页面
  }
}

// ---------- 初始化 ----------
onMounted(async () => {
  try {
    const [merchantPage] = await Promise.all([
      pageMerchants(1, 100),
      pageAllOrders({ pageNum: 1, pageSize: 1 }).then((d) => {
        totalOrders.value = d.total
      }),
    ])
    const map = {}
    for (const m of merchantPage.list || []) {
      map[m.id] = m.shopName
    }
    merchantMap.value = map
    await Promise.all([loadOrders(), loadAudit()])
  } catch (e) {
    errorMsg.value = e.message || '数据加载失败'
  }
  loadStats()
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  disposeCharts()
})

const menus = [
  { icon: '👤', title: '用户管理', desc: '查询用户 · 启用禁用账号', to: '/admin/users' },
  { icon: '🏪', title: '商家审核', desc: '入驻申请 · 审核通过拒绝', to: '/admin/merchants' },
  { icon: '📦', title: '商品管理', desc: '商品浏览 · 全平台商品监管', to: '/admin/products' },
  { icon: '🗂', title: '分类管理', desc: '商品分类维护 · 新增启停用', to: '/admin/categories' },
  { icon: '🏷', title: '品牌管理', desc: '品牌信息维护' },
]

function comingSoon() {
  showToast('功能即将上线，敬请期待')
}

function handleMenu(m) {
  if (m.to) {
    router.push(m.to)
  } else if (m.anchor) {
    document.getElementById(m.anchor)?.scrollIntoView({ behavior: 'smooth' })
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
            <p class="banner-en latin">Admin Console</p>
            <h1>{{ auth.username || '管理员' }}，欢迎回来</h1>
            <p class="banner-desc">用心维护平台秩序，让每一次交易都安心</p>
          </div>
          <span class="banner-mark">❋</span>
        </div>
      </div>
    </section>

    <!-- 数据概览 -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>数据概览</h2>
        </div>
        <div class="stat-grid">
          <button
            v-for="s in statItems"
            :key="s.label"
            class="stat-card card stat-clickable"
            type="button"
            @click="s.action"
          >
            <p class="stat-value serif">{{ s.value }}</p>
            <p class="stat-label">{{ s.label }}</p>
            <p class="stat-en latin">{{ s.en }}</p>
          </button>
        </div>
      </div>
    </section>

    <!-- 数据看板图表 -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="section-en latin">Dashboard</p>
            <h2>数据看板</h2>
          </div>
          <span class="dash-hint">💡 点击图表中的数据点可查看该数据明细</span>
        </div>
        <div class="chart-grid">
          <div class="chart-card card chart-wide">
            <div ref="revenueChart" class="chart"></div>
          </div>
          <div class="chart-card card">
            <div ref="usersChart" class="chart"></div>
          </div>
          <div class="chart-card card">
            <div ref="merchantsChart" class="chart"></div>
          </div>
          <div class="chart-card card">
            <div ref="productsChart" class="chart"></div>
          </div>
          <div class="chart-card card chart-wide">
            <div ref="pieChart" class="chart chart-tall"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 支付记录 -->
    <section class="section" id="admin-orders">
      <div class="container">
        <div class="section-head">
          <div>
            <p class="section-en latin">Payment Records</p>
            <h2>全平台支付记录</h2>
          </div>
        </div>

        <!-- 筛选：店铺 + 状态 -->
        <div class="filters">
          <select v-model="merchantFilter" class="shop-select" @change="onMerchantChange">
            <option value="">全部店铺</option>
            <option v-for="(name, id) in merchantMap" :key="id" :value="String(id)">
              {{ name }}
            </option>
          </select>

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

        <!-- 支付记录列表 -->
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

              <!-- 店铺 -->
              <div class="shop">
                <p class="shop-name serif">{{ shopName(order.merchantId) }}</p>
                <p class="muted">店铺 ID：{{ order.merchantId }}</p>
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

    <!-- 商品审核 -->
    <section class="section">
      <div class="container">
        <div class="section-head record-head">
          <div>
            <p class="section-en latin">Product Audit</p>
            <h2>商品审核</h2>
          </div>
          <span class="audit-count" v-if="auditPage.total > 0">{{ auditPage.total }} 件待审核</span>
        </div>

        <div v-if="auditLoading" class="state card">
          <span class="state-icon">❋</span>
          <p>待审核商品加载中…</p>
        </div>
        <div v-else-if="auditError" class="state card">
          <span class="state-icon">！</span>
          <p>{{ auditError }}</p>
        </div>
        <div v-else-if="auditList.length === 0" class="state card">
          <span class="state-icon">✓</span>
          <p>暂无待审核商品</p>
        </div>

        <div v-else class="audit-list">
          <article v-for="item in auditList" :key="item.id" class="audit-card card">
            <div class="audit-thumb">
              <img v-if="item.mainImage" :src="item.mainImage" :alt="item.name" />
              <span v-else class="thumb-fallback">素</span>
            </div>

            <div class="audit-info">
              <div class="info-top">
                <h3 class="audit-name serif">{{ item.name }}</h3>
                <span class="audit-price serif">¥{{ item.price }}</span>
              </div>
              <p class="audit-subtitle">{{ item.subtitle || '—' }}</p>
              <div class="audit-meta">
                <span class="meta-item">店铺：{{ auditMerchantMap[item.merchantId] || `店铺#${item.merchantId}` }}</span>
                <span class="meta-item">库存：{{ item.stock }}</span>
                <span class="meta-item">提交时间：{{ fmtTime(item.createTime) }}</span>
              </div>
            </div>

            <div class="audit-ops">
              <button
                class="btn btn-primary btn-sm"
                type="button"
                :disabled="auditingId === item.id"
                @click="approve(item)"
              >
                通过并上架
              </button>
              <button
                class="btn btn-outline btn-sm"
                type="button"
                :disabled="auditingId === item.id"
                @click="reject(item)"
              >
                拒绝
              </button>
            </div>
          </article>
        </div>

        <div v-if="!auditLoading && auditPage.total > 0" class="pagination">
          <button
            type="button"
            class="page-btn"
            :disabled="auditPage.pageNum <= 1"
            @click="goAuditPage(auditPage.pageNum - 1)"
          >
            ← 上一页
          </button>
          <span class="page-info latin">{{ auditPage.pageNum }} / {{ Math.max(auditPage.pages, 1) }}</span>
          <button
            type="button"
            class="page-btn"
            :disabled="auditPage.pageNum >= auditPage.pages"
            @click="goAuditPage(auditPage.pageNum + 1)"
          >
            下一页 →
          </button>
        </div>
      </div>
    </section>

    <!-- 管理功能 -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>平台管理</h2>
        </div>
        <div class="menu-grid">
          <button
            v-for="m in menus"
            :key="m.title"
            class="menu-card card"
            type="button"
            @click="handleMenu(m)"
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

    <!-- 图表明细下钻弹窗 -->
    <teleport to="body">
      <div v-if="detail.visible" class="detail-mask" @click.self="closeDetail">
        <div class="detail-modal card">
          <div class="detail-head">
            <h3 class="serif">{{ detail.title }}</h3>
            <button class="detail-close" type="button" @click="closeDetail">✕</button>
          </div>

          <div v-if="detail.loading" class="detail-state">加载中…</div>
          <div v-else-if="detail.rows.length === 0" class="detail-state">该时间段暂无数据</div>

          <div v-else class="detail-body">
            <table class="data-table">
              <thead>
                <tr>
                  <th v-for="col in detail.columns" :key="col.key">{{ col.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in detail.rows" :key="idx">
                  <td v-for="col in detail.columns" :key="col.key">
                    {{ col.fmt ? col.fmt(row[col.key]) : (row[col.key] ?? '—') }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="detail.truncated" class="detail-truncated muted">数据较多，仅显示最近 50 条</p>
          </div>
        </div>
      </div>
    </teleport>
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
  background: linear-gradient(120deg, var(--color-primary) 0%, var(--color-pink) 100%);
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

.record-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.audit-count {
  padding: 6px 16px;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--color-accent-deep);
  background: var(--color-pink-soft);
  border-radius: var(--radius-pill);
}

/* ---------------- 商品审核列表 ---------------- */
.audit-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.audit-card {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  align-items: center;
  gap: 22px;
  padding: 20px 24px;
}

.audit-thumb {
  width: 72px;
  height: 72px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border-light);
}

.audit-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.audit-thumb .thumb-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: var(--font-serif);
  font-size: 22px;
  color: var(--color-primary);
}

.audit-info {
  min-width: 0;
}

.info-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.audit-name {
  font-size: 16px;
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audit-price {
  font-size: 18px;
  color: var(--color-accent);
  flex-shrink: 0;
}

.audit-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}

.audit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.audit-meta .meta-item {
  font-size: 12.5px;
  color: var(--color-text-placeholder);
}

.audit-ops {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.btn-sm {
  padding: 8px 18px;
  font-size: 13px;
  white-space: nowrap;
}

/* ---------------- 统计卡 ---------------- */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.stat-card {
  padding: 30px 26px;
  text-align: left;
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

/* ---------------- 筛选区 ---------------- */
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
}

.shop-select {
  padding: 9px 20px;
  font-size: 13.5px;
  letter-spacing: 0.08em;
  color: var(--color-text-regular);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  transition: border-color 0.3s ease;
}

.shop-select:hover,
.shop-select:focus {
  border-color: var(--color-primary);
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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
  grid-template-columns: 140px 160px 1fr 160px;
  gap: 24px;
  padding-top: 18px;
}

.buyer-name,
.shop-name {
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
@media (max-width: 1000px) {
  .order-body {
    grid-template-columns: 1fr 1fr;
  }

  .pay {
    text-align: left;
  }
}

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
}

@media (max-width: 600px) {
  .order-body {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}
/* ---------------- 数据看板图表 ---------------- */
.dash-hint {
  font-size: 13px;
  color: var(--ink-3, #8a8378);
}
.detail-mask {
  position: fixed;
  inset: 0;
  background: rgba(28, 25, 21, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.detail-modal {
  width: min(860px, 96vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 0;
}
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 12px;
  border-bottom: 1px solid var(--line, #ece6da);
}
.detail-head h3 {
  margin: 0;
  font-size: 18px;
}
.detail-close {
  border: none;
  background: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--ink-3, #8a8378);
  padding: 4px 8px;
  border-radius: 6px;
}
.detail-close:hover {
  background: #f1ede4;
}
.detail-state {
  padding: 48px 0;
  text-align: center;
  color: var(--ink-3, #8a8378);
}
.detail-body {
  overflow: auto;
  padding: 8px 22px 18px;
}
.detail-truncated {
  font-size: 12px;
  margin: 10px 0 0;
}
.stat-clickable {
  cursor: pointer;
  text-align: left;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.stat-clickable:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(60, 50, 30, 0.1);
}
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.chart-card {
  padding: 8px;
}
.chart {
  height: 280px;
  width: 100%;
}
.chart-tall {
  height: 320px;
}
@media (max-width: 860px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
  .chart-wide {
    grid-column: auto;
  }
}
</style>
