<template>
  <div class="page-container">
    <div class="page-header"><h2>发起申请</h2></div>
    <div style="max-width:640px;">
      <el-form :model="form" label-width="100px">
        <el-form-item label="申请类型" required>
          <el-select v-model="form.type" placeholder="请选择申请类型" style="width:100%;" @change="onTypeChange">
            <el-option v-for="t in workflowTemplates" :key="t.id" :label="t.name" :value="t.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请原因" required>
          <el-input v-model="form.reason" type="textarea" :rows="4" placeholder="请详细描述申请原因" />
        </el-form-item>
        <template v-if="form.type === '请假申请'">
          <el-form-item label="开始日期"><el-date-picker v-model="form.startDate" style="width:100%;" value-format="YYYY-MM-DD" placeholder="选择开始日期" /></el-form-item>
          <el-form-item label="结束日期"><el-date-picker v-model="form.endDate" style="width:100%;" value-format="YYYY-MM-DD" placeholder="选择结束日期" /></el-form-item>
        </template>
        <template v-if="form.type === '出差申请'">
          <el-form-item label="开始日期"><el-date-picker v-model="form.startDate" style="width:100%;" value-format="YYYY-MM-DD" placeholder="选择出发日期" /></el-form-item>
          <el-form-item label="结束日期"><el-date-picker v-model="form.endDate" style="width:100%;" value-format="YYYY-MM-DD" placeholder="选择返回日期" /></el-form-item>
        </template>
        <template v-if="['采购申请', '报销申请'].includes(form.type)">
          <el-form-item label="金额（元）"><el-input-number v-model="form.amount" :min="0" :precision="2" style="width:100%;" /></el-form-item>
        </template>
        <template v-if="form.type === '会议室预约'">
          <el-form-item label="会议室">
            <el-select v-model="form.meetingRoom" style="width:100%;" placeholder="选择会议室">
              <el-option v-for="r in meetingRooms" :key="r.id" :label="`${r.name}（${r.location}，${r.capacity}人）`" :value="r.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="会议日期"><el-date-picker v-model="form.meetingDate" style="width:100%;" value-format="YYYY-MM-DD" placeholder="选择会议日期" /></el-form-item>
        </template>
        <el-form-item v-if="form.type" label="审批流程">
          <div style="padding:12px; background:#f8fafc; border-radius:10px; border:1px solid #e8ecf1;">
            <el-steps :active="0" simple>
              <el-step v-for="(node, idx) in currentNodes" :key="idx" :title="node" />
            </el-steps>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="doSubmit">提交申请</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { workflowTemplates, meetingRooms, workflowRecords } from '@/mock/data'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const form = reactive({ type: '', reason: '', startDate: '', endDate: '', amount: 0, meetingRoom: '', meetingDate: '' })

const currentNodes = computed(() => {
  const t = workflowTemplates.find(t => t.name === form.type)
  return t ? t.nodes : []
})

function onTypeChange() {}

function doSubmit() {
  if (!form.type) return ElMessage.warning('请选择申请类型')
  if (!form.reason) return ElMessage.warning('请填写申请原因')
  
  const template = workflowTemplates.find(t => t.name === form.type)
  const newId = Math.max(...workflowRecords.map(r => r.id)) + 1
  const now = new Date().toISOString().slice(0, 10)
  
  const newRecord = {
    id: newId,
    templateId: template?.id,
    type: form.type,
    applicant: userStore.currentUser?.name,
    applicantId: userStore.currentUser?.id,
    applyTime: now,
    status: '审批中',
    currentNode: template?.nodes?.[0] || '',
    reason: form.reason,
    approveHistory: []
  }
  
  if (form.type === '请假申请' || form.type === '出差申请') {
    newRecord.startDate = form.startDate
    newRecord.endDate = form.endDate
  }
  if (['采购申请', '报销申请'].includes(form.type)) {
    newRecord.amount = form.amount
  }
  if (form.type === '会议室预约') {
    newRecord.meetingRoom = form.meetingRoom
  }
  
  workflowRecords.push(newRecord)
  ElMessage.success('申请已提交')
  router.push('/workflow')
}
</script>
