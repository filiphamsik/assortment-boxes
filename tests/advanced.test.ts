import { describe, expect, test } from 'vitest'
import type { Manifold } from 'manifold-3d'
import { getManifold, type M } from '../src/geometry/wasm'
import { buildSolid } from '../src/geometry/build'
import { boxFrame } from '../src/geometry/box'
import { prism, roundedRect } from '../src/geometry/primitives'
import { boxHeight, DEFAULT_ADVANCED, normalizeBox, normalizeGrid, type Advanced } from '../src/geometry/params'

const overlap = (a: Manifold, b: Manifold) => a.intersect(b).volume()
const VARIANTS: Partial<Advanced>[] = [
  {}, { clearance: 0 }, { clearance: 1 }, { floor: 0.6 }, { floor: 2 }, { pitch: 30 }, { pitch: 60 },
  // fields the geometry cannot honour must be ignored, not break the model
  { wall: 0.6 }, { wall: 3 }, { footHeight: 2 }, { footHeight: 6 }, { insertion: 1 }, { insertion: 4 }, { unitHeight: 10 },
]

function checks(m: M, adv: Partial<Advanced>) {
  const p = normalizeBox({ widthUnits: 2, depthUnits: 1, heightUnits: 0.5, label: { enabled: true, width: 42.6, lip: true }, advanced: { ...DEFAULT_ADVANCED, ...adv } })
  const b = buildSolid(m, p)
  const a = p.advanced
  const name = JSON.stringify(adv)
  expect(b.status(), name).toBe('NoError')
  expect(b.genus(), name).toBe(0)
  // stacks with exactly the configured insertion
  const H = boxHeight(p.heightUnits, a)
  expect(overlap(b, b.translate([0, 0, H - a.insertion])), name).toBeLessThan(0.01)
  expect(overlap(b, b.translate([0, 0, H - a.insertion - 0.3])), name).toBeGreaterThan(0.01)
  // sits in the grid with the same advanced values
  const g = buildSolid(m, normalizeGrid({ widthUnits: 2, depthUnits: 1, advanced: a }))
  expect(overlap(b, g), name).toBeLessThan(0.01)
  // never pokes outside the outline
  const [x0, y0, x1, y1] = boxFrame(p).outline
  expect(b.subtract(prism(roundedRect(m, x0, y0, x1, y1, 3), -1, H + 1)).volume(), name).toBeLessThan(0.01)
}

describe('advanced settings', () => {
  test('geometry stays valid, stackable and grid-fitting', async () => {
    const m = await getManifold()
    for (const adv of VARIANTS) checks(m, adv)
  }, 120000)

  test('fixed fields are pinned to the defaults', () => {
    const a = normalizeBox({ advanced: { ...DEFAULT_ADVANCED, wall: 2, footHeight: 5, insertion: 3, unitHeight: 50 } }).advanced
    expect([a.wall, a.footHeight, a.insertion, a.unitHeight]).toEqual([1, 3.5, 2, 33])
  })
})

describe('buildSolid', () => {
  test('refuses invalid geometry instead of returning an empty mesh', async () => {
    const m = await getManifold()
    const bad = { ...normalizeBox({}), advanced: { ...DEFAULT_ADVANCED, footHeight: 6 } }
    expect(() => buildSolid(m, bad)).toThrow()
  })
})
