import { defineConfig } from 'astro/config'

export default defineConfig({
  vite: {
    server: {
      // ngrok などのトンネルツール経由でのアクセスを許可
      allowedHosts: 'all',
    },
  },
})
