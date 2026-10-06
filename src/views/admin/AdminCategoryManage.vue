<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import {
  listAllCategories,
  addCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} from '@/api/product'

const router = useRouter()

/* ===================== 消息提示 ===================== */
const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2600)
}

/* ===================== 分类列表 ===================== */
const loading = ref(false)
const categories = ref([])

async function loadCategories() {
  loading.value = true
  try {
    const data = await listAllCategories()
    categories.value = Array.isArray(data) ? data : []
  } catch (e) {
    showToast(e.message || '分类加载失败')
    categories.value = []
  } finally {
    loading.value = false
  }
}

const parentName = (parentId) => {
  if (!parentId || parentId === 0) return '顶级分类'
  return categories.value.find((c) => c.id === parentId)?.name || `分类#${parentId}`
}

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

// 父分类选项：顶级 + 已有分类（编辑时排除自身，避免挂到自己下面）
const parentOptions = computed(() => {
  const editingId = dialog.form.id
  return [{ id: 0, name: '顶级分类' }].concat(
    categories.value.filter((c) => c.id !== editingId),
  )
})

/* ===================== 新增 / 编辑弹窗 ===================== */
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const dialog = reactive({
  form: { id: null, name: '', parentId: 0, icon: '', sort: 0, status: 1 },
})

const isEdit = computed(() => !!dialog.form.id)
const dialogTitle = computed(() => (isEdit.value ? '编辑分类' : '新增分类'))

function openAdd() {
  dialog.form = { id: null, name: '', parentId: 0, icon: '', sort: 0, status: 1 }
  dialogVisible.value = true
}

function openEdit(row) {
  dialog.form = {
    id: row.id,
    name: row.name || '',
    parentId: row.parentId || 0,
    icon: row.icon || '',
    sort: row.sort ?? 0,
    status: row.status ?? 1,
  }
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
}

async function submitDialog() {
  const name = dialog.form.name.trim()
  if (!name) {
    showToast('请填写分类名称')
    return
  }
  dialogLoading.value = true
  try {
    const payload = {
      name,
      parentId: dialog.form.parentId || 0,
      icon: dialog.form.icon?.trim() || null,
      sort: Number(dialog.form.sort) || 0,
      status: dialog.form.status,
    }
    if (isEdit.value) {
      await updateCategory({ id: dialog.form.id, ...payload })
      showToast('分类已更新')
    } else {
      await addCategory(payload)
      showToast('分类已添加')
    }
    dialogVisible.value = false
    await loadCategories()
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    dialogLoading.value = false
  }
}

/* ===================== 启用 / 禁用 ===================== */
async function toggleStatus(row) {
  const next = row.status === 1 ? 0 : 1
  const action = next === 1 ? '启用' : '禁用'
  if (!window.confirm(`确认${action}分类「${row.name}」？${next === 0 ? '禁用后商家发布商品时将看不到该分类。' : ''}`)) {
    return
  }
  try {
    await updateCategoryStatus(row.id, next)
    showToast(`已${action}`)
    await loadCategories()
  } catch (e) {
    showToast(e.message || '操作失败')
  }
}

/* ===================== 删除 ===================== */
async function remove(row) {
  if (!window.confirm(`确认删除分类「${row.name}」？删除后不可恢复。`)) return
  try {
    await deleteCategory(row.id)
    showToast('分类已删除')
    await loadCategories()
  } catch (e) {
    // 后端在存在子分类时返回失败
    showToast(e.message || '删除失败，该分类下可能存在子分类')
  }
}

onMounted(loadCategories)
</script>

