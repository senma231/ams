<template>
  <div class="backup-container">
    <div class="header">
      <h2>数据备份管理</h2>
      <el-button type="primary" @click="handleCreateBackup" :loading="loading">
        <el-icon><Plus /></el-icon>创建备份
      </el-button>
    </div>

    <el-card class="backup-list">
      <el-table
        v-loading="loading"
        :data="backups"
        style="width: 100%"
        border
      >
        <el-table-column prop="name" label="备份文件名" min-width="200" />
        <el-table-column prop="size" label="文件大小" width="120">
          <template #default="{ row }">
            {{ formatFileSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="time" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="handleRestore(row)"
              :disabled="loading"
            >
              恢复
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { formatDate } from '@/utils/date';

const loading = ref(false);
const backups = ref([]);

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// 获取备份列表
const fetchBackups = async () => {
  loading.value = true;
  try {
    const response = await axios.get('/api/backup');
    backups.value = response.data.data || [];
  } catch (error) {
    ElMessage.error('获取备份列表失败');
  } finally {
    loading.value = false;
  }
};

// 创建备份
const handleCreateBackup = async () => {
  loading.value = true;
  try {
    await axios.post('/api/backup');
    ElMessage.success('创建备份成功');
    await fetchBackups();
  } catch (error) {
    ElMessage.error('创建备份失败');
  } finally {
    loading.value = false;
  }
};

// 恢复备份
const handleRestore = async (backup) => {
  try {
    await ElMessageBox.confirm(
      '确定要恢复此备份吗？当前数据将被覆盖，此操作不可恢复',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    loading.value = true;
    await axios.post(`/api/backup/${backup.name}/restore`);
    ElMessage.success('恢复备份成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('恢复备份失败');
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchBackups();
});
</script>

<style scoped>
.backup-container {
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

.backup-list {
  margin-bottom: 20px;
}
</style>