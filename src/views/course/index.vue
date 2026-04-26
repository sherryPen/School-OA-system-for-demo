<template>
  <div class="page-container">
    <div class="page-header">
      <h2>课程管理</h2>
    </div>
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 课表查询 -->
      <el-tab-pane label="课表查询" name="timetable">
        <div class="search-bar">
          <el-select v-model="selectedClass" placeholder="选择班级" style="width:180px;" @change="onClassChange">
            <el-option v-for="c in classList" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <el-select v-model="selectedSemester" placeholder="选择学期" style="width:240px;">
            <el-option v-for="s in activeSemesters" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </div>
        <div v-if="currentScheduleStatus === '草稿'" style="margin-bottom:14px; display:flex; gap:10px; align-items:center;">
          <el-tag type="warning" effect="dark">当前课表状态：{{ currentScheduleStatus }}</el-tag>
          <span style="font-size:13px; color:#94a3b8;">课表尚未发布，学生不可见</span>
          <el-button v-if="canManageSchedule" type="success" size="small" @click="doPublishSchedule">发布课表</el-button>
        </div>
        <div v-if="currentScheduleStatus === '已发布'" style="margin-bottom:14px;">
          <el-tag type="success" effect="dark">当前课表状态：已发布</el-tag>
        </div>
        <table class="timetable animate-fadeInUp">
          <thead>
            <tr>
              <th style="width:80px;">节次</th>
              <th v-for="d in days" :key="d">{{ d }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in periods" :key="p">
              <td style="font-weight:600; background:#f8fafc; color:#475569;">第{{ p }}节</td>
              <td v-for="d in 5" :key="d" :class="{ 'has-course': getSchedule(d, p) }" @click="canManageSchedule && editCell(d, p)">
                <template v-if="getSchedule(d, p)">
                  <div style="font-weight:600; font-size:13px;">{{ getSchedule(d, p).courseName }}</div>
                  <div style="font-size:11px; opacity:0.75;">{{ getSchedule(d, p).teacher }}</div>
                  <div style="font-size:10px; opacity:0.55;">{{ getSchedule(d, p).room }}</div>
                </template>
                <span v-else-if="canManageSchedule" style="color:#c0c4cc; font-size:11px;">点击设置</span>
              </td>
            </tr>
          </tbody>
        </table>
      </el-tab-pane>

      <!-- 课程列表 -->
      <el-tab-pane label="课程列表" name="courses">
        <el-table :data="courses" stripe class="animate-fadeInUp">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="name" label="课程名称" width="140" />
          <el-table-column prop="code" label="课程代码" width="120" />
          <el-table-column prop="credit" label="学分" width="80" />
          <el-table-column prop="hours" label="课时" width="80" />
          <el-table-column prop="deptName" label="所属教研组" min-width="140" />
        </el-table>
      </el-tab-pane>

      <!-- 学期管理 -->
      <el-tab-pane label="学期管理" name="semester">
        <div style="margin-bottom:16px;" v-if="userStore.hasRole(['系统管理员', '学校领导', '行政人员'])">
          <el-button type="primary" size="default" @click="showSemesterDialog()"><el-icon><Plus /></el-icon>新增学期</el-button>
        </div>
        <el-table :data="oaStore.semestersList" stripe class="animate-fadeInUp">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="name" label="学期名称" min-width="250" />
          <el-table-column prop="startDate" label="开始时间" width="120" />
          <el-table-column prop="endDate" label="结束时间" width="120" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="semesterStatusType(row.status)" size="small" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" v-if="userStore.hasRole(['系统管理员', '学校领导', '行政人员'])">
            <template #default="{ row }">
              <el-button v-if="row.status !== '进行中'" type="primary" link size="small" @click="doActivateSemester(row)">激活</el-button>
              <el-button v-if="row.status === '进行中'" type="warning" link size="small" @click="doEndSemester(row)">结束学期</el-button>
              <el-button type="primary" link size="small" @click="showSemesterDialog(row)">编辑</el-button>
              <el-popconfirm title="确定删除此学期？" @confirm="doDeleteSemester(row.id)">
                <template #reference>
                  <el-button type="danger" link size="small">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 录入课表（仅教务处可见） -->
      <el-tab-pane label="录入课表" name="scheduleEdit" v-if="canManageSchedule">
        <div class="search-bar">
          <el-select v-model="editForm.classId" placeholder="选择班级" style="width:180px;">
            <el-option v-for="c in classList" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <el-select v-model="editForm.semesterId" placeholder="选择学期" style="width:240px;">
            <el-option v-for="s in oaStore.semestersList" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
          <el-button type="primary" @click="loadClassSchedules">加载该班课表</el-button>
        </div>

        <div v-if="editForm.classId" style="background:#f8fafc; border-radius:12px; padding:20px; border:1px solid #e8ecf1; margin-bottom:16px;">
          <h4 style="margin-bottom:14px; font-size:15px; color:#1e293b;">为 {{ currentClassName }} 设置课程</h4>
          <table class="timetable edit-timetable">
            <thead>
              <tr>
                <th style="width:80px;">节次</th>
                <th v-for="d in days" :key="d">{{ d }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in periods" :key="p">
                <td style="font-weight:600; background:#f0f2f5; color:#475569;">第{{ p }}节</td>
                <td v-for="d in 5" :key="d" class="edit-cell">
                  <el-select
                    v-model="editMatrix[d + '-' + p]"
                    placeholder="+ 添加"
                    size="small"
                    clearable
                    filterable
                    style="width:100%;"
                    @change="(val) => onScheduleChange(d, p, val)"
                  >
                    <el-option-group v-for="group in courseGrouped" :key="group.label" :label="group.label">
                      <el-option
                        v-for="course in group.options"
                        :key="course.value"
                        :label="course.label"
                        :value="course.value"
                      >
                        <span>{{ course.label }}</span>
                        <span style="float:right; color:#94a3b8; font-size:11px;">{{ course.teacher }}</span>
                      </el-option>
                    </el-option-group>
                  </el-select>
                </td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:16px; display:flex; justify-content:flex-end; gap:10px;">
            <el-button @click="clearEditMatrix">清空</el-button>
            <el-button type="primary" @click="saveSchedules">保存课表（草稿）</el-button>
          </div>
        </div>

        <div v-if="!editForm.classId" class="empty-state" style="padding:40px;">
          <p>请选择班级和学期后加载或创建课表</p>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 学期弹窗 -->
    <el-dialog v-model="semesterDialogVisible" :title="editingSemester ? '编辑学期' : '新增学期'" width="480px" destroy-on-close>
      <el-form :model="semesterForm" label-width="90px" style="max-width:400px;">
        <el-form-item label="学期名称" required>
          <el-input v-model="semesterForm.name" placeholder="如：2024-2025学年第一学期" />
        </el-form-item>
        <el-form-item label="开始日期" required>
          <el-date-picker v-model="semesterForm.startDate" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width:100%;" />
        </el-form-item>
        <el-form-item label="结束日期" required>
          <el-date-picker v-model="semesterForm.endDate" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width:100%;" />
        </el-form-item>
        <el-form-item label="状态" v-if="editingSemester">
          <el-select v-model="semesterForm.status" style="width:100%;">
            <el-option label="未开始" value="未开始" />
            <el-option label="进行中" value="进行中" />
            <el-option label="已结束" value="已结束" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="semesterDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSemester">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useOaStore } from '@/store/oa'
import { courses, departments, users } from '@/mock/data'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const oaStore = useOaStore()
const activeTab = ref('timetable')
const days = ['周一', '周二', '周三', '周四', '周五']
const periods = [1, 2, 3, 4, 5, 6]
const selectedClass = ref(7)
const selectedSemester = ref(2)

// 教务处可管理课表
const canManageSchedule = computed(() => {
  return userStore.hasRole(['系统管理员', '学校领导', '行政人员'])
})

const classList = computed(() => departments.filter(d => d.type === '班级'))
const activeSemesters = computed(() => oaStore.semestersList)

const currentClassName = computed(() => {
  const cls = classList.value.find(c => c.id === editForm.classId)
  return cls?.name || ''
})

const classSchedules = computed(() =>
  oaStore.schedules.filter(s => s.classId === selectedClass.value && s.semesterId === selectedSemester.value)
)

// 课表状态
function getClassScheduleStatus(classId, semesterId) {
  const sch = oaStore.schedules.find(s => s.classId === classId && s.semesterId === semesterId)
  return sch?.status || '未设置'
}
const currentScheduleStatus = computed(() => getClassScheduleStatus(selectedClass.value, selectedSemester.value))

function getSchedule(day, period) {
  const s = classSchedules.value.find(s => {
    if (s.day !== day) return false
    const [start] = s.period.split('-').map(Number)
    return start === period || (start < period && period <= Number(s.period.split('-')[1]))
  })
  return s
}

// ======== 学期管理 ========
const semesterDialogVisible = ref(false)
const editingSemester = ref(null)
const semesterForm = reactive({ name: '', startDate: '', endDate: '', status: '' })

function showSemesterDialog(row) {
  editingSemester.value = row || null
  if (row) {
    semesterForm.name = row.name
    semesterForm.startDate = row.startDate
    semesterForm.endDate = row.endDate
    semesterForm.status = row.status
  } else {
    semesterForm.name = ''
    semesterForm.startDate = ''
    semesterForm.endDate = ''
    semesterForm.status = '未开始'
  }
  semesterDialogVisible.value = true
}

function saveSemester() {
  if (!semesterForm.name || !semesterForm.startDate || !semesterForm.endDate) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (editingSemester.value) {
    oaStore.updateSemester(editingSemester.value.id, {
      name: semesterForm.name,
      startDate: semesterForm.startDate,
      endDate: semesterForm.endDate,
      status: semesterForm.status
    })
    ElMessage.success('学期信息已更新')
  } else {
    const newId = Math.max(...oaStore.semestersList.map(s => s.id), 0) + 1
    oaStore.addSemester({
      id: newId,
      name: semesterForm.name,
      startDate: semesterForm.startDate,
      endDate: semesterForm.endDate,
      status: '未开始'
    })
    ElMessage.success('学期已添加')
  }
  semesterDialogVisible.value = false
}

function doActivateSemester(row) {
  oaStore.activateSemester(row.id)
  ElMessage.success(`已激活学期：${row.name}`)
}

function doEndSemester(row) {
  oaStore.endSemester(row.id)
  ElMessage.success(`学期 ${row.name} 已结束`)
}

function doDeleteSemester(id) {
  oaStore.deleteSemester(id)
  ElMessage.success('学期已删除')
}

function semesterStatusType(status) {
  const map = { '进行中': 'success', '已结束': 'info', '未开始': 'warning' }
  return map[status] || 'info'
}

// ======== 课表录入 ========
const editForm = reactive({ classId: null, semesterId: 2 })
const editMatrix = ref({})

const courseGrouped = computed(() => {
  const groups = []
  const teachers = users.filter(u => u.roleName === '教师')

  courses.forEach(course => {
    let groupName = course.deptName || '公共课程'
    let group = groups.find(g => g.label === groupName)
    if (!group) {
      group = { label: groupName, options: [] }
      groups.push(group)
    }
    const courseTeachers = teachers.filter(t => t.deptName === course.deptName)
    courseTeachers.forEach(t => {
      group.options.push({
        value: `${course.id}-${t.id}`,
        label: `${course.name}（${t.name}）`,
        teacher: t.name,
        courseName: course.name,
        teacherId: t.id,
        courseId: course.id
      })
    })
    if (courseTeachers.length === 0) {
      group.options.push({
        value: `${course.id}-0`,
        label: `${course.name}`,
        teacher: '',
        courseName: course.name,
        teacherId: 0,
        courseId: course.id
      })
    }
  })
  return groups
})

function loadClassSchedules() {
  if (!editForm.classId || !editForm.semesterId) {
    ElMessage.warning('请选择班级和学期')
    return
  }
  editMatrix.value = {}
  const existing = oaStore.schedules.filter(
    s => s.classId === editForm.classId && s.semesterId === editForm.semesterId
  )
  existing.forEach(s => {
    editMatrix.value[s.day + '-' + s.period.split('-')[0]] =
      `${s.courseId}-${s.teacherId || 0}`
  })
  ElMessage.info(`已加载 ${existing.length} 条课表记录`)
}

function onScheduleChange(day, period, val) {}

function clearEditMatrix() {
  editMatrix.value = {}
}

function saveSchedules() {
  if (!editForm.classId || !editForm.semesterId) {
    ElMessage.warning('请选择班级和学期')
    return
  }

  // 构建新记录
  const newRecords = []
  Object.entries(editMatrix.value).forEach(([key, val]) => {
    if (!val) return
    const [day, period] = key.split('-').map(Number)
    const parts = val.split('-')
    const courseId = Number(parts[0])
    const teacherId = Number(parts[1])
    const courseInfo = courses.find(c => c.id === courseId)
    const teacherInfo = users.find(u => u.id === teacherId)
    const classInfo = classList.value.find(c => c.id === editForm.classId)

    newRecords.push({
      id: Date.now() + Math.random(),
      courseName: courseInfo?.name || '',
      courseId,
      teacher: teacherInfo?.name || '',
      teacherId: teacherId || null,
      className: classInfo?.name || '',
      classId: editForm.classId,
      day,
      period: `${period}-${period}`,
      room: `${editForm.classId}教室`,
      semesterId: editForm.semesterId,
      status: '草稿'
    })
  })

  // 用store方法保存
  oaStore.saveScheduleRecords(editForm.classId, editForm.semesterId, newRecords)

  ElMessage.success(`课表已保存！新增 ${newRecords.length} 条`)
  selectedClass.value = editForm.classId
  selectedSemester.value = editForm.semesterId
  activeTab.value = 'timetable'
}

function doPublishSchedule() {
  oaStore.publishSchedule(selectedClass.value, selectedSemester.value)
  const cls = classList.value.find(c => c.id === selectedClass.value)
  ElMessage.success(`已发布 ${cls?.name || ''} 的课表`)
}

function editCell(day, period) {
  activeTab.value = 'scheduleEdit'
  editForm.classId = selectedClass.value
  editForm.semesterId = selectedSemester.value
  loadClassSchedules()
}

function onClassChange() {}

function handleTabChange(tab) {}

onMounted(() => {
  // 优先选择"进行中"的学期，否则选第一个
  const active = oaStore.semestersList.find(s => s.status === '进行中')
  selectedSemester.value = active?.id || oaStore.semestersList[0]?.id || 2
  editForm.semesterId = selectedSemester.value
})
</script>

<style scoped>
.edit-cell {
  padding: 2px !important;
  vertical-align: middle !important;
}
.edit-cell .el-select {
  width: 100% !important;
}
.edit-timetable td {
  border: 1px solid #e2e8f0 !important;
  padding: 3px !important;
}
.edit-timetable th {
  background: #f1f5f9 !important;
  font-weight: 700 !important;
  font-size: 12px !important;
}
.animate-fadeInUp {
  animation: fadeInUp 0.4s ease both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
