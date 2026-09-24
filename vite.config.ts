/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  // Variables that reach the browser bundle. Besides Vite's own prefix, the
  // two public values Vercel's Supabase integration injects, named exactly:
  // the same integration also injects SUPABASE_SECRET_KEY, the service role
  // key and database passwords, so a bare "SUPABASE_" prefix would publish them.
  envPrefix: ['VITE_', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'],
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
