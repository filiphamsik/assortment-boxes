import { expect, test } from 'vitest'
import { getManifold } from '../src/geometry/wasm'
import { buildSolid } from '../src/geometry/build'
import { normalizeBox, normalizeGrid } from '../src/geometry/params'

test('repeated rebuilds do not leak WASM memory', async () => {
  const m = await getManifold()
  const p = normalizeBox({ widthUnits: 3, depthUnits: 3, heightUnits: 2 })
  const g = normalizeGrid({ widthUnits: 5, depthUnits: 5 })
  const run = () => { buildSolid(m, p).delete(); buildSolid(m, g).delete() }
  for (let i = 0; i < 5; i++) run()
  const before = process.memoryUsage().external
  for (let i = 0; i < 40; i++) run()
  const grown = (process.memoryUsage().external - before) / 1e6
  expect(grown).toBeLessThan(50)
}, 120000)
