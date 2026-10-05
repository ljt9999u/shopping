import { defineStore } from 'pinia'
import {
  addToCart as addToCartApi,
  listCart,
  updateQuantity as updateQuantityApi,
  updateChecked as updateCheckedApi,
  deleteCartItem as deleteCartItemApi,
} from '@/api/cart'
import { useAuthStore } from '@/stores/auth'

/**
 * 购物车状态：悬浮购物车与角标共用
 */
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    totalAmount: 0,
    totalCount: 0,
    validCount: 0,
    loaded: false,
    loading: false,
  }),

  getters: {
    // 是否已全部勾选（仅看有效项）
    allChecked(state) {
      const valid = state.items.filter((i) => i.valid !== false)
      return valid.length > 0 && valid.every((i) => i.checked === 1)
    },
    // 购物车角标数量（种类数）
    badgeCount: (state) => state.totalCount,
    // 已勾选且有效的商品（用于结算）
    checkedItems(state) {
      return state.items.filter((i) => i.checked === 1 && i.valid !== false)
    },
  },

  actions: {
    /**
     * 拉取购物车
     * @param {boolean} force 强制刷新
     */
    async fetchCart(force = false) {
      const auth = useAuthStore()
      if (!auth.userId) return
      if (this.loading) return
      if (this.loaded && !force) return
      this.loading = true
      try {
        const data = await listCart(auth.userId)
        this.items = data.items || []
        this.totalAmount = data.totalAmount ?? 0
        this.totalCount = data.totalCount ?? this.items.length
        this.validCount = data.validCount ?? 0
        this.loaded = true
      } finally {
        this.loading = false
      }
    },

    /**
     * 加入购物车
     * @param {{ productId: number, quantity?: number }} payload
     */
    async addToCart(payload) {
      const auth = useAuthStore()
      await addToCartApi({
        userId: auth.userId,
        productId: payload.productId,
        quantity: payload.quantity ?? 1,
      })
      await this.fetchCart(true)
    },

    /**
     * 修改数量（下限 1）
     */
    async changeQuantity(item, nextQuantity) {
      const qty = Math.max(1, Math.min(nextQuantity, item.stock || nextQuantity))
      if (qty === item.quantity) return
      await updateQuantityApi(item.id, qty)
      await this.fetchCart(true)
    },

    /**
     * 切换单项勾选
     */
    async toggleChecked(item) {
      const next = item.checked === 1 ? 0 : 1
      await updateCheckedApi(item.id, next)
      await this.fetchCart(true)
    },

    /**
     * 删除单项
     */
    async removeItem(item) {
      await deleteCartItemApi(item.id)
      await this.fetchCart(true)
    },

    /**
     * 批量删除（下单成功后清理已购商品，最后只刷新一次）
     * @param {Array} items 购物车行
     */
    async removeItems(items) {
      if (!items || !items.length) return
      await Promise.all(items.map((i) => deleteCartItemApi(i.id)))
      await this.fetchCart(true)
    },

    reset() {
      this.items = []
      this.totalAmount = 0
      this.totalCount = 0
      this.validCount = 0
      this.loaded = false
    },
  },
})
