import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During development the API runs separately on :8000; proxy /api to it so the
// browser always talks to a single origin (matching the production deploy).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
