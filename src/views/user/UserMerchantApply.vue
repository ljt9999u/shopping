<script setup>
/**
 * 商家入驻申请页
 * 三种状态：未申请（表单）/ 待审核（状态卡）/ 已通过（去商家首页）/ 已拒绝（重新提交）
 * 认证信息：店铺名、联系电话、营业执照号 + 营业执照图片上传
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import ImageUploader from '@/components/ImageUploader.vue'
import { applyMerchant, getMerchantByUserId } from '@/api/merchant'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

// status: null 未申请 / 0 待审核 / 1 已通过 / 2 已拒绝
const myApply = ref(null)
const loading = ref(true)
const submitting = ref(false)
const toast = ref('')
const toastTimer = ref(null)

const form = ref({
  shopName: '',
  contactPhone: '',
  businessLicense: '',
  licenseImage: '',
})

const STATUS_META = {
  0: { icon: '⏳', title: '申请审核中', desc: '我们已收到您的入驻申请，管理员会尽快审核，审核结果将以消息形式通知。' },
  1: { icon: '🎉', title: '审核通过', desc: '恭喜！您的店铺已开通，重新登录后即可进入商家中心管理店铺与商品。' },
  2: { icon: '❌', title: '审核未通过', desc: '很遗憾，本次申请未通过审核。您可以核对认证信息后重新提交。' },
}

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer.value)
  toastTimer.value = setTimeout(() => (toast.value = ''), 2600)
}

async function loadApply() {
  loading.value = true
  try {
    const data = await getMerchantByUserId(auth.userId)
    myApply.value = data
  } catch {
    // 尚未入驻
    myApply.value = null
  } finally {
    loading.value = false
  }
}

function fillForm(m) {
  form.value.shopName = m?.shopName || ''
  form.value.contactPhone = m?.contactPhone || ''
  form.value.businessLicense = m?.businessLicense || ''
  form.value.licenseImage = m?.licenseImage || ''
}

function reapply() {
  fillForm(myApply.value)
  myApply.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function submit() {
  if (!form.value.shopName.trim()) return showToast('请填写店铺名称')
  if (!/^1\d{10}$/.test(form.value.contactPhone.trim())) return showToast('请填写正确的联系电话')
  if (!form.value.businessLicense.trim()) return showToast('请填写营业执照号')
  if (!form.value.licenseImage) return showToast('请上传营业执照图片')

  submitting.value = true
  try {
    await applyMerchant({
      userId: auth.userId,
      shopName: form.value.shopName.trim(),
      contactPhone: form.value.contactPhone.trim(),
      businessLicense: form.value.businessLicense.trim(),
      licenseImage: form.value.licenseImage,
    })
    showToast(myApply.value === null && !form.value._resent ? '申请已提交，等待管理员审核' : '已重新提交申请')
    await loadApply()
  } catch (err) {
    showToast(err?.message || '提交失败，请稍后再试')
  } finally {
    submitting.value = false
  }
}

onMounted(loadApply)
</script>

<template>
  <HomeLayout>
    <section class="apply-page">
      <div class="container">
        <div class="page-head">
          <button class="back-btn" type="button" @click="router.push('/home')">← 返回</button>
          <h1 class="serif">商家入驻申请</h1>
          <p class="muted">提交认证信息，管理员审核通过后即可开通店铺</p>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="card state-card"><p class="muted">加载中…</p></div>

        <!-- 已有申请：状态卡 -->
        <template v-else-if="myApply">
          <div class="card state-card">
            <span class="state-icon">{{ STATUS_META[myApply.status]?.icon }}</span>
            <h2 class="serif">{{ STATUS_META[myApply.status]?.title }}</h2>
            <p class="muted">{{ STATUS_META[myApply.status]?.desc }}</p>

            <div class="apply-info">
              <div class="info-row"><span>店铺名称</span><b>{{ myApply.shopName }}</b></div>
              <div class="info-row"><span>联系电话</span><b>{{ myApply.contactPhone }}</b></div>
              <div class="info-row"><span>营业执照号</span><b>{{ myApply.businessLicense }}</b></div>
              <div class="info-row"><span>提交时间</span><b>{{ (myApply.createTime || '').replace('T', ' ').slice(0, 19) }}</b></div>
              <div v-if="myApply.licenseImage" class="info-row info-col">
                <span>营业执照</span>
                <img :src="myApply.licenseImage" class="license-preview" alt="营业执照" />
              </div>
            </div>

            <button v-if="myApply.status === 1" class="btn btn-primary btn-block" type="button" @click="router.push('/merchant/home')">
              进入商家中心
            </button>
            <button v-else-if="myApply.status === 2" class="btn btn-outline btn-block" type="button" @click="reapply">
              重新提交申请
            </button>
          </div>
        </template>

        <!-- 未申请 / 重新提交：表单 -->
        <template v-else>
          <div class="card form-card">
            <div class="form-item">
              <label>店铺名称</label>
              <input v-model="form.shopName" class="input" type="text" placeholder="给您的店铺取个名字" maxlength="30" />
            </div>
            <div class="form-item">
              <label>联系电话</label>
              <input v-model="form.contactPhone" class="input" type="tel" placeholder="11 位手机号，方便审核联系" maxlength="11" />
            </div>
            <div class="form-item">
              <label>营业执照号</label>
              <input v-model="form.businessLicense" class="input" type="text" placeholder="统一社会信用代码 / 注册号" maxlength="50" />
            </div>
            <div class="form-item">
              <label>营业执照图片</label>
              <div class="license-upload">
                <ImageUploader v-model="form.licenseImage" dir="license" button-text="上传执照" :size="120" />
                <p class="muted upload-tip">支持 JPG / PNG，不超过 5MB</p>
              </div>
            </div>
            <button class="btn btn-primary btn-block" type="button" :disabled="submitting" @click="submit">
              {{ submitting ? '提交中…' : '提交入驻申请' }}
            </button>
          </div>
        </template>

        <transition name="toast">
          <div v-if="toast" class="toast">{{ toast }}</div>
        </transition>
      </div>
    </section>
  </HomeLayout>
</template>

<style scoped>
.apply-page {
  padding: 28px 0 60px;
}
.page-head {
  margin-bottom: 20px;
}
.back-btn {
  border: none;
  background: none;
  color: var(--ink-3, #8a8378);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  margin-bottom: 12px;
}
.page-head h1 {
  margin: 0 0 6px;
  font-size: 26px;
}
.state-card,
.form-card {
  max-width: 520px;
  margin: 0 auto;
  padding: 32px;
  text-align: center;
}
.state-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
}
.state-card h2 {
  margin: 0 0 8px;
  font-size: 20px;
}
.apply-info {
  margin: 20px 0;
  text-align: left;
  border-top: 1px dashed var(--line, #e8e2d6);
  padding-top: 16px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 0;
  font-size: 14px;
}
.info-row span {
  color: var(--ink-3, #8a8378);
  flex-shrink: 0;
}
.info-row b {
  font-weight: 600;
  word-break: break-all;
  text-align: right;
}
.info-col {
  flex-direction: column;
  align-items: flex-start;
}
.info-col b {
  align-self: flex-end;
}
.license-preview {
  width: 100%;
  max-width: 320px;
  border-radius: 10px;
  border: 1px solid var(--line, #e8e2d6);
  margin-top: 8px;
}
.form-card {
  text-align: left;
}
.form-item {
  margin-bottom: 16px;
}
.form-item label {
  display: block;
  font-size: 13px;
  color: var(--ink-3, #8a8378);
  margin-bottom: 6px;
}
.license-upload {
  display: flex;
  align-items: center;
  gap: 14px;
}
.upload-tip {
  font-size: 12px;
}
.toast {
  position: fixed;
  left: 50%;
  bottom: 48px;
  transform: translateX(-50%);
  background: rgba(34, 32, 29, 0.92);
  color: #fff;
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 14px;
  z-index: 999;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
