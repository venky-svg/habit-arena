import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://habit-arena-backend.onrender.com',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://habit-arena-backend.onrender.com',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
