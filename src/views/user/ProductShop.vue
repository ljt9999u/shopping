<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import {
  pageProducts,
  searchProducts,
  listProductComments,
  getCommentSummary,
} from '@/api/product'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()

/* ===================== 消息提示 ===================== */
const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2400)
}

/* ===================== 商品列表 ===================== */
const loading = ref(false)
const products = ref([])
const pageNum = ref(1)
const pageSize = ref(12)
const total = ref(0)
const totalPages = ref(1)

// 搜索
const keyword = ref('')
let searchTimer = null

async function loadProducts() {
  loading.value = true
  try {
    const kw = keyword.value.trim()
    const params = { pageNum: pageNum.value, pageSize: pageSize.value }
    const data = kw
      ? await searchProducts({ ...params, keyword: kw })
      : await pageProducts(params)
    products.value = data.list || []
    total.value = data.total ?? 0
    totalPages.value = data.pages || 1
  } catch {
    showToast('商品加载失败，请稍后再试')
    products.value = []
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pageNum.value = 1
    loadProducts()
  }, 350)
}

function clearSearch() {
  if (!keyword.value) return
  keyword.value = ''
  pageNum.value = 1
  loadProducts()
}

function goPage(page) {
  if (page < 1 || page > totalPages.value || page === pageNum.value) return
  pageNum.value = page
  loadProducts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 分页按钮（最多显示 5 个）
const pageNumbers = computed(() => {
  const pages = totalPages.value
  const current = pageNum.value
  let start = Math.max(1, current - 2)
  const end = Math.min(pages, start + 4)
  start = Math.max(1, end - 4)
  const list = []
  for (let i = start; i <= end; i++) list.push(i)
  return list
})

/* ===================== 加购 ===================== */
const cart = useCartStore()
const addingId = ref(null)

async function addProduct(product) {
  if (product.stock <= 0) {
    showToast('该商品已无库存')
    return
  }
  addingId.value = product.id
  try {
    await cart.addToCart({ productId: product.id, quantity: 1 })
    showToast(`已将「${product.name}」加入购物车`)
  } catch {
    showToast('加入购物车失败，请稍后再试')
  } finally {
    addingId.value = null
  }
}

/* ===================== 商品详情 + 评价弹窗 ===================== */
const detailProduct = ref(null)
const comments = ref([])
const commentLoading = ref(false)
const commentPage = ref(1)
const commentPageSize = 5
const commentTotal = ref(0)
const commentSummary = ref(null)

const commentHasMore = computed(() => comments.value.length < commentTotal.value)

async function openDetail(product) {
  detailProduct.value = product
  comments.value = []
  commentTotal.value = 0
  commentSummary.value = null
  commentPage.value = 1
  await Promise.all([loadSummary(product.id), loadComments(product.id, 1)])
}

function closeDetail() {
  detailProduct.value = null
}

async function loadSummary(productId) {
  try {
    commentSummary.value = await getCommentSummary(productId)
  } catch {
    commentSummary.value = null
  }
}

async function loadComments(productId, page) {
  commentLoading.value = true
  try {
    const data = await listProductComments(productId, {
      pageNum: page,
      pageSize: commentPageSize,
    })
    if (page === 1) {
      comments.value = data.list || []
    } else {
      comments.value = comments.value.concat(data.list || [])
    }
    commentTotal.value = data.total ?? 0
  } catch {
    showToast('评价加载失败，请稍后再试')
  } finally {
    commentLoading.value = false
  }
}

async function loadMoreComments() {
  if (!detailProduct.value || commentLoading.value || !commentHasMore.value) return
  commentPage.value += 1
  await loadComments(detailProduct.value.id, commentPage.value)
}

// 展示名：优先昵称
function commentName(item) {
  return item.nickname || item.username || '匿名用户'
}

// 无头像时取昵称首字兜底
function commentAvatarText(item) {
  return commentName(item).charAt(0)
}

// comment_img 多张图片以逗号分隔
function commentImages(item) {
  if (!item.commentImg) return []
  return item.commentImg
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function formatTime(t) {
  if (!t) return ''
  return String(t).replace('T', ' ').slice(0, 16)
}

// 星级分布条占比
function barPercent(count) {
  const total = commentSummary.value?.totalCount || 0
  return total > 0 ? `${Math.round((Number(count || 0) / total) * 100)}%` : '0%'
}

/* ===================== 悬浮购物车 ===================== */
const cartOpen = ref(false)

function openCart() {
  cartOpen.value = true
  cart.fetchCart(true)
}

async function decrease(item) {
  await cart.changeQuantity(item, item.quantity - 1)
}

async function increase(item) {
  if (item.quantity >= item.stock) {
    showToast('已达到库存数量')
    return
  }
  await cart.changeQuantity(item, item.quantity + 1)
}

async function removeItem(item) {
  if (!window.confirm(`将「${item.productName}」从购物车移除？`)) return
  await cart.removeItem(item)
  showToast('已移除')
}

function checkout() {
  if (!cart.checkedItems.length) {
    showToast('请先勾选要结算的商品')
    return
  }
  cartOpen.value = false
  router.push('/checkout')
}

function formatPrice(val) {
  return Number(val || 0).toFixed(2)
}

onMounted(async () => {
  await loadProducts()
  await cart.fetchCart()
  // 从「我的空间 - 购物车」进入时，自动打开悬浮购物车
  if (route.query.cart === '1') {
    cartOpen.value = true
    cart.fetchCart(true)
  }
})
</script>

<template>
  <HomeLayout>
    <div class="shop-page">
      <!-- 页头 -->
      <section class="shop-hero">
        <div class="container">
          <button class="btn btn-outline back-home" type="button" @click="router.push('/home')">
            ← 返回首页
          </button>
          <p class="hero-en latin">Good Things</p>
          <h1 class="serif">好物市集</h1>
          <p class="hero-sub">匠心甄选 · 愿你与心爱之物不期而遇</p>

          <!-- 搜索 -->
          <div class="search-box">
            <span class="search-icon">⌕</span>
            <input
              v-model="keyword"
              type="text"
              placeholder="搜索心仪的美物，如：茶具、香氛…"
              @input="onSearchInput"
            />
            <button v-if="keyword" class="search-clear" type="button" @click="clearSearch">
              ×
            </button>
          </div>
        </div>
      </section>

      <!-- 商品列表 -->
      <section class="container product-section">
        <div class="result-bar">
          <p class="result-info">
            <span v-if="keyword.trim()">「{{ keyword.trim() }}」的搜索结果</span>
            <span>共 {{ total }} 件好物</span>
          </p>
        </div>

        <!-- 加载骨架 -->
        <div v-if="loading" class="product-grid">
          <div v-for="n in 8" :key="n" class="product-card skel-card">
            <div class="skel-img"></div>
            <div class="skel-line w80"></div>
            <div class="skel-line w60"></div>
            <div class="skel-line w40"></div>
          </div>
        </div>

        <!-- 商品网格 -->
        <div v-else-if="products.length" class="product-grid">
          <div v-for="item in products" :key="item.id" class="product-card card">
            <div
              class="product-image-wrap product-link"
              role="link"
              tabindex="0"
              title="点击查看详情与评价"
              @click="openDetail(item)"
              @keydown.enter="openDetail(item)"
            >
              <img
                v-if="item.mainImage"
                :src="item.mainImage"
                :alt="item.name"
                class="product-image"
                loading="lazy"
              />
              <div v-else class="product-image product-no-image">
                <span>素物</span>
              </div>
              <span v-if="item.stock <= 0" class="sold-out-mask">已售罄</span>
              <span class="detail-hint">查看详情 · 评价</span>
            </div>

            <div class="product-body">
              <h3
                class="product-name serif product-link"
                :title="item.name"
                @click="openDetail(item)"
              >
                {{ item.name }}
              </h3>
              <p class="product-sub" v-if="item.subtitle">{{ item.subtitle }}</p>
              <div class="product-meta">
                <div class="price-row">
                  <span class="price-now">¥{{ formatPrice(item.price) }}</span>
                  <span
                    v-if="item.originalPrice && Number(item.originalPrice) > Number(item.price)"
                    class="price-origin"
                  >
                    ¥{{ formatPrice(item.originalPrice) }}
                  </span>
                </div>
                <span class="sales-text">已售 {{ item.sales ?? 0 }}</span>
              </div>
              <button
                class="btn btn-primary add-btn"
                type="button"
                :disabled="item.stock <= 0 || addingId === item.id"
                @click="addProduct(item)"
              >
                {{ item.stock <= 0 ? '已售罄' : addingId === item.id ? '加入中…' : '加入购物车' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 空结果 -->
        <div v-else class="empty-result">
          <p class="empty-icon">❋</p>
          <p class="serif">没有找到相关好物</p>
          <p class="empty-sub">换个关键词试试吧</p>
        </div>

        <!-- 分页 -->
        <div v-if="!loading && totalPages > 1" class="pagination">
          <button
            class="page-btn"
            type="button"
            :disabled="pageNum === 1"
            @click="goPage(pageNum - 1)"
          >
            上一页
          </button>
          <button
            v-for="p in pageNumbers"
            :key="p"
            class="page-num"
            :class="{ active: p === pageNum }"
            type="button"
            @click="goPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="page-btn"
            type="button"
            :disabled="pageNum === totalPages"
            @click="goPage(pageNum + 1)"
          >
            下一页
          </button>
        </div>
      </section>
    </div>

    <!-- ============ 悬浮购物车按钮 ============ -->
    <button class="cart-fab" type="button" @click="openCart">
      <span class="fab-icon">🛒</span>
      <span v-if="cart.badgeCount > 0" class="fab-badge">{{ cart.badgeCount }}</span>
    </button>

    <!-- ============ 购物车抽屉 ============ -->
    <transition name="drawer">
      <div v-if="cartOpen" class="cart-drawer-mask" @click.self="cartOpen = false">
        <aside class="cart-drawer">
          <header class="drawer-head">
            <div>
              <h2 class="serif">我的购物车</h2>
              <p class="drawer-en latin">My Cart · {{ cart.totalCount }} 种</p>
            </div>
            <button class="drawer-close" type="button" @click="cartOpen = false">×</button>
          </header>

          <!-- 加载 -->
          <div v-if="cart.loading && !cart.items.length" class="drawer-loading">加载中…</div>

          <!-- 空车 -->
          <div v-else-if="!cart.items.length" class="drawer-empty">
            <p class="empty-cart-icon">✿</p>
            <p class="serif">购物车还是空的</p>
            <p class="empty-cart-sub">去挑几件心爱之物吧</p>
          </div>

          <!-- 列表 -->
          <div v-else class="drawer-body">
            <div
              v-for="item in cart.items"
              :key="item.id"
              class="cart-line"
              :class="{ invalid: item.valid === false }"
            >
              <label class="line-check" :title="item.valid === false ? '商品已失效' : ''">
                <input
                  type="checkbox"
                  :checked="item.checked === 1"
                  :disabled="item.valid === false"
                  @change="cart.toggleChecked(item)"
                />
              </label>

              <div class="line-image">
                <img v-if="item.productImage" :src="item.productImage" :alt="item.productName" />
                <span v-else class="line-no-image">素物</span>
              </div>

              <div class="line-info">
                <p class="line-name serif" :title="item.productName">{{ item.productName }}</p>
                <p v-if="item.valid === false" class="line-invalid-tag">商品已下架失效</p>
                <p class="line-price">¥{{ formatPrice(item.price) }}</p>

                <div class="line-bottom">
                  <div class="qty-stepper">
                    <button type="button" :disabled="item.quantity <= 1" @click="decrease(item)">
                      −
                    </button>
                    <span class="qty-num">{{ item.quantity }}</span>
                    <button
                      type="button"
                      :disabled="item.quantity >= item.stock"
                      @click="increase(item)"
                    >
                      +
                    </button>
                  </div>
                  <button class="line-remove" type="button" @click="removeItem(item)">
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部结算 -->
          <footer v-if="cart.items.length" class="drawer-foot">
            <div class="foot-total">
              <span class="foot-label">已选合计</span>
              <span class="foot-amount">¥{{ formatPrice(cart.totalAmount) }}</span>
            </div>
            <button
              class="btn btn-primary checkout-btn"
              type="button"
              @click="checkout"
            >
              去结算
            </button>
          </footer>
        </aside>
      </div>
    </transition>

    <!-- ============ 商品详情 + 评价弹窗 ============ -->
    <transition name="modal">
      <div v-if="detailProduct" class="detail-mask" @click.self="closeDetail">
        <div class="detail-panel" role="dialog" aria-modal="true">
          <button class="detail-close" type="button" @click="closeDetail">×</button>

          <div class="detail-body">
            <!-- 商品信息 -->
            <section class="detail-main">
              <div class="detail-image">
                <img
                  v-if="detailProduct.mainImage"
                  :src="detailProduct.mainImage"
                  :alt="detailProduct.name"
                />
                <div v-else class="detail-no-image">素物</div>
              </div>

              <div class="detail-info">
                <h2 class="serif detail-name">{{ detailProduct.name }}</h2>
                <p v-if="detailProduct.subtitle" class="detail-sub">{{ detailProduct.subtitle }}</p>

                <div class="detail-price-box">
                  <span class="detail-price">¥{{ formatPrice(detailProduct.price) }}</span>
                  <span
                    v-if="
                      detailProduct.originalPrice &&
                      Number(detailProduct.originalPrice) > Number(detailProduct.price)
                    "
                    class="detail-origin"
                  >
                    ¥{{ formatPrice(detailProduct.originalPrice) }}
                  </span>
                </div>

                <p class="detail-stock">
                  已售 {{ detailProduct.sales ?? 0 }} · 库存 {{ detailProduct.stock ?? 0 }} 件
                </p>

                <p v-if="detailProduct.detail" class="detail-desc">{{ detailProduct.detail }}</p>

                <button
                  class="btn btn-primary detail-add"
                  type="button"
                  :disabled="detailProduct.stock <= 0 || addingId === detailProduct.id"
                  @click="addProduct(detailProduct)"
                >
                  {{
                    detailProduct.stock <= 0
                      ? '已售罄'
                      : addingId === detailProduct.id
                        ? '加入中…'
                        : '加入购物车'
                  }}
                </button>
              </div>
            </section>

            <!-- 用户评价 -->
            <section class="detail-comments">
              <h3 class="comments-title serif">
                用户评价
                <span v-if="commentSummary" class="comments-count">{{ commentSummary.totalCount }}</span>
              </h3>

              <!-- 评分汇总 -->
              <div
                v-if="commentSummary && commentSummary.totalCount > 0"
                class="comments-summary card"
              >
                <div class="summary-score">
                  <p class="score-num">{{ commentSummary.avgStar }}</p>
                  <p class="score-stars">
                    <i
                      v-for="n in 5"
                      :key="n"
                      class="star-icon"
                      :class="{ on: n <= Math.round(commentSummary.avgStar) }"
                    >★</i>
                  </p>
                  <p class="score-meta">
                    {{ commentSummary.totalCount }} 条评价 · 好评率 {{ commentSummary.goodRate }}%
                  </p>
                </div>
                <div class="summary-bars">
                  <div
                    v-for="row in commentSummary.distribution"
                    :key="row.star"
                    class="bar-row"
                  >
                    <span class="bar-label">{{ row.star }}星</span>
                    <span class="bar-track">
                      <span class="bar-fill" :style="{ width: barPercent(row.count) }"></span>
                    </span>
                    <span class="bar-count">{{ row.count }}</span>
                  </div>
                </div>
              </div>

              <!-- 评价列表 -->
              <div v-if="commentLoading && !comments.length" class="comments-loading">
                评价加载中…
              </div>

              <div v-else-if="!comments.length" class="comments-empty">
                <p class="empty-comment-icon">❋</p>
                <p>暂无评价，期待你的第一份分享</p>
              </div>

              <ul v-else class="comment-list">
                <li v-for="c in comments" :key="c.id" class="comment-item">
                  <div class="comment-head">
                    <div class="comment-user">
                      <img v-if="c.avatar" :src="c.avatar" class="comment-avatar" alt="头像" />
                      <span v-else class="comment-avatar comment-avatar-fallback">
                        {{ commentAvatarText(c) }}
                      </span>
                      <span class="comment-username">{{ commentName(c) }}</span>
                    </div>
                    <span class="comment-stars">
                      <i
                        v-for="n in 5"
                        :key="n"
                        class="star-icon"
                        :class="{ on: n <= c.star }"
                      >★</i>
                    </span>
                  </div>

                  <p class="comment-content">{{ c.content }}</p>

                  <div v-if="commentImages(c).length" class="comment-images">
                    <img
                      v-for="(img, idx) in commentImages(c)"
                      :key="idx"
                      :src="img"
                      alt="评价图片"
                      loading="lazy"
                    />
                  </div>

                  <p class="comment-time">{{ formatTime(c.createTime) }}</p>

                  <div v-if="c.merchantReply" class="merchant-reply">
                    <span class="reply-badge">商家回复</span>
                    <span>{{ c.merchantReply }}</span>
                  </div>
                </li>
              </ul>

              <div v-if="comments.length" class="comments-more">
                <button
                  v-if="commentHasMore"
                  class="btn btn-outline"
                  type="button"
                  :disabled="commentLoading"
                  @click="loadMoreComments"
                >
                  {{ commentLoading ? '加载中…' : '查看更多评价' }}
                </button>
                <p v-else class="comments-end">— 已展示全部评价 —</p>
              </div>
            </section>
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
.shop-page {
  padding-bottom: 60px;
}

/* ---------------- Hero ---------------- */
.shop-hero {
  padding: 56px 0 32px;
  text-align: center;
  background: linear-gradient(180deg, var(--color-bg-soft), var(--color-bg));
}

.back-home {
  padding: 8px 22px;
  font-size: 13px;
  letter-spacing: 0.12em;
  margin-bottom: 26px;
}

.hero-en {
  font-size: 15px;
  letter-spacing: 0.4em;
  color: var(--color-text-placeholder);
}

.shop-hero h1 {
  margin-top: 10px;
  font-size: 34px;
  letter-spacing: 0.26em;
}

.hero-sub {
  margin-top: 12px;
  font-size: 14px;
  letter-spacing: 0.14em;
  color: var(--color-text-secondary);
}

/* 搜索 */
.search-box {
  position: relative;
  max-width: 520px;
  margin: 30px auto 0;
}

.search-icon {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 19px;
  color: var(--color-primary);
}

.search-box input {
  width: 100%;
  padding: 15px 46px;
  font-size: 14.5px;
  letter-spacing: 0.06em;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.search-box input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.15);
}

.search-clear {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  font-size: 17px;
  line-height: 1;
  color: var(--color-text-secondary);
  border-radius: 50%;
}

.search-clear:hover {
  color: var(--color-accent);
}

/* ---------------- 结果栏 ---------------- */
.product-section {
  margin-top: 36px;
}

.result-bar {
  margin-bottom: 24px;
}

.result-info {
  display: flex;
  gap: 16px;
  font-size: 13.5px;
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
}

/* ---------------- 商品网格 ---------------- */
.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.product-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.product-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-md);
}

.product-image-wrap {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--color-bg-soft);
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

.product-no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 20px;
  letter-spacing: 0.3em;
  color: var(--color-primary);
}

