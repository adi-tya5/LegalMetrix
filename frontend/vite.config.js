import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'https://legalmetrix-qjt1.onrender.com'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/verify': {
          target: apiTarget,
          changeOrigin: true,
          // Only proxy API calls that expect JSON, or let client-side router handle /verify on the frontend
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.includes('text/html')) {
              return '/index.html'
            }
          }
        }
      }
    }
  }
})

