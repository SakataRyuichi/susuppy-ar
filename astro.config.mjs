import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'

export default defineConfig({
  adapter: vercel(),
  vite: {
    server: {
      allowedHosts: true,
    },
  },
})
