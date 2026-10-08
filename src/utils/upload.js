/**
 * 腾讯云 CloudBase 云存储直传工具
 * 后端不接收文件：前端匿名登录后直传 CloudBase，换取可访问 URL 写入业务表单。
 * 环境 ID 与后端 services-product1 的 cloudbase.env-id 保持一致。
 */
import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = 'demo2-4gx58pwtb0429fb1'

/** 允许的图片类型（扩展名 + MIME 双校验） */
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
/** 大小上限 5MB */
export const MAX_SIZE = 5 * 1024 * 1024

let app = null
let anonymousPromise = null

function getApp() {
  if (!app) {
    app = cloudbase.init({ env: ENV_ID })
  }
  return app
}

/**
 * CloudBase 要求先登录才能上传，这里做一次匿名登录（带并发去重与登录态复用）
 */
async function ensureAnonymousAuth() {
  const tcb = getApp()
  const auth = tcb.auth({ persistence: 'local' })
  // 已有登录态则直接复用
  const loginState = await auth.getLoginState?.()
  if (loginState) return auth

  if (!anonymousPromise) {
    anonymousPromise = auth
      .signInAnonymously()
      .then(() => auth)
      .catch((err) => {
        anonymousPromise = null
        throw new Error(
          `云存储登录失败：${err?.message || '未知错误'}（请确认 CloudBase 环境已开启匿名登录）`,
        )
      })
  }
  return anonymousPromise
}

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

function buildCloudPath(dir, file) {
  const extMatch = file.name.toLowerCase().match(/\.[a-z0-9]+$/)
  const ext = extMatch ? extMatch[0] : '.jpg'
  const rand = Math.random().toString(36).slice(2, 8)
  return `${dir}/${Date.now()}-${rand}${ext}`
}

/**
 * 上传图片到 CloudBase 并返回可访问 URL
 * @param {File} file 图片文件
 * @param {object} [options]
 * @param {'product'|'avatar'} [options.dir='product'] 云端目录
 * @param {(percent:number)=>void} [options.onProgress] 上传进度回调 0-100
 * @returns {Promise<string>} 图片可访问 URL
 */
export async function uploadImage(file, options = {}) {
  const { dir = 'product', onProgress } = options

  const invalid = validateImage(file)
  if (invalid) throw new Error(invalid)

  const auth = await ensureAnonymousAuth()
  const tcb = getApp()
  const cloudPath = buildCloudPath(dir, file)

  // uploadFile 支持 onUploadProgress
  const uploadRes = await tcb.uploadFile({
    cloudPath,
    filePath: file,
    onUploadProgress: (e) => {
      if (onProgress && e?.total) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)))
      }
    },
  })

  if (!uploadRes?.fileID) {
    throw new Error('上传失败：未返回文件标识')
  }

  // 通过 fileID 换取带签名的临时可访问 URL
  const tempRes = await tcb.getTempFileURL({ fileList: [uploadRes.fileID] })
  const fileItem = tempRes?.fileList?.[0]
  const url = fileItem?.tempFileURL || fileItem?.download_url
  if (!url) {
    throw new Error('上传成功但获取图片访问地址失败')
  }

  onProgress?.(100)
  // 避免未使用告警：auth 已在上方保证登录态
  void auth
  return url
}
