import { normalizeBox, normalizeGrid, type BoxParams, type GridParams } from '../geometry/params'

export interface AppState {
  box: BoxParams
  grid: GridParams
  mode: 'box' | 'grid'
}

const KEY = 'assortment-boxes:v1'

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/** Last settings from storage; anything missing, corrupt or out of range falls back to defaults. */
export function loadParams(storage: Storage | undefined = defaultStorage()): AppState {
  let raw: any = {}
  try {
    const s = storage?.getItem(KEY)
    if (s) raw = JSON.parse(s)
  } catch {
    raw = {}
  }
  if (typeof raw !== 'object' || raw === null) raw = {}
  return {
    box: normalizeBox(raw.box),
    grid: normalizeGrid(raw.grid),
    mode: raw.mode === 'grid' ? 'grid' : 'box',
  }
}

export function saveParams(state: AppState, storage: Storage | undefined = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage blocked or full: settings just won't persist
  }
}
