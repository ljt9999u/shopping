<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const toast = ref('')

const heroUrl = computed(() => {
  const prompt =
    '东方生活美学场景，米白色房间内木质茶桌、手工陶瓷器皿与绿植，窗外柔和晨光，温暖奶茶色调，极简轻奢，宽幅杂志摄影'
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
    prompt,
  )}&image_size=landscape_16_9`
})

const entries = [
  { icon: '✦', title: '用户中心', desc: '个人资料 · 收货地址', to: '/user/center' },
  { icon: '❋', title: '浏览好物', desc: '文艺美物 · 匠心甄选', to: '/shop' },
  { icon: '❒', title: '我的订单', desc: '跟踪订单与物流', to: '/my-orders' },
]

const collections = [
  { name: '茶具器皿', en: 'Tea Ware' },
  { name: '香氛蜡烛', en: 'Fragrance' },
  { name: '家居织物', en: 'Textile' },
  { name: '书房雅物', en: 'Study' },
]

let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 3000)
}

function comingSoon() {
  showToast('功能即将上线，敬请期待')
}

function handleEntry(item) {
  if (item.to) {
    router.push(item.to)
  } else {
    comingSoon()
  }
}
</script>

<template>
  <HomeLayout>
    <!-- Hero -->
    <section class="hero">
      <div class="container">
        <div class="hero-card fade-up">
          <img :src="heroUrl" alt="素物生活" class="hero-image" />
          <div class="hero-content">
            <p class="hero-en latin">A Quiet Life</p>
            <h1 class="hero-title">
              你好，{{ auth.username || '旅人' }}
            </h1>
            <p class="hero-desc">
              愿你在寻常日子里，<br />
              与美好器物温柔相遇
            </p>
            <button class="btn btn-primary" type="button" @click="router.push('/shop')">
              开始逛逛
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 快捷入口 -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>我的空间</h2>
          <p class="section-en latin">My Space</p>
        </div>
        <div class="entry-grid">
          <button
            v-for="(item, idx) in entries"
            :key="item.title"
            class="entry-card card"
            :class="{ 'entry-feature': idx === 0 }"
            type="button"
            @click="handleEntry(item)"
          >
            <span class="entry-icon">{{ item.icon }}</span>
            <span class="entry-title serif">{{ item.title }}</span>
            <span class="entry-desc">{{ item.desc }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 好物分类 -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>好物分类</h2>
          <p class="section-en latin">Collections</p>
        </div>
        <div class="collection-grid">
          <button
            v-for="col in collections"
            :key="col.name"
            class="collection-card"
            type="button"
            @click="comingSoon"
          >
            <span class="collection-name serif">{{ col.name }}</span>
            <span class="collection-en latin">{{ col.en }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </HomeLayout>
</template>

<style scoped>
/* ---------------- Hero ---------------- */
.hero {
  padding: 36px 0 8px;
}

.hero-card {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  min-height: 420px;
  box-shadow: var(--shadow-md);
}

.hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(61, 48, 40, 0.55) 0%, rgba(61, 48, 40, 0.12) 60%, transparent 100%);
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 72px 64px;
  color: #fdf8f3;
}

.hero-en {
  font-size: 17px;
  letter-spacing: 0.3em;
  opacity: 0.85;
}

.hero-title {
  margin-top: 16px;
  color: #fdf8f3;
  font-size: 38px;
  letter-spacing: 0.1em;
}

.hero-desc {
  margin: 20px 0 32px;
  font-size: 15px;
  line-height: 2;
  letter-spacing: 0.1em;
  opacity: 0.9;
}

/* ---------------- Section ---------------- */
.section {
  margin-top: 72px;
}

.section-head {
  text-align: center;
  margin-bottom: 40px;
}

.section-head h2 {
  font-size: 26px;
  letter-spacing: 0.22em;
}

.section-en {
  margin-top: 8px;
  font-size: 14px;
  letter-spacing: 0.32em;
  color: var(--color-text-placeholder);
}

/* ---------------- 快捷入口 ---------------- */
.entry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(205px, 1fr));
  gap: 22px;
}

.entry-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 36px 20px;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.entry-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-md);
}

/* 用户中心卡片强调 */
.entry-feature {
  background: linear-gradient(160deg, var(--color-primary-soft), var(--color-bg-card));
  border-color: var(--color-primary);
}

.entry-feature .entry-icon {
  font-size: 30px;
}

.entry-feature .entry-title {
  color: var(--color-accent-deep);
}

.entry-icon {
  font-size: 26px;
  color: var(--color-accent);
}

.entry-title {
  font-size: 17px;
  letter-spacing: 0.14em;
}

.entry-desc {
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

/* ---------------- 分类 ---------------- */
.collection-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.collection-card {
  padding: 46px 20px;
  border-radius: var(--radius-md);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition:
    background-color 0.35s ease,
    transform 0.3s ease;
}

.collection-card:hover {
  background: var(--color-primary-soft);
  transform: translateY(-4px);
}

.collection-name {
  font-size: 18px;
  letter-spacing: 0.18em;
}

.collection-en {
  font-size: 13px;
  letter-spacing: 0.22em;
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
  .entry-grid,
  .collection-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .hero-content {
    padding: 52px 36px;
  }

  .hero-title {
    font-size: 30px;
  }
}
</style>
