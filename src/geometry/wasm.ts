import Module from 'manifold-3d/manifold.js'
import type { ManifoldToplevel } from 'manifold-3d'

export type M = ManifoldToplevel

let instance: Promise<ManifoldToplevel> | undefined

/** Lazy singleton. The browser passes the Vite `?url` of manifold.wasm; Node passes nothing. */
export function getManifold(wasmUrl?: string): Promise<ManifoldToplevel> {
  instance ??= Module(wasmUrl ? { locateFile: () => wasmUrl } : undefined).then(m => {
    m.setup()
    return m
  })
  return instance
}
