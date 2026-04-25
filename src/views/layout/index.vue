<template>
  <div class="layout-container">
    <!-- 顶部导航 -->
    <header class="layout-header">
      <div class="logo">
        <div class="logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span class="logo-text">中山中学 · <span class="logo-sub">OA办公系统</span></span>
      </div>
      <div class="header-right">
        <!-- 消息铃铛 -->
        <el-tooltip content="消息通知" placement="bottom">
          <div class="header-notification" @click="toggleNotifPanel">
            <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
              <el-icon :size="20" style="color: #c8d0e0;"><Bell /></el-icon>
            </el-badge>
          </div>
        </el-tooltip>
        <!-- 顶部通知弹出面板 -->
        <transition name="panel-fade">
          <div v-show="notifVisible" class="header-notif-panel" v-click-outside="closeNotifPanel">
            <div class="panel-header">
              <h4>🔔 消息通知</h4>
              <el-button text type="primary" size="small" @click="markAllRead">全部已读</el-button>
            </div>
            <div class="panel-list" v-if="notifications.length > 0">
              <div v-for="item in notifications" :key="item.id"
                   class="panel-item" :class="{ unread: !item.read }"
                   @click="handleNotifClick(item)">
                <div class="pi-icon" :class="item.type"><el-icon :size="14"><component :is="iconMap[item.type] || 'Bell'" /></el-icon></div>
                <div class="pi-body">
                  <div class="pi-title">{{ item.title }}</div>
                  <div class="pi-desc">{{ item.desc }}</div>
                  <div class="pi-time">{{ item.time }}</div>
                </div>
                <div v-if="!item.read" class="pi-dot"></div>
              </div>
            </div>
            <div v-else class="empty-panel">
              <p>暂无新通知 ✨</p>
            </div>
          </div>
        </transition>

        <!-- 用户信息 -->
        <el-dropdown @command="handleCommand">
          <div class="user-info hover-lift">
            <el-avatar :size="34" :style="{ background: avatarGradient }">{{ userStore.currentUser?.name?.charAt(0) }}</el-avatar>
            <span class="user-name">{{ userStore.currentUser?.name }}</span>
            <el-icon style="font-size:12px;"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile"><el-icon><User /></el-icon>个人信息</el-dropdown-item>
              <el-dropdown-item command="password"><el-icon><Lock /></el-icon>修改密码</el-dropdown-item>
              <el-dropdown-item divided command="logout"><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="layout-body">
      <!-- 侧边栏 -->
      <aside class="layout-aside animate-fadeInLeft">
        <div class="aside-user">
          <el-avatar :size="44" :style="{ background: avatarGradient }">{{ userStore.currentUser?.name?.charAt(0) }}</el-avatar>
          <div class="aside-user-info">
            <div class="aside-user-name">{{ userStore.currentUser?.name }}</div>
            <div class="aside-user-role">{{ userStore.currentUser?.roleName }} · {{ userStore.currentUser?.deptName }}</div>
          </div>
        </div>
        <el-menu :default-active="activeMenu" router background-color="transparent" text-color="#8b95a8" active-text-color="#4a6cf7">
          <el-menu-item index="/dashboard">
            <el-icon><HomeFilled /></el-icon><span>首页</span>
          </el-menu-item>
          <el-menu-item index="/profile">
            <el-icon><User /></el-icon><span>个人信息</span>
          </el-menu-item>
          <el-menu-item index="/announcement">
            <el-icon><Bell /></el-icon><span>通知公告</span>
          </el-menu-item>
          <el-sub-menu index="workflow-menu">
            <template #title><el-icon><DocumentChecked /></el-icon><span>流程审批</span></template>
            <el-menu-item index="/workflow">审批列表</el-menu-item>
            <el-menu-item index="/workflow/apply">发起申请</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/meeting">
            <el-icon><Calendar /></el-icon><span>会议管理</span>
          </el-menu-item>
          <el-menu-item index="/course">
            <el-icon><Reading /></el-icon><span>课程管理</span>
          </el-menu-item>
          <el-menu-item index="/grade">
            <el-icon><DataAnalysis /></el-icon><span>成绩管理</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.hasRole(['系统管理员', '学校领导'])" index="/user">
            <el-icon><UserFilled /></el-icon><span>用户管理</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.hasRole(['系统管理员'])" index="/system">
            <el-icon><Setting /></el-icon><span>系统管理</span>
          </el-menu-item>
          <el-menu-item index="/help">
            <el-icon><ChatDotRound /></el-icon><span>帮助中心</span>
          </el-menu-item>
        </el-menu>
      </aside>

      <!-- 主内容区（带页面过渡动画） -->
      <main class="layout-main">
        <router-view v-slot="{ Component }">
          <transition name="page-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- 右侧贴边浮窗通知 -->
    <NotificationDrawer />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessageBox, ElMessage } from 'element-plus'
