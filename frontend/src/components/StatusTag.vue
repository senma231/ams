<template>
  <el-tag :type="getStatusType" :effect="effect">{{ getStatusLabel }}</el-tag>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    required: true
  },
  effect: {
    type: String,
    default: 'light'
  }
});

// 状态映射
const statusMap = {
  in_stock: { label: '在库', type: 'success' },
  in_use: { label: '使用中', type: 'warning' },
  scrapped: { label: '报废', type: 'danger' },
  returned: { label: '已回收', type: 'info' }
};

// 获取状态标签
const getStatusLabel = computed(() => {
  return statusMap[props.status]?.label || props.status;
});

// 获取状态类型
const getStatusType = computed(() => {
  return statusMap[props.status]?.type || 'info';
});
</script>

<style scoped>
.el-tag {
  text-transform: capitalize;
}
</style>
