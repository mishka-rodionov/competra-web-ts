import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: './' — относительные пути к ассетам, чтобы сборка работала как на
// project pages (username.github.io/repo/) на время миграции, так и после
// cutover на кастомный домен (корень), без правки конфига.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // 3000, не дефолтный 5173 — бэкенд (eSport, HTTP.kt) уже разрешает CORS для localhost:3000
  // (использовался старым webpack-dev-server), это позволяет не трогать его конфиг.
  server: {
    port: 3000,
  },
})
