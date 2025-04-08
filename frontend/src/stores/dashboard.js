import { defineStore } from 'pinia'
import { request } from '@/utils/request'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    loading: false,
    error: null,
    statistics: {
      total: 0,
      in_stock: 0,
      in_use: 0,
      scrapped: 0
    },
    assetsByType: [],
    assetsByDepartment: [],
    recentOperations: [],
    allOperations: []
  }),

  actions: {
    async fetchDashboardData() {
      this.loading = true;
      this.error = null;
      try {
        const response = await request.get('/api/dashboard');
        console.log('Dashboard response:', response.data); // 调试日志

        if (response.data.success) {
          const { assetStats, assetsByType, assetsByDepartment, recentStockIn, recentStockOut, allOperations } = response.data.data;

          // 更新统计数据
          this.statistics = {
            total: parseInt(assetStats?.total) || 0,
            in_stock: parseInt(assetStats?.in_stock) || 0,
            in_use: parseInt(assetStats?.in_use) || 0,
            scrapped: parseInt(assetStats?.scrapped) || 0
          };

          // 更新资产类型分布
          this.assetsByType = assetsByType?.map(item => ({
            type: item.type,
            type_name: item.type_name || item.type,
            total_count: parseInt(item.total_count) || 0,
            available_count: parseInt(item.available_count) || 0
          })) || [];

          // 更新部门资产分布
          this.assetsByDepartment = assetsByDepartment?.map(item => ({
            department_name: item.department_name || '未分配',
            asset_count: parseInt(item.asset_count) || 0,
            in_use_count: parseInt(item.in_use_count) || 0
          })).filter(item => item.asset_count > 0) || [];

          // 合并并处理最近操作记录
          const stockInRecords = (recentStockIn || []).map(item => ({
            ...item,
            created_at: item.created_at,
            type: 'stock-in',
            description: `入库 ${item.item_count || 0} 件资产，总数量 ${item.total_quantity || 0}`
          }));

          const stockOutRecords = (recentStockOut || []).map(item => ({
            ...item,
            created_at: item.created_at,
            type: 'stock-out',
            description: `出库 ${item.item_count || 0} 件资产`
          }));

          // 处理资产报废和回收记录
          const assetOperations = (response.data.data.recentOperations || []).map(item => {
            let typeText = '';
            let typeValue = '';

            if (item.operation_type === 'scrap') {
              typeText = '报废';
              typeValue = 'scrap';
            } else if (item.operation_type === 'return') {
              typeText = '回收';
              typeValue = 'return';
            }

            return {
              ...item,
              created_at: item.created_at,
              type: typeValue,
              description: `${typeText}资产：${item.asset_name}${item.asset_code ? ` (编码: ${item.asset_code})` : ''}`
            };
          });

          this.recentOperations = [...stockInRecords, ...stockOutRecords, ...assetOperations]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          // 使用后端已合并的操作记录
          this.allOperations = allOperations || [];

        } else {
          throw new Error(response.data.message || '获取仪表盘数据失败');
        }
      } catch (error) {
        console.error('获取仪表盘数据错误:', error);
        this.error = '获取仪表盘数据失败';
      } finally {
        this.loading = false;
      }
    }
  }
})