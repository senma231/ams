<template>
  <div class="app-container">
    <el-container>
      <el-aside :width="isCollapse ? '64px' : '200px'" class="aside">
        <div class="logo">
          <h1 v-show="!isCollapse">资产管理系统</h1>
          <el-icon class="toggle-button" @click="toggleCollapse">
            <Fold v-if="!isCollapse"/>
            <Expand v-else/>
          </el-icon>
        </div>
        <SideMenu :is-collapse="isCollapse" />
      </el-aside>
      <el-container>
        <el-header class="header">
          <div class="header-left">
            <el-breadcrumb>
              <el-breadcrumb-item>首页</el-breadcrumb-item>
              <el-breadcrumb-item>{{ currentRoute }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <el-dropdown>
              <span class="user-info">
                <el-avatar :size="32" icon="UserFilled" />
                <span class="username">{{ currentUser?.name || currentUser?.username || '未知用户' }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main>
          <router-view></router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { Fold, Expand } from '@element-plus/icons-vue';
import SideMenu from '@/components/SideMenu.vue';
import { useUserStore } from '@/stores/user';
import { ElMessageBox } from 'element-plus';

const isCollapse = ref(false);
const route = useRoute();
const userStore = useUserStore();

const currentUser = computed(() => userStore.currentUser);

const currentRoute = computed(() => {
  const matched = route.matched;
  return matched[matched.length - 1]?.meta?.title || '仪表盘';
});

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
};

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    userStore.logout();
  } catch (error) {
    // 用户取消退出
  }
};
</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100vw;
}

.aside {
  background-color: #304156;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: #2b3a4d;
}

.logo h1 {
  color: #fff;
  font-size: 18px;
  margin: 0;
  white-space: nowrap;
}

.toggle-button {
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.3s;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.username {
  margin-left: 8px;
  font-size: 14px;
  color: var(--text-color);
}

.el-main {
  background-color: var(--background-color);
  padding: 20px;
}

:deep(.el-menu) {
  border-right: none;
  background-color: #304156;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  color: #bfcbd9;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background-color: #263445;
}

:deep(.el-menu-item.is-active) {
  color: #409eff;
  background-color: #263445;
}

:deep(.el-menu-item .el-icon),
:deep(.el-sub-menu__title .el-icon) {
  color: inherit;
}
</style> 