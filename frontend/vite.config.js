import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Habilitar acceso de red local y túneles
    allowedHosts: true, // Permitir cualquier túnel (ngrok, localtunnel, Cloudflare, etc.)
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    },
    watch: {
      usePolling: true, // Asegura que los cambios se detecten dentro de Docker en Windows
    }
  }
})
