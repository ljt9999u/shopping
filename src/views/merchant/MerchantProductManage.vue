<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { getMerchantByUserId } from '@/api/merchant'
import {
  pageProductsByMerchant,
  addProduct,
  updateProduct,
  deleteProduct,
  listCategories,
  listBrands,
} from '@/api/product'

const router = useRouter()
const auth = useAuthStore()

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2600)
}

/* ===================== 店铺信息 ===================== */
const merchantId = ref(null)
const shopName = ref('')
const loadingInit = ref(false)

async function initMerchant() {
  loadingInit.value = true
  try {
    const m = await getMerchantByUserId(auth.userId)
    merchantId.value = m.id
    shopName.value = m.shopName
    await loadProducts()
    await loadMeta()
  } catch (e) {
    showToast(e.message || '未找到当前账号对应的店铺')
  } finally {
    loadingInit.value = false
  }
}

/* ===================== 商品列表 ===================== */
const products = ref([])
const loading = ref(false)
const keyword = ref('')

const page = reactive({ pageNum: 1, pageSize: 8, total: 0, pages: 0 })
const activeStatus = ref(null)

const statusTabs = [
  { label: '全部商品', value: null },
  { label: '审核中', value: 2 },
  { label: '已上架', value: 1 },
  { label: '已下架', value: 0 },
]

const STATUS_TEXT = { 0: '已下架', 1: '已上架', 2: '审核中' }
const STATUS_CLASS = { 0: 'st-off', 1: 'st-on', 2: 'st-pending' }

async function loadProducts() {
  if (!merchantId.value) return
  loading.value = true
  try {
    const params = {
      pageNum: page.pageNum,
      pageSize: page.pageSize,
    }
    if (activeStatus.value !== null) params.status = activeStatus.value
    const data = await pageProductsByMerchant(merchantId.value, params)
    let list = data.list || []
    if (keyword.value.trim()) {
      const kw = keyword.value.trim().toLowerCase()
      list = list.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(kw)) ||
          (p.subtitle && p.subtitle.toLowerCase().includes(kw)),
      )
    }
    products.value = list
    page.total = data.total
    page.pages = data.pages
  } catch (e) {
    showToast(e.message || '商品加载失败')
  } finally {
    loading.value = false
  }
}

function switchTab(value) {
  if (activeStatus.value === value) return
  activeStatus.value = value
  page.pageNum = 1
  loadProducts()
}

function goPage(target) {
  if (target < 1 || target > page.pages || target === page.pageNum) return
  page.pageNum = target
  loadProducts()
}

function onSearch() {
  page.pageNum = 1
  loadProducts()
}

/* ===================== 元数据（分类 / 品牌） ===================== */
const categories = ref([])
const brands = ref([])

async function loadMeta() {
  try {
    categories.value = await listCategories()
  } catch {}
  try {
    brands.value = await listBrands()
  } catch {}
}

function categoryName(id) {
  const c = categories.value.find((x) => x.id === id)
  return c ? c.name : id
}

function brandName(id) {
  const b = brands.value.find((x) => x.id === id)
  return b ? b.name : id
}

/* ===================== 新增 / 编辑 ===================== */
const showForm = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const formErrors = reactive({})

function emptyForm() {
  return {
    id: null,
    merchantId: merchantId.value,
    categoryId: null,
    brandId: null,
    name: '',
    subtitle: '',
    mainImage: '',
    detail: '',
    price: '',
    originalPrice: '',
    stock: '',
    // 商家发布/编辑后统一进入待审核，由管理员审核
  }
}

const form = reactive(emptyForm())

function openAdd() {
  isEdit.value = false
  Object.assign(form, emptyForm())
  Object.keys(formErrors).forEach((k) => delete formErrors[k])
  showForm.value = true
}

