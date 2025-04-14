<template>
  <div class="asset-card" :class="{ 'is-in-use': asset.status === 'in_use', 'is-scrapped': asset.status === 'scrapped' }">
    <div class="asset-card-header">
      <h3 class="asset-name">{{ asset.name }}</h3>
      <StatusTag :status="asset.status" />
    </div>
    <div class="asset-card-content">
      <div class="asset-info">
        <p><strong>编码:</strong> {{ asset.code || '-' }}</p>
        <p><strong>类型:</strong> {{ getAssetTypeLabel(asset.type) }}</p>
        <p><strong>部门:</strong> {{ asset.department || '-' }}</p>
        <p v-if="asset.status === 'in_use'"><strong>使用人:</strong> {{ asset.recipient || '-' }}</p>
      </div>
    </div>
    <div class="asset-card-footer">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
import StatusTag from './StatusTag.vue';
import { useAssetTypeStore } from '@/stores/assetType';

const props = defineProps({
  asset: {
    type: Object,
    required: true
  }
});

const assetTypeStore = useAssetTypeStore();

// 获取资产类型标签
function getAssetTypeLabel(type) {
  return assetTypeStore.getAssetTypeName(type) || type;
}
</script>

<style scoped>
.asset-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 16px;
  margin-bottom: 16px;
  transition: all 0.3s;
}

.asset-card:hover {
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.asset-card.is-in-use {
  border-left: 4px solid var(--warning-color);
}

.asset-card.is-scrapped {
  border-left: 4px solid var(--danger-color);
  opacity: 0.7;
}

.asset-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.asset-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.asset-info {
  font-size: 14px;
  color: var(--text-color-secondary);
}

.asset-info p {
  margin: 8px 0;
}

.asset-card-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
