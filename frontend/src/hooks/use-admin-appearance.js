import { useEffect, useSyncExternalStore } from 'react'

const APPEARANCE_KEY = 'blogstudio:admin-appearance'
const APPEARANCE_CHANGE_EVENT = 'blogstudio:admin-appearance-change'

const DEFAULT_APPEARANCE = Object.freeze({
  reviewAttentionEnabled: true,
  reviewAttentionColor: 'violet',
  reviewAttentionIntensity: 'subtle',
  reviewAttentionSpeed: 'calm',
})

const allowed = {
  reviewAttentionEnabled: (value) => typeof value === 'boolean',
  reviewAttentionColor: (value) => ['violet', 'blue', 'emerald'].includes(value),
  reviewAttentionIntensity: (value) => ['subtle', 'noticeable'].includes(value),
  reviewAttentionSpeed: (value) => ['calm', 'steady', 'lively'].includes(value),
}

let cachedAppearance

function normalizeAppearance(value) {
  const source = value && typeof value === 'object' ? value : {}
  return Object.fromEntries(Object.entries(DEFAULT_APPEARANCE).map(([key, fallback]) => [key, allowed[key](source[key]) ? source[key] : fallback]))
}

function readAppearance() {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE
  if (cachedAppearance) return cachedAppearance
  try { cachedAppearance = normalizeAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY) || '{}')) }
  catch { cachedAppearance = { ...DEFAULT_APPEARANCE } }
  return cachedAppearance
}

function applyAppearance(appearance) {
  const root = document.documentElement
  root.dataset.reviewAttention = appearance.reviewAttentionEnabled ? 'enabled' : 'disabled'
  root.style.setProperty('--review-attention-color', ({ violet: '139 92 246', blue: '59 130 246', emerald: '16 185 129' })[appearance.reviewAttentionColor])
  root.style.setProperty('--review-attention-opacity', appearance.reviewAttentionIntensity === 'noticeable' ? '.72' : '.42')
  root.style.setProperty('--review-attention-blur', appearance.reviewAttentionIntensity === 'noticeable' ? '18px' : '12px')
  root.style.setProperty('--review-attention-duration', ({ calm: '3.8s', steady: '2.6s', lively: '1.7s' })[appearance.reviewAttentionSpeed])
}

function subscribe(onStoreChange) {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event) => {
    if (event.key !== APPEARANCE_KEY) return
    cachedAppearance = undefined
    onStoreChange()
  }
  window.addEventListener(APPEARANCE_CHANGE_EVENT, onStoreChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(APPEARANCE_CHANGE_EVENT, onStoreChange)
    window.removeEventListener('storage', onStorage)
  }
}

function setSharedAppearance(update) {
  const next = normalizeAppearance({ ...readAppearance(), ...update })
  cachedAppearance = next
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next))
  applyAppearance(next)
  window.dispatchEvent(new Event(APPEARANCE_CHANGE_EVENT))
}

export function useAdminAppearance() {
  const appearance = useSyncExternalStore(subscribe, readAppearance, () => DEFAULT_APPEARANCE)
  useEffect(() => { applyAppearance(appearance) }, [appearance])
  return { appearance, updateAppearance: setSharedAppearance }
}
