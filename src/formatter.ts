type ParseOk = { ok: true; value: unknown }
type ParseErr = { ok: false; error: string }
type ParseResult = ParseOk | ParseErr

type FormatOk = { ok: true; value: string }
type FormatErr = { ok: false; error: string }
type FormatResult = FormatOk | FormatErr

export function tryParseJSON(text: string): ParseResult {
  try {
    const parsed = JSON.parse(text)
    return { ok: true, value: parsed }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

function deepSort(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(deepSort)
  if (obj && typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, deepSort(v)] as const)
    return Object.fromEntries(entries)
  }
  return obj
}

export function formatJSON(
  text: string,
  indent: number | string = 4,
  opts?: { sortKeys?: boolean }
): FormatResult {
  const parsedRes = tryParseJSON(text)
  if (!parsedRes.ok) return { ok: false, error: parsedRes.error }
  try {
    const value = opts?.sortKeys ? deepSort(parsedRes.value) : parsedRes.value
    return { ok: true, value: JSON.stringify(value, null, indent) }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export function minifyJSON(text: string, opts?: { sortKeys?: boolean }): FormatResult {
  const parsedRes = tryParseJSON(text)
  if (!parsedRes.ok) return { ok: false, error: parsedRes.error }
  try {
    const value = opts?.sortKeys ? deepSort(parsedRes.value) : parsedRes.value
    return { ok: true, value: JSON.stringify(value) }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
