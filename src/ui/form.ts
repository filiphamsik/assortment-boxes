import {
  ADVANCED_RANGES, boxHeight, DEFAULT_ADVANCED, LABEL_STEP, LIMITS, maxLabelWidth, normalizeBox, normalizeGrid, type Advanced,
} from '../geometry/params'
import type { AppState } from './storage'

export interface FormHandle {
  /** Re-render all fields from the given state (e.g. after normalisation). */
  update(state: AppState): void
  setStatus(text: string): void
}

const ADVANCED_FIELDS: Array<[keyof typeof ADVANCED_RANGES, string]> = [
  ['pitch', 'Grid pitch (mm)'],
  ['clearance', 'Clearance (mm)'],
  ['floor', 'Floor (mm)'],
]

export function mountForm(
  root: HTMLElement,
  initial: AppState,
  onChange: (state: AppState) => void,
  onDownload: () => void,
): FormHandle {
  let state = initial
  root.innerHTML = `
    <h1>Assortment Box Generator</h1>
    <div class="seg" role="tablist">
      <button type="button" data-mode="box">Box</button>
      <button type="button" data-mode="grid">Grid</button>
    </div>
    <form autocomplete="off" novalidate>
      <fieldset data-for="box">
        <label>Width <small>(modules)</small><input name="box.widthUnits" type="number" min="${LIMITS.boxUnits[0]}" max="${LIMITS.boxUnits[1]}" step="1"></label>
        <label>Depth <small>(modules)</small><input name="box.depthUnits" type="number" min="${LIMITS.boxUnits[0]}" max="${LIMITS.boxUnits[1]}" step="1"></label>
        <p class="hint">Width runs along the label wall.</p>
        <label>Height <small>(units)</small><input name="box.heightUnits" type="number" min="${LIMITS.height[0]}" max="${LIMITS.height[1]}" step="${LIMITS.heightStep}"><output data-out="height"></output></label>
        <label class="check"><input name="box.label.enabled" type="checkbox"> Label wedge</label>
        <label data-label>Label width <output data-out="labelWidth"></output><input name="box.label.width" type="range" min="${LIMITS.labelWidth[0]}" step="${LABEL_STEP}"></label>
        <label class="check" data-label><input name="box.label.lip" type="checkbox"> Raised lip</label>
      </fieldset>
      <fieldset data-for="grid">
        <label>Width <small>(cells)</small><input name="grid.widthUnits" type="number" min="${LIMITS.gridUnits[0]}" max="${LIMITS.gridUnits[1]}" step="1"></label>
        <label>Depth <small>(cells)</small><input name="grid.depthUnits" type="number" min="${LIMITS.gridUnits[0]}" max="${LIMITS.gridUnits[1]}" step="1"></label>
      </fieldset>
      <details>
        <summary>Advanced</summary>
        ${ADVANCED_FIELDS.map(([k, t]) => `<label>${t}<input name="adv.${k}" type="number" min="${ADVANCED_RANGES[k][0]}" max="${ADVANCED_RANGES[k][1]}" step="0.05"></label>`).join('')}
        <button type="button" data-reset>Reset to defaults</button>
      </details>
    </form>
    <button type="button" class="primary" data-download>Download STL</button>
    <p class="status" data-status></p>
  `
  const form = root.querySelector('form')!
  const input = (name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]`)!
  const out = (name: string) => root.querySelector<HTMLOutputElement>(`[data-out="${name}"]`)!

  function current() {
    return state.mode === 'box' ? state.box : state.grid
  }

  function render() {
    const { box, grid, mode } = state
    root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)))
    root.querySelectorAll<HTMLElement>('[data-for]').forEach(f => { f.hidden = f.dataset.for !== mode })
    input('box.widthUnits').value = String(box.widthUnits)
    input('box.depthUnits').value = String(box.depthUnits)
    input('box.heightUnits').value = String(box.heightUnits)
    out('height').textContent = `= ${boxHeight(box.heightUnits, box.advanced).toFixed(1)} mm`
    input('box.label.enabled').checked = box.label.enabled
    const w = input('box.label.width')
    w.max = String(maxLabelWidth(box))
    w.value = String(box.label.width)
    out('labelWidth').textContent = `${box.label.width} mm`
    input('box.label.lip').checked = box.label.lip
    root.querySelectorAll<HTMLElement>('[data-label]').forEach(e => e.classList.toggle('disabled', !box.label.enabled))
    w.disabled = input('box.label.lip').disabled = !box.label.enabled
    input('grid.widthUnits').value = String(grid.widthUnits)
    input('grid.depthUnits').value = String(grid.depthUnits)
    for (const [k] of ADVANCED_FIELDS) input(`adv.${k}`).value = String(current().advanced[k])
  }

  function readForm(): AppState {
    const n = (name: string) => input(name).valueAsNumber
    const adv: Advanced = { ...current().advanced, ...Object.fromEntries(ADVANCED_FIELDS.map(([k]) => [k, n(`adv.${k}`)])) }
    const box = normalizeBox({
      widthUnits: n('box.widthUnits'),
      depthUnits: n('box.depthUnits'),
      heightUnits: n('box.heightUnits'),
      label: { enabled: input('box.label.enabled').checked, width: n('box.label.width'), lip: input('box.label.lip').checked },
      advanced: state.mode === 'box' ? adv : state.box.advanced,
    })
    const grid = normalizeGrid({
      widthUnits: n('grid.widthUnits'),
      depthUnits: n('grid.depthUnits'),
      advanced: state.mode === 'grid' ? adv : state.grid.advanced,
    })
    return { box, grid, mode: state.mode }
  }

  function commit(next: AppState) {
    state = next
    render()
    onChange(state)
  }

  // Number fields commit on change (blur/enter/spinner) so typing "1." isn't clobbered;
  // the range slider and checkboxes commit live.
  form.addEventListener('change', () => commit(readForm()))
  form.addEventListener('input', e => {
    const t = e.target as HTMLInputElement
    if (t.type === 'range') commit(readForm())
  })
  form.addEventListener('submit', e => e.preventDefault())
  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b =>
    b.addEventListener('click', () => commit({ ...state, mode: b.dataset.mode as AppState['mode'] })))
  root.querySelector('[data-reset]')!.addEventListener('click', () => {
    const adv = { ...DEFAULT_ADVANCED }
    commit(state.mode === 'box'
      ? { ...state, box: normalizeBox({ ...state.box, advanced: adv }) }
      : { ...state, grid: normalizeGrid({ ...state.grid, advanced: adv }) })
  })
  root.querySelector('[data-download]')!.addEventListener('click', onDownload)

  render()
  return {
    update(s) { state = s; render() },
    setStatus(text) { root.querySelector('[data-status]')!.textContent = text },
  }
}
