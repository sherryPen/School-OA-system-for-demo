/**
 * LLM API 服务层 — 智谱 BigModel GLM-4-Flash
 * 
 * 支持流式SSE返回，兼容OpenAI格式
 * API文档：https://open.bigmodel.cn/dev/api/normal-model/glm-4
 */

const API_URL = import.meta.env.DEV
  ? '/api/llm/chat/completions'   // 开发环境走Vite代理，避免CORS
  : 'https://open.bigmodel.cn/api/paas/v4/chat/completions'  // 生产环境直连
const API_KEY = 'REMOVED_USE_ENV_VAR'
const MODEL = 'glm-4-flash'

/**
 * 流式调用 LLM
 * @param {Array} messages - 对话历史 [{role, content}]
 * @param {Function} onChunk - 每收到一段文本的回调 (text: string) => void
 * @param {AbortSignal} signal - 用于取消请求
 * @returns {Promise<string>} 完整回复文本
 */
export async function chatStream(messages, onChunk, signal) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2048
    }),
    signal
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`API请求失败(${response.status}): ${errText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    // SSE 格式：每条以 "data: " 开头，以 "\n\n" 分隔
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // 最后一条可能不完整，留到下次

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue

      const dataStr = trimmed.slice(5).trim()
      if (dataStr === '[DONE]') continue

      try {
        const parsed = JSON.parse(dataStr)
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) {
          fullText += delta
          onChunk(delta)
        }
      } catch (e) {
        // 忽略解析失败的行
      }
    }
  }

  return fullText
}

/**
 * 非流式调用（备用）
 * @param {Array} messages
 * @returns {Promise<string>}
 */
export async function chatOnce(messages) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 2048
    })
  })

  if (!response.ok) {
    throw new Error(`API请求失败(${response.status})`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
