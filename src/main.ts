import './styles.css'
import { formatJSON, minifyJSON } from './formatter'

const input = document.getElementById('input') as HTMLTextAreaElement
const output = document.getElementById('output') as HTMLElement
const formatBtn = document.getElementById('formatBtn') as HTMLButtonElement
const minifyBtn = document.getElementById('minifyBtn') as HTMLButtonElement
const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement
const indentSelect = document.getElementById('indent') as HTMLSelectElement
const sortKeysCheckbox = document.getElementById('sortKeys') as HTMLInputElement
const inputGutter = document.getElementById('inputGutter') as HTMLElement
const outputGutter = document.getElementById('outputGutter') as HTMLElement
const examplesSelect = document.getElementById('examples') as HTMLSelectElement
const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement
const inputPanel = document.getElementById('inputPanel') as HTMLElement

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightJSONToHTML(text: string) {
  // escape
  let html = escapeHtml(text)
  // strings (including keys)
  html = html.replace(/("(\\u[\da-fA-F]{4}|\\[^u]|[^"\\])*"(\s*:\s*)?)/g, (m: string) => {
    if (/:$/.test(m)) return `<span class="token key">${m}</span>`
    return `<span class="token string">${m}</span>`
  })
  // numbers
  html = html.replace(/(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g, '<span class="token number">$1</span>')
  // booleans
  html = html.replace(/\b(true|false)\b/g, '<span class="token boolean">$1</span>')
  // null
  html = html.replace(/\bnull\b/g, '<span class="token null">null</span>')
  return html
}

function showOutputText(text: string, isError = false, errorPos?: number) {
  output.classList.toggle('error', isError)
  if (!text) {
    output.innerHTML = '<span style="color: var(--muted); font-style: italic;">Output will appear here...</span>'
    outputGutter.innerHTML = ''
    return
  }

  const html = highlightJSONToHTML(text)
  // split lines so we can mark error line
  const lines = html.split(/\n/)
  if (isError && typeof errorPos === 'number') {
    // compute line index
    const idx = Math.max(0, getLineFromPos(input.value, errorPos) - 1)
    if (idx < lines.length) lines[idx] = `<span class="error-line">${lines[idx]}</span>`
  }
  output.innerHTML = lines.join('\n')
  updateGutterFromText(output, outputGutter)
}

function updateGutter(textareaOrPre: { textContent?: string; value?: string }, gutterEl: HTMLElement) {
  const txt = 'value' in textareaOrPre ? textareaOrPre.value || '' : textareaOrPre.textContent || ''
  const lines = txt.split(/\n/).length
  gutterEl.innerHTML = Array.from({ length: lines }, (_, i) => `<div class="ln">${i + 1}</div>`).join('')
}

function updateGutterFromText(el: HTMLElement, gutterEl: HTMLElement) {
  const txt = el.textContent || ''
  const lines = txt.split(/\n/).length
  gutterEl.innerHTML = Array.from({ length: lines }, (_, i) => `<div class="ln">${i + 1}</div>`).join('')
}

function getLineFromPos(text: string, pos: number) {
  const before = text.slice(0, pos)
  return before.split('\n').length
}

function parsePositionFromError(errMsg: string | undefined): number | undefined {
  if (!errMsg) return undefined
  const m = errMsg.match(/position\s*(\d+)/i) || errMsg.match(/at\s+\d+/)
  if (m) {
    const num = m[1] ? Number(m[1]) : Number(m[0].replace(/[^0-9]/g, ''))
    return Number.isFinite(num) ? num : undefined
  }
  return undefined
}

