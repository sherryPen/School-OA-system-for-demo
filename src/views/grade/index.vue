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
              <el-input-number v-model="row.score" :min="0" :max="100" size="small" controls-position="right" @change="onScoreChange(row)" />
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
        <div class="search-bar">
          <el-select v-model="statsForm.semester" placeholder="学期" style="width:220px;">
            <el-option v-for="s in semesters" :key="s.id" :label="s.name" :value="s.name" />
          </el-select>
          <el-select v-model="statsForm.examType" placeholder="考试类型" style="width:140px;">
            <el-option label="期中考试" value="期中考试" /><el-option label="期末考试" value="期末考试" />
          </el-select>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:14px;">
          <div v-for="stat in gradeStats" :key="stat.label"
               style="padding:18px; background:#f8fafc; border-radius:12px; border:1px solid #e8ecf1;"
               class="animate-fadeInUp stat-card-hover">
            <h4 style="font-size:15px; font-weight:700; margin-bottom:12px; color:#1e293b;">{{ stat.label }}</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:13px; color:#475569;">
              <div>平均分：<b style="color:#4a6cf7;">{{ stat.avg }}</b></div>
              <div>最高分：<b style="color:#11998e;">{{ stat.max }}</b></div>
              <div>最低分：<b style="color:#e94560;">{{ stat.min }}</b></div>
              <div>及格率：<b style="color:#f2994a;">{{ stat.passRate }}%</b></div>
              <div>人数：<b>{{ stat.count }}</b></div>
            </div>
          </div>
        </div>
        <div v-if="gradeStats.length === 0" class="empty-state">
          <p>暂无统计数据</p>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useOaStore } from '@/store/oa'
import { users, departments, semesters as _semesters } from '@/mock/data'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const oaStore = useOaStore()
const activeTab = ref('query')
const search = reactive({ semester: '2024-2025学年第一学期', examType: '', courseName: '' })
const entryForm = reactive({ semester: '2024-2025学年第二学期', courseName: '' })
const statsForm = reactive({ semester: '2024-2025学年第一学期', examType: '期中考试' })
const showEntryTable = ref(false)

// 学期列表来自store
const semesters = computed(() => oaStore.semestersList)

const isTeacher = computed(() => userStore.currentUser?.roleName === '教师')

// 当前教师的学科
const mySubject = computed(() => {
  if (!isTeacher.value) return '全部'
  const userDept = userStore.currentUser?.deptName || ''
  return oaStore.deptSubjectMap[userDept] || '未分配'
})

// 当前教师负责的班级
const myClasses = computed(() => {
  if (!isTeacher.value) return departments.filter(d => d.type === '班级')
  return oaStore.getTeacherClasses(userStore.currentUser?.deptName)
})

// 可查询的课程列表
const availableCourses = computed(() => {
  const visibleGrades = oaStore.getVisibleGrades(userStore.currentUser)
  const courseSet = new Set(visibleGrades.map(g => g.courseName))
  if (isTeacher.value) {
    return [...courseSet].filter(c => c === mySubject.value)
  }
  return [...courseSet]
})

// 录入页面的课程下拉
const availableEntryCourses = computed(() => {
  if (isTeacher.value) return [mySubject.value]
  const courseSet = new Set(oaStore.grades.map(g => g.courseName))
  return [...courseSet]
})

onMounted(() => {
  if (isTeacher.value) {
    entryForm.courseName = mySubject.value
    search.courseName = ''
  }
})

// ======== 成绩查询（带权限过滤） ========
const filteredGrades = computed(() => {
  let result = oaStore.getVisibleGrades(userStore.currentUser)
  if (search.semester) result = result.filter(g => g.semester === search.semester)
  if (search.examType) result = result.filter(g => g.examType === search.examType)
  if (search.courseName) result = result.filter(g => g.courseName === search.courseName)
  return result
})

// ======== 成绩录入（带权限过滤 + 班级名填充） ========
const entryStudents = computed(() => {
  if (!showEntryTable.value) return []
  let result = oaStore.getVisibleGrades(userStore.currentUser).filter(g =>
    g.semester === entryForm.semester && g.courseName === entryForm.courseName
  )
  // 填充班级名
  return result.map(g => {
    const student = users.find(u => u.id === g.studentId)
    const cls = student ? departments.find(d => d.id === student.deptId) : null
    return { ...g, className: cls?.name || '未知班级' }
  })
})

// 成绩修改时保存到store
function onScoreChange(row) {
  oaStore.updateGrade(row.id, { score: row.score })
}

function doBatchPublish() {
  const count = oaStore.publishGrades(entryForm.semester, entryForm.courseName, userStore.currentUser)
  if (count > 0) {
    ElMessage.success(`已发布 ${count} 条${isTeacher.value ? mySubject.value : ''}成绩`)
  } else {
    ElMessage.info('没有待发布的成绩')
  }
}

// ======== 统计（按权限 + 班级分组） ========
const gradeStats = computed(() => {
  return oaStore.getGradeStats(statsForm.semester, statsForm.examType, userStore.currentUser)
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
