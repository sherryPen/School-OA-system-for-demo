<template>
  <div class="page-container">
    <div class="page-header"><h2>流程审批</h2></div>
    <el-tabs v-model="activeTab">
      <!-- 待办审批 -->
      <el-tab-pane label="待办审批" name="pending">
        <el-table :data="myPendingList" stripe @row-click="row => $router.push(`/workflow/detail/${row.id}`)" class="animate-fadeInUp">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="type" label="流程类型" width="120" />
          <el-table-column prop="applicant" label="申请人" width="100" />
          <el-table-column prop="reason" label="申请原因" min-width="200" show-overflow-tooltip />
          <el-table-column prop="applyTime" label="申请时间" width="120" sortable />
          <el-table-column prop="currentNode" label="当前节点" width="180">
            <template #default="{ row }">
              <el-tag type="warning" effect="plain">{{ row.currentNodeDisplay || '—' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button type="success" size="small" @click.stop="doApprove(row, true)">通过</el-button>
              <el-button type="danger" size="small" @click.stop="doApprove(row, false)">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="myPendingList.length === 0" class="empty-state">
          <p>暂无待您审批的事项</p>
        </div>
      </el-tab-pane>

      <!-- 我的申请 -->
      <el-tab-pane label="我的申请" name="myApply">
        <el-table :data="myApplyList" stripe @row-click="row => $router.push(`/workflow/detail/${row.id}`)" class="animate-fadeInUp">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="type" label="流程类型" width="120" />
          <el-table-column prop="reason" label="申请原因" min-width="200" show-overflow-tooltip />
          <el-table-column prop="applyTime" label="申请时间" width="120" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="currentNode" label="当前节点" width="180">
            <template #default="{ row }"><span>{{ row.currentNodeDisplay || '—' }}</span></template>
          </el-table-column>
          <el-table-column label="进度" width="80">
            <template #default="{ row }">
              <el-progress :percentage="calcProgress(row)" :stroke-width="6" :show-text="false" style="width:60px;" :color="progressColor(row)" />
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 全部记录（权限过滤） -->
      <el-tab-pane label="全部记录" name="all">
        <el-table :data="allList" stripe @row-click="row => $router.push(`/workflow/detail/${row.id}`)" class="animate-fadeInUp">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="type" label="流程类型" width="120" />
          <el-table-column prop="applicant" label="申请人" width="100" />
          <el-table-column prop="reason" label="申请原因" min-width="200" show-overflow-tooltip />
          <el-table-column prop="applyTime" label="申请时间" width="120" sortable />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="进度" width="80">
            <template #default="{ row }">
              <el-progress :percentage="calcProgress(row)" :stroke-width="6" :show-text="false" style="width:60px;" :color="progressColor(row)" />
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 流程进度 -->
      <el-tab-pane label="流程进度" name="progress">
        <div v-if="myApplyList.length > 0" style="display:flex; flex-direction:column; gap:20px;">
          <div v-for="record in myApplyList" :key="record.id"
               style="background:#fff; border-radius:12px; padding:20px; border:1px solid #e8ecf1;"
               class="progress-card animate-fadeInUp">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <div>
                <el-tag :type="statusType(record.status)" size="small" effect="plain">{{ record.status }}</el-tag>
                <span style="font-weight:600; font-size:15px; margin-left:8px;">{{ record.type }} - {{ record.applicant }}</span>
              </div>
              <el-progress :percentage="calcProgress(record)" :style="{width:'140px'}" :color="progressColor(record)" />
            </div>
            <p style="font-size:13px; color:#64748b; margin-bottom:16px;">{{ record.reason }}</p>

            <!-- 进度时间线 -->
            <el-timeline>
              <el-timeline-item timestamp="提交申请" placement="top" :type="'primary'" :hollow="false">
                <div class="timeline-content">
                  <strong>{{ record.type }}</strong>
                  <div style="font-size:12px; color:#94a3b8;">{{ record.applyTime }} · {{ record.applicant }}（{{ getApplicantDept(record) }}）提交</div>
                </div>
              </el-timeline-item>

              <el-timeline-item
                v-for="(node, idx) in getTemplateNodes(record)"
                :key="idx"
                :timestamp="getNodeLabel(node)"
                :placement="'top'"
                :type="getNodeType(record, node)"
                :hollow="isNodePending(record, node)"
              >
                <div class="timeline-content" :class="{ 'node-pending': isNodePending(record, node), 'node-done': !isNodePending(record, node) && isNodePassed(record, node), 'node-rejected': isNodeRejected(record, node) }">
                  <strong>{{ node }}</strong>
                  <div style="font-size:12px; color:#94a3b8;" v-if="getHandlerInfo(record, node)">
                    {{ getHandlerInfo(record, node) }}
                  </div>
                  <div style="font-size:12px; color:#94a3b8;" v-if="isNodePending(record, node)">
                    等待审批：{{ getPendingApprover(node, record) }}
                  </div>
                </div>
              </el-timeline-item>

              <!-- 最终结果 -->
              <el-timeline-item v-if="record.status !== '审批中'"
                           :timestamp="record.status === '已通过' ? '✅ 已通过' : '❌ 已驳回'"
                           :placement="'top'"
                           :type="record.status === '已通过' ? 'success' : 'danger'"
                           :hollow="false">
                <div class="timeline-content">
                  <strong>{{ record.status }}</strong>
                  <div style="font-size:12px; color:#94a3b8;">
                    {{ getLastHistory(record)?.time || '' }}
                    · {{ getLastHistory(record)?.comment || '' }}
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无申请记录，可点击下方按钮发起新的申请</p>
        </div>
      </el-tab-pane>
    </el-tabs>

    <div style="margin-top:18px;">
      <el-button type="primary" @click="$router.push('/workflow/apply')"><el-icon><Plus /></el-icon>发起申请</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { useOaStore } from '@/store/oa'
import { workflowTemplates, users } from '@/mock/data'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const oaStore = useOaStore()
const activeTab = ref('pending')

const userId = computed(() => userStore.currentUser?.id)
const userName = computed(() => userStore.currentUser?.name)
const roleName = computed(() => userStore.currentUser?.roleName)
const deptName = computed(() => userStore.currentUser?.deptName)

// 部门映射
const deptMap = {
  '李明': '校领导办公室', '张建国': '校领导办公室',
  '陈华': '教务处', '黄磊': '财务处', '林峰': '总务处',
  '杨雪': '人事处', '刘伟': '语文教研组', '张丽': '数学教研组',
  '王强': '英语教研组', '赵敏': '物理教研组', '孙涛': '化学教研组',
  '周婷': '生物教研组', '吴杰': '历史教研组', '系统': '信息中心'
}

// ======== 使用store的权限过滤方法 ========
function sortRecords(list) {
  return [...list].sort((a, b) => {
    // 审批中优先
    if (a.status === '审批中' && b.status !== '审批中') return -1
    if (a.status !== '审批中' && b.status === '审批中') return 1
    // 其余按时间倒序
    return b.applyTime.localeCompare(a.applyTime)
  })
}

const myPendingList = computed(() =>
  oaStore.getMyPendingRecords(userId.value, roleName.value, deptName.value)
)

const myApplyList = computed(() =>
  sortRecords(
    oaStore.getMyWorkflowRecords(userId.value, roleName.value, deptName.value)
      .filter(r => r.applicantId === userId.value)
  )
)

// 全部记录也做权限过滤 + 审批中置顶
const allList = computed(() =>
  sortRecords(oaStore.getMyWorkflowRecords(userId.value, roleName.value, deptName.value))
)

// ======== 辅助函数 ========
function statusType(status) {
  if (status === '已通过') return 'success'
  if (status === '已驳回') return 'danger'
  return 'warning'
}

function calcProgress(record) {
  const tpl = workflowTemplates.find(t => t.name === record.type)
  if (!tpl) return record.status !== '审批中' ? 100 : 0
  const totalNodes = tpl.nodes.length + 1
  const doneCount = record.approveHistory ? record.approveHistory.length : 0
  if (record.status === '已驳回') return Math.round((doneCount / totalNodes) * 90)
  if (record.status === '已通过') return 100
  return Math.round((doneCount / totalNodes) * 80)
}

function progressColor(record) {
  if (record.status === '已通过') return '#11998e'
  if (record.status === '已驳回') return '#e94560'
  return '#4a6cf7'
}

function getTemplateNodes(record) {
  const tpl = workflowTemplates.find(t => t.name === record.type)
  return tpl ? tpl.nodes : []
}

function getNodeLabel(node) {
  // 根据当前申请人部门动态计算具体审批人
  const applicantDept = userStore.currentUser?.deptName
  const nodeLabelMap = {
    '直属领导审批': `直属领导（${getDeptLeader(applicantDept)}）`,
    '财务处审批': '财务处（黄磊）',
    '部门领导审批': `部门领导（${getDeptLeader(applicantDept)}）`,
    '校长审批': '校长室（李明）',
    '校办审批': '校办（张建国）',
    '教务处审批': '教务处（陈华）',
    '总务处审批': '总务处（林峰）',
    '人事处备案': '人事处（杨雪）',
    '自动审批（冲突检测）': '系统自动检测'
  }
  return nodeLabelMap[node] || node
}

function getDeptLeader(dept) {
  const leaderMap = {
    '语文教研组': '刘伟', '数学教研组': '张丽', '英语教研组': '王强',
    '物理教研组': '赵敏', '化学教研组': '孙涛', '生物教研组': '周婷',
    '历史教研组': '吴杰', '教务处': '陈华', '财务处': '黄磊',
    '总务处': '林峰', '人事处': '杨雪', '校领导办公室': '张建国'
  }
  return leaderMap[dept] || '部门负责人'
}

function getNodeType(record, node) {
  if (record.status === '已驳回') {
    const lastH = record.approveHistory[record.approveHistory.length - 1]
    if (lastH && lastH.node === node && lastH.result === '驳回') return 'danger'
  }
  const passed = record.approveHistory?.find(h => h.node === node && h.result === '通过')
  if (passed) return 'success'
  if (record.currentNode === node || record.currentNode?.includes(node.replace('审批', '').replace('备案', ''))) return 'primary'
  return 'info'
}

function isNodePending(record, node) {
  if (record.status !== '审批中') return false
  const handled = record.approveHistory?.find(h => h.node === node)
  if (handled) return false
  const tpl = workflowTemplates.find(t => t.name === record.type)
  if (!tpl) return false
  const nodeIdx = tpl.nodes.indexOf(node)
  if (nodeIdx < 0) return false
  for (let i = 0; i < nodeIdx; i++) {
    const prevPassed = record.approveHistory?.find(h => h.node === tpl.nodes[i] && h.result === '通过')
    if (!prevPassed) return false
  }
  return record.currentNode?.includes(node) || nodeIdx === record.approveHistory?.length
}

function isNodePassed(record, node) {
  return record.approveHistory?.find(h => h.node === node && h.result === '通过')
}
function isNodeRejected(record, node) {
  return record.approveHistory?.find(h => h.node === node && h.result === '驳回')
}

function getHandlerInfo(record, node) {
  const h = record.approveHistory?.find(item => item.node === node)
  if (!h) return ''
  const handlerDept = deptMap[h.handler] || ''
  return `${h.time} · ${handlerDept}（${h.handler}）${h.comment ? '· ' + h.comment : ''}`
}

function getApplicantDept(record) {
  const applicant = users.find(u => u.id === record.applicantId)
  return applicant?.deptName || ''
}

// 获取待审批节点的具体审批人
function getPendingApprover(node, record) {
  const applicant = users.find(u => u.id === record.applicantId)
  const applicantDept = applicant?.deptName || ''
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
  return nodePersonMap[node] || '审批人'
}

function getLastHistory(record) {
  if (!record.approveHistory || record.approveHistory.length === 0) return null
  return record.approveHistory[record.approveHistory.length - 1]
}

// ======== 审批操作（使用store统一处理） ========
function doApprove(row, approve) {
  oaStore.approveWorkflow(row.id, approve, userName.value, deptName.value)
  // 添加通知
  if (approve) {
    oaStore.addNotification({
      type: 'approval', title: '审批通过',
      desc: `${userName.value}通过了${row.applicant}的${row.type}`,
      path: `/workflow/detail/${row.id}`,
      userIds: [row.applicantId]
    })
  }
  ElMessage.success(approve ? `已通过${row.type}` : `已驳回${row.type}`)
}
</script>

<style scoped>
.progress-card {
  transition: all 0.3s ease;
}
.progress-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}
.timeline-content {
  font-size:13px;
  line-height:1.6;
}
.timeline-content strong {
  color:#303133;
}
.node-pending {
  opacity: 0.7;
}
.node-done strong {
  color:#11998e;
}
.node-rejected strong {
  color:#e94560;
}
.animate-fadeInUp {
  animation: fadeInUp 0.4s ease both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
