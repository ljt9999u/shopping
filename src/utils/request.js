import axios from 'axios'

const TOKEN_KEY = 'suwu_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

const service = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截：自动携带 JWT
service.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截：解包 Result<T>，统一处理 401 / 业务失败
service.interceptors.response.use(
  (response) => {
    const res = response.data

    // 非统一 Result 结构（如字符串健康检查、HTML 表单），原样返回
    if (res === null || typeof res !== 'object' || res.code === undefined) {
      return res
    }

    if (res.code === 200) {
      return res.data
    }

    if (res.code === 401) {
      handleUnauthorized()
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }

    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      handleUnauthorized()
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，请稍后再试'))
    }
    if (!error.response) {
      return Promise.reject(new Error('网络异常，请检查网络连接'))
    }
    const msg = error.response.data?.message || '服务器开小差了，请稍后再试'
    return Promise.reject(new Error(msg))
  },
)

function handleUnauthorized() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('suwu_user')
  // 避免在登录页重复跳转
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export default service
