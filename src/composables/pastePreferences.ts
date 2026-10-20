export const PASTE_THRESHOLD_STORAGE_KEY = 'codex-web-local.paste-file-threshold.v1'
export const DEFAULT_PASTE_FILE_THRESHOLD = 20_000

export function normalizePasteFileThreshold(value: unknown): number {
  const threshold = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isSafeInteger(threshold) && threshold > 0
    ? threshold
    : DEFAULT_PASTE_FILE_THRESHOLD
}

export function loadPasteFileThreshold(): number {
  try {
    return normalizePasteFileThreshold(window.localStorage.getItem(PASTE_THRESHOLD_STORAGE_KEY))
  } catch {
    return DEFAULT_PASTE_FILE_THRESHOLD
  }
}