.sold-out-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(61, 48, 40, 0.4);
  color: #fdf8f3;
  font-family: var(--font-serif);
  font-size: 18px;
  letter-spacing: 0.3em;
}

.product-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 18px 18px 20px;
}

.product-name {
  font-size: 16px;
  letter-spacing: 0.08em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-sub {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 12px;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.price-now {
  font-size: 19px;
  font-weight: 600;
  color: var(--color-accent);
}

.price-origin {
  font-size: 12.5px;
  color: var(--color-text-placeholder);
  text-decoration: line-through;
}

.sales-text {
  font-size: 12px;
  color: var(--color-text-placeholder);
}

.add-btn {
  margin-top: 16px;
  width: 100%;
}

/* ---------------- 骨架 ---------------- */
.skel-card {
  padding: 0;
}

.skel-img {
  aspect-ratio: 1;
  background: linear-gradient(100deg, var(--color-bg-soft) 30%, #fff 50%, var(--color-bg-soft) 70%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skel-line {
  height: 13px;
  margin: 14px 18px 0;
  border-radius: 4px;
  background: var(--color-bg-soft);
}

.w80 { width: 80%; }
.w60 { width: 60%; }
.w40 { width: 40%; height: 16px; margin-bottom: 18px; }

@keyframes shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

/* ---------------- 空结果 ---------------- */
.empty-result {
  padding: 90px 0;
  text-align: center;
}

.empty-icon {
  font-size: 38px;
  color: var(--color-primary);
  margin-bottom: 16px;
}

.empty-result .serif {
  font-size: 18px;
  letter-spacing: 0.18em;
}

.empty-sub {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-placeholder);
}

/* ---------------- 分页 ---------------- */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 48px;
}

.page-btn,
.page-num {
  min-width: 40px;
  padding: 9px 14px;
  font-size: 13.5px;
  color: var(--color-text-regular);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: all 0.25s ease;
}

.page-num.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.page-btn:hover:not(:disabled),
.page-num:hover:not(.active) {
  border-color: var(--color-primary);
  color: var(--color-primary-deep);
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ===================== 悬浮按钮 ===================== */
.cart-fab {
  position: fixed;
  right: 28px;
  bottom: 64px;
  z-index: 200;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 10px 26px rgba(201, 123, 99, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s ease;
}

.cart-fab:hover {
  transform: translateY(-4px) scale(1.05);
}

.fab-icon {
  font-size: 25px;
}

.fab-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background: var(--color-pink);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  text-align: center;
  border-radius: var(--radius-pill);
  border: 2px solid var(--color-bg);
}

/* ===================== 抽屉 ===================== */
.cart-drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(61, 48, 40, 0.35);
  display: flex;
  justify-content: flex-end;
}

.cart-drawer {
  width: 420px;
  max-width: 92vw;
  height: 100%;
  background: var(--color-bg-card);
  display: flex;
  flex-direction: column;
  box-shadow: -12px 0 40px rgba(61, 48, 40, 0.18);
}

.drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 26px 26px 20px;
  border-bottom: 1px solid var(--color-border-light);
}

