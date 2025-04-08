<template>
  <div class="dashboard-container">
    <!-- 统计卡片 -->
    <div class="statistics-cards">
      <el-card class="stat-card">
        <div class="stat-value">{{ statistics.total }}</div>
        <div class="stat-label">总资产数量</div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-value">{{ statistics.in_stock }}</div>
        <div class="stat-label">在库资产</div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-value">{{ statistics.in_use }}</div>
        <div class="stat-label">使用中资产</div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-value">{{ statistics.scrapped }}</div>
        <div class="stat-label">报废资产</div>
      </el-card>
    </div>

    <!-- 资产分布 -->
    <div class="distribution-section">
      <!-- 资产类型分布 -->
      <el-card class="distribution-card">
        <template #header>
          <div class="card-header">
            <span>资产类型分布</span>
          </div>
        </template>
        <el-table
          :data="assetTypeData"
          style="width: 100%"
          :header-cell-style="{ background: '#f5f7fa' }"
          :max-height="250"
        >
          <el-table-column prop="type_name" label="资产类型">
            <template #default="{ row }">
              {{ row.type_name || assetTypeMap[row.type] || row.type }}
            </template>
          </el-table-column>
          <el-table-column prop="total_count" label="总数量" />
          <el-table-column prop="available_count" label="可用数量" />
        </el-table>
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="typeCurrentPage"
            :page-size="5"
            layout="prev, pager, next"
            :total="assetsByType.length"
            @current-change="handleTypePageChange"
          />
        </div>
      </el-card>

      <!-- 部门资产分布 -->
      <el-card class="distribution-card" style="height: 400px;">
        <template #header>
          <div class="card-header">
            <span>部门资产分布</span>
          </div>
        </template>
        <v-chart class="chart" :option="departmentChartOption" style="height: 320px;" />
      </el-card>
    </div>

    <!-- 最近操作记录 -->
    <el-card class="recent-operations" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>最近操作记录</span>
        </div>
      </template>
      <el-table
        :data="displayedOperations"
        style="width: 100%; height: 300px;"
        :header-cell-style="{ background: '#f5f7fa' }"
      >
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="操作类型" width="80">
          <template #default="{ row }">
            <el-tag :type="getOperationTagType(row.type)">
              {{ getOperationTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operator_name" label="操作人" width="100" />
        <el-table-column prop="description" label="描述" />
      </el-table>
      <!-- 移除数字翻页，保留滚动功能 -->
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components';
import VChart from 'vue-echarts';
import { useDashboardStore } from '@/stores/dashboard';
import { ElMessage } from 'element-plus';

// 注册必要的 echarts 组件
use([
  CanvasRenderer,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
]);

const dashboardStore = useDashboardStore();

// 使用 store 中的数据
const statistics = computed(() => ({
  total: dashboardStore.statistics.total,
  in_stock: dashboardStore.statistics.in_stock,
  in_use: dashboardStore.statistics.in_use,
  scrapped: dashboardStore.statistics.scrapped
}));

const assetsByType = computed(() => dashboardStore.assetsByType);
const assetsByDepartment = computed(() => dashboardStore.assetsByDepartment);
const recentOperations = computed(() => dashboardStore.recentOperations);
const allOperations = computed(() => dashboardStore.allOperations);

// 分页相关
const typeCurrentPage = ref(1);

// 计算属性：当前页的资产类型数据
const assetTypeData = computed(() => {
  const start = (typeCurrentPage.value - 1) * 5;
  const end = start + 5;
  return assetsByType.value.slice(start, end);
});

// 计算属性：显示所有操作记录
const displayedOperations = computed(() => {
  return allOperations.value;
});

// 部门资产分布饼图配置
const departmentChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    type: 'scroll',
    formatter: (name) => {
      const item = assetsByDepartment.value.find(d => d.department_name === name);
      return name + ': ' + (item ? item.in_use_count : 0) + '/' + (item ? item.asset_count : 0);
    }
  },
  series: [
    {
      name: '部门资产分布',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}: {c}'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: '16',
          fontWeight: 'bold'
        }
      },
      data: assetsByDepartment.value.map(item => ({
        name: item.department_name,
        value: item.in_use_count || 0
      })).filter(item => item.value > 0)
    }
  ]
}));

// 资产类型中文映射
const assetTypeMap = {
  'accessory': '配件',
  'computer': '电脑',
  'host': '主机',
  'monitor': '显示器'
};

// 操作类型映射
const operationTypeMap = {
  'stock_in': '入库',
  'stock_out': '出库',
  'scrap': '报废',
  'return': '回收'
};

// 获取操作类型文本
const getOperationTypeText = (type) => {
  return operationTypeMap[type] || type;
};

// 获取操作类型标签类型
const getOperationTagType = (type) => {
  switch (type) {
    case 'stock_in':
      return 'success';
    case 'stock_out':
      return 'warning';
    case 'scrap':
      return 'danger';
    case 'return':
      return 'info';
    default:
      return '';
  }
};

// 分页处理函数
const handleTypePageChange = (page) => {
  typeCurrentPage.value = page;
};



// 设置定时刷新
let refreshInterval;

onMounted(async () => {
  await dashboardStore.fetchDashboardData();
  // 每30秒刷新一次数据
  refreshInterval = setInterval(() => {
    dashboardStore.fetchDashboardData();
  }, 30000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.statistics-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 20px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
}

.stat-label {
  margin-top: 10px;
  color: #606266;
}

.distribution-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.distribution-card {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.chart {
  width: 100%;
}

:deep(.el-card__header) {
  background-color: #f5f7fa;
  padding: 10px 20px;
}
</style>