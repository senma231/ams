import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useReportStore = defineStore('report', () => {
  const loading = ref(false);

  // 导出资产报表
  async function exportAssetReport(params = {}) {
    loading.value = true;
    try {
      const response = await axios.get('/api/reports/assets', {
        params,
        responseType: 'blob'
      });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `资产报表_${new Date().toLocaleDateString()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('导出资产报表失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 导出领用记录报表
  async function exportTransactionReport(params = {}) {
    loading.value = true;
    try {
      const response = await axios.get('/api/reports/transactions', {
        params,
        responseType: 'blob'
      });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `领用记录报表_${new Date().toLocaleDateString()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('导出领用记录报表失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 获取资产统计数据
  async function getAssetStatistics() {
    try {
      const response = await axios.get('/api/reports/statistics/assets');
      return response.data.data;
    } catch (error) {
      console.error('获取资产统计数据失败:', error);
      throw error;
    }
  }

  // 获取领用记录统计数据
  async function getTransactionStatistics() {
    try {
      const response = await axios.get('/api/reports/statistics/transactions');
      return response.data.data;
    } catch (error) {
      console.error('获取领用记录统计数据失败:', error);
      throw error;
    }
  }

  return {
    loading,
    exportAssetReport,
    exportTransactionReport,
    getAssetStatistics,
    getTransactionStatistics
  };
}); 