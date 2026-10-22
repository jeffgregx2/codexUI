import type { UiRateLimitSnapshot } from '../../types/codex'

export type UsageWindow = {
  key: string
  durationMinutes: number | null
  usedPercent: number | null
  remainingPercent: number | null
  resetsAt: number | null
}

export function getUsageWindows(quota: UiRateLimitSnapshot | null): UsageWindow[] {
  return [quota?.primary, quota?.secondary].flatMap((window, index) => {
    if (!window) return []
    const minutes = window.windowDurationMins ?? window.windowMinutes
    const durationMinutes = typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0 ? minutes : null
    const usedPercent = Number.isFinite(window.usedPercent)
      ? Math.max(0, Math.min(100, window.usedPercent))
      : null
    return [{
      key: index === 0 ? 'primary' : 'secondary',
      durationMinutes,
      usedPercent: usedPercent === null ? null : Math.round(usedPercent),
      remainingPercent: usedPercent === null ? null : 100 - Math.round(usedPercent),
      resetsAt: typeof window.resetsAt === 'number' && Number.isFinite(window.resetsAt) && window.resetsAt > 0 && Number.isFinite(new Date(window.resetsAt * 1000).getTime())
        ? window.resetsAt
        : null,
    }]
  })
}

export function formatUsageDuration(minutes: number | null): string {
  if (minutes === null) return ''
  if (minutes % 1440 === 0) return `${minutes / 1440}d`
  if (minutes % 60 === 0) return `${minutes / 60}h`
  return `${minutes}m`
}
