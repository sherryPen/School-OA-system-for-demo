/**
 * Vercel Serverless Function — 智谱 BigModel API 代理
 *
 * 路由：/api/llm/chat/completions
 * 作用：在服务端注入 API Key，前端代码中不暴露密钥
 *
 * 环境变量（在 Vercel Dashboard → Settings → Environment Variables 中设置）：
 *   ZHIPU_API_KEY = "你的智谱API Key"
 */

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) {
    console.error('[llm-proxy] ZHIPU_API_KEY 环境变量未设置')
    return res.status(500).json({ error: 'API Key 未配置，请在 Vercel 环境变量中设置 ZHIPU_API_KEY' })
  }

  // 判断是否请求流式响应
  const isStream = req.body.stream === true

  try {
    if (isStream) {
      // ===== 流式 SSE 代理 =====
      const upstream = await fetch(ZHIPU_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(req.body)
      })

      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => '')
        console.error(`[llm-proxy] 上游返回 ${upstream.status}: ${errText}`)
        return res.status(upstream.status).json({ error: `智谱API请求失败(${upstream.status})` })
      }

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      // 管道转发上游 SSE 数据
      const reader = upstream.body.getReader()
      const decoder = new TextDecoder('utf-8')

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          res.write(chunk)
        }
      } catch (streamErr) {
        // 客户端断开连接等情况
        console.log('[llm-proxy] 流中断:', streamErr.message)
      }

      res.end()
    } else {
      // ===== 非流式代理 =====
      const upstream = await fetch(ZHIPU_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(req.body)
      })

      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => '')
        console.error(`[llm-proxy] 上游返回 ${upstream.status}: ${errText}`)
        return res.status(upstream.status).json({ error: `智谱API请求失败(${upstream.status})` })
      }

      const data = await upstream.json()
      return res.status(200).json(data)
    }
  } catch (err) {
    console.error('[llm-proxy] 代理异常:', err)
    return res.status(500).json({ error: '代理请求异常' })
  }
}
