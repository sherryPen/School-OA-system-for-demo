/**
 * OA系统统一数据 Store
 * 所有业务数据集中管理 + localStorage 持久化
 * 解决：数据不同步、不持久化、权限缺失三大核心问题
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  workflowRecords as _records, workflowTemplates,
  announcements as _announcements,
  meetings as _meetings, meetingRooms as _meetingRooms,
  schedules as _schedules, semesters as _semesters, courses,
  grades as _grades, users, departments
} from '@/mock/data'

const STORAGE_KEY = 'oa_store_data'

// ========== 持久化工具 ==========
function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) { /* quota exceeded */ }
}
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

// ========== 深拷贝工具 ==========
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export const useOaStore = defineStore('oa', () => {
  // ======== 初始化：localStorage > mock数据 ========
  const saved = loadFromStorage()

  // -- 审批数据 --
  const workflowRecords = ref(saved?.workflowRecords || deepClone(_records))
  // -- 公告数据 --
  const announcements = ref(saved?.announcements || deepClone(_announcements))
  // -- 会议数据 --
  const meetingList = ref(saved?.meetingList || deepClone(_meetings))
  const meetingRooms = ref(deepClone(_meetingRooms)) // 会议室不需要持久化
  // -- 课表数据 --
  const schedules = ref(saved?.schedules || deepClone(_schedules))
  // -- 学期数据 --
  const semestersList = ref(saved?.semestersList || deepClone(_semesters))
  // -- 成绩数据 --
  const grades = ref(saved?.grades || deepClone(_grades))
  // -- 通知数据（统一管理） --
  const notifications = ref(saved?.notifications || [])
  // -- 公告已读状态 --
  const announcementReadStatus = ref(saved?.announcementReadStatus || {})

  // ======== 自动持久化 ========
  function persist() {
    saveToStorage({
      workflowRecords: workflowRecords.value,
      announcements: announcements.value,
      meetingList: meetingList.value,
      schedules: schedules.value,
      semestersList: semestersList.value,
      grades: grades.value,
      notifications: notifications.value,
      announcementReadStatus: announcementReadStatus.value
    })
  }

  // ================================================================
  //  流程审批
  // ================================================================

  /**
   * 审批节点→具体审批人ID映射
   * 规则：
   *   - 直属领导审批：申请人所在教研组的上级（教务处主任陈华），非教研组长本人
   *   - 部门领导审批：申请人部门的直属上级（行政→校领导李明，教研组→教务处主任）
   *   - 固定部门节点：对应该部门负责人
   */
  const nodeApproverMap = {
    '校长审批': [2],       // 李明
    '校办审批': [1],       // 张建国
    '教务处审批': [11],    // 陈华
    '财务处审批': [13],    // 黄磊
    '总务处审批': [14],    // 林峰
    '人事处备案': [12],    // 杨雪
    '自动审批（冲突检测）': [0]  // 系统自动
  }

  /** 教研组→直属领导（教务处主任陈华，不是教研组长自己） */
  const deptLeaderMap = {
    '语文教研组': [11],  // 教务处陈华（非教研组长刘伟）
    '数学教研组': [11],
    '英语教研组': [11],
    '物理教研组': [11],
    '化学教研组': [11],
    '生物教研组': [11],
    '历史教研组': [11],
    '信息中心': [11],
    '教务处': [2],       // 教务处的上级是校长李明
    '财务处': [2],
    '总务处': [2],
    '人事处': [2],
    '校领导办公室': [2],
    '高一(1)班': [11],   // 学生请假→教务处
    '高一(2)班': [11],
    '高一(3)班': [11],
    '高二(1)班': [11],
    '高二(2)班': [11],
    '高三(1)班': [11],
    '高三(2)班': [11]
  }

  /** 计算某个审批节点针对某申请人的具体审批人ID列表 */
  function getNodeApproverIds(nodeName, applicantId) {
    // 固定部门节点
    if (nodeApproverMap[nodeName]) return nodeApproverMap[nodeName]
    // 直属领导/部门领导：根据申请人部门映射
    if (nodeName === '直属领导审批' || nodeName === '部门领导审批') {
      const applicant = users.find(u => u.id === applicantId)
      const dept = applicant?.deptName || ''
      return deptLeaderMap[dept] || [2] // 默认校长
    }
    return [] // 未知节点
  }

  /** 为审批记录计算所有节点的审批人信息 */
  function buildNodeApprovers(templateId, applicantId) {
    const tpl = workflowTemplates.find(t => t.id === templateId)
    if (!tpl) return {}
    const map = {}
    tpl.nodes.forEach(node => {
      map[node] = getNodeApproverIds(node, applicantId)
    })
    return map
  }

  /** 新增审批记录 */
  function addWorkflowRecord(record) {
    // 自动计算并注入 nodeApprovers
    if (!record.nodeApprovers) {
      record.nodeApprovers = buildNodeApprovers(record.templateId, record.applicantId)
    }
    workflowRecords.value.push(record)
    persist()
  }

  /** 审批操作（增加权限校验） */
  function approveWorkflow(recordId, approve, userId, userName, userDept) {
    const row = workflowRecords.value.find(r => r.id === recordId)
    if (!row) return
    if (row.status !== '审批中') return

    const currentNode = row.currentNode || ''
    const nodeApprovers = row.nodeApprovers || {}

    // ====== 权限校验：当前用户必须是该节点的审批人 ======
    const approverIds = nodeApprovers[currentNode] || []
    // 管理员/领导可以审批任何节点
    const user = users.find(u => u.id === userId)
    const isAdminOrLeader = user && ['系统管理员', '学校领导'].includes(user.roleName)
    if (!isAdminOrLeader && approverIds.length > 0 && !approverIds.includes(userId)) {
      return // 无权审批，静默拒绝
    }

    const result = approve ? '已通过' : '已驳回'
    const tpl = workflowTemplates.find(t => t.name === row.type)

    // 记录当前节点的审批历史
    const timeStr = new Date().toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).replace(/\//g, '-')

    if (!row.approveHistory) row.approveHistory = []
    row.approveHistory.push({
      node: currentNode || (approve ? '最终审批' : '审批节点'),
      handler: userName,
      time: timeStr,
      result: approve ? '通过' : '驳回',
      comment: approve ? '同意' : '不同意',
      dept: userDept
    })

    // 推进到下一节点
    if (tpl) {
      const currentIdx = tpl.nodes.findIndex(n =>
        currentNode.includes(n) || n.includes(currentNode)
      )
      if (approve && currentIdx >= 0 && currentIdx < tpl.nodes.length - 1) {
        const nextNode = tpl.nodes[currentIdx + 1]
        row.currentNode = nextNode
        row.currentNodeDisplay = nextNode
        // 通知下一节点审批人
        const nextApproverIds = nodeApprovers[nextNode] || []
        if (nextApproverIds.length > 0 && nextApproverIds[0] !== 0) {
          addNotification({
            type: 'approval', title: '待审批',
            desc: `${row.applicant}的${row.type}流转至${nextNode}，等待您审批`,
            path: `/workflow/detail/${row.id}`,
            userIds: nextApproverIds
          })
        }
      } else {
        row.currentNode = ''
        row.currentNodeDisplay = ''
        row.status = result
        // 通知申请人最终结果
        addNotification({
          type: 'approval',
          title: approve ? '审批通过' : '审批驳回',
          desc: `您的${row.type}已${result}`,
          path: `/workflow/detail/${row.id}`,
          userIds: [row.applicantId]
        })
      }
    } else {
      row.status = result
      row.currentNode = ''
    }

    // 驳回通知
    if (!approve) {
      addNotification({
        type: 'approval', title: '审批驳回',
        desc: `${row.type}已被${userName}驳回`,
        path: `/workflow/detail/${row.id}`,
        userIds: [row.applicantId]
      })
    }

    persist()
  }

  /** 获取与我相关的审批记录 */
  function getMyWorkflowRecords(userId, roleName, deptName) {
    return workflowRecords.value.filter(r => {
      // 自己申请的
      if (r.applicantId === userId) return true
      // 管理员/领导看全部
      if (['系统管理员', '学校领导'].includes(roleName)) return true
      // 该记录有我参与审批的节点（当前或历史）
      const nodeApprovers = r.nodeApprovers || {}
      const allApproverIds = Object.values(nodeApprovers).flat()
      if (allApproverIds.includes(userId)) return true
      // 兼容旧数据：行政人员按部门匹配
      if (roleName === '行政人员') {
        if (r.currentNode?.includes('教务处') && deptName === '教务处') return true
        if (r.currentNode?.includes('财务处') && deptName === '财务处') return true
        if (r.currentNode?.includes('总务处') && deptName === '总务处') return true
        if (r.currentNode?.includes('人事处') && deptName === '人事处') return true
        if (r.currentNode?.includes('校办') && deptName === '校领导办公室') return true
      }
      return false
    })
  }

  /** 获取待办审批（精确到具体审批人） */
  function getMyPendingRecords(userId, roleName, deptName) {
    return workflowRecords.value.filter(r => {
      if (r.status !== '审批中') return false
      const currentNode = r.currentNode || ''
      const nodeApprovers = r.nodeApprovers || {}

      // 优先：检查当前节点的审批人列表是否包含我
      const currentApproverIds = nodeApprovers[currentNode] || []
      if (currentApproverIds.includes(userId)) return true

      // 管理员/领导可以审批任何节点
      if (['系统管理员', '学校领导'].includes(roleName)) return true

      // 兼容旧数据：行政人员按部门名匹配
      if (roleName === '行政人员') {
        if (currentNode.includes('教务处') && deptName === '教务处') return true
        if (currentNode.includes('财务处') && deptName === '财务处') return true
        if (currentNode.includes('总务处') && deptName === '总务处') return true
        if (currentNode.includes('人事处') && deptName === '人事处') return true
        if (currentNode.includes('校办') && deptName === '校领导办公室') return true
      }

      return false
    })
  }

  // ================================================================
  //  通知公告
  // ================================================================

  /** 新增公告 */
  function addAnnouncement(data) {
    announcements.value.unshift(data)
    persist()
  }

  /** 按角色过滤公告 */
  function getVisibleAnnouncements(roleName, deptName) {
    if (['系统管理员', '学校领导'].includes(roleName)) {
      return announcements.value
    }
    return announcements.value.filter(a => {
      if (a.scope === '全校') return true
      if (a.scope?.includes(roleName)) return true
      if (a.scope?.includes(deptName)) return true
      if (a.scope?.includes('高一师生') && deptName?.startsWith('高一')) return true
      if (a.scope?.includes('高二师生') && deptName?.includes('高二')) return true
      if (a.scope?.includes('高三师生') && deptName?.includes('高三')) return true
      if (a.scope?.includes('全校学生') && roleName === '学生') return true
      if (a.scope?.includes('教职工') && roleName !== '学生') return true
      return false
    })
  }

  /** 公告已读/未读 */
  function isAnnouncementRead(announcementId, userId) {
    return announcementReadStatus.value[`${userId}_${announcementId}`] || false
  }
  function markAnnouncementRead(announcementId, userId) {
    announcementReadStatus.value[`${userId}_${announcementId}`] = true
    // 阅读量+1
    const ann = announcements.value.find(a => a.id === announcementId)
    if (ann) ann.readCount = (ann.readCount || 0) + 1
    persist()
  }
  function markAllAnnouncementsRead(userId) {
    announcements.value.forEach(a => {
      announcementReadStatus.value[`${userId}_${a.id}`] = true
    })
    persist()
  }

  // ================================================================
  //  会议管理
  // ================================================================

  /** 新增会议 */
  function addMeeting(data) {
    meetingList.value.unshift(data)
    persist()
  }

  /** 按角色过滤会议 */
  function getVisibleMeetings(roleName, userName) {
    if (['系统管理员', '学校领导', '行政人员'].includes(roleName)) {
      return meetingList.value
    }
    if (roleName === '教师') {
      return meetingList.value.filter(m =>
        m.attendees?.includes(userName) || m.organizerId === null
      )
    }
    // 学生不可见
    return []
  }

  // ================================================================
  //  课程管理
  // ================================================================

  /** 保存课表 */
  function saveScheduleRecords(classId, semesterId, newRecords) {
    // 先删旧记录
    schedules.value = schedules.value.filter(
      s => !(s.classId === classId && s.semesterId === semesterId)
    )
    // 加入新记录
    newRecords.forEach(r => schedules.value.push(r))
    persist()
  }

  /** 发布课表 */
  function publishSchedule(classId, semesterId) {
    schedules.value
      .filter(s => s.classId === classId && s.semesterId === semesterId)
      .forEach(s => { s.status = '已发布' })
    persist()
  }

  /** 获取已发布课表（教师/学生可见） */
  function getPublishedSchedules(classId, semesterId) {
    return schedules.value.filter(s =>
      s.classId === classId && s.semesterId === semesterId && s.status === '已发布'
    )
  }

  /** 学期管理 */
  function addSemester(data) {
    semestersList.value.push(data)
    persist()
  }
  function updateSemester(id, data) {
    const idx = semestersList.value.findIndex(s => s.id === id)
    if (idx > -1) {
      Object.assign(semestersList.value[idx], data)
      persist()
    }
  }
  function deleteSemester(id) {
    const idx = semestersList.value.findIndex(s => s.id === id)
    if (idx > -1) {
      semestersList.value.splice(idx, 1)
      persist()
    }
  }
  function activateSemester(id) {
    semestersList.value.forEach(s => {
      if (s.status === '进行中') s.status = '已结束'
    })
    const sem = semestersList.value.find(s => s.id === id)
    if (sem) sem.status = '进行中'
    persist()
  }
  function endSemester(id) {
    const sem = semestersList.value.find(s => s.id === id)
    if (sem) sem.status = '已结束'
    persist()
  }

  /** 自动判断学期状态 */
  function autoUpdateSemesterStatus() {
    const now = new Date()
    semestersList.value.forEach(s => {
      if (s.status === '进行中') {
        const end = new Date(s.endDate)
        if (now > end) s.status = '已结束'
      }
    })
    persist()
  }

  // ================================================================
  //  成绩管理
  // ================================================================

  /** 教研组→学科映射 */
  const deptSubjectMap = {
    '语文教研组': '语文', '数学教研组': '数学', '英语教研组': '英语',
    '物理教研组': '物理', '化学教研组': '化学', '生物教研组': '生物',
    '历史教研组': '历史', '信息中心': '信息技术'
  }

  /** 学科→负责班级ID映射（从课表数据动态计算） */
  const subjectClassMap = computed(() => {
    const map = {}
    const published = schedules.value.filter(s => s.status === '已发布')
    published.forEach(s => {
      if (!map[s.courseName]) map[s.courseName] = new Set()
      map[s.courseName].add(s.classId)
    })
    // 如果没有已发布课表，回退到默认映射
    if (Object.keys(map).length === 0) {
      return {
        '语文': [7, 8, 10], '数学': [7, 8, 10], '英语': [7, 8, 10],
        '物理': [7, 10], '化学': [7, 10], '生物': [7], '历史': [7, 10]
      }
    }
    // Set → Array
    const result = {}
    Object.entries(map).forEach(([k, v]) => { result[k] = [...v] })
    return result
  })

  /** 获取教师负责的班级 */
  function getTeacherClasses(deptName) {
    const subject = deptSubjectMap[deptName]
    if (!subject) return []
    const classIds = subjectClassMap.value[subject] || []
    return departments.filter(d => d.type === '班级' && classIds.includes(d.id))
  }

  /** 按权限过滤成绩 */
  function getVisibleGrades(user) {
    const roleName = user?.roleName
    const deptName = user?.deptName
    const userId = user?.id

    if (roleName === '学生') {
      return grades.value.filter(g => g.status === '已发布' && g.studentId === userId)
    }
    if (roleName === '教师') {
      const subject = deptSubjectMap[deptName]
      if (!subject) return []
      const allowedClassIds = (subjectClassMap.value[subject] || []).map(String)
      return grades.value.filter(g => {
        if (g.courseName !== subject) return false
        // 过滤班级
        const student = users.find(u => u.id === g.studentId)
        if (student && allowedClassIds.includes(String(student.deptId))) return true
        return false
      })
    }
    // 管理员看全部
    return grades.value
  }

  /** 更新成绩 */
  function updateGrade(id, data) {
    const g = grades.value.find(g => g.id === id)
    if (g) Object.assign(g, data)
    persist()
  }

  /** 批量发布成绩 */
  function publishGrades(semester, courseName, user) {
    const roleName = user?.roleName
    const deptName = user?.deptName
    let targets = grades.value.filter(g =>
      g.semester === semester && g.courseName === courseName && g.status === '待发布'
    )
    if (roleName === '教师') {
      const subject = deptSubjectMap[deptName]
      targets = targets.filter(t => t.courseName === subject)
    }
    targets.forEach(g => { g.status = '已发布' })
    persist()
    return targets.length
  }

  /** 成绩统计（按班级分组） */
  function getGradeStats(semester, examType, user) {
    const roleName = user?.roleName
    const deptName = user?.deptName
    let published = grades.value.filter(g =>
      g.status === '已发布' && g.semester === semester && g.examType === examType
    )
    if (roleName === '教师') {
      const subject = deptSubjectMap[deptName]
      published = published.filter(g => g.courseName === subject)
    }
    // 按学科+班级分组
    const grouped = {}
    published.forEach(g => {
      const student = users.find(u => u.id === g.studentId)
      const className = departments.find(d => d.id === student?.deptId)?.name || '未知班级'
      const key = `${g.courseName}（${className}）`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(g.score)
    })
    return Object.entries(grouped).map(([key, scores]) => ({
      label: key,
      avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
      max: Math.max(...scores),
      min: Math.min(...scores),
      passRate: ((scores.filter(s => s >= 60).length / scores.length) * 100).toFixed(1),
      count: scores.length
    }))
  }

  // ================================================================
  //  通知系统（统一管理）
  // ================================================================

  /** 添加通知 */
  function addNotification({ type, title, desc, path, userIds }) {
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    notifications.value.unshift({
      id, type, title, desc, path,
      time: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      read: false,
      userIds: userIds || null, // null=所有人可见
      createdAt: Date.now()
    })
    // 最多保留50条
    if (notifications.value.length > 50) {
      notifications.value = notifications.value.slice(0, 50)
    }
    persist()
  }

  /** 获取可见通知 */
  function getVisibleNotifications(userId, roleName, deptName) {
    return notifications.value.filter(n => {
      if (!n.userIds) return true // 全局通知
      return n.userIds.includes(userId) || 
             (n.userIds.includes('admin') && ['系统管理员', '学校领导'].includes(roleName)) ||
             (n.userIds.includes('dept:' + deptName))
    })
  }

  /** 标记已读 */
  function markNotificationRead(notifId) {
    const n = notifications.value.find(n => n.id === notifId)
    if (n) n.read = true
    persist()
  }

  /** 全部已读 */
  function markAllNotificationsRead() {
    notifications.value.forEach(n => { n.read = true })
    persist()
  }

  /** 获取未读数 */
  function getUnreadCount(userId, roleName, deptName) {
    return getVisibleNotifications(userId, roleName, deptName).filter(n => !n.read).length
  }

  /** 初始化默认通知（首次使用时） */
  function initDefaultNotifications(userId, roleName, deptName) {
    if (notifications.value.length > 0) return // 已有通知不重复生成

    // 全局通知
    addNotification({
      type: 'announcement', title: '新公告发布',
      desc: '关于劳动节放假安排的通知已发布',
      path: '/announcement/detail/18', userIds: null
    })
    addNotification({
      type: 'meeting', title: '会议提醒',
      desc: '高考工作协调会将于明天09:00在大会议室召开',
      path: '/meeting', userIds: null
    })

    // 管理员/领导专属
    if (['系统管理员', '学校领导'].includes(roleName)) {
      addNotification({
        type: 'approval', title: '待审批',
        desc: '赵敏提交了请假申请，等待您审批',
        path: '/workflow/detail/6', userIds: [1, 2, 3]
      })
    }
    // 教务处
    if (deptName === '教务处') {
      addNotification({
        type: 'system', title: '课表待审核',
        desc: '高一(3)班课表已提交，请审核后发布',
        path: '/course', userIds: [11, 46]
      })
    }
  }

  // ================================================================
  //  重置（开发调试用）
  // ================================================================
  function resetAll() {
    localStorage.removeItem(STORAGE_KEY)
    workflowRecords.value = deepClone(_records)
    announcements.value = deepClone(_announcements)
    meetingList.value = deepClone(_meetings)
    schedules.value = deepClone(_schedules)
    semestersList.value = deepClone(_semesters)
    grades.value = deepClone(_grades)
    notifications.value = []
    announcementReadStatus.value = {}
    persist()
  }

  // 启动时自动更新学期状态
  autoUpdateSemesterStatus()

  return {
    // 数据
    workflowRecords, announcements, meetingList, meetingRooms,
    schedules, semestersList, grades, notifications, announcementReadStatus,
    // 持久化
    persist,
    // 流程审批
    addWorkflowRecord, approveWorkflow, getMyWorkflowRecords, getMyPendingRecords,
    getNodeApproverIds, buildNodeApprovers, nodeApproverMap, deptLeaderMap,
    // 通知公告
    addAnnouncement, getVisibleAnnouncements,
    isAnnouncementRead, markAnnouncementRead, markAllAnnouncementsRead,
    // 会议
    addMeeting, getVisibleMeetings,
    // 课程
    saveScheduleRecords, publishSchedule, getPublishedSchedules,
    addSemester, updateSemester, deleteSemester, activateSemester, endSemester,
    autoUpdateSemesterStatus,
    // 成绩
    getVisibleGrades, updateGrade, publishGrades, getGradeStats,
    getTeacherClasses, deptSubjectMap, subjectClassMap,
    // 通知系统
    addNotification, getVisibleNotifications, markNotificationRead,
    markAllNotificationsRead, getUnreadCount, initDefaultNotifications,
    // 调试
    resetAll
  }
})
