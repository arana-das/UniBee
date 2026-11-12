
require("dotenv").config();

const mongoose = require("mongoose");
const readline = require("readline");
const User = require("../models/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function createHODUser() {
  try {
    const mongoURI =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URL;

    if (!mongoURI) {
      throw new Error(
        "MongoDB connection string not found in backend .env"
      );
    }

    await mongoose.connect(mongoURI);

    console.log("\nMongoDB connected successfully.\n");

    const fullName =
      (await ask("HOD Full Name: ")).trim();

    const email =
      (await ask("HOD Email: ")).trim().toLowerCase();

    const password =
      (await ask("HOD Password: ")).trim();

    const department =
      (await ask("Department (optional): ")).trim();

    if (!fullName || !email || !password) {
      throw new Error(
        "Name, email and password are required."
      );
    }

    if (password.length < 8) {
      throw new Error(
        "Password must contain at least 8 characters."
      );
    }

    const existing = await User.findOne({
      $or: [
        { email },
        { userId: "HOD001" },
      ],
    });

    if (existing) {
      throw new Error(
        "A user with this email or HOD001 ID already exists."
      );
    }

    const hod = await User.create({
      userId: "HOD001",
      fullName,
      email,
      password,
      role: "hod",
      department,
      status: "Active",
      isActive: true,
    });

    console.log("\n✅ HOD Account Created!");
    console.log("-----------------------------");
    console.log("User ID:", hod.userId);
    console.log("Name:", hod.fullName);
    console.log("Email:", hod.email);
    console.log("Role:", hod.role);
    console.log("Department:", hod.department || "Not assigned");
    console.log("Status:", hod.status);
    console.log("-----------------------------");

    console.log(
      "\nPassword securely hashed in MongoDB."
    );

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

createHODUser();
