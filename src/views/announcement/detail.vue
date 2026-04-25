<template>
  <div class="page-container">
    <el-button @click="$router.back()" style="margin-bottom:16px;" text><el-icon><ArrowLeft /></el-icon>返回列表</el-button>
    <div v-if="detail" style="max-width:800px; margin:0 auto;">
      <h1 style="font-size:22px; font-weight:700; margin-bottom:14px; color:#1e293b;">
        <el-tag v-if="detail.priority === '紧急'" type="danger" size="small" effect="dark" style="margin-right:6px;">紧急</el-tag>
        <el-tag v-else-if="detail.priority === '重要'" type="warning" size="small" effect="dark" style="margin-right:6px;">重要</el-tag>
        {{ detail.title }}
      </h1>
      <div style="display:flex; gap:18px; color:#94a3b8; font-size:13px; margin-bottom:20px; padding-bottom:14px; border-bottom:1px solid #f1f5f9;">
        <span>发布人：{{ detail.publisher }}</span>
        <span>发布时间：{{ detail.publishTime }}</span>
        <span>发布范围：{{ detail.scope }}</span>
        <span>阅读量：{{ detail.readCount }}</span>
      </div>
      <div style="font-size:15px; line-height:2; white-space:pre-wrap; color:#334155;">{{ detail.content }}</div>
      <div v-if="detail.hasAttachment" style="margin-top:20px; padding:12px 16px; background:#f8fafc; border-radius:10px; border:1px solid #e8ecf1;">
        <el-icon><Paperclip /></el-icon> <el-button text type="primary">下载附件</el-button>
      </div>
    </div>
    <div v-else class="empty-state"><div class="icon">📋</div><p>公告不存在</p></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { announcements } from '@/mock/data'

const route = useRoute()
const detail = computed(() => announcements.find(a => a.id === Number(route.params.id)))
</script>
