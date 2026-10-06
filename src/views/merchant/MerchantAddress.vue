<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { useAuthStore } from '@/stores/auth'
import {
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '@/api/address'

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
const addresses = ref([])

async function loadAddresses() {
  loading.value = true
  try {
    const data = await listAddresses(auth.userId)
    addresses.value = Array.isArray(data) ? data : []
  } catch (e) {
    showToast(e.message || '地址加载失败')
    addresses.value = []
  } finally {
    loading.value = false
  }
}

/* ---------------- 新增 / 编辑弹窗 ---------------- */
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const form = reactive({
  id: null,
  consignee: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: 0,
})

const isEdit = ref(false)

function openAdd() {
  Object.assign(form, {
    id: null,
    consignee: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    isDefault: addresses.value.some((a) => a.isDefault === 1) ? 0 : 1,
  })
  isEdit.value = false
  dialogVisible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    consignee: row.consignee || '',
    phone: row.phone || '',
    province: row.province || '',
    city: row.city || '',
    district: row.district || '',
    detail: row.detail || '',
    isDefault: row.isDefault ?? 0,
  })
  isEdit.value = true
  dialogVisible.value = true
}

function closeDialog() {
  if (dialogLoading.value) return
  dialogVisible.value = false
}

async function submit() {
  if (!form.consignee.trim()) return showToast('请填写收货人')
  if (!form.phone.trim()) return showToast('请填写联系电话')
  if (!form.province.trim() || !form.city.trim()) return showToast('请填写省、市')
  if (!form.detail.trim()) return showToast('请填写详细地址')

  dialogLoading.value = true
  try {
    const payload = {
      userId: auth.userId,
      consignee: form.consignee.trim(),
      phone: form.phone.trim(),
      province: form.province.trim(),
      city: form.city.trim(),
      district: form.district.trim() || null,
      detail: form.detail.trim(),
      isDefault: form.isDefault ? 1 : 0,
    }
    if (isEdit.value) {
      await updateAddress({ id: form.id, ...payload })
      showToast('地址已更新')
    } else {
      await addAddress(payload)
      showToast('地址已添加')
    }
    dialogVisible.value = false
    await loadAddresses()
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    dialogLoading.value = false
  }
}

async function makeDefault(row) {
  if (row.isDefault === 1) return
  try {
    await setDefaultAddress(auth.userId, row.id)
    showToast('已设为默认退货地址')
    await loadAddresses()
  } catch (e) {
    showToast(e.message || '设置失败')
  }
}

async function remove(row) {
  if (!window.confirm(`确认删除「${row.consignee}」的退货地址？`)) return
  try {
    await deleteAddress(row.id)
    showToast('地址已删除')
    await loadAddresses()
  } catch (e) {
    showToast(e.message || '删除失败')
  }
}

function regionText(row) {
  return [row.province, row.city, row.district, row.detail].filter(Boolean).join(' ')
}

onMounted(loadAddresses)
</script>

