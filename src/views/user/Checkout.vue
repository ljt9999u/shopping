<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeLayout from '@/layouts/HomeLayout.vue'
import { listAddresses } from '@/api/address'
import { createOrder, alipayPayForm } from '@/api/order'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()

/* 结算商品：取购物车中已勾选的有效项 */
const goods = ref(cart.checkedItems.map((i) => ({ ...i })))

/* ===================== 收货地址 ===================== */
const addresses = ref([])
const addressLoading = ref(false)
const selectedAddressId = ref(null)

async function loadAddresses() {
  addressLoading.value = true
  try {
    const list = await listAddresses(auth.userId)
    addresses.value = list || []
    const def = addresses.value.find((a) => a.isDefault === 1)
    selectedAddressId.value = def ? def.id : addresses.value[0]?.id ?? null
  } finally {
    addressLoading.value = false
  }
}

const selectedAddress = computed(
  () => addresses.value.find((a) => a.id === selectedAddressId.value) || null,
)

/* ===================== 金额 ===================== */
const goodsAmount = computed(() =>
  goods.value.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0),
)
const freight = computed(() => 0)
const payAmount = computed(() => goodsAmount.value + freight.value)

function formatPrice(val) {
  return Number(val || 0).toFixed(2)
}

/* ===================== 备注与下单 ===================== */
const remark = ref('')
const submitting = ref(false)
const errorMsg = ref('')

/** 下单成功后的订单 */
const createdOrder = ref(null)
const paying = ref(false)

async function submitOrder() {
  errorMsg.value = ''
  if (!selectedAddressId.value) {
    errorMsg.value = '请选择收货地址'
    return
  }
  submitting.value = true
  try {
    const order = await createOrder({
      userId: auth.userId,
      addressId: selectedAddressId.value,
      remark: remark.value.trim(),
      detailList: goods.value.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    })
    createdOrder.value = order
    // 清理购物车中已购商品
    await cart.removeItems(goods.value)
    window.scrollTo({ top: 0 })
  } catch (e) {
    errorMsg.value = e?.message || '下单失败，请稍后再试'
  } finally {
    submitting.value = false
  }
}

/**
 * 支付宝沙箱支付：
 * 后端返回收银台 HTML 表单，写入页面后手动提交，跳转沙箱收银台。
 * 签名/密钥全部在后端，前端不接触任何私钥。
 */
async function payByAlipay() {
  if (!createdOrder.value) return
  paying.value = true
  try {
    const formHtml = await alipayPayForm(createdOrder.value.orderNo)
    const holder = document.createElement('div')
    holder.setAttribute('style', 'display:none')
    holder.innerHTML = formHtml
    document.body.appendChild(holder)
    const form = holder.querySelector('form')
    if (form) {
      // 表单自带的自动提交脚本在 innerHTML 中不会执行，这里手动提交
      form.submit()
    } else {
      // 兜底：直接写入整个文档
      document.open()
      document.write(formHtml)
      document.close()
    }
  } catch (e) {
    paying.value = false
    errorMsg.value = e?.message || '唤起支付宝沙箱失败，可稍后从订单中再支付'
  }
}

function laterPay() {
  router.push('/shop')
}

onMounted(async () => {
  if (!goods.value.length) {
    // 直接进入或无勾选商品时，回商品页
    router.replace('/shop')
    return
  }
  await cart.fetchCart()
  await loadAddresses()
})
</script>

