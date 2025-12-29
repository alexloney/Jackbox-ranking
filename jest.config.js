module.exports = {
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'app.js',
    '!node_modules/**',
  ],
  coverageDirectory: 'coverage',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
