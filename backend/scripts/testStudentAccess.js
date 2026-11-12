
const readline = require("readline");

// ========================================
// UNIBEE STUDENT API ACCESS TEST
// ========================================

const BASE_URL = "http://localhost:5000";

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  function ask(question, hidden = false) {
    return new Promise((resolve) => {
      if (!hidden) {
        rl.question(question, resolve);
        return;
      }

      // Hide the password from terminal output.
      process.stdout.write(question);

      const originalWrite = rl._writeToOutput;

rl.question("", (answer) => {
  rl._writeToOutput = originalWrite;
  resolve(answer);
});

rl._writeToOutput = function (text) {
  if (text.includes("\n") || text.includes("\r")) {
    originalWrite.call(rl, "\n");
  }
};
    });
  }

  try {
    const email = await ask("Admin email: ");
    const password = await ask(
      "Admin password (hidden): ",
      true
    );

    rl.close();

    // 1. Authenticate administrator.
    const loginResponse = await fetch(
      `${BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const login = await loginResponse.json();

    console.log(
      "Login status:",
      loginResponse.status
    );

    if (!loginResponse.ok || !login.token) {
      console.log(
        "Login failed:",
        login.message
      );
      process.exitCode = 1;
      return;
    }

    console.log("Login successful: true");
    console.log("Authenticated role:", login.user?.role);

    if (login.user?.role !== "admin") {
      console.log("Admin account required.");
      process.exitCode = 1;
      return;
    }

    // 2. Test protected student list.
    const response = await fetch(
      `${BASE_URL}/api/students`,
      {
        headers: {
          Authorization: `Bearer ${login.token}`,
        },
      }
    );

    const result = await response.json();

    console.log("Student API status:", response.status);
    console.log("Student API success:", result.success);

    if (response.ok && Array.isArray(result.data)) {
      console.log("Student records:", result.data.length);
      console.log("Admin student access: PASSED");
    } else {
      console.log(
        "Student API message:",
        result.message || "Unknown error"
      );
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Test failed:", error.message);
    process.exitCode = 1;
    rl.close();
  }
}

main();
