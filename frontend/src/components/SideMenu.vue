<template>
  <el-menu
    :default-active="route.path"
    class="side-menu"
    :collapse="isCollapse"
    @select="handleSelect"
  >
    <el-menu-item index="/dashboard">
      <component :is="Odometer" class="menu-icon" />
      <span>仪表盘</span>
    </el-menu-item>

    <el-menu-item index="/assets">
      <component :is="Files" class="menu-icon" />
      <span>资产管理</span>
    </el-menu-item>

    <el-menu-item index="/stock-in">
      <component :is="Plus" class="menu-icon" />
      <span>入库管理</span>
    </el-menu-item>

    <el-menu-item index="/stock-out">
      <component :is="Minus" class="menu-icon" />
      <span>出库管理</span>
    </el-menu-item>

    <el-menu-item index="/reports">
      <component :is="PieChart" class="menu-icon" />
      <span>报表统计</span>
    </el-menu-item>

    <el-sub-menu index="/system" v-if="userStore.currentUser?.role === 'admin'">
      <template #title>
        <component :is="Setting" class="menu-icon" />
        <span>系统设置</span>
      </template>
      <el-menu-item index="/system/users">
        <component :is="User" class="menu-icon" />
        <span>用户管理</span>
      </el-menu-item>
      <el-menu-item index="/system/backup">
        <component :is="Download" class="menu-icon" />
        <span>数据备份</span>
      </el-menu-item>
      <el-menu-item index="/system/asset-types">
        <component :is="Folder" class="menu-icon" />
        <span>资产类型维护</span>
      </el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import {
  Odometer,
  Files,
  Plus,
  Minus,
  PieChart,
  User,
  Download,
  Setting,
  Tools,
  Folder
} from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

defineProps({
  isCollapse: {
    type: Boolean,
    default: false
  }
});

// 处理菜单选择
const handleSelect = (index) => {
  router.push(index);
};
</script>

<style scoped>
.side-menu {
  height: 100vh;
  border-right: none;
  background-color: #304156;
}

.side-menu:not(.el-menu--collapse) {
  width: 200px;
}

:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
  font-size: 14px;
  color: #bfcbd9;
}

:deep(.el-sub-menu__title) {
  height: 50px;
  line-height: 50px;
  font-size: 14px;
  color: #bfcbd9;
}

:deep(.el-menu--inline) {
  background-color: #1f2d3d;
}

:deep(.el-menu--inline .el-menu-item) {
  padding-left: 50px !important;
}

:deep(.el-menu-item.is-active) {
  background-color: #263445;
  color: #409EFF;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background-color: #263445;
}

.menu-icon {
  font-size: 17px;
  margin-right: 5px;
  width: 23px;
  height: 23px;
  color: #bfcbd9;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
}
</style>