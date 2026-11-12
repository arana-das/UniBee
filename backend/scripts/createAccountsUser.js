
require("dotenv").config();

const mongoose = require("mongoose");
const readline = require("node:readline/promises");

const User = require("../models/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  try {
    console.log("\n=== Create UniBee Accounts Officer ===\n");

    const fullName = (
      await rl.question("Full Name: ")
    ).trim();

    const email = (
      await rl.question("Email: ")
    ).trim().toLowerCase();

    const password = await rl.question(
      "Password (minimum 8 characters): "
    );

    if (!fullName) {
      throw new Error("Full name is required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email address.");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MongoDB URI missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const userId = "ACC001";

    const existing = await User.findOne({
      $or: [{ email }, { userId }],
    });

    if (existing) {
      throw new Error(
        "This email or ACC001 already exists. No changes made."
      );
    }

    const user = await User.create({
      userId,
      fullName,
      email,
      password,
      role: "accounts",
      status: "Active",
      department: "Finance",
      isActive: true,
    });

    console.log("\n✅ REAL ACCOUNTS OFFICER CREATED");
    console.log("User ID:", user.userId);
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("Status:", user.status);
    console.log("\nPassword is stored as a hash.");

  } catch (error) {
    console.error("\nERROR:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

main();
