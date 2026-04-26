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
              <el-step v-for="(node, idx) in currentNodes" :key="idx" :title="node" :description="getNodeDesc(node)" />
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
import { useOaStore } from '@/store/oa'
import { workflowTemplates, meetingRooms, users } from '@/mock/data'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const oaStore = useOaStore()
const form = reactive({ type: '', reason: '', startDate: '', endDate: '', amount: 0, meetingRoom: '', meetingDate: '' })

const currentNodes = computed(() => {
  const t = workflowTemplates.find(t => t.name === form.type)
  return t ? t.nodes : []
})

// 显示审批节点的负责人信息（具体人名）
function getNodeDesc(node) {
  const applicantDept = userStore.currentUser?.deptName
  // 根据审批节点类型和申请人部门，映射到具体审批人
  const nodePersonMap = {
    '直属领导审批': getDeptLeader(applicantDept),
    '部门领导审批': getDeptLeader(applicantDept),
    '财务处审批': '黄磊（财务处）',
    '校长审批': '李明（校长）',
    '校办审批': '张建国（校办）',
    '教务处审批': '陈华（教务处）',
    '总务处审批': '林峰（总务处）',
    '人事处备案': '杨雪（人事处）',
    '自动审批（冲突检测）': '系统自动'
  }
  return nodePersonMap[node] || ''
}

// 根据部门获取部门负责人
function getDeptLeader(dept) {
  const leaderMap = {
    '语文教研组': '刘伟（教研组长）',
    '数学教研组': '张丽（教研组长）',
    '英语教研组': '王强（教研组长）',
    '物理教研组': '赵敏（教研组长）',
    '化学教研组': '孙涛（教研组长）',
    '生物教研组': '周婷（教研组长）',
    '历史教研组': '吴杰（教研组长）',
    '教务处': '陈华（教务处主任）',
    '财务处': '黄磊（财务处主任）',
    '总务处': '林峰（总务处主任）',
    '人事处': '杨雪（人事处主任）',
    '校领导办公室': '张建国（校办主任）'
  }
  return leaderMap[dept] || '部门负责人'
}

function onTypeChange() {}

function doSubmit() {
  if (!form.type) return ElMessage.warning('请选择申请类型')
  if (!form.reason) return ElMessage.warning('请填写申请原因')

  const template = workflowTemplates.find(t => t.name === form.type)
  const newId = Math.max(...oaStore.workflowRecords.map(r => r.id), 0) + 1
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
    currentNodeDisplay: template?.nodes?.[0] ? `${template.nodes[0]}` : '',
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

  // 使用store添加，自动持久化+通知
  oaStore.addWorkflowRecord(newRecord)

  // 通知相关审批人
  const firstNode = template?.nodes?.[0] || ''
  if (firstNode.includes('教务处')) {
    oaStore.addNotification({ type: 'approval', title: '待审批', desc: `${userStore.currentUser?.name}提交了${form.type}`, path: `/workflow/detail/${newId}`, userIds: ['dept:教务处'] })
  } else if (firstNode.includes('校办') || firstNode.includes('校长')) {
    oaStore.addNotification({ type: 'approval', title: '待审批', desc: `${userStore.currentUser?.name}提交了${form.type}`, path: `/workflow/detail/${newId}`, userIds: ['admin'] })
  } else {
    oaStore.addNotification({ type: 'approval', title: '待审批', desc: `${userStore.currentUser?.name}提交了${form.type}`, path: `/workflow/detail/${newId}`, userIds: null })
  }

  ElMessage.success('申请已提交')
  router.push('/workflow')
}
</script>
