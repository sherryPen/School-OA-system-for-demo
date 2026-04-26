/**
 * Prompt 构建工具
 * 
 * 负责：知识库注入、用户上下文注入、OA实时数据注入、快捷指令解析
 * 
 * V3.1 重构：注入完整实时数据（公告正文、课表明细、成绩详情、流程进展）
 */

import { knowledgeBase } from '@/data/knowledge-base'

// ========== 快捷指令定义 ==========
export const slashCommands = [
  { cmd: '/待办', desc: '查看我的待办事项和申请进展', icon: 'DocumentChecked' },
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

// ========== 构建OA实时数据（完整版） ==========
function buildSystemOverview(user, oaStore) {
  if (!user || !oaStore) return ''

  const roleName = user.roleName
  const deptName = user.deptName
  const userName = user.name
  const userId = user.id

  let overview = '\n## 当前OA系统实时数据\n'
  overview += '⚠️ 以下为系统实时数据，回答用户关于通知公告、课表、成绩、流程审批等问题时，必须优先从以下数据中检索，不要编造或使用过时信息。\n'

  // ---- 当前学期 ----
  const currentSemester = oaStore.semestersList.find(s => s.status === '进行中')
  overview += `\n### 当前学期\n`
  if (currentSemester) {
    overview += `- 名称：${currentSemester.name}，状态：进行中，时间：${currentSemester.startDate} ~ ${currentSemester.endDate}\n`
    overview += `- 回答课表、成绩等问题时，默认指当前学期"${currentSemester.name}"，并说明。\n`
  } else {
    overview += `- 当前无进行中的学期\n`
  }

  // ---- 通知公告（完整内容） ----
  const visibleAnnouncements = oaStore.getVisibleAnnouncements(roleName, deptName)
  const unreadAnnouncements = visibleAnnouncements.filter(a => !oaStore.isAnnouncementRead(a.id, userId))
  overview += `\n### 通知公告（共${visibleAnnouncements.length}条，未读${unreadAnnouncements.length}条）\n`
  overview += `以下是当前可见的所有公告完整信息，用户询问公告内容时必须从此处检索：\n`
  visibleAnnouncements.slice(0, 10).forEach(a => {
    const readTag = oaStore.isAnnouncementRead(a.id, userId) ? '已读' : '未读'
    overview += `\n#### [${readTag}] ${a.title}\n`
    overview += `- 优先级：${a.priority}，发布人：${a.publisher}，发布时间：${a.publishTime}\n`
    if (a.scope) overview += `- 可见范围：${a.scope}\n`
    if (a.content) {
      // 截取前500字符，避免prompt过长
      const contentPreview = a.content.length > 500 ? a.content.slice(0, 500) + '...' : a.content
      overview += `- 内容：${contentPreview}\n`
    } else if (a.summary) {
      overview += `- 摘要：${a.summary}\n`
    }
  })
  if (visibleAnnouncements.length > 10) {
    overview += `\n...还有${visibleAnnouncements.length - 10}条公告未显示\n`
  }

  // ---- 待办审批（完整信息） ----
  const myPending = oaStore.getMyPendingRecords(userId, roleName, deptName)
  overview += `\n### 待我审批的事项（${myPending.length}项）\n`
  if (myPending.length > 0) {
    myPending.forEach(r => {
      overview += `- 【待审批】${r.type} | 申请人：${r.applicant}（${getApplicantDept(r)}） | 当前节点：${r.currentNode || '无'} | 申请时间：${r.applyTime}\n`
      if (r.reason) overview += `  原因：${r.reason}\n`
    })
  } else {
    overview += `- 暂无待审批事项\n`
  }

  // ---- 我的申请（完整进展） ----
  const myRecords = oaStore.getMyWorkflowRecords(userId, roleName, deptName)
  const myApplications = myRecords.filter(r => r.applicantId === userId)
  overview += `\n### 我提交的申请及进展（${myApplications.length}项）\n`
  if (myApplications.length > 0) {
    myApplications.slice(0, 8).forEach(r => {
      overview += `- ${r.type} | 状态：${r.status} | 当前节点：${r.currentNodeDisplay || r.currentNode || '已完成'} | 申请时间：${r.applyTime}\n`
      if (r.reason) overview += `  原因：${r.reason}\n`
      // 审批历史
      if (r.approveHistory && r.approveHistory.length > 0) {
        overview += `  审批记录：\n`
        r.approveHistory.forEach(h => {
          overview += `    · ${h.node} → ${h.result}（${h.handler}，${h.time}）${h.comment ? '意见：' + h.comment : ''}\n`
        })
      }
    })
  } else {
    overview += `- 暂无申请记录\n`
  }

  // ---- 会议安排 ----
  const visibleMeetings = oaStore.getVisibleMeetings(roleName, userName)
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const tomorrowDate = new Date(today)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10)
  const todayMeetings = visibleMeetings.filter(m => m.startTime?.startsWith(todayStr))
  const tomorrowMeetings = visibleMeetings.filter(m => m.startTime?.startsWith(tomorrowStr))
  overview += `\n### 会议安排\n`
  overview += `- 今日（${todayStr}）会议：${todayMeetings.length}场\n`
  todayMeetings.forEach(m => {
    overview += `  - ${m.title} | 时间：${m.startTime}~${m.endTime} | 地点：${m.location || '待定'} | 组织者：${m.organizer || '未知'}\n`
    if (m.description) overview += `    说明：${m.description}\n`
  })
  overview += `- 明日（${tomorrowStr}）会议：${tomorrowMeetings.length}场\n`
  tomorrowMeetings.forEach(m => {
    overview += `  - ${m.title} | 时间：${m.startTime}~${m.endTime} | 地点：${m.location || '待定'}\n`
  })

  // ---- 课表（教师/学生/教务 — 完整课表） ----
  if (['教师', '学生', '行政人员'].includes(roleName)) {
    overview += `\n### 课表信息\n`
    if (currentSemester) {
      const publishedSchedules = oaStore.schedules.filter(s =>
        s.semesterId === currentSemester.id && s.status === '已发布'
      )
      const dayMap = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五' }
      const dayOfWeek = today.getDay() // 0=周日

      if (roleName === '教师') {
        // 教师课表：按学科+班级筛选
        const mySubject = oaStore.deptSubjectMap?.[deptName]
        if (mySubject) {
          const myClasses = oaStore.subjectClassMap?.[mySubject] || []
          const mySchedules = publishedSchedules.filter(s =>
            s.courseName === mySubject && myClasses.includes(s.classId)
          )
          overview += `- 任教学科：${mySubject}，负责班级：${myClasses.join('、')}，已发布课时：${mySchedules.length}节\n`
          // 本周课表按天排列
          overview += `- 本周课表：\n`
          for (let d = 1; d <= 5; d++) {
            const daySchedules = mySchedules.filter(s => s.dayOfWeek === dayMap[d]).sort((a, b) => a.period - b.period)
            if (daySchedules.length > 0) {
              overview += `  ${dayMap[d]}：\n`
              daySchedules.forEach(s => {
                overview += `    第${s.period}节 ${s.courseName}（${s.classId}）${s.classroom ? ' @ ' + s.classroom : ''}\n`
              })
            }
          }
          // 今日课程高亮
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const todaySchedule = mySchedules.filter(s => s.dayOfWeek === dayMap[dayOfWeek]).sort((a, b) => a.period - b.period)
            if (todaySchedule.length > 0) {
              overview += `- 📌 今日（${dayMap[dayOfWeek]}）课程：\n`
              todaySchedule.forEach(s => {
                overview += `  第${s.period}节 ${s.courseName}（${s.classId}）${s.classroom ? ' @ ' + s.classroom : ''}\n`
              })
            } else {
              overview += `- 📌 今日（${dayMap[dayOfWeek]}）无课程\n`
            }
          }
        } else {
          overview += `- 未找到您教授的学科信息\n`
        }
      } else if (roleName === '学生') {
        // 学生课表：按班级筛选
        const myClass = deptName // 学生deptName就是班级名
        const mySchedules = publishedSchedules.filter(s => s.classId === myClass)
        overview += `- 班级：${myClass}，已发布课时：${mySchedules.length}节\n`
        overview += `- 本周课表：\n`
        for (let d = 1; d <= 5; d++) {
          const daySchedules = mySchedules.filter(s => s.dayOfWeek === dayMap[d]).sort((a, b) => a.period - b.period)
          if (daySchedules.length > 0) {
            overview += `  ${dayMap[d]}：\n`
            daySchedules.forEach(s => {
              overview += `    第${s.period}节 ${s.courseName}${s.teacher ? '（' + s.teacher + '）' : ''}${s.classroom ? ' @ ' + s.classroom : ''}\n`
            })
          }
        }
      } else if (roleName === '行政人员') {
        // 教务处可查看所有已发布课表概况
        overview += `- 已发布课表：${publishedSchedules.length}条课时记录（${currentSemester.name}）\n`
      }
    } else {
      overview += `- 当前无进行中的学期，无法查看课表\n`
    }
  }

  // ---- 成绩（教师/学生 — 完整成绩） ----
  if (['教师', '学生'].includes(roleName)) {
    const visibleGrades = oaStore.getVisibleGrades(user)
    const publishedGrades = visibleGrades.filter(g => g.status === '已发布')
    const pendingGrades = visibleGrades.filter(g => g.status === '待发布')
    overview += `\n### 成绩信息\n`
    overview += `- 可见成绩记录：${visibleGrades.length}条，已发布：${publishedGrades.length}条，待发布：${pendingGrades.length}条\n`
    
    if (roleName === '教师') {
      const subject = oaStore.deptSubjectMap?.[deptName]
      if (subject) {
        // 列出具体的成绩考试和班级
        const myPublishedGrades = publishedGrades.filter(g => g.subject === subject)
        if (myPublishedGrades.length > 0) {
          overview += `- 已发布成绩（${subject}）：\n`
          // 按考试类型分组
          const examGroups = {}
          myPublishedGrades.forEach(g => {
            const key = `${g.examType || '考试'}`
            if (!examGroups[key]) examGroups[key] = []
            examGroups[key].push(g)
          })
          Object.entries(examGroups).forEach(([exam, grades]) => {
            const avg = grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length
            const max = Math.max(...grades.map(g => g.score || 0))
            const min = Math.min(...grades.map(g => g.score || 0))
            const passCount = grades.filter(g => (g.score || 0) >= 60).length
            overview += `  ${exam}：${grades.length}人，均分${avg.toFixed(1)}，最高${max}，最低${min}，及格率${(passCount / grades.length * 100).toFixed(0)}%\n`
            // 列出前5名学生成绩
            const top5 = [...grades].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5)
            overview += `    前5名：${top5.map(g => `${g.studentName || g.studentId}(${g.score}分)`).join('、')}\n`
          })
        }
        // 待发布成绩
        const myPendingGrades = pendingGrades.filter(g => g.subject === subject)
        if (myPendingGrades.length > 0) {
          overview += `- 待发布成绩（${subject}）：${myPendingGrades.length}条\n`
        }
      }
    } else if (roleName === '学生') {
      // 学生看到自己的成绩
      const myGrades = publishedGrades.filter(g => g.studentId === userId || g.studentName === userName)
      if (myGrades.length > 0) {
        overview += `- 我的成绩：\n`
        myGrades.forEach(g => {
          overview += `  ${g.subject || g.courseName} | ${g.examType || '考试'} | 分数：${g.score} | 班级排名：${g.classRank || '未公布'}\n`
        })
      } else {
        overview += `- 暂无已发布的成绩\n`
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

// 辅助：获取申请人部门
function getApplicantDept(record) {
  // 从 oaStore 的 users 中查找（但 promptBuilder 无法访问 store 的 users）
  // 这里用内置映射
  const deptMap = {
    '李明': '校领导办公室', '张建国': '校领导办公室',
    '陈华': '教务处', '黄磊': '财务处', '林峰': '总务处',
    '杨雪': '人事处', '刘伟': '语文教研组', '张丽': '数学教研组',
    '王强': '英语教研组', '赵敏': '物理教研组', '孙涛': '化学教研组',
    '周婷': '生物教研组', '吴杰': '历史教研组'
  }
  return deptMap[record.applicant] || '未知部门'
}

// ========== 解析快捷指令 ==========
export function parseSlashCommand(input) {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return null

  const cmd = trimmed.toLowerCase()
  
  const commandMap = {
    '/待办': '请告诉我我的待办审批事项和我提交的申请最新进展。',
    '/会议': '请告诉我今天和明天的会议安排。',
    '/课表': '请告诉我本周的完整课表安排，按天列出。',
    '/成绩': '请告诉我成绩查询相关的详细信息。',
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

## 回答规则（必须严格遵守）
1. **优先使用实时数据**：回答通知公告、课表、成绩、流程审批、会议等问题时，必须从上方"当前OA系统实时数据"中检索真实内容，不要编造、不要使用知识库中的过时示例
2. **引用公告原文**：用户问通知公告内容时，直接引用上方公告的内容字段，不要编造安排
3. **说明当前学期**：回答课表、成绩等问题时，先说明"当前学期是XXX"，再给出数据
4. **我的申请进展**：用户问"有什么进行中的事项""我的申请怎么样了"时，同时列出"待我审批的事项"和"我提交的申请及进展"
5. **课表按天列出**：回答课表问题时，按周一到周五逐天列出，标注今日课程
6. **成绩按考试分类**：回答成绩问题时，按考试类型分类，给出均分/最高/最低/及格率
7. 严格基于上述知识文档和实时OA数据回答，不要编造不存在的制度或流程
8. 回答要简明扼要，重点突出，适合快速阅读
9. 如果涉及具体数字（天数、金额、时限），务必准确引用
10. 回答时附上信息来源，格式如"📋 来源：《文档标题》"或"📋 来源：OA系统实时数据"
11. 如果用户的问题超出知识库和实时数据范围，诚实说明"这超出了我目前的知识范围，建议咨询相关部门"
12. 当用户询问OA系统操作时，给出具体的操作路径
13. 根据用户角色给出针对性的回答
14. 支持快捷指令：/待办 /会议 /课表 /成绩 /请假 /报销 /帮助

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
    const myApps = oaStore.getMyWorkflowRecords(user.id, roleName, user.deptName)
      .filter(r => r.applicantId === user.id && r.status === '审批中')
    const unreadAnn = oaStore.getVisibleAnnouncements(roleName, user.deptName)
      .filter(a => !oaStore.isAnnouncementRead(a.id, user.id)).length
    const todayMeetings = oaStore.getVisibleMeetings(roleName, user.name)
      .filter(m => m.startTime?.startsWith(new Date().toISOString().slice(0, 10))).length

    liveSummary = `\n\n📊 **你的概览**：待审批${pending.length}项 · 审批中申请${myApps.length}项 · 未读公告${unreadAnn}条 · 今日会议${todayMeetings}场`
  }

  if (roleName === '教师') {
    roleTips = '你可以问我待办审批、申请进展、请假规则、课表查询、成绩录入等问题 📚'
  } else if (roleName === '学生') {
    roleTips = '你可以问我成绩查询、课表安排、请假流程等问题 📖'
  } else if (['系统管理员', '学校领导'].includes(roleName)) {
    roleTips = '你可以问我待办概览、审批流程、公告内容、系统数据等问题 📋'
  } else {
    roleTips = '你可以问我规章制度、公告内容、办事流程、系统使用等问题 📝'
  }

  return `你好，${name}！我是OA智能助手小O 🤖

${roleTips}${liveSummary}

快捷指令：\`/待办\` \`/会议\` \`/课表\` \`/请假\` \`/报销\` \`/帮助\``
}
