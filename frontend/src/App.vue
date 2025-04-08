<template>
  <el-config-provider :locale="zhCn">
    <router-view v-if="isReady" />
    <div v-else class="loading-container">
      <el-loading :fullscreen="true" />
    </div>
  </el-config-provider>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElConfigProvider, ElLoading } from 'element-plus';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import { useUserStore } from './stores/user';
import { useRouter } from 'vue-router';

const userStore = useUserStore();
const router = useRouter();
const isReady = ref(false);

onMounted(async () => {
  try {
    // 从 localStorage 恢复用户状态
    const token = localStorage.getItem('token');
    
    if (token) {
      userStore.setToken(token);
      try {
        // 验证并刷新用户信息
        await userStore.fetchCurrentUser();
      } catch (error) {
        console.error('获取用户信息失败:', error);
        // 如果获取用户信息失败，清除登录状态并跳转到登录页
        userStore.setToken(null);
        userStore.setUser(null);
        if (router.currentRoute.value.meta.requiresAuth) {
          router.push('/login');
        }
      }
    }
  } catch (error) {
    console.error('恢复用户状态失败:', error);
  } finally {
    isReady.value = true;
  }
});
</script>

<style>
:root {
  --primary-color: #409EFF;
  --success-color: #67C23A;
  --warning-color: #E6A23C;
  --danger-color: #F56C6C;
  --info-color: #909399;
  --text-color: #303133;
  --text-color-secondary: #606266;
  --border-color: #DCDFE6;
  --background-color: #F5F7FA;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji',
    'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
}

#app {
  width: 100%;
  height: 100vh;
}

.loading-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style> 