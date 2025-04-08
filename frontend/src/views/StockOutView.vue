<template>
  <div class="stock-out-view">
    <div class="page-header">
      <h2>资产出库管理</h2>
      <el-button type="primary" @click="showStockOutDialog">资产出库</el-button>
    </div>

    <!-- 出库记录列表 -->
    <el-table v-loading="loading" :data="records" style="width: 100%" :fit="true">
      <el-table-column prop="batch_no" label="批次号" min-width="120" />
      <el-table-column prop="recipient" label="领用人" min-width="100" />
      <el-table-column prop="department" label="所属部门" min-width="120" />
      <el-table-column prop="out_date" label="领用日期" min-width="100">
        <template #default="{ row }">
          {{ formatDate(row.out_date) }}
        </template>
      </el-table-column>
      <el-table-column prop="operator_name" label="操作人" min-width="100" />
      <el-table-column prop="created_at" label="创建时间" min-width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" min-width="100">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewDetail(row)">
            查看详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 出库表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="资产出库"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="批次号" prop="batch_no">
          <el-input v-model="form.batch_no" disabled />
        </el-form-item>
        <el-form-item label="领用人" prop="recipient">
          <el-input v-model="form.recipient" placeholder="请输入领用人姓名" />
        </el-form-item>
        <el-form-item label="所属部门" prop="department">
          <el-input v-model="form.department" placeholder="请输入所属部门" />
        </el-form-item>
        <el-form-item label="领用日期" prop="out_date">
          <el-date-picker
            v-model="form.out_date"
            type="date"
            placeholder="选择领用日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="form.notes"
            type="textarea"
            rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>

        <!-- 资产选择 -->
        <div class="assets-section">
          <div class="section-header">
            <h3>资产选择</h3>
            <div class="asset-input">
              <el-button type="primary" @click="showAssetSelector">
                选择资产
              </el-button>
            </div>
          </div>

          <!-- 已选资产列表 -->
          <el-table :data="form.assets" style="width: 100%">
            <el-table-column prop="code" label="资产编码" width="150">
              <template #default="{ row }">
                <el-input v-model="row.code" placeholder="请输入资产编码" />
              </template>
            </el-table-column>
            <el-table-column prop="name" label="资产名称" />
            <el-table-column prop="type" label="类型" width="120">
              <template #default="{ row }">
                <el-tag>{{ getAssetTypeText(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="department" label="所属部门" width="120" />
            <el-table-column label="操作" width="80">
              <template #default="{ $index }">
                <el-button
                  link
                  type="danger"
                  @click="removeAsset($index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认出库</el-button>
      </template>
    </el-dialog>

    <!-- 资产选择对话框 -->
    <el-dialog
      v-model="assetSelectorVisible"
      title="选择资产"
      width="900px"
      :close-on-click-modal="false"
    >
      <div class="asset-selector">
        <div class="search-bar">
          <el-input
            v-model="assetSearch.keyword"
            placeholder="搜索资产名称/编码"
            style="width: 200px"
            @keyup.enter="searchAssets"
          />
          <el-button type="primary" @click="searchAssets">搜索</el-button>
        </div>

        <el-table
          v-loading="assetLoading"
          :data="availableAssets"
          style="width: 100%"
          @selection-change="handleAssetSelectionChange"
          height="350px"
          ref="assetTableRef"
          row-key="id"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="code" label="资产编码" width="120" />
          <el-table-column prop="name" label="资产名称" />
          <el-table-column prop="type" label="类型" width="120">
            <template #default="{ row }">
              <el-tag>{{ getAssetTypeText(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="department" label="所属部门" width="120" />
        </el-table>

        <div class="pagination-container">
          <el-pagination
            v-model:current-page="assetSearch.page"
            v-model:page-size="assetSearch.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="assetTotal"
            @size-change="handleAssetSizeChange"
            @current-change="handleAssetCurrentChange"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="assetSelectorVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssetSelection">
          确认选择
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="出库详情"
      width="800px"
    >
      <div v-if="currentDetail" class="detail-content">
        <div class="detail-header">
          <div class="detail-item">
            <span class="label">批次号：</span>
            <span class="value">{{ currentDetail.batch_no }}</span>
          </div>
          <div class="detail-item">
            <span class="label">领用人：</span>
            <span class="value">{{ currentDetail.recipient }}</span>
          </div>
          <div class="detail-item">
            <span class="label">所属部门：</span>
            <span class="value">{{ currentDetail.department }}</span>
          </div>
          <div class="detail-item">
            <span class="label">领用日期：</span>
            <span class="value">{{ formatDate(currentDetail.out_date) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">操作人：</span>
            <span class="value">{{ currentDetail.operator_name }}</span>
          </div>
          <div class="detail-item">
            <span class="label">创建时间：</span>
            <span class="value">{{ formatDateTime(currentDetail.created_at) }}</span>
          </div>
          <div class="detail-item" v-if="currentDetail.notes">
            <span class="label">备注：</span>
            <span class="value">{{ currentDetail.notes }}</span>
          </div>
        </div>

        <div class="detail-body">
          <h4>出库资产</h4>
          <el-table :data="currentDetail.items" border style="width: 100%">
            <el-table-column prop="code" label="资产编码" width="120" />
            <el-table-column prop="name" label="资产名称" />
            <el-table-column prop="type" label="类型" width="120">
              <template #default="{ row }">
                <el-tag>{{ getAssetTypeText(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="department" label="所属部门" width="120" />
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import dayjs from 'dayjs';

// 资产类型映射
const assetTypeMap = {
  'accessory': '配件',
  'computer': '电脑',
  'host': '主机',
  'monitor': '显示器'
};

// 列表数据
const loading = ref(false);
const records = ref([]);

// 表单数据
const dialogVisible = ref(false);
const formRef = ref(null);
const form = reactive({
  batch_no: '',
  recipient: '',
  department: '',
  out_date: '',
  notes: '',
  assets: []
});

// 表单校验规则
const rules = {
  recipient: [{ required: true, message: '请输入领用人', trigger: 'blur' }],
  department: [{ required: true, message: '请输入所属部门', trigger: 'blur' }],
  out_date: [{ required: true, message: '请选择领用日期', trigger: 'change' }]
};

// 资产选择相关
const assetSelectorVisible = ref(false);
const assetLoading = ref(false);
const availableAssets = ref([]);
const selectedAssets = ref([]);
const assetTableRef = ref(null);
// 存储所有已选择的资产，以ID为键
const allSelectedAssets = ref(new Map());
const assetSearch = reactive({
  keyword: '',
  page: 1,
  pageSize: 10
});

const assetTotal = ref(0);

// 详情数据
const detailVisible = ref(false);
const currentDetail = ref(null);

// 格式化日期
const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD') : '';
};

// 格式化日期时间
const formatDateTime = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '';
};

// 获取资产类型文本
const getAssetTypeText = (type) => {
  return assetTypeMap[type] || type;
};

// 生成批次号
const generateBatchNo = () => {
  const date = dayjs().format('YYYYMMDD');
  // 使用时间戳和随机数组合确保唯一性
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${date}-${timestamp.toString().slice(-6)}-${random}`;
};

// 显示出库表单
const showStockOutDialog = () => {
  resetForm();
  dialogVisible.value = true;
};

// 重置表单
const resetForm = () => {
  form.batch_no = generateBatchNo();
  form.recipient = '';
  form.department = '';
  form.out_date = dayjs().format('YYYY-MM-DD');
  form.notes = '';
  form.assets = [];

  // 清空资产选择
  allSelectedAssets.value.clear();
  selectedAssets.value = [];
};

// 移除资产
const removeAsset = (index) => {
  form.assets.splice(index, 1);
};

// 显示资产选择器
const showAssetSelector = async () => {
  assetSelectorVisible.value = true;
  // 重置页码到第一页
  assetSearch.page = 1;
  await searchAssets();
};

// 搜索可用资产
const searchAssets = async () => {
  try {
    assetLoading.value = true;
    const response = await axios.get('/api/assets', {
      params: {
        status: 'in_stock',
        code: assetSearch.keyword,  // 使用code参数代替keyword
        page: assetSearch.page,
        pageSize: assetSearch.pageSize
      }
    });

    if (response.data.success) {
      availableAssets.value = response.data.data;
      assetTotal.value = response.data.total || 0;

      // 在设置表格数据后更新选中状态
      nextTick(() => {
        updateSelectionStatus();
      });
    } else {
      availableAssets.value = [];
      assetTotal.value = 0;
      ElMessage.warning(response.data.message || '没有找到可用资产');
    }
  } catch (error) {
    availableAssets.value = [];
    assetTotal.value = 0;
    ElMessage.error('获取资产列表失败');
  } finally {
    assetLoading.value = false;
  }
};

// 处理每页显示数量变化
const handleAssetSizeChange = (size) => {
  assetSearch.pageSize = size;
  searchAssets();
};

// 处理页码变化
const handleAssetCurrentChange = (page) => {
  assetSearch.page = page;
  searchAssets();
};

// 更新表格选中状态
const updateSelectionStatus = () => {
  if (!assetTableRef.value) return;

  // 清除当前选中状态
  assetTableRef.value.clearSelection();

  // 对当前页的每一行资产检查是否在全局选择集合中
  availableAssets.value.forEach(asset => {
    if (allSelectedAssets.value.has(asset.id)) {
      // 使用Element Plus表格的API选中行
      assetTableRef.value.toggleRowSelection(asset, true);
    }
  });
};

// 处理资产选择变化
const handleAssetSelectionChange = (selection) => {
  // 更新当前页面的选择
  selectedAssets.value = selection;

  // 更新全局选择集合
  // 先清除当前页面的资产选择状态
  availableAssets.value.forEach(asset => {
    if (!selection.some(selected => selected.id === asset.id)) {
      allSelectedAssets.value.delete(asset.id);
    }
  });

  // 添加新选择的资产
  selection.forEach(asset => {
    allSelectedAssets.value.set(asset.id, asset);
  });
};

// 确认资产选择
const confirmAssetSelection = () => {
  try {
    // 检查是否有选中的资产
    if (allSelectedAssets.value.size === 0) {
      ElMessage.warning('请至少选择一个资产');
      return;
    }

    // 使用全局选择集合中的所有资产
    const selectedAssetArray = Array.from(allSelectedAssets.value.values());

    // 防止重复添加
    selectedAssetArray.forEach(asset => {
      if (!form.assets.some(item => item.id === asset.id)) {
        // 生成临时资产编码，使用时间戳确保唯一性
        const timestamp = Date.now();
        const tempCode = asset.code || `ASSET-${asset.id}-${timestamp}`;
        form.assets.push({
          ...asset,
          code: tempCode
        });
      }
    });

    // 关闭对话框并清空选择
    assetSelectorVisible.value = false;
    allSelectedAssets.value.clear();
    selectedAssets.value = [];

    // 重新生成批次号，确保唯一性
    form.batch_no = generateBatchNo();
  } catch (error) {
    console.error('确认资产选择时出错:', error);
    ElMessage.error('添加资产失败，请重试');
  }
};

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      if (form.assets.length === 0) {
        ElMessage.warning('请选择要出库的资产');
        return;
      }

      // 检查所有资产是否都有编码
      const hasEmptyCode = form.assets.some(asset => !asset.code);
      if (hasEmptyCode) {
        ElMessage.warning('请为所有资产填写编码');
        return;
      }

      // 提交前重新生成批次号，确保唯一性
      form.batch_no = generateBatchNo();

      try {
        loading.value = true;
        const response = await axios.post('/api/stock-out', {
          batch_no: form.batch_no,
          recipient: form.recipient,
          department: form.department,
          out_date: form.out_date,
          notes: form.notes,
          assets: form.assets
        });

        ElMessage.success('资产出库成功');
        dialogVisible.value = false;
        getRecords();

        // 清空表单数据
        resetForm();
      } catch (error) {
        console.error('资产出库失败:', error);

        // 检查是否是批次号重复错误
        if (error.response && error.response.status === 400 && error.response.data.message.includes('批次号已存在')) {
          // 重新生成批次号并重试
          form.batch_no = generateBatchNo();
          ElMessage.warning('批次号冲突，正在重新提交...');

          // 延迟一秒后重试
          setTimeout(() => {
            submitForm();
          }, 1000);
          return;
        }

        ElMessage.error('资产出库失败');
      } finally {
        loading.value = false;
      }
    }
  });
};

// 获取出库记录列表
const getRecords = async () => {
  try {
    loading.value = true;
    const response = await axios.get('/api/stock-out');
    records.value = response.data.data;
  } catch (error) {
    console.error('获取出库记录失败:', error);
    ElMessage.error('获取出库记录失败');
  } finally {
    loading.value = false;
  }
};

// 查看详情
const viewDetail = async (row) => {
  try {
    const response = await axios.get(`/api/stock-out/${row.id}`);
    currentDetail.value = response.data.data;
    detailVisible.value = true;
  } catch (error) {
    console.error('获取出库详情失败:', error);
    ElMessage.error('获取出库详情失败');
  }
};

// 页面加载时获取数据
onMounted(() => {
  getRecords();
});
</script>

<style scoped>
.stock-out-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.assets-section {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h3 {
  margin: 0;
}

.asset-input {
  display: flex;
  gap: 10px;
  align-items: center;
}

.asset-selector .search-bar {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
}

.asset-selector .pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
}

.detail-content {
  .detail-header {
    margin-bottom: 20px;

    .detail-item {
      margin-bottom: 10px;
      display: flex;

      .label {
        width: 100px;
        color: #606266;
      }

      .value {
        flex: 1;
      }
    }
  }

  .detail-body {
    h4 {
      margin-top: 0;
      margin-bottom: 15px;
    }
  }
}
</style>