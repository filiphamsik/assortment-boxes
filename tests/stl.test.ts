import { describe, expect, test } from 'vitest'
import { getManifold } from '../src/geometry/wasm'
import { loft, roundedRect } from '../src/geometry/primitives'
import { toBinaryStl } from '../src/geometry/stl'
import { loadStlManifold } from './helpers/reference'

describe('stl + primitives', () => {
  test('cube stl', async () => {
    const m = await getManifold()
    const buf = toBinaryStl(m.Manifold.cube([10, 10, 10]).getMesh())
    expect(buf.byteLength).toBe(84 + 12 * 50)
    expect(new DataView(buf).getUint32(80, true)).toBe(12)
  })

  test('stl normals point outward', async () => {
    const m = await getManifold()
    const buf = toBinaryStl(m.Manifold.cube([10, 10, 10]).getMesh())
    const dv = new DataView(buf)
    for (let i = 0; i < 12; i++) {
      const o = 84 + i * 50
      const n = [0, 1, 2].map(k => dv.getFloat32(o + k * 4, true))
      const c = [0, 1, 2].map(k => (dv.getFloat32(o + 12 + k * 4, true) + dv.getFloat32(o + 24 + k * 4, true) + dv.getFloat32(o + 36 + k * 4, true)) / 3 - 5)
      expect(n[0] * c[0] + n[1] * c[1] + n[2] * c[2]).toBeGreaterThan(0)
      expect(Math.hypot(...n)).toBeCloseTo(1, 5)
    }
  })

  test('loft makes a frustum', async () => {
    const m = await getManifold()
    const f = loft(m, [
      { rect: roundedRect(m, 0, 0, 40, 40, 3), z: 0 },
      { rect: roundedRect(m, 1.5, 1.5, 38.5, 38.5, 3), z: 3 },
    ])
    expect(f.status()).toBe('NoError')
    const bb = f.boundingBox()
    expect(bb.min[2]).toBeCloseTo(0, 3)
    expect(bb.max[2]).toBeCloseTo(3, 3)
    expect(bb.max[0]).toBeCloseTo(40, 3)
  })

  test('references load', async () => {
    const m = await getManifold()
    for (const f of ['SPAS-box_1x1', 'SPAS-box_2x1_smooth_v2', 'SPAS-box_1x1_half_stackable_v3', 'SPAS-grid_4x4']) {
      const ref = loadStlManifold(m, `reference/${f}.stl`)
      expect(ref.status()).toBe('NoError')
      expect(ref.volume()).toBeGreaterThan(0)
    }
  })
})
