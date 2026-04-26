/**
 * Markdown 渲染工具
 * 将AI回复的Markdown文本转为安全HTML
 * 
 * 支持的语法：
 * - 标题 # ## ###
 * - 加粗 **text**
 * - 行内代码 `code`
 * - 代码块 ```lang ... ```
 * - 无序列表 - item
 * - 有序列表 1. item
 * - 表格 | col | col |
 * - 分隔线 ---
 * - 链接 [text](url)
 * - 换行
 */

export function renderMarkdown(md) {
  if (!md) return ''

  let html = md

  // 1. 转义HTML特殊字符（保留后续需要处理的Markdown语法）
  // 注意：不做全局转义，因为我们需要处理Markdown语法

  // 2. 代码块（先处理，避免内部被其他规则影响）
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const escaped = escapeHtml(code.trim())
    const langLabel = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : ''
    return `<div class="md-code-block">${langLabel}<pre><code>${escaped}</code></pre></div>`
  })

  // 3. 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')

  // 4. 标题
  html = html.replace(/^### (.+)$/gm, '<h4 class="md-h3">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="md-h2">$1</h3>')
  html = html.replace(/^# (.+)$/gm, '<h2 class="md-h1">$1</h2>')

  // 5. 加粗 + 斜体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // 6. 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>')

  // 7. 分隔线
  html = html.replace(/^---+$/gm, '<hr class="md-hr" />')

  // 8. 表格
  html = html.replace(/(^\|.+\|$\n?)+/gm, (match) => {
    const rows = match.trim().split('\n').filter(r => r.trim())
    if (rows.length < 2) return match

    let tableHtml = '<table class="md-table"><thead>'
    
    // 表头
    const headerCells = rows[0].split('|').filter(c => c.trim())
    tableHtml += '<tr>' + headerCells.map(c => `<th>${c.trim()}</th>`).join('') + '</tr></thead><tbody>'

    // 数据行（跳过分隔行）
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].split('|').filter(c => c.trim())
      if (cells.every(c => /^[-:]+$/.test(c.trim()))) continue // 分隔行跳过
      tableHtml += '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>'
    }

    tableHtml += '</tbody></table>'
    return tableHtml
  })

  // 9. 无序列表
  html = html.replace(/^[-*] (.+)$/gm, '<li class="md-li">$1</li>')
  html = html.replace(/((?:<li class="md-li">.*<\/li>\s*)+)/g, '<ul class="md-ul">$1</ul>')

  // 10. 有序列表
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="md-oli">$1</li>')
  html = html.replace(/((?:<li class="md-oli">.*<\/li>\s*)+)/g, '<ol class="md-ol">$1</ol>')

  // 11. 段落处理 — 双换行分段
  html = html.replace(/\n\n+/g, '</p><p>')
  // 单换行 → <br>（列表/标题/代码块之间不需要）
  html = html.replace(/\n/g, '<br>')

  // 包裹段落
  html = '<p>' + html + '</p>'

  // 清理空段落
  html = html.replace(/<p>\s*<\/p>/g, '')
  html = html.replace(/<p>\s*(<h[2-4]|<ul|<ol|<table|<div|<hr)/g, '$1')
  html = html.replace(/(<\/h[2-4]>|<\/ul>|<\/ol>|<\/table>|<\/div>|<hr[^>]*\/?>)\s*<\/p>/g, '$1')

  return html
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
