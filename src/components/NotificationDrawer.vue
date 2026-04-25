<template>
  <!-- 右侧贴边浮窗通知 -->
  <div class="notification-drawer" :class="{ expanded: isExpanded, collapsed: !isExpanded }">
    <!-- 收纳条 -->
    <div class="drawer-tab" @click="toggleDrawer" :class="{ 'has-unread': unreadCount > 0 }">
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
        <el-icon :size="18"><Bell /></el-icon>
      </el-badge>
      <span class="tab-text" v-if="!isExpanded">通知</span>
      <el-icon v-if="isExpanded" :size="14"><Close /></el-icon>
    </div>

    <!-- 展开面板 -->
    <transition name="drawer-slide">
      <div class="drawer-panel" v-show="isExpanded">
        <div class="drawer-header">
          <h3>🔔 消息通知</h3>
          <el-button text type="primary" size="small" @click="markAllRead">全部已读</el-button>
        </div>
        <div class="drawer-list" v-if="notifications.length > 0">
          <transition-group name="notif-item">
            <div v-for="item in notifications" :key="item.id"
                 class="notification-item"
                 :class="{ unread: !item.read, [`type-${item.type}`]: true }"
                 @click="handleClick(item)">
              <div class="notif-icon" :class="item.type">
                <el-icon :size="16"><component :is="iconMap[item.type] || 'Bell'" /></el-icon>
              </div>
              <div class="notif-content">
                <div class="notif-title">{{ item.title }}</div>
                <div class="notif-desc">{{ item.desc }}</div>
                <div class="notif-time">{{ item.time }}</div>
              </div>
              <div v-if="!item.read" class="unread-dot pulse"></div>
            </div>
          </transition-group>
        </div>
        <div v-else class="empty-notify">
          <div class="empty-icon">✨</div>
          <p>暂无新通知</p>
        </div>

        <div class="drawer-footer">
          <span>{{ notifications.length }} 条消息 · {{ unreadCount }} 未读</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const isExpanded = ref(false)

const STORAGE_KEY_PREFIX = 'oa_notif_'
const iconMap = {
  approval: 'DocumentChecked',
  announcement: 'Bell',
  meeting: 'Calendar',
  system: 'Setting'
}

// 生成个性化通知（与layout保持一致）
function generateNotifications() {
  const userId = userStore.currentUser?.id
  const roleName = userStore.currentUser?.roleName
  const deptName = userStore.currentUser?.deptName

  const baseNotifs = [
    { id: `d-${userId}-1`, type: 'announcement', title: '新公告', desc: '关于劳动节放假安排的通知已发布', time: '1小时前', read: false, path: '/announcement/detail/18' },
    { id: `d-${userId}-2`, type: 'meeting', title: '会议提醒', desc: '高考工作协调会将于明天09:00召开', time: '2小时前', read: false, path: '/meeting' }
  ]

  const extraNotifs = []

  if (['系统管理员', '学校领导'].includes(roleName)) {
    extraNotifs.push(
      { id: `d-${userId}-3`, type: 'approval', title: '待审批', desc: '赵敏提交了请假申请，等待您审批', time: '10分钟前', read: false, path: '/workflow/detail/6' },
      { id: `d-${userId}-4`, type: 'approval', title: '待审批', desc: '孙涛提交了报销申请，等待您审批', time: '30分钟前', read: false, path: '/workflow/detail/26' }
    )
  }

  if (deptName === '教务处') {
    extraNotifs.push(
      { id: `d-${userId}-5`, type: 'system', title: '课表待审核', desc: '高一(3)班课表已提交，请审核后发布', time: '30分钟前', read: false, path: '/course' }
    )
  }

  if (roleName === '教师') {
    extraNotifs.push(
      { id: `d-${userId}-6`, type: 'announcement', title: '教学通知', desc: '期中考试考务会议将于下周召开', time: '昨天', read: false, path: '/announcement/detail/17' }
    )
  }

  if (roleName === '学生') {
    extraNotifs.push(
      { id: `d-${userId}-7`, type: 'announcement', title: '成绩发布', desc: '期中考试成绩已发布，可前往查看', time: '今天', read: false, path: '/grade' }
    )
  }

  const all = [...baseNotifs, ...extraNotifs]

  // 从localStorage恢复已读状态
  const savedState = loadReadState(userId)
  all.forEach(n => { n.read = savedState[n.id] || n.read || false })

  return all
}

const notifications = ref([])
onMounted(() => { notifications.value = generateNotifications() })
watch(() => userStore.currentUser?.id, () => { notifications.value = generateNotifications() }, { immediate: true })

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

function toggleDrawer() {
  isExpanded.value = !isExpanded.value
}

function handleClick(item) {
  markAsRead(item)
  isExpanded.value = false
  if (item.path) router.push(item.path)
  else ElMessage.info(item.desc)
}

