/**
 * Prompt 构建工具
 * 
 * 负责：知识库注入、用户上下文注入、OA实时数据注入、快捷指令解析
 */

import { knowledgeBase } from '@/data/knowledge-base'

// ========== 快捷指令定义 ==========
export const slashCommands = [
  { cmd: '/待办', desc: '查看我的待办事项', icon: 'DocumentChecked' },
  { cmd: '/会议', desc: '查看今日会议安排', icon: 'Calendar' },
  { cmd: '/课表', desc: '查看本周课表', icon: 'Reading' },
  { cmd: '/成绩', desc: '查看成绩概览', icon: 'DataAnalysis' },
  { cmd: '/请假', desc: '了解请假规则', icon: 'Calendar' },
  { cmd: '/报销', desc: '了解差旅报销标准', icon: 'Wallet' },
  { cmd: '/帮助', desc: '查看可用指令列表', icon: 'QuestionFilled' }
]

// ========== 构建知识库文本 ==========
function buildKnowledgeText() {
  return knowledgeBase.map(doc => {
    return `---【${doc.title}】---\n${doc.content}`
  }).join('\n\n')
}

// ========== 构建用户上下文 ==========
function buildUserContext(user) {
  if (!user) return '未登录用户'
  const roleName = user.roleName || '未知'
  const deptName = user.deptName || '未知部门'
  const name = user.name || '未知'
  return `姓名：${name}，角色：${roleName}，部门：${deptName}，用户ID：${user.id}`
}

