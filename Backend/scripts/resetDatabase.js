require("dotenv").config();

const mongoose = require("mongoose");

async function resetDatabase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Database reset is disabled in production.");
  }

  if (process.env.CONFIRM_DATABASE_RESET !== "YES_I_UNDERSTAND") {
    throw new Error(
      "Reset blocked. Set CONFIRM_DATABASE_RESET=YES_I_UNDERSTAND to continue."
    );
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000
  });

  const databaseName = mongoose.connection.name;

  if (!databaseName) {
    throw new Error("Could not identify the target database.");
  }

  console.log(`Target database: ${databaseName}`);

  await mongoose.connection.dropDatabase();

  console.log("Database reset completed successfully.");
}

resetDatabase()
  .catch((error) => {
    console.error("Database reset failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });