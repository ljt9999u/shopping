<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { getMerchantByUserId, updateMerchant } from '@/api/merchant'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2600)
}

const AUDIT_TEXT = { 0: '待审核', 1: '已通过', 2: '已拒绝' }

const form = reactive({
  id: null,
  shopName: '',
  shopLogo: '',
  contactPhone: '',
  businessLicense: '',
  status: null,
})

onMounted(async () => {
  loading.value = true
  try {
    const m = await getMerchantByUserId(auth.userId)
    form.id = m.id
    form.shopName = m.shopName || ''
    form.shopLogo = m.shopLogo || ''
    form.contactPhone = m.contactPhone || ''
    form.businessLicense = m.businessLicense || ''
    form.status = m.status
  } catch (e) {
    showToast(e.message || '店铺信息加载失败')
  } finally {
    loading.value = false
  }
})

async function save() {
  if (!form.shopName.trim()) {
    showToast('请填写店铺名称')
    return
  }
  if (!form.contactPhone.trim()) {
    showToast('请填写联系电话')
    return
  }
  saving.value = true
  try {
    await updateMerchant({
      id: form.id,
      shopName: form.shopName.trim(),
      shopLogo: form.shopLogo.trim() || null,
      contactPhone: form.contactPhone.trim(),
      // 营业执照为入驻审核资料，原值带回不修改
      businessLicense: form.businessLicense || null,
    })
    showToast('店铺资料已保存')
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <HomeLayout>
    <section class="page-hero">
      <div class="container">
        <button class="btn btn-outline back-btn" type="button" @click="router.push('/merchant/home')">
          ← 返回
        </button>
        <p class="hero-en latin">Shop Profile</p>
        <h1 class="serif">店铺资料</h1>
        <p class="hero-sub">维护店铺基本信息，买家在商品与店铺页看到的内容</p>
      </div>
    </section>

    <section class="container form-section">
      <div v-if="loading" class="state card">
        <span class="state-icon">❋</span>
        <p>店铺信息加载中…</p>
      </div>

      <div v-else class="card form-card">
        <div class="audit-row">
          <span class="audit-label">入驻审核状态</span>
          <span class="status-badge" :class="`st-${form.status}`">
            {{ AUDIT_TEXT[form.status] ?? '—' }}
          </span>
        </div>

        <div class="form-item">
          <label>店铺名称 <em>*</em></label>
          <input v-model="form.shopName" type="text" maxlength="30" placeholder="请输入店铺名称" />
        </div>

        <div class="form-item">
          <label>联系电话 <em>*</em></label>
          <input v-model="form.contactPhone" type="text" maxlength="20" placeholder="买家与平台联系用" />
        </div>

        <div class="form-item">
          <label>店铺 Logo 链接（选填）</label>
          <input v-model="form.shopLogo" type="text" maxlength="255" placeholder="https://…" />
          <div v-if="form.shopLogo" class="logo-preview">
            <img :src="form.shopLogo" alt="店铺Logo预览" @error="(e) => (e.target.style.opacity = 0.3)" />
            <span class="muted">Logo 预览（链接无效时不展示）</span>
          </div>
        </div>

        <div class="form-item">
          <label>营业执照号（入驻审核资料，不可修改）</label>
          <input v-model="form.businessLicense" type="text" disabled placeholder="未填写" />
        </div>

        <div class="form-foot">
          <button class="btn btn-primary" type="button" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存资料' }}
          </button>
        </div>
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

.form-section {
  margin-top: 32px;
  margin-bottom: 64px;
  max-width: 720px;
}

.form-card {
  padding: 32px 36px;
}

.audit-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.audit-label {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  letter-spacing: 0.1em;
}

.status-badge {
  padding: 4px 16px;
  font-size: 12.5px;
  letter-spacing: 0.1em;
  border-radius: var(--radius-pill);
}

.st-0 {
  color: var(--color-accent-deep);
  background: var(--color-pink-soft);
}

.st-1 {
  color: #6e7c5f;
  background: #e6eadf;
}

.st-2 {
  color: #b4655a;
  background: #f3e2df;
}

.form-item {
  margin-bottom: 22px;
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

.form-item input {
  width: 100%;
  padding: 11px 14px;
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

.form-item input:disabled {
  background: var(--color-bg-soft);
  color: var(--color-text-placeholder);
}

.logo-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
}

.logo-preview img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-soft);
}

.muted {
  font-size: 12.5px;
  color: var(--color-text-placeholder);
}

.form-foot {
  margin-top: 8px;
}

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
