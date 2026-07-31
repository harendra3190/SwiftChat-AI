const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongod;

/**
 * Connect to the in-memory database.
 */
beforeAll(async () => {
  // Ensure we are not using buffering for tests
  mongoose.set("bufferCommands", false);

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
});

/**
 * Drop database, close the connection and stop mongod.
 */
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});