<template>
  <HomeLayout>
    <div class="checkout-page container">
      <!-- ============ 下单成功：支付方式选择 ============ -->
      <section v-if="createdOrder" class="pay-choice card fade-up">
        <p class="success-icon">✦</p>
        <h1 class="serif">订单提交成功</h1>
        <p class="success-sub">订单号：{{ createdOrder.orderNo }}</p>

        <div class="pay-amount-box">
          <span>应付金额</span>
          <strong>¥{{ formatPrice(createdOrder.payAmount) }}</strong>
        </div>

        <div class="pay-methods">
          <label class="pay-method active">
            <span class="pay-icon">支</span>
            <span class="pay-text">
              <strong>支付宝 · 沙箱支付</strong>
              <small>跳转支付宝沙箱收银台，不产生真实交易</small>
            </span>
            <span class="pay-radio"></span>
          </label>
        </div>

        <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

        <div class="pay-actions">
          <button class="btn btn-primary" type="button" :disabled="paying" @click="payByAlipay">
            {{ paying ? '正在跳转沙箱收银台…' : '立即支付' }}
          </button>
          <button class="btn btn-outline" type="button" @click="laterPay">稍后支付</button>
        </div>
        <p class="test-tip">本站为个人测试网站，沙箱付款均为测试数据，请勿真实消费</p>
      </section>

      <!-- ============ 订单确认 ============ -->
      <template v-else>
        <header class="page-head">
          <button class="btn btn-outline back-btn" type="button" @click="router.push('/shop')">
            ← 返回市集
          </button>
          <h1 class="serif">确认订单</h1>
          <p class="head-en latin">Confirm Order</p>
        </header>

        <!-- 收货地址 -->
        <section class="block card">
          <div class="block-head">
            <h2 class="serif">收货地址</h2>
          </div>

          <div v-if="addressLoading" class="block-loading">地址加载中…</div>

          <div v-else-if="!addresses.length" class="no-address">
            <p>还没有收货地址，请先添加收货地址</p>
            <button class="btn btn-primary" type="button" @click="router.push('/user/center')">
              去添加地址
            </button>
          </div>

          <div v-else class="address-list">
            <label
              v-for="addr in addresses"
              :key="addr.id"
              class="address-item"
              :class="{ active: addr.id === selectedAddressId }"
            >
              <input v-model="selectedAddressId" type="radio" name="address" :value="addr.id" />
              <div class="addr-info">
                <p class="addr-user">
                  <strong>{{ addr.consignee }}</strong>
                  <span>{{ addr.phone }}</span>
                  <span v-if="addr.isDefault === 1" class="default-tag">默认</span>
                </p>
                <p class="addr-detail">
                  {{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}
                </p>
              </div>
            </label>
          </div>
        </section>

        <!-- 商品清单 -->
        <section class="block card">
          <div class="block-head">
            <h2 class="serif">商品清单</h2>
            <span class="head-count">共 {{ goods.length }} 种</span>
          </div>

          <div class="goods-list">
            <div v-for="item in goods" :key="item.id" class="goods-line">
              <div class="goods-image">
                <img v-if="item.productImage" :src="item.productImage" :alt="item.productName" />
                <span v-else class="goods-no-image">素物</span>
              </div>
              <div class="goods-info">
                <p class="goods-name serif">{{ item.productName }}</p>
                <p class="goods-price">¥{{ formatPrice(item.price) }}</p>
              </div>
              <div class="goods-qty">× {{ item.quantity }}</div>
              <div class="goods-subtotal">¥{{ formatPrice(item.price * item.quantity) }}</div>
            </div>
          </div>
        </section>

        <!-- 订单备注 -->
        <section class="block card">
          <div class="block-head">
            <h2 class="serif">订单备注</h2>
          </div>
          <input
            v-model="remark"
            class="input"
            type="text"
            maxlength="100"
            placeholder="选填，给店家留言（100 字以内）"
          />
        </section>

        <!-- 底部结算栏 -->
        <section class="settle-bar card">
          <div class="settle-amounts">
            <p><span>商品总额</span><em>¥{{ formatPrice(goodsAmount) }}</em></p>
            <p><span>运费</span><em>¥{{ formatPrice(freight) }}</em></p>
            <p class="settle-total">
              <span>实付金额</span>
              <strong>¥{{ formatPrice(payAmount) }}</strong>
            </p>
          </div>
          <div class="settle-action">
            <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
            <p v-if="!selectedAddress" class="error-text">请先选择收货地址</p>
            <button
              class="btn btn-primary submit-btn"
              type="button"
              :disabled="submitting || !selectedAddress"
              @click="submitOrder"
            >
              {{ submitting ? '正在提交订单…' : '提交订单' }}
            </button>
          </div>
        </section>
      </template>
    </div>
  </HomeLayout>
</template>

<style scoped>
.checkout-page {
  padding: 40px 24px 80px;
  max-width: 1080px;
}

/* ---------------- 页头 ---------------- */
.page-head {
  text-align: center;
  margin-bottom: 28px;
}

.page-head h1 {
  font-size: 30px;
  letter-spacing: 0.22em;
}

.head-en {
  margin-top: 8px;
  font-size: 13px;
  letter-spacing: 0.4em;
  color: var(--color-text-placeholder);
}

.back-btn {
  position: absolute;
  left: 24px;
  padding: 7px 18px;
  font-size: 12.5px;
  letter-spacing: 0.1em;
}

/* ---------------- 区块 ---------------- */
.block {
  padding: 26px 30px;
  margin-bottom: 22px;
}

.block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20px;
}

