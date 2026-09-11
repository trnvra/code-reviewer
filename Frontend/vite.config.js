import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Exposes Vite on 0.0.0.0 (Network/Mobile access)
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/ai': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      }
    }
  }
})
