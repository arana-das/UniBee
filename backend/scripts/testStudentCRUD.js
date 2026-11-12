
require("dotenv").config();

const mongoose = require("mongoose");
const Student = require("../models/Student");

const {
  toStudentDatabase,
  toStudentFrontend,
} = require("../middleware/studentDataMapper");

async function testStudentCRUD() {
  let createdStudent = null;

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing.");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.");

    // Generate a temporary unique ID.
    const testId = `TEST-${Date.now()}`;

    const testData = {
      studentId: testId,
      name: "UniBee Test Student",
      email: `${testId.toLowerCase()}@example.com`,
      phone: "01700000000",
      department: "Computer Science",
      program: "BSc",
      batch: "2026",
      semester: "1",
      section: "A",
      status: "Active",
      enrolledAt: "2026-11-06",
    };

    // TEST 1: Frontend-to-database mapping
    const databaseData = toStudentDatabase(testData);

    console.log(
      "Frontend-to-database mapping:",
      databaseData.fullName === testData.name
        ? "PASSED"
        : "FAILED"
    );

    // TEST 2: Create record
    createdStudent = await Student.create(databaseData);

    console.log(
      "Student creation:",
      createdStudent ? "PASSED" : "FAILED"
    );

    // TEST 3: Read record
    const retrievedStudent = await Student.findById(
      createdStudent._id
    );

    console.log(
      "Student retrieval:",
      retrievedStudent ? "PASSED" : "FAILED"
    );

    // TEST 4: Database-to-frontend mapping
    const frontendData =
      toStudentFrontend(retrievedStudent);

    console.log(
      "Database-to-frontend mapping:",
      frontendData.name === testData.name
        ? "PASSED"
        : "FAILED"
    );

    console.log(
      "Student ID:",
      frontendData.studentId
    );

    console.log("Student CRUD test completed.");
  } catch (error) {
    console.error(
      "Student test failed:",
      error.message
    );
    process.exitCode = 1;
  } finally {
    // Remove only the record created by this test.
    if (createdStudent) {
      try {
        await Student.findByIdAndDelete(
          createdStudent._id
        );

        console.log(
          "Temporary test student removed."
        );
      } catch (error) {
        console.error(
          "Test cleanup failed:",
          error.message
        );
        process.exitCode = 1;
      }
    }

    await mongoose.disconnect();
  }
}

testStudentCRUD();
