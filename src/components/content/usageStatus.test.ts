import { describe, expect, it } from 'vitest'
import type { UiRateLimitSnapshot, UiRateLimitWindow } from '../../types/codex'
import { formatUsageDuration, getUsageWindows } from './usageStatus'

const window = (usedPercent: number, minutes: number | null = 300): UiRateLimitWindow => ({ usedPercent, windowDurationMins: minutes, windowMinutes: minutes, resetsAt: 1800000000 })
const quota = (primary: UiRateLimitWindow | null, secondary: UiRateLimitWindow | null = null): UiRateLimitSnapshot => ({ primary, secondary, credits: null, limitId: 'codex', limitName: null, planType: 'plus' })

describe('header quota display', () => {
  it('uses remaining percentages for the actual API windows, including reversed order', () => {
    const rows = getUsageWindows(quota(window(35, 10080), window(17, 300)))
    expect(rows.map(row => [formatUsageDuration(row.durationMinutes), row.remainingPercent])).toEqual([['7d', 65], ['5h', 83]])
  })
  it('preserves exhaustion and clamps invalid ranges without inventing capacity', () => {
    expect(getUsageWindows(quota(window(100), window(150))).map(row => row.remainingPercent)).toEqual([0, 0])
    expect(getUsageWindows(quota(window(-5)))[0].remainingPercent).toBe(100)
    expect(getUsageWindows(quota(window(NaN)))[0].remainingPercent).toBeNull()
  })
  it('keeps rounded used and remaining percentages complementary', () => {
    const row = getUsageWindows(quota(window(0.5)))[0]
    expect([row.usedPercent, row.remainingPercent]).toEqual([1, 99])
  })
  it('does not turn absent data into zero usage or fictional 5h/7d windows', () => {
    expect(getUsageWindows(null)).toEqual([])
    expect(getUsageWindows(quota(null))).toEqual([])
    expect(formatUsageDuration(getUsageWindows(quota(window(20, null)))[0].durationMinutes)).toBe('')
    expect(getUsageWindows(quota(null, window(20, 10080)))).toHaveLength(1)
  })
  it('supports the alternate duration field and rejects invalid reset dates', () => {
    const row = getUsageWindows(quota({ ...window(20, null), windowMinutes: 60, resetsAt: 1e40 }))[0]
    expect(formatUsageDuration(row.durationMinutes)).toBe('1h')
    expect(row.resetsAt).toBeNull()
  })
  it('formats atypical windows as their real duration', () => {
    expect(formatUsageDuration(45)).toBe('45m')
    expect(formatUsageDuration(2880)).toBe('2d')
  })
})
