import { expect, test } from 'vitest'
import { getManifold } from '../src/geometry/wasm'
import { toBufferGeometry } from '../src/geometry/toBufferGeometry'

test('cube mesh to buffer geometry', async () => {
  const m = await getManifold()
  const g = toBufferGeometry(m.Manifold.cube([10, 10, 10]).getMesh())
  expect(g.getAttribute('position').count).toBe(36)
  expect(g.getAttribute('normal')).toBeDefined()
  g.computeBoundingBox()
  expect(g.boundingBox!.max.toArray()).toEqual([10, 10, 10])
})
