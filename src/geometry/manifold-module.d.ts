declare module 'manifold-3d/manifold.js' {
  import type { ManifoldToplevel } from 'manifold-3d'
  export default function Module(options?: { locateFile?: (path: string) => string }): Promise<ManifoldToplevel>
}
