// Vitest config (no import plugin resolution)
export default {
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', 'release/**'],
  },
}