.block-head h2 {
  font-size: 18px;
  letter-spacing: 0.14em;
}

.head-count {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.block-loading {
  padding: 20px 0;
  color: var(--color-text-secondary);
  font-size: 14px;
}

/* ---------------- 地址 ---------------- */
.no-address {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 10px 0;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.address-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.address-item {
  display: flex;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.address-item:hover {
  border-color: var(--color-primary);
}

.address-item.active {
  border-color: var(--color-primary);
  background: var(--color-bg-soft);
}

.address-item input {
  margin-top: 3px;
  accent-color: var(--color-primary);
}

.addr-user {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14.5px;
}

.addr-user strong {
  font-weight: 600;
}

.addr-user span {
  color: var(--color-text-secondary);
  font-size: 13.5px;
}

.default-tag {
  background: var(--color-accent);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.08em;
}

.addr-detail {
  margin-top: 7px;
  font-size: 13.5px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* ---------------- 商品清单 ---------------- */
.goods-line {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.goods-line:last-child {
  border-bottom: none;
}

.goods-image {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-bg-soft);
}

.goods-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.goods-no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 13px;
  color: var(--color-primary);
  letter-spacing: 0.2em;
}

.goods-info {
  flex: 1;
}

.goods-name {
  font-size: 15px;
  margin-bottom: 8px;
}

.goods-price {
  font-size: 14px;
  color: var(--color-accent);
}

.goods-qty {
  width: 70px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.goods-subtotal {
  width: 110px;
  text-align: right;
  font-size: 15px;
  font-weight: 600;
}

/* ---------------- 结算栏 ---------------- */
.settle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 30px;
}

.settle-amounts p {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  font-size: 13.5px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.settle-amounts em {
  font-style: normal;
  width: 110px;
  text-align: right;
}

.settle-total {
  margin-bottom: 0 !important;
}

.settle-total span {
  color: var(--color-text);
  font-size: 14px;
}

.settle-total strong {
  width: 110px;
  text-align: right;
  color: var(--color-accent);
  font-size: 22px;
  font-weight: 600;
}

.settle-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.submit-btn {
  padding: 12px 44px;
  font-size: 15px;
  letter-spacing: 0.18em;
}

.error-text {
  font-size: 13px;
  color: var(--color-accent);
}

/* ---------------- 支付方式选择 ---------------- */
.pay-choice {
  max-width: 560px;
  margin: 20px auto;
  padding: 48px 44px;
  text-align: center;
}

.success-icon {
  font-size: 30px;
  color: var(--color-primary);
}

.pay-choice h1 {
  margin-top: 14px;
  font-size: 26px;
  letter-spacing: 0.18em;
}

.success-sub {
  margin-top: 10px;
  font-size: 13px;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
}

.pay-amount-box {
  margin: 28px 0;
  padding: 20px;
  background: var(--color-bg-soft);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pay-amount-box span {
  font-size: 14px;
  color: var(--color-text-secondary);
  letter-spacing: 0.12em;
}

.pay-amount-box strong {
  font-size: 26px;
  color: var(--color-accent);
}

.pay-method {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--color-primary);
  border-radius: 12px;
  background: var(--color-bg-soft);
  cursor: default;
  text-align: left;
}

.pay-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #1677ff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
}

.pay-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pay-text strong {
  font-size: 14.5px;
}

.pay-text small {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.pay-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-primary);
  background: radial-gradient(circle, var(--color-primary) 50%, transparent 55%);
}

.pay-actions {
  display: flex;
  gap: 14px;
  justify-content: center;
  margin-top: 28px;
}

.pay-actions .btn {
  padding: 11px 32px;
  letter-spacing: 0.14em;
}

.test-tip {
  margin-top: 20px;
  font-size: 12px;
  color: var(--color-text-placeholder);
  line-height: 1.8;
}

/* ---------------- 响应式 ---------------- */
@media (max-width: 760px) {
  .address-list {
    grid-template-columns: 1fr;
  }

  .back-btn {
    position: static;
    margin-bottom: 18px;
  }

  .settle-bar {
    flex-direction: column;
    gap: 18px;
    align-items: stretch;
  }

  .settle-action {
    align-items: stretch;
  }

  .submit-btn {
    width: 100%;
  }

  .goods-subtotal {
    width: 80px;
  }
}
</style>
