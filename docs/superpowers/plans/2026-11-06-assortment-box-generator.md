# Assortment Box Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static web page that generates a stackable, grid-fitting SPAS box (or grid) from parameters, previews it in 3D and downloads it as STL.

**Architecture:** Pure geometry core (`src/geometry/`) builds solids with `manifold-3d` (WASM CSG, guaranteed manifold) from a validated parameter object; it runs unchanged in Node (Vitest) and the browser. A thin UI layer (`src/ui/`) owns the form, `localStorage`, three.js preview and download. Reference STLs in `reference/` are the acceptance oracle: tests load them as manifolds and compare by symmetric-difference volume.

**Tech Stack:** TypeScript 5, Vite 7, Vitest 4, three 0.187 (OrbitControls), manifold-3d 3.5.x, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-06-assortment-boxes-design.md`

## Global Constraints

- Everything in English – UI copy, code, docs, commits.
- Commit identity is the repo-local `Filip Hamšík <5691669+filiphamsik@users.noreply.github.com>`; never change git config. Commit messages: Conventional Commits, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Pitch `G = 45`, clearance `c = 0.4`, wall 1.0, floor 1.0, foot height 3.5, insertion 2, unit height 33.
- Height `H = u · 33 + 2`; `u` ∈ [0.5, 3], step 0.25. Box footprint 1–6 × 1–6; grid 1–10 × 1–10.
- Feet on an exact 45 mm pitch (not 44.6 as in the 2×1 reference).
- Label surface at `H − 3.4`, lip top at `H − 3.0`; label width = outer width incl. lip, range 20–42.6, default 27; never wider than one module (42.6) or the label wall's inner length; always centred.
- Label surface and lip identical for every height; only the underside is clipped at z = 4.0.
- Rounded floor always on (not a parameter).
- `N × M` = width along the label wall (X) × depth (Y); no normalisation (1×2 ≠ 2×1).
- Output STL: binary, manifold, resting on z = 0, units mm.
- File names: `box_{N}x{M}_h{u}[_label{W}][_nolip].stl`, `box_…_nolabel.stl`, `grid_{N}x{M}.stl`.
- Only dependencies: `manifold-3d`, `three`; dev: `typescript`, `vite`, `vitest`, `@types/three`.

## Coordinate conventions (all tasks)

- Grid occupies x ∈ [0, N·G], y ∈ [0, M·G], z ∈ [0, 3]; module (i, j) centre = ((i+0.5)·G, (j+0.5)·G).
- Box outline x ∈ [c/2, N·G − c/2], y ∈ [c/2, M·G − c/2], z ∈ [0, H] — i.e. a box placed at the origin sits exactly in the grid cells (i, j) from (0, 0).
- Front (label) wall = the y-min wall. Distances "from the outer face" `t` are measured from y = c/2.

## Review Focus

1. Label width at the maximum on a 1×1 (42.6 = wall to wall) or exceeding the wall after advanced changes → wedge clamped, merges into side walls, never pokes outside the outline (Task 5 test `label never exceeds outline`).
2. Largest box 6×6 at u = 3 → generation finishes in reasonable time and stays manifold (Task 4 test `6x6 u3 builds under 5 s`).
3. Corrupt, partial or old-shape `localStorage` JSON → page loads with defaults, no exception (Task 6 test `loadParams falls back on garbage`).
4. Typed non-integer / out-of-range values (2.3 modules, u = 0.6, width 100, wall 0) → snapped/clamped by `normalize*`, form shows the normalised value (Task 1 tests `normalizeBox snaps and clamps`).
5. u = 0.5 with lip off and full-width label → still manifold, stack test passes (Task 5 test `half height full-width no-lip stacks`).

---

### Task 1: Scaffold, parameters and height math

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` (placeholder `<div id="app">`), `src/main.ts` (empty bootstrap), `src/geometry/params.ts`
- Test: `tests/params.test.ts`

