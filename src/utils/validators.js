/**
 * 表单校验工具（注册 / 修改密码共用）
 */

/** 手机号：11 位，1 开头，第二位 3-9 */
export const PHONE_RE = /^1[3-9]\d{9}$/

/**
 * 校验手机号
 * @returns {string|null} 错误信息，null 表示通过
 */
export function validatePhone(value) {
  const v = (value || '').trim()
  if (!v) return '请输入手机号'
  if (!PHONE_RE.test(v)) return '手机号需为 11 位（1 开头）'
  return null
}

/**
 * 校验密码强度：8-20 位，必须同时包含大写字母、小写字母、数字、特殊字符
 * @returns {string|null} 错误信息，null 表示通过
 */
export function validatePassword(value) {
  const v = value || ''
  if (!v) return '请输入密码'
  if (v.length < 8 || v.length > 20) return '密码长度需为 8–20 位'
  if (!/[a-z]/.test(v)) return '密码需包含小写字母'
  if (!/[A-Z]/.test(v)) return '密码需包含大写字母'
  if (!/\d/.test(v)) return '密码需包含数字'
  if (!/[^A-Za-z0-9]/.test(v)) return '密码需包含特殊字符（如 !@#$% 等）'
  return null
}

/**
 * 密码强度规则达成情况（用于实时提示）
 * @returns {{ text: string, ok: boolean }[]}
 */
export function passwordRules(value) {
  const v = value || ''
  return [
    { text: '8–20 位', ok: v.length >= 8 && v.length <= 20 },
    { text: '小写字母', ok: /[a-z]/.test(v) },
    { text: '大写字母', ok: /[A-Z]/.test(v) },
    { text: '数字', ok: /\d/.test(v) },
    { text: '特殊字符', ok: /[^A-Za-z0-9]/.test(v) },
  ]
}