function performFormat(isMinify = false) {
  const raw = input.value.trim()
  
  if (!raw) {
    showNotification('Please enter some JSON first', 'warning')
    return
  }
  
  const btn = isMinify ? minifyBtn : formatBtn
  const originalText = btn.textContent
  btn.classList.add('loading')
  btn.disabled = true
  
  // Small delay to show loading state
  setTimeout(() => {
    const indentVal = indentSelect.value === '\t' ? '\t' : Number(indentSelect.value)
    const opts = { sortKeys: !!sortKeysCheckbox?.checked }
    const res = isMinify ? minifyJSON(raw, opts) : formatJSON(raw, indentVal, opts)
    
    if (res.ok) {
      showOutputText(res.value, false)
      showNotification(isMinify ? 'JSON minified successfully' : 'JSON formatted successfully', 'success')
    } else {
      const pos = parsePositionFromError(res.error)
      showOutputText(res.error, true, pos)
      showNotification('Invalid JSON syntax', 'error')
    }
    
    btn.classList.remove('loading')
    btn.disabled = false
  }, 100)
}

async function onCopy() {
  const text = (output.textContent || '')
  if (!text.trim()) {
    showNotification('Nothing to copy', 'warning')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    copyBtn.textContent = 'Copied!'
    copyBtn.classList.add('loading')
    showNotification('Copied to clipboard', 'success')
    setTimeout(() => {
      copyBtn.textContent = 'Copy'
      copyBtn.classList.remove('loading')
    }, 1500)
  } catch (err) {
    copyBtn.textContent = 'Failed'
    showNotification('Failed to copy', 'error')
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1500)
  }
}

function showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success') {
  const notification = document.createElement('div')
  notification.className = `notification notification-${type}`
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    padding: 16px 24px;
    background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--warning)'};
    color: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    font-weight: 600;
    z-index: 1000;
    animation: slideInRight 0.3s ease-out;
  `
  
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out'
    setTimeout(() => notification.remove(), 300)
  }, 2500)
}

const style = document.createElement('style')
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`
document.head.appendChild(style)

function onDownload() {
  const text = (output.textContent || '')
  if (!text.trim()) {
    showNotification('Nothing to download', 'warning')
    return
  }
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  a.download = `formatted-${timestamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  showNotification('File downloaded successfully', 'success')
}

function syncGutterScroll(src: HTMLElement, gutter: HTMLElement) {
  if (src.scrollTop !== undefined) gutter.scrollTop = (src as HTMLElement).scrollTop
}

formatBtn.addEventListener('click', () => performFormat(false))
minifyBtn.addEventListener('click', () => performFormat(true))
copyBtn.addEventListener('click', onCopy)
downloadBtn.addEventListener('click', onDownload)

// input listeners with debounced live preview
let debounceTimer: number | undefined

input.addEventListener('input', () => {
  const raw = input.value
  updateGutter(input, inputGutter)
  
  if (raw.trim() === '') {
    showOutputText('')
    return
  }
  
  // Debounce live preview for better performance
  clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    // live preview (best-effort): format with given indent, but suppress detailed errors
    const res = formatJSON(raw, Number(indentSelect.value) || 2, { sortKeys: !!sortKeysCheckbox.checked })
    if (res.ok) {
      showOutputText(res.value)
    } else {
      showOutputText('Invalid JSON — Click "Format" button to see detailed error information', true)
    }
  }, 300) // 300ms debounce
})

// sync scroll
input.addEventListener('scroll', () => syncGutterScroll(input, inputGutter))
output.addEventListener('scroll', () => syncGutterScroll(output, outputGutter))

// keyboard shortcuts
window.addEventListener('keydown', (e) => {
  // Cmd/Ctrl+Enter to format
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    performFormat(false)
  }
  // Cmd/Ctrl+M to minify
  if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
    e.preventDefault()
    performFormat(true)
  }
  // Cmd/Ctrl+K to clear
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    input.value = ''
    input.dispatchEvent(new Event('input'))
    showNotification('Cleared input', 'success')
  }
  // Cmd/Ctrl+/ to show shortcuts
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault()
    showShortcuts()
  }
})

function showShortcuts() {
  const modal = document.createElement('div')
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    animation: fadeIn 0.2s ease-out;
  `
  
  const content = document.createElement('div')
  content.style.cssText = `
    background: var(--panel);
    padding: 32px;
    border-radius: 16px;
    border: 1px solid var(--border);
    max-width: 500px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  `
  
  content.innerHTML = `
    <h3 style="margin: 0 0 24px 0; font-size: 1.5rem; color: var(--text);">Keyboard Shortcuts</h3>
    <div style="display: grid; gap: 12px;">
      <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 8px;">
        <span>Format JSON</span>
        <kbd style="padding: 4px 8px; background: var(--accent); color: white; border-radius: 4px; font-size: 0.875rem;">Ctrl/Cmd + Enter</kbd>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 8px;">
        <span>Minify JSON</span>
        <kbd style="padding: 4px 8px; background: var(--accent); color: white; border-radius: 4px; font-size: 0.875rem;">Ctrl/Cmd + M</kbd>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 8px;">
        <span>Clear Input</span>
        <kbd style="padding: 4px 8px; background: var(--accent); color: white; border-radius: 4px; font-size: 0.875rem;">Ctrl/Cmd + K</kbd>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 8px;">
        <span>Show Shortcuts</span>
        <kbd style="padding: 4px 8px; background: var(--accent); color: white; border-radius: 4px; font-size: 0.875rem;">Ctrl/Cmd + /</kbd>
      </div>
    </div>
    <button id="closeModal" style="margin-top: 24px; width: 100%; padding: 12px; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Close</button>
  `
  
  modal.appendChild(content)
  document.body.appendChild(modal)
  
  const closeModal = () => {
    modal.style.animation = 'fadeOut 0.2s ease-out'
    setTimeout(() => modal.remove(), 200)
  }
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal()
  })
  
  content.querySelector('#closeModal')?.addEventListener('click', closeModal)
}

