<template>
  <div class="users-container">
    <div class="header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>添加用户
      </el-button>
    </div>

    <!-- 用户列表 -->
    <el-card class="users-table">
      <el-table
        v-loading="loading"
        :data="users"
        style="width: 100%"
        border
      >
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'success'">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="branch" label="部门" width="150" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="250">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="handleEdit(row)"
              :disabled="currentUser?.role !== 'admin'"
            >
              编辑
            </el-button>
            <el-button
              link
              type="warning"
              @click="handleResetPassword(row)"
              :disabled="currentUser?.role !== 'admin'"
            >
              重置密码
            </el-button>
            <el-button
              link
              type="danger"
              @click="handleDelete(row)"
              :disabled="currentUser?.role !== 'admin' || row.role === 'admin'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 用户表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="formType === 'add' ? '添加用户' : '编辑用户'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
        style="max-width: 460px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="formType === 'edit'" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="formType === 'add'">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门" prop="branch">
          <el-input v-model="form.branch" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="loading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetPasswordDialogVisible"
      title="重置密码"
      width="500px"
    >
      <el-form
        ref="resetPasswordFormRef"
        :model="resetPasswordForm"
        :rules="resetPasswordRules"
        label-width="100px"
      >
        <el-form-item label="新密码" prop="password">
          <el-input
            v-model="resetPasswordForm.password"
            type="password"
            show-password
            placeholder="请输入新密码"
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="resetPasswordForm.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetPasswordDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="handleResetPasswordSubmit"
            :loading="loading"
          >
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatDate } from '@/utils/date';
import { useRouter } from 'vue-router';

const userStore = useUserStore();
const loading = computed(() => userStore.loading);
const users = computed(() => userStore.users);
const currentUser = computed(() => userStore.currentUser);
const router = useRouter();

const dialogVisible = ref(false);
const formType = ref('add');
const formRef = ref(null);
const form = ref({
  username: '',
  password: '',
  name: '',
  role: 'user',
  branch: ''
});

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于 6 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  branch: [
    { required: true, message: '请输入部门', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ]
};

const resetPasswordDialogVisible = ref(false);
const resetPasswordFormRef = ref(null);
const resetPasswordForm = ref({
  username: '',
  password: '',
  confirmPassword: ''
});

const resetPasswordRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== resetPasswordForm.value.password) {
          callback(new Error('两次输入的密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ]
};

// 初始化
onMounted(async () => {
  if (!currentUser.value?.role === 'admin') {
    ElMessage.error('需要管理员权限');
    router.push('/');
    return;
  }
  try {
    await userStore.fetchUsers();
  } catch (error) {
    ElMessage.error(error.message || '获取用户列表失败');
  }
});

// 添加用户
const handleAdd = () => {
  formType.value = 'add';
  form.value = {
    username: '',
    password: '',
    name: '',
    role: 'user',
    branch: ''
  };
  dialogVisible.value = true;
};

// 编辑用户
const handleEdit = (row) => {
  formType.value = 'edit';
  form.value = {
    username: row.username,
    name: row.name,
    role: row.role,
    branch: row.branch
  };
  dialogVisible.value = true;
};

// 删除用户
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该用户吗？此操作不可恢复',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    const result = await userStore.deleteUser(row.id);
    if (result.success) {
      ElMessage.success('删除成功');
    } else {
      ElMessage.error(result.error);
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      const result = formType.value === 'add'
        ? await userStore.createUser(form.value)
        : await userStore.updateUser(form.value.username, form.value);

      if (result.success) {
        ElMessage.success(formType.value === 'add' ? '添加成功' : '更新成功');
        dialogVisible.value = false;
      } else {
        ElMessage.error(result.error);
      }
    }
  });
};

// 重置密码
const handleResetPassword = (row) => {
  resetPasswordForm.value = {
    username: row.username,
    password: '',
    confirmPassword: ''
  };
  resetPasswordDialogVisible.value = true;
};

// 提交重置密码
const handleResetPasswordSubmit = async () => {
  if (!resetPasswordFormRef.value) return;
  
  try {
    await resetPasswordFormRef.value.validate();
    
    const result = await userStore.updateUser(resetPasswordForm.value.username, {
      password: resetPasswordForm.value.password
    });
    
    if (result.success) {
      ElMessage.success('密码重置成功');
      resetPasswordDialogVisible.value = false;
    } else {
      ElMessage.error(result.error || '密码重置失败');
    }
  } catch (error) {
    console.error('重置密码错误:', error);
    ElMessage.error(error.message || '密码重置失败');
  }
};
</script>

<style scoped>
.users-container {
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

.users-table {
  margin-bottom: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 