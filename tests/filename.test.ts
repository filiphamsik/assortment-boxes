import { expect, test } from 'vitest'
import { fileName } from '../src/geometry/filename'
import { DEFAULT_BOX, DEFAULT_GRID } from '../src/geometry/params'

test('file names', () => {
  expect(fileName({ ...DEFAULT_BOX, widthUnits: 2, heightUnits: 1.5 })).toBe('box_2x1_h1.5_label27.stl')
  expect(fileName({ ...DEFAULT_BOX, label: { enabled: true, width: 25, lip: false } })).toBe('box_1x1_h1_label25_nolip.stl')
  expect(fileName({ ...DEFAULT_BOX, label: { ...DEFAULT_BOX.label, enabled: false } })).toBe('box_1x1_h1_nolabel.stl')
  expect(fileName({ ...DEFAULT_BOX, depthUnits: 3, heightUnits: 0.75, label: { enabled: true, width: 30.25, lip: true } })).toBe('box_1x3_h0.75_label30.3.stl')
  expect(fileName(DEFAULT_GRID)).toBe('grid_4x4.stl')
})
