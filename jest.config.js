module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.js'],
  moduleDirectories: ['node_modules', 'backend/node_modules'],
  collectCoverageFrom: ['backend/**/*.js', '!backend/node_modules/**', '!backend/uploads/**'],
  setupFilesAfterEnv: [],
  testTimeout: 30000,
};
