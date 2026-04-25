<template>
  <div class="page-container" v-if="record">
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <el-button text @click="$router.push('/workflow')" style="margin-bottom:0; padding:4px 8px;">
          <el-icon><ArrowLeft /></el-icon>返回
        </el-button>
        <h2 style="display:inline; margin-left:10px;">{{ record.type }}详情</h2>
      </div>
      <el-tag :type="statusType(record.status)" size="large" effect="dark">{{ record.status }}</el-tag>
    </div>

    <!-- 基本信息 -->
    <div class="detail-section animate-fadeInUp">
      <h3 class="section-title">基本信息</h3>
      <el-descriptions :column="2" border size="default">
        <el-descriptions-item label="流程类型">{{ record.type }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="statusType(record.status)" effect="plain">{{ record.status }}</el-tag>
          <span v-if="record.currentNodeDisplay" style="margin-left:8px; font-size:12px; color:#94a3b8;">→ {{ record.currentNodeDisplay }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="申请人">{{ record.applicant }}
          <span style="color:#94a3b8; font-size:12px; margin-left:6px;">（{{ applicantDept }}）</span>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ record.applyTime }}</el-descriptions-item>
        <el-descriptions-item label="申请原因" :span="2">{{ record.reason }}</el-descriptions-item>
        <el-descriptions-item v-if="record.startDate" label="开始时间">{{ record.startDate }}</el-descriptions-item>
        <el-descriptions-item v-if="record.endDate" label="结束时间">{{ record.endDate }}</el-descriptions-item>
        <el-descriptions-item v-if="record.amount" label="金额">
          <span style="color:#e94560; font-weight:700;">￥{{ record.amount?.toLocaleString() }}</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="record.meetingRoom" label="会议室">{{ record.meetingRoom }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 流程进度（核心新增） -->
    <div class="detail-section animate-fadeInUp" style="animation-delay:0.1s;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 class="section-title" style="margin-bottom:0;">流程进度</h3>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:13px; color:#94a3b8;">完成度</span>
          <el-progress :percentage="calcProgress(record)" :style="{width:'180px'}" :color="progressColor(record)" :stroke-width="10" />
        </div>
      </div>

      <el-steps :active="currentStepIndex" align-center status="process" finish-status="success" process-color="#4a6cf7">
        <el-step title="提交申请" :description="`${record.applyTime} · ${record.applicant}`"></el-step>

        <el-step
          v-for="(node, idx) in templateNodes"
          :key="idx"
          :title="node"
          :description="getNodeDescription(record, node)"
          :status="getStepStatus(record, node)"
        ></el-step>

        <el-step
          v-if="record.status !== '审批中'"
          :title="record.status === '已通过' ? '已通过' : '已驳回'"
          :description="finalStepDesc"
          :status="record.status === '已通过' ? 'success' : 'error'"
        ></el-step>
      </el-steps>

      <!-- 详细时间线 -->
      <div style="margin-top:28px;">
        <h4 style="font-size:14px; color:#475569; margin-bottom:14px; padding-left:8px; border-left:3px solid #4a6cf7;">审批记录明细</h4>
        <el-timeline>
          <!-- 提交 -->
          <el-timeline-item timestamp="提交申请" placement="top" type="primary" :hollow="false" size="large">
            <div style="background:#f0f5ff; border-radius:10px; padding:14px 18px;">
              <strong>{{ record.type }}</strong> 已提交
              <div style="font-size:12px; color:#94a3b8; margin-top:4px;">
                {{ record.applyTime }} · {{ record.applicant }}（{{ applicantDept }}）
              </div>
            </div>
          </el-timeline-item>

          <!-- 各节点历史 -->
          <template v-for="(node, idx) in templateNodes" :key="'tl-' + idx">
            <el-timeline-item
              :timestamp="formatNodeLabel(node)"
              :placement="'top'"
              :type="getTimelineType(record, node)"
              :size="getTimelineSize(record, node)"
              :hollow="isNodePending(record, node)"
            >
              <div
                class="timeline-card"
                :class="{
                  'card-pending': isNodePending(record, node),
                  'card-done': !isNodePending(record, node) && isNodePassed(record, node),
                  'card-rejected': isNodeRejected(record, node)
                }"
              >
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong>{{ node }}</strong>
                  <el-tag
                    v-if="!isNodePending(record, node)"
                    :type="isNodeRejected(record, node) ? 'danger' : 'success'"
                    size="small"
                    effect="plain"
                  >{{ getNodeResult(record, node) }}</el-tag>
                  <el-tag v-else type="warning" size="small" effect="plain">等待中</el-tag>
                </div>
                <div v-if="getHistoryForNode(record, node)" style="font-size:12px; color:#64748b; margin-top:8px; line-height:1.8;">
                  <div>📅 处理时间：{{ getHistoryForNode(record, node).time }}</div>
                  <div>👤 处理人：{{ getHistoryForNode(record, node).handler }}
                    <span v-if="getHandlerDept(getHistoryForNode(record, node).handler)">
                      （{{ getHandlerDept(getHistoryForNode(record, node).handler) }}）
                    </span>
                  </div>
                  <div>📝 审批意见：{{ getHistoryForNode(record, node).comment || '无' }}</div>
                </div>
                <div v-else-if="isNodePending(record, node)" style="font-size:12px; color:#94a3b8; margin-top:8px;">
                  ⏳ 等待处理...
                </div>
                <div v-else style="font-size:12px; color:#c0c4cc; margin-top:8px;">
                  未到达此节点
                </div>
              </div>
            </el-timeline-item>
          </template>

          <!-- 最终结果 -->
          <el-timeline-item
            v-if="record.status !== '审批中'"
            :timestamp="record.status === '已通过' ? '✅ 流程结束（通过）' : '❌ 流程结束（驳回）'"
            :placement="'top'"
            :type="record.status === '已通过' ? 'success' : 'danger'"
            :hollow="false"
            size="large"
          >
            <div
              class="timeline-card"
              :style="{ background: record.status === '已通过' ? '#f0fdf4' : '#fef2f2', borderColor: record.status === '已通过' ? '#bbf7d0' : '#fecaca' }"
            >
              <strong>{{ record.status }}</strong>
              <div style="font-size:12px; color:#64748b; margin-top:8px;" v-if="lastHistory">
                <div>📅 时间：{{ lastHistory.time }}</div>
                <div>👤 处理人：{{ lastHistory.handler }}（{{ getHandlerDept(lastHistory.handler) || '' }}）</div>
                <div>📝 意见：{{ lastHistory.comment || '无' }}</div>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </div>

  <div v-else class="page-container empty-state">
    <p>未找到该审批记录</p>
    <el-button type="primary" @click="$router.push('/workflow')">返回列表</el-button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { workflowRecords as _records, workflowTemplates, users } from '@/mock/data'

