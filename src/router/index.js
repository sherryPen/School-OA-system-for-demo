import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/views/layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '首页', icon: 'HomeFilled' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人信息', icon: 'User' }
      },
      {
        path: 'announcement',
        name: 'Announcement',
        component: () => import('@/views/announcement/index.vue'),
        meta: { title: '通知公告', icon: 'Bell' }
      },
      {
        path: 'announcement/detail/:id',
        name: 'AnnouncementDetail',
        component: () => import('@/views/announcement/detail.vue'),
        meta: { title: '公告详情', hidden: true }
      },
      {
        path: 'workflow',
        name: 'Workflow',
        component: () => import('@/views/workflow/index.vue'),
        meta: { title: '流程审批', icon: 'DocumentChecked' }
      },
      {
        path: 'workflow/apply/:type?',
        name: 'WorkflowApply',
        component: () => import('@/views/workflow/apply.vue'),
        meta: { title: '发起申请', hidden: true }
      },
      {
        path: 'workflow/detail/:id',
        name: 'WorkflowDetail',
        component: () => import('@/views/workflow/detail.vue'),
        meta: { title: '审批详情', hidden: true }
      },
      {
        path: 'meeting',
        name: 'Meeting',
        component: () => import('@/views/meeting/index.vue'),
        meta: { title: '会议管理', icon: 'Calendar' }
      },
      {
        path: 'course',
        name: 'Course',
        component: () => import('@/views/course/index.vue'),
        meta: { title: '课程管理', icon: 'Reading' }
      },
      {
        path: 'grade',
        name: 'Grade',
        component: () => import('@/views/grade/index.vue'),
        meta: { title: '成绩管理', icon: 'DataAnalysis' }
      },
      {
        path: 'user',
        name: 'UserManage',
        component: () => import('@/views/user/index.vue'),
        meta: { title: '用户管理', icon: 'UserFilled', roles: ['系统管理员', '学校领导'] }
      },
      {
        path: 'system',
        name: 'System',
        component: () => import('@/views/system/index.vue'),
        meta: { title: '系统管理', icon: 'Setting', roles: ['系统管理员'] }
      },
      {
        path: 'help',
        name: 'HelpCenter',
        component: () => import('@/views/help/index.vue'),
        meta: { title: '帮助中心', icon: 'ChatDotRound' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (to.path !== '/login' && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
