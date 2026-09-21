import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import https from 'node:https'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    watch: { ignored: ['**/tests/backend-host/**', '**/.local/**', '**/test-results/**'] },
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'https://localhost:7143',
        changeOrigin: true,
        secure: true,
        agent: new https.Agent({ rejectUnauthorized: true }),
      },
    },
  },
})
