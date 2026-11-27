const mongoose = require("mongoose");

async function connectToDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000
  });

  console.log(`MongoDB connected: ${mongoose.connection.name}`);

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected.");
  });

  mongoose.connection.on("error", error => {
    console.error("MongoDB connection error:", error.message);
  });

  return mongoose.connection;
}

module.exports = connectToDatabase;