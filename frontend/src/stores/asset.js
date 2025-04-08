import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useAssetStore = defineStore('asset', () => {
  const assets = ref([]);
  const loading = ref(false);
  const total = ref(0);

  // 获取资产列表
  async function fetchAssets(params = {}) {
    loading.value = true;
    try {
      const response = await axios.get('/api/assets', { params });
      assets.value = response.data.data;
      total.value = response.data.total;
      return response.data;
    } catch (error) {
      console.error('获取资产列表失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 创建资产
  async function createAsset(assetData) {
    try {
      const response = await axios.post('/api/assets', assetData);
      return response.data;
    } catch (error) {
      console.error('创建资产失败:', error);
      throw error.response?.data?.message || error.message || '创建资产失败';
    }
  }

  // 更新资产状态
  async function updateAssetStatus(id, status, data = {}) {
    try {
      let response;

      // 根据状态调用不同的API
      switch (status) {
        case 'in_use':
          response = await axios.post(`/api/assets/${id}/assign`, data);
          break;
        case 'in_stock':
          response = await axios.post(`/api/assets/${id}/return`);
          break;
        case 'scrapped':
          response = await axios.post(`/api/assets/${id}/scrap`);
          break;
        default:
          throw new Error('不支持的状态变更');
      }

      return response.data;
    } catch (error) {
      console.error('更新资产状态失败:', error);
      throw error.response?.data?.message || error.message || '更新资产状态失败';
    }
  }

  // 根据分公司获取资产
  async function getAssetsByBranch(branch) {
    try {
      // 使用查询参数而不是路径参数
      const response = await axios.get('/api/assets', {
        params: { branch }
      });
      return response.data;
    } catch (error) {
      console.error('获取分公司资产失败:', error);
      throw error.response?.data?.message || error.message || '获取分公司资产失败';
    }
  }

  return {
    assets,
    loading,
    total,
    fetchAssets,
    createAsset,
    updateAssetStatus,
    getAssetsByBranch
  };
});