<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})

const imageUrl = computed(() => {
  const prompt =
    '东方生活美学静物，米白亚麻桌布上的手工陶瓷茶具与干枯花枝，清晨柔和阳光，大面积留白，暖米奶茶色调，极简高级杂志摄影，竖幅构图'
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
    prompt,
  )}&image_size=portrait_4_3`
})
</script>

<template>
  <div class="auth-page">
    <!-- 左侧品牌意境图 -->
    <aside class="auth-aside">
      <img :src="imageUrl" alt="素物生活美学" class="auth-image" />
      <div class="auth-aside-mask"></div>
      <div class="auth-brand">
        <p class="brand-en">SUWU</p>
        <div class="brand-line"></div>
        <h1 class="brand-name">素 物</h1>
        <p class="brand-desc">物尽其用 · 心享生活</p>
        <p class="brand-poem">
          于寻常器物中，<br />
          寻一份东方的安静与美好
        </p>
      </div>
    </aside>

    <!-- 右侧表单区 -->
    <main class="auth-main">
      <div class="auth-mobile-brand">
        <span class="latin">SUWU</span>
        <strong>素物</strong>
      </div>
      <p class="disclaimer disclaimer-mobile">
        （本站为个人测试网站，里面消费均为测试数据请勿消费，如有消费与本站拥有人无关）
      </p>

      <div class="auth-panel fade-up">
        <header class="auth-header">
          <h2>{{ props.title }}</h2>
          <p v-if="props.subtitle" class="auth-subtitle">{{ props.subtitle }}</p>
        </header>

        <slot />
      </div>

      <p class="disclaimer disclaimer-desktop">
        （本站为个人测试网站，里面消费均为测试数据请勿消费，如有消费与本站拥有人无关）
      </p>
      <p class="auth-foot">© 2026 素物 SUWU · 文艺轻奢生活商城</p>
    </main>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
}

/* ---------------- 左侧 ---------------- */
.auth-aside {
  position: relative;
  flex: 1.1;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}

.auth-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auth-aside-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(61, 48, 40, 0.12) 0%,
    rgba(61, 48, 40, 0.42) 100%
  );
}

.auth-brand {
  position: relative;
  z-index: 1;
  padding: 64px 56px;
  color: #fdf8f3;
}

.brand-en {
  font-family: var(--font-latin);
  font-size: 20px;
  letter-spacing: 0.5em;
  opacity: 0.9;
}

.brand-line {
  width: 44px;
  height: 1px;
  background: rgba(253, 248, 243, 0.7);
  margin: 18px 0;
}

.brand-name {
  color: #fdf8f3;
  font-size: 44px;
  letter-spacing: 0.32em;
  font-weight: 600;
}

.brand-desc {
  margin-top: 14px;
  font-family: var(--font-serif);
  font-size: 15px;
  letter-spacing: 0.28em;
  opacity: 0.92;
}

.brand-poem {
  margin-top: 30px;
  font-size: 13.5px;
  line-height: 2.1;
  letter-spacing: 0.12em;
  opacity: 0.78;
}

/* ---------------- 右侧 ---------------- */
.auth-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  background: var(--color-bg);
}

.auth-mobile-brand {
  display: none;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 34px;
}

.auth-mobile-brand .latin {
  font-size: 17px;
  letter-spacing: 0.35em;
  color: var(--color-primary-deep);
}

.auth-mobile-brand strong {
  font-family: var(--font-serif);
  font-size: 22px;
  letter-spacing: 0.25em;
}

.auth-panel {
  width: 100%;
  max-width: 400px;
}

.auth-header {
  margin-bottom: 36px;
}

.auth-header h2 {
  font-size: 28px;
  letter-spacing: 0.14em;
}

.auth-subtitle {
  margin-top: 12px;
  font-size: 13.5px;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
}

.auth-foot {
  position: absolute;
  bottom: 22px;
  font-size: 12px;
  color: var(--color-text-placeholder);
  letter-spacing: 0.08em;
}

/* 免责声明 */
.disclaimer {
  width: 100%;
  max-width: 400px;
  font-size: 12px;
  line-height: 1.8;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
}

/* 桌面端：品牌下的声明隐藏，底部声明显示 */
.disclaimer-mobile {
  display: none;
}

.disclaimer-desktop {
  margin-top: 26px;
  text-align: center;
}

/* ---------------- 响应式 ---------------- */
@media (max-width: 860px) {
  .auth-aside {
    display: none;
  }

  .auth-main {
    justify-content: flex-start;
    padding-top: 72px;
  }

  .auth-mobile-brand {
    display: flex;
  }

  .disclaimer-mobile {
    display: block;
    margin-bottom: 8px;
    text-align: center;
  }

  .disclaimer-desktop {
    display: none;
  }

  .auth-foot {
    position: static;
    margin-top: 40px;
  }
}
</style>
