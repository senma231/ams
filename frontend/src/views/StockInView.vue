<template>
  <div class="page-container">
    <div class="card-container">
      <div class="table-operations">
        <h2>资产入库管理</h2>
        <el-button type="primary" @click="showStockInDialog">新增入库</el-button>
      </div>

      <!-- 入库记录列表 -->
      <el-table v-loading="loading" :data="records" style="width: 100%" :fit="true">
        <el-table-column prop="batch_no" label="批次号" min-width="120" />
        <el-table-column prop="type" label="入库类型" min-width="100">
          <template #default="{ row }">
            <el-tag>{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="purchase_date" label="采购日期" min-width="100">
          <template #default="{ row }">
            {{ formatDate(row.purchase_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="supplier" label="供应商" min-width="120" />
        <el-table-column prop="total_amount" label="总金额" min-width="100">
          <template #default="{ row }">
            ¥{{ row.total_amount.toFixed(2) }}
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
    </div>

    <!-- 入库表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="资产入库"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
        class="stock-in-form"
      >
        <el-form-item label="批次号" prop="batch_no">
          <el-input v-model="formData.batch_no" placeholder="请输入批次号" />
        </el-form-item>
        <el-form-item label="入库类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择入库类型" style="width: 100%">
            <el-option label="采购入库" value="purchase" />
            <el-option label="捐赠入库" value="donation" />
            <el-option label="其他入库" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="采购日期" prop="purchase_date">
          <el-date-picker
            v-model="formData.purchase_date"
            type="date"
            placeholder="请选择采购日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="供应商" prop="supplier">
          <el-input v-model="formData.supplier" placeholder="请输入供应商" />
        </el-form-item>
        <el-form-item label="备注" prop="notes">
          <el-input
            v-model="formData.notes"
            type="textarea"
            placeholder="请输入备注信息"
          />
        </el-form-item>

        <!-- 入库明细 -->
        <div class="stock-in-items">
          <div class="items-header">
            <h3>入库明细</h3>
            <el-button type="primary" link @click="addAssetRow">
              添加明细
            </el-button>
          </div>
          <div
            v-for="(asset, index) in formData.assets"
            :key="index"
            class="item-container"
          >
            <el-divider>明细 #{{ index + 1 }}</el-divider>
            <div class="item-form">
              <el-form-item
                :prop="'assets.' + index + '.name'"
                :rules="rules['assets.*.name']"
                label="资产名称"
              >
                <el-input v-model="asset.name" placeholder="请输入资产名称" />
              </el-form-item>

              <el-form-item
                :prop="'assets.' + index + '.type'"
                :rules="rules['assets.*.type']"
                label="资产类型"
              >
                <el-select v-model="asset.type" placeholder="请选择资产类型" style="width: 100%">
                  <el-option
                    v-for="type in assetTypes"
                    :key="type.value"
                    :label="type.label"
                    :value="type.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item
                :prop="'assets.' + index + '.department'"
                :rules="rules['assets.*.department']"
                label="所属部门"
              >
                <el-input v-model="asset.department" placeholder="请输入所属部门" />
              </el-form-item>
              <el-form-item
                :prop="'assets.' + index + '.quantity'"
                :rules="rules['assets.*.quantity']"
                label="数量"
              >
                <el-input-number v-model="asset.quantity" :min="1" :precision="0" style="width: 100%" />
              </el-form-item>
              <el-form-item
                :prop="'assets.' + index + '.unit_price'"
                :rules="rules['assets.*.unit_price']"
                label="单价"
              >
                <el-input-number v-model="asset.unit_price" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
              <el-form-item
                :prop="'assets.' + index + '.description'"
                label="描述"
              >
                <el-input
                  v-model="asset.description"
                  type="textarea"
                  placeholder="请输入资产描述"
                />
              </el-form-item>
              <div class="item-actions">
                <el-button type="danger" link @click="removeAssetRow(index)">
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">
            确认入库
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="入库详情"
      width="800px"
    >
      <div v-if="currentDetail" class="detail-container">
        <div class="detail-header">
          <div class="detail-item">
            <span class="label">批次号：</span>
            <span class="value">{{ currentDetail.batch_no }}</span>
          </div>
          <div class="detail-item">
            <span class="label">入库类型：</span>
            <span class="value">
              <el-tag>{{ getTypeText(currentDetail.type) }}</el-tag>
            </span>
          </div>
          <div class="detail-item">
            <span class="label">采购日期：</span>
            <span class="value">{{ formatDate(currentDetail.purchase_date) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">供应商：</span>
            <span class="value">{{ currentDetail.supplier }}</span>
          </div>
          <div class="detail-item">
            <span class="label">总金额：</span>
            <span class="value">¥{{ currentDetail.total_amount.toFixed(2) }}</span>
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

        <el-divider>入库明细</el-divider>

        <el-table :data="currentDetail.items" border style="width: 100%">
          <el-table-column prop="name" label="资产名称" />
          <el-table-column prop="type" label="类型" width="120">
            <template #default="{ row }">
              <el-tag>{{ getAssetTypeText(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="department" label="所属部门" width="120" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unit_price" label="单价" width="120">
            <template #default="{ row }">
              ¥{{ row.unit_price.toFixed(2) }}
            </template>
          </el-table-column>

          <el-table-column prop="description" label="描述" show-overflow-tooltip />
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAssetTypeStore } from '@/stores/assetType';

// 列表数据
const loading = ref(false);
const records = ref([]);

// 资产类型存储
const assetTypeStore = useAssetTypeStore();

// 资产类型选项
const assetTypes = computed(() => {
  return assetTypeStore.assetTypes.map(type => ({
    label: type.name,
    value: type.code
  }));
});
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

// 表单数据
const dialogVisible = ref(false);
const formRef = ref(null);
const formData = reactive({
  batch_no: '',
  type: '',
  purchase_date: '',
  supplier: '',
  notes: '',
  assets: [{
    name: '',
    type: '',
    department: '',
    quantity: 1,
    unit_price: 0,
    description: ''
  }]
});

// 表单验证规则
const rules = {
  batch_no: [
    { required: true, message: '请输入批次号', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择入库类型', trigger: 'change' }
  ],
  purchase_date: [
    { required: true, message: '请选择采购日期', trigger: 'change' }
  ],
  supplier: [
    { required: true, message: '请输入供应商', trigger: 'blur' }
  ],
  'assets.*.name': [
    { required: true, message: '请输入资产名称', trigger: 'blur' }
  ],
  'assets.*.type': [
    { required: true, message: '请选择资产类型', trigger: 'change' }
  ],
  'assets.*.department': [
    { required: true, message: '请输入所属部门', trigger: 'blur' }
  ],
  'assets.*.quantity': [
    { required: true, message: '请输入数量', trigger: 'blur' },
    { type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' }
  ],
  'assets.*.unit_price': [
    { required: true, message: '请输入单价', trigger: 'blur' },
    { type: 'number', min: 0, message: '单价必须大于等于0', trigger: 'blur' }
  ]
};

// 详情数据
const detailVisible = ref(false);
const currentDetail = ref(null);

// 入库类型映射
const typeMap = {
  'purchase': '采购入库',
  'donation': '捐赠入库',
  'other': '其他入库'
};


// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD');
};

// 格式化日期时间
const formatDateTime = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

// 获取类型文本
const getTypeText = (type) => {
  return typeMap[type] || type;
};

// 获取资产类型文本
const getAssetTypeText = (type) => {
  const found = assetTypeStore.assetTypes.find(t => t.code === type);
  return found ? found.name : type;
};

// 计算总金额
const totalAmount = computed(() => {
  return formData.assets.reduce((sum, asset) => {
    return sum + (asset.quantity * asset.unit_price);
  }, 0);
});

// 获取入库记录列表
const fetchRecords = async () => {
  try {
    loading.value = true;
    console.log('获取入库记录列表...');
    const response = await axios.get('/api/stock-in', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value
      }
    });
    console.log('获取到的数据:', response.data);
    records.value = response.data.data;
    total.value = response.data.total || response.data.data.length;
  } catch (error) {
    console.error('获取入库记录失败:', error);
    ElMessage.error('获取入库记录失败');
  } finally {
    loading.value = false;
  }
};

// 生成入库批次号
const generateBatchNo = () => {
  const date = dayjs().format('YYMMDD');
  // 获取当天的序号，从001开始
  // 实际应用中应该从数据库查询当天最大序号
  // 这里简化处理，使用随机数
  const sequence = Math.floor(Math.random() * 999) + 1;
  const sequenceStr = sequence.toString().padStart(3, '0');
  return `IN-${date}${sequenceStr}`;
};

// 显示入库表单
const showStockInDialog = () => {
  formData.batch_no = generateBatchNo();
  formData.type = 'purchase';
  formData.purchase_date = dayjs().format('YYYY-MM-DD');
  formData.supplier = '';
  formData.notes = '';
  formData.assets = [{
    name: '',
    type: '',
    department: '',
    quantity: 1,
    unit_price: 0,
    description: ''
  }];
  dialogVisible.value = true;
};

// 添加资产行
const addAssetRow = () => {
  formData.assets.push({
    name: '',
    type: '',
    department: '',
    quantity: 1,
    unit_price: 0,
    description: ''
  });
};

// 删除资产行
const removeAssetRow = (index) => {
  if (formData.assets.length > 1) {
    formData.assets.splice(index, 1);
  }
};

// 提交入库
const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        // 构造入库数据
        const stockInData = {
          batch_no: formData.batch_no,
          type: formData.type,
          supplier: formData.supplier,
          in_date: formData.purchase_date,
          notes: formData.notes,
          assets: formData.assets.map(asset => ({
            name: asset.name,
            type: asset.type,
            department: asset.department,
            quantity: asset.quantity,
            unit_price: asset.unit_price,
            description: asset.description
          }))
        };

        const response = await axios.post('/api/stock-in', stockInData);

        if (response.data.success) {
          ElMessage.success('入库成功');
          // 重置表单
          resetForm();
          // 关闭对话框
          dialogVisible.value = false;
          // 刷新列表
          fetchRecords();
        } else {
          throw new Error(response.data.message || '入库失败');
        }
      } catch (error) {
        console.error('入库失败:', error);
        ElMessage.error(error.message || '入库失败');
      } finally {
        loading.value = false;
      }
    }
  });
};

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
    formData.assets = [{
      name: '',
      type: '',
      department: '',
      quantity: 1,
      unit_price: 0,
      description: ''
    }];
  }
};

