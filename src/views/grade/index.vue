<template>
  <div class="page-container">
    <div class="page-header"><h2>成绩管理</h2></div>

    <!-- 教师权限提示 -->
    <div v-if="userStore.currentUser?.roleName === '教师'" style="margin-bottom:16px; background:#f0f5ff; border-radius:10px; padding:12px 18px; border-left:4px solid #4a6cf7; display:flex; align-items:center; gap:8px;">
      <el-icon :size="18" color="#4a6cf7"><InfoFilled /></el-icon>
      <span style="font-size:13px; color:#334155;">
        您当前负责的学科：<el-tag type="primary" size="small" effect="plain">{{ mySubject }}</el-tag>，
        仅可查看/录入该学科的成绩数据。
        <span v-if="myClasses.length > 0">负责班级：{{ myClasses.map(c => c.name).join('、') }}</span>
      </span>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 成绩查询 -->
      <el-tab-pane label="成绩查询" name="query">
        <div class="search-bar">
          <el-select v-model="search.semester" placeholder="学期" style="width:220px;" clearable>
            <el-option v-for="s in semesters" :key="s.id" :label="s.name" :value="s.name" />
          </el-select>
          <el-select v-model="search.examType" placeholder="考试类型" style="width:140px;" clearable>
            <el-option label="期中考试" value="期中考试" /><el-option label="期末考试" value="期末考试" />
          </el-select>
          <el-select v-model="search.courseName" placeholder="课程" style="width:140px;" clearable>
            <el-option v-for="c in availableCourses" :key="c" :label="c" :value="c" />
          </el-select>
        </div>
        <el-table :data="filteredGrades" stripe class="animate-fadeInUp">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="studentName" label="学生" width="100" />
          <el-table-column prop="courseName" label="课程" width="100" />
          <el-table-column prop="score" label="成绩" width="80">
            <template #default="{ row }">
              <span :style="{ color: row.score >= 90 ? '#11998e' : row.score >= 60 ? '#1e293b' : '#e94560', fontWeight: 700 }">{{ row.score }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="examType" label="考试类型" width="100" />
          <el-table-column prop="teacher" label="授课教师" width="100" />
          <el-table-column prop="entryTime" label="录入时间" width="120" />
          <el-table-column prop="status" label="发布状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === '已发布' ? 'success' : 'warning'" size="small" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="filteredGrades.length === 0" class="empty-state">
          <p>暂无符合条件的数据</p>
        </div>
      </el-tab-pane>

      <!-- 成绩录入（仅教师+管理员，且受学科限制） -->
      <el-tab-pane label="成绩录入" name="entry" v-if="userStore.hasRole(['教师', '系统管理员'])">
        <div class="search-bar">
          <el-select v-model="entryForm.semester" placeholder="学期" style="width:220px;">
            <el-option v-for="s in semesters" :key="s.id" :label="s.name" :value="s.name" />
          </el-select>
          <!-- 教师：只能选自己的学科；管理员可选所有学科 -->
          <el-select v-model="entryForm.courseName" placeholder="课程" style="width:140px;" :disabled="isTeacher">
            <el-option v-for="c in availableEntryCourses" :key="c" :label="c" :value="c" />
          </el-select>
          <el-tag v-if="isTeacher && entryForm.courseName" type="info" size="small">{{ mySubject }}（仅显示本学科）</el-tag>
          <el-button type="primary" @click="showEntryTable = true">查询学生</el-button>
          <el-button type="success" @click="doBatchPublish">批量发布</el-button>
        </div>
        <el-table v-if="showEntryTable" :data="entryStudents" stripe class="animate-fadeInUp">
          <el-table-column prop="studentName" label="学生" width="120" />
          <el-table-column prop="className" label="班级" width="110" />
          <el-table-column label="成绩" width="130">
            <template #default="{ row }">
              <el-input-number v-model="row.score" :min="0" :max="100" size="small" controls-position="right" />
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === '已发布' ? 'success' : 'warning'" size="small" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="showEntryTable && entryStudents.length === 0" class="empty-state">
          <p>暂无学生数据</p>
        </div>
      </el-tab-pane>

      <!-- 成绩统计 -->
      <el-tab-pane label="成绩统计" name="stats">
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:14px;">
          <div v-for="stat in gradeStats" :key="stat.courseName"
               style="padding:18px; background:#f8fafc; border-radius:12px; border:1px solid #e8ecf1;"
               class="animate-fadeInUp stat-card-hover">
            <h4 style="font-size:15px; font-weight:700; margin-bottom:12px; color:#1e293b;">{{ stat.courseName }}</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:13px; color:#475569;">
              <div>平均分：<b style="color:#4a6cf7;">{{ stat.avg }}</b></div>
              <div>最高分：<b style="color:#11998e;">{{ stat.max }}</b></div>
              <div>最低分：<b style="color:#e94560;">{{ stat.min }}</b></div>
              <div>及格率：<b style="color:#f2994a;">{{ stat.passRate }}%</b></div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { grades as _grades, semesters, users, departments, courses } from '@/mock/data'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const activeTab = ref('query')
const search = reactive({ semester: '2024-2025学年第一学期', examType: '', courseName: '' })
const entryForm = reactive({ semester: '2024-2025学年第二学期', courseName: '' })
const showEntryTable = ref(false)

// 可编辑的深拷贝
const grades = ref(_grades.map(g => ({ ...g })))

// ======== 权限控制核心逻辑 ========
// 教研组 → 学科 映射
const deptSubjectMap = {
  '语文教研组': '语文',
  '数学教研组': '数学',
  '英语教研组': '英语',
  '物理教研组': '物理',
  '化学教研组': '化学',
  '生物教研组': '生物',
  '历史教研组': '历史',
  '信息中心': '信息技术'
}

const isTeacher = computed(() => userStore.currentUser?.roleName === '教师')

// 当前教师的学科（通过教研组映射）
const mySubject = computed(() => {
  if (!isTeacher.value) return '全部'
  const userDept = userStore.currentUser?.deptName || ''
  return deptSubjectMap[userDept] || '未分配'
})

// 当前教师负责的班级（从课表/schedules推断，这里简化为根据用户所属部门匹配）
const myClasses = computed(() => {
  // 教师能看到自己教的班级 - 简化处理：
  // 如果是语文老师 → 能看到有语文课的班级（高一1班、高一2班、高二1班等）
  const allClasses = departments.filter(d => d.type === '班级')
  if (!isTeacher.value) return allClasses

  // 根据学科过滤可见班级（模拟数据）
  const subjectClassMap = {
    '语文': [7, 8, 10],     // 高一1班、高一2班、高二1班
    '数学': [7, 8, 10],
    '英语': [7, 8, 10],
    '物理': [7, 10],
    '化学': [7, 10],
    '生物': [7],
    '历史': [7, 10]
  }
  const clsIds = subjectClassMap[mySubject.value] || []
  return allClasses.filter(c => clsIds.includes(c.id))
})

// 教师能看到的课程列表（只有自己学科）
const availableCourses = computed(() => {
  if (isTeacher.value) {
    // 只返回自己学科的选项
    return [...new Set(grades.value.filter(g => g.courseName === mySubject.value).map(g => g.courseName))]
  }
  return [...new Set(grades.value.map(g => g.courseName))]
})

// 录入页面的课程下拉（教师锁定为自己的学科）
const availableEntryCourses = computed(() => {
  if (isTeacher.value) {
    return [mySubject.value] // 教师只能选自己的学科
  }
  return [...new Set(grades.value.map(g => g.courseName))]
})

onMounted(() => {
  // 教师登录时自动设置默认课程为自己学科
  if (isTeacher.value) {
    entryForm.courseName = mySubject.value
    search.courseName = ''
  }
})

// ======== 成绩查询（带权限过滤） ========
const filteredGrades = computed(() => {
  let result = grades.value.filter(g => {
    // 学生只能看已发布的 + 自己的成绩
    if (userStore.currentUser?.roleName === '学生') {
      if (g.status !== '已发布') return false
      if (g.studentId !== userStore.currentUser?.id) return false
    }

    // 教师：只能看自己学科的成绩
    if (isTeacher.value) {
      if (g.courseName !== mySubject.value) return false
    }

    // 搜索条件
    if (search.semester && g.semester !== search.semester) return false
    if (search.examType && g.examType !== search.examType) return false
    if (search.courseName && g.courseName !== search.courseName) return false
    return true
  })
  return result
})

// ======== 成绩录入（带权限过滤） ========
const entryStudents = computed(() => {
  let result = grades.value.filter(g =>
    g.semester === entryForm.semester &&
    g.courseName === entryForm.courseName
  )

  // 教师额外限制：只显示自己负责的班级的学生
  if (isTeacher.value) {
    const allowedClassIds = myClasses.value.map(c => c.id)
    result = result.filter(g => allowedClassIds.includes(g.studentId ?
      users.find(u => u.id === g.studentId)?.deptId || 0 :
      0))
    // 通过学生ID查班级
    result = result.filter(g => {
      const student = users.find(u => u.id === g.studentId)
      return student && allowedClassIds.includes(student.deptId)
    })
  }

  return result
})

function doBatchPublish() {
  const targets = grades.value.filter(g =>
    g.semester === entryForm.semester &&
    g.courseName === entryForm.courseName &&
    g.status === '待发布'
  )
  // 教师只能发布自己学科的
  if (isTeacher.value) {
    const filteredTargets = targets.filter(t => t.courseName === mySubject.value)
    filteredTargets.forEach(g => g.status = '已发布')
    ElMessage.success(`已发布 ${filteredTargets.length} 条${mySubject.value}成绩`)
  } else {
    targets.forEach(g => g.status = '已发布')
    ElMessage.success(`已发布 ${targets.length} 条成绩`)
  }
}

// ======== 统计（按权限） ========
const gradeStats = computed(() => {
  let published = grades.value.filter(g =>
    g.status === '已发布' &&
    g.semester === '2024-2025学年第一学期' &&
    g.examType === '期中考试'
  )
  // 教师只统计自己的学科
  if (isTeacher.value) {
    published = published.filter(g => g.courseName === mySubject.value)
  }

  const grouped = {}
  published.forEach(g => {
    if (!grouped[g.courseName]) grouped[g.courseName] = []
    grouped[g.courseName].push(g.score)
  })
  return Object.entries(grouped).map(([courseName, scores]) => ({
    courseName,
    avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
    max: Math.max(...scores),
    min: Math.min(...scores),
    passRate: ((scores.filter(s => s >= 60).length / scores.length) * 100).toFixed(1)
  }))
})
</script>

<style scoped>
.stat-card-hover {
  transition: all 0.3s ease;
}
.stat-card-hover:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(74,108,247,0.08);
}
.animate-fadeInUp {
  animation: fadeInUp 0.4s ease both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
