/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/__tests__/**/*.{spec,test}.{js,ts}', 'src/**/*.{spec,test}.{js,ts}'],
    setupFiles: ['./test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/**/__tests__/**', 'src/main.js']
    }
  }
})