// 查看详情
const viewDetail = async (row) => {
  try {
    console.log('查看详情，行数据:', row);
    const response = await axios.get(`/api/stock-in/${row.id}`);
    console.log('API返回数据:', response.data);

    // 确保数据结构完整
    currentDetail.value = {
      id: response.data.data.id,
      batch_no: response.data.data.batch_no || '',
      type: response.data.data.type || '',
      purchase_date: response.data.data.purchase_date || '',
      supplier: response.data.data.supplier || '',
      total_amount: Number(response.data.data.total_amount || 0),
      operator_name: response.data.data.operator_name || '',
      created_at: response.data.data.created_at || '',
      notes: response.data.data.notes || '',
      items: Array.isArray(response.data.data.items) ? response.data.data.items.map(item => ({
        ...item,
        unit_price: Number(item.unit_price || 0),
        quantity: Number(item.quantity || 0),
        warranty_period: Number(item.warranty_period || 0)
      })) : []
    };

    console.log('处理后的详情数据:', currentDetail.value);
    detailVisible.value = true;
  } catch (error) {
    console.error('获取入库详情失败:', error);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    }
    ElMessage.error(`获取入库详情失败: ${error.message || '未知错误'}`);
  }
};

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val;
  fetchRecords();
};

const handleCurrentChange = (val) => {
  currentPage.value = val;
  fetchRecords();
};

// 初始化
onMounted(async () => {
  await assetTypeStore.fetchAssetTypes();
  fetchRecords();
});
</script>

<style scoped>
.stock-in-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 20px;
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
}

.item-container {
  margin-bottom: 20px;
}

.item-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.item-actions {
  grid-column: span 2;
  text-align: right;
}

.detail-container {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-header {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  align-items: center;
}

.detail-item .label {
  color: #606266;
  margin-right: 10px;
}

.detail-item .value {
  color: #303133;
  font-weight: 500;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>