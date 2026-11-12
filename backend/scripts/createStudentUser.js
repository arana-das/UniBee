
require("dotenv").config();

const mongoose = require("mongoose");
const readline = require("node:readline/promises");

const User = require("../models/User");
const Student = require("../models/Student");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function ask(label) {
  return (await rl.question(label)).trim();
}

async function main() {
  try {
    console.log("\n================================");
    console.log(" UniBee - Create Real Student");
    console.log("================================\n");

    const studentId = (
      await ask("Student ID (example: STU001): ")
    ).toUpperCase();

    const fullName = await ask("Full Name: ");

    const email = (
      await ask("Email: ")
    ).toLowerCase();

    const password = await ask(
      "Password (minimum 8 characters): "
    );

    if (!studentId || !fullName) {
      throw new Error("Student ID and Full Name are required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email.");
    }

    if (password.length < 8) {
      throw new Error("Password must contain at least 8 characters.");
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("\nMongoDB connected successfully.");

    // Check whether this email already has a login account.
    const existingUser = await User.findOne({
      $or: [{ email }, { userId: studentId }],
    });

    if (existingUser) {
      throw new Error(
        "A login account already uses this email or Student ID. " +
        "No changes made."
      );
    }

    // Reuse a matching Student record if already created by Admin.
    let student = await Student.findOne({
      $or: [{ email }, { studentId }],
    });

    if (student) {
      if (
        student.email !== email ||
        student.studentId !== studentId
      ) {
        throw new Error(
          "Student ID or email belongs to a different record. " +
          "No changes made."
        );
      }

      console.log(
        "\nExisting Student record found. Linking login account."
      );

      // Use the name already stored in the Student record.
    } else {
      console.log("\nEnter Academic Information:");

      const department = await ask(
        "Department (example: CSE): "
      );

      const program = await ask(
        "Program (example: BSc in CSE): "
      );

      const semester = await ask(
        "Semester (example: 1): "
      );

      const batch = await ask(
        "Batch (optional): "
      );

      const section = await ask(
        "Section (optional): "
      );

      if (!department || !program || !semester) {
        throw new Error(
          "Department, Program and Semester are required."
        );
      }

      student = await Student.create({
        studentId,
        fullName,
        email,
        department,
        program,
        semester,
        batch,
        section,
        status: "Active",
      });

      console.log("\nStudent profile saved to MongoDB.");
    }

    // The User model hashes the password before saving.
    const user = await User.create({
      userId: student.studentId,
      fullName: student.fullName,
      email: student.email,
      password,
      role: "student",
      status: "Active",
      department: student.department,
      profileId: student._id,
      isActive: true,
    });

    console.log("\n================================");
    console.log(" REAL STUDENT ACCOUNT CREATED");
    console.log("================================");
    console.log("Student ID :", student.studentId);
    console.log("Name       :", student.fullName);
    console.log("Email      :", user.email);
    console.log("Role       :", user.role);
    console.log("Status     :", user.status);
    console.log("Profile ID :", String(user.profileId));
    console.log("================================");
    console.log("Password hashed automatically.");
    console.log("You can now log in using this account.");

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
