<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { getMerchantByUserId } from '@/api/merchant'
import { pageCommentsByMerchant, replyComment } from '@/api/product'

const router = useRouter()
const auth = useAuthStore()

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2600)
}

const loading = ref(false)
const comments = ref([])
const page = reactive({ pageNum: 1, pageSize: 8, total: 0, pages: 0 })
const replyingId = ref(null)

function pad(n) {
  return String(n).padStart(2, '0')
}
function fmtTime(t) {
  if (!t) return '—'
  if (Array.isArray(t)) {
    const [y, m, d, h = 0, mi = 0] = t
    return `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(mi)}`
  }
  return String(t).replace('T', ' ').slice(0, 16)
}

async function loadComments() {
  loading.value = true
  try {
    const m = await getMerchantByUserId(auth.userId)
    const data = await pageCommentsByMerchant(m.id, {
      pageNum: page.pageNum,
      pageSize: page.pageSize,
    })
    comments.value = (data.list || []).map((c) => ({
      ...c,
      imgList: c.commentImg ? c.commentImg.split(',').filter(Boolean) : [],
    }))
    page.total = data.total
    page.pages = data.pages
  } catch (e) {
    showToast(e.message || '评价加载失败')
    comments.value = []
  } finally {
    loading.value = false
  }
}

function goPage(target) {
  if (target < 1 || target > page.pages || target === page.pageNum) return
  page.pageNum = target
  loadComments()
}

async function openReply(item) {
  const text = window.prompt(
    item.merchantReply ? '修改回复内容：' : '回复买家评价（买家将在商品详情中看到）：',
    item.merchantReply || '',
  )
  if (text === null) return
  if (!text.trim()) {
    showToast('回复内容不能为空')
    return
  }
  replyingId.value = item.id
  try {
    await replyComment(item.id, text.trim())
    showToast(item.merchantReply ? '回复已更新' : '回复成功')
    await loadComments()
  } catch (e) {
    showToast(e.message || '回复失败')
  } finally {
    replyingId.value = null
  }
}

onMounted(loadComments)
</script>

<template>
  <HomeLayout>
    <section class="page-hero">
      <div class="container">
        <button class="btn btn-outline back-btn" type="button" @click="router.push('/merchant/home')">
          ← 返回
        </button>
        <p class="hero-en latin">Reviews</p>
        <h1 class="serif">评价管理</h1>
        <p class="hero-sub">查看买家对本店商品的评价，及时回复反馈</p>
      </div>
    </section>

    <section class="container list-section">
      <div class="toolbar">
        <p class="toolbar-tip">共 {{ page.total }} 条评价</p>
      </div>

      <div v-if="loading" class="state card">
        <span class="state-icon">❋</span>
        <p>评价加载中…</p>
      </div>
      <div v-else-if="!comments.length" class="state card">
        <span class="state-icon">💬</span>
        <p>暂无评价，买家确认收货后可对商品评价</p>
      </div>

      <div v-else class="comment-list">
        <article v-for="c in comments" :key="c.id" class="comment-card card">
          <div class="cc-head">
            <div class="cc-product">
              <div class="cc-thumb">
                <img v-if="c.productImage" :src="c.productImage" :alt="c.productName" />
                <span v-else class="thumb-fallback">素</span>
              </div>
              <div class="cc-product-info">
                <p class="cc-product-name serif">{{ c.productName || `商品#${c.productId}` }}</p>
                <div class="cc-stars">
                  <span v-for="n in 5" :key="n" :class="{ on: n <= c.star }">★</span>
                </div>
              </div>
            </div>
            <div class="cc-meta">
              <p class="cc-user">{{ c.nickname || c.username || `用户#${c.userId}` }}</p>
              <p class="muted">{{ fmtTime(c.createTime) }}</p>
              <span v-if="c.status === 0" class="hidden-tag">已隐藏</span>
            </div>
          </div>

          <p class="cc-content">{{ c.content }}</p>

          <div v-if="c.imgList.length" class="cc-images">
            <a
              v-for="(img, i) in c.imgList"
              :key="i"
              :href="img"
              target="_blank"
              rel="noopener"
            >
              <img :src="img" :alt="`评价图${i + 1}`" />
            </a>
          </div>

          <div v-if="c.merchantReply" class="cc-reply">
            <p class="reply-label">商家回复：</p>
            <p class="reply-text">{{ c.merchantReply }}</p>
          </div>

          <div class="cc-foot">
            <button
              class="op-btn"
              type="button"
              :disabled="replyingId === c.id"
              @click="openReply(c)"
            >
              {{ replyingId === c.id ? '提交中…' : c.merchantReply ? '修改回复' : '回复评价' }}
            </button>
          </div>
        </article>
      </div>

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
    </section>

    <transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </HomeLayout>
</template>

<style scoped>
.page-hero {
  padding: 36px 0 8px;
}

.back-btn {
  margin-bottom: 24px;
}

.hero-en {
  font-size: 14px;
  letter-spacing: 0.32em;
  color: var(--color-text-placeholder);
}

.page-hero h1 {
  margin-top: 10px;
  font-size: 30px;
  letter-spacing: 0.16em;
}

.hero-sub {
  margin-top: 10px;
  font-size: 14px;
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
}

.list-section {
  margin-top: 32px;
  margin-bottom: 64px;
}

.toolbar {
  margin-bottom: 20px;
}

.toolbar-tip {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
}

/* ---------------- 评价卡片 ---------------- */
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-card {
  padding: 22px 26px;
}

.cc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.cc-product {
  display: flex;
  align-items: center;
  gap: 14px;
}

.cc-thumb {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border-light);
}

.cc-thumb img {
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

.cc-product-name {
  font-size: 15px;
  letter-spacing: 0.05em;
}

.cc-stars {
  margin-top: 4px;
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--color-border);
}

.cc-stars .on {
  color: #d9a441;
}

.cc-meta {
  text-align: right;
}

.cc-user {
  font-size: 13.5px;
  color: var(--color-text-regular);
}

.muted {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--color-text-placeholder);
}

.hidden-tag {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 10px;
  font-size: 11.5px;
  color: var(--color-text-placeholder);
  background: var(--color-border-light);
  border-radius: var(--radius-pill);
}

.cc-content {
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.9;
  color: var(--color-text-regular);
  letter-spacing: 0.03em;
}

.cc-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.cc-images img {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.cc-images img:hover {
  transform: scale(1.04);
}

.cc-reply {
  margin-top: 14px;
  padding: 12px 16px;
  background: var(--color-bg-soft);
  border-radius: var(--radius-sm);
}

.reply-label {
  font-size: 12.5px;
  color: var(--color-accent-deep);
  letter-spacing: 0.08em;
}

.reply-text {
  margin-top: 4px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--color-text-regular);
}

.cc-foot {
  margin-top: 14px;
  text-align: right;
}

.op-btn {
  font-size: 13.5px;
  letter-spacing: 0.06em;
  color: var(--color-accent-deep);
  background: transparent;
  transition: opacity 0.2s ease;
}

.op-btn:disabled {
  opacity: 0.5;
}

.op-btn:hover:not(:disabled) {
  opacity: 0.65;
}

/* ---------------- 状态 / 分页 ---------------- */
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

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 26px;
  margin-top: 32px;
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
  z-index: 1200;
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
</style>
