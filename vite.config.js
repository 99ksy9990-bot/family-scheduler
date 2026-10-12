import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const appVersion = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local').slice(0, 7)

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,webmanifest}'],
      },
    }),
  ],
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom)[\\/]/, priority: 30 },
            { name: 'supabase-vendor', test: /node_modules[\\/]@supabase[\\/]/, priority: 20 },
            { name: 'icons-vendor', test: /node_modules[\\/]lucide-react[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})
