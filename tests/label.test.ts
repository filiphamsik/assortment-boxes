import { describe, expect, test } from 'vitest'
import type { Manifold } from 'manifold-3d'
import { getManifold, type M } from '../src/geometry/wasm'
import { boxFrame, buildBox, buildShell } from '../src/geometry/box'
import { roundedRect } from '../src/geometry/primitives'
import { boxHeight, DEFAULT_ADVANCED as A, normalizeBox, type BoxParams } from '../src/geometry/params'
import { alignCenter, alignMin, loadStlManifold, symDiffVolume } from './helpers/reference'

const box = (w: number, d: number, u: number, width = 27, lip = true) =>
  normalizeBox({ widthUnits: w, depthUnits: d, heightUnits: u, label: { enabled: true, width, lip } })
const overlap = (a: Manifold, b: Manifold) => a.intersect(b).volume()
const stacks = (m: M, p: BoxParams) => {
  const b = buildBox(m, p)
  return overlap(b, b.translate([0, 0, boxHeight(p.heightUnits, A) - A.insertion]))
}

describe('label wedge', () => {
  test('matches 2x1 v2 wedge', async () => {
    const m = await getManifold()
    // front strip around the wedge, above the feet; both models centred (their widths differ, 89.6 vs 89.2)
    const clip = (x: Manifold) => alignCenter(x).intersect(m.Manifold.cube([40, 15, 40]).translate([-20, -22.3, 6]))
    const gen = clip(buildBox(m, box(2, 1, 1, 27, true)))
    const ref = clip(loadStlManifold(m, 'reference/SPAS-box_2x1_smooth_v2.stl'))
    expect(symDiffVolume(gen, ref)).toBeLessThan(0.03 * ref.volume())
  })

  test('matches half v3', async () => {
    const m = await getManifold()
    const gen = alignMin(buildBox(m, box(1, 1, 0.5, 25, true)))
    const ref = alignMin(loadStlManifold(m, 'reference/SPAS-box_1x1_half_stackable_v3.stl'))
    expect(symDiffVolume(gen, ref)).toBeLessThan(0.03 * ref.volume())
  })

  test('label same at every height', async () => {
    const m = await getManifold()
    const areas = [0.5, 1, 2].map(u => {
      const b = buildBox(m, box(1, 1, u)), H = boxHeight(u, A)
      return [b.slice(H - 3.4 - 0.05).area(), b.slice(H - 3.2).area()]
    })
    for (const a of areas.slice(1)) {
      expect(a[0]).toBeCloseTo(areas[0][0], 0)
      expect(a[1]).toBeCloseTo(areas[0][1], 0)
    }
  })

  test('label adds material where expected', async () => {
    const m = await getManifold()
    const p = box(1, 1, 1)
    expect(buildBox(m, p).volume() - buildShell(m, p).volume()).toBeGreaterThan(500)
  })

  test('label never exceeds outline', async () => {
    const m = await getManifold()
    for (const p of [box(1, 1, 1, 42.6), box(3, 1, 1, 42.6), box(1, 1, 0.5, 42.6, false)]) {
      const a = buildBox(m, p).boundingBox(), b = buildShell(m, p).boundingBox()
      expect(a).toEqual(b)
      expect(buildBox(m, p).status()).toBe('NoError')
    }
  })

  test('stacks with label', async () => {
    const m = await getManifold()
    for (const u of [0.5, 1]) expect(stacks(m, box(2, 1, u)), `u=${u}`).toBeLessThan(0.01)
  })

  test('half height full-width no-lip stacks', async () => {
    const m = await getManifold()
    const p = box(1, 1, 0.5, 42.6, false)
    expect(buildBox(m, p).status()).toBe('NoError')
    expect(stacks(m, p)).toBeLessThan(0.01)
  })

  test('lip off is flat', async () => {
    const m = await getManifold()
    const p = box(1, 1, 1, 27, false), Ht = boxHeight(1, A) - 3.4
    expect(buildBox(m, p).slice(Ht + 0.2).area()).toBeCloseTo(buildShell(m, p).slice(Ht + 0.2).area(), 1)
    const withLip = box(1, 1, 1, 27, true)
    expect(buildBox(m, withLip).slice(Ht + 0.2).area()).toBeGreaterThan(buildShell(m, withLip).slice(Ht + 0.2).area() + 10)
  })

  test('label disabled equals shell', async () => {
    const m = await getManifold()
    const p = normalizeBox({ label: { enabled: false, width: 27, lip: true } })
    expect(buildBox(m, p).volume()).toBeCloseTo(buildShell(m, p).volume(), 3)
  })
})

describe('full-width label', () => {
  const shoelace = (c: [number, number][]) => c.reduce((s, [x, y], i) => { const [u, v] = c[(i + 1) % c.length]; return s + x * v - u * y }, 0) / 2
  /** Area of the main opening (largest hole) of a horizontal slice. */
  const openingArea = (b: Manifold, z: number) => {
    const contours = b.slice(z).toPolygons() as [number, number][][]
    const areas = contours.map(shoelace).sort((a, b) => Math.abs(b) - Math.abs(a))
    return Math.abs(areas[1])
  }

  test('opening in front of a full-width wedge has the same R2 corners as the box', async () => {
    const m = await getManifold()
    for (const [w, lip] of [[1, true], [1, false], [2, true]] as const) {
      const p = box(w, 1, 1, 42.6, lip)
      const b = buildBox(m, p)
      const Ht = boxHeight(1, A) - 3.4
      const [ix0, , ix1, iy1] = boxFrame(p).inner
      const yFront = boxFrame(p).outline[1] + 11
      const expected = roundedRect(m, ix0, yFront, ix1, iy1, 2).area()
      if (w === 1) {
        expect(openingArea(b, Ht - 0.05), `w${w} lip${lip} below surface`).toBeCloseTo(expected, 0)
        if (lip) expect(openingArea(b, Ht + 0.2), `w${w} lip level`).toBeCloseTo(expected, 0)
      } else {
        expect(b.status()).toBe('NoError')
      }
    }
  })

  test('full-width lip has no end rims along the side walls', async () => {
    const m = await getManifold()
    const p = box(1, 1, 1, 42.6, true)
    const Ht = boxHeight(1, A) - 3.4
    const [ix0, iy0] = boxFrame(p).inner
    // a point 0.5 mm inside the side wall, in the middle of the label depth, at lip height: empty
    const probe = m.Manifold.cube([0.2, 0.2, 0.1]).translate([ix0 + 0.4, iy0 + 4, Ht + 0.15])
    expect(buildBox(m, p).intersect(probe).volume()).toBeLessThan(1e-6)
  })
})
