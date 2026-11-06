import type { CrossSection, Manifold } from 'manifold-3d'
import type { M } from './wasm'

const SEGMENTS = 32
const SLAB = 0.001

/** Axis-aligned rectangle [x0,x1]×[y0,y1] with rounded corners of radius r. */
export function roundedRect(m: M, x0: number, y0: number, x1: number, y1: number, r: number): CrossSection {
  const rr = Math.max(0.01, Math.min(r, (x1 - x0) / 2 - 0.001, (y1 - y0) / 2 - 0.001))
  return m.CrossSection.square([x1 - x0 - 2 * rr, y1 - y0 - 2 * rr])
    .translate([x0 + rr, y0 + rr])
    .offset(rr, 'Round', 2, SEGMENTS)
}

/** A paper-thin extrusion of `rect` at height z, used as a hull layer. */
export function slab(m: M, rect: CrossSection, z: number): Manifold {
  return rect.extrude(SLAB).translate([0, 0, z])
}

/** Union of convex hulls between consecutive layers (each layer must be convex). */
export function loft(m: M, layers: Array<{ rect: CrossSection; z: number }>): Manifold {
  const parts: Manifold[] = []
  for (let i = 0; i + 1 < layers.length; i++) {
    const a = layers[i], b = layers[i + 1]
    parts.push(m.Manifold.hull([slab(m, a.rect, a.z), slab(m, b.rect, b.z - SLAB)]))
  }
  return m.Manifold.union(parts)
}

/** Straight prism of `rect` from z0 to z1. */
export function prism(rect: CrossSection, z0: number, z1: number): Manifold {
  return rect.extrude(z1 - z0).translate([0, 0, z0])
}