import NotificationDrawer from '@/components/NotificationDrawer.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// ========== 头像渐变（根据角色） ==========
const avatarGradient = computed(() => {
  const role = userStore.currentUser?.roleName
  const gradients = {
    '系统管理员': 'linear-gradient(135deg, #ef4444, #dc2626)',
    '学校领导': 'linear-gradient(135deg, #f59e0b, #d97706)',
    '行政人员': 'linear-gradient(135deg, #64748b, #475569)',
    '教师': 'linear-gradient(135deg, #4a6cf7, #6366f1)',
    '学生': 'linear-gradient(135deg, #11998e, #059669)'
  }
  return gradients[role] || 'linear-gradient(135deg, #4a6cf7, #6366f1)'
})

// ========== 菜单激活状态 ==========
const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/workflow/apply')) return '/workflow/apply'
  if (path.startsWith('/workflow/detail')) return '/workflow'
  if (path.startsWith('/workflow')) return '/workflow'
  return path
})

// ========== 通知面板（角色过滤 + localStorage持久化）==========
const notifVisible = ref(false)
const iconMap = { approval: 'DocumentChecked', announcement: 'Bell', meeting: 'Calendar', system: 'Setting' }

// localStorage key 前缀
const STORAGE_KEY_PREFIX = 'oa_notif_'

// 根据当前用户生成个性化通知数据
function generateNotifications() {
  const userId = userStore.currentUser?.id
  const userName = userStore.currentUser?.name
  const roleName = userStore.currentUser?.roleName
  const deptName = userStore.currentUser?.deptName

  // 基础通知模板（所有用户都有）
  const baseNotifications = [
    {
      id: `sys-${userId}-1`, type: 'announcement',
      title: '新公告发布', desc: '关于劳动节放假安排的通知已发布',
      time: '1小时前', read: false,
      path: '/announcement/detail/18', forRoles: ['all']
    },
    {
      id: `sys-${userId}-2`, type: 'meeting',
      title: '会议提醒', desc: '高考工作协调会将于明天09:00在大会议室召开',
      time: '2小时前', read: false,
      path: '/meeting', forRoles: ['all']
    }
  ]

  // 根据角色添加专属通知
  const roleNotifications = []

  // 管理员/领导：待审批通知
  if (['系统管理员', '学校领导'].includes(roleName)) {
    roleNotifications.push(
      { id: `${userId}-a1`, type: 'approval', title: '待审批', desc: '赵敏提交了请假申请，等待您审批', time: '10分钟前', read: false, path: '/workflow/detail/6', forRoles: ['admin', 'leader'] },
      { id: `${userId}-a2`, type: 'approval', title: '待审批', desc: '孙涛提交了报销申请，等待您审批', time: '30分钟前', read: false, path: '/workflow/detail/26', forRoles: ['admin', 'leader'] },
      { id: `${userId}-a3`, type: 'approval', title: '待审批', desc: '曹红提交了教务处采购申请，等待您审批', time: '1小时前', read: false, path: '/workflow/detail/40', forRoles: ['admin', 'leader'] }
    )
  }

  // 教务处行政：调课/课表相关
  if (deptName === '教务处') {
    roleNotifications.push(
      { id: `${userId}-j1`, type: 'system', title: '课表待审核', desc: '高一(3)班课表已提交，请审核后发布', time: '30分钟前', read: false, path: '/course', forRoles: ['admin_jwc'] },
      { id: `${userId}-j2`, type: 'approval', title: '待审批', desc: '黄海提交了数学调课申请', time: '2小时前', read: false, path: '/workflow/detail/39', forRoles: ['admin_jwc'] }
    )
  }

  // 教师：与自己相关的审批结果 + 教学通知
  if (roleName === '教师') {
    roleNotifications.push(
      { id: `${userId}-t1`, type: 'approval', title: '审批通过', desc: '您参与的教研活动申请已通过', time: '昨天 16:00', read: true, path: '/workflow', forRoles: ['teacher'] },
      { id: `${userId}-t2`, type: 'announcement', title: '教学通知', desc: '期中考试考务会议将于下周召开，请准时参加', time: '昨天 09:00', read: false, path: '/announcement/detail/17', forRoles: ['teacher'] }
    )
  }

  // 学生：成绩/考试相关
  if (roleName === '学生') {
    roleNotifications.push(
      { id: `${userId}-s1`, type: 'announcement', title: '考试成绩发布', desc: '期中考试成绩已发布，可前往查看', time: '今天 08:00', read: false, path: '/grade', forRoles: ['student'] },
      { id: `${userId}-s2`, type: 'meeting', title: '家长会通知', desc: '高一年级家长会定于本周六召开', time: '2天前', read: true, path: '/announcement/detail/19', forRoles: ['student'] }
    )
  }

  // 合并所有通知
  const allNotifs = [...baseNotifications, ...roleNotifications]

  // 从localStorage读取已读状态
  const savedReadState = loadReadState(userId)
  allNotifs.forEach(n => {
    n.read = savedReadState[n.id] || n.read || false
  })

  return allNotifs
}

