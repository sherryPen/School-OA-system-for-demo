<template>
  <div>
    <!-- 欢迎横幅 -->
    <div class="welcome-banner animate-fadeInUp">
      <div class="banner-content">
        <h1>{{ greeting }}，{{ userStore.currentUser?.name }}</h1>
        <p>{{ userStore.currentUser?.roleName }} · {{ userStore.currentUser?.deptName }} · {{ today }}</p>
      </div>
      <div class="banner-decoration">
        <div class="deco-circle c1"></div>
        <div class="deco-circle c2"></div>
        <div class="deco-circle c3"></div>
      </div>
    </div>

    <!-- 统计卡片（角色动态） -->
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px;">
      <transition-group name="card-enter">
        <div v-for="(item, idx) in statCards" :key="item.label"
             class="stat-card hover-lift"
             :style="{ animationDelay: (idx * 0.06) + 's' }"
             @click="$router.push(item.path)">
          <div class="stat-icon" :class="item.color" :style="{ animationDelay: (idx * 0.08) + 's' }">
            <el-icon :size="24"><component :is="item.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <h3><count-up :end="item.value" :duration="1200" /></h3>
            <p>{{ item.label }}</p>
          </div>
          <div class="stat-arrow">→</div>
        </div>
      </transition-group>
    </div>

    <!-- 快捷入口 -->
    <div class="quick-entry animate-fadeInUp">
      <div class="quick-entry-item hover-scale" v-for="(entry, idx) in quickEntries" :key="entry.label"
           :style="{ animationDelay: (idx * 0.05) + 's' }"
           @click="$router.push(entry.path)">
        <div class="icon-wrapper" :style="{ background: entry.bg }">
          <el-icon :size="22"><component :is="entry.icon" /></el-icon>
        </div>
        <span>{{ entry.label }}</span>
      </div>
    </div>

    <!-- 下方双栏 -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
      <!-- 最新公告（角色过滤 + 已读未读） -->
      <div class="page-container animate-fadeInUp" style="animation-delay:0.15s;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h3 style="font-size:15px; font-weight:700; color:#1e293b;">📢 {{ myAnnouncementTitle }}</h3>
          <el-button text type="primary" size="small" @click="$router.push('/announcement')">查看更多</el-button>
        </div>
        <transition-group name="list-slide" tag="div">
          <div v-for="item in myAnnouncements" :key="item.id" class="announcement-item" @click="$router.push(`/announcement/detail/${item.id}`)">
            <div class="announcement-title">
              <span class="read-dot" :class="isRead(item.id) ? 'read' : 'unread'"></span>
              <el-tag v-if="item.priority === '紧急'" type="danger" size="small" effect="dark">紧急</el-tag>
              <el-tag v-else-if="item.priority === '重要'" type="warning" size="small" effect="dark">重要</el-tag>
              <span>{{ item.title }}</span>
            </div>
            <div class="announcement-meta">
              <span>{{ item.publisher }}</span>
              <span>{{ item.publishTime }}</span>
            </div>
          </div>
        </transition-group>
        <div v-if="myAnnouncements.length === 0" class="mini-empty">暂无公告</div>
      </div>

      <!-- 待办事项（角色过滤） -->
      <div class="page-container animate-fadeInUp" style="animation-delay:0.2s;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h3 style="font-size:15px; font-weight:700; color:#1e293b;">⏳ {{ myPendingTitle }}</h3>
          <el-button text type="primary" size="small" @click="$router.push('/workflow')">查看更多</el-button>
        </div>
        <transition-group name="list-slide" tag="div">
          <div v-for="item in myPendingItems" :key="item.id" class="announcement-item pending-item" @click="$router.push(`/workflow/detail/${item.id}`)">
            <div class="announcement-title">
              <el-tag :type="item.status === '审批中' ? 'warning' : item.status === '已通过' ? 'success' : 'danger'" size="small" effect="plain">{{ item.status }}</el-tag>
              {{ item.type }} - {{ item.applicant }}
            </div>
            <div class="announcement-meta">
              <span>申请时间：{{ item.applyTime }}</span>
              <span v-if="item.currentNodeDisplay">当前节点：{{ item.currentNodeDisplay }}</span>
            </div>
          </div>
        </transition-group>
        <div v-if="myPendingItems.length === 0" class="mini-empty">
          <span>✅</span> 暂无待办事项
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useOaStore } from '@/store/oa'
import { users } from '@/mock/data'

const userStore = useUserStore()
const oaStore = useOaStore()

// ======== 基础数据 ========
const today = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
})
const hour = new Date().getHours()
const greeting = hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好'

const userId = computed(() => userStore.currentUser?.id)
const role = computed(() => userStore.currentUser?.roleName)
const deptName = computed(() => userStore.currentUser?.deptName)

