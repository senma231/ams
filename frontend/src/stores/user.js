import { defineStore } from 'pinia';
import axios from 'axios';
import router from '@/router';

export const useUserStore = defineStore('user', {
  state: () => ({
    loading: false,
    error: null,
    users: [],
    currentUser: JSON.parse(localStorage.getItem('currentUser') || 'null'),
    total: 0,
    pageSize: 10,
    currentPage: 1,
    token: localStorage.getItem('token') || ''
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.currentUser?.role === 'admin'
  },

  actions: {
    setToken(token) {
      this.token = token;
      if (token) {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    },

    setUser(user) {
      this.currentUser = user;
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        localStorage.removeItem('currentUser');
      }
    },

    // 登录
    async login(username, password) {
      try {
        const response = await axios.post('/api/auth/login', {
          username,
          password
        });
        
        if (response.data.success) {
          const { token, user } = response.data.data;
          this.setToken(token);
          this.setUser(user);
          return response.data;
        } else {
          throw new Error(response.data.message || '登录失败');
        }
      } catch (error) {
        throw error.response?.data || error;
      }
    },

    // 登出
    logout() {
      // 1. 清除 store 中的所有状态
      this.$reset(); // 重置所有 state 到初始值

      // 2. 清除 axios 认证头
      delete axios.defaults.headers.common['Authorization'];
      
      // 3. 清除本地存储
      localStorage.clear();
      sessionStorage.clear();
      
      // 4. 强制跳转到登录页面并刷新整个应用
      const baseUrl = window.location.origin;
      window.location.href = `${baseUrl}/login`;
      
      // 5. 阻止后续操作
      throw new Error('Unauthorized');
    },

    // 获取用户列表
    async fetchUsers() {
      this.loading = true;
      try {
        const response = await axios.get('/api/users');
        if (response.data.success) {
          this.users = response.data.data;
        } else {
          throw new Error(response.data.message || '获取用户列表失败');
        }
      } catch (error) {
        this.error = '获取用户列表失败';
        console.error('获取用户列表错误:', error);
      } finally {
        this.loading = false;
      }
    },

    // 获取当前用户信息
    async fetchCurrentUser() {
      try {
        const response = await axios.get('/api/users/current');
        if (response.data.success) {
          const user = response.data.data;
          this.setUser(user);
          return true;
        } else {
          throw new Error(response.data.message || '获取用户信息失败');
        }
      } catch (error) {
        console.error('获取当前用户信息错误:', error);
        // 如果是 401 错误，说明 token 已失效
        if (error.response?.status === 401) {
          this.logout();
        }
        throw error;
      }
    },

    // 创建用户
    async createUser(userData) {
      this.loading = true;
      try {
        await axios.post('/api/users', userData);
        await this.fetchUsers();
        return { success: true };
      } catch (error) {
        this.error = '创建用户失败';
        console.error('创建用户错误:', error);
        return { success: false, error: error.response?.data?.message || '创建用户失败' };
      } finally {
        this.loading = false;
      }
    },

    // 更新用户
    async updateUser(username, userData) {
      this.loading = true;
      try {
        await axios.put(`/api/users/${username}`, userData);
        await this.fetchUsers();
        return { success: true };
      } catch (error) {
        this.error = '更新用户失败';
        console.error('更新用户错误:', error);
        return { success: false, error: error.response?.data?.message || '更新用户失败' };
      } finally {
        this.loading = false;
      }
    },

    // 删除用户
    async deleteUser(userId) {
      this.loading = true;
      try {
        await axios.delete(`/api/users/${userId}`);
        await this.fetchUsers();
        return { success: true };
      } catch (error) {
        this.error = '删除用户失败';
        console.error('删除用户错误:', error);
        return { success: false, error: error.response?.data?.message || '删除用户失败' };
      } finally {
        this.loading = false;
      }
    },

    // 更新个人信息
    async updateProfile(profileData) {
      try {
        const response = await axios.put('/api/users/profile', profileData);
        this.setUser(response.data);
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    },

    // 更改密码
    async changePassword(oldPassword, newPassword) {
      try {
        const response = await axios.put('/api/users/password', {
          oldPassword,
          newPassword
        });
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    }
  }
}); 