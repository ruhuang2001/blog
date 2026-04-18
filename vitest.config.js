import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  esbuild: {
    loader: 'jsx',
    jsx: 'automatic',
    jsxImportSource: 'react',
    include: /.*\.jsx?$/,
    exclude: []
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  },
  test: {
    environment: 'node'
  }
})
