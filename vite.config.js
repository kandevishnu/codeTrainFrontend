import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Replace the domain below with your actual ngrok domain
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // makes it accessible from LAN & ngrok
    allowedHosts: [
      '52f41851da96.ngrok-free.app' // ngrok domain
    ]
  }
})
