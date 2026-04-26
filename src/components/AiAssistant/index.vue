<template>
  <div class="ai-assistant">
    <!-- 浮窗触发按钮 -->
    <transition name="fab-bounce">
      <div v-if="!isOpen" class="ai-fab" @click="togglePanel">
        <div class="fab-inner">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20h6v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z"/>
            <line x1="9" y1="20" x2="15" y2="20"/>
            <line x1="9" y1="22" x2="15" y2="22"/>
          </svg>
        </div>
        <div class="fab-pulse"></div>
      </div>
    </transition>

    <!-- 聊天面板 -->
    <transition name="panel-slide">
      <div v-if="isOpen" class="ai-panel">
        <!-- 面板头部 -->
        <div class="panel-header">
          <div class="header-left">
            <div class="ai-avatar">🤖</div>
            <div class="header-info">
              <h3>OA智能助手</h3>
              <span class="header-status" :class="{ online: !isLoading }">
                {{ isLoading ? '思考中...' : '在线' }}
              </span>
            </div>
          </div>
          <div class="header-actions">
            <el-tooltip content="新对话" placement="bottom">
              <button class="icon-btn" @click="resetChat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                </svg>
              </button>
            </el-tooltip>
            <el-tooltip content="关闭" placement="bottom">
              <button class="icon-btn" @click="togglePanel">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </el-tooltip>
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="panel-messages" ref="messagesContainer">
          <!-- 欢迎消息 -->
          <div v-if="messages.length === 0" class="welcome-section">
            <div class="welcome-avatar">🤖</div>
            <h4>Hi，我是小O</h4>
            <p>中山中学OA系统智能助手，有什么可以帮你？</p>
            <div class="quick-actions">
              <button
                v-for="action in quickActions"
                :key="action.label"
                class="quick-btn"
                @click="sendQuickMessage(action.msg)"
              >
                <span class="qa-icon">{{ action.icon }}</span>
                {{ action.label }}
              </button>
            </div>
          </div>

          <!-- 消息气泡 -->
          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            class="message-row"
            :class="msg.role"
          >
            <div class="msg-avatar" v-if="msg.role === 'assistant'">🤖</div>
            <div class="msg-bubble" :class="msg.role">
              <div
                v-if="msg.role === 'assistant'"
                class="msg-content md-body"
                v-html="msg.html || msg.content"
              ></div>
              <div v-else class="msg-content">{{ msg.content }}</div>
              <div v-if="msg.role === 'assistant' && msg.sources" class="msg-sources">
                <span v-for="s in msg.sources" :key="s" class="source-tag">📋 {{ s }}</span>
              </div>
            </div>
            <div class="msg-avatar user-avatar" v-if="msg.role === 'user'">
              {{ userInitial }}
            </div>
          </div>

          <!-- 正在输入 -->
          <div v-if="isLoading && !streamingText" class="message-row assistant">
            <div class="msg-avatar">🤖</div>
            <div class="msg-bubble assistant typing">
              <div class="typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <!-- 流式输出中的消息 -->
          <div v-if="streamingText" class="message-row assistant">
            <div class="msg-avatar">🤖</div>
            <div class="msg-bubble assistant streaming">
              <div class="msg-content md-body" v-html="streamingHtml"></div>
            </div>
          </div>
        </div>

        <!-- 快捷指令提示 -->
        <div v-if="showSlashMenu" class="slash-menu">
          <div
            v-for="item in filteredSlashCommands"
            :key="item.cmd"
            class="slash-item"
            @click="selectSlashCommand(item)"
          >
            <span class="slash-cmd">{{ item.cmd }}</span>
            <span class="slash-desc">{{ item.desc }}</span>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="panel-input">
          <div class="input-wrapper">
            <el-input
              v-model="inputText"
              placeholder="输入问题，/ 查看快捷指令..."
              :disabled="isLoading"
              @keydown.enter.exact="sendMessage"
              @input="handleInputChange"
              resize="none"
              :rows="1"
              autosize
            />
            <button
              class="send-btn"
              :class="{ active: inputText.trim() && !isLoading }"
              :disabled="!inputText.trim() || isLoading"
              @click="sendMessage"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <div class="input-hint">按 Enter 发送 · 输入 / 快捷指令</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/store/user'
import { useOaStore } from '@/store/oa'
import { chatStream } from '@/services/llm'
import { buildSystemPrompt, buildWelcomeMessage, parseSlashCommand, slashCommands } from '@/services/promptBuilder'
import { renderMarkdown } from '@/utils/markdown'

