import type { Manifold } from 'manifold-3d'
import { boxFrame } from './box'
import { LABEL_STEP, maxLabelWidth, type BoxParams } from './params'
import { prism, roundedRect } from './primitives'
import type { M } from './wasm'

/** Label surface sits this far below the top edge (room for the upper box's foot). */
export const LABEL_DROP = 3.4
const LIP_HEIGHT = 0.4
const LIP_FRONT = 0.8
const LIP_END = 1
/** Front edge of the wedge, measured from the outer face of the front wall. */
const FRONT = 11
/** Height of the vertical front face below the label surface. */
const FACE = 1.6
const END_R = 1
/** Inner corner radius of the box cavity. */
const INNER_R = 2
const FUSE = 0.01

/**
 * Label wedge on the front (y-min) wall, centred along X. Surface and lip are identical at every
 * height; at low heights only the 45° underside is clipped (at footHeight + 0.5).
 */
export function buildLabel(m: M, p: BoxParams): Manifold {
  const a = p.advanced
  const f = boxFrame(p)
  const [, oy0] = f.outline
  const [ix0, , ix1] = f.inner
  const innerLen = ix1 - ix0
  const cx = (ix0 + ix1) / 2
  const W = Math.min(p.label.width, maxLabelWidth(p), innerLen)
  // the slider maximum is snapped to its step, so "at most one step short" means full width
  const full = W >= innerLen - LABEL_STEP - 1e-6
  const halfW = full ? innerLen / 2 + 0.5 : W / 2
  const Ht = f.H - LABEL_DROP
  const yWall = oy0 + a.wall - FUSE
  const yFront = oy0 + FRONT
  const zFace = Ht - FACE
  const zBottom = zFace - (yFront - yWall)

  // Profile in (y, z), extruded along X via a cyclic axis permutation (a rotation, keeps winding).
  const profile = m.CrossSection.ofPolygons([[
    [yWall, Ht], [yWall, zBottom], [yFront, zFace], [yFront, Ht],
  ]])
  const wedge = profile.extrude(2 * halfW)
    .warp(v => { const [y, z, x] = v; v[0] = x; v[1] = y; v[2] = z })
    .translate([cx - halfW, 0, 0])

  const lipTop = p.label.lip ? Ht + LIP_HEIGHT : Ht
  // Full width: the side walls stop the label, so the lip has no end rims.
  const lipEnd = full ? 0 : LIP_END
  const lip = p.label.lip
    ? prism(roundedRect(m, cx - halfW, oy0 - 1, cx + halfW, yFront, full ? 0.01 : END_R), Ht - FUSE, lipTop)
      .subtract(prism(roundedRect(m, cx - halfW + lipEnd, oy0 - 2, cx + halfW - lipEnd, yFront - LIP_FRONT, 0.01), Ht - 1, Ht + 1))
    : undefined

  const parts = [wedge]
  if (lip) parts.push(lip)
  if (full) {
    // Fill the two front corners with a concave fillet so the opening keeps the box's R2 corners.
    const corners = roundedRect(m, ix0 - 0.5, yFront - FUSE, ix1 + 0.5, yFront + INNER_R, 0.01)
      .subtract(roundedRect(m, ix0, yFront, ix1, yFront + 4 * INNER_R, INNER_R))
    parts.push(prism(corners, zFace, lipTop))
  }

  // Full width reaches past yFront for the corner fillets; a narrower wedge ends at yFront with R1 corners.
  const planEnds = prism(roundedRect(m, cx - halfW, oy0 - 1, cx + halfW, full ? yFront + INNER_R : yFront, full ? 0.01 : END_R), -1, f.H + 1)
  const inside = prism(roundedRect(m, ix0 - 0.5, f.inner[1] - 0.5, ix1 + 0.5, f.inner[3] + 0.5, 2.5), a.footHeight + 0.5, f.H + 1)
  return m.Manifold.union(parts).intersect(planEnds).intersect(inside)
}
