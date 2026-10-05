import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 根路径：由全局守卫按登录态 / 角色重定向
    {
      path: '/',
      name: 'root',
      component: { template: '' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    // 用户首页
    {
      path: '/home',
      name: 'user-home',
      component: () => import('@/views/user/UserHome.vue'),
      meta: { requiresAuth: true, role: 'USER' },
    },
    // 用户中心：基本资料 + 收货地址
    {
      path: '/user/center',
      name: 'user-center',
      component: () => import('@/views/user/UserCenter.vue'),
      meta: { requiresAuth: true, role: 'USER' },
    },
    // 商品购物页：商品列表 + 悬浮购物车
    {
      path: '/shop',
      name: 'user-shop',
      component: () => import('@/views/user/ProductShop.vue'),
      meta: { requiresAuth: true, role: 'USER' },
    },
    // 订单确认页：地址、清单、备注、提交并跳转沙箱支付
    {
      path: '/checkout',
      name: 'user-checkout',
      component: () => import('@/views/user/Checkout.vue'),
      meta: { requiresAuth: true, role: 'USER' },
    },
    // 支付结果页：支付宝沙箱同步回跳地址
    {
      path: '/pay/result',
      name: 'pay-result',
      component: () => import('@/views/user/PayResult.vue'),
      meta: { requiresAuth: true, role: 'USER' },
    },
    // 我的订单：支付记录 + 发货物流跟踪
    {
      path: '/my-orders',
      name: 'my-orders',
      component: () => import('@/views/user/MyOrders.vue'),
      meta: { requiresAuth: true, role: 'USER' },
    },
    // 管理员首页
    {
      path: '/admin/home',
      name: 'admin-home',
      component: () => import('@/views/admin/AdminHome.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' },
    },
    // 商家首页
    {
      path: '/merchant/home',
      name: 'merchant-home',
      component: () => import('@/views/merchant/MerchantHome.vue'),
      meta: { requiresAuth: true, role: 'MERCHANT' },
    },
    // 商家商品管理
    {
      path: '/merchant/products',
      name: 'merchant-products',
      component: () => import('@/views/merchant/MerchantProductManage.vue'),
      meta: { requiresAuth: true, role: 'MERCHANT' },
    },
    // 兜底：未匹配路由回到根路径再分发
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// 全局前置守卫：鉴权 + 角色路由
router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.path === '/') {
    return auth.isLoggedIn ? auth.homePath : '/login'
  }

  // 已登录用户访问登录 / 注册页 → 直接进入其角色首页
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return auth.homePath
  }

  // 需要登录
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 角色不匹配 → 回到自己的首页（防越权进入他人页面）
  if (to.meta.role && auth.role !== to.meta.role) {
    return auth.isLoggedIn ? auth.homePath : '/login'
  }

  return true
})

export default router
