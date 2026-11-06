import Module from 'manifold-3d/manifold.js'
import type { ManifoldToplevel } from 'manifold-3d'

export type M = ManifoldToplevel

interface Deletable {
  delete(): void
  isDeleted?(): boolean
}

let instance: Promise<ManifoldToplevel> | undefined
/** Objects created while a `scoped` call is running (innermost scope last). */
const scopes: Set<Deletable>[] = []

/** Lazy singleton. The browser passes the Vite `?url` of manifold.wasm; Node passes nothing. */
export function getManifold(wasmUrl?: string): Promise<ManifoldToplevel> {
  instance ??= Module(wasmUrl ? { locateFile: () => wasmUrl } : undefined).then(m => {
    m.setup()
    track(m)
    return m
  })
  return instance
}

/**
 * Runs `fn` and frees every Manifold/CrossSection created inside it except the returned one.
 * manifold-3d objects live on the WASM heap and are never garbage-collected.
 */
export function scoped<T extends Deletable>(fn: () => T): T {
  const created = new Set<Deletable>()
  scopes.push(created)
  let result: T | undefined
  try {
    result = fn()
    return result
  } finally {
    scopes.pop()
    for (const o of created) {
      if (o === result) continue
      try {
        if (!o.isDeleted?.()) o.delete()
      } catch {
        // already freed by the library itself
      }
    }
    // the result belongs to the enclosing scope, if any
    if (result && scopes.length) scopes[scopes.length - 1].add(result)
  }
}

/** Wrap every method/static of Manifold and CrossSection so their results are registered. */
function track(m: M) {
  const classes = [m.Manifold, m.CrossSection] as unknown as Array<{ prototype: object }>
  const isTracked = (v: unknown): v is Deletable => classes.some(c => v instanceof (c as any))
  const wrap = (target: any, key: string) => {
    const desc = Object.getOwnPropertyDescriptor(target, key)
    if (!desc || typeof desc.value !== 'function' || key === 'constructor' || key === 'delete') return
    const orig = desc.value
    target[key] = function (this: unknown, ...args: unknown[]) {
      const r = orig.apply(this, args)
      const scope = scopes[scopes.length - 1]
      if (scope && isTracked(r) && r !== this && !args.includes(r)) scope.add(r)
      return r
    }
  }
  for (const c of classes) {
    // Methods live on the embind base prototype(s); stop at ClassHandle (the one with `isDeleted`).
    for (let proto: any = c.prototype; proto && !Object.hasOwn(proto, 'isDeleted'); proto = Object.getPrototypeOf(proto))
      for (const key of Object.getOwnPropertyNames(proto)) wrap(proto, key)
    for (const key of Object.getOwnPropertyNames(c)) wrap(c, key)
  }
}
