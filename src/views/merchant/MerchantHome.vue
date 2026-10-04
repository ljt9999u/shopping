<script setup>
import { ref } from 'vue'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const toast = ref('')

const stats = [
  { label: '在售商品', value: '—', en: 'On Sale' },
  { label: '待处理订单', value: '—', en: 'Orders' },
  { label: '待发货', value: '—', en: 'To Ship' },
  { label: '商品评价', value: '—', en: 'Reviews' },
]

const menus = [
  { icon: '📦', title: '商品管理', desc: '发布商品 · 上下架 · 库存' },
  { icon: '📋', title: '订单管理', desc: '订单查询 · 状态处理' },
  { icon: '🚚', title: '物流发货', desc: '填写单号 · 安排发货' },
  { icon: '🏪', title: '店铺资料', desc: '店铺信息 · 入驻资料维护' },
  { icon: '💬', title: '评价管理', desc: '查看买家评价与反馈' },
  { icon: '📍', title: '收货地址', desc: '店铺收货 · 退货地址' },
]

let toastTimer = null
function comingSoon() {
  toast.value = '功能即将上线，敬请期待'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 3000)
}
</script>

<template>
  <HomeLayout>
    <!-- 欢迎横幅 -->
    <section class="banner">
      <div class="container">
        <div class="banner-inner fade-up">
          <div>
            <p class="banner-en latin">Merchant Center</p>
            <h1>{{ auth.username || '商家朋友' }}，生意安昌</h1>
            <p class="banner-desc">好物自有知音，愿每件匠心都被温柔以待</p>
          </div>
          <span class="banner-mark">✦</span>
        </div>
      </div>
    </section>

    <!-- 经营概览 -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>经营概览</h2>
        </div>
        <div class="stat-grid">
          <div v-for="s in stats" :key="s.label" class="stat-card card">
            <p class="stat-value serif">{{ s.value }}</p>
            <p class="stat-label">{{ s.label }}</p>
            <p class="stat-en latin">{{ s.en }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 经营功能 -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>店铺管理</h2>
        </div>
        <div class="menu-grid">
          <button
            v-for="m in menus"
            :key="m.title"
            class="menu-card card"
            type="button"
            @click="comingSoon"
          >
            <span class="menu-icon">{{ m.icon }}</span>
            <span class="menu-title serif">{{ m.title }}</span>
            <span class="menu-desc">{{ m.desc }}</span>
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
/* ---------------- Banner ---------------- */
.banner {
  padding: 36px 0 8px;
}

.banner-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 48px 56px;
  border-radius: var(--radius-lg);
  background: linear-gradient(120deg, var(--color-primary-deep) 0%, var(--color-primary) 55%, var(--color-pink) 100%);
  box-shadow: var(--shadow-md);
}

.banner-en {
  font-size: 15px;
  letter-spacing: 0.34em;
  color: rgba(253, 248, 243, 0.85);
}

.banner-inner h1 {
  margin-top: 10px;
  color: #fdf8f3;
  font-size: 32px;
  letter-spacing: 0.1em;
}

.banner-desc {
  margin-top: 12px;
  color: rgba(253, 248, 243, 0.9);
  font-size: 14px;
  letter-spacing: 0.08em;
}

.banner-mark {
  font-size: 56px;
  color: rgba(253, 248, 243, 0.55);
}

/* ---------------- Section ---------------- */
.section {
  margin-top: 64px;
}

.section-head {
  margin-bottom: 34px;
}

.section-head h2 {
  font-size: 24px;
  letter-spacing: 0.2em;
}

/* ---------------- 统计卡 ---------------- */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.stat-card {
  padding: 30px 26px;
}

.stat-value {
  font-size: 38px;
  color: var(--color-accent);
  line-height: 1.2;
}

.stat-label {
  margin-top: 10px;
  font-size: 14px;
  letter-spacing: 0.1em;
  color: var(--color-text-regular);
}

.stat-en {
  margin-top: 2px;
  font-size: 12px;
  letter-spacing: 0.2em;
  color: var(--color-text-placeholder);
}

/* ---------------- 菜单卡 ---------------- */
.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.menu-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 32px 30px;
  text-align: left;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.menu-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-md);
}

.menu-icon {
  font-size: 28px;
}

.menu-title {
  font-size: 18px;
  letter-spacing: 0.12em;
}

.menu-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
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
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .menu-grid {
    grid-template-columns: 1fr;
  }

  .banner-inner {
    padding: 36px 30px;
  }

  .banner-mark {
    display: none;
  }
}
</style>
