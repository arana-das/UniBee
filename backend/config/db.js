
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error(
        "MONGO_URI is missing from .env file."
      );
    }

    const connection = await mongoose.connect(
      mongoURI,
      {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      }
    );

    console.log("--------------------------------");
    console.log("MongoDB Connected Successfully");
    console.log(
      `Host: ${connection.connection.host}`
    );
    console.log(
      `Database: ${connection.connection.name}`
    );
    console.log("--------------------------------");

    return connection;

  } catch (error) {
    console.error("--------------------------------");
    console.error("MongoDB Connection Failed");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);

    if (error.code) {
      console.error("Error Code:", error.code);
    }

    if (error.reason) {
      console.error(
        "Topology Error:",
        error.reason.message || error.reason
      );
    }

    console.error("--------------------------------");

    throw error;
  }
};

module.exports = connectDB;