<template>
  <HomeLayout>
    <!-- 页头 -->
    <section class="page-hero">
      <div class="container">
        <button class="btn btn-outline back-btn" type="button" @click="router.push('/admin/home')">
          ← 返回管理首页
        </button>
        <p class="hero-en latin">Category Manage</p>
        <h1 class="serif">商品分类管理</h1>
        <p class="hero-sub">维护平台商品分类，新增后商家发布商品即可选择，购物页同步展示</p>
      </div>
    </section>

    <!-- 分类列表 -->
    <section class="container table-section">
      <div class="toolbar">
        <p class="toolbar-tip">共 {{ categories.length }} 个分类</p>
        <button class="btn btn-primary" type="button" @click="openAdd">＋ 新增分类</button>
      </div>

      <div v-if="loading" class="state card">
        <span class="state-icon">❋</span>
        <p>分类加载中…</p>
      </div>

      <div v-else-if="!categories.length" class="state card">
        <span class="state-icon">🗂</span>
        <p>暂无分类，点击右上角「新增分类」开始添加</p>
      </div>

      <div v-else class="card table-card">
        <table class="cat-table">
          <thead>
            <tr>
              <th style="width: 70px">ID</th>
              <th>分类名称</th>
              <th style="width: 130px">父分类</th>
              <th style="width: 90px">排序</th>
              <th style="width: 100px">状态</th>
              <th style="width: 170px">创建时间</th>
              <th style="width: 230px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in categories" :key="row.id">
              <td class="muted-cell">{{ row.id }}</td>
              <td class="name-cell">
                <span v-if="row.icon" class="row-icon">{{ row.icon }}</span>
                <span class="row-name serif">{{ row.name }}</span>
              </td>
              <td class="muted-cell">{{ parentName(row.parentId) }}</td>
              <td class="muted-cell">{{ row.sort ?? 0 }}</td>
              <td>
                <span class="status-badge" :class="row.status === 1 ? 'st-on' : 'st-off'">
                  {{ row.status === 1 ? '启用中' : '已禁用' }}
                </span>
              </td>
              <td class="muted-cell">{{ fmtTime(row.createTime) }}</td>
              <td class="ops-cell">
                <button class="op-btn" type="button" @click="openEdit(row)">编辑</button>
                <button class="op-btn" type="button" @click="toggleStatus(row)">
                  {{ row.status === 1 ? '禁用' : '启用' }}
                </button>
                <button class="op-btn op-danger" type="button" @click="remove(row)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 新增 / 编辑弹窗 -->
    <div v-if="dialogVisible" class="modal-mask" @click.self="closeDialog">
      <div class="modal card">
        <div class="modal-head">
          <h3 class="serif">{{ dialogTitle }}</h3>
          <button class="modal-close" type="button" @click="closeDialog">×</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label>分类名称 <em>*</em></label>
            <input
              v-model="dialog.form.name"
              type="text"
              maxlength="20"
              placeholder="如：茶具器皿"
            />
          </div>
          <div class="form-row">
            <div class="form-item">
              <label>父分类</label>
              <select v-model="dialog.form.parentId">
                <option v-for="opt in parentOptions" :key="opt.id" :value="opt.id">
                  {{ opt.name }}
                </option>
              </select>
            </div>
            <div class="form-item">
              <label>图标（选填，可填 emoji）</label>
              <input
                v-model="dialog.form.icon"
                type="text"
                maxlength="10"
                placeholder="如：🍵"
              />
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label>排序（数字越小越靠前）</label>
              <input v-model.number="dialog.form.sort" type="number" min="0" />
            </div>
            <div class="form-item">
              <label>状态</label>
              <select v-model.number="dialog.form.status">
                <option :value="1">启用</option>
                <option :value="0">禁用</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" type="button" @click="closeDialog">取消</button>
          <button class="btn btn-primary" type="button" :disabled="dialogLoading" @click="submitDialog">
            {{ dialogLoading ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

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

/* ---------------- 工具栏 ---------------- */
.table-section {
  margin-top: 32px;
  margin-bottom: 64px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.toolbar-tip {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
}

/* ---------------- 表格 ---------------- */
.table-card {
  padding: 0;
  overflow: hidden;
}

.cat-table {
  width: 100%;
  border-collapse: collapse;
}

.cat-table th {
  padding: 16px 20px;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--color-text-secondary);
  background: var(--color-bg-soft);
  border-bottom: 1px solid var(--color-border-light);
}

.cat-table td {
  padding: 16px 20px;
  font-size: 14px;
  border-bottom: 1px solid var(--color-border-light);
  vertical-align: middle;
}

.cat-table tbody tr:last-child td {
  border-bottom: none;
}

.cat-table tbody tr {
  transition: background-color 0.2s ease;
}

.cat-table tbody tr:hover {
  background: var(--color-primary-soft);
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.row-icon {
  font-size: 18px;
}

.row-name {
  font-size: 15px;
  letter-spacing: 0.06em;
}

.muted-cell {
  color: var(--color-text-secondary);
  font-size: 13.5px;
}

.status-badge {
  display: inline-block;
  padding: 4px 14px;
  font-size: 12.5px;
  letter-spacing: 0.1em;
  border-radius: var(--radius-pill);
}

.st-on {
  color: #6e7c5f;
  background: #e6eadf;
}

.st-off {
  color: var(--color-text-placeholder);
  background: var(--color-border-light);
}

.ops-cell {
  white-space: nowrap;
}

.op-btn {
  margin-right: 14px;
  padding: 0;
  font-size: 13.5px;
  letter-spacing: 0.06em;
  color: var(--color-accent-deep);
  background: transparent;
  transition: opacity 0.2s ease;
}

.op-btn:last-child {
  margin-right: 0;
}

.op-btn:hover {
  opacity: 0.65;
}

.op-danger {
  color: #b4655a;
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

/* ---------------- 弹窗 ---------------- */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(61, 48, 40, 0.45);
}

.modal {
  width: 560px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 0;
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

.modal-close {
  font-size: 24px;
  line-height: 1;
  color: var(--color-text-secondary);
  background: transparent;
}

.modal-close:hover {
  color: var(--color-accent);
}

.modal-body {
  padding: 26px 28px;
}

.form-item {
  flex: 1;
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 18px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  letter-spacing: 0.1em;
  color: var(--color-text-regular);
}

.form-item label em {
  color: #b4655a;
  font-style: normal;
}

.form-item input,
.form-item select {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--color-text-regular);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: border-color 0.25s ease;
}

.form-item input:focus,
.form-item select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  padding: 18px 28px;
  border-top: 1px solid var(--color-border-light);
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

@media (max-width: 900px) {
  .cat-table {
    display: block;
    overflow-x: auto;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
