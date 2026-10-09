<script setup>
/**
 * 管理端 · 全平台商品监管
 * 全状态分页列表 + 状态筛选 + 关键词搜索 + 上下架
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { pageAdminProducts, auditProduct } from '@/api/product'

const router = useRouter()

const loading = ref(true)
const keyword = ref('')
const statusFilter = ref('')
const pageNum = ref(1)
const pageSize = 20
const total = ref(0)
const pages = ref(0)
const list = ref([])
const actingId = ref(null)
const toast = ref('')
let toastTimer = null

const STATUS_META = {
  0: { text: '已下架', cls: 'tag-ban' },
  1: { text: '已上架', cls: 'tag-ok' },
  2: { text: '审核中', cls: 'tag-wait' },
}

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2400)
}

async function load() {
  loading.value = true
  try {
    const params = { pageNum: pageNum.value, pageSize }
    if (statusFilter.value !== '') params.status = statusFilter.value
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    const data = await pageAdminProducts(params)
    list.value = data.list || []
    total.value = data.total || 0
    pages.value = data.pages || 0
  } catch (e) {
    showToast(e?.message || '商品列表加载失败')
  } finally {
    loading.value = false
  }
}

function switchStatus(v) {
  statusFilter.value = v
  pageNum.value = 1
  load()
}

function search() {
  pageNum.value = 1
  load()
}

async function toggleShelf(item) {
  const toShelf = item.status === 1 ? 0 : 1
  if (!window.confirm(`确认${toShelf === 0 ? '下架' : '上架'}「${item.name}」？`)) return
  actingId.value = item.id
  try {
    await auditProduct(item.id, toShelf)
    showToast(toShelf === 0 ? '商品已下架' : '商品已上架')
    await load()
  } catch (e) {
    showToast(e?.message || '操作失败')
  } finally {
    actingId.value = null
  }
}

function goPage(target) {
  if (target < 1 || target > pages.value || target === pageNum.value) return
  pageNum.value = target
  load()
}

function fmtTime(t) {
  return (t || '').replace('T', ' ').slice(0, 16)
}

onMounted(load)
</script>

<template>
  <HomeLayout>
    <section class="admin-page">
      <div class="container">
        <div class="page-head">
          <button class="back-btn" type="button" @click="router.push('/admin/home')">← 返回管理首页</button>
          <h1 class="serif">商品监管</h1>
          <p class="muted">全平台商品共 {{ total }} 件，可搜索并强制上/下架</p>
        </div>

        <div class="toolbar card">
          <input
            v-model="keyword"
            class="input search-input"
            type="text"
            placeholder="搜索商品名称，回车搜索"
            @keyup.enter="search"
          />
          <div class="tabs">
            <button class="tab" :class="{ active: statusFilter === '' }" type="button" @click="switchStatus('')">全部</button>
            <button class="tab" :class="{ active: statusFilter === 1 }" type="button" @click="switchStatus(1)">已上架</button>
            <button class="tab" :class="{ active: statusFilter === 2 }" type="button" @click="switchStatus(2)">审核中</button>
            <button class="tab" :class="{ active: statusFilter === 0 }" type="button" @click="switchStatus(0)">已下架</button>
          </div>
        </div>

        <div v-if="loading" class="state card"><p>加载中…</p></div>
        <div v-else-if="list.length === 0" class="state card"><p>没有匹配的商品</p></div>

        <div v-else class="table-wrap card">
          <table class="data-table">
            <thead>
              <tr><th>图片</th><th>商品名称</th><th>价格</th><th>库存</th><th>状态</th><th>发布时间</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="p in list" :key="p.id">
                <td>
                  <img v-if="p.mainImage" :src="p.mainImage" class="thumb" alt="" />
                  <span v-else class="thumb thumb-empty">素</span>
                </td>
                <td class="strong name-cell">{{ p.name }}</td>
                <td>¥{{ p.price }}</td>
                <td>{{ p.stock }}</td>
                <td>
                  <span class="tag" :class="STATUS_META[p.status]?.cls">{{ STATUS_META[p.status]?.text || '未知' }}</span>
                </td>
                <td>{{ fmtTime(p.createTime) }}</td>
                <td>
                  <button
                    class="btn btn-sm"
                    :class="p.status === 1 ? 'btn-outline' : 'btn-primary'"
                    type="button"
                    :disabled="actingId === p.id"
                    @click="toggleShelf(p)"
                  >
                    {{ p.status === 1 ? '强制下架' : '强制上架' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!loading && total > pageSize" class="pagination">
          <button class="page-btn" type="button" :disabled="pageNum <= 1" @click="goPage(pageNum - 1)">← 上一页</button>
          <span class="page-info latin">{{ pageNum }} / {{ Math.max(pages, 1) }}</span>
          <button class="page-btn" type="button" :disabled="pageNum >= pages" @click="goPage(pageNum + 1)">下一页 →</button>
        </div>

        <transition name="toast">
          <div v-if="toast" class="toast">{{ toast }}</div>
        </transition>
      </div>
    </section>
  </HomeLayout>
</template>

<style scoped>
.admin-page { padding: 28px 0 60px; }
.page-head { margin-bottom: 18px; }
.back-btn {
  border: none; background: none; color: var(--ink-3, #8a8378);
  cursor: pointer; font-size: 14px; padding: 0; margin-bottom: 12px;
}
.page-head h1 { margin: 0 0 6px; font-size: 26px; }
.toolbar { padding: 12px 16px; margin-bottom: 14px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.search-input { width: 320px; max-width: 100%; }
.tabs { display: flex; gap: 8px; }
.tab {
  border: 1px solid var(--line, #e2dccc); background: #fff; padding: 5px 14px;
  border-radius: 999px; cursor: pointer; font-size: 13px;
}
.tab.active { background: #2c2620; color: #fff; border-color: #2c2620; }
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th, .data-table td {
  text-align: left; padding: 10px 14px;
  border-bottom: 1px solid var(--line, #ece6da); white-space: nowrap;
}
.data-table th { color: var(--ink-3, #8a8378); font-weight: 600; font-size: 13px; }
.strong { font-weight: 600; }
.name-cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; }
.thumb { width: 44px; height: 44px; object-fit: cover; border-radius: 8px; display: block; }
.thumb-empty {
  display: flex; align-items: center; justify-content: center;
  background: #f1ede4; color: #b0a893; font-size: 16px;
}
.tag { padding: 2px 10px; border-radius: 999px; font-size: 12px; }
.tag-ok { background: #e5f2e9; color: #2c6e49; }
.tag-ban { background: #f7e3e0; color: #a23b2e; }
.tag-wait { background: #f5ecd9; color: #946a1d; }
.pagination { margin-top: 16px; display: flex; align-items: center; gap: 14px; justify-content: center; }
.page-btn {
  border: 1px solid var(--line, #e2dccc); background: #fff; padding: 6px 14px;
  border-radius: 8px; cursor: pointer; font-size: 13px;
}
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--ink-3, #8a8378); }
.toast {
  position: fixed; left: 50%; bottom: 48px; transform: translateX(-50%);
  background: rgba(34, 32, 29, 0.92); color: #fff; padding: 10px 22px;
  border-radius: 999px; font-size: 14px; z-index: 999;
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; }
</style>
