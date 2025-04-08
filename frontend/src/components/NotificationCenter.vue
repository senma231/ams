<template>
  <div class="notification-center">
    <el-popover
      placement="bottom"
      :width="300"
      trigger="click"
      popper-class="notification-popover"
    >
      <template #reference>
        <el-badge :value="unreadCount" :hidden="unreadCount === 0">
          <el-button :icon="Bell" circle />
        </el-badge>
      </template>

      <div class="notification-header">
        <span>通知中心</span>
        <el-button
          v-if="notifications.length > 0"
          link
          type="primary"
          @click="handleReadAll"
        >
          全部已读
        </el-button>
      </div>

      <el-scrollbar max-height="400px">
        <div v-if="notifications.length === 0" class="no-notification">
          暂无通知
        </div>
        <div v-else class="notification-list">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item"
            :class="{ unread: !notification.read }"
          >
            <div class="notification-content" @click="handleRead(notification)">
              <div class="notification-title">
                {{ notification.title }}
                <el-tag
                  size="small"
                  :type="getNotificationTagType(notification.type)"
                >
                  {{ getNotificationTypeText(notification.type) }}
                </el-tag>
              </div>
              <div class="notification-body">{{ notification.content }}</div>
              <div class="notification-time">
                {{ formatDate(notification.created_at) }}
              </div>
            </div>
            <el-button
              class="delete-btn"
              link
              type="danger"
              @click="handleDelete(notification)"
            >
              删除
            </el-button>
          </div>
        </div>
      </el-scrollbar>
    </el-popover>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Bell } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import { formatDate } from '@/utils/date';

const notifications = ref([]);
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length);

// 获取通知类型标签样式
const getNotificationTagType = (type) => {
  const types = {
    overdue: 'danger',
    due_soon: 'warning',
    low_stock: 'info'
  };
  return types[type] || 'info';
};

// 获取通知类型文本
const getNotificationTypeText = (type) => {
  const texts = {
    overdue: '已逾期',
    due_soon: '即将到期',
    low_stock: '库存预警'
  };
  return texts[type] || '通知';
};

// 获取通知列表
const fetchNotifications = async () => {
  try {
    const response = await axios.get('/api/notifications');
    notifications.value = response.data;
  } catch (error) {
    ElMessage.error('获取通知失败');
  }
};

// 标记通知为已读
const handleRead = async (notification) => {
  if (notification.read) return;
  
  try {
    await axios.put(`/api/notifications/${notification.id}/read`);
    notification.read = true;
  } catch (error) {
    ElMessage.error('标记通知已读失败');
  }
};

// 标记所有通知为已读
const handleReadAll = async () => {
  try {
    await axios.put('/api/notifications/read-all');
    notifications.value.forEach(notification => {
      notification.read = true;
    });
    ElMessage.success('已将所有通知标记为已读');
  } catch (error) {
    ElMessage.error('标记所有通知已读失败');
  }
};

// 删除通知
const handleDelete = async (notification) => {
  try {
    await axios.delete(`/api/notifications/${notification.id}`);
    notifications.value = notifications.value.filter(n => n.id !== notification.id);
    ElMessage.success('删除通知成功');
  } catch (error) {
    ElMessage.error('删除通知失败');
  }
};

// 初始化
onMounted(() => {
  fetchNotifications();
});
</script>

<style scoped>
.notification-center {
  display: inline-block;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.notification-list {
  padding: 0 10px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-content {
  flex: 1;
  cursor: pointer;
}

.notification-title {
  font-weight: bold;
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-body {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.notification-time {
  font-size: 12px;
  color: #999;
}

.unread {
  background-color: #f5f7fa;
}

.no-notification {
  text-align: center;
  padding: 20px;
  color: #999;
}

.delete-btn {
  margin-left: 10px;
  padding-top: 0;
}

:deep(.el-badge__content) {
  z-index: 9;
}
</style> 