.drawer-head h2 {
  font-size: 21px;
  letter-spacing: 0.16em;
}

.drawer-en {
  margin-top: 6px;
  font-size: 12px;
  letter-spacing: 0.24em;
  color: var(--color-text-placeholder);
}

.drawer-close {
  width: 34px;
  height: 34px;
  font-size: 24px;
  line-height: 1;
  color: var(--color-text-secondary);
  border-radius: 50%;
}

.drawer-close:hover {
  background: var(--color-bg-soft);
  color: var(--color-accent);
}

.drawer-loading {
  padding: 80px 0;
  text-align: center;
  color: var(--color-text-secondary);
}

.drawer-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.empty-cart-icon {
  font-size: 40px;
  color: var(--color-primary);
  margin-bottom: 10px;
}

.drawer-empty .serif {
  font-size: 17px;
  letter-spacing: 0.16em;
}

.empty-cart-sub {
  font-size: 13px;
  color: var(--color-text-placeholder);
}

/* 列表区 */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 26px;
}

.cart-line {
  display: flex;
  gap: 12px;
  padding: 20px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.line-check {
  display: flex;
  align-items: flex-start;
  padding-top: 4px;
}

.line-check input {
  width: 17px;
  height: 17px;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.line-image {
  width: 74px;
  height: 74px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-bg-soft);
}

.line-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.line-no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 12px;
  color: var(--color-primary);
}

