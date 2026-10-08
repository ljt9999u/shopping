<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import ImageUploader from '@/components/ImageUploader.vue'
import { useAuthStore } from '@/stores/auth'
import { getUserById, updateProfile } from '@/api/user'
import {
  listAddresses,
  addAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
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

/* ===================== 基本信息 ===================== */
const loadingProfile = ref(false)
const savingProfile = ref(false)

const profile = reactive({
  username: '',
  phone: '',
  nickname: '',
  email: '',
  avatar: '',
  gender: 0,
})

const profileForm = reactive({
  nickname: '',
  email: '',
  avatar: '',
  gender: 0,
})

const avatarText = computed(() => {
  const name = profile.nickname || profile.username || '物'
  return name.slice(0, 1)
})

const genderOptions = [
  { value: 0, label: '保密' },
  { value: 1, label: '先生' },
  { value: 2, label: '女士' },
]

async function loadProfile() {
  loadingProfile.value = true
  try {
    let userId = auth.userId
    if (!userId) {
      await auth.fetchUserInfo()
      userId = auth.userId
    }
    const data = await getUserById(userId)
    Object.assign(profile, {
      username: data.username ?? '',
      phone: data.phone ?? '',
      nickname: data.nickname ?? '',
      email: data.email ?? '',
      avatar: data.avatar ?? '',
      gender: data.gender ?? 0,
    })
    Object.assign(profileForm, {
      nickname: profile.nickname,
      email: profile.email,
      avatar: profile.avatar,
      gender: profile.gender,
    })
  } catch {
    showToast('用户信息加载失败')
  } finally {
    loadingProfile.value = false
  }
}

async function saveProfile() {
  if (profileForm.email && !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(profileForm.email)) {
    showToast('邮箱格式不正确')
    return
  }
  savingProfile.value = true
  try {
    await updateProfile({
      nickname: profileForm.nickname,
      email: profileForm.email,
      avatar: profileForm.avatar,
      gender: Number(profileForm.gender),
    })
    Object.assign(profile, { ...profileForm, gender: Number(profileForm.gender) })
    auth.syncProfile({ ...profileForm, gender: Number(profileForm.gender) })
    showToast('资料已更新')
  } catch {
    showToast('保存失败，请稍后再试')
  } finally {
    savingProfile.value = false
  }
}

/* ===================== 收货地址 ===================== */
const loadingAddresses = ref(false)
const addresses = ref([])

// 编辑中的地址；editing.id 存在表示编辑，否则为新增
const editing = ref(null)
const addressErrors = reactive({})

function emptyAddress() {
  return {
    userId: auth.userId,
    consignee: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    isDefault: 0,
  }
}

async function loadAddresses() {
  loadingAddresses.value = true
  try {
    const data = await listAddresses(auth.userId)
    addresses.value = Array.isArray(data) ? data : []
  } catch {
    showToast('地址加载失败')
  } finally {
    loadingAddresses.value = false
  }
}

function startAdd() {
  // 还没有地址时，默认勾选为默认地址
  editing.value = { ...emptyAddress(), isDefault: addresses.value.length ? 0 : 1 }
  Object.keys(addressErrors).forEach((k) => delete addressErrors[k])
}

function startEdit(item) {
  editing.value = { ...item }
  Object.keys(addressErrors).forEach((k) => delete addressErrors[k])
}

function cancelEdit() {
  editing.value = null
  Object.keys(addressErrors).forEach((k) => delete addressErrors[k])
}

function validateAddress(form) {
  Object.keys(addressErrors).forEach((k) => delete addressErrors[k])
  if (!form.consignee.trim()) addressErrors.consignee = '请填写收货人姓名'
  if (!/^1[3-9]\d{9}$/.test(form.phone)) addressErrors.phone = '请输入正确的 11 位手机号'
  if (!form.province.trim()) addressErrors.province = '请填写省份'
  if (!form.city.trim()) addressErrors.city = '请填写城市'
  if (!form.district.trim()) addressErrors.district = '请填写区 / 县'
  if (!form.detail.trim()) addressErrors.detail = '请填写详细地址'
  return Object.keys(addressErrors).length === 0
}

const savingAddress = ref(false)

async function saveAddress() {
  const form = editing.value
  if (!validateAddress(form)) {
    showToast('请完善地址信息')
    return
  }
  savingAddress.value = true
  try {
    const payload = {
      userId: auth.userId,
      consignee: form.consignee.trim(),
      phone: form.phone.trim(),
      province: form.province.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      detail: form.detail.trim(),
      isDefault: form.isDefault ? 1 : 0,
    }
    if (form.id) {
      await updateAddress({ ...payload, id: form.id })
      showToast('地址已更新')
    } else {
      await addAddress(payload)
      showToast('地址已添加')
    }
    editing.value = null
    await loadAddresses()
  } catch {
    showToast('保存失败，请稍后再试')
  } finally {
    savingAddress.value = false
  }
}

async function makeDefault(item) {
  if (item.isDefault === 1) return
  try {
    await setDefaultAddress(auth.userId, item.id)
    await loadAddresses()
    showToast('已设为默认地址')
  } catch {
    showToast('设置失败')
  }
}

const deletingId = ref(null)
async function removeAddress(item) {
  if (!window.confirm(`确定删除 ${item.consignee} 的收货地址吗？`)) return
  deletingId.value = item.id
  try {
    await deleteAddress(item.id)
    if (editing.value?.id === item.id) editing.value = null
    await loadAddresses()
    showToast('地址已删除')
  } catch {
    showToast('删除失败')
  } finally {
    deletingId.value = null
  }
}

function fullAddress(item) {
  return `${item.province} ${item.city} ${item.district} ${item.detail}`
}

onMounted(async () => {
  await loadProfile()
  await loadAddresses()
})
</script>

<template>
  <HomeLayout>
    <div class="container center-page">
      <!-- 页头 -->
      <div class="center-head fade-up">
        <button class="back-btn" type="button" @click="router.push('/home')">
          ← 返回首页
        </button>
        <div class="head-titles">
          <h1 class="serif">用户中心</h1>
          <p class="latin">My Center</p>
        </div>
      </div>

      <div class="center-grid">
        <!-- ============ 基本资料 ============ -->
        <section class="card profile-card fade-up">
          <div class="block-head">
            <h2 class="serif">基本资料</h2>
            <span class="latin">Profile</span>
          </div>

          <div v-if="loadingProfile" class="block-loading">加载中…</div>

          <template v-else>
            <!-- 头像 -->
            <div class="avatar-box">
              <div class="avatar">
                <img v-if="profileForm.avatar" :src="profileForm.avatar" alt="头像" />
                <span v-else class="avatar-text serif">{{ avatarText }}</span>
              </div>
              <p class="avatar-name serif">{{ profile.nickname || profile.username }}</p>
              <p class="avatar-phone">{{ profile.phone }}</p>
            </div>

            <!-- 只读信息 -->
            <div class="readonly-row">
              <span class="ro-label">账号</span>
              <span class="ro-value">{{ profile.username }}</span>
            </div>
            <div class="readonly-row">
              <span class="ro-label">手机号</span>
              <span class="ro-value">{{ profile.phone }}</span>
            </div>

            <!-- 可编辑表单 -->
            <div class="form-divider"><span>编辑资料</span></div>

            <label class="field">
              <span class="field-label">昵称</span>
              <input v-model="profileForm.nickname" class="input" type="text" placeholder="取一个喜欢的称呼" maxlength="50" />
            </label>

            <label class="field">
              <span class="field-label">邮箱</span>
              <input v-model="profileForm.email" class="input" type="email" placeholder="选填，用于接收订单通知" />
            </label>

            <div class="field">
              <span class="field-label">头像</span>
              <div class="avatar-upload-row">
                <ImageUploader
                  v-model="profileForm.avatar"
                  dir="avatar"
                  round
                  :size="72"
                  button-text="上传头像"
                />
                <input
                  v-model="profileForm.avatar"
                  class="input"
                  type="text"
                  placeholder="选填，也可粘贴图片 URL"
                />
              </div>
            </div>

            <div class="field">
              <span class="field-label">性别</span>
              <div class="gender-group">
                <button
                  v-for="opt in genderOptions"
                  :key="opt.value"
                  type="button"
                  class="gender-chip"
                  :class="{ active: Number(profileForm.gender) === opt.value }"
                  @click="profileForm.gender = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <button
              class="btn btn-primary btn-block"
              type="button"
              :disabled="savingProfile"
              @click="saveProfile"
            >
              {{ savingProfile ? '保存中…' : '保存资料' }}
            </button>
          </template>
        </section>

        <!-- ============ 收货地址 ============ -->
        <section class="card address-card fade-up">
          <div class="block-head">
            <h2 class="serif">收货地址</h2>
            <span class="latin">Addresses</span>
          </div>

          <div class="address-toolbar">
            <p class="address-tip">共 {{ addresses.length }} 个地址</p>
            <button
              v-if="!editing"
              class="btn btn-outline btn-sm"
              type="button"
              @click="startAdd"
            >
              + 新增地址
            </button>
          </div>

          <!-- 新增 / 编辑表单 -->
          <div v-if="editing" class="address-form">
            <p class="form-title serif">{{ editing.id ? '编辑地址' : '新增地址' }}</p>

            <div class="form-row">
              <label class="field">
                <span class="field-label">收货人 *</span>
                <input v-model="editing.consignee" class="input" type="text" placeholder="姓名" />
                <span v-if="addressErrors.consignee" class="field-message">{{ addressErrors.consignee }}</span>
              </label>
              <label class="field">
                <span class="field-label">联系电话 *</span>
                <input v-model="editing.phone" class="input" type="tel" placeholder="11 位手机号" maxlength="11" />
                <span v-if="addressErrors.phone" class="field-message">{{ addressErrors.phone }}</span>
              </label>
            </div>

            <div class="form-row">
              <label class="field">
                <span class="field-label">省份 *</span>
                <input v-model="editing.province" class="input" type="text" placeholder="如：浙江省" />
                <span v-if="addressErrors.province" class="field-message">{{ addressErrors.province }}</span>
              </label>
              <label class="field">
                <span class="field-label">城市 *</span>
                <input v-model="editing.city" class="input" type="text" placeholder="如：杭州市" />
                <span v-if="addressErrors.city" class="field-message">{{ addressErrors.city }}</span>
              </label>
              <label class="field">
                <span class="field-label">区 / 县 *</span>
                <input v-model="editing.district" class="input" type="text" placeholder="如：西湖区" />
                <span v-if="addressErrors.district" class="field-message">{{ addressErrors.district }}</span>
              </label>
            </div>

            <label class="field">
              <span class="field-label">详细地址 *</span>
              <input v-model="editing.detail" class="input" type="text" placeholder="街道、楼栋、门牌号等" />
              <span v-if="addressErrors.detail" class="field-message">{{ addressErrors.detail }}</span>
            </label>

            <label class="default-check">
              <input v-model="editing.isDefault" type="checkbox" :true-value="1" :false-value="0" />
              <span>设为默认收货地址</span>
            </label>

            <div class="form-actions">
              <button class="btn btn-text" type="button" @click="cancelEdit">取消</button>
              <button
                class="btn btn-primary"
                type="button"
                :disabled="savingAddress"
                @click="saveAddress"
              >
                {{ savingAddress ? '保存中…' : '保存地址' }}
              </button>
            </div>
          </div>

          <!-- 地址列表 -->
          <div v-else-if="loadingAddresses" class="block-loading">加载中…</div>

          <div v-else-if="addresses.length" class="address-list">
            <div v-for="item in addresses" :key="item.id" class="address-item">
              <div class="address-info">
                <div class="address-line1">
                  <span class="consignee serif">{{ item.consignee }}</span>
                  <span class="phone">{{ item.phone }}</span>
                  <span v-if="item.isDefault === 1" class="default-tag">默认</span>
                </div>
                <p class="address-detail">{{ fullAddress(item) }}</p>
              </div>
              <div class="address-ops">
                <button
                  v-if="item.isDefault !== 1"
                  class="op-btn"
                  type="button"
                  @click="makeDefault(item)"
                >
                  设为默认
                </button>
                <button class="op-btn" type="button" @click="startEdit(item)">编辑</button>
                <button
                  class="op-btn op-danger"
                  type="button"
                  :disabled="deletingId === item.id"
                  @click="removeAddress(item)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <p class="empty-icon">✿</p>
            <p class="serif">还没有收货地址</p>
            <p class="empty-sub">添加一个地址，让美物顺利抵达</p>
          </div>
        </section>
      </div>

      <!-- Toast -->
      <transition name="toast">
        <div v-if="toast" class="toast">{{ toast }}</div>
      </transition>
    </div>
  </HomeLayout>
</template>

<style scoped>
.center-page {
  padding-top: 36px;
  padding-bottom: 40px;
}

/* ---------------- 页头 ---------------- */
.center-head {
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 36px;
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

/* ---------------- 布局 ---------------- */
.center-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 26px;
  align-items: start;
}

.profile-card,
.address-card {
  padding: 32px 30px;
}

.block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--color-border-light);
}

