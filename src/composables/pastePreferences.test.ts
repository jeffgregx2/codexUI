import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PASTE_FILE_THRESHOLD, loadPasteFileThreshold, normalizePasteFileThreshold, PASTE_THRESHOLD_STORAGE_KEY } from './pastePreferences'

afterEach(() => vi.unstubAllGlobals())

describe('paste file threshold preference', () => {
  it('accepts larger and smaller positive whole-number thresholds', () => {
    expect(normalizePasteFileThreshold('50000')).toBe(50000)
    expect(normalizePasteFileThreshold(2000)).toBe(2000)
  })

  it.each([null, undefined, '', ' ', 'bad', 0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1])('defaults invalid preference %s to 20,000', (value) => {
    expect(normalizePasteFileThreshold(value)).toBe(20000)
  })

  it('loads the saved browser preference', () => {
    const getItem = vi.fn(() => '35000')
    vi.stubGlobal('window', { localStorage: { getItem } })
    expect(loadPasteFileThreshold()).toBe(35000)
    expect(getItem).toHaveBeenCalledWith(PASTE_THRESHOLD_STORAGE_KEY)
  })

  it('uses the default when browser storage is blocked', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('blocked') } })
    expect(loadPasteFileThreshold()).toBe(DEFAULT_PASTE_FILE_THRESHOLD)
  })
})
