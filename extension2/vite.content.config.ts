import path from 'node:path'

import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  define: {
    'process.env': {}
  },
  build: {
    emptyOutDir: false,
    outDir: path.resolve(__dirname, 'dist'),
    lib: {
      formats: ['iife'],
      entry: path.resolve(__dirname, 'content-script', 'index.tsx'),
      name: 'Cat Facts'
    },
    rollupOptions: {
      output: {
        entryFileNames: 'contentScript/index.js',
        extend: true,
      }
    }
  }
})
