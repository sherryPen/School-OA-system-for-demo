<template>
  <div class="help-center">
    <!-- 顶部横幅 -->
    <div class="hero-banner">
      <div class="hero-bg">
        <div class="floating-icon fi-1">📋</div>
        <div class="floating-icon fi-2">💡</div>
        <div class="floating-icon fi-3">📖</div>
      </div>
      <div class="hero-content">
        <h1 class="animate-fadeInUp">
          <el-icon><ChatDotRound /></el-icon> 帮助中心
        </h1>
        <p class="hero-subtitle animate-fadeInUp" style="animation-delay:0.1s">
          中山中学OA系统使用指南 · 规章制度 · 常见问题
        </p>
        <!-- 搜索框 -->
        <div class="search-box animate-fadeInUp" style="animation-delay:0.2s">
          <el-input
            v-model="searchQuery"
            placeholder="搜索制度文档、操作指南、常见问题..."
            size="large"
            clearable
            :prefix-icon="Search"
            @input="handleSearch"
          />
        </div>
        <!-- 快捷标签 -->
        <div class="hot-tags animate-fadeInUp" style="animation-delay:0.3s">
          <span
            v-for="kw in hotKeywords"
            :key="kw"
            class="hot-tag"
            @click="searchQuery = kw; handleSearch()"
          >{{ kw }}</span>
        </div>
      </div>
    </div>

    <!-- 分类Tab + 文档列表 -->
    <div class="content-wrapper">
      <div class="section-header">
        <div class="category-tabs">
          <el-radio-group v-model="activeCategory" size="default" @change="handleCategoryChange">
            <el-radio-button v-for="cat in categories" :key="cat.key" :value="cat.key">
              {{ cat.label }}
              <span v-if="cat.key !== 'all'" class="tab-count">{{ getCatCount(cat.key) }}</span>
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="result-info" v-if="searchQuery">
          找到 <strong>{{ filteredDocs.length }}</strong> 条与 "<em>{{ searchQuery }}</em>" 相关的结果
        </div>
      </div>

      <!-- 文档卡片网格 -->
      <transition-group name="list-slide" tag="div" class="doc-grid">
        <div
          v-for="doc in filteredDocs"
          :key="doc.id"
          class="doc-card hover-card"
          @click="openDoc(doc)"
        >
          <div class="card-header" :style="{ borderLeftColor: doc.color }">
            <div class="card-icon" :style="{ background: doc.color + '15', color: doc.color }">
              <el-icon :size="24"><component :is="doc.icon" /></el-icon>
            </div>
            <div class="card-meta">
              <span class="card-category" :style="{ background: doc.color + '15', color: doc.color }">{{ doc.category }}</span>
              <span class="card-author">{{ doc.author }}</span>
            </div>
          </div>
          <h3 class="card-title">{{ doc.title }}</h3>
          <p class="card-summary">{{ doc.summary }}</p>
          <div class="card-tags">
            <el-tag v-for="tag in doc.tags.slice(0, 6)" :key="tag" size="small" type="info" effect="plain" round>
              {{ tag }}
            </el-tag>
            <span v-if="doc.tags.length > 6" class="more-tags">+{{ doc.tags.length - 6 }}</span>
          </div>
          <div class="card-footer">
            <span class="update-time"><el-icon><Clock /></el-icon> {{ doc.updatedAt }}</span>
            <span class="read-more">查看详情 <el-icon><ArrowRight /></el-icon></span>
          </div>
        </div>
      </transition-group>

      <!-- 空状态 -->
      <el-empty v-if="filteredDocs.length === 0" description="没有找到相关内容，换个关键词试试吧">
        <el-button type="primary" @click="searchQuery = ''; activeCategory = 'all'">清除筛选</el-button>
      </el-empty>
    </div>

    <!-- 文档详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      :title="currentDoc?.title"
      width="720px"
      top="5vh"
      class="doc-detail-dialog"
      destroy-on-close
    >
      <template #header>
        <div class="dialog-header">
          <div class="dialog-title-row">
            <div class="dialog-icon" :style="{ background: currentDoc?.color + '15', color: currentDoc?.color }">
              <el-icon :size="22"><component :is="currentDoc?.icon" /></el-icon>
            </div>
            <div>
              <h2>{{ currentDoc?.title }}</h2>
              <div class="dialog-meta">
                <el-tag :style="{ background: currentDoc?.color + '15', color: currentDoc?.color, border: 'none' }" size="small">
                  {{ currentDoc?.category }}
                </el-tag>
                <span>{{ currentDoc?.author }} · {{ currentDoc?.version }} · 更新于{{ currentDoc?.updatedAt }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div class="doc-content-body" v-html="renderedContent"></div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailVisible = false">关闭</el-button>
          <el-button type="primary" plain @click="copyContent">
            <el-icon><CopyDocument /></el-icon> 复制内容
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ChatDotRound, Search, Clock, ArrowRight,
  DocumentChecked, Wallet, UserFilled, Document, CopyDocument,
  Calendar, Reading, DataAnalysis
} from '@element-plus/icons-vue'
import { knowledgeBase, categories, hotKeywords } from '@/data/knowledge-base'

