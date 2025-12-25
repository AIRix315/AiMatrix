/**
 * Vitest 配置文件
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/utils/setup.ts'],
    include: [
      'tests/**/*.{test,spec}.{js,ts}',
      'tests/**/*.{test,spec}.{jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.idea',
      '.git',
      '.cache'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'tests',
        'dist',
        'build',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/renderer/**' // 前端组件测试需要不同的环境
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/main': path.resolve(__dirname, './src/main'),
      '@/renderer': path.resolve(__dirname, './src/renderer'),
      '@/shared': path.resolve(__dirname, './src/shared')
    }
  }
});
