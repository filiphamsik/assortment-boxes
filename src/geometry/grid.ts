import type { Manifold } from 'manifold-3d'
import type { GridParams } from './params'
import { loft, prism, roundedRect } from './primitives'
import type { M } from './wasm'

export const GRID_HEIGHT = 3
const RIB_BASE = 1.5 // half-width of a rib at its vertical base
const EPS = 0.01

/**
 * Open lattice grid: plate N·G × M·G × 3 with one cut-out per cell. Each cut-out is
 * (G − 3) square up to z = 1.5, then widens at 45° to a ridge on the grid line at z = 3.
 */
export function buildGrid(m: M, p: GridParams): Manifold {
  const G = p.advanced.pitch
  const W = p.widthUnits * G
  const D = p.depthUnits * G
  const plate = prism(roundedRect(m, 0, 0, W, D, 0.01), 0, GRID_HEIGHT)
  const cuts: Manifold[] = []
  for (let i = 0; i < p.widthUnits; i++)
    for (let j = 0; j < p.depthUnits; j++) {
      const x = i * G, y = j * G
      const lo = roundedRect(m, x + RIB_BASE, y + RIB_BASE, x + G - RIB_BASE, y + G - RIB_BASE, 0.01)
      const grow = GRID_HEIGHT - RIB_BASE + EPS // 45°: horizontal = vertical
      const hi = roundedRect(m, x + RIB_BASE - grow, y + RIB_BASE - grow, x + G - RIB_BASE + grow, y + G - RIB_BASE + grow, 0.01)
      cuts.push(prism(lo, -EPS, RIB_BASE + EPS))
      cuts.push(loft(m, [{ rect: lo, z: RIB_BASE }, { rect: hi, z: GRID_HEIGHT + EPS }]))
    }
  return plate.subtract(m.Manifold.union(cuts))
}
