import { readFileSync } from 'node:fs'
import type { Manifold } from 'manifold-3d'
import type { M } from '../../src/geometry/wasm'

/** Parse a binary STL into a Manifold (vertices merged). */
export function loadStlManifold(m: M, path: string): Manifold {
  const b = readFileSync(path)
  const n = b.readUInt32LE(80)
  const vp = new Float32Array(n * 9)
  const tv = new Uint32Array(n * 3)
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 9; k++) vp[i * 9 + k] = b.readFloatLE(84 + i * 50 + 12 + k * 4)
    for (let k = 0; k < 3; k++) tv[i * 3 + k] = i * 3 + k
  }
  const mesh = new m.Mesh({ numProp: 3, vertProperties: vp, triVerts: tv })
  mesh.merge()
  return new m.Manifold(mesh)
}

/** Volume of (a − b) ∪ (b − a). */
export function symDiffVolume(a: Manifold, b: Manifold): number {
  return a.subtract(b).volume() + b.subtract(a).volume()
}

/** Translate so the bounding-box minimum sits at the origin. */
export function alignMin(a: Manifold): Manifold {
  const { min } = a.boundingBox()
  return a.translate([-min[0], -min[1], -min[2]])
}
