import type { Params } from './params'

const fmt = (v: number) => String(Math.round(v * 100) / 100)

export function fileName(p: Params): string {
  if (p.kind === 'grid') return `grid_${p.widthUnits}x${p.depthUnits}.stl`
  const parts = [`box_${p.widthUnits}x${p.depthUnits}`, `h${fmt(p.heightUnits)}`]
  if (!p.label.enabled) parts.push('nolabel')
  else {
    parts.push(`label${Math.round(p.label.width * 10) / 10}`)
    if (!p.label.lip) parts.push('nolip')
  }
  return `${parts.join('_')}.stl`
}
