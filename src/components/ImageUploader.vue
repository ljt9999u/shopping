<script setup>
/**
 * 图片直传组件（腾讯云 CloudBase）
 * 选择本地图片 → 校验 → 上传 → 通过 v-model 写回可访问 URL。
 * 上传依赖 CloudBase 匿名登录，环境未开启时会展示后端返回的明确错误。
 */
import { ref } from 'vue'
import { uploadImage } from '@/utils/upload'

const props = defineProps({
  modelValue: { type: String, default: '' },
  /** 云端存储目录 */
  dir: { type: String, default: 'product' },
  /** 圆形裁剪预览（头像场景） */
  round: { type: Boolean, default: false },
  /** 按钮文案 */
  buttonText: { type: String, default: '上传图片' },
  /** 预览尺寸 px */
  size: { type: Number, default: 96 },
})

const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const uploading = ref(false)
const progress = ref(0)
const errorMsg = ref('')

function triggerSelect() {
  if (uploading.value) return
  errorMsg.value = ''
  fileInput.value?.click()
}

async function onChange(e) {
  const file = e.target.files?.[0]
  // 清空 input 的值，保证选同一文件也能再次触发 change
  e.target.value = ''
  if (!file) return

  uploading.value = true
  progress.value = 0
  try {
    const url = await uploadImage(file, {
      dir: props.dir,
      onProgress: (p) => (progress.value = p),
    })
    emit('update:modelValue', url)
  } catch (err) {
    errorMsg.value = err?.message || '上传失败'
  } finally {
    uploading.value = false
    progress.value = 0
  }
}
</script>

<template>
  <div class="img-uploader" :class="{ round }">
    <div
      class="preview"
      :class="{ round, uploading }"
      :style="{ width: `${size}px`, height: `${size}px` }"
      @click="triggerSelect"
    >
      <img v-if="modelValue" :src="modelValue" alt="图片预览" />
      <div v-else class="placeholder">
        <span class="ph-icon">＋</span>
      </div>

      <div v-if="uploading" class="mask">
        <span class="mask-text">{{ progress }}%</span>
      </div>

      <div v-else class="hover-mask">
        <span>{{ modelValue ? '重新上传' : '选择图片' }}</span>
      </div>
    </div>

    <button
      type="button"
      class="upload-btn"
      :disabled="uploading"
      @click="triggerSelect"
    >
      {{ uploading ? `上传中 ${progress}%` : buttonText }}
    </button>

    <p v-if="errorMsg" class="err">✕ {{ errorMsg }}</p>
    <p v-else class="hint">JPG / PNG / WEBP / GIF，≤ 5MB</p>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      hidden
      @change="onChange"
    />
  </div>
</template>

<style scoped>
.img-uploader {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.preview {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-bg-soft);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.25s ease;
}

.preview.round {
  border-radius: 50%;
}

.preview:hover {
  border-color: var(--color-primary);
}

.preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.ph-icon {
  font-size: 24px;
  color: var(--color-text-placeholder);
}

.hover-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(61, 48, 40, 0.5);
  color: #fdf8f3;
  font-size: 12.5px;
  letter-spacing: 0.08em;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.preview:hover .hover-mask {
  opacity: 1;
}

.mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(61, 48, 40, 0.6);
}

.mask-text {
  color: #fdf8f3;
  font-size: 14px;
  letter-spacing: 0.06em;
}

.upload-btn {
  padding: 7px 18px;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--color-accent-deep);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  transition: all 0.25s ease;
}

.upload-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary-deep);
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  font-size: 12px;
  color: var(--color-text-placeholder);
  letter-spacing: 0.04em;
}

.err {
  font-size: 12px;
  line-height: 1.6;
  color: #b4655a;
  max-width: 260px;
}
</style>