// ======== 公告已读状态 ========
function isRead(annId) {
  return oaStore.isAnnouncementRead(annId, userId.value)
}

// ======== 本周会议数（从store动态计算） ========
const thisWeekMeetingCount = computed(() => {
  const visibleMeetings = oaStore.getVisibleMeetings(role.value, userStore.currentUser?.name)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  return visibleMeetings.filter(m => {
    const meetingDate = new Date(m.startTime)
    return meetingDate >= weekStart && meetingDate <= weekEnd
  }).length
})

// ======== 统计卡片（从store动态计算） ========
const statCards = computed(() => {
  // 公告数：从store获取角色过滤后的，显示未读数
  const visibleAnnouncements = oaStore.getVisibleAnnouncements(role.value, deptName.value)
  const unreadAnnouncementCount = visibleAnnouncements.filter(a => !oaStore.isAnnouncementRead(a.id, userId.value)).length

  // 待办审批：从store获取
  const myPending = oaStore.getMyPendingRecords(userId.value, role.value, deptName.value)

  const baseCards = []

  // 所有角色都有通知和待办
  baseCards.push(
    { label: '未读公告', value: unreadAnnouncementCount, icon: 'Bell', color: 'blue', path: '/announcement' },
    { label: role.value === '学生' ? '我的申请' : '待办审批',
      value: role.value === '学生'
        ? oaStore.getMyWorkflowRecords(userId.value, role.value, deptName.value).length
        : myPending.length,
      icon: 'DocumentChecked', color: 'orange', path: '/workflow' }
  )

  // 会议卡片
  baseCards.push({
    label: '本周会议',
    value: thisWeekMeetingCount.value,
    icon: 'Calendar',
    color: 'green',
    path: '/meeting'
  })

  // 第四张卡片根据角色不同
  if (role.value === '教师') {
    // 待录入成绩：统计未发布的成绩数
    const pendingGrades = oaStore.getVisibleGrades(userStore.currentUser)
      .filter(g => g.status === '待发布').length
    baseCards.push({ label: '待录入成绩', value: pendingGrades || 0, icon: 'Edit', color: 'purple', path: '/grade' })
  } else if (role.value === '学生') {
    // 已发布成绩
    const publishedGrades = oaStore.getVisibleGrades(userStore.currentUser).length
    baseCards.push({ label: '已发布成绩', value: publishedGrades, icon: 'DataAnalysis', color: 'purple', path: '/grade' })
  } else if (['系统管理员', '学校领导'].includes(role.value)) {
    baseCards.push({ label: '活跃用户', value: users.filter(u => u.status === '启用').length, icon: 'UserFilled', color: 'teal', path: '/user' })
  } else {
    // 本学期课程数：从store获取已发布课表
    const currentSemester = oaStore.semestersList.find(s => s.status === '进行中')
    const courseCount = currentSemester
      ? new Set(oaStore.schedules.filter(s => s.semesterId === currentSemester.id && s.status === '已发布').map(s => s.courseName)).size
      : 0
    baseCards.push({ label: '本学期课程', value: courseCount, icon: 'Reading', color: 'purple', path: '/course' })
  }

  return baseCards
})

// ======== 快捷入口 ========
const quickEntries = computed(() => {
  const entries = [
    { label: '查看公告', icon: 'Bell', bg: 'linear-gradient(135deg, #4a6cf7, #6366f1)', path: '/announcement' },
    { label: '发起申请', icon: 'EditPen', bg: 'linear-gradient(135deg, #e94560, #c23616)', path: '/workflow/apply' },
    { label: '会议预约', icon: 'Calendar', bg: 'linear-gradient(135deg, #11998e, #38ef7d)', path: '/meeting' }
  ]
  if (role.value === '教师')
    entries.push({ label: '录入成绩', icon: 'Edit', bg: 'linear-gradient(135deg, #f2994a, #f2c94c)', path: '/grade' })
  else if (role.value === '学生')
    entries.push({ label: '查询成绩', icon: 'Search', bg: 'linear-gradient(135deg, #f2994a, #f2c94c)', path: '/grade' })
  else
    entries.push({ label: '用户管理', icon: 'UserFilled', bg: 'linear-gradient(135deg, #f2994a, #f2c94c)', path: '/user' })
  return entries
})

// ======== 我的公告（从store获取，权限过滤） ========
const myAnnouncementTitle = computed(() => {
  if (['系统管理员', '学校领导'].includes(role.value)) return '最新公告（全部）'
  return '最新公告'
})

const myAnnouncements = computed(() => {
  const filtered = oaStore.getVisibleAnnouncements(role.value, deptName.value)
  return [...filtered].sort((a, b) => b.publishTime.localeCompare(a.publishTime)).slice(0, 5)
})

