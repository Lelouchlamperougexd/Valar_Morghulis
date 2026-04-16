import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // VITE_API_URL must be just the base: http://host:port  (no /v1 suffix)
  const backendUrl = env.VITE_API_URL || 'http://134.209.84.250:8080'

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 3000,
      proxy: {
        // /api/v1/... → http://134.209.84.250:8080/v1/...
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