const route = useRoute()
const userStore = useUserStore()

const records = ref(_records.map(r => ({ ...r, approveHistory: r.approveHistory ? r.approveHistory.map(h => ({ ...h })) : [] })))
const record = computed(() => {
  const id = Number(route.params.id)
  return records.value.find(r => r.id === id)
})

// 部门映射
const deptMap = {
  '李明': '校领导办公室', '张建国': '校领导办公室',
  '陈华': '教务处', '黄磊': '财务处', '林峰': '总务处',
  '杨雪': '人事处', '刘伟': '语文教研组', '张丽': '数学教研组',
  '王强': '英语教研组', '赵敏': '物理教研组', '孙涛': '化学教研组',
  '周婷': '生物教研组', '吴杰': '历史教研组', '系统': '信息中心'
}

const applicantDept = computed(() => {
  const u = users.find(u => u.id === record.value?.applicantId)
  return u?.deptName || ''
})

const templateNodes = computed(() => {
  const tpl = workflowTemplates.find(t => t.name === record.value?.type)
  return tpl?.nodes || []
})

// ======== 进度计算 ========
function calcProgress(rec) {
  const tpl = workflowTemplates.find(t => t.name === rec.type)
  if (!tpl) return rec.status !== '审批中' ? 100 : 0
  const totalNodes = tpl.nodes.length + 1
  const doneCount = rec.approveHistory?.length || 0
  if (rec.status === '已驳回') return Math.round((doneCount / totalNodes) * 90)
  if (rec.status === '已通过') return 100
  return Math.round((doneCount / totalNodes) * 80)
}

function progressColor(rec) {
  if (rec.status === '已通过') return '#11998e'
  if (rec.status === '已驳回') return '#e94560'
  return '#4a6cf7'
}

function currentStepIndex() {
  const r = record.value
  if (!r) return 0
  if (r.status === '已通过') return templateNodes.value.length + 1
  if (r.status === '已驳回') return -1 // 特殊标记
  const done = r.approveHistory?.filter(h => h.result === '通过').length || 0
  return done + 1
}

