<script setup>
/**
 * 管理端 · 商家入驻审核（独立页）
 * 状态 Tab（待审核/已通过/已拒绝）+ 执照预览 + 通过/拒绝
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { pageMerchantsByStatus, auditMerchant } from '@/api/merchant'

const router = useRouter()

const loading = ref(true)
const activeStatus = ref(0)
const pageNum = ref(1)
const pageSize = 10
const total = ref(0)
const pages = ref(0)
const list = ref([])
const actingId = ref(null)
const toast = ref('')
let toastTimer = null

const TABS = [
  { value: 0, label: '待审核' },
  { value: 1, label: '已通过' },
  { value: 2, label: '已拒绝' },
]

const STATUS_META = {
  0: { text: '待审核', cls: 'tag-wait' },
  1: { text: '已通过', cls: 'tag-ok' },
  2: { text: '已拒绝', cls: 'tag-ban' },
}

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2400)
}

async function load() {
  loading.value = true
  try {
    const data = await pageMerchantsByStatus(activeStatus.value, pageNum.value, pageSize)
    list.value = data.list || []
    total.value = data.total || 0
    pages.value = data.pages || 0
  } catch (e) {
    showToast(e?.message || '商家列表加载失败')
  } finally {
    loading.value = false
  }
}

function switchTab(v) {
  activeStatus.value = v
  pageNum.value = 1
  load()
}

async function decide(item, status) {
  const tip =
    status === 1
      ? `确认通过「${item.shopName}」的入驻申请？\n通过后该用户将升级为商家角色（重新登录生效）。`
      : `确认拒绝「${item.shopName}」的入驻申请？`
  if (!window.confirm(tip)) return
  actingId.value = item.id
  try {
    await auditMerchant(item.id, status)
    showToast(status === 1 ? '已通过，用户重新登录后即成为商家' : '已拒绝该入驻申请')
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
          <h1 class="serif">商家入驻审核</h1>
          <p class="muted">共 {{ total }} 条{{ TABS.find((t) => t.value === activeStatus)?.label }}记录</p>
        </div>

        <div class="tabs card">
          <button
            v-for="t in TABS"
            :key="t.value"
            class="tab"
            :class="{ active: activeStatus === t.value }"
            type="button"
            @click="switchTab(t.value)"
          >
            {{ t.label }}
          </button>
        </div>

        <div v-if="loading" class="state card"><p>加载中…</p></div>
        <div v-else-if="list.length === 0" class="state card"><p>暂无相关入驻申请</p></div>

        <div v-else class="audit-list">
          <article v-for="item in list" :key="item.id" class="audit-card card">
            <div class="audit-thumb">
              <img v-if="item.licenseImage" :src="item.licenseImage" alt="营业执照" />
              <span v-else class="thumb-fallback">照</span>
            </div>

            <div class="audit-info">
              <div class="info-top">
                <h3 class="audit-name serif">{{ item.shopName }}</h3>
                <span class="tag" :class="STATUS_META[item.status]?.cls">{{ STATUS_META[item.status]?.text }}</span>
              </div>
              <div class="audit-meta">
                <span class="meta-item">申请人：{{ item.username || `用户#${item.userId}` }}</span>
                <span class="meta-item">电话：{{ item.contactPhone }}</span>
                <span class="meta-item">执照号：{{ item.businessLicense }}</span>
                <span class="meta-item">提交时间：{{ fmtTime(item.createTime) }}</span>
              </div>
            </div>

            <div v-if="item.status === 0" class="audit-ops">
              <button class="btn btn-primary btn-sm" type="button" :disabled="actingId === item.id" @click="decide(item, 1)">
                通过入驻
              </button>
              <button class="btn btn-outline btn-sm" type="button" :disabled="actingId === item.id" @click="decide(item, 2)">
                拒绝
              </button>
            </div>
          </article>
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
.tabs { display: inline-flex; gap: 8px; padding: 8px 10px; margin-bottom: 16px; }
.tab {
  border: 1px solid var(--line, #e2dccc); background: #fff; padding: 5px 16px;
  border-radius: 999px; cursor: pointer; font-size: 13px;
}
.tab.active { background: #2c2620; color: #fff; border-color: #2c2620; }
.audit-list { display: flex; flex-direction: column; gap: 12px; }
.audit-card {
  display: flex; align-items: center; gap: 16px; padding: 16px 18px;
}
.audit-thumb { width: 64px; height: 64px; flex-shrink: 0; }
.audit-thumb img {
  width: 100%; height: 100%; object-fit: cover;
  border-radius: 10px; border: 1px solid var(--line, #e8e2d6);
}
.thumb-fallback {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: #f1ede4; color: #b0a893; border-radius: 10px; font-size: 20px;
}
.audit-info { flex: 1; min-width: 0; }
.info-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.audit-name { margin: 0; font-size: 16px; }
.tag { padding: 2px 10px; border-radius: 999px; font-size: 12px; }
.tag-ok { background: #e5f2e9; color: #2c6e49; }
.tag-ban { background: #f7e3e0; color: #a23b2e; }
.tag-wait { background: #f5ecd9; color: #946a1d; }
.audit-meta { display: flex; flex-wrap: wrap; gap: 6px 18px; }
.meta-item { font-size: 13px; color: var(--ink-3, #8a8378); }
.audit-ops { display: flex; gap: 8px; flex-shrink: 0; }
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
@media (max-width: 700px) {
  .audit-card { flex-direction: column; align-items: flex-start; }
  .audit-ops { width: 100%; }
}
</style>
