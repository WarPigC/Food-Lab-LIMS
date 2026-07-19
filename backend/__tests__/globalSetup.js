/**
 * Global setup: Start an in-memory MongoDB instance.
 * The URI is stored in an environment variable so each test file can connect.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_TEST_URI = mongod.getUri();
  // Store the instance so globalTeardown can stop it
  global.__MONGOD__ = mongod;
};