**Interfaces:**
- Produces (`src/geometry/params.ts`):
  ```ts
  export interface Advanced { pitch: number; clearance: number; wall: number; floor: number; footHeight: number; insertion: number; unitHeight: number }
  export interface LabelParams { enabled: boolean; width: number; lip: boolean }
  export interface BoxParams { kind: 'box'; widthUnits: number; depthUnits: number; heightUnits: number; label: LabelParams; advanced: Advanced }
  export interface GridParams { kind: 'grid'; widthUnits: number; depthUnits: number; advanced: Advanced }
  export type Params = BoxParams | GridParams
  export const DEFAULT_ADVANCED: Advanced   // 45, 0.4, 1, 1, 3.5, 2, 33
  export const DEFAULT_BOX: BoxParams       // 1×1, u=1, label {true, 27, true}
  export const DEFAULT_GRID: GridParams     // 4×4
  export const LIMITS: { boxUnits:[1,6]; gridUnits:[1,10]; height:[0.5,3]; heightStep:0.25; labelWidth:[20,42.6] }
  export function boxHeight(u: number, adv: Advanced): number            // u·unitHeight + insertion
  export function maxLabelWidth(p: BoxParams): number                    // min(42.6, pitch − clearance − 2·wall)
  export function normalizeBox(p: Partial<BoxParams>): BoxParams
  export function normalizeGrid(p: Partial<GridParams>): GridParams
  ```
  Advanced ranges for `normalize*`: pitch 20–100, clearance 0–1, wall 0.6–3, floor 0.6–3, footHeight 2–6, insertion 1–4, unitHeight 10–100.

- [ ] **Step 1:** `npm init`, install deps at the versions in Tech Stack, scripts `dev`, `build` (`tsc --noEmit && vite build`), `test` (`vitest run`). `vite.config.ts`: `base: '/assortment-boxes/'`, `test.environment: 'node'`, `optimizeDeps.exclude: ['manifold-3d']`. Strict TS.
- [ ] **Step 2: Write failing tests** in `tests/params.test.ts`:
  ```ts
  test('heights', () => { expect(boxHeight(1, A)).toBe(35); expect(boxHeight(0.5, A)).toBe(18.5) })
  test('stacks add up', () => { for (const [a,b] of [[0.5,0.5],[1,0.5],[0.75,1.25],[1.5,1.5]])
    expect(boxHeight(a,A) + boxHeight(b,A) - A.insertion).toBeCloseTo(boxHeight(a+b,A), 9) })
  test('normalizeBox snaps and clamps', () => {
    const p = normalizeBox({ widthUnits: 2.3, depthUnits: 9, heightUnits: 0.6, label: { enabled: true, width: 100, lip: true } })
    expect([p.widthUnits, p.depthUnits, p.heightUnits, p.label.width]).toEqual([2, 6, 0.5, 42.6])
    expect(normalizeBox({ advanced: { ...A, wall: 0 } }).advanced.wall).toBe(0.6) })
  test('maxLabelWidth', () => { expect(maxLabelWidth(DEFAULT_BOX)).toBeCloseTo(42.6) })
  test('normalize ignores junk', () => { expect(normalizeBox({ widthUnits: NaN } as any)).toEqual(DEFAULT_BOX) })
  ```
- [ ] **Step 3:** Run `npm test` → FAIL (module missing).
- [ ] **Step 4:** Implement `params.ts`. `normalize*` deep-merges onto defaults, replaces non-finite numbers by defaults, rounds units to integers, height to step 0.25, clamps everything, then clamps label width to `[20, maxLabelWidth]`.
- [ ] **Step 5:** `npm test` → PASS; `npm run build` → succeeds.
- [ ] **Step 6:** Commit `chore: scaffold vite project with parameter model`.

### Task 2: Manifold loader, primitives, STL export

**Files:**
- Create: `src/geometry/wasm.ts`, `src/geometry/primitives.ts`, `src/geometry/stl.ts`
- Test: `tests/stl.test.ts`, `tests/helpers/reference.ts`

