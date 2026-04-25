<template>
  <div class="page-container">
    <div class="page-header"><h2>个人信息</h2></div>
    <div style="display:grid; grid-template-columns:240px 1fr; gap:28px;">
      <div style="text-align:center;">
        <el-avatar :size="100" style="background:linear-gradient(135deg,#4a6cf7,#6366f1); font-size:40px;">{{ user.name?.charAt(0) }}</el-avatar>
        <h3 style="margin-top:14px; font-size:18px; font-weight:700; color:#1e293b;">{{ user.name }}</h3>
        <el-tag style="margin-top:8px;" effect="plain">{{ user.roleName }}</el-tag>
        <div style="margin-top:8px; font-size:13px; color:#94a3b8;">{{ user.deptName }}</div>
      </div>
      <div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户名">{{ user.username }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ user.name }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ user.gender }}</el-descriptions-item>
          <el-descriptions-item label="角色">{{ user.roleName }}</el-descriptions-item>
          <el-descriptions-item label="部门/班级">{{ user.deptName }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ user.phone }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ user.email }}</el-descriptions-item>
          <el-descriptions-item label="账号状态"><el-tag type="success" effect="plain">{{ user.status }}</el-tag></el-descriptions-item>
        </el-descriptions>
        <div style="margin-top:18px;">
          <el-button type="primary" @click="openEditDialog">编辑信息</el-button>
          <el-button @click="ElMessage.info('Demo系统暂不支持修改密码')">修改密码</el-button>
        </div>
      </div>
    </div>
    <el-dialog v-model="editVisible" title="编辑个人信息" width="480px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="editForm.gender"><el-radio label="男" /><el-radio label="女" /></el-radio-group>
        </el-form-item>
        <el-form-item label="手机号"><el-input v-model="editForm.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="editForm.email" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const user = computed(() => userStore.currentUser || {})
const editVisible = ref(false)
const editForm = reactive({ name: '', gender: '', phone: '', email: '' })

function openEditDialog() {
  // 每次打开时同步最新数据
  editForm.name = user.value.name || ''
  editForm.gender = user.value.gender || '男'
  editForm.phone = user.value.phone || ''
  editForm.email = user.value.email || ''
  editVisible.value = true
}

function saveProfile() {
  userStore.currentUser.name = editForm.name
  userStore.currentUser.gender = editForm.gender
  userStore.currentUser.phone = editForm.phone
  userStore.currentUser.email = editForm.email
  localStorage.setItem('oa_user', JSON.stringify(userStore.currentUser))
  editVisible.value = false
  ElMessage.success('信息已更新')
}
</script>