// ========== 构建OA实时数据概览（从store获取真实数据） ==========
function buildSystemOverview(user, oaStore) {
  if (!user || !oaStore) return ''

  const roleName = user.roleName
  const deptName = user.deptName
  const userName = user.name
  const userId = user.id

  let overview = '\n## 当前OA系统实时数据\n'

  // ---- 待办审批 ----
  const myPending = oaStore.getMyPendingRecords(userId, roleName, deptName)
  if (myPending.length > 0) {
    overview += `\n### 待办审批（${myPending.length}项）\n`
    myPending.slice(0, 8).forEach(r => {
      overview += `- ${r.type} | 申请人：${r.applicant} | 状态：${r.status} | 当前节点：${r.currentNode || '无'} | 时间：${r.applyTime}\n`
    })
    if (myPending.length > 8) overview += `...还有${myPending.length - 8}项\n`
  } else {
    overview += '\n### 待办审批\n暂无待办审批\n'
  }

  // ---- 我的申请 ----
  const myRecords = oaStore.getMyWorkflowRecords(userId, roleName, deptName)
  const myApplications = myRecords.filter(r => r.applicantId === userId)
  if (myApplications.length > 0) {
    overview += `\n### 我的申请（${myApplications.length}项）\n`
    myApplications.slice(0, 5).forEach(r => {
      overview += `- ${r.type} | 状态：${r.status} | 当前节点：${r.currentNode || '已完成'} | 时间：${r.applyTime}\n`
    })
  }

  // ---- 通知公告 ----
  const visibleAnnouncements = oaStore.getVisibleAnnouncements(roleName, deptName)
  const unreadAnnouncements = visibleAnnouncements.filter(a => !oaStore.isAnnouncementRead(a.id, userId))
  overview += `\n### 通知公告\n`
  overview += `- 可见公告：${visibleAnnouncements.length}条，未读：${unreadAnnouncements.length}条\n`
  visibleAnnouncements.slice(0, 3).forEach(a => {
    const readTag = oaStore.isAnnouncementRead(a.id, userId) ? '已读' : '未读'
    overview += `  - [${readTag}] ${a.title} | ${a.priority} | ${a.publisher} | ${a.publishTime}\n`
  })

  // ---- 会议 ----
  const visibleMeetings = oaStore.getVisibleMeetings(roleName, userName)
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const todayMeetings = visibleMeetings.filter(m => m.startTime?.startsWith(todayStr))
  overview += `\n### 会议安排\n`
  overview += `- 今日会议：${todayMeetings.length}场，全部可见会议：${visibleMeetings.length}场\n`
  todayMeetings.slice(0, 3).forEach(m => {
    overview += `  - ${m.title} | 时间：${m.startTime}~${m.endTime} | 地点：${m.location || '待定'}\n`
  })

  // ---- 课表（教师/学生/教务） ----
  if (['教师', '学生', '行政人员'].includes(roleName)) {
    const currentSemester = oaStore.semestersList.find(s => s.status === '进行中')
    overview += `\n### 课表信息\n`
    if (currentSemester) {
      overview += `- 当前学期：${currentSemester.name}（${currentSemester.startDate} ~ ${currentSemester.endDate}）\n`
      const publishedSchedules = oaStore.schedules.filter(s =>
        s.semesterId === currentSemester.id && s.status === '已发布'
      )
      if (roleName === '教师') {
        // 该教师的课表
        const mySubject = oaStore.deptSubjectMap[deptName]
        if (mySubject) {
          const myClasses = oaStore.subjectClassMap[mySubject] || []
          const mySchedules = publishedSchedules.filter(s =>
            s.courseName === mySubject && myClasses.includes(s.classId)
          )
          overview += `- 任教学科：${mySubject}，负责班级：${myClasses.length}个，已发布课时：${mySchedules.length}节\n`
          const todaySchedule = mySchedules.filter(s => {
            const dayMap = { 0: '周日', 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六' }
            return s.dayOfWeek === dayMap[today.getDay()]
          })
          if (todaySchedule.length > 0) {
            overview += `- 今日课程：\n`
            todaySchedule.forEach(s => {
              overview += `  - 第${s.period}节 ${s.courseName}（班级ID:${s.classId}）\n`
            })
          }
        }
      }
    } else {
      overview += `- 当前无进行中的学期\n`
    }
  }

  // ---- 成绩（教师/学生） ----
  if (['教师', '学生'].includes(roleName)) {
    const visibleGrades = oaStore.getVisibleGrades(user)
    const publishedGrades = visibleGrades.filter(g => g.status === '已发布')
    const pendingGrades = visibleGrades.filter(g => g.status === '待发布')
    overview += `\n### 成绩信息\n`
    overview += `- 可见成绩：${visibleGrades.length}条，已发布：${publishedGrades.length}条，待发布：${pendingGrades.length}条\n`
    if (roleName === '教师') {
      const subject = oaStore.deptSubjectMap[deptName]
      if (subject) {
        const statResults = oaStore.getGradeStats('2024-2025学年第二学期', '期中考试', user)
        if (statResults.length > 0) {
          overview += `- 期中成绩统计：\n`
          statResults.forEach(s => {
            overview += `  - ${s.label}：均分${s.avg}，最高${s.max}，及格率${s.passRate}%\n`
          })
        }
      }
    }
  }

  // ---- 学期管理（教务/管理员） ----
  if (['系统管理员', '学校领导', '行政人员'].includes(roleName)) {
    overview += `\n### 学期管理\n`
    oaStore.semestersList.forEach(s => {
      overview += `- ${s.name} | 状态：${s.status} | ${s.startDate}~${s.endDate}\n`
    })
  }

  return overview
}

// ========== 解析快捷指令 ==========
export function parseSlashCommand(input) {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return null

  const cmd = trimmed.toLowerCase()
  
  const commandMap = {
    '/待办': '请告诉我当前的待办事项有哪些？',
    '/会议': '请告诉我今天的会议安排。',
    '/课表': '请告诉我本周的课表安排。',
    '/成绩': '请告诉我成绩查询相关的信息。',
    '/请假': '请详细介绍请假规则，包括各类假期的天数限制和审批流程。',
    '/报销': '请详细介绍差旅费报销标准，包括交通、住宿、补助等。',
    '/帮助': null // 特殊处理
  }

  // 模糊匹配
  for (const [key, value] of Object.entries(commandMap)) {
    if (cmd.startsWith(key)) return { cmd: key, prompt: value }
  }

  return { cmd: trimmed, prompt: null } // 未识别指令
}

// ========== 构建完整 System Prompt ==========
export function buildSystemPrompt(user, oaStore) {
  const knowledgeText = buildKnowledgeText()
  const userContext = buildUserContext(user)
  const systemOverview = buildSystemOverview(user, oaStore)

  return `你是中山中学OA办公系统的智能助手"小O"，专门帮助学校教职工和学生解答关于OA系统使用、学校规章制度、办事流程、数据查询等问题。

## 你的知识来源
以下是学校的规章制度和操作指南文档，请严格基于这些内容回答问题：

${knowledgeText}

## 当前用户信息
${userContext}

${systemOverview}

## 回答规则
1. 严格基于上述知识文档和实时OA数据回答，不要编造不存在的制度或流程
2. 回答要简明扼要，重点突出，适合快速阅读
3. 如果涉及具体数字（天数、金额、时限），务必准确引用
4. 回答时附上信息来源，格式如"📋 来源：《文档标题》第X节"或"📋 来源：OA系统实时数据"
5. 如果用户的问题超出知识库范围，诚实说明"这超出了我目前的知识范围，建议咨询相关部门"
6. 当用户询问OA系统操作时，给出具体的操作路径（如：流程审批 → 发起流程 → 请假申请）
7. 根据用户角色给出针对性的回答（如教师和学生看到的请假规则不同）
8. 支持快捷指令：/待办 /会议 /课表 /成绩 /请假 /报销 /帮助
9. 当用户问及待办、会议、成绩、课表等实时数据时，直接从上方"当前OA系统实时数据"中提取并回答

## 语气风格
- 友好、专业、简洁
- 适当使用emoji让回答更生动
- 不要过度寒暄，直接回答问题`
}

// ========== 构建欢迎消息 ==========
export function buildWelcomeMessage(user, oaStore) {
  const name = user?.name || '用户'
  const roleName = user?.roleName || ''
  
  let roleTips = ''
  let liveSummary = ''

  if (oaStore && user) {
    const pending = oaStore.getMyPendingRecords(user.id, roleName, user.deptName)
    const unreadAnn = oaStore.getVisibleAnnouncements(roleName, user.deptName)
      .filter(a => !oaStore.isAnnouncementRead(a.id, user.id)).length
    const todayMeetings = oaStore.getVisibleMeetings(roleName, user.name)
      .filter(m => m.startTime?.startsWith(new Date().toISOString().slice(0, 10))).length

    liveSummary = `\n\n📊 **你的概览**：待办${pending.length}项 · 未读公告${unreadAnn}条 · 今日会议${todayMeetings}场`
  }

  if (roleName === '教师') {
    roleTips = '你可以问我待办审批、请假规则、课表查询、成绩录入等问题 📚'
  } else if (roleName === '学生') {
    roleTips = '你可以问我成绩查询、请假流程、考试安排等问题 📖'
  } else if (['系统管理员', '学校领导'].includes(roleName)) {
    roleTips = '你可以问我待办概览、审批流程、系统数据、公告等问题 📋'
  } else {
    roleTips = '你可以问我规章制度、办事流程、系统使用等问题 📝'
  }

  return `你好，${name}！我是OA智能助手小O 🤖

${roleTips}${liveSummary}

快捷指令：\`/待办\` \`/会议\` \`/课表\` \`/请假\` \`/报销\` \`/帮助\``
}