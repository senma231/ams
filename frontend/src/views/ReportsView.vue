<template>
  <div class="reports-container">
    <div class="reports-header">
      <h2>报表导出</h2>
    </div>

    <el-row :gutter="20">
      <!-- 资产统计卡片 -->
      <el-col :span="8">
        <el-card class="statistic-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>资产总览</span>
            </div>
          </template>
          <el-row v-loading="loadingAssetStats">
            <el-col :span="12" class="statistic-item">
              <div class="statistic-label">总资产数</div>
              <div class="statistic-value">{{ assetStats.total || 0 }}</div>
            </el-col>
            <el-col :span="12" class="statistic-item">
              <div class="statistic-label">在库资产</div>
              <div class="statistic-value">{{ assetStats.inStock || 0 }}</div>
            </el-col>
            <el-col :span="12" class="statistic-item">
              <div class="statistic-label">领用中</div>
              <div class="statistic-value">{{ assetStats.inUse || 0 }}</div>
            </el-col>
            <el-col :span="12" class="statistic-item">
              <div class="statistic-label">已回收</div>
              <div class="statistic-value">{{ assetStats.returned || 0 }}</div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>

      <!-- 领用记录统计卡片 -->
      <el-col :span="8">
        <el-card class="statistic-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>领用记录</span>
            </div>
          </template>
          <el-row v-loading="loadingTransactionStats">
            <el-col :span="12" class="statistic-item">
              <div class="statistic-label">本月领用</div>
              <div class="statistic-value">{{ transactionStats.monthlyAssign || 0 }}</div>
            </el-col>
            <el-col :span="12" class="statistic-item">
              <div class="statistic-label">本月回收</div>
              <div class="statistic-value">{{ transactionStats.monthlyReturn || 0 }}</div>
            </el-col>
            <el-col :span="12" class="statistic-item">
              <div class="statistic-label">总领用数</div>
              <div class="statistic-value">{{ transactionStats.totalAssign || 0 }}</div>
            </el-col>
            <el-col :span="12" class="statistic-item">
              <div class="statistic-label">总回收数</div>
              <div class="statistic-value">{{ transactionStats.totalReturn || 0 }}</div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <!-- 报表导出区域 -->
    <el-row :gutter="20" class="export-section">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>资产报表导出</span>
            </div>
          </template>

          <el-form :model="assetExportForm" label-width="100px">
            <el-form-item label="资产类型">
              <el-select v-model="assetExportForm.type" placeholder="请选择类型" clearable>
                <el-option label="全部" value="" />
                <el-option label="配件" value="配件" />
                <el-option label="电脑" value="电脑" />
                <el-option label="主机" value="主机" />
                <el-option label="显示器" value="显示器" />
              </el-select>
            </el-form-item>
            <el-form-item label="资产状态">
              <el-select v-model="assetExportForm.status" placeholder="请选择状态" clearable>
                <el-option label="全部" value="" />
                <el-option label="在库" value="在库" />
                <el-option label="领用" value="领用" />
                <el-option label="回收" value="回收" />
              </el-select>
            </el-form-item>
            <el-form-item label="部门">
              <el-input v-model="assetExportForm.branch" placeholder="请输入部门" clearable />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="reportStore.loading"
                @click="handleExportAssetReport"
              >
                导出资产报表
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>领用记录报表导出</span>
            </div>
          </template>

          <el-form :model="transactionExportForm" label-width="100px">
            <el-form-item label="操作类型">
              <el-select v-model="transactionExportForm.type" placeholder="请选择类型" clearable>
                <el-option label="全部" value="" />
                <el-option label="领用" value="领用" />
                <el-option label="回收" value="回收" />
              </el-select>
            </el-form-item>
            <el-form-item label="日期范围">
              <el-date-picker
                v-model="transactionExportForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="reportStore.loading"
                @click="handleExportTransactionReport"
              >
                导出领用记录报表
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useReportStore } from '@/stores/report';

const reportStore = useReportStore();

// 统计数据
const assetStats = ref({});
const transactionStats = ref({});
const loadingAssetStats = ref(false);
const loadingTransactionStats = ref(false);

// 导出表单
const assetExportForm = reactive({
  type: '',
  status: '',
  branch: ''
});

const transactionExportForm = reactive({
  type: '',
  dateRange: []
});

// 获取统计数据
async function fetchStatistics() {
  // 获取资产统计
  loadingAssetStats.value = true;
  try {
    assetStats.value = await reportStore.getAssetStatistics();
  } catch (error) {
    ElMessage.error('获取资产统计数据失败');
  } finally {
    loadingAssetStats.value = false;
  }

  // 获取领用记录统计
  loadingTransactionStats.value = true;
  try {
    transactionStats.value = await reportStore.getTransactionStatistics();
  } catch (error) {
    ElMessage.error('获取领用记录统计数据失败');
  } finally {
    loadingTransactionStats.value = false;
  }
}

// 导出资产报表
async function handleExportAssetReport() {
  try {
    await reportStore.exportAssetReport(assetExportForm);
    ElMessage.success('资产报表导出成功');
  } catch (error) {
    ElMessage.error('资产报表导出失败');
  }
}

// 导出领用记录报表
async function handleExportTransactionReport() {
  try {
    const params = {
      type: transactionExportForm.type
    };

    if (transactionExportForm.dateRange?.length === 2) {
      params.startDate = transactionExportForm.dateRange[0];
      params.endDate = transactionExportForm.dateRange[1];
    }

    await reportStore.exportTransactionReport(params);
    ElMessage.success('领用记录报表导出成功');
  } catch (error) {
    ElMessage.error('领用记录报表导出失败');
  }
}

// 页面加载时获取统计数据
onMounted(() => {
  fetchStatistics();
});
</script>

<style scoped>
.reports-container {
  padding: 20px;
}

.reports-header {
  margin-bottom: 20px;
}

.statistic-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.statistic-item {
  text-align: center;
  padding: 10px;
}

.statistic-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.statistic-value {
  font-size: 24px;
  color: #303133;
  font-weight: bold;
}

.export-section {
  margin-top: 20px;
}
</style>