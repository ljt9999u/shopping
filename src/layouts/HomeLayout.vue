<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

const auth = useAuthStore()
const cart = useCartStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  cart.reset()
  router.push('/login')
}

function goCenter() {
  if (auth.centerPath) router.push(auth.centerPath)
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div class="container header-inner">
        <router-link :to="auth.homePath" class="header-brand" title="返回首页">
          <span class="latin brand-en">SUWU</span>
          <span class="brand-cn">素物</span>
        </router-link>

        <div class="header-right">
          <button
            v-if="auth.centerPath"
            class="role-tag"
            type="button"
            title="进入个人中心"
            @click="goCenter"
          >
            {{ auth.roleLabel }}中心
          </button>
          <span v-if="auth.centerPath" class="header-divider"></span>
          <span class="header-user">{{ auth.username || '尊贵的客人' }}</span>
          <button class="logout-btn" type="button" @click="handleLogout">
            退出登录
          </button>
        </div>
      </div>
    </header>

    <main class="page-body">
      <slot />
    </main>

    <footer class="page-footer">
      <div class="container">
        <p>素物 SUWU · 东方生活美物</p>
        <p class="footer-sub">物尽其用，心享生活 — 文艺轻奢购物平台</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ---------------- 顶栏 ---------------- */
.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(253, 248, 243, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border-light);
}

.header-inner {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-brand {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.brand-en {
  font-size: 19px;
  letter-spacing: 0.38em;
  color: var(--color-primary-deep);
}

.brand-cn {
  font-family: var(--font-serif);
  font-size: 19px;
  letter-spacing: 0.28em;
  color: var(--color-text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.role-tag {
  padding: 4px 14px;
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--color-accent-deep);
  background: var(--color-pink-soft);
  border-radius: var(--radius-pill);
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    box-shadow 0.3s ease;
}

.role-tag:hover {
  background: var(--color-pink);
  color: #fff;
  box-shadow: 0 4px 12px rgba(232, 180, 184, 0.45);
}

.header-divider {
  width: 1px;
  height: 14px;
  background: var(--color-border);
}

.header-user {
  font-size: 14px;
  color: var(--color-text-regular);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  font-size: 13px;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
  transition: color 0.3s ease;
}

.logout-btn:hover {
  color: var(--color-accent);
}

/* ---------------- 内容区 ---------------- */
.page-body {
  flex: 1;
}

/* ---------------- 页脚 ---------------- */
.page-footer {
  margin-top: 80px;
  padding: 36px 0;
  text-align: center;
  border-top: 1px solid var(--color-border-light);
}

.page-footer p {
  font-family: var(--font-serif);
  font-size: 14px;
  letter-spacing: 0.24em;
  color: var(--color-text-regular);
}

.footer-sub {
  margin-top: 8px;
  font-family: var(--font-sans) !important;
  font-size: 12px !important;
  letter-spacing: 0.1em !important;
  color: var(--color-text-placeholder) !important;
}

@media (max-width: 640px) {
  .role-tag,
  .header-divider {
    display: none;
  }
}
</style>
