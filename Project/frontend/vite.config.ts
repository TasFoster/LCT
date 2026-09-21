import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// База задаётся переменной VITE_BASE:
//   GitHub Pages (проектный сайт) — VITE_BASE=/имя-репозитория/
//   Netlify / Vercel / свой домен  — база по умолчанию '/'
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
})
