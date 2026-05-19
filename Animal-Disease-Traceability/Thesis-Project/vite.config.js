import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, 
    // ALLOW NGROK:
    allowedHosts: ['fancied-abacus-shucking.ngrok-free.dev'], 
    proxy: {
      '/api': {
        target: 'http://localhost:3001', 
        changeOrigin: true,
        secure: false,
      }
    }
  }
})