const fadeStyles = document.createElement('style')
fadeStyles.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`
document.head.appendChild(fadeStyles)

// examples
examplesSelect.addEventListener('change', () => {
  const v = examplesSelect.value
  if (v === 'small') input.value = '{"name":"Jane","age":28,"tags":["a","b"]}'
  else if (v === 'nested') input.value = '{"users":[{"id":1,"name":"A"},{"id":2,"name":"B","meta":{"active":true}}],"count":2}'
  else if (v === 'big') {
    const arr = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `item-${i + 1}`, even: (i + 1) % 2 === 0 }))
    input.value = JSON.stringify({ created: new Date().toISOString(), items: arr }, null, 2)
  }
  input.dispatchEvent(new Event('input'))
})

// drag & drop file load with visual feedback
let dragCounter = 0

document.addEventListener('dragenter', (e) => {
  e.preventDefault()
  dragCounter++
  inputPanel.classList.add('drag-over')
})

document.addEventListener('dragleave', (e) => {
  e.preventDefault()
  dragCounter--
  if (dragCounter === 0) {
    inputPanel.classList.remove('drag-over')
  }
})

document.addEventListener('dragover', (e) => e.preventDefault())

document.addEventListener('drop', (e) => {
  e.preventDefault()
  dragCounter = 0
  inputPanel.classList.remove('drag-over')
  
  const f = e.dataTransfer?.files?.[0]
  if (!f) {
    showNotification('No file detected', 'warning')
    return
  }
  if (!f.name.endsWith('.json')) {
    showNotification('Please drop a .json file', 'warning')
    return
  }
  
  const reader = new FileReader()
  reader.onload = () => {
    input.value = String(reader.result)
    input.dispatchEvent(new Event('input'))
    showNotification(`Loaded: ${f.name}`, 'success')
  }
  reader.onerror = () => {
    showNotification('Failed to read file', 'error')
  }
  reader.readAsText(f)
})

// theme toggle with enhanced UX
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark'
  const isLight = saved === 'light'
  document.body.classList.toggle('light', isLight)
  themeToggle.textContent = isLight ? 'Light' : 'Dark'
}

themeToggle.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light')
  localStorage.setItem('theme', isLight ? 'light' : 'dark')
  themeToggle.textContent = isLight ? 'Light' : 'Dark'
  showNotification(`Switched to ${isLight ? 'light' : 'dark'} theme`, 'success')
})

initTheme()

// sample initial content
input.value = `{
  "greeting": "Hello",
  "items": [
    { "id": 1, "name": "apples" },
    { "id": 2, "name": "oranges" }
  ]
}`

// initial gutters and render
updateGutter(input, inputGutter)
performFormat(false)
