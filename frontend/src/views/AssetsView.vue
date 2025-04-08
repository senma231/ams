<template>
  <div class="assets-container">
    <div class="assets-header">
      <h2>资产管理</h2>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="资产编码">
          <el-input v-model="searchForm.code" placeholder="请输入资产编码" clearable />
        </el-form-item>
        <el-form-item label="类型" style="min-width: 200px;">
          <el-select v-model="searchForm.type" placeholder="请选择类型" clearable style="width: 100%;">
            <el-option v-for="type in assetTypes" :key="type.value" :label="type.label" :value="type.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" style="min-width: 200px;">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 100%;">
            <el-option v-for="status in assetStatus" :key="status.value" :label="status.label" :value="status.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="searchForm.department" placeholder="请输入部门" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 资产列表 -->
    <div v-if="assetList.length === 0 && !loading" class="empty-data-message">
      没有找到资产数据，请检查过滤条件或添加新资产。
    </div>
    <el-table
      v-loading="loading"
      :data="assetList"
      border
      style="width: 100%"
      :height="tableHeight"
      :row-style="{ height: '50px' }"
      :cell-style="{ padding: '8px' }"
    >
      <el-table-column prop="code" label="资产编码" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.code || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="name" label="资产名称" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.name || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" min-width="100">
        <template #default="{ row }">
          {{ getAssetTypeLabel(row.type) || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" min-width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="department" label="所属部门" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.department || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="current_department" label="当前使用部门" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.current_department || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="recipient" label="使用人" min-width="100" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.recipient || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="out_date" label="领用时间" min-width="160">
        <template #default="{ row }">
          {{ row.out_date ? formatDate(row.out_date) : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="description" label="备注" min-width="200">
        <template #default="{ row }">
          <el-input
            v-model="row.description"
            type="textarea"
            :rows="1"
            placeholder="点击编辑备注"
            @blur="handleDescriptionUpdate(row)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" min-width="200">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'available'"
            type="primary"
            link
            @click="handleAssign(row)"
          >
            领用
          </el-button>
          <el-button
            v-if="row.status === 'in_use'"
            type="warning"
            link
            @click="handleReturn(row)"
          >
            回收
          </el-button>
          <el-button
            v-if="row.status !== 'scrapped'"
            type="danger"
            link
            @click="handleScrap(row)"
          >
            报废
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 新增资产对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新增资产"
      width="500px"
    >
      <el-form
        ref="createForm"
        :model="createFormData"
        :rules="createRules"
        label-width="100px"
      >
        <el-form-item label="资产编号" prop="asset_id">
          <el-input v-model="createFormData.asset_id" placeholder="请输入资产编号" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="createFormData.type" placeholder="请选择类型">
            <el-option label="配件" value="accessory" />
            <el-option label="电脑" value="computer" />
            <el-option label="主机" value="host" />
            <el-option label="显示器" value="monitor" />
          </el-select>
        </el-form-item>
        <el-form-item label="分公司" prop="branch">
          <el-input v-model="createFormData.branch" placeholder="请输入分公司" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 领用对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="资产领用"
      width="500px"
    >
      <el-form
        ref="assignFormRef"
        :model="assignForm"
        :rules="assignRules"
        label-width="100px"
      >
        <el-form-item label="领用人" prop="recipient">
          <el-input v-model="assignForm.recipient" placeholder="请输入领用人" />
        </el-form-item>
        <el-form-item label="所属部门" prop="department">
          <el-input v-model="assignForm.department" placeholder="请输入部门" />
        </el-form-item>
        <el-form-item label="领用日期" prop="out_date">
          <el-date-picker
            v-model="assignForm.out_date"
            type="date"
            placeholder="请选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注" prop="description">
          <el-input
            v-model="assignForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAssign" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAssetStore } from '@/stores/asset';
import { useAssetTypeStore } from '@/stores/assetType';
import { formatDate } from '@/utils/date';
import axios from 'axios';

const assetStore = useAssetStore();
const assetTypeStore = useAssetTypeStore();

// 资产类型选项
const assetTypes = computed(() => {
  return assetTypeStore.assetTypes.map(type => ({
    label: type.name,
    value: type.code
  }));
});

// 资产状态选项
const assetStatus = [
  { label: '在库', value: 'in_stock' },
  { label: '使用中', value: 'in_use' },
  { label: '报废', value: 'scrapped' }
];

// 状态显示
const statusMap = {
  in_stock: { label: '在库', type: 'success' },
  in_use: { label: '使用中', type: 'warning' },
  scrapped: { label: '报废', type: 'danger' }
};

const loading = ref(false);
const tableHeight = ref('calc(100vh - 280px)');
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const assetList = ref([]);

// 搜索表单
const searchForm = reactive({
  code: '',
  type: '',
  status: '',
  department: ''
});

// 新增资产
const createDialogVisible = ref(false);
const creating = ref(false);
const createFormData = reactive({
  asset_id: '',
  type: '',
  branch: ''
});

const createRules = {
  asset_id: [
    { required: true, message: '请输入资产编号', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择类型', trigger: 'change' }
  ],
  branch: [
    { required: true, message: '请输入分公司', trigger: 'blur' }
  ]
};

// 领用
const assignDialogVisible = ref(false);
const assignFormRef = ref(null);
const submitting = ref(false);
const currentAsset = ref(null);

const assignForm = reactive({
  recipient: '',
  department: '',
  out_date: '',
  description: ''
});

const assignRules = {
  recipient: [{ required: true, message: '请输入领用人', trigger: 'blur' }],
  department: [{ required: true, message: '请输入部门', trigger: 'blur' }],
  out_date: [{ required: true, message: '请选择领用日期', trigger: 'change' }]
};

// 获取资产类型标签
function getAssetTypeLabel(type) {
  // 直接使用 assetTypeStore 的方法
  return assetTypeStore.getAssetTypeName(type);
}

// 获取状态标签
function getStatusLabel(status) {
  return statusMap[status]?.label || status;
}

// 获取状态类型
function getStatusType(status) {
  return statusMap[status]?.type || 'info';
}

// 搜索
async function handleSearch() {
  currentPage.value = 1;
  await fetchAssets();
}

// 重置搜索
function handleReset() {
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = '';
  });
  handleSearch();
}

// 获取资产列表
async function fetchAssets() {
  loading.value = true;
  try {
    const response = await axios.get('/api/assets', {
      params: {
        ...searchForm,
        page: currentPage.value,
        pageSize: pageSize.value
      }
    });

    if (response.data.success) {
      const { data, total: totalCount } = response.data;

      if (Array.isArray(data)) {
        assetList.value = data.map(asset => ({
          ...asset,
          status: asset.status === 'available' ? 'in_stock' : asset.status,
          department: asset.current_department || asset.department || '-'
        }));
        total.value = totalCount || 0;
      } else {
        assetList.value = [];
        total.value = 0;
        ElMessage.warning('没有找到资产数据');
      }
    } else {
      assetList.value = [];
      total.value = 0;
      throw new Error(response.data.message || '获取资产列表失败');
    }
  } catch (error) {
    assetList.value = [];
    total.value = 0;
    ElMessage.error(error.message || '获取资产列表失败');
  } finally {
    loading.value = false;
  }
}

// 显示新增对话框
function showCreateDialog() {
  createDialogVisible.value = true;
  Object.keys(createFormData).forEach(key => {
    createFormData[key] = '';
  });
}

// 创建资产
async function handleCreate() {
  if (!createForm.value) return;

  await createForm.value.validate(async (valid) => {
    if (valid) {
      creating.value = true;
      try {
        await assetStore.createAsset(createFormData);
        ElMessage.success('创建资产成功');
        createDialogVisible.value = false;
        fetchAssets();
      } catch (error) {
        ElMessage.error('创建资产失败');
      } finally {
        creating.value = false;
      }
    }
  });
}

// 领用资产
function handleAssign(row) {
  currentAsset.value = row;
  assignDialogVisible.value = true;
  Object.keys(assignForm).forEach(key => {
    assignForm[key] = '';
  });
}

// 提交领用
async function submitAssign() {
  if (!assignFormRef.value) return;

  await assignFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        await assetStore.updateAssetStatus(currentAsset.value.id, 'in_use', assignForm);
        ElMessage.success('资产领用成功');
        assignDialogVisible.value = false;
        fetchAssets();
      } catch (error) {
        console.error('资产领用失败:', error);
        ElMessage.error(typeof error === 'string' ? error : '资产领用失败');
      } finally {
        submitting.value = false;
      }
    }
  });
}

