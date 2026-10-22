<template>
  <div ref="rootRef" class="header-usage-status">
    <button
      ref="triggerRef"
      class="header-usage-trigger"
      type="button"
      :aria-label="accessibleSummary"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      :title="accessibleSummary"
      @click="toggleOpen"
    >
      <span v-if="windows.length" class="header-usage-summary">
        <span v-for="window in windows" :key="window.key" class="header-usage-metric" :class="{ 'is-low': window.remainingPercent !== null && window.remainingPercent <= 10 }">
          <span>{{ windowLabel(window) }}</span>
          <strong>{{ percent(window.remainingPercent) }}</strong>
        </span>
      </span>
      <span v-else class="header-usage-empty">{{ t('Usage') }} —</span>
      <IconTablerChevronDown class="header-usage-chevron" />
    </button>
    <section
      v-if="isOpen"
      :id="panelId"
      ref="panelRef"
      class="header-usage-panel"
      :style="panelStyle"
      role="dialog"
      :aria-label="t('Codex usage')"
      tabindex="-1"
    >
      <div class="header-usage-heading">
        <strong>{{ t('Codex usage') }}</strong>
        <span v-if="quota?.planType" class="header-usage-plan">{{ quota.planType }}</span>
      </div>
      <p v-if="!windows.length" class="header-usage-note">{{ t('Usage limits are unavailable for the current account.') }}</p>
      <article v-for="window in windows" :key="window.key" class="header-usage-window">
        <div class="header-usage-window-heading">
          <strong>{{ windowLabel(window) }}</strong>
          <span>{{ percent(window.remainingPercent) }} {{ t('remaining') }}</span>
        </div>
        <div v-if="window.usedPercent !== null" class="header-usage-track" aria-hidden="true">
          <span :style="{ width: `${window.usedPercent}%` }" />
        </div>
        <dl class="header-usage-details">
          <dt>{{ t('Used') }}</dt><dd>{{ percent(window.usedPercent) }}</dd>
          <dt>{{ t('Remaining') }}</dt><dd>{{ percent(window.remainingPercent) }}</dd>
          <dt>{{ t('Resets') }}</dt><dd>{{ resetDate(window.resetsAt) }}</dd>
          <template v-if="window.resetsAt">
            <dt>{{ t('Time until reset') }}</dt><dd>{{ resetCountdown(window.resetsAt) }}</dd>
          </template>
        </dl>
      </article>
      <p v-if="quota?.credits" class="header-usage-note">
        {{ t('Credits') }}:
        {{ quota.credits.unlimited ? t('Unlimited') : quota.credits.balance || (quota.credits.hasCredits ? t('Available') : t('None')) }}
      </p>
      <p v-if="quota?.limitName || quota?.limitId" class="header-usage-note">{{ quota.limitName || quota.limitId }}</p>
      <p class="header-usage-note">{{ t('Header percentages show remaining usage. Reset times use your local time zone.') }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import type { UiRateLimitSnapshot } from '../../types/codex'
import { useUiLanguage } from '../../composables/useUiLanguage'
import IconTablerChevronDown from '../icons/IconTablerChevronDown.vue'
import { formatUsageDuration, getUsageWindows, type UsageWindow } from './usageStatus'

const props = defineProps<{ quota: UiRateLimitSnapshot | null }>()
const { t } = useUiLanguage()
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelId = `header-usage-${useId()}`
const isOpen = ref(false)
const panelStyle = ref<Record<string, string>>({})
const now = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | undefined
const windows = computed(() => getUsageWindows(props.quota))
const accessibleSummary = computed(() => `${t('Codex usage')}: ${windows.value.length
  ? windows.value.map(window => `${windowLabel(window)} ${percent(window.remainingPercent)} ${t('remaining')}`).join(', ')
  : t('Usage unavailable')}`)

function windowLabel(window: UsageWindow): string {
  return formatUsageDuration(window.durationMinutes) || (window.key === 'primary' ? t('Primary window') : t('Secondary window'))
}
function percent(value: number | null): string {
  return value === null ? '—' : `${value}%`
}
function resetDate(value: number | null): string {
  if (value === null) return t('Reset time unavailable')
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(value * 1000))
}
function resetCountdown(value: number): string {
  const minutes = Math.ceil((value * 1000 - now.value) / 60_000)
  if (minutes <= 0) return t('Resetting now')
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const remainder = minutes % 60
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', remainder ? `${remainder}m` : ''].filter(Boolean).join(' ')
}
function positionPanel(): void {
  if (!isOpen.value || !triggerRef.value || !panelRef.value) return
  const anchor = triggerRef.value.getBoundingClientRect()
  const panel = panelRef.value.getBoundingClientRect()
  panelStyle.value = {
    left: `${Math.max(8, Math.min(anchor.right - panel.width, window.innerWidth - panel.width - 8))}px`,
    top: `${Math.max(8, Math.min(anchor.bottom + 8, window.innerHeight - panel.height - 8))}px`,
  }
}
function closePanel(restoreFocus = false): void {
  isOpen.value = false
  clearInterval(clockTimer)
  clockTimer = undefined
  if (restoreFocus) triggerRef.value?.focus()
}
async function toggleOpen(): Promise<void> {
  if (isOpen.value) { closePanel(); return }
  now.value = Date.now()
  isOpen.value = true
  clockTimer = setInterval(() => { now.value = Date.now() }, 60_000)
  await nextTick()
  positionPanel()
  panelRef.value?.focus()
}
function onPointerDown(event: PointerEvent): void {
  if (isOpen.value && event.target instanceof Node && !rootRef.value?.contains(event.target)) closePanel()
}
function onKeyDown(event: KeyboardEvent): void {
  if (isOpen.value && event.key === 'Escape') { event.preventDefault(); closePanel(true) }
}
watch(windows, async () => {
  if (!isOpen.value) return
  await nextTick()
  positionPanel()
})
onMounted(() => {
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', positionPanel)
})
onBeforeUnmount(() => {
  clearInterval(clockTimer)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', positionPanel)
})
</script>