const searchQuery = ref('')
const activeCategory = ref('all')
const detailVisible = ref(false)
const currentDoc = ref(null)

// 过滤后的文档列表
const filteredDocs = computed(() => {
  let docs = knowledgeBase

  // 按分类过滤
  if (activeCategory.value !== 'all') {
    docs = docs.filter(d => d.category === activeCategory.value)
  }

  // 按搜索词过滤
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    docs = docs.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.summary.toLowerCase().includes(q) ||
      d.tags.some(t => t.toLowerCase().includes(q)) ||
      d.content.toLowerCase().includes(q)
    )
  }

  return [...docs].sort((a, b) => a.order - b.order)
})

function getCatCount(catKey) {
  return knowledgeBase.filter(d => d.category === catKey).length
}

function handleSearch() {}
function handleCategoryChange() {}

function openDoc(doc) {
  currentDoc.value = doc
  detailVisible.value = true
}

// Markdown → HTML（简易渲染，只处理标题、表格、加粗、代码块、列表）
const renderedContent = computed(() => {
  if (!currentDoc.value?.content) return ''
  let html = currentDoc.value.content
    // 标题 ## → h2, ### → h3
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 加粗
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 代码块 ``` → pre/code
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // 表格行
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      if (cells.every(c => c.trim().match(/^[-:]+$/))) return '' // 分隔行跳过
      return '<tr>' + cells.map(c => `<td>${c.replace(/\*\*/g, '').trim()}</td>`).join('') + '</tr>'
    })
    // 将连续的tr包裹为table
    .replace(/(<tr>.+?<\/tr>(\r?\n)?)+/g, (match) => '<table>' + match + '</table>')
    // 无序列表
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => '<ul>' + match + '</ul>')
    // 有序列表
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // 分隔线
    .replace(/^---$/gm, '<hr />')
    // 空行分段
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />')

  return '<p>' + html + '</p>'
})

function copyContent() {
  if (!currentDoc.value) return
  navigator.clipboard.writeText(currentDoc.value.content).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.warning('复制失败，请手动选择复制')
  })
}
</script>

<style scoped>
.help-center { min-height: 100%; background: #f5f7fa; }

/* ======== 顶部横幅 ======== */
.hero-banner {
  position: relative;
  background: linear-gradient(135deg, #4a6cf7 0%, #7c5cfc 50%, #a855f7 100%);
  padding: 48px 40px 40px;
  overflow: hidden;
}
.hero-bg {
  position: absolute; inset: 0; overflow: hidden;
}
.floating-icon {
  position: absolute;
  font-size: 28px;
  opacity: 0.12;
  animation: floatIcon 8s ease-in-out infinite;
}
.fi-1 { top: 20%; left: 10%; animation-delay: 0s; }
.fi-2 { top: 60%; right: 15%; animation-delay: 2s; }
.fi-3 { bottom: 20%; left: 30%; animation-delay: 4s; }

@keyframes floatIcon {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-16px); }
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
}
.hero-content h1 {
  font-size: 28px;
  color: #fff;
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.hero-subtitle {
  color: rgba(255,255,255,0.85);
  font-size: 14px;
  margin: 0 0 24px;
}

.search-box {
  max-width: 520px;
  margin: 0 auto 16px;
}
.search-box :deep(.el-input__wrapper) {
  border-radius: 22px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  padding: 4px 18px;
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.hot-tag {
  padding: 4px 14px;
  background: rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.9);
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
}
.hot-tag:hover {
  background: rgba(255,255,255,0.35);
  transform: translateY(-1px);
}

/* ======== 内容区 ======== */
.content-wrapper {
  max-width: 1100px;
  margin: -24px auto 32px;
  padding: 0 24px;
  position: relative;
  z-index: 2;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}
.result-info {
  font-size: 13px;
  color: #666;
}
.result-info em { color: #4a6cf7; font-style: normal; }
.result-info strong { color: #4a6cf7; }

.tab-count {
  margin-left: 4px;
  font-size: 11px;
  opacity: 0.7;
}

/* ======== 文档卡片网格 ======== */
.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.doc-card {
  background: #fff;
  border-radius: 12px;
  padding: 22px;
  cursor: pointer;
  border-left: 4px solid transparent;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
  border-left: 4px solid;
  padding-left: 12px;
}
.card-icon {
  width: 44px; height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card-meta {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.card-category {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 500;
}
.card-author { font-size: 12px; color: #999; }

.card-title {
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px;
  line-height: 1.4;
}
.card-summary {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 12px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 14px;
}
.more-tags {
  font-size: 11px;
  color: #999;
  align-self: center;
  margin-left: 2px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  font-size: 12px;
  color: #94a3b8;
}
.update-time { display: flex; align-items: center; gap: 3px; }
.read-more {
  color: #4a6cf7;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
}

/* ======== 详情弹窗 ======== */
.dialog-header { width: 100%; }
.dialog-title-row { display: flex; align-items: flex-start; gap: 14px; }
.dialog-icon {
  width: 46px; height: 46px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dialog-title-row h2 {
  margin: 0 0 6px;
  font-size: 18px;
  color: #1e293b;
}
.dialog-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #94a3b8;
}

.doc-content-body {
  max-height: 55vh;
  overflow-y: auto;
  padding-right: 8px;
  line-height: 1.8;
  font-size: 14px;
  color: #374151;
}
.doc-content-body :deep(h1) {
  font-size: 20px; color: #1e293b; margin: 16px 0 10px; padding-bottom: 8px; border-bottom: 2px solid #eef2ff;
}
.doc-content-body :deep(h2) {
  font-size: 17px; color: #1e293b; margin: 14px 0 8px; padding-left: 10px; border-left: 3px solid #4a6cf7;
}
.doc-content-body :deep(h3) {
  font-size: 15px; color: #334155; margin: 12px 0 6px;
}
.doc-content-body :deep(p) { margin: 6px 0; white-space: normal; }
.doc-content-body :deep(strong) { color: #1e293b; }
.doc-content-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 13px;
}
.doc-content-body :deep(th), .doc-content-body :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  text-align: left;
}
.doc-content-body :deep(th) { background: #f8fafc; font-weight: 600; }
.doc-content-body :deep(pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 14px 18px;
  border-radius: 8px;
  margin: 10px 0;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
}
.doc-content-body :deep(code.inline-code) {
  background: #f1f5f9;
  color: #e11d48;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 13px;
}
.doc-content-body :deep(ul) { padding-left: 18px; margin: 8px 0; }
.doc-content-body :deep(li) { margin: 3px 0; }
.doc-content-body :deep(hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 14px 0;
}

.dialog-footer { display: flex; justify-content: flex-end; gap: 10px; }

/* 列表动画 */
.list-slide-enter-active { transition: all 0.35s ease; }
.list-slide-leave-active { transition: all 0.25s ease; }
.list-slide-enter-from { opacity: 0; transform: translateY(16px); }
.list-slide-leave-to { opacity: 0; transform: scale(0.96); }
.list-slide-move { transition: transform 0.35s ease; }

/* 滚动条 */
.doc-content-body::-webkit-scrollbar { width: 5px; }
.doc-content-body::-webkit-scrollbar-track { background: transparent; }
.doc-content-body::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
</style>
