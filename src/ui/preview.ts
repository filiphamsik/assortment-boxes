import {
  AmbientLight, ArrowHelper, BufferGeometry, CanvasTexture, Color, DirectionalLight, GridHelper, Group, Mesh,
  MeshStandardMaterial, PerspectiveCamera, Scene, Sprite, SpriteMaterial, Vector3, WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Params } from '../geometry/params'

export interface Preview {
  show(geom: BufferGeometry, p: Params): void
  dispose(): void
}

const dark = () => matchMedia('(prefers-color-scheme: dark)').matches

export function createPreview(host: HTMLElement): Preview {
  const renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  host.append(renderer.domElement)

  const scene = new Scene()
  const camera = new PerspectiveCamera(35, 1, 1, 5000)
  camera.up.set(0, 0, 1)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  scene.add(new AmbientLight(0xffffff, 1.2))
  const sun = new DirectionalLight(0xffffff, 2.2)
  sun.position.set(-1, -2, 3)
  scene.add(sun)
  const fill = new DirectionalLight(0xffffff, 0.8)
  fill.position.set(2, 1, 1)
  scene.add(fill)

  const material = new MeshStandardMaterial({ color: 0x4f86e8, roughness: 0.6, metalness: 0 })
  const mesh = new Mesh(new BufferGeometry(), material)
  scene.add(mesh)
  const extras = new Group()
  scene.add(extras)

  let footprint = ''

  function applyTheme() {
    scene.background = new Color(dark() ? 0x161615 : 0xf6f6f4)
  }
  applyTheme()
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)

  function resize() {
    const { clientWidth: w, clientHeight: h } = host
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)

  let raf = 0
  const loop = () => {
    controls.update()
    renderer.render(scene, camera)
    raf = requestAnimationFrame(loop)
  }
  loop()

  function label(text: string): Sprite {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 64
    const ctx = c.getContext('2d')!
    ctx.font = '600 30px system-ui, sans-serif'
    ctx.fillStyle = dark() ? '#ececea' : '#1d1d1b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 32)
    const s = new Sprite(new SpriteMaterial({ map: new CanvasTexture(c), depthTest: false }))
    s.scale.set(32, 8, 1)
    return s
  }

  function rebuildExtras(p: Params, W: number, D: number) {
    for (const o of [...extras.children]) {
      extras.remove(o)
      ;(o as any).geometry?.dispose?.()
      ;(o as any).material?.map?.dispose?.()
      ;(o as any).material?.dispose?.()
    }
    const G = p.advanced.pitch
    const n = Math.max(p.widthUnits, p.depthUnits) + 2
    const grid = new GridHelper(n * G, n, dark() ? 0x3a3a36 : 0xd2d2cc, dark() ? 0x3a3a36 : 0xd2d2cc)
    grid.rotation.x = Math.PI / 2
    // GridHelper lines sit at centre ± k·G; snap the centre so lines fall on multiples of G.
    const snap = (c: number) => Math.round((c - (n * G) / 2) / G) * G + (n * G) / 2
    grid.position.set(snap(W / 2), snap(D / 2), -0.05)
    extras.add(grid)
    if (p.kind === 'box') {
      const arrow = new ArrowHelper(new Vector3(0, 1, 0), new Vector3(W / 2, -22, 0.5), 16, 0xe0802f, 5, 4)
      extras.add(arrow)
      const text = label('Label side')
      text.position.set(W / 2, -30, 0.5)
      extras.add(text)
    }
  }

  return {
    show(geom, p) {
      mesh.geometry.dispose()
      mesh.geometry = geom
      geom.computeBoundingBox()
      const bb = geom.boundingBox!
      const W = p.widthUnits * p.advanced.pitch
      const D = p.depthUnits * p.advanced.pitch
      rebuildExtras(p, W, D)
      const key = `${p.kind}:${W}x${D}`
      if (key !== footprint) {
        footprint = key
        const centre = new Vector3(W / 2, D / 2, (bb.max.z + bb.min.z) / 2)
        const size = Math.max(W, D, bb.max.z)
        controls.target.copy(centre)
        camera.position.copy(centre).add(new Vector3(-0.9, -1.6, 1.1).multiplyScalar(size * 1.1 + 40))
        controls.update()
      }
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
    },
  }
}
