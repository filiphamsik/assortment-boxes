import { describe, expect, test } from 'vitest'
import { getManifold } from '../src/geometry/wasm'
import { buildGrid } from '../src/geometry/grid'
import { normalizeGrid } from '../src/geometry/params'
import { alignMin, loadStlManifold, symDiffVolume } from './helpers/reference'

describe('grid', () => {
  test('grid 4x4 bbox', async () => {
    const m = await getManifold()
    const bb = buildGrid(m, normalizeGrid({ widthUnits: 4, depthUnits: 4 })).boundingBox()
    expect(bb.min.map(v => +v.toFixed(3))).toEqual([0, 0, 0])
    expect(bb.max.map(v => +v.toFixed(3))).toEqual([180, 180, 3])
  })

  test('grid 4x4 matches reference', async () => {
    const m = await getManifold()
    const gen = alignMin(buildGrid(m, normalizeGrid({ widthUnits: 4, depthUnits: 4 })))
    const ref = alignMin(loadStlManifold(m, 'reference/SPAS-grid_4x4.stl'))
    expect(symDiffVolume(gen, ref)).toBeLessThan(0.02 * ref.volume())
  })

  test('grid manifold for 1x1..10x10', async () => {
    const m = await getManifold()
    for (const [w, d] of [[1, 1], [3, 2], [10, 10]]) {
      const g = buildGrid(m, normalizeGrid({ widthUnits: w, depthUnits: d }))
      expect(g.status()).toBe('NoError')
      expect(g.boundingBox().max[0]).toBeCloseTo(w * 45, 3)
    }
  })
})