function statusType(status) {
  if (status === '已通过') return 'success'
  if (status === '已驳回') return 'danger'
  return 'warning'
}

function formatNodeLabel(node) {
  const map = {
    '直属领导审批': '直属领导审批（部门负责人审核）',
    '财务处审批': '财务处审批（财务核算）',
    '部门领导审批': '部门领导审批（部门负责人）',
    '校长审批': '校长审批（最终决策）',
    '校办审批': '校办审批（行政审核）',
    '教务处审批': '教务处审批（教学管理）',
    '总务处审批': '总务处审批（后勤保障）',
    '人事处备案': '人事处备案（档案管理）',
    '自动审批（冲突检测）': '自动审批（系统检测）'
  }
  return map[node] || node
}

function getNodeDescription(rec, node) {
  const h = rec.approveHistory?.find(item => item.node === node)
  if (h) {
    const d = deptMap[h.handler] || ''
    return `${h.time} · ${d}（${h.handler}）`
  }
  if (rec.currentNode === node) return '进行中...'
  return '待到达'
}

function getStepStatus(rec, node) {
  if (rec.status === '已驳回') {
    const h = rec.approveHistory?.find(item => item.node === node && item.result === '驳回')
    if (h) return 'error'
  }
  const h = rec.approveHistory?.find(item => item.node === node && item.result === '通过')
  if (h) return 'finish'
  if (rec.currentNode === node) return 'process'
  return 'wait'
}

function getTimelineType(rec, node) {
  if (isNodeRejected(rec, node)) return 'danger'
  if (isNodePassed(rec, node)) return 'success'
  if (isNodePending(rec, node)) return 'warning'
  return 'info'
}

function getTimelineSize(rec, node) {
  if (isNodePending(rec, node) || isNodePassed(rec, node)) return 'large'
  return 'normal'
}

function isNodePending(rec, node) {
  if (rec.status !== '审批中') return false
  if (rec.approveHistory?.find(h => h.node === node)) return false
  const tpl = workflowTemplates.find(t => t.name === rec.type)
  if (!tpl) return false
  const idx = tpl.nodes.indexOf(node)
  if (idx < 0) return false
  for (let i = 0; i < idx; i++) {
    if (!rec.approveHistory?.find(h => h.node === tpl.nodes[i] && h.result === '通过')) return false
  }
  return rec.currentNode?.includes(node) || idx === (rec.approveHistory?.length || 0)
}

function isNodePassed(rec, node) {
  return rec.approveHistory?.find(h => h.node === node && h.result === '通过')
}
function isNodeRejected(rec, node) {
  return rec.approveHistory?.find(h => h.node === node && h.result === '驳回')
}
function getResult(rec, node) {
  return rec.approveHistory?.find(h => h.node === node)?.result || ''
}
function getNodeResult(rec, node) {
  return rec.approveHistory?.find(h => h.node === node)?.result || ''
}
function getHistoryForNode(rec, node) {
  return rec.approveHistory?.find(h => h.node === node) || null
}
function getHandlerDept(name) {
  return deptMap[name] || ''
}

const finalStepDesc = computed(() => {
  const h = record.value?.approveHistory?.[record.value.approveHistory.length - 1]
  if (!h) return ''
  const d = deptMap[h.handler] || ''
  return `${h.time} · ${d}（${h.handler}）`
})

const lastHistory = computed(() => {
  const arr = record.value?.approveHistory
  if (!arr || arr.length === 0) return null
  return arr[arr.length - 1]
})
</script>

<style scoped>
.detail-section {
  background:#fff;
  border-radius:12px;
  padding:24px;
  margin-bottom:20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  border:1px solid #e8ecf1;
}
.section-title {
  font-size:15px;
  font-weight:700;
  color:#1e293b;
  margin-bottom:18px;
  padding-bottom:12px;
  border-bottom:1px solid #f1f5f9;
}
.timeline-card {
  background:#fff;
  border-radius:10px;
  padding:14px 18px;
  border:1px solid #e8ecf1;
  transition: all 0.25s;
}
.timeline-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.card-pending { background:#fffbf0; border-color:#fef3c7; }
.card-done { background:#f0fdf4; border-color:#dcfce7; }
.card-rejected { background:#fef2f2; border-color:#fecaca; }
.animate-fadeInUp {
  animation: fadeInUp 0.45s ease both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
