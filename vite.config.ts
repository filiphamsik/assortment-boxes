import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/assortment-boxes/',
  optimizeDeps: { exclude: ['manifold-3d'] },
  build: { chunkSizeWarningLimit: 1000 },
  test: { environment: 'node', testTimeout: 30000, exclude: process.env.PROBE ? configDefaults.exclude : [...configDefaults.exclude, 'tests/_probe*'] },
})
