<script setup>
/**
 * 管理端 · 用户管理
 * 分页列表 + 关键词过滤 + 启用/禁用账号
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { pageUsers, updateUserStatus } from '@/api/user'

const router = useRouter()

const loading = ref(true)
const keyword = ref('')
const pageNum = ref(1)
const pageSize = 50
const total = ref(0)
const list = ref([])
const actingId = ref(null)
const toast = ref('')
let toastTimer = null

const ROLE_TEXT = { USER: '普通用户', MERCHANT: '商家', ADMIN: '管理员' }

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list.value
  return list.value.filter(
    (u) =>
      (u.username || '').toLowerCase().includes(kw) ||
      (u.phone || '').includes(kw) ||
      String(u.id).includes(kw),
  )
})

const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize), 1))

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2400)
}

async function load() {
  loading.value = true
  try {
    const data = await pageUsers({ pageNum: pageNum.value, pageSize })
    list.value = data.list || []
    total.value = data.total || 0
  } catch (e) {
    showToast(e?.message || '用户列表加载失败')
  } finally {
    loading.value = false
  }
}

async function toggleStatus(u) {
  const next = u.status === 1 ? 0 : 1
  if (!window.confirm(`确认${next === 0 ? '禁用' : '启用'}用户「${u.username || `#${u.id}`}」？`)) return
  actingId.value = u.id
  try {
    await updateUserStatus(u.id, next)
    u.status = next
    showToast(next === 0 ? '已禁用' : '已启用')
  } catch (e) {
    showToast(e?.message || '操作失败')
  } finally {
    actingId.value = null
  }
}

function goPage(target) {
  if (target < 1 || target > totalPages.value || target === pageNum.value) return
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
          <h1 class="serif">用户管理</h1>
          <p class="muted">共 {{ total }} 个账号，支持关键词过滤与启用/禁用</p>
        </div>

        <div class="toolbar card">
          <input v-model="keyword" class="input search-input" type="text" placeholder="搜索用户名 / 手机号 / ID" />
        </div>

        <div v-if="loading" class="state card"><p>加载中…</p></div>
        <div v-else-if="filtered.length === 0" class="state card"><p>没有匹配的用户</p></div>

        <div v-else class="table-wrap card">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th><th>用户名</th><th>手机号</th><th>角色</th><th>状态</th><th>注册时间</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in filtered" :key="u.id">
                <td>{{ u.id }}</td>
                <td class="strong">{{ u.username }}</td>
                <td>{{ u.phone }}</td>
                <td>{{ ROLE_TEXT[u.roleCode] || u.roleCode }}</td>
                <td>
                  <span class="tag" :class="u.status === 1 ? 'tag-ok' : 'tag-ban'">
                    {{ u.status === 1 ? '启用' : '禁用' }}
                  </span>
                </td>
                <td>{{ fmtTime(u.createTime) }}</td>
                <td>
                  <button
                    class="btn btn-sm"
                    :class="u.status === 1 ? 'btn-outline' : 'btn-primary'"
                    type="button"
                    :disabled="actingId === u.id"
                    @click="toggleStatus(u)"
                  >
                    {{ u.status === 1 ? '禁用' : '启用' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!loading && total > pageSize" class="pagination">
          <button class="page-btn" type="button" :disabled="pageNum <= 1" @click="goPage(pageNum - 1)">← 上一页</button>
          <span class="page-info latin">{{ pageNum }} / {{ totalPages }}</span>
          <button class="page-btn" type="button" :disabled="pageNum >= totalPages" @click="goPage(pageNum + 1)">下一页 →</button>
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
.toolbar { padding: 12px 16px; margin-bottom: 14px; }
.search-input { width: 320px; max-width: 100%; }
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th, .data-table td {
  text-align: left; padding: 11px 14px;
  border-bottom: 1px solid var(--line, #ece6da); white-space: nowrap;
}
.data-table th { color: var(--ink-3, #8a8378); font-weight: 600; font-size: 13px; }
.strong { font-weight: 600; }
.tag { padding: 2px 10px; border-radius: 999px; font-size: 12px; }
.tag-ok { background: #e5f2e9; color: #2c6e49; }
.tag-ban { background: #f7e3e0; color: #a23b2e; }
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