const userStore = useUserStore()
const oaStore = useOaStore()
const isOpen = ref(false)
const inputText = ref('')
const messages = ref([])
const isLoading = ref(false)
const streamingText = ref('')
const showSlashMenu = ref(false)
const messagesContainer = ref(null)
let abortController = null

// 用户头像首字
const userInitial = computed(() => userStore.currentUser?.name?.charAt(0) || 'U')

// 流式渲染HTML
const streamingHtml = computed(() => renderMarkdown(streamingText.value))

// 快捷操作
const quickActions = [
  { icon: '📋', label: '请假规则', msg: '/请假' },
  { icon: '💰', label: '报销标准', msg: '/报销' },
  { icon: '📅', label: '今日会议', msg: '/会议' },
  { icon: '📝', label: '我的待办', msg: '/待办' },
  { icon: '❓', label: '常见问题', msg: 'OA系统有哪些常见问题？' }
]

// 过滤快捷指令
const filteredSlashCommands = computed(() => {
  const q = inputText.value.toLowerCase()
  if (!q.startsWith('/')) return slashCommands
  return slashCommands.filter(c => c.cmd.toLowerCase().includes(q))
})

// 切换面板
function togglePanel() {
  isOpen.value = !isOpen.value
  if (isOpen.value && messages.value.length === 0) {
    // 首次打开，显示欢迎消息
    const welcome = buildWelcomeMessage(userStore.currentUser, oaStore)
    messages.value.push({
      role: 'assistant',
      content: welcome,
      html: renderMarkdown(welcome)
    })
  }
  if (isOpen.value) {
    nextTick(() => {
      const input = document.querySelector('.panel-input .el-textarea__inner')
      input?.focus()
    })
  }
}

// 输入变化 — 检测斜杠指令
function handleInputChange() {
  const val = inputText.value
  showSlashMenu.value = val.startsWith('/') && val.length <= 6
}

// 选择快捷指令
function selectSlashCommand(item) {
  inputText.value = item.cmd + ' '
  showSlashMenu.value = false
  nextTick(() => {
    const input = document.querySelector('.panel-input .el-textarea__inner')
    input?.focus()
  })
}

// 快捷按钮发送
function sendQuickMessage(msg) {
  inputText.value = msg
  sendMessage()
}

// 发送消息
async function sendMessage(e) {
  if (e) e.preventDefault()
  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  // 检测快捷指令
  const slash = parseSlashCommand(text)
  let actualText = text
  if (slash) {
    if (slash.cmd === '/帮助' || (!slash.prompt && slash.cmd.startsWith('/'))) {
      // 显示帮助
      const helpText = buildHelpMessage()
      messages.value.push({ role: 'user', content: text })
      messages.value.push({
        role: 'assistant',
        content: helpText,
        html: renderMarkdown(helpText)
      })
      inputText.value = ''
      scrollToBottom()
      return
    }
    if (slash.prompt) {
      actualText = slash.prompt
    }
  }

  showSlashMenu.value = false

  // 添加用户消息
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''

  // 构建对话历史
  const systemPrompt = buildSystemPrompt(userStore.currentUser, oaStore)
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.value.slice(-10).map(m => ({
      role: m.role,
      content: m.role === 'user' ? m.content : m.content
    }))
  ]

  // 流式调用
  isLoading.value = true
  streamingText.value = ''
  abortController = new AbortController()

  try {
    const fullText = await chatStream(
      chatMessages,
      (chunk) => {
        streamingText.value += chunk
        scrollToBottom()
      },
      abortController.signal
    )

    // 流式完成，添加到消息列表
    const sourceMatch = fullText.match(/来源[：:]《(.+?)》/g)
    const sources = sourceMatch ? sourceMatch.map(s => s.replace(/来源[：:]《/, '').replace(/》/, '')) : []

    messages.value.push({
      role: 'assistant',
      content: fullText,
      html: renderMarkdown(fullText),
      sources: sources.length > 0 ? sources : undefined
    })
  } catch (err) {
    if (err.name === 'AbortError') return
    const errMsg = `抱歉，请求出错了：${err.message}`
    messages.value.push({
      role: 'assistant',
      content: errMsg,
      html: renderMarkdown(errMsg)
    })
  } finally {
    isLoading.value = false
    streamingText.value = ''
    abortController = null
    scrollToBottom()
  }
}

