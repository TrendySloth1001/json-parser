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
    output.innerHTML = ''
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
  const raw = input.value
  const indentVal = indentSelect.value === '\t' ? '\t' : Number(indentSelect.value)
  const opts = { sortKeys: !!sortKeysCheckbox?.checked }
  const res = isMinify ? minifyJSON(raw, opts) : formatJSON(raw, indentVal, opts)
  if (res.ok) {
    showOutputText(res.value, false)
  } else {
    const pos = parsePositionFromError(res.error)
    showOutputText(res.error, true, pos)
  }
}

async function onCopy() {
  const text = (output.textContent || '')
  try {
    await navigator.clipboard.writeText(text)
    copyBtn.textContent = 'Copied'
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1200)
  } catch (err) {
    copyBtn.textContent = 'Failed'
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1200)
  }
}

function onDownload() {
  const text = (output.textContent || '')
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'data.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function syncGutterScroll(src: HTMLElement, gutter: HTMLElement) {
  if (src.scrollTop !== undefined) gutter.scrollTop = (src as HTMLElement).scrollTop
}

formatBtn.addEventListener('click', () => performFormat(false))
minifyBtn.addEventListener('click', () => performFormat(true))
copyBtn.addEventListener('click', onCopy)
downloadBtn.addEventListener('click', onDownload)

// input listeners
input.addEventListener('input', () => {
  const raw = input.value
  updateGutter(input, inputGutter)
  if (raw.trim() === '') {
    showOutputText('')
    return
  }
  // live preview (best-effort): format with given indent, but suppress detailed errors
  const res = formatJSON(raw, Number(indentSelect.value) || 2, { sortKeys: !!sortKeysCheckbox.checked })
  if (res.ok) showOutputText(res.value)
  else showOutputText('Invalid JSON — click Format to see details.', true)
})

// sync scroll
input.addEventListener('scroll', () => syncGutterScroll(input, inputGutter))
output.addEventListener('scroll', () => syncGutterScroll(output, outputGutter))

// keyboard shortcut: Cmd/Ctrl+Enter to format
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    performFormat(false)
  }
})

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

// drag & drop file load
document.addEventListener('dragover', (e) => e.preventDefault())
document.addEventListener('drop', (e) => {
  e.preventDefault()
  const f = e.dataTransfer?.files?.[0]
  if (!f) return
  if (!f.name.endsWith('.json')) return
  const reader = new FileReader()
  reader.onload = () => {
    input.value = String(reader.result)
    input.dispatchEvent(new Event('input'))
  }
  reader.readAsText(f)
})

// theme toggle
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark'
  document.body.classList.toggle('light', saved === 'light')
  themeToggle.textContent = saved === 'light' ? 'Dark' : 'Light'
}
themeToggle.addEventListener('click', () => {
  const now = document.body.classList.toggle('light')
  localStorage.setItem('theme', now ? 'light' : 'dark')
  themeToggle.textContent = now ? 'Dark' : 'Light'
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