.line-info {
  flex: 1;
  min-width: 0;
}

.line-name {
  font-size: 14.5px;
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.line-invalid-tag {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--color-danger);
}

.line-price {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-accent);
}

.line-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.qty-stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.qty-stepper button {
  width: 28px;
  height: 26px;
  font-size: 14px;
  color: var(--color-text-regular);
}

.qty-stepper button:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.qty-stepper button:disabled {
  opacity: 0.35;
}

.qty-num {
  min-width: 30px;
  text-align: center;
  font-size: 13.5px;
}

.line-remove {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-pill);
}

.line-remove:hover {
  color: var(--color-danger);
  background: rgba(201, 123, 99, 0.1);
}

.cart-line.invalid .line-name,
.cart-line.invalid .line-price {
  color: var(--color-text-placeholder);
}

/* 底部 */
.drawer-foot {
  padding: 20px 26px 28px;
  border-top: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.foot-total {
  display: flex;
  flex-direction: column;
}

.foot-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.foot-amount {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-accent);
}

.checkout-btn {
  padding: 13px 34px;
}

/* 抽屉动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-enter-active .cart-drawer,
.drawer-leave-active .cart-drawer {
  transition: transform 0.32s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .cart-drawer {
  transform: translateX(100%);
}

.drawer-leave-to .cart-drawer {
  transform: translateX(100%);
}

/* Toast */
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
  z-index: 400;
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

