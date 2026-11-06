export interface Advanced {
  pitch: number
  clearance: number
  wall: number
  floor: number
  footHeight: number
  insertion: number
  unitHeight: number
}

export interface LabelParams {
  enabled: boolean
  width: number
  lip: boolean
}

export interface BoxParams {
  kind: 'box'
  widthUnits: number
  depthUnits: number
  heightUnits: number
  label: LabelParams
  advanced: Advanced
}

export interface GridParams {
  kind: 'grid'
  widthUnits: number
  depthUnits: number
  advanced: Advanced
}

export type Params = BoxParams | GridParams

export const DEFAULT_ADVANCED: Advanced = {
  pitch: 45,
  clearance: 0.4,
  wall: 1,
  floor: 1,
  footHeight: 3.5,
  insertion: 2,
  unitHeight: 33,
}

export const DEFAULT_BOX: BoxParams = {
  kind: 'box',
  widthUnits: 1,
  depthUnits: 1,
  heightUnits: 1,
  label: { enabled: true, width: 27, lip: true },
  advanced: { ...DEFAULT_ADVANCED },
}

export const DEFAULT_GRID: GridParams = {
  kind: 'grid',
  widthUnits: 4,
  depthUnits: 4,
  advanced: { ...DEFAULT_ADVANCED },
}

export const LIMITS = {
  boxUnits: [1, 6],
  gridUnits: [1, 10],
  height: [0.5, 3],
  heightStep: 0.25,
  /** Minimum label width; the maximum is the label wall's inner length (see maxLabelWidth). */
  labelWidthMin: 20,
} as const

/** Advanced fields the geometry honours, with their allowed ranges. */
export const ADVANCED_RANGES = {
  pitch: [30, 60],
  clearance: [0.2, 1],
  floor: [0.6, 2],
} as const satisfies Partial<Record<keyof Advanced, readonly [number, number]>>

/** Slider step for the label width; the maximum is always a whole number of steps from the minimum. */
export const LABEL_STEP = 0.1

/** Outer height of a box `u` units tall. Stacks add up: H(a) + H(b) − insertion = H(a + b). */
export function boxHeight(u: number, adv: Advanced): number {
  return u * adv.unitHeight + adv.insertion
}

/** Label wedge spans at most the label wall's inner length, snapped down to the slider step. */
export function maxLabelWidth(p: BoxParams): number {
  const a = p.advanced
  const raw = p.widthUnits * a.pitch - a.clearance - 2 * a.wall
  const min = LIMITS.labelWidthMin
  return round(min + Math.floor((raw - min) / LABEL_STEP + 1e-6) * LABEL_STEP, 3)
}

export function normalizeBox(p: Partial<BoxParams>): BoxParams {
  const src = isObject(p) ? p : {}
  const label: Partial<LabelParams> = isObject(src.label) ? src.label : {}
  const d = DEFAULT_BOX
  const box: BoxParams = {
    kind: 'box',
    widthUnits: clamp(Math.round(num(src.widthUnits, d.widthUnits)), ...LIMITS.boxUnits),
    depthUnits: clamp(Math.round(num(src.depthUnits, d.depthUnits)), ...LIMITS.boxUnits),
    heightUnits: clamp(
      Math.round(num(src.heightUnits, d.heightUnits) / LIMITS.heightStep) * LIMITS.heightStep,
      ...LIMITS.height,
    ),
    label: {
      enabled: bool(label.enabled, d.label.enabled),
      width: num(label.width, d.label.width),
      lip: bool(label.lip, d.label.lip),
    },
    advanced: normalizeAdvanced(src.advanced),
  }
  box.label.width = clamp(round(box.label.width, 1), LIMITS.labelWidthMin, maxLabelWidth(box))
  return box
}

export function normalizeGrid(p: Partial<GridParams>): GridParams {
  const src = isObject(p) ? p : {}
  const d = DEFAULT_GRID
  return {
    kind: 'grid',
    widthUnits: clamp(Math.round(num(src.widthUnits, d.widthUnits)), ...LIMITS.gridUnits),
    depthUnits: clamp(Math.round(num(src.depthUnits, d.depthUnits)), ...LIMITS.gridUnits),
    advanced: normalizeAdvanced(src.advanced),
  }
}

function normalizeAdvanced(a: unknown): Advanced {
  const src: Partial<Advanced> = isObject(a) ? a : {}
  // wall, footHeight, insertion and unitHeight are pinned: the foot profile only seats on a 1 mm
  // wall at exactly 2 mm insertion, so changing them would break stacking and the grid fit.
  const out = { ...DEFAULT_ADVANCED }
  for (const key of Object.keys(ADVANCED_RANGES) as (keyof typeof ADVANCED_RANGES)[])
    out[key] = round(clamp(num(src[key], DEFAULT_ADVANCED[key]), ADVANCED_RANGES[key][0], ADVANCED_RANGES[key][1]), 2)
  return out
}

function isObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function round(v: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}
