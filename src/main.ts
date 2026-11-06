import './style.css'
import wasmUrl from 'manifold-3d/manifold.wasm?url'
import { buildBox } from './geometry/box'
import { buildGrid } from './geometry/grid'
import { fileName } from './geometry/filename'
import { toBinaryStl } from './geometry/stl'
import { getManifold } from './geometry/wasm'
import { downloadStl } from './ui/download'
import { mountForm } from './ui/form'
import { loadParams, saveParams, type AppState } from './ui/storage'

let state = loadParams()

const form = mountForm(document.getElementById('panel')!, state, next => {
  state = next
  saveParams(state)
}, async () => {
  const m = await getManifold(wasmUrl)
  const p = state.mode === 'box' ? state.box : state.grid
  form.setStatus('Generating…')
  const solid = p.kind === 'box' ? buildBox(m, p) : buildGrid(m, p)
  downloadStl(toBinaryStl(solid.getMesh()), fileName(p))
  form.setStatus('')
})

export type { AppState }
