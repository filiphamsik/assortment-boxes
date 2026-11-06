import './style.css'
import wasmUrl from 'manifold-3d/manifold.wasm?url'
import type { Manifold } from 'manifold-3d'
import { buildBox } from './geometry/box'
import { buildGrid } from './geometry/grid'
import { fileName } from './geometry/filename'
import type { Params } from './geometry/params'
import { toBinaryStl } from './geometry/stl'
import { toBufferGeometry } from './geometry/toBufferGeometry'
import { getManifold } from './geometry/wasm'
import { downloadStl } from './ui/download'
import { mountForm } from './ui/form'
import { createPreview } from './ui/preview'
import { loadParams, saveParams } from './ui/storage'

let state = loadParams()
let solid: { params: Params; manifold: Manifold } | undefined
let timer: ReturnType<typeof setTimeout> | undefined

const preview = createPreview(document.getElementById('view')!)
const form = mountForm(document.getElementById('panel')!, state, next => {
  state = next
  saveParams(state)
  schedule()
}, download)

const active = (): Params => (state.mode === 'box' ? state.box : state.grid)

function schedule() {
  clearTimeout(timer)
  form.setStatus('Generating…')
  timer = setTimeout(rebuild, 150)
}

async function rebuild() {
  const m = await getManifold(wasmUrl)
  const p = active()
  try {
    const t = performance.now()
    const manifold = p.kind === 'box' ? buildBox(m, p) : buildGrid(m, p)
    solid?.manifold.delete()
    solid = { params: p, manifold }
    preview.show(toBufferGeometry(manifold.getMesh()), p)
    form.setStatus(`Generated in ${Math.round(performance.now() - t)} ms`)
  } catch (e) {
    console.error(e)
    form.setStatus('Could not generate this combination – try other values.')
  }
}

async function download() {
  if (!solid || solid.params !== active()) {
    clearTimeout(timer)
    await rebuild()
  }
  if (solid) downloadStl(toBinaryStl(solid.manifold.getMesh()), fileName(solid.params))
}

schedule()