// ======== 我的待办（从store获取，权限过滤） ========
const myPendingTitle = computed(() => {
  if (role.value === '学生') return '我的申请'
  return '待办审批'
})

const myPendingItems = computed(() => {
  if (role.value === '学生') {
    return oaStore.getMyWorkflowRecords(userId.value, role.value, deptName.value)
      .sort((a, b) => b.applyTime.localeCompare(a.applyTime))
      .slice(0, 5)
      .map(r => ({ ...r, currentNodeDisplay: r.currentNode ? `${r.currentNode}（审批中）` : '' }))
  }

  if (['系统管理员', '学校领导'].includes(role.value)) {
    return oaStore.getMyPendingRecords(userId.value, role.value, deptName.value)
      .slice(0, 5)
      .map(r => ({ ...r, currentNodeDisplay: `${r.currentNode || '等待处理'}（${r.type}）` }))
  }

  if (role.value === '行政人员') {
    return oaStore.getMyPendingRecords(userId.value, role.value, deptName.value)
      .slice(0, 5)
      .map(r => ({ ...r, currentNodeDisplay: r.currentNode || '' }))
  }

  // 教师：自己的申请 + 需要审批的
  return oaStore.getMyWorkflowRecords(userId.value, role.value, deptName.value)
    .sort((a, b) => (b.status === '审批中' ? 1 : 0) - (a.status === '审批中' ? 1 : 0))
    .slice(0, 5)
})

// ========== 数字递增动画组件 ==========
const CountUp = {
  props: { end: { type: Number, default: 0 }, duration: { type: Number, default: 1000 } },
  setup(props) {
    const displayVal = ref(0)
    onMounted(() => {
      const startTime = performance.now()
      function update(currentTime) {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / props.duration, 1)
        displayVal.value = Math.round(progress * props.end)
        if (progress < 1) requestAnimationFrame(update)
      }
      requestAnimationFrame(update)
    })
    return () => displayVal.value
  },
  template: '<span>{{ displayVal }}</span>'
}
</script>

<script>
export default {
  components: { 'count-up': null }
}
</script>

<style scoped>
/* 欢迎横幅 */
.welcome-banner {
  background: linear-gradient(135deg, #4a6cf7 0%, #6366f1 40%, #8b5cf6 80%, #a78bfa 100%);
  border-radius: 14px;
  padding: 28px 32px;
  color: #fff;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}
.banner-content h1 { font-size:22px; font-weight:700; margin-bottom:6px; position:relative; z-index:1; }
.banner-content p { font-size:14px; opacity:0.85; position:relative; z-index:1; }
.banner-decoration { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
.deco-circle {
  position:absolute; border-radius:50%; opacity:0.07;
}
.c1 { width:180px; height:180px; right:-30px; top:-40px; background:#fff; }
.c2 { width:100px; height:100px; right:60px; bottom:-20px; background:#fff; }
.c3 { width:60px; height:60px; left:40%; top:10px; background:#fff; animation: float 6s ease infinite; }
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

/* 卡片动画 */
.hover-lift {
  transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 28px rgba(74,108,247,0.12), 0 2px 6px rgba(0,0,0,0.04);
}
.stat-arrow {
  margin-left:auto;
  color:#c0c4cc;
  font-size:18px;
  transition: transform 0.25s;
  flex-shrink:0;
}
.hover-lift:hover .stat-arrow {
  transform: translateX(4px);
  color:#4a6cf7;
}

/* 卡片入场 */
.card-enter-active { transition: all 0.45s cubic-bezier(0.22,1,0.36,1); }
.card-enter-from { opacity: 0; transform: translateY(16px) scale(0.96); }

/* 列表滑动 */
.list-slide-move { transition: transform 0.35s cubic-bezier(0.22,1,0.36,1); }
.list-slide-enter-active { transition: all 0.4s ease; }
.list-slide-leave-active { transition: all 0.2s ease; }
.list-slide-enter-from { opacity: 0; transform: translateX(-16px); }
.list-slide-leave-to { opacity: 0; transform: translateX(16px); height:0; padding:0; margin:0; overflow:hidden; }

/* 快捷入口缩放 */
.hover-scale {
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
.hover-scale:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 6px 20px rgba(0,0,0,0.07);
}

/* 待办项样式 */
.pending-item {
  border-left: 3px solid transparent;
  transition: border-color 0.2s;
}
.pending-item:hover {
  border-left-color: #4a6cf7;
  background: #f8fafc;
}

.mini-empty {
  text-align:center; padding:24px; color:#c0c4cc; font-size:13px;
}
.mini-empty span { font-size:24px; margin-right:6px; }

/* 已读未读圆点 */
.read-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}
.read-dot.unread { background: #f56c6c; }
.read-dot.read { background: #67c23a; }

/* 动画 */
.animate-fadeInUp {
  animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>