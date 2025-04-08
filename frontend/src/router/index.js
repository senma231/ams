import { createRouter, createWebHistory } from 'vue-router';
import StockInView from '../views/StockInView.vue'
import StockOutView from '../views/StockOutView.vue'
import { useUserStore } from '../stores/user';
import { ElMessage } from 'element-plus';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('../views/LayoutView.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('../views/DashboardView.vue'),
          meta: {
            requiresAuth: true,
            title: '仪表盘',
            icon: 'el-icon-menu'
          }
        },
        {
          path: 'assets',
          name: 'Assets',
          component: () => import('../views/AssetsView.vue'),
          meta: {
            requiresAuth: true,
            title: '资产管理',
            icon: 'el-icon-document'
          }
        },
        {
          path: 'stock-in',
          name: 'StockIn',
          component: () => import('../views/StockInView.vue'),
          meta: {
            requiresAuth: true,
            title: '入库管理',
            icon: 'el-icon-plus'
          }
        },
        {
          path: 'stock-out',
          name: 'StockOut',
          component: () => import('../views/StockOutView.vue'),
          meta: {
            requiresAuth: true,
            title: '出库管理',
            icon: 'el-icon-minus'
          }
        },
        {
          path: 'reports',
          name: 'Reports',
          component: () => import('../views/ReportsView.vue'),
          meta: {
            requiresAuth: true,
            title: '报表统计',
            icon: 'el-icon-pie-chart'
          }
        },
        {
          path: 'system',
          name: 'System',
          component: () => import('../views/SystemView.vue'),
          meta: {
            title: '系统设置',
            icon: 'el-icon-setting',
            requiresAdmin: true
          },
          redirect: '/system/users',
          children: [
            {
              path: 'users',
              name: 'Users',
              component: () => import('../views/UsersView.vue'),
              meta: {
                title: '用户管理',
                icon: 'el-icon-user',
                requiresAdmin: true
              }
            },
            {
              path: 'backup',
              name: 'Backup',
              component: () => import('../views/BackupView.vue'),
              meta: {
                title: '数据备份',
                icon: 'el-icon-download',
                requiresAdmin: true
              }
            },
            {
              path: 'asset-types',
              name: 'AssetTypes',
              component: () => import('../views/AssetTypesView.vue'),
              meta: {
                title: '资产类型维护',
                icon: 'el-icon-folder',
                requiresAdmin: true
              }
            }
          ]
        }
      ]
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
      meta: {
        title: '登录'
      }
    }
  ]
});

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  // 1. 检查是否是登录页面
  if (to.path === '/login') {
    if (userStore.isLoggedIn) {
      next('/');
    } else {
      next();
    }
    return;
  }

  // 2. 检查认证状态
  if (!userStore.isLoggedIn) {
    next('/login');
    return;
  }

  // 3. 验证 token 有效性和用户信息
  try {
    // 如果没有用户信息，尝试获取
    if (!userStore.currentUser) {
      await userStore.fetchCurrentUser();
    }

    // 检查管理员权限
    if (to.meta.requiresAdmin && !userStore.isAdmin) {
      ElMessage.error('需要管理员权限');
      next(from.path);
      return;
    }

    next();
  } catch (error) {
    console.error('路由守卫错误:', error);
    userStore.logout();
    next('/login');
  }
});

export default router;