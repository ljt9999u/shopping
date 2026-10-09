<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { validatePhone, validatePassword, passwordRules } from '@/utils/validators'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  username: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive({
  username: '',
  phone: '',
  password: '',
  confirmPassword: '',
})

const loading = ref(false)
const globalError = ref('')

function validate() {
  Object.keys(errors).forEach((key) => {
    errors[key] = ''
  })
  let valid = true

  if (!form.username.trim()) {
    errors.username = '请输入用户名'
    valid = false
  } else if (form.username.trim().length < 2 || form.username.trim().length > 16) {
    errors.username = '用户名需为 2–16 个字符'
    valid = false
  }

  const phoneErr = validatePhone(form.phone)
  if (phoneErr) {
    errors.phone = phoneErr
    valid = false
  }

  const pwdErr = validatePassword(form.password)
  if (pwdErr) {
    errors.password = pwdErr
    valid = false
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = '请再次输入密码'
    valid = false
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = '两次输入的密码不一致'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  globalError.value = ''
  if (!validate()) return

  loading.value = true
  try {
    await auth.register({
      username: form.username.trim(),
      phone: form.phone,
      password: form.password,
    })
    // 注册成功后自动登录，进入用户首页（注册角色服务端强制为 USER）
    await auth.login({ phone: form.phone, password: form.password })
    router.push(auth.homePath)
  } catch (err) {
    globalError.value = err.message || '注册失败，请稍后再试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout title="加入素物" subtitle="注册账号，开启文艺轻奢的购物体验">
    <div v-if="globalError" class="alert fade-in">{{ globalError }}</div>

    <form novalidate @submit.prevent="handleSubmit">
      <div class="field" :class="{ 'field-error': errors.username }">
        <label class="field-label" for="username">用户名</label>
        <input
          id="username"
          v-model="form.username"
          class="input"
          type="text"
          maxlength="16"
          placeholder="给自己取一个名字"
          autocomplete="nickname"
        />
        <span v-if="errors.username" class="field-message">{{ errors.username }}</span>
      </div>

      <div class="field" :class="{ 'field-error': errors.phone }">
        <label class="field-label" for="phone">手机号</label>
        <input
          id="phone"
          v-model="form.phone"
          class="input"
          type="tel"
          maxlength="11"
          placeholder="请输入手机号"
          autocomplete="tel"
        />
        <span v-if="errors.phone" class="field-message">{{ errors.phone }}</span>
      </div>

      <div class="field" :class="{ 'field-error': errors.password }">
        <label class="field-label" for="password">设置密码</label>
        <input
          id="password"
          v-model="form.password"
          class="input"
          type="password"
          placeholder="8–20 位，含大小写字母、数字和特殊字符"
          autocomplete="new-password"
        />
        <div v-if="form.password" class="pwd-rules">
          <span v-for="r in passwordRules(form.password)" :key="r.text" class="pwd-rule" :class="{ ok: r.ok }">
            {{ r.ok ? '✓' : '·' }} {{ r.text }}
          </span>
        </div>
        <span v-if="errors.password" class="field-message">{{ errors.password }}</span>
      </div>

      <div class="field" :class="{ 'field-error': errors.confirmPassword }">
        <label class="field-label" for="confirmPassword">确认密码</label>
        <input
          id="confirmPassword"
          v-model="form.confirmPassword"
          class="input"
          type="password"
          placeholder="请再次输入密码"
          autocomplete="new-password"
        />
        <span v-if="errors.confirmPassword" class="field-message">
          {{ errors.confirmPassword }}
        </span>
      </div>

      <button class="btn btn-primary btn-block" type="submit" :disabled="loading">
        {{ loading ? '注 册 中 …' : '注 册' }}
      </button>
    </form>

    <div class="auth-switch">
      <span>已有账号？</span>
      <router-link to="/login" class="switch-link">直接登录</router-link>
    </div>
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

.pwd-rules {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 8px;
}

.pwd-rule {
  font-size: 12px;
  color: var(--color-text-secondary);
  transition: color 0.2s ease;
}

.pwd-rule.ok {
  color: #2c6e49;
}

</style>
