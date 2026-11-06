import { describe, expect, test } from 'vitest'
import { loadParams, saveParams } from '../src/ui/storage'
import { DEFAULT_BOX, DEFAULT_GRID } from '../src/geometry/params'

const KEY = 'assortment-boxes:v1'
function fakeStorage(value: string | null, throwing = false): Storage {
  let v = value
  return {
    getItem: () => { if (throwing) throw new Error('denied'); return v },
    setItem: (_k: string, s: string) => { if (throwing) throw new Error('denied'); v = s },
    removeItem: () => { v = null },
    clear: () => { v = null },
    key: () => KEY,
    length: 1,
  }
}
const defaults = { box: DEFAULT_BOX, grid: DEFAULT_GRID, mode: 'box' }

describe('storage', () => {
  test('loadParams falls back on garbage', () => {
    for (const s of [fakeStorage('{'), fakeStorage('{"box":{"widthUnits":"x"}}'), fakeStorage(null), fakeStorage('1'), fakeStorage('x', true)])
      expect(loadParams(s)).toEqual(defaults)
    expect(loadParams(undefined)).toEqual(defaults)
  })

  test('save/load roundtrip', () => {
    const s = fakeStorage(null)
    const state = { box: { ...DEFAULT_BOX, widthUnits: 3, heightUnits: 0.5 }, grid: { ...DEFAULT_GRID, depthUnits: 2 }, mode: 'grid' as const }
    saveParams(state, s)
    expect(loadParams(s)).toEqual(state)
  })

  test('save does not throw when storage is blocked', () => {
    expect(() => saveParams(defaults as any, fakeStorage(null, true))).not.toThrow()
  })

  test('load normalises stored values', () => {
    expect(loadParams(fakeStorage('{"box":{"widthUnits":40},"mode":"nope"}')).box.widthUnits).toBe(6)
    expect(loadParams(fakeStorage('{"mode":"nope"}')).mode).toBe('box')
  })
})

describe('shared advanced settings', () => {
  test('setAdvanced applies to box and grid alike', async () => {
    const { setAdvanced } = await import('../src/ui/storage')
    const s = setAdvanced(defaults as any, { ...DEFAULT_BOX.advanced, pitch: 42, clearance: 0.6 })
    expect(s.box.advanced).toEqual(s.grid.advanced)
    expect([s.grid.advanced.pitch, s.grid.advanced.clearance]).toEqual([42, 0.6])
  })

  test('loadParams unifies differing stored advanced values (box wins)', () => {
    const s = loadParams(fakeStorage(JSON.stringify({ box: { advanced: { pitch: 40 } }, grid: { advanced: { pitch: 50 } } })))
    expect([s.box.advanced.pitch, s.grid.advanced.pitch]).toEqual([40, 40])
  })
})
