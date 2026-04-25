<template>
  <div class="page-container">
    <div class="page-header"><h2>系统管理</h2></div>
    <el-tabs v-model="activeTab">
      <!-- 系统参数 -->
      <el-tab-pane label="系统参数" name="params">
        <el-table :data="paramList" stripe>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="name" label="参数名称" width="180" />
          <el-table-column prop="value" label="参数值" min-width="200">
            <template #default="{ row }">
              <span v-if="row._editing">
                <el-date-picker v-if="row.name.includes('日期')" v-model="row._editValue" style="width:200px;" value-format="YYYY-MM-DD" />
                <el-input v-else v-model="row._editValue" style="width:200px;" />
              </span>
              <span v-else>{{ row.value }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="desc" label="说明" width="200" />
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <template v-if="row._editing">
                <el-button text type="success" size="small" @click="saveParam(row)">保存</el-button>
                <el-button text size="small" @click="cancelEditParam(row)">取消</el-button>
              </template>
              <el-button v-else text type="primary" size="small" @click="startEditParam(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 数据字典 -->
      <el-tab-pane label="数据字典" name="dict">
        <div class="search-bar">
          <el-select v-model="dictType" placeholder="筛选字典类型" style="width:200px;" clearable>
            <el-option v-for="t in dictTypes" :key="t" :label="t" :value="t" />
          </el-select>
          <el-button type="primary" @click="openDictDialog(null)"><el-icon><Plus /></el-icon>新增字典</el-button>
        </div>
        <el-table :data="filteredList" stripe>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="type" label="字典类型" width="160" />
          <el-table-column prop="value" label="字典值" width="100" />
          <el-table-column prop="label" label="字典标签" width="140" />
          <el-table-column prop="sort" label="排序" width="80" />
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="openDictDialog(row)">编辑</el-button>
              <el-button text type="danger" size="small" @click="deleteDict(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 操作日志 -->
      <el-tab-pane label="操作日志" name="logs">
        <div class="search-bar">
          <el-input v-model="logSearch.keyword" placeholder="搜索操作内容" style="width:240px;" clearable prefix-icon="Search" />
          <el-select v-model="logSearch.module" placeholder="操作模块" style="width:160px;" clearable>
            <el-option v-for="m in logModules" :key="m" :label="m" :value="m" />
          </el-select>
          <el-date-picker v-model="logSearch.dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" style="width:260px;" value-format="YYYY-MM-DD" />
        </div>
        <el-table :data="filteredLogs" stripe>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="operator" label="操作用户" width="100" />
          <el-table-column prop="module" label="操作模块" width="120" />
          <el-table-column prop="action" label="操作内容" min-width="250" show-overflow-tooltip />
          <el-table-column prop="time" label="操作时间" width="160" sortable />
          <el-table-column prop="ip" label="IP地址" width="140" />
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 数据字典编辑弹窗 -->
    <el-dialog v-model="dictDialogVisible" :title="dictForm.id ? '编辑字典' : '新增字典'" width="460px">
      <el-form :model="dictForm" label-width="80px">
        <el-form-item label="字典类型" required><el-input v-model="dictForm.type" /></el-form-item>
        <el-form-item label="字典值" required><el-input v-model="dictForm.value" /></el-form-item>
        <el-form-item label="字典标签" required><el-input v-model="dictForm.label" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="dictForm.sort" :min="1" style="width:100%;" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dictDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDict">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { systemParams as _systemParams, dataDicts as _dataDicts, operationLogs } from '@/mock/data'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('params')
const dictType = ref('')
const logSearch = reactive({ keyword: '', module: '', dateRange: null })
const dictDialogVisible = ref(false)
const dictForm = reactive({ id: null, type: '', value: '', label: '', sort: 1 })

// 系统参数 - 深拷贝并添加编辑状态
const paramList = ref(_systemParams.map(p => ({ ...p, _editing: false, _editValue: '' })))

function startEditParam(row) {
  row._editValue = row.value
  row._editing = true
}

function cancelEditParam(row) {
  row._editing = false
}

function saveParam(row) {
  row.value = row._editValue
  row._editing = false
  ElMessage.success(`参数"${row.name}"已更新`)
}

// 数据字典 - 深拷贝可编辑
const dictList = ref(_dataDicts.map(d => ({ ...d })))
const dictTypes = computed(() => [...new Set(dictList.value.map(d => d.type))])
const filteredList = computed(() => {
  if (!dictType.value) return dictList.value
  return dictList.value.filter(d => d.type === dictType.value)
})

function openDictDialog(row) {
  if (row) {
    dictForm.id = row.id
    dictForm.type = row.type
    dictForm.value = row.value
    dictForm.label = row.label
    dictForm.sort = row.sort
  } else {
    dictForm.id = null
    dictForm.type = ''
    dictForm.value = ''
    dictForm.label = ''
    dictForm.sort = dictList.value.length + 1
  }
  dictDialogVisible.value = true
}

function saveDict() {
  if (!dictForm.type || !dictForm.value || !dictForm.label) return ElMessage.warning('请填写完整信息')
  if (dictForm.id) {
    const item = dictList.value.find(d => d.id === dictForm.id)
    if (item) {
      item.type = dictForm.type
      item.value = dictForm.value
      item.label = dictForm.label
      item.sort = dictForm.sort
    }
    ElMessage.success('字典已更新')
  } else {
    const newId = Math.max(...dictList.value.map(d => d.id)) + 1
    dictList.value.push({ id: newId, type: dictForm.type, value: dictForm.value, label: dictForm.label, sort: dictForm.sort })
    ElMessage.success('字典已添加')
  }
  dictDialogVisible.value = false
}

function deleteDict(row) {
  ElMessageBox.confirm(`确定删除字典项"${row.label}"？`, '提示', { type: 'warning' }).then(() => {
    const idx = dictList.value.findIndex(d => d.id === row.id)
    if (idx > -1) dictList.value.splice(idx, 1)
    ElMessage.success('已删除')
  }).catch(() => {})
}

// 操作日志
const logModules = [...new Set(operationLogs.map(l => l.module))]
const filteredLogs = computed(() => {
  return operationLogs.filter(l => {
    if (logSearch.keyword && !l.action.includes(logSearch.keyword)) return false
    if (logSearch.module && l.module !== logSearch.module) return false
    if (logSearch.dateRange && logSearch.dateRange.length === 2) {
      const logDate = l.time.split(' ')[0]
      if (logDate < logSearch.dateRange[0] || logDate > logSearch.dateRange[1]) return false
    }
    return true
  }).sort((a, b) => b.time.localeCompare(a.time))
})
</script>
