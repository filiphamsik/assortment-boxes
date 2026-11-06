import type { CrossSection, Manifold } from 'manifold-3d'
import { boxHeight, type BoxParams } from './params'
import { loft, prism, roundedRect } from './primitives'
import { buildLabel } from './label'
import type { M } from './wasm'

const OUTER_R = 3
const INNER_R = 2
/** Foot bottom is inset this much from the module outline (matches the grid rib base). */
const FOOT_INSET = 1.5
/** Height of the vertical part of the foot. */
const FOOT_VERTICAL = 1.5
/** Below footHeight the 45° foot chamfer rounds into the wall over this height. */
const FOOT_ROUND = 0.85
/** Inset at the top of the 45° chamfer. */
const FOOT_ROUND_INSET = 0.35
/** Floor chamfer: horizontal run from the wall to where it meets the floor. */
const FLOOR_CHAMFER = 2.4
/** Top of the low divider between modules. */
export const DIVIDER_TOP = 5
/** Half-width of the low divider between modules. */
const DIVIDER_HALF = 1
const EPS = 0.01

export interface BoxFrame {
  /** Outline [x0, y0, x1, y1]. */
  outline: [number, number, number, number]
  /** Inner cavity above the divider [x0, y0, x1, y1]. */
  inner: [number, number, number, number]
  H: number
}

export function boxFrame(p: BoxParams): BoxFrame {
  const a = p.advanced
  const o = a.clearance / 2
  const W = p.widthUnits * a.pitch
  const D = p.depthUnits * a.pitch
  const t = o + a.wall
  return { outline: [o, o, W - o, D - o], inner: [t, t, W - t, D - t], H: boxHeight(p.heightUnits, a) }
}

export function buildBox(m: M, p: BoxParams): Manifold {
  const shell = buildShell(m, p)
  return p.label.enabled ? shell.add(buildLabel(m, p)) : shell
}

/** Box without the label wedge: feet, walls, rounded floor, dividers. */
export function buildShell(m: M, p: BoxParams): Manifold {
  const a = p.advanced
  const G = a.pitch
  const o = a.clearance / 2
  const f = boxFrame(p)
  const [ox0, oy0, ox1, oy1] = f.outline
  const [ix0, iy0, ix1, iy1] = f.inner
  const fh = a.footHeight

  const solids: Manifold[] = [prism(roundedRect(m, ox0, oy0, ox1, oy1, OUTER_R), fh, f.H)]
  const cavities: Manifold[] = [prism(roundedRect(m, ix0, iy0, ix1, iy1, INNER_R), DIVIDER_TOP, f.H + 1)]

  for (let i = 0; i < p.widthUnits; i++)
    for (let j = 0; j < p.depthUnits; j++) {
      // Foot: module outline, inset at the bottom, 45° chamfer out to full size at footHeight.
      const mx0 = i * G + o, my0 = j * G + o, mx1 = (i + 1) * G - o, my1 = (j + 1) * G - o
      const inset = (d: number) => roundedRect(m, mx0 + d, my0 + d, mx1 - d, my1 - d, OUTER_R - d)
      solids.push(prism(inset(FOOT_INSET), 0, FOOT_VERTICAL))
      solids.push(loft(m, [
        { rect: inset(FOOT_INSET), z: FOOT_VERTICAL },
        { rect: inset(FOOT_ROUND_INSET), z: fh - FOOT_ROUND },
        { rect: inset(0), z: fh },
      ]))

      // Lower cavity: outer sides follow the wall, shared sides leave half a divider.
      const cx0 = i === 0 ? ix0 : i * G + DIVIDER_HALF
      const cy0 = j === 0 ? iy0 : j * G + DIVIDER_HALF
      const cx1 = i === p.widthUnits - 1 ? ix1 : (i + 1) * G - DIVIDER_HALF
      const cy1 = j === p.depthUnits - 1 ? iy1 : (j + 1) * G - DIVIDER_HALF
      const cav = (d: number): CrossSection => roundedRect(m, cx0 + d, cy0 + d, cx1 - d, cy1 - d, INNER_R - d)
      cavities.push(loft(m, [
        { rect: cav(FLOOR_CHAMFER), z: a.floor },
        { rect: cav(0), z: fh },
      ]))
      cavities.push(prism(cav(0), fh - EPS, DIVIDER_TOP + EPS))
    }

  return m.Manifold.union(solids).subtract(m.Manifold.union(cavities))
}
