import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: './' — относительные пути к ассетам, чтобы сборка работала как на
// project pages (username.github.io/repo/) на время миграции, так и после
// cutover на кастомный домен (корень), без правки конфига.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