const notifications = ref([])

// 初始化通知
onMounted(() => {
  notifications.value = generateNotifications()
})

// 当用户切换时重新生成通知（实际项目中不需要）
watch(() => userStore.currentUser?.id, () => {
  notifications.value = generateNotifications()
}, { immediate: true })

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

function toggleNotifPanel() {
  notifVisible.value = !notifVisible.value
}

function closeNotifPanel() {
  notifVisible.value = false
}

function handleNotifClick(item) {
  markAsRead(item)
  notifVisible.value = false
  if (item.path) router.push(item.path)
}

function markAllRead() {
  const userId = userStore.currentUser?.id
  notifications.value.forEach(n => { n.read = true })
  saveReadState(userId)
  ElMessage.success('已全部标记为已读')
}

function markAsRead(item) {
  item.read = true
  const userId = userStore.currentUser?.id
  saveReadState(userId)
}

// ======== localStorage 持久化 ========
function saveReadState(userId) {
  try {
    const state = {}
    notifications.value.forEach(n => { state[n.id] = n.read })
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(state))
  } catch (e) {}
}

function loadReadState(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch (e) { return {} }
}

// ======== 用户操作 ========
function handleCommand(cmd) {
  if (cmd === 'profile') router.push('/profile')
  else if (cmd === 'password') ElMessage.info('Demo系统暂不支持修改密码')
  else if (cmd === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).then(() => {
      userStore.logout()
      router.push('/login')
    }).catch(() => {})
  }
}
</script>

<style scoped>
/* 面板过渡 */
.panel-fade-enter-active { transition: all 0.25s cubic-bezier(0.22,1,0.36,1); }
.panel-fade-leave-active { transition: all 0.15s ease; }
.panel-fade-enter-from { opacity: 0; transform: translateY(-8px) scale(0.96); }
.panel-fade-leave-to { opacity: 0; transform: translateY(-8px) scale(0.96); }

/* 页面切换动画 */
.page-slide-enter-active { transition: all 0.3s cubic-bezier(0.22,1,0.36,1); }
.page-slide-leave-active { transition: all 0.2s ease; }
.page-slide-enter-from { opacity: 0; transform: translateX(20px); }
.page-slide-leave-to { opacity: 0; transform: translateX(-20px); }

/* 侧边栏入场 */
.animate-fadeInLeft {
  animation: fadeInLeft 0.45s ease both;
}
@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
