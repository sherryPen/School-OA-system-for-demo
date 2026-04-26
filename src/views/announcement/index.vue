<template>
  <div class="page-container">
    <div class="page-header">
      <h2>通知公告</h2>
      <div style="display:flex; gap:10px; align-items:center;">
        <el-button type="success" size="small" @click="doMarkAllRead" v-if="unreadCount > 0">
          <el-icon><Check /></el-icon>全部已读
        </el-button>
        <el-button v-if="userStore.hasRole(['系统管理员', '学校领导', '行政人员'])" type="primary" @click="publishVisible = true">
          <el-icon><Plus /></el-icon>发布公告
        </el-button>
      </div>
    </div>
    <div class="search-bar">
      <el-input v-model="search.keyword" placeholder="搜索公告标题" style="width:240px;" clearable prefix-icon="Search" />
      <el-select v-model="search.priority" placeholder="优先级" style="width:120px;" clearable>
        <el-option label="普通" value="普通" /><el-option label="重要" value="重要" /><el-option label="紧急" value="紧急" />
      </el-select>
      <el-select v-model="search.scope" placeholder="发布范围" style="width:140px;" clearable>
        <el-option v-for="s in scopes" :key="s" :label="s" :value="s" />
      </el-select>
    </div>
    <el-table :data="filteredList" stripe style="width:100%;" @row-click="handleRowClick">
      <el-table-column type="index" label="#" width="50" />
      <el-table-column label="状态" width="60" align="center">
        <template #default="{ row }">
          <div class="read-dot" :class="{ read: isRead(row.id), unread: !isRead(row.id) }"></div>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="300">
        <template #default="{ row }">
          <span style="cursor:pointer; font-weight:500;" :style="{ color: isRead(row.id) ? '#64748b' : '#4a6cf7' }">
            <el-tag v-if="row.priority === '紧急'" type="danger" size="small" effect="dark" style="margin-right:6px;">紧急</el-tag>
            <el-tag v-else-if="row.priority === '重要'" type="warning" size="small" effect="dark" style="margin-right:6px;">重要</el-tag>
            {{ row.title }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="publisher" label="发布人" width="90" />
      <el-table-column prop="scope" label="发布范围" width="110" />
      <el-table-column prop="publishTime" label="发布时间" width="120" sortable />
      <el-table-column prop="readCount" label="阅读量" width="80" />
    </el-table>

    <el-dialog v-model="publishVisible" title="发布公告" width="600px">
      <el-form :model="pubForm" label-width="80px">
        <el-form-item label="标题" required><el-input v-model="pubForm.title" placeholder="请输入公告标题" /></el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="pubForm.priority"><el-radio label="普通" /><el-radio label="重要" /><el-radio label="紧急" /></el-radio-group>
        </el-form-item>
        <el-form-item label="发布范围">
          <el-select v-model="pubForm.scope" style="width:100%;">
            <el-option v-for="s in scopes" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" required><el-input v-model="pubForm.content" type="textarea" :rows="6" placeholder="请输入公告内容" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="publishVisible = false">取消</el-button><el-button type="primary" @click="doPublish">发布</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useOaStore } from '@/store/oa'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const oaStore = useOaStore()
const search = reactive({ keyword: '', priority: '', scope: '' })
const publishVisible = ref(false)
const pubForm = reactive({ title: '', priority: '普通', scope: '全校', content: '' })

const scopes = ['全校', '全校教职工', '全校学生', '高一师生', '高二师生', '高三师生']

// 从store获取可见公告
const visibleAnnouncements = computed(() => {
  const roleName = userStore.currentUser?.roleName
  const deptName = userStore.currentUser?.deptName
  return oaStore.getVisibleAnnouncements(roleName, deptName)
})

const filteredList = computed(() => {
  return visibleAnnouncements.value.filter(a => {
    if (search.keyword && !a.title.includes(search.keyword)) return false
    if (search.priority && a.priority !== search.priority) return false
    if (search.scope && a.scope !== search.scope) return false
    return true
  }).sort((a, b) => b.publishTime.localeCompare(a.publishTime))
})

// 已读/未读
const userId = computed(() => userStore.currentUser?.id)
function isRead(announcementId) {
  return oaStore.isAnnouncementRead(announcementId, userId.value)
}

const unreadCount = computed(() => visibleAnnouncements.value.filter(a => !isRead(a.id)).length)

function handleRowClick(row) {
  // 自动标记已读
  oaStore.markAnnouncementRead(row.id, userId.value)
  router.push(`/announcement/detail/${row.id}`)
}

function doMarkAllRead() {
  oaStore.markAllAnnouncementsRead(userId.value)
  ElMessage.success('已全部标记为已读')
}

function doPublish() {
  if (!pubForm.title || !pubForm.content) return ElMessage.warning('请填写标题和内容')
  const newId = Math.max(...oaStore.announcements.map(a => a.id), 0) + 1
  oaStore.addAnnouncement({
    id: newId,
    title: pubForm.title,
    publisher: userStore.currentUser?.name,
    publisherId: userStore.currentUser?.id,
    scope: pubForm.scope,
    priority: pubForm.priority,
    publishTime: new Date().toISOString().slice(0, 10),
    content: pubForm.content,
    hasAttachment: false,
    readCount: 0,
    topStatus: false
  })
  // 添加通知
  oaStore.addNotification({
    type: 'announcement',
    title: '新公告发布',
    desc: pubForm.title,
    path: `/announcement/detail/${newId}`,
    userIds: null
  })
  ElMessage.success('公告发布成功')
  publishVisible.value = false
  Object.assign(pubForm, { title: '', priority: '普通', scope: '全校', content: '' })
}
</script>

<style scoped>
.read-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin: 0 auto;
}
.read-dot.unread {
  background: #e94560;
  animation: dotPulse 1.5s infinite;
}
.read-dot.read {
  background: #4ade80;
}
@keyframes dotPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}
</style>
