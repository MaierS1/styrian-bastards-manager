import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

function readGitValue(command, fallback = '') {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    return fallback
  }
}

export default defineConfig(({ mode }) => {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA
    || readGitValue('git rev-parse --short HEAD')
  const branchName = process.env.VERCEL_GIT_COMMIT_REF
    || readGitValue('git branch --show-current')

  return {
    define: {
      'import.meta.env.VITE_APP_BUILD_COMMIT': JSON.stringify(commitSha),
      'import.meta.env.VITE_APP_BUILD_BRANCH': JSON.stringify(branchName),
      'import.meta.env.VITE_APP_BUILD_MODE': JSON.stringify(mode),
    },
    plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: 'Styrian Bastards Vereinsmanager',
        short_name: 'SB Manager',
        description: 'Vereinsmanager für Styrian Bastards',
        theme_color: '#0b0b0b',
        background_color: '#0b0b0b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    ],
  }
})
