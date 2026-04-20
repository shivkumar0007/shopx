import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Production mein paths sahi karne ke liye base add kiya
  base: '/', 
  build: {
    outDir: 'dist',
    // Agar assets load nahi ho rahe toh ise check karein
    assetsDir: 'assets',
  }
})