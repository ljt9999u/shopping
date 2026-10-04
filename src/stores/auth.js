import { defineStore } from 'pinia'
import { login as loginApi, register as registerApi, getUserInfo } from '@/api/user'

const TOKEN_KEY = 'suwu_token'
const USER_KEY = 'suwu_user'

export const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  MERCHANT: 'MERCHANT',
}

export const ROLE_LABELS = {
  USER: '用户',
  ADMIN: '管理员',
  MERCHANT: '商家',
}

// 各角色登录后进入的首页
const ROLE_HOME = {
  USER: '/home',
  ADMIN: '/admin/home',
  MERCHANT: '/merchant/home',
}

function normalizeRole(role) {
  if (!role) return ''
  let r = String(role).trim().toUpperCase()
  if (r.startsWith('ROLE_')) r = r.slice(5)
  return r
}

// 兼容 LoginVO / user info Map 的不同字段命名
function pickUser(data = {}) {
  const nested = data.user || data.userInfo || {}
  return {
    userId: data.userId ?? data.id ?? nested.userId ?? nested.id ?? null,
    username:
      data.username ??
      data.nickname ??
      nested.username ??
      nested.nickname ??
      '',
    role: normalizeRole(data.roleCode ?? data.role ?? nested.roleCode ?? nested.role),
    phone: data.phone ?? nested.phone ?? '',
    avatar: data.avatar ?? nested.avatar ?? '',
  }
}

function loadStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || {}
  } catch {
    return {}
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: loadStoredUser(),
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    role: (state) => state.user.role || '',
    username: (state) => state.user.username || '',
    userId: (state) => state.user.userId ?? null,
    roleLabel() {
      return ROLE_LABELS[this.role] || ''
    },
    homePath() {
      return ROLE_HOME[this.role] || '/login'
    },
  },

  actions: {
    setSession(token, user) {
      this.token = token
      this.user = { ...this.user, ...user }
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(this.user))
    },

    /**
     * 登录
     * @param {{ phone: string, password: string }} payload
     */
    async login(payload) {
      const data = await loginApi(payload)
      const token = data?.token || data?.accessToken
      if (!token) {
        throw new Error('登录响应缺少 token，请联系后端确认')
      }

      let user = pickUser(data)

      // LoginVO 未返回角色时，用 /user/info 从 JWT 解析补齐
      if (!user.role) {
        try {
          const info = await getUserInfo()
          user = { ...pickUser(info), ...user, role: pickUser(info).role || user.role }
        } catch {
          // 忽略：角色路由守卫会兜底
        }
      }

      this.setSession(token, user)
      return user
    },

    /**
     * 注册（服务端强制角色 USER）
     */
    async register(payload) {
      return registerApi(payload)
    },

    /**
     * 拉取最新用户信息并更新
     */
    async fetchUserInfo() {
      const info = await getUserInfo()
      const user = pickUser(info)
      this.user = { ...this.user, ...user }
      localStorage.setItem(USER_KEY, JSON.stringify(this.user))
      return user
    },

    logout() {
      this.token = ''
      this.user = {}
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})