.block-head h2 {
  font-size: 20px;
  letter-spacing: 0.18em;
}

.block-head span {
  font-size: 12px;
  letter-spacing: 0.28em;
  color: var(--color-text-placeholder);
}

.block-loading {
  padding: 60px 0;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
  letter-spacing: 0.1em;
}

/* ---------------- 头像 ---------------- */
.avatar-box {
  text-align: center;
  padding: 26px 0 22px;
}

.avatar {
  width: 88px;
  height: 88px;
  margin: 0 auto 14px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-text {
  font-size: 34px;
  color: var(--color-primary-deep);
}

.avatar-name {
  font-size: 18px;
  letter-spacing: 0.14em;
}

.avatar-phone {
  margin-top: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* ---------------- 只读行 ---------------- */
.readonly-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 4px;
  font-size: 14px;
  border-bottom: 1px dashed var(--color-border-light);
}

.ro-label {
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
}

.ro-value {
  color: var(--color-text-regular);
}

/* ---------------- 分隔 ---------------- */
.form-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 26px 0 22px;
  color: var(--color-text-secondary);
  font-size: 12.5px;
  letter-spacing: 0.2em;
}

.form-divider::before,
.form-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border-light);
}

/* ---------------- 性别选择 ---------------- */
.gender-group {
  display: flex;
  gap: 10px;
}

