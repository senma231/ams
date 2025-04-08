import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useAssetTypeStore = defineStore('assetType', () => {
  const assetTypes = ref([]);
  const loading = ref(false);

  // 获取所有资产类型
  async function fetchAssetTypes() {
    loading.value = true;
    try {
      const response = await axios.get('/api/asset-types');

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        assetTypes.value = response.data.data;
      } else {
        assetTypes.value = [];
      }

      return assetTypes.value;
    } catch (error) {
      assetTypes.value = [];
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 获取资产类型名称
  function getAssetTypeName(code) {
    const type = assetTypes.value.find(t => t.code === code);
    return type ? type.name : code;
  }

  return {
    assetTypes,
    loading,
    fetchAssetTypes,
    getAssetTypeName
  };
});