function openEdit(item) {
  isEdit.value = true
  Object.assign(form, {
    id: item.id,
    merchantId: item.merchantId,
    categoryId: item.categoryId,
    brandId: item.brandId,
    name: item.name || '',
    subtitle: item.subtitle || '',
    mainImage: item.mainImage || '',
    detail: item.detail || '',
    price: item.price ?? '',
    originalPrice: item.originalPrice ?? '',
    stock: item.stock ?? '',
    // 编辑后重新提交审核，status 由后端/前端统一置 2
  })
  Object.keys(formErrors).forEach((k) => delete formErrors[k])
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

function validateForm() {
  Object.keys(formErrors).forEach((k) => delete formErrors[k])
  if (!form.name.trim()) formErrors.name = '请填写商品名称'
  if (!form.categoryId) formErrors.categoryId = '请选择商品分类'
  if (!form.price || Number(form.price) <= 0) formErrors.price = '请填写正确的现价'
  if (form.originalPrice && Number(form.originalPrice) <= 0) formErrors.originalPrice = '原价必须大于 0'
  if (form.stock === '' || Number(form.stock) < 0) formErrors.stock = '库存不能小于 0'
  return Object.keys(formErrors).length === 0
}

async function saveForm() {
  if (!validateForm()) {
    showToast('请完善商品信息')
    return
  }
  saving.value = true
  try {
    const payload = {
      merchantId: merchantId.value,
      categoryId: Number(form.categoryId) || null,
      brandId: Number(form.brandId) || null,
      name: form.name.trim(),
      subtitle: form.subtitle.trim(),
      mainImage: form.mainImage.trim(),
      detail: form.detail.trim(),
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      stock: Number(form.stock),
      // 商家发布/编辑后统一进入待审核
      status: 2,
      rejectReason: null,
    }
    if (isEdit.value) {
      await updateProduct({ ...payload, id: form.id })
      showToast('商品已更新，重新提交审核')
    } else {
      await addProduct(payload)
      showToast('商品已提交，等待管理员审核')
    }
    showForm.value = false
    await loadProducts()
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

/* ===================== 下架 / 删除 ===================== */
// 商家侧状态流转：
//   已上架(1) → 下架 → 0
//   已下架(0) → 重新提交审核 → 2
//   审核中(2) → 不允许切换
function toggleStatus(item) {
  let next
  if (item.status === 1) next = 0
  else if (item.status === 0) next = 2
  else return

  const label = next === 0 ? '下架' : '重新提交审核'
  if (!window.confirm(`确定${label}「${item.name}」吗？`)) return
  updateStatus(item, next, label)
}

async function updateStatus(item, next, label) {
  try {
    await updateProduct({
      id: item.id,
      merchantId: item.merchantId,
      categoryId: item.categoryId,
      brandId: item.brandId,
      name: item.name,
      subtitle: item.subtitle,
      mainImage: item.mainImage,
      detail: item.detail,
      price: item.price,
      originalPrice: item.originalPrice,
      stock: item.stock,
      status: next,
      rejectReason: next === 2 ? null : item.rejectReason,
    })
    showToast(`已${label}`)
    await loadProducts()
  } catch (e) {
    showToast(e.message || '操作失败')
  }
}

function statusActionLabel(status) {
  if (status === 1) return '下架'
  if (status === 0) return '重新提交审核'
  return ''
}

async function removeProduct(item) {
  if (!window.confirm(`确定删除「${item.name}」吗？删除后不可恢复。`)) return
  try {
    await deleteProduct(item.id)
    showToast('商品已删除')
    await loadProducts()
  } catch (e) {
    showToast(e.message || '删除失败')
  }
}

onMounted(initMerchant)
</script>

<template>
  <HomeLayout>
    <div class="container manage-page">
      <!-- 页头 -->
      <div class="center-head fade-up">
        <button class="back-btn" type="button" @click="router.push('/merchant/home')">
          ← 返回商家首页
        </button>
        <div class="head-titles">
          <h1 class="serif">商品管理</h1>
          <p class="latin">Product Management</p>
        </div>
      </div>

      <!-- 操作栏 -->
      <div class="toolbar card fade-up">
        <div class="toolbar-left">
          <div class="search-box">
            <input
              v-model="keyword"
              class="input"
              type="text"
              placeholder="搜索商品名称或副标题"
              @keydown.enter="onSearch"
            />
            <button class="btn btn-outline btn-sm" type="button" @click="onSearch">
              搜索
            </button>
          </div>
        </div>
        <button class="btn btn-primary" type="button" @click="openAdd">
          + 发布商品
        </button>
      </div>

      <!-- 状态筛选 -->
      <div class="tabs fade-up">
        <button
          v-for="t in statusTabs"
          :key="t.label"
          type="button"
          class="tab"
          :class="{ active: activeStatus === t.value }"
          @click="switchTab(t.value)"
        >
          {{ t.label }}
        </button>
      </div>

      <!-- 加载 / 空态 -->
      <div v-if="loadingInit || loading" class="state card">
        <span class="state-icon">❋</span>
        <p>商品加载中…</p>
      </div>
      <div v-else-if="products.length === 0" class="state card">
        <span class="state-icon">❋</span>
        <p>暂无相关商品</p>
        <p class="state-sub">点击右上角「发布商品」开始上架第一件好物</p>
      </div>

      <!-- 商品列表 -->
      <div v-else class="product-list fade-up">
        <div v-for="item in products" :key="item.id" class="product-card card">
          <div class="product-thumb">
            <img v-if="item.mainImage" :src="item.mainImage" :alt="item.name" />
            <span v-else class="thumb-fallback serif">素</span>
          </div>

          <div class="product-info">
            <div class="info-top">
              <h3 class="product-name serif">{{ item.name }}</h3>
              <span class="status-badge" :class="STATUS_CLASS[item.status]">
                {{ STATUS_TEXT[item.status] }}
              </span>
            </div>
            <p class="product-subtitle">{{ item.subtitle || '—' }}</p>
            <div class="product-meta">
              <span class="meta-item">分类：{{ categoryName(item.categoryId) }}</span>
              <span class="meta-item">品牌：{{ brandName(item.brandId) || '—' }}</span>
            </div>
            <div class="product-meta">
              <span class="meta-item">库存：{{ item.stock }}</span>
              <span class="meta-item">销量：{{ item.sales }}</span>
            </div>
            <div v-if="item.status === 0 && item.rejectReason" class="reject-reason">
              <span class="reject-label">拒绝原因：</span>{{ item.rejectReason }}
            </div>
          </div>

          <div class="product-price">
            <p class="price-now serif">¥{{ item.price }}</p>
            <p v-if="item.originalPrice" class="price-original">
              ¥{{ item.originalPrice }}
            </p>
          </div>

          <div class="product-ops">
            <button class="op-btn" type="button" @click="openEdit(item)">编辑</button>
            <button
              v-if="statusActionLabel(item.status)"
              class="op-btn"
              type="button"
              @click="toggleStatus(item)"
            >
              {{ statusActionLabel(item.status) }}
            </button>
            <button class="op-btn op-danger" type="button" @click="removeProduct(item)">
              删除
            </button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="!loading && page.total > 0" class="pagination">
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

    <!-- 新增 / 编辑 弹窗 -->
    <transition name="fade">
      <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
        <div class="modal card">
          <div class="modal-head">
            <h3 class="serif">{{ isEdit ? '编辑商品' : '发布商品' }}</h3>
            <button class="close-btn" type="button" @click="closeForm">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-row">
              <label class="field" :class="{ 'field-error': formErrors.name }">
                <span class="field-label">商品名称 *</span>
                <input v-model="form.name" class="input" type="text" placeholder="如：素色手工陶杯" maxlength="100" />
                <span v-if="formErrors.name" class="field-message">{{ formErrors.name }}</span>
              </label>
              <label class="field" :class="{ 'field-error': formErrors.categoryId }">
                <span class="field-label">商品分类 *</span>
                <select v-model="form.categoryId" class="input">
                  <option :value="null">请选择分类</option>
                  <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <span v-if="formErrors.categoryId" class="field-message">{{ formErrors.categoryId }}</span>
              </label>
            </div>

            <label class="field">
              <span class="field-label">副标题</span>
              <input v-model="form.subtitle" class="input" type="text" placeholder="一句话卖点" maxlength="200" />
            </label>

            <div class="form-row">
              <label class="field">
                <span class="field-label">品牌</span>
                <select v-model="form.brandId" class="input">
                  <option :value="null">请选择品牌</option>
                  <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
                </select>
              </label>
              <div class="field review-hint">
                <span class="field-label">审核状态</span>
                <div class="review-tag">提交后进入审核，通过后自动上架</div>
              </div>
            </div>

            <div class="form-row">
              <label class="field" :class="{ 'field-error': formErrors.price }">
                <span class="field-label">现价（元） *</span>
                <input v-model="form.price" class="input" type="number" min="0" step="0.01" placeholder="0.00" />
                <span v-if="formErrors.price" class="field-message">{{ formErrors.price }}</span>
              </label>
              <label class="field" :class="{ 'field-error': formErrors.originalPrice }">
                <span class="field-label">原价（元）</span>
                <input v-model="form.originalPrice" class="input" type="number" min="0" step="0.01" placeholder="选填" />
                <span v-if="formErrors.originalPrice" class="field-message">{{ formErrors.originalPrice }}</span>
              </label>
              <label class="field" :class="{ 'field-error': formErrors.stock }">
                <span class="field-label">库存 *</span>
                <input v-model="form.stock" class="input" type="number" min="0" step="1" placeholder="0" />
                <span v-if="formErrors.stock" class="field-message">{{ formErrors.stock }}</span>
              </label>
            </div>

            <label class="field">
              <span class="field-label">主图 URL</span>
              <input v-model="form.mainImage" class="input" type="text" placeholder="粘贴图片链接" />
            </label>

            <label class="field">
              <span class="field-label">商品详情（富文本 / HTML）</span>
              <textarea
                v-model="form.detail"
                class="input textarea"
                rows="4"
                placeholder="可填写 HTML 或纯文本描述"
              ></textarea>
            </label>
          </div>

          <div class="modal-foot">
            <button class="btn btn-text" type="button" @click="closeForm">取消</button>
            <button class="btn btn-primary" type="button" :disabled="saving" @click="saveForm">
              {{ saving ? '保存中…' : (isEdit ? '保存修改' : '确认发布') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </HomeLayout>
</template>

<style scoped>
.manage-page {
  padding-top: 36px;
  padding-bottom: 40px;
}

/* ---------------- 页头 ---------------- */
.center-head {
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 30px;
}

.back-btn {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
  transition: color 0.3s ease;
}

.back-btn:hover {
  color: var(--color-accent);
}

.head-titles h1 {
  font-size: 28px;
  letter-spacing: 0.2em;
}

.head-titles p {
  margin-top: 6px;
  font-size: 13px;
  letter-spacing: 0.32em;
  color: var(--color-text-placeholder);
}

/* ---------------- 工具栏 ---------------- */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  margin-bottom: 24px;
}

.toolbar-left {
  flex: 1;
}

.search-box {
  display: flex;
  gap: 10px;
  max-width: 420px;
}

.search-box .input {
  flex: 1;
}

.btn-sm {
  padding: 9px 20px;
  font-size: 13px;
}

/* ---------------- 状态筛选 ---------------- */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
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

/* ---------------- 商品列表 ---------------- */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-card {
  display: grid;
  grid-template-columns: 80px 1fr 130px auto;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.product-thumb {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border-light);
}

.product-thumb img {
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
  font-size: 22px;
  color: var(--color-primary);
}

.product-info {
  min-width: 0;
}

.info-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.product-name {
  font-size: 16px;
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.meta-item {
  font-size: 12.5px;
  color: var(--color-text-placeholder);
  letter-spacing: 0.04em;
}

.reject-reason {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--color-danger);
  letter-spacing: 0.04em;
}

.reject-label {
  font-weight: 600;
}

.status-badge {
  padding: 3px 12px;
  font-size: 11.5px;
  letter-spacing: 0.08em;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.status-badge.st-on {
  color: #6e7c5f;
  background: #e6eadf;
}

.status-badge.st-off {
  color: var(--color-text-placeholder);
  background: var(--color-border-light);
}

.status-badge.st-pending {
  color: var(--color-primary-deep);
  background: var(--color-primary-soft);
}

.product-price {
  text-align: right;
  flex-shrink: 0;
}

.price-now {
  font-size: 20px;
  color: var(--color-accent);
  letter-spacing: 0.04em;
}

.price-original {
  font-size: 13px;
  color: var(--color-text-placeholder);
  text-decoration: line-through;
  margin-top: 2px;
}

.product-ops {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.op-btn {
  padding: 6px 12px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-pill);
  transition: all 0.25s ease;
}

.op-btn:hover:not(:disabled) {
  color: var(--color-accent);
  background: var(--color-pink-soft);
}

.op-danger:hover:not(:disabled) {
  color: var(--color-danger);
  background: rgba(201, 123, 99, 0.1);
}

/* ---------------- 空态 ---------------- */
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

.state-sub {
  font-size: 13px;
  color: var(--color-text-placeholder);
  letter-spacing: 0.08em;
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

/* ---------------- 弹窗 ---------------- */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(61, 48, 40, 0.35);
  backdrop-filter: blur(4px);
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px;
  border-bottom: 1px solid var(--color-border-light);
}

.modal-head h3 {
  font-size: 18px;
  letter-spacing: 0.14em;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--color-text-secondary);
  border-radius: 50%;
  transition: all 0.25s ease;
}

.close-btn:hover {
  color: var(--color-accent);
  background: var(--color-pink-soft);
}

.modal-body {
  padding: 24px 28px;
  overflow-y: auto;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 16px 28px;
  border-top: 1px solid var(--color-border-light);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0 16px;
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

.review-tag {
  display: inline-flex;
  align-items: center;
  padding: 11px 16px;
  font-size: 13px;
  color: var(--color-primary-deep);
  background: var(--color-primary-soft);
  border-radius: var(--radius-sm);
  letter-spacing: 0.06em;
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

/* 弹窗淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ---------------- 响应式 ---------------- */
@media (max-width: 900px) {
  .product-card {
    grid-template-columns: 80px 1fr;
    gap: 14px;
  }

  .product-price,
  .product-ops {
    grid-column: 2 / -1;
    justify-content: flex-start;
  }

  .product-price {
    text-align: left;
  }
}

@media (max-width: 640px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }
}
</style>