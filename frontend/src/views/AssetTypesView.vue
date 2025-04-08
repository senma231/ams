<template>
  <div class="asset-types-container">
    <div class="header">
      <h2>资产类型维护</h2>
      <el-button type="primary" @click="handleAddType">
        <el-icon><Plus /></el-icon>新增类型
      </el-button>
    </div>

    <el-card class="asset-types-list">
      <el-table
        v-loading="loading"
        :data="assetTypes"
        style="width: 100%"
        border
      >
        <el-table-column prop="name" label="类型名称" min-width="150" />
        <el-table-column prop="code" label="类型编码" width="150" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="handleEdit(row)"
              :disabled="loading"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              @click="handleDelete(row)"
              :disabled="loading"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑资产类型对话框 -->
    <el-dialog
      :title="isEdit ? '编辑资产类型' : '新增资产类型'"
      v-model="dialogVisible"
      width="500px"
    >
      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-width="100px"
        @submit.prevent
      >
        <el-form-item label="类型名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入类型名称" />
        </el-form-item>
        <el-form-item label="类型编码" prop="code" v-if="!isEdit">
          <el-input v-model="form.code" placeholder="请输入类型编码" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            placeholder="请输入描述"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import axios from 'axios';
import { formatDate } from '@/utils/date';

// 状态
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const assetTypes = ref([]);
const formRef = ref(null);

// 表单数据
const form = reactive({
  id: null,
  name: '',
  code: '',
  description: ''
});

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入类型名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入类型编码', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' },
    { pattern: /^[a-z0-9_]+$/, message: '只能包含小写字母、数字和下划线', trigger: 'blur' }
  ]
};

// 获取资产类型列表
const fetchAssetTypes = async () => {
  loading.value = true;
  try {
    console.log('开始获取资产类型列表...');
    const response = await axios.get('/api/asset-types');
    console.log('获取资产类型列表成功:', response.data);
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      assetTypes.value = response.data.data;
    } else {
      console.error('返回数据格式不正确:', response.data);
      assetTypes.value = [];
      ElMessage.warning('没有找到资产类型数据');
    }
  } catch (error) {
    console.error('获取资产类型列表失败:', error);
    assetTypes.value = [];
    ElMessage.error('获取资产类型列表失败');
  } finally {
    loading.value = false;
  }
};

// 新增资产类型
const handleAddType = () => {
  isEdit.value = false;
  resetForm();
  dialogVisible.value = true;
};

// 编辑资产类型
const handleEdit = (row) => {
  isEdit.value = true;
  form.id = row.id;
  form.name = row.name;
  form.code = row.code;
  form.description = row.description || '';
  dialogVisible.value = true;
};

// 删除资产类型
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此资产类型吗？如果已有资产使用此类型，将无法删除。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    loading.value = true;
    await axios.delete(`/api/asset-types/${row.id}`);
    ElMessage.success('删除成功');
    await fetchAssetTypes();
  } catch (error) {
    if (error !== 'cancel') {
      if (error.response && error.response.data && error.response.data.message) {
        ElMessage.error(error.response.data.message);
      } else {
        ElMessage.error('删除失败');
      }
      console.error(error);
    }
  } finally {
    loading.value = false;
  }
};

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      if (isEdit.value) {
        // 更新资产类型
        await axios.put(`/api/asset-types/${form.id}`, {
          name: form.name,
          description: form.description
        });
        ElMessage.success('更新成功');
      } else {
        // 创建资产类型
        await axios.post('/api/asset-types', {
          name: form.name,
          code: form.code,
          description: form.description
        });
        ElMessage.success('创建成功');
      }
      dialogVisible.value = false;
      await fetchAssetTypes();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        ElMessage.error(error.response.data.message);
      } else {
        ElMessage.error(isEdit.value ? '更新失败' : '创建失败');
      }
      console.error(error);
    } finally {
      submitting.value = false;
    }
  });
};

// 重置表单
const resetForm = () => {
  form.id = null;
  form.name = '';
  form.code = '';
  form.description = '';
  if (formRef.value) {
    formRef.value.resetFields();
  }
};

// 页面加载时获取资产类型列表
onMounted(async () => {
  try {
    console.log('资产类型页面加载...');
    await fetchAssetTypes();
    console.log('资产类型页面加载完成');
  } catch (error) {
    console.error('资产类型页面加载失败:', error);
  }
});
</script>

<style scoped>
.asset-types-container {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
}

.asset-types-list {
  margin-bottom: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
