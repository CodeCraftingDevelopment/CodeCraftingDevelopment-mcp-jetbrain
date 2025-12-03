import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/mcp': {
        target: 'http://127.0.0.1:64342',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mcp/, ''),
      },
    },
  },
})
