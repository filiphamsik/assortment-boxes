import { BufferAttribute, BufferGeometry } from 'three'
import type { MeshData } from './stl'

/** Non-indexed geometry with flat normals – crisp edges for a CAD-style preview. */
export function toBufferGeometry(mesh: MeshData): BufferGeometry {
  const { vertProperties: vp, triVerts: tv, numProp: np } = mesh
  const pos = new Float32Array(tv.length * 3)
  for (let i = 0; i < tv.length; i++) {
    const v = tv[i] * np
    pos[i * 3] = vp[v]
    pos[i * 3 + 1] = vp[v + 1]
    pos[i * 3 + 2] = vp[v + 2]
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}
