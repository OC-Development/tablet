import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  base: './',                 // مهم لمسارات NUI
  plugins: [svelte({
    compilerOptions: {
      compatibility: { componentApi: 4 }  // 🔴 إجبار API سفلِت 4
    }
  })],
  build: {
    outDir: './dist',         // لأنك تَبني داخل مجلد html
    assetsDir: 'assets',
    emptyOutDir: true
  }
})