<template>
  <HomeLayout>
    <section class="page-hero">
      <div class="container">
        <button class="btn btn-outline back-btn" type="button" @click="router.push('/merchant/home')">
          ← 返回
        </button>
        <p class="hero-en latin">Return Address</p>
        <h1 class="serif">收货地址</h1>
        <p class="hero-sub">维护店铺退货 / 收货地址，买家退货时按此地址寄回</p>
      </div>
    </section>

    <section class="container list-section">
      <div class="toolbar">
        <p class="toolbar-tip">共 {{ addresses.length }} 个地址</p>
        <button class="btn btn-primary" type="button" @click="openAdd">＋ 新增地址</button>
      </div>

      <div v-if="loading" class="state card">
        <span class="state-icon">❋</span>
        <p>地址加载中…</p>
      </div>
      <div v-else-if="!addresses.length" class="state card">
        <span class="state-icon">📍</span>
        <p>暂无退货地址，点击右上角「新增地址」添加</p>
      </div>

      <div v-else class="addr-grid">
        <article v-for="row in addresses" :key="row.id" class="addr-card card">
          <div class="addr-top">
            <span class="addr-name serif">{{ row.consignee }}</span>
            <span class="addr-phone latin">{{ row.phone }}</span>
            <span v-if="row.isDefault === 1" class="default-tag">默认</span>
          </div>
          <p class="addr-detail">{{ regionText(row) }}</p>
          <div class="addr-ops">
            <button
              v-if="row.isDefault !== 1"
              class="op-btn"
              type="button"
              @click="makeDefault(row)"
            >
              设为默认
            </button>
            <button class="op-btn" type="button" @click="openEdit(row)">编辑</button>
            <button class="op-btn op-danger" type="button" @click="remove(row)">删除</button>
          </div>
        </article>
      </div>
    </section>

    <!-- 新增 / 编辑弹窗 -->
    <div v-if="dialogVisible" class="modal-mask" @click.self="closeDialog">
      <div class="modal card">
        <div class="modal-head">
          <h3 class="serif">{{ isEdit ? '编辑地址' : '新增地址' }}</h3>
          <button class="modal-close" type="button" @click="closeDialog">×</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-item">
              <label>收货人 <em>*</em></label>
              <input v-model="form.consignee" type="text" maxlength="20" placeholder="收货人姓名" />
            </div>
            <div class="form-item">
              <label>联系电话 <em>*</em></label>
              <input v-model="form.phone" type="text" maxlength="20" placeholder="手机号" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label>省 <em>*</em></label>
              <input v-model="form.province" type="text" maxlength="20" placeholder="如：浙江省" />
            </div>
            <div class="form-item">
              <label>市 <em>*</em></label>
              <input v-model="form.city" type="text" maxlength="20" placeholder="如：杭州市" />
            </div>
            <div class="form-item">
              <label>区/县</label>
              <input v-model="form.district" type="text" maxlength="20" placeholder="如：西湖区" />
            </div>
          </div>
          <div class="form-item">
            <label>详细地址 <em>*</em></label>
            <input
              v-model="form.detail"
              type="text"
              maxlength="100"
              placeholder="街道、门牌号、楼层等"
            />
          </div>
          <label class="default-check">
            <input v-model.number="form.isDefault" type="checkbox" :true-value="1" :false-value="0" />
            <span>设为默认退货地址</span>
          </label>
        </div>
        <div class="modal-foot">
          <button class="btn btn-outline" type="button" :disabled="dialogLoading" @click="closeDialog">
            取消
          </button>
          <button class="btn btn-primary" type="button" :disabled="dialogLoading" @click="submit">
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

.list-section {
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

/* ---------------- 地址卡 ---------------- */
.addr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
}

.addr-card {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
}

.addr-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.addr-name {
  font-size: 16px;
  letter-spacing: 0.06em;
}

.addr-phone {
  font-size: 13.5px;
  color: var(--color-text-secondary);
}

.default-tag {
  margin-left: auto;
  padding: 2px 12px;
  font-size: 11.5px;
  letter-spacing: 0.1em;
  color: var(--color-accent-deep);
  background: var(--color-pink-soft);
  border-radius: var(--radius-pill);
}

.addr-detail {
  margin-top: 12px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--color-text-regular);
}

.addr-ops {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-divider);
}

.op-btn {
  margin-right: 16px;
  font-size: 13px;
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
  padding: 26px 28px 8px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-item {
  flex: 1;
  margin-bottom: 20px;
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

.form-item input[type='text'] {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--color-text-regular);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: border-color 0.25s ease;
}

.form-item input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.default-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 13.5px;
  color: var(--color-text-regular);
  cursor: pointer;
}

.default-check input {
  width: 15px;
  height: 15px;
  accent-color: var(--color-primary);
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  padding: 18px 28px;
  border-top: 1px solid var(--color-border-light);
}

/* ---------------- 状态 ---------------- */
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
