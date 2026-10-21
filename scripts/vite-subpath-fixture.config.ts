import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// No bridge, personal CODEX_HOME, provider or backend in this synthetic fixture.
export default defineConfig({
  base: '/codex/', cacheDir: '.vite-subpath-fixture',
  plugins: [vue(), tailwindcss()],
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
})
