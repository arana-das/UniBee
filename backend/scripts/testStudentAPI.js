
require("dotenv").config();

const mongoose = require("mongoose");
const Student = require("../models/Student");

const BASE_URL = "http://localhost:5000";

async function main() {
  let studentId = null;
  let token = null;
  let allPassed = true;

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing.");
    }

    await mongoose.connect(process.env.MONGO_URI);

    // Ask for credentials without exposing
    // the password in this test script.
    // Admin email and password are entered
    // interactively through PowerShell.
    const { execFileSync } = require("child_process");

    const credentials = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        [
          "$e = Read-Host 'Admin email';",
          "$p = Read-Host 'Admin password' -AsSecureString;",
          "$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($p);",
          "try {",
          "  $v = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b);",
          "  [Console]::Write([Convert]::ToBase64String(",
          "    [Text.Encoding]::UTF8.GetBytes($e + [char]10 + $v)",
          "  ));",
          "} finally {",
          "  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b);",
          "}",
        ].join(" "),
      ],
      { encoding: "utf8", stdio: ["inherit", "pipe", "inherit"] }
    );

    const [email, password] = Buffer.from(
      credentials.trim(),
      "base64"
    ).toString("utf8").split("\n");

    // Test 1: Admin login
    const loginResponse = await fetch(
      `${BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );

    const login = await loginResponse.json();

    if (!loginResponse.ok || !login.token ||
        login.user?.role !== "admin") {
      throw new Error("Admin authentication failed.");
    }

    token = login.token;
    console.log("Admin authentication: PASSED");

    // Test 2: Create student through API
    const testId = `TEST-${Date.now()}`;

    const createResponse = await fetch(
      `${BASE_URL}/api/students`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: testId,
          name: "UniBee API Test Student",
          email: `${testId.toLowerCase()}@example.com`,
          department: "Computer Science",
          program: "BSc",
          semester: "1",
          batch: "2026",
          status: "Active",
        }),
      }
    );

    const created = await createResponse.json();

    if (!createResponse.ok || !created.data?.id) {
      throw new Error(
        `Student creation failed: ${created.message}`
      );
    }

    studentId = created.data.id;
    console.log("HTTP POST student creation: PASSED");

    // Test 3: Retrieve same student
    const getResponse = await fetch(
      `${BASE_URL}/api/students/${studentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const retrieved = await getResponse.json();

    if (
      !getResponse.ok ||
      retrieved.data?.name !== "UniBee API Test Student"
    ) {
      throw new Error("Student retrieval failed.");
    }

    console.log("HTTP GET student retrieval: PASSED");

    // Test 4: Delete temporary student
    const deleteResponse = await fetch(
      `${BASE_URL}/api/students/${studentId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!deleteResponse.ok) {
      throw new Error("Student cleanup through API failed.");
    }

    studentId = null;
    console.log("HTTP DELETE student cleanup: PASSED");

    console.log("Student HTTP API test: PASSED");
  } catch (error) {
    allPassed = false;
    console.error("Student HTTP API test failed:", error.message);
  } finally {
    // Fallback cleanup if a test fails after creation.
    if (studentId) {
      try {
        await Student.findByIdAndDelete(studentId);
        console.log("Fallback test cleanup completed.");
      } catch (error) {
        console.error("Cleanup failed:", error.message);
        allPassed = false;
      }
    }

    await mongoose.disconnect();

    if (!allPassed) {
      process.exitCode = 1;
    }
  }
}

main();
