export interface MeshData {
  vertProperties: Float32Array
  triVerts: Uint32Array
  numProp: number
}

/** Binary STL with an 80-byte header and per-face normals (units: mm). */
export function toBinaryStl(mesh: MeshData): ArrayBuffer {
  const { vertProperties: vp, triVerts: tv, numProp: np } = mesh
  const tris = tv.length / 3
  const buf = new ArrayBuffer(84 + tris * 50)
  const dv = new DataView(buf)
  const header = 'assortment-boxes'
  for (let i = 0; i < header.length; i++) dv.setUint8(i, header.charCodeAt(i))
  dv.setUint32(80, tris, true)
  let o = 84
  for (let t = 0; t < tris; t++) {
    const p = [0, 1, 2].map(k => {
      const v = tv[t * 3 + k] * np
      return [vp[v], vp[v + 1], vp[v + 2]]
    })
    const u = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]]
    const w = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]]
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const len = Math.hypot(n[0], n[1], n[2]) || 1
    for (let k = 0; k < 3; k++) dv.setFloat32(o + k * 4, n[k] / len, true)
    for (let k = 0; k < 3; k++)
      for (let c = 0; c < 3; c++) dv.setFloat32(o + 12 + k * 12 + c * 4, p[k][c], true)
    o += 50
  }
  return buf
}
