module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./test/setup.js'],
  testMatch: ['**/test/**/*.test.js'],
  testTimeout: 30000,
  collectCoverage: true,
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/server.js',
    '!backend/node_modules/**',
    '!backend/tests/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'test/coverage'
};
