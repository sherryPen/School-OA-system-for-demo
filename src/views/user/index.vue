<template>
  <div class="page-container">
    <div class="page-header"><h2>用户管理</h2></div>
    <div class="search-bar">
      <el-input v-model="search.keyword" placeholder="搜索姓名/用户名" style="width:200px;" clearable prefix-icon="Search" />
      <el-select v-model="search.role" placeholder="角色" style="width:140px;" clearable>
        <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.name" />
      </el-select>
      <el-select v-model="search.status" placeholder="状态" style="width:120px;" clearable>
        <el-option label="启用" value="启用" /><el-option label="禁用" value="禁用" />
      </el-select>
      <el-button type="primary">搜索</el-button>
      <el-button type="success" @click="openAddDialog"><el-icon><Plus /></el-icon>新增用户</el-button>
    </div>
    <el-table :data="filteredUsers" stripe>
      <el-table-column type="index" label="#" width="50" />
      <el-table-column prop="username" label="用户名" width="130" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="gender" label="性别" width="60" />
      <el-table-column prop="roleName" label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="row.roleName === '系统管理员' ? 'danger' : row.roleName === '学校领导' ? 'warning' : row.roleName === '教师' ? '' : row.roleName === '学生' ? 'success' : 'info'" size="small">{{ row.roleName }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="deptName" label="部门/班级" width="130" />
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column prop="email" label="邮箱" width="160" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }"><el-tag :type="row.status === '启用' ? 'success' : 'danger'" size="small">{{ row.status }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="openEditDialog(row)">编辑</el-button>
          <el-button :text="true" :type="row.status === '启用' ? 'danger' : 'success'" size="small" @click="toggleStatus(row)">{{ row.status === '启用' ? '禁用' : '启用' }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增用户弹窗 -->
    <el-dialog v-model="addVisible" title="新增用户" width="520px" @close="resetAddForm">
      <el-form :model="addForm" label-width="90px">
        <el-form-item label="用户名" required><el-input v-model="addForm.username" placeholder="请输入用户名" /></el-form-item>
        <el-form-item label="姓名" required><el-input v-model="addForm.name" placeholder="请输入姓名" /></el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="addForm.gender"><el-radio label="男" /><el-radio label="女" /></el-radio-group>
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="addForm.roleName" style="width:100%;" @change="onRoleChange(addForm)">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门/班级" required>
          <el-select v-model="addForm.deptId" style="width:100%;" placeholder="请选择部门/班级" @change="onDeptChange(addForm)">
            <el-option-group label="行政部门">
              <el-option v-for="d in adminDepts" :key="d.id" :label="d.name" :value="d.id" />
            </el-option-group>
            <el-option-group label="教研组">
              <el-option v-for="d in teachDepts" :key="d.id" :label="d.name" :value="d.id" />
            </el-option-group>
            <el-option-group label="班级">
              <el-option v-for="d in classDepts" :key="d.id" :label="d.name" :value="d.id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="手机号"><el-input v-model="addForm.phone" placeholder="请输入手机号" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="addForm.email" placeholder="请输入邮箱" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="addVisible = false">取消</el-button><el-button type="primary" @click="doAdd">确认</el-button></template>
    </el-dialog>

    <!-- 编辑用户弹窗 -->
    <el-dialog v-model="editVisible" title="编辑用户" width="520px">
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="用户名"><el-input :model-value="editForm.username" disabled /></el-form-item>
        <el-form-item label="姓名" required><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="editForm.gender"><el-radio label="男" /><el-radio label="女" /></el-radio-group>
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="editForm.roleName" style="width:100%;" @change="onRoleChange(editForm)">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门/班级" required>
          <el-select v-model="editForm.deptId" style="width:100%;" placeholder="请选择部门/班级" @change="onDeptChange(editForm)">
            <el-option-group label="行政部门">
              <el-option v-for="d in adminDepts" :key="d.id" :label="d.name" :value="d.id" />
            </el-option-group>
            <el-option-group label="教研组">
              <el-option v-for="d in teachDepts" :key="d.id" :label="d.name" :value="d.id" />
            </el-option-group>
            <el-option-group label="班级">
              <el-option v-for="d in classDepts" :key="d.id" :label="d.name" :value="d.id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="手机号"><el-input v-model="editForm.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="editForm.email" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="editVisible = false">取消</el-button><el-button type="primary" @click="doEdit">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { users as _allUsers, roles, departments } from '@/mock/data'
import { ElMessage } from 'element-plus'

const search = reactive({ keyword: '', role: '', status: '' })
const addVisible = ref(false)
const editVisible = ref(false)

// 深拷贝用户列表，使其可编辑
const userList = ref(_allUsers.map(u => ({ ...u })))

const addForm = reactive({ username: '', name: '', gender: '男', roleName: '学生', deptId: null, deptName: '', phone: '', email: '' })
const editForm = reactive({ id: null, username: '', name: '', gender: '男', roleName: '', deptId: null, deptName: '', phone: '', email: '' })

// 部门分类
const adminDepts = departments.filter(d => d.type === '行政部门')
const teachDepts = departments.filter(d => d.type === '教研组')
const classDepts = departments.filter(d => d.type === '班级')

const filteredUsers = computed(() => {
  return userList.value.filter(u => {
    if (search.keyword && !u.name.includes(search.keyword) && !u.username.includes(search.keyword)) return false
    if (search.role && u.roleName !== search.role) return false
    if (search.status && u.status !== search.status) return false
    return true
  })
})

function onRoleChange(form) {
  // 根据角色预选部门
  if (form.roleName === '学生') {
    const firstClass = classDepts[0]
    if (firstClass) { form.deptId = firstClass.id; form.deptName = firstClass.name }
  } else if (form.roleName === '教师') {
    const firstTeach = teachDepts[0]
    if (firstTeach) { form.deptId = firstTeach.id; form.deptName = firstTeach.name }
  } else if (['系统管理员', '学校领导'].includes(form.roleName)) {
    form.deptId = 1; form.deptName = '校领导办公室'
  } else {
    const firstAdmin = adminDepts[0]
    if (firstAdmin) { form.deptId = firstAdmin.id; form.deptName = firstAdmin.name }
  }
}

function onDeptChange(form) {
  const dept = departments.find(d => d.id === form.deptId)
  if (dept) form.deptName = dept.name
}

function openAddDialog() {
  Object.assign(addForm, { username: '', name: '', gender: '男', roleName: '学生', deptId: null, deptName: '', phone: '', email: '' })
  onRoleChange(addForm)
  addVisible.value = true
}

function resetAddForm() {}

function openEditDialog(row) {
  editForm.id = row.id
  editForm.username = row.username
  editForm.name = row.name
  editForm.gender = row.gender
  editForm.roleName = row.roleName
  editForm.deptId = row.deptId
  editForm.deptName = row.deptName
  editForm.phone = row.phone
  editForm.email = row.email
  editVisible.value = true
}

function toggleStatus(row) {
  row.status = row.status === '启用' ? '禁用' : '启用'
  ElMessage.success(`已${row.status}用户 ${row.name}`)
}

function doAdd() {
  if (!addForm.username || !addForm.name) return ElMessage.warning('请填写用户名和姓名')
  if (!addForm.deptId) return ElMessage.warning('请选择部门/班级')
  const newId = Math.max(...userList.value.map(u => u.id)) + 1
  const roleObj = roles.find(r => r.name === addForm.roleName)
  userList.value.push({
    id: newId,
    username: addForm.username,
    password: '123456',
    name: addForm.name,
    gender: addForm.gender,
    roleId: roleObj?.id || 5,
    roleName: addForm.roleName,
    deptId: addForm.deptId,
    deptName: addForm.deptName,
    phone: addForm.phone,
    email: addForm.email,
    avatar: '',
    status: '启用'
  })
  ElMessage.success('用户添加成功')
  addVisible.value = false
}

function doEdit() {
  if (!editForm.name) return ElMessage.warning('请填写姓名')
  const user = userList.value.find(u => u.id === editForm.id)
  if (user) {
    const roleObj = roles.find(r => r.name === editForm.roleName)
    user.name = editForm.name
    user.gender = editForm.gender
    user.roleId = roleObj?.id || user.roleId
    user.roleName = editForm.roleName
    user.deptId = editForm.deptId
    user.deptName = editForm.deptName
    user.phone = editForm.phone
    user.email = editForm.email
  }
  ElMessage.success('用户信息已更新')
  editVisible.value = false
}
</script>
