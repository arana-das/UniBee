
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

// ========================================
// UNIBEE INITIAL ADMIN SETUP
// ========================================

async function createInitialAdmin() {
  try {
    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    const fullName = process.env.INITIAL_ADMIN_NAME;

    if (!email || !password || !fullName) {
      throw new Error(
        "INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, " +
        "and INITIAL_ADMIN_NAME are required in .env"
      );
    }

    if (password.length < 12) {
      throw new Error(
        "Admin password must contain at least 12 characters."
      );
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not configured.");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.");

    // Never create another initial administrator
    // if an admin already exists.
    const existingAdmin = await User.findOne({
      role: "admin",
    });

    if (existingAdmin) {
      console.log(
        "An administrator already exists. No account created."
      );
      return;
    }

    const existingEmail = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmail) {
      console.log(
        "This email already belongs to another account."
      );
      return;
    }

    await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: "admin",
      isActive: true,
    });

    console.log("Initial administrator created successfully.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createInitialAdmin();