**Interfaces:**
- Produces:
  ```ts
  // wasm.ts – lazy singleton; browser passes the Vite ?url of manifold.wasm, Node passes nothing
  export function getManifold(wasmUrl?: string): Promise<ManifoldToplevel>
  // primitives.ts (all take the toplevel `m` as first arg)
  export function roundedRect(m, x0: number, y0: number, x1: number, y1: number, r: number): CrossSection // r clamped ≥ 0.01, 32 segments
  export function slab(m, rect: CrossSection, z: number): Manifold          // 0.001-thick extrusion at z
  export function loft(m, layers: Array<{ rect: CrossSection; z: number }>): Manifold // union of hulls of consecutive slabs
  // stl.ts
  export interface MeshData { vertProperties: Float32Array; triVerts: Uint32Array; numProp: number }
  export function toBinaryStl(mesh: MeshData): ArrayBuffer                  // 80-byte header "assortment-boxes", per-face normal
  // tests/helpers/reference.ts
  export function loadStlManifold(m, path: string): Manifold                 // parse binary STL → Mesh → merge() → Manifold
  export function symDiffVolume(a: Manifold, b: Manifold): number            // a−b plus b−a volume
  export function alignMin(a: Manifold): Manifold                            // translate bbox min to origin
  ```
- [ ] **Step 1:** Copy `SPAS-box_1x1.stl`, `SPAS-box_2x1_smooth_v2.stl`, `SPAS-box_1x1_half_stackable_v3.stl`, `SPAS-grid_4x4.stl` from `C:\Users\filip.hamsik\Downloads\` to `reference/` (+ `reference/README.md`: source Printables 75204, user-modified, personal use).
- [ ] **Step 2: Failing tests** `tests/stl.test.ts`:
  ```ts
  test('cube stl', async () => { const m = await getManifold(); const buf = toBinaryStl(m.Manifold.cube([10,10,10]).getMesh())
    expect(buf.byteLength).toBe(84 + 12*50); expect(new DataView(buf).getUint32(80, true)).toBe(12) })
  test('stl normals point outward', …) // for the cube: each face normal · (centroid − cube centre) > 0
  test('loft makes a frustum', …)      // loft 40×40 at z0 → 37×37 at z3: status NoError, bbox z [0,3]
  test('references load', …)           // all four reference files: status() === 'NoError', volume > 0
  ```
- [ ] **Step 3:** Run → FAIL. **Step 4:** Implement. **Step 5:** Run → PASS.
- [ ] **Step 6:** Commit `feat: add manifold loader, primitives and binary STL export`.

### Task 3: Grid geometry

**Files:**
- Create: `src/geometry/grid.ts`
- Test: `tests/grid.test.ts`

**Interfaces:**
- Consumes: `GridParams`, `getManifold`, primitives.
- Produces: `export function buildGrid(m, p: GridParams): Manifold`

Profile (spec §Grid): plate N·G × M·G × 3 minus one cell cut-out per module; cut-out = loft of square (side G − 3) at z −ε…1.5, widening at 45° to side G (point at the grid line) at z 3+ε. Perimeter: outer face vertical to z = 3 (just clip the plate to the outline).

- [ ] **Step 1: Failing tests:**
  ```ts
  test('grid 4x4 bbox', …)            // [0,0,0]–[180,180,3]
  test('grid 4x4 matches reference', …) // symDiffVolume(alignMin(gen), alignMin(ref)) < 0.02 · ref.volume()
  test('grid manifold for 1x1..10x10', …) // sample 1×1, 3×2, 10×10: status NoError
  ```
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: generate drawer grid`.

### Task 4: Box shell (feet, walls, rounded floor, dividers)

**Files:**
- Create: `src/geometry/box.ts`
- Test: `tests/box.test.ts`

**Interfaces:**
- Consumes: `BoxParams`, `boxHeight`, primitives, `buildGrid` (in tests).
- Produces: `export function buildBox(m, p: BoxParams): Manifold` (label added in Task 5 via `buildLabel`; until then `p.label.enabled` is ignored).

Construction (coordinates per conventions; `o` = c/2):
- Outer solid = rounded-rect prism of the outline (R 3) from z = footHeight to H ∪ one foot per module: loft of the module outline (module cell inset by o, R 3) inset by 1.5 at z 0…1.5, back to inset 0 at z = footHeight. Feet are centred on the 45 mm module centres.
- Cavity = per-module lower cavity ∪ upper cavity. Per-module lower cavity: rect of module (i, j) inset by `o + wall` on outer sides and by 1.0 on sides shared with a neighbour (divider width 2.0), R 2; loft from that rect inset a further 2.4 at z = floor up to the full rect at z = footHeight, then vertical to z = 5.0. Upper cavity: outline inset by o + wall (R 2) from z = 5.0 to H + 1. This leaves the 2.0-wide divider with flat top at z = 5.0.
- Top inner edge: subtract a 0.4 × 45° chamfer ring at z = H (loft inner rect at H−0.4 → inner rect offset +0.4 at H+ε).
- Result = outer − cavity − chamfer.

