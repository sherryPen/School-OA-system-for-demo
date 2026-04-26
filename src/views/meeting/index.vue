<template>
  <div class="page-container">
    <div class="page-header">
      <h2>会议管理</h2>
      <el-button type="primary" @click="openAddMeeting"><el-icon><Plus /></el-icon>新建会议</el-button>
    </div>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="会议列表" name="list">
        <div class="search-bar">
          <el-input v-model="search.keyword" placeholder="搜索会议主题" style="width:240px;" clearable prefix-icon="Search" />
          <el-select v-model="search.status" placeholder="会议状态" style="width:120px;" clearable>
            <el-option label="待召开" value="待召开" /><el-option label="进行中" value="进行中" /><el-option label="已结束" value="已结束" />
          </el-select>
        </div>
        <el-table :data="filteredMeetings" stripe>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="title" label="会议主题" min-width="200" />
          <el-table-column prop="organizer" label="发起人" width="90" />
          <el-table-column prop="roomName" label="会议室" width="110" />
          <el-table-column prop="startTime" label="开始时间" width="150" sortable />
          <el-table-column prop="endTime" label="结束时间" width="150" />
          <el-table-column prop="attendeeCount" label="参会人数" width="90" />
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === '已结束' ? 'info' : row.status === '进行中' ? 'success' : 'warning'" size="small" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="viewDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="会议室管理" name="rooms">
        <el-table :data="oaStore.meetingRooms" stripe>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="name" label="会议室名称" width="140" />
          <el-table-column prop="location" label="位置" width="140" />
          <el-table-column prop="capacity" label="容量" width="100">
            <template #default="{ row }">{{ row.capacity }}人</template>
          </el-table-column>
          <el-table-column prop="equipment" label="设备配置" min-width="200" />
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }"><el-tag type="success" size="small" effect="plain">{{ row.status }}</el-tag></template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 会议详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="currentMeeting?.title" width="600px">
      <el-descriptions :column="2" border v-if="currentMeeting">
        <el-descriptions-item label="发起人">{{ currentMeeting.organizer }}</el-descriptions-item>
        <el-descriptions-item label="会议室">{{ currentMeeting.roomName }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ currentMeeting.startTime }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ currentMeeting.endTime }}</el-descriptions-item>
        <el-descriptions-item label="参会人数">{{ currentMeeting.attendeeCount }}人</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="currentMeeting.status === '已结束' ? 'info' : 'success'" effect="plain">{{ currentMeeting.status }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="参会人员" :span="2">{{ currentMeeting.attendees?.join('、') }}</el-descriptions-item>
        <el-descriptions-item label="会议议程" :span="2"><div style="white-space:pre-wrap;">{{ currentMeeting.agenda }}</div></el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 新建会议弹窗 -->
    <el-dialog v-model="addVisible" title="新建会议" width="560px">
      <el-form :model="addForm" label-width="90px">
        <el-form-item label="会议主题" required><el-input v-model="addForm.title" placeholder="请输入会议主题" /></el-form-item>
        <el-form-item label="会议室" required>
          <el-select v-model="addForm.roomId" style="width:100%;" placeholder="选择会议室" @change="onRoomSelect">
            <el-option v-for="r in oaStore.meetingRooms" :key="r.id" :label="`${r.name}（${r.location}，${r.capacity}人）`" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间" required>
          <el-date-picker v-model="addForm.startDateTime" type="datetime" style="width:100%;" placeholder="选择开始时间" value-format="YYYY-MM-DD HH:mm" />
        </el-form-item>
        <el-form-item label="结束时间" required>
          <el-date-picker v-model="addForm.endDateTime" type="datetime" style="width:100%;" placeholder="选择结束时间" value-format="YYYY-MM-DD HH:mm" />
        </el-form-item>
        <el-form-item label="参会人数"><el-input-number v-model="addForm.attendeeCount" :min="1" style="width:100%;" /></el-form-item>
        <el-form-item label="会议议程"><el-input v-model="addForm.agenda" type="textarea" :rows="4" placeholder="请输入会议议程" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" @click="doAddMeeting">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { useOaStore } from '@/store/oa'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const oaStore = useOaStore()
const activeTab = ref('list')
const search = reactive({ keyword: '', status: '' })
const detailVisible = ref(false)
const addVisible = ref(false)
const currentMeeting = ref(null)

// 从store获取可见会议
const visibleMeetings = computed(() => {
  const roleName = userStore.currentUser?.roleName
  const userName = userStore.currentUser?.name
  return oaStore.getVisibleMeetings(roleName, userName)
})

const addForm = reactive({
  title: '', roomId: null, roomName: '', startDateTime: '', endDateTime: '',
  attendeeCount: 5, agenda: ''
})

const filteredMeetings = computed(() => {
  return visibleMeetings.value.filter(m => {
    if (search.keyword && !m.title.includes(search.keyword)) return false
    if (search.status && m.status !== search.status) return false
    return true
  })
})

function viewDetail(row) {
  currentMeeting.value = row
  detailVisible.value = true
}

function openAddMeeting() {
  Object.assign(addForm, { title: '', roomId: null, roomName: '', startDateTime: '', endDateTime: '', attendeeCount: 5, agenda: '' })
  addVisible.value = true
}

function onRoomSelect(roomId) {
  const room = oaStore.meetingRooms.find(r => r.id === roomId)
  if (room) addForm.roomName = room.name
}

function doAddMeeting() {
  if (!addForm.title) return ElMessage.warning('请输入会议主题')
  if (!addForm.roomId) return ElMessage.warning('请选择会议室')
  if (!addForm.startDateTime) return ElMessage.warning('请选择开始时间')
  if (!addForm.endDateTime) return ElMessage.warning('请选择结束时间')
  
  const newId = Math.max(...oaStore.meetingList.map(m => m.id), 0) + 1
  oaStore.addMeeting({
    id: newId,
    title: addForm.title,
    organizer: userStore.currentUser?.name,
    organizerId: userStore.currentUser?.id,
    roomId: addForm.roomId,
    roomName: addForm.roomName,
    startTime: addForm.startDateTime,
    endTime: addForm.endDateTime,
    attendeeCount: addForm.attendeeCount,
    attendees: [userStore.currentUser?.name],
    agenda: addForm.agenda,
    status: '待召开',
    minutes: ''
  })

  // 同时添加通知
  oaStore.addNotification({
    type: 'meeting',
    title: '新会议通知',
    desc: `${addForm.title} - ${addForm.startDateTime}`,
    path: '/meeting',
    userIds: null
  })

  ElMessage.success('会议已创建')
  addVisible.value = false
}
</script>