// 构建帮助消息
function buildHelpMessage() {
  let help = '🤖 **可用快捷指令：**\n\n'
  slashCommands.forEach(c => {
    help += `- \`${c.cmd}\` — ${c.desc}\n`
  })
  help += '\n你也可以直接用自然语言提问，比如"病假怎么请？""出差住北京能报多少住宿费？"'
  return help
}

// 重置对话
function resetChat() {
  if (isLoading.value && abortController) {
    abortController.abort()
  }
  messages.value = []
  isLoading.value = false
  streamingText.value = ''
  // 重新显示欢迎消息
  const welcome = buildWelcomeMessage(userStore.currentUser, oaStore)
  messages.value.push({
    role: 'assistant',
    content: welcome,
    html: renderMarkdown(welcome)
  })
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// ESC 关闭
function handleKeydown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (abortController) abortController.abort()
})
</script>

<style scoped>
/* ======== 浮窗按钮 ======== */
.ai-assistant { position: fixed; z-index: 9999; bottom: 28px; right: 28px; }

.ai-fab {
  width: 56px; height: 56px;
  cursor: pointer;
  position: relative;
}
.fab-inner {
  width: 56px; height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #4a6cf7 0%, #7c5cfc 100%);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(74, 108, 247, 0.4);
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.ai-fab:hover .fab-inner {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(74, 108, 247, 0.55);
}
.fab-pulse {
  position: absolute; inset: 0;
  border-radius: 16px;
  border: 2px solid rgba(74, 108, 247, 0.4);
  animation: fabPulse 2.5s ease-in-out infinite;
}
@keyframes fabPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.18); opacity: 0; }
}

