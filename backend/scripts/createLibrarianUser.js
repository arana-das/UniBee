
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
    console.log("\n=== UniBee: Create Real Librarian ===\n");

    const fullName = (
      await rl.question("Librarian name: ")
    ).trim();

    const email = (
      await rl.question("Librarian email: ")
    ).trim().toLowerCase();

    const password = await rl.question(
      "Create password (minimum 8 characters): "
    );

    if (!fullName) {
      throw new Error("Name is required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email.");
    }

    if (password.length < 8) {
      throw new Error("Password must contain at least 8 characters.");
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("\nMongoDB connected.");

    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      throw new Error(
        "An account already exists with this email. No changes made."
      );
    }

    const userId = "LIB001";

    const existingId = await User.findOne({ userId });

    if (existingId) {
      throw new Error(
        "LIB001 already exists. No changes made."
      );
    }

    const librarian = await User.create({
      userId,
      fullName,
      email,
      password,
      role: "librarian",
      status: "Active",
      department: "Library",
      isActive: true,
    });

    console.log("\n✅ REAL LIBRARIAN ACCOUNT CREATED");
    console.log("---------------------------------");
    console.log("User ID:", librarian.userId);
    console.log("Name:", librarian.fullName);
    console.log("Email:", librarian.email);
    console.log("Role:", librarian.role);
    console.log("Status:", librarian.status);
    console.log("---------------------------------");
    console.log("Password securely hashed in MongoDB.");
    console.log("Use your entered email and password to log in.");

  } catch (error) {
    console.error("\n❌", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

main();