function markAllRead() {
  const userId = userStore.currentUser?.id
  notifications.value.forEach(n => { n.read = true })
  saveReadState(userId)
  ElMessage.success('已全部标记为已读')
}

function markAsRead(item) {
  item.read = true
  saveReadState(userStore.currentUser?.id)
}

function saveReadState(userId) {
  try {
    const state = {}
    notifications.value.forEach(n => { state[n.id] = n.read })
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(state))
  } catch(e){}
}
function loadReadState(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch(e){ return {} }
}
</script>

<style scoped>
.notification-drawer {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
}

/* 收纳标签 */
.drawer-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 14px 9px;
  background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
  color: #e0e0e0;
  border-radius: 10px 0 0 10px;
  cursor: pointer;
  box-shadow: -3px 0 12px rgba(0,0,0,0.12);
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
  user-select: none;
  min-width: 38px;
}
.drawer-tab:hover {
  background: linear-gradient(180deg, #334155 0%, #475569 100%);
  padding: 16px 11px;
  transform: scaleX(1.02);
}
.drawer-tab.has-unread {
  animation: tabPulse 2s ease infinite;
}
@keyframes tabPulse {
  0%, 100% { box-shadow: -3px 0 12px rgba(74,108,247,0.15); }
  50% { box-shadow: -3px 0 20px rgba(74,108,247,0.35), -3px 0 30px rgba(233,69,96,0.15); }
}

.tab-text {
  font-size: 11px;
  writing-mode: vertical-rl;
  letter-spacing: 3px;
  font-weight:500;
}

/* 展开面板 */
.drawer-panel {
  width: 350px;
  max-height: 540px;
  background: #fff;
  border-radius: 14px 0 0 14px;
  box-shadow: -6px 0 28px rgba(0,0,0,0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
/* 面板滑动动画 */
.drawer-slide-enter-active { transition: all 0.35s cubic-bezier(0.22,1,0.36,1); }
.drawer-slide-leave-active { transition: all 0.25s cubic-bezier(0.22,1,0.36,1); }
.drawer-slide-enter-from { opacity: 0; transform: translateX(40px); }
.drawer-slide-leave-to { opacity: 0; transform: translateX(40px); }

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #f8f9fe, #f0f2f8);
}
.drawer-header h3 { font-size: 16px; font-weight:600; color:#303133; }

.drawer-list {
  overflow-y: auto;
  max-height: 420px;
  flex:1;
}

/* 单条通知项 */
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
  position: relative;
  border-bottom: 1px solid #f6f6f6;
}
.notification-item:hover {
  background: #f8fafc;
  padding-left: 22px;
}
.notification-item.unread {
  background: linear-gradient(135deg, #f0f5ff, #fafeff);
}
.notification-item.unread:hover {
  background: linear-gradient(135deg, #e8efff, #f0f8ff);
}

.notif-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display:flex; align-items:center; justify-content:center;
  color:#fff; flex-shrink:0;
  transition: transform 0.25s;
}
.notification-item:hover .notif-icon { transform: scale(1.08); }
.notif-icon.approval { background: linear-gradient(135deg, #e94560, #c23616); }
.notif-icon.announcement { background: linear-gradient(135deg, #667eea, #764ba2); }
.notif-icon.meeting { background: linear-gradient(135deg, #11998e, #38ef7d); }
.notif-icon.system { background: linear-gradient(135deg, #909399, #606266); }

.notif-content { flex:1; min-width:0; }
.notif-title { font-size:14px; font-weight:600; color:#303133; margin-bottom:3px; }
.notif-desc { font-size:12px; color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px; }
.notif-time { font-size:11px; color:#94a3b8; margin-top:4px; }

.unread-dot {
  width: 8px; height:8px;
  background: #e94560;
  border-radius:50%; flex-shrink:0;
  margin-top:7px;
  animation: dotPulse 1.5s infinite;
}
@keyframes dotPulse {
  0%, 100% { transform: scale(1); opacity:1; }
  50% { transform: scale(1.4); opacity:0.6; }
}

/* 列表项过渡 */
.notifItem-enter-active { transition: all 0.35s cubic-bezier(0.22,1,0.36,1); }
.notifItem-leave-active { transition: all 0.25s ease; }
.notifItem-enter-from { opacity: 0; transform: translateX(20px); }
.notifItem-leave-to { opacity: 0; transform: translateX(-20px); height:0; padding:0; margin:0; }

.empty-notify { text-align:center; padding:48px 20px; color:#c0c4cc; }
.empty-icon { font-size:42px; margin-bottom:10px; opacity:0.5; }
.empty-notify p { font-size:14px; }

.drawer-footer {
  padding: 10px 20px;
  border-top: 1px solid #f0f0f0;
  font-size:11px; color:#c0c4cc;
  text-align:center;
  background:#fafbfc;
}
</style>
