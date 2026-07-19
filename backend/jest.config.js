module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  // Don't run tests from node_modules
  testPathIgnorePatterns: ['/node_modules/'],
  // Increase timeout for DB setup/teardown
  testTimeout: 30000,
  // Setup file for mongodb-memory-server
  globalSetup: './__tests__/globalSetup.js',
  globalTeardown: './__tests__/globalTeardown.js',
};
