/**
 * 图片上传工具（后端中转方案）
 * 前端 FormData 上传到 services-product1，服务器保存本地磁盘并返回网关可访问 URL。
 * 校验与后端保持一致：JPG/PNG/WEBP/GIF，≤ 5MB。
 */
import request from '@/utils/request'

export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
export const MAX_SIZE = 5 * 1024 * 1024

/**
 * 校验图片文件
 * @param {File} file
 * @returns {string|null} 错误信息，null 表示通过
 */
export function validateImage(file) {
  if (!file) return '未选择文件'
  const lowerName = file.name.toLowerCase()
  const extOk = ALLOWED_EXT.some((ext) => lowerName.endsWith(ext))
  if (!ALLOWED_TYPES.includes(file.type) || !extOk) {
    return '仅支持 JPG / PNG / WEBP / GIF 格式图片'
  }
  if (file.size > MAX_SIZE) {
    return '图片大小不能超过 5MB'
  }
  return null
}

/**
 * 上传图片，返回可访问 URL（如 /api/product/image/file/product/xxx.png）
 * @param {File} file 图片文件
 * @param {object} [options]
 * @param {'product'|'avatar'} [options.dir='product'] 存储目录
 * @param {(percent:number)=>void} [options.onProgress] 上传进度回调 0-100
 * @returns {Promise<string>} 图片 URL
 */
export async function uploadImage(file, options = {}) {
  const { dir = 'product', onProgress } = options

  const invalid = validateImage(file)
  if (invalid) throw new Error(invalid)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('dir', dir)

  // request 封装自动携带 JWT、解包 Result<T>；axios 对 FormData 自动使用 multipart
  const url = await request.post('/product/image/upload', formData, {
    timeout: 60000,
    onUploadProgress: (e) => {
      if (onProgress && e?.total) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)))
      }
    },
  })

  if (!url) throw new Error('上传失败：未返回图片地址')

  onProgress?.(100)
  return url
}