/* ======== 聊天面板 ======== */
.ai-panel {
  width: 400px;
  height: 580px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* ======== 头部 ======== */
.panel-header {
  padding: 16px 18px;
  background: linear-gradient(135deg, #4a6cf7 0%, #7c5cfc 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 10px; }
.ai-avatar {
  width: 36px; height: 36px;
  background: rgba(255,255,255,0.2);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}
.header-info h3 { margin: 0; font-size: 15px; font-weight: 600; }
.header-status {
  font-size: 11px;
  opacity: 0.8;
}
.header-status.online::before {
  content: '';
  display: inline-block;
  width: 6px; height: 6px;
  background: #4ade80;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}
.header-actions { display: flex; gap: 4px; }
.icon-btn {
  width: 32px; height: 32px;
  border: none;
  background: rgba(255,255,255,0.15);
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.icon-btn:hover { background: rgba(255,255,255,0.3); }

/* ======== 消息列表 ======== */
.panel-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f8f9fc;
}
.panel-messages::-webkit-scrollbar { width: 4px; }
.panel-messages::-webkit-scrollbar-track { background: transparent; }
.panel-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }

/* ======== 欢迎区 ======== */
.welcome-section {
  text-align: center;
  padding: 24px 12px;
}
.welcome-avatar {
  font-size: 48px;
  margin-bottom: 12px;
  animation: welcomeFloat 3s ease-in-out infinite;
}
@keyframes welcomeFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.welcome-section h4 { margin: 0 0 6px; font-size: 18px; color: #1e293b; }
.welcome-section p { margin: 0 0 20px; font-size: 13px; color: #64748b; }
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.quick-btn {
  padding: 7px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}
.quick-btn:hover {
  border-color: #4a6cf7;
  color: #4a6cf7;
  background: #f0f4ff;
  transform: translateY(-1px);
}
.qa-icon { font-size: 14px; }

/* ======== 消息气泡 ======== */
.message-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  align-items: flex-start;
  animation: msgFadeIn 0.3s ease;
}
@keyframes msgFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.message-row.user { justify-content: flex-end; }
.msg-avatar {
  width: 30px; height: 30px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  background: #eef2ff;
}
.user-avatar {
  background: linear-gradient(135deg, #4a6cf7, #6366f1);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}
.msg-bubble {
  max-width: 300px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.7;
  word-break: break-word;
}
.msg-bubble.user {
  background: linear-gradient(135deg, #4a6cf7, #6366f1);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.msg-bubble.assistant {
  background: #fff;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-bottom-left-radius: 4px;
}
.msg-bubble.streaming {
  border-color: #c7d2fe;
  box-shadow: 0 0 0 1px rgba(74, 108, 247, 0.1);
}

/* 正在输入动画 */
.typing-dots {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}
.typing-dots span {
  width: 7px; height: 7px;
  background: #94a3b8;
  border-radius: 50%;
  animation: typingBounce 1.2s infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* 引用来源 */
.msg-sources {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.source-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: #f0f4ff;
  color: #4a6cf7;
  border-radius: 10px;
}

/* ======== Markdown 渲染样式 ======== */
.md-body :deep(.md-h1) { font-size: 16px; font-weight: 700; color: #1e293b; margin: 10px 0 6px; }
.md-body :deep(.md-h2) { font-size: 14px; font-weight: 700; color: #1e293b; margin: 8px 0 4px; padding-left: 8px; border-left: 3px solid #4a6cf7; }
.md-body :deep(.md-h3) { font-size: 13px; font-weight: 600; color: #334155; margin: 6px 0 3px; }
.md-body :deep(strong) { color: #1e293b; font-weight: 600; }
.md-body :deep(em) { color: #64748b; }
.md-body :deep(.md-link) { color: #4a6cf7; text-decoration: none; }
.md-body :deep(.md-link:hover) { text-decoration: underline; }
.md-body :deep(.md-inline-code) {
  background: #f1f5f9;
  color: #e11d48;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
}
.md-body :deep(.md-code-block) {
  margin: 8px 0;
  border-radius: 8px;
  overflow: hidden;
  background: #1e293b;
}
.md-body :deep(.code-lang) {
  display: block;
  padding: 4px 12px;
  font-size: 11px;
  color: #94a3b8;
  background: rgba(0,0,0,0.2);
}
.md-body :deep(.md-code-block pre) {
  margin: 0;
  padding: 10px 12px;
  color: #e2e8f0;
  font-size: 12px;
  overflow-x: auto;
}
.md-body :deep(.md-code-block code) {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
}
.md-body :deep(.md-ul), .md-body :deep(.md-ol) {
  padding-left: 18px;
  margin: 4px 0;
}
.md-body :deep(.md-li) { margin: 2px 0; }
.md-body :deep(.md-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 12px;
}
.md-body :deep(.md-table th) {
  background: #f8fafc;
  font-weight: 600;
  padding: 5px 8px;
  border: 1px solid #e5e7eb;
  text-align: left;
}
.md-body :deep(.md-table td) {
  padding: 5px 8px;
  border: 1px solid #e5e7eb;
}
.md-body :deep(.md-hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 10px 0;
}

/* ======== 快捷指令菜单 ======== */
.slash-menu {
  position: absolute;
  bottom: 100px;
  left: 16px;
  right: 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  overflow: hidden;
  z-index: 10;
}
.slash-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.slash-item:hover { background: #f0f4ff; }
.slash-cmd {
  font-weight: 600;
  color: #4a6cf7;
  font-size: 13px;
  min-width: 48px;
}
.slash-desc { font-size: 12px; color: #64748b; }

/* ======== 输入区 ======== */
.panel-input {
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #f1f5f9;
  flex-shrink: 0;
}
.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #f8f9fc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 6px 8px 6px 14px;
  transition: border-color 0.2s;
}
.input-wrapper:focus-within {
  border-color: #4a6cf7;
  box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.1);
}
.input-wrapper :deep(.el-textarea__inner) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0;
  font-size: 13px;
  line-height: 1.5;
  min-height: 22px !important;
  resize: none;
}
.send-btn {
  width: 34px; height: 34px;
  border: none;
  background: #e2e8f0;
  color: #94a3b8;
  border-radius: 8px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}
.send-btn.active {
  background: linear-gradient(135deg, #4a6cf7, #6366f1);
  color: #fff;
}
.send-btn.active:hover {
  transform: scale(1.05);
}
.input-hint {
  text-align: right;
  font-size: 11px;
  color: #cbd5e1;
  margin-top: 4px;
}

/* ======== 过渡动画 ======== */
.fab-bounce-enter-active { animation: fabBounceIn 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
.fab-bounce-leave-active { animation: fabBounceOut 0.25s ease; }
@keyframes fabBounceIn {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes fabBounceOut {
  to { opacity: 0; transform: scale(0.5); }
}

.panel-slide-enter-active { animation: panelSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
.panel-slide-leave-active { animation: panelSlideOut 0.2s ease; }
@keyframes panelSlideIn {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes panelSlideOut {
  to { opacity: 0; transform: translateY(20px) scale(0.95); }
}
</style>