/* ===================== 商品详情弹窗 ===================== */
.product-link {
  cursor: pointer;
}

.detail-hint {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translate(-50%, 10px);
  padding: 7px 18px;
  background: rgba(61, 48, 40, 0.72);
  color: #fdf8f3;
  font-size: 12px;
  letter-spacing: 0.18em;
  border-radius: var(--radius-pill);
  opacity: 0;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
  pointer-events: none;
}

.product-image-wrap:hover .detail-hint {
  opacity: 1;
  transform: translate(-50%, 0);
}

.detail-mask {
  position: fixed;
  inset: 0;
  z-index: 350;
  background: rgba(61, 48, 40, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36px 20px;
}

.detail-panel {
  position: relative;
  width: 960px;
  max-width: 100%;
  max-height: 88vh;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.detail-close {
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 2;
  width: 36px;
  height: 36px;
  font-size: 26px;
  line-height: 1;
  color: var(--color-text-secondary);
  border-radius: 50%;
  background: rgba(253, 248, 243, 0.85);
}

.detail-close:hover {
  background: var(--color-bg-soft);
  color: var(--color-accent);
}

.detail-body {
  overflow-y: auto;
}

/* 商品信息区 */
.detail-main {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 36px;
  padding: 36px 36px 30px;
}

.detail-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-soft);
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 26px;
  letter-spacing: 0.3em;
  color: var(--color-primary);
}

