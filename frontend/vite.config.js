import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base to '/leetgolf/' for GitHub Pages deployment
  // Change 'leetgolf' to your repo name if different
  base: process.env.GITHUB_PAGES ? '/leetgolf/' : '/',
  server: {
    port: 5173
  }
})