.gender-chip {
  flex: 1;
  padding: 10px 0;
  font-size: 13.5px;
  letter-spacing: 0.1em;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  color: var(--color-text-regular);
  transition: all 0.25s ease;
}

.gender-chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

/* ---------------- 地址区 ---------------- */
.address-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0;
}

.address-tip {
  font-size: 13px;
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
}

.btn-sm {
  padding: 9px 20px;
  font-size: 13px;
}

/* 地址表单 */
.address-form {
  padding: 22px;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
}

.form-title {
  font-size: 16px;
  letter-spacing: 0.16em;
  margin-bottom: 18px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0 16px;
}

.address-form .field {
  margin-bottom: 18px;
}

.default-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--color-text-regular);
  letter-spacing: 0.06em;
  margin-bottom: 18px;
  cursor: pointer;
}

.default-check input {
  accent-color: var(--color-accent);
  width: 15px;
  height: 15px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

/* 地址列表 */
.address-list {
  display: flex;
  flex-direction: column;
}

.address-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 20px 4px;
  border-bottom: 1px solid var(--color-border-light);
}

.address-item:last-child {
  border-bottom: none;
}

.address-line1 {
  display: flex;
  align-items: center;
  gap: 12px;
}

.consignee {
  font-size: 16px;
  letter-spacing: 0.1em;
}

.phone {
  font-size: 13.5px;
  color: var(--color-text-secondary);
}

.default-tag {
  padding: 2px 10px;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: #fff;
  background: var(--color-accent);
  border-radius: var(--radius-pill);
}

.address-detail {
  margin-top: 8px;
  font-size: 13.5px;
  color: var(--color-text-regular);
  line-height: 1.6;
}

.address-ops {
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

.op-btn:disabled {
  opacity: 0.5;
}

/* 空态 */
.empty-state {
  padding: 64px 0;
  text-align: center;
}

.empty-icon {
  font-size: 34px;
  color: var(--color-primary);
  margin-bottom: 14px;
}

.empty-state .serif {
  font-size: 17px;
  letter-spacing: 0.16em;
}

.empty-sub {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-placeholder);
  letter-spacing: 0.08em;
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
  .center-grid {
    grid-template-columns: 1fr;
  }

  .address-item {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* 头像上传 + URL 输入并排 */
.avatar-upload-row {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.avatar-upload-row .input {
  flex: 1;
}
</style>