.detail-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-top: 4px;
}

.detail-name {
  font-size: 24px;
  letter-spacing: 0.1em;
}

.detail-sub {
  margin-top: 10px;
  font-size: 13.5px;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
}

.detail-price-box {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 22px;
}

.detail-price {
  font-size: 30px;
  font-weight: 600;
  color: var(--color-accent);
}

.detail-origin {
  font-size: 14px;
  color: var(--color-text-placeholder);
  text-decoration: line-through;
}

.detail-stock {
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
}

.detail-desc {
  margin-top: 18px;
  font-size: 13.5px;
  line-height: 1.9;
  color: var(--color-text-regular);
  white-space: pre-line;
}

.detail-add {
  margin-top: 26px;
  padding: 13px 42px;
}

/* 评价区 */
.detail-comments {
  padding: 4px 36px 36px;
  border-top: 1px solid var(--color-border-light);
}

.comments-title {
  padding: 26px 0 18px;
  font-size: 19px;
  letter-spacing: 0.14em;
}

.comments-count {
  margin-left: 6px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.comments-summary {
  display: flex;
  gap: 40px;
  padding: 24px 28px;
  margin-bottom: 10px;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border-light);
}

.summary-score {
  flex-shrink: 0;
  width: 170px;
  text-align: center;
  border-right: 1px solid var(--color-border);
  padding-right: 40px;
}

