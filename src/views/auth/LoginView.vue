<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive({
  phone: '',
  password: '',
})

const errors = reactive({ phone: '', password: '' })
const loading = ref(false)
const globalError = ref('')

function validate() {
  errors.phone = ''
  errors.password = ''
  let valid = true

  if (!form.phone) {
    errors.phone = '请输入手机号'
    valid = false
  } else if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    errors.phone = '手机号格式不正确'
    valid = false
  }

  if (!form.password) {
    errors.password = '请输入密码'
    valid = false
  } else if (form.password.length < 6) {
    errors.password = '密码至少 6 位'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  globalError.value = ''
  if (!validate()) return

  loading.value = true
  try {
    await auth.login({ phone: form.phone, password: form.password })
    // 支持 ?redirect= 回跳；否则按角色进入各自首页
    const redirect = route.query.redirect
    if (redirect && typeof redirect === 'string') {
      router.push(redirect)
    } else {
      router.push(auth.homePath)
    }
  } catch (err) {
    globalError.value = err.message || '登录失败，请稍后再试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout title="欢迎回来" subtitle="登录素物，继续你的生活美学之旅">
    <!-- 全局错误提示 -->
    <div v-if="globalError" class="alert fade-in">{{ globalError }}</div>

    <form novalidate @submit.prevent="handleSubmit">
      <div class="field" :class="{ 'field-error': errors.phone }">
        <label class="field-label" for="phone">手机号</label>
        <input
          id="phone"
          v-model="form.phone"
          class="input"
          type="tel"
          maxlength="11"
          placeholder="请输入注册手机号"
          autocomplete="tel"
        />
        <span v-if="errors.phone" class="field-message">{{ errors.phone }}</span>
      </div>

      <div class="field" :class="{ 'field-error': errors.password }">
        <label class="field-label" for="password">密码</label>
        <input
          id="password"
          v-model="form.password"
          class="input"
          type="password"
          placeholder="请输入密码"
          autocomplete="current-password"
        />
        <span v-if="errors.password" class="field-message">{{ errors.password }}</span>
      </div>

      <button class="btn btn-primary btn-block" type="submit" :disabled="loading">
        {{ loading ? '登 录 中 …' : '登 录' }}
      </button>
    </form>

    <div class="auth-switch">
      <span>还没有账号？</span>
      <router-link to="/register" class="switch-link">立即注册</router-link>
    </div>

    <p class="role-hint">用户、管理员、商家共用此入口，系统将根据角色进入对应首页</p>
  </AuthLayout>
</template>

<style scoped>
.alert {
  margin-bottom: 22px;
  padding: 11px 16px;
  font-size: 13px;
  color: var(--color-accent-deep);
  background: var(--color-pink-soft);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-accent);
}

.auth-switch {
  margin-top: 28px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.switch-link {
  margin-left: 6px;
  color: var(--color-accent);
  font-weight: 500;
  position: relative;
}

.switch-link::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 100%;
  height: 1px;
  background: var(--color-accent);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.switch-link:hover::after {
  transform: scaleX(1);
}

.role-hint {
  margin-top: 22px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.05em;
  color: var(--color-text-placeholder);
}
</style>