// 资产回收
async function handleReturn(row) {
  try {
    await ElMessageBox.confirm('确认回收该资产？', '提示', {
      type: 'warning'
    });

    await assetStore.updateAssetStatus(row.id, 'in_stock');
    ElMessage.success('资产回收成功');
    fetchAssets();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('资产回收失败:', error);
      ElMessage.error(typeof error === 'string' ? error : '资产回收失败');
    }
  }
}

// 资产报废
async function handleScrap(row) {
  try {
    await ElMessageBox.confirm('确认报废该资产？此操作不可恢复！', '警告', {
      type: 'warning'
    });

    await assetStore.updateAssetStatus(row.id, 'scrapped');
    ElMessage.success('资产报废成功');
    fetchAssets();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('资产报废失败:', error);
      ElMessage.error(typeof error === 'string' ? error : '资产报废失败');
    }
  }
}

// 分页处理
function handleSizeChange(val) {
  pageSize.value = val;
  fetchAssets();
}

function handleCurrentChange(val) {
  currentPage.value = val;
  fetchAssets();
}



// 页面加载时获取数据
onMounted(async () => {
  try {
    await assetTypeStore.fetchAssetTypes();
    await fetchAssets();
  } catch (error) {
    ElMessage.error('初始化数据失败，请刷新页面重试');
  }

  // 设置表格高度
  nextTick(() => {
    const headerHeight = 60; // 头部高度
    const searchFormHeight = 100; // 搜索表单高度
    const paginationHeight = 50; // 分页高度
    const padding = 40; // 内边距
    tableHeight.value = `calc(100vh - ${headerHeight + searchFormHeight + paginationHeight + padding}px)`;
  });
});

// 添加以下方法到 script 部分
async function handleDescriptionUpdate(row) {
  try {
    const response = await axios.put(`/api/assets/${row.id}`, {
      description: row.description
    });

    if (response.data.success) {
      ElMessage.success('备注更新成功');
    } else {
      throw new Error(response.data.message || '备注更新失败');
    }
  } catch (error) {
    console.error('备注更新失败:', error);
    ElMessage.error(error.message || '备注更新失败');
    // 恢复原始数据
    await fetchAssets();
  }
}
</script>

<style scoped>
.assets-container {
  height: 100%;
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.assets-header {
  margin-bottom: 20px;
}

.assets-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.search-bar {
  margin-bottom: 20px;
  padding: 20px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.search-form {
  margin-bottom: 20px;
  padding: 20px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table__row) {
  height: 50px;
}

:deep(.el-table__cell) {
  padding: 8px;
}

.empty-data-message {
  text-align: center;
  padding: 20px;
  color: #909399;
  font-size: 14px;
}
</style>