.score-num {
  font-size: 38px;
  font-weight: 600;
  color: var(--color-accent);
  line-height: 1.2;
}

.score-stars {
  margin-top: 6px;
  letter-spacing: 2px;
}

.score-meta {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
}

.star-icon {
  font-style: normal;
  font-size: 15px;
  color: var(--color-border);
}

.star-icon.on {
  color: var(--color-accent);
}

.summary-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 9px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.bar-label {
  width: 34px;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 7px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  transition: width 0.5s ease;
}

.bar-count {
  width: 30px;
  text-align: right;
  flex-shrink: 0;
}

/* 评价列表 */
.comments-loading,
.comments-empty {
  padding: 48px 0;
  text-align: center;
  font-size: 13.5px;
  color: var(--color-text-secondary);
}

.empty-comment-icon {
  font-size: 30px;
  color: var(--color-primary);
  margin-bottom: 12px;
}

.comment-list {
  list-style: none;
}

.comment-item {
  padding: 22px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.comment-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-soft);
  color: var(--color-accent-deep);
  font-size: 15px;
}

.comment-username {
  font-size: 14px;
  color: var(--color-text-regular);
  letter-spacing: 0.05em;
}

.comment-stars {
  letter-spacing: 2px;
}

.comment-content {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.85;
  color: var(--color-text);
}

