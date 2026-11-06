import type { Manifold } from 'manifold-3d'
import { buildBox } from './box'
import { buildGrid } from './grid'
import type { Params } from './params'
import { scoped, type M } from './wasm'

/**
 * Builds the solid for `p`, freeing all intermediate WASM objects. Throws if the result is not a
 * valid, non-empty manifold – never hand an empty or broken mesh to the preview or download.
 */
export function buildSolid(m: M, p: Params): Manifold {
  const solid = scoped(() => (p.kind === 'box' ? buildBox(m, p) : buildGrid(m, p)))
  const status = solid.status()
  if (status !== 'NoError' || solid.isEmpty()) {
    solid.delete()
    throw new Error(`Invalid geometry (${status})`)
  }
  return solid
}
