import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/assortment-boxes/',
  optimizeDeps: { exclude: ['manifold-3d'] },
  test: { environment: 'node', testTimeout: 30000 },
})