.comment-images {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.comment-images img {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  border: 1px solid var(--color-border-light);
}

.comment-time {
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-placeholder);
}

.merchant-reply {
  margin-top: 12px;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--color-text-regular);
  background: var(--color-bg-soft);
  border-radius: var(--radius-sm);
}

.reply-badge {
  display: inline-block;
  margin-right: 10px;
  padding: 2px 9px;
  font-size: 11.5px;
  letter-spacing: 0.08em;
  color: var(--color-accent-deep);
  background: var(--color-primary-soft);
  border-radius: var(--radius-pill);
}

.comments-more {
  padding-top: 24px;
  text-align: center;
}

.comments-more .btn {
  padding: 9px 34px;
  font-size: 13px;
}

.comments-end {
  font-size: 12.5px;
  color: var(--color-text-placeholder);
  letter-spacing: 0.1em;
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.28s ease;
}

.modal-enter-active .detail-panel,
.modal-leave-active .detail-panel {
  transition: transform 0.28s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .detail-panel,
.modal-leave-to .detail-panel {
  transform: translateY(18px) scale(0.98);
}

/* ---------------- 响应式 ---------------- */
@media (max-width: 1100px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 820px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .detail-main {
    grid-template-columns: 1fr;
    gap: 22px;
    padding: 28px 22px 24px;
  }

  .detail-image {
    max-width: 300px;
    margin: 0 auto;
  }

  .detail-comments {
    padding: 4px 22px 28px;
  }

  .comments-summary {
    flex-direction: column;
    gap: 20px;
  }

  .summary-score {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    padding: 0 0 18px;
  }
}
</style>
