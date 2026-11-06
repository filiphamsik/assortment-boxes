import { describe, expect, test } from 'vitest'
import {
  boxHeight, DEFAULT_ADVANCED as A, DEFAULT_BOX, DEFAULT_GRID, maxLabelWidth, normalizeBox, normalizeGrid,
} from '../src/geometry/params'

describe('params', () => {
  test('heights', () => {
    expect(boxHeight(1, A)).toBe(35)
    expect(boxHeight(0.5, A)).toBe(18.5)
  })

  test('stacks add up', () => {
    for (const [a, b] of [[0.5, 0.5], [1, 0.5], [0.75, 1.25], [1.5, 1.5]])
      expect(boxHeight(a, A) + boxHeight(b, A) - A.insertion).toBeCloseTo(boxHeight(a + b, A), 9)
  })

  test('normalizeBox snaps and clamps', () => {
    const p = normalizeBox({ widthUnits: 2.3, depthUnits: 9, heightUnits: 0.6, label: { enabled: true, width: 100, lip: true } })
    expect([p.widthUnits, p.depthUnits, p.heightUnits, p.label.width]).toEqual([2, 6, 0.5, 87.6])
    expect(normalizeBox({ advanced: { ...A, clearance: 0 } }).advanced.clearance).toBe(0.2)
    expect(normalizeBox({ heightUnits: 1.13 }).heightUnits).toBe(1.25)
  })

  test('normalizeGrid clamps', () => {
    const g = normalizeGrid({ widthUnits: 0, depthUnits: 14 })
    expect([g.widthUnits, g.depthUnits]).toEqual([1, 10])
  })

  test('maxLabelWidth', () => {
    expect(maxLabelWidth(DEFAULT_BOX)).toBeCloseTo(42.6)
    expect(maxLabelWidth({ ...DEFAULT_BOX, widthUnits: 3 })).toBeCloseTo(132.6)
    expect(maxLabelWidth({ ...DEFAULT_BOX, advanced: { ...A, wall: 2 } })).toBeCloseTo(40.6)
  })

  test('normalize ignores junk', () => {
    expect(normalizeBox({ widthUnits: NaN } as any)).toEqual(DEFAULT_BOX)
    expect(normalizeBox({ label: 'x', advanced: null } as any)).toEqual(DEFAULT_BOX)
    expect(normalizeGrid({} as any)).toEqual(DEFAULT_GRID)
  })

  test('defaults', () => {
    expect(DEFAULT_BOX).toMatchObject({ widthUnits: 1, depthUnits: 1, heightUnits: 1, label: { enabled: true, width: 27, lip: true } })
    expect(A).toEqual({ pitch: 45, clearance: 0.4, wall: 1, floor: 1, footHeight: 3.5, insertion: 2, unitHeight: 33 })
  })
})

test('label slider step reaches the maximum exactly', async () => {
  const { LABEL_STEP, LIMITS, maxLabelWidth, normalizeBox } = await import('../src/geometry/params')
  for (const clearance of [0.2, 0.25, 0.4, 0.33, 1]) {
    for (const pitch of [30, 37, 45]) {
    const max = maxLabelWidth(normalizeBox({ widthUnits: 2, advanced: { ...A, clearance, pitch } }))
    const steps = (max - LIMITS.labelWidthMin) / LABEL_STEP
    expect(Math.abs(steps - Math.round(steps)), `${pitch} ${clearance}`).toBeLessThan(1e-9)
    }
  }
})
