import { describe, expect, test } from 'vitest'
import type { Manifold } from 'manifold-3d'
import { getManifold } from '../src/geometry/wasm'
import { buildBox } from '../src/geometry/box'
import { buildGrid } from '../src/geometry/grid'
import { boxHeight, DEFAULT_ADVANCED, normalizeBox, normalizeGrid } from '../src/geometry/params'
import { alignMin, loadStlManifold, symDiffVolume } from './helpers/reference'

const noLabel = { enabled: false, width: 27, lip: true }
const box = (w: number, d: number, u = 1) => normalizeBox({ widthUnits: w, depthUnits: d, heightUnits: u, label: noLabel })
const overlap = (a: Manifold, b: Manifold) => a.intersect(b).volume()
const SIZES = [[1, 1], [2, 1], [3, 1], [6, 1], [2, 2]]

describe('box shell', () => {
  test('bbox', async () => {
    const m = await getManifold()
    const bb = buildBox(m, box(2, 1)).boundingBox()
    expect(bb.min.map(v => +v.toFixed(3))).toEqual([0.2, 0.2, 0])
    expect(bb.max.map(v => +v.toFixed(3))).toEqual([89.8, 44.8, 35])
  })

  test('manifold', async () => {
    const m = await getManifold()
    expect(buildBox(m, box(2, 2, 0.5)).status()).toBe('NoError')
  })

  test('fits grid', async () => {
    const m = await getManifold()
    for (const [w, d] of SIZES) {
      const g = buildGrid(m, normalizeGrid({ widthUnits: w, depthUnits: d }))
      expect(overlap(buildBox(m, box(w, d)), g), `${w}x${d}`).toBeLessThan(0.01)
    }
  })

  test('feet clearance ≥ 0.2', async () => {
    const m = await getManifold()
    for (const [w, d] of SIZES) {
      const b = buildBox(m, box(w, d))
      const g = buildGrid(m, normalizeGrid({ widthUnits: w, depthUnits: d }))
      for (const s of [[0.19, 0], [-0.19, 0], [0, 0.19], [0, -0.19]] as const)
        expect(overlap(b, g.translate([s[0], s[1], 0])), `${w}x${d} shift ${s}`).toBeLessThan(0.01)
    }
  })

  test('feet are on the grid pitch, not wider', async () => {
    const m = await getManifold()
    const b = buildBox(m, box(3, 1))
    const g = buildGrid(m, normalizeGrid({ widthUnits: 3, depthUnits: 1 }))
    // shifted by 0.3 the feet must hit the ribs – proves clearance is 0.2, not huge
    expect(overlap(b, g.translate([0.3, 0, 0]))).toBeGreaterThan(0.01)
  })

  test('stacks', async () => {
    const m = await getManifold()
    for (const u of [0.5, 1]) {
      const b = buildBox(m, box(2, 1, u))
      const top = b.translate([0, 0, boxHeight(u, DEFAULT_ADVANCED) - DEFAULT_ADVANCED.insertion])
      expect(overlap(b, top), `u=${u}`).toBeLessThan(0.01)
      // and it actually sinks in: lifted 0.3 less it would collide
      expect(overlap(b, top.translate([0, 0, -0.3]))).toBeGreaterThan(0.01)
    }
  })

  test('half height matches reference away from label', async () => {
    const m = await getManifold()
    const clip = (x: Manifold) => x.intersect(m.Manifold.cube([44.6, 44.6 - 15, 40]).translate([0, 15, -1]))
    const gen = clip(alignMin(buildBox(m, box(1, 1, 0.5))))
    const ref = clip(alignMin(loadStlManifold(m, 'reference/SPAS-box_1x1_half_stackable_v3.stl')))
    expect(symDiffVolume(gen, ref)).toBeLessThan(0.03 * ref.volume())
  })

  test('6x6 u3 builds under 5 s', async () => {
    const m = await getManifold()
    const t = performance.now()
    const b = buildBox(m, box(6, 6, 3))
    expect(b.status()).toBe('NoError')
    expect(performance.now() - t).toBeLessThan(5000)
  })
})
