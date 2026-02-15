const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  // webServer: {
  //     command: 'python3 -m http.server 8000',
  //     port: 8000,
  //     reuseExistingServer: !process.env.CI,
  // },
  use: {
    baseURL: 'http://localhost:8000',
  },
});