- [ ] **Step 1: Failing tests:**
  ```ts
  test('bbox', …)                                  // 2×1 u1: x [0.2, 89.8], y [0.2, 44.8], z [0, 35]
  test('fits grid', …)                             // for 1×1, 2×1, 3×1, 6×1, 2×2: buildBox ∩ buildGrid(matching N×M) volume < 0.01
  test('feet clearance ≥ 0.2', …)                  // same boxes vs the grid translated by ±0.19 in x and in y (4 shifts): ∩ volume < 0.01 each
  test('stacks', …)                                // box(u).translate([0,0,H(u)−2]) ∩ box(u) volume < 0.01 for u 0.5, 1 (label disabled)
  test('half height matches reference away from label', …)
      // 1×1 u0.5 vs half_stackable_v3, both alignMin, both ∩ cube y ∈ [15, 44.6] (excludes wedge): symDiff < 0.03·volume
  test('6x6 u3 builds under 5 s', …)               // status NoError, elapsed < 5000 ms
  ```
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: generate stackable box shell on 45 mm pitch`.

### Task 5: Label wedge

**Files:**
- Create: `src/geometry/label.ts`
- Modify: `src/geometry/box.ts` (union the wedge when `label.enabled`)
- Test: `tests/label.test.ts`

**Interfaces:**
- Consumes: `BoxParams`, `boxHeight`, `maxLabelWidth`, primitives.
- Produces: `export function buildLabel(m, p: BoxParams): Manifold`

Profile in the YZ plane, `t` = distance from front outer face, `Ht = H − 3.4`: polygon (t=wall, Ht) → (10.7, Ht) → (10.7, Ht − 2.3) → 45° back to (wall, Ht − 2.3 − (10.7 − wall)) → close; extruded along X over width W = clamp(label.width, 20, maxLabelWidth) centred on the box's X centre; then intersected with z ≥ 4.0 (clipped underside) and with the upper cavity footprint (so full-width wedges merge into the side walls). Plan-view ends rounded R 1 when W < inner length. Lip (if `label.lip`): U-rim 1.0 wide on the front edge and both ends, from Ht to Ht + 0.4. Overlap the wall by 0.01 so the union fuses.

- [ ] **Step 1: Failing tests:**
  ```ts
  test('matches 2x1 v2 wedge', …)          // gen 2×1 u1 width 27 lip vs v2: both ∩ cube z ≥ 6 (feet/divider excluded): symDiff < 0.03·vol
  test('matches half v3', …)               // 1×1 u0.5 width 25 lip vs v3 whole model: symDiff < 0.03·vol
  test('label same at every height', …)    // area of box.slice(H − 3.4 − 0.05) and of box.slice(H − 3.2) identical (±0.5 mm²) for u 0.5, 1, 2
  test('label never exceeds outline', …)   // 1×1 width 42.6 and 3×1 width 42.6: bbox unchanged vs label disabled
  test('stacks with label', …)             // like Task 4 'stacks' with default label, u 0.5 and 1
  test('half height full-width no-lip stacks', …) // 1×1 u0.5 width 42.6 lip false: NoError + stacks
  test('lip off is flat', …)               // slice at Ht + 0.2 has the same area with label as without when lip false
  ```
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS (all earlier tests too).
- [ ] **Step 5:** Commit `feat: add configurable label wedge`.

### Task 6: Form, storage, file name, download

**Files:**
- Create: `src/ui/form.ts`, `src/ui/storage.ts`, `src/geometry/filename.ts`, `src/ui/download.ts`, `src/style.css`
- Modify: `index.html`, `src/main.ts`
- Test: `tests/filename.test.ts`, `tests/storage.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function fileName(p: Params): string
  export function loadParams(storage?: Storage): { box: BoxParams; grid: GridParams; mode: 'box' | 'grid' }
  export function saveParams(state: ReturnType<typeof loadParams>, storage?: Storage): void  // key 'assortment-boxes:v1', try/catch
  export function mountForm(root: HTMLElement, state, onChange: (state) => void): void
  export function downloadStl(buf: ArrayBuffer, name: string): void
  ```
- UI: mode switch Box | Grid; box fields: Width (modules), Depth (modules), Height (units, step 0.25, shows "= 35.0 mm"), Label on/off, Label width slider (20 – max, shows mm), Raised lip on/off; grid fields: Width, Depth; collapsible "Advanced" with the seven `Advanced` numbers and a "Reset" button; "Download STL" button. Every change → normalise → write normalised values back into the fields → `onChange`. Help text under width/depth: "Width runs along the label wall."
- [ ] **Step 1: Failing tests:**
  ```ts
  expect(fileName({...DEFAULT_BOX, widthUnits: 2, heightUnits: 1.5})).toBe('box_2x1_h1.5_label27.stl')
  expect(fileName({...DEFAULT_BOX, label: {enabled: true, width: 25, lip: false}})).toBe('box_1x1_h1_label25_nolip.stl')
  expect(fileName({...DEFAULT_BOX, label: {...DEFAULT_BOX.label, enabled: false}})).toBe('box_1x1_h1_nolabel.stl')
  expect(fileName(DEFAULT_GRID)).toBe('grid_4x4.stl')
  test('loadParams falls back on garbage', …) // storage returning '{', '{"box":{"widthUnits":"x"}}', null, and a throwing getItem → defaults, no throw
  test('save/load roundtrip', …)
  ```
  Label width in file names: rounded to 1 decimal, trailing `.0` dropped.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** `npm run dev`, manually: change fields, reload page → values persist; download → file name correct.
- [ ] **Step 6:** Commit `feat: add parameter form, persistence and STL download`.

### Task 7: 3D preview and wiring

**Files:**
- Create: `src/ui/preview.ts`, `src/geometry/toBufferGeometry.ts`
- Modify: `src/main.ts`
- Test: `tests/toBufferGeometry.test.ts`

**Interfaces:**
- Consumes: `buildBox`, `buildGrid`, `getManifold`, `toBinaryStl`, form/storage from Task 6.
- Produces:
  ```ts
  export function toBufferGeometry(mesh: MeshData): THREE.BufferGeometry   // non-indexed, computeVertexNormals
  export function createPreview(canvasHost: HTMLElement): { show(geom: THREE.BufferGeometry, p: Params): void; dispose(): void }
  ```
- Preview: Z-up camera, OrbitControls, light grey floor grid at 45 mm, a small arrow/label "Label side" in front of the y-min wall for boxes; camera re-fits only when the footprint changes. `main.ts`: load WASM via `import wasmUrl from 'manifold-3d/manifold.wasm?url'`, rebuild on change debounced 150 ms, show "Generating…" while building, keep last mesh for download.
- [ ] **Step 1: Failing test:** cube mesh → geometry has 36 vertices and a `normal` attribute.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** `npm run build && npx vite preview`; manually verify: box and grid render, label arrow on the correct side, 6×6 u3 generates, downloaded STL opens in a slicer without repair warnings.
- [ ] **Step 6:** Commit `feat: add 3D preview`.

### Task 8: Deploy to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1:** Workflow on push to `main`: checkout, setup-node 22, `npm ci`, `npm test`, `npm run build`, `actions/upload-pages-artifact` (`dist`), `actions/deploy-pages`. Permissions `pages: write`, `id-token: write`.
- [ ] **Step 2:** README: what it is, link to SPAS on Printables, live URL `https://filiphamsik.github.io/assortment-boxes/`, `npm run dev` / `npm test`.
- [ ] **Step 3:** Commit `ci: deploy to GitHub Pages`; push; tell the user to set Settings → Pages → Source: GitHub Actions (one-time, cannot be done without `gh`).
- [ ] **Step 4:** After the run is green, open the live URL and repeat the Task 7 manual check.
