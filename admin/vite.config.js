import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://fit-track-api-94nn.onrender.com',
        changeOrigin: true,
      },
      '/webhook': {
        target: 'https://fit-track-api-94nn.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
