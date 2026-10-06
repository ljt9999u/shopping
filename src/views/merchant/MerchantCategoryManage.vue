<script setup>
import HomeLayout from '@/layouts/HomeLayout.vue'
import CategoryManagePanel from '@/components/CategoryManagePanel.vue'
</script>

<template>
  <HomeLayout>
    <CategoryManagePanel
      back-path="/merchant/home"
      subtitle="维护本店可用的商品分类，添加后发布商品即可选择，管理员审核通过后在购物页展示"
    />
  </HomeLayout>
</template>
