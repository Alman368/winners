import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  const config = {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
  }

  if (command !== 'serve') {
    return config
  }

  const viteApiUrl = process.env.VITE_API_URL
  if (!viteApiUrl) {
    throw new Error('VITE_API_URL is required')
  }

  return {
    ...config,
    server: {
      proxy: {
        '/api': { target: viteApiUrl, changeOrigin: true, timeout: 120000 },
      },
    },
  }
})
