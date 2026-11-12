
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const readline = require("readline/promises");
const crypto = require("crypto");

dotenv.config();

const User = require("./models/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const PORTALS = [
  { role: "admin", label: "Admin" },
  { role: "student", label: "Student" },
  { role: "faculty", label: "Faculty" },
  { role: "hod", label: "HOD" },
  { role: "librarian", label: "Library" },
  { role: "accounts", label: "Accounts / Finance" },
  { role: "exam-controller", label: "Exam Controller" },
];

async function ask(question) {
  return (await rl.question(question)).trim();
}

function generatePassword() {
  return crypto.randomBytes(18).toString("base64url");
}

function generateUserId(role) {
  const prefix = role
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();

  const suffix = crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `USR-${prefix}-${suffix}`;
}

async function createAccount(portal) {
  console.log("\nCreate new account");

  const fullName = await ask("Full name: ");
  const email = (await ask("Login email: ")).toLowerCase();

  if (!fullName || !email) {
    console.log("Skipped: Name and email are required.");
    return;
  }

  const existing = await User.findOne({ email });

  if (existing) {
    console.log(
      "This email already belongs to an account. Skipped."
    );
    return;
  }

  const password = generatePassword();

  const user = new User({
    userId: generateUserId(portal.role),
    fullName,
    email,
    password,
    role: portal.role,
    status: "Active",
    isActive: true,
    profileId: null,
  });

  await user.save();

  console.log("\nACCOUNT CREATED");
  console.log("Portal:   ", portal.label);
  console.log("Email:    ", email);
  console.log("Password: ", password);
  console.log("User ID:  ", user.userId);
  console.log(
    "IMPORTANT: Save these credentials privately."
  );
  console.log(
    "Profile linking may still be required."
  );
}

async function resetAccount(portal, accounts) {
  console.log("\nExisting accounts:");

  accounts.forEach((user, index) => {
    console.log(
      `${index + 1}. ${user.fullName} (${user.email})`
    );
  });

  const selected = await ask(
    "Account number to reset (Enter to skip): "
  );

  if (!selected) {
    console.log("Skipped.");
    return;
  }

  const index = Number(selected) - 1;

  if (
    !Number.isInteger(index) ||
    !accounts[index]
  ) {
    console.log("Invalid selection. Skipped.");
    return;
  }

  const target = accounts[index];

  const confirmation = await ask(
    `Reset password for ${target.email}? Type YES: `
  );

  if (confirmation !== "YES") {
    console.log("Cancelled.");
    return;
  }

  const user = await User.findById(target._id).select(
    "+password"
  );

  if (!user) {
    console.log("User no longer exists.");
    return;
  }

  const password = generatePassword();

  // .save() triggers User.js bcrypt password hashing.
  user.password = password;
  user.status = "Active";
  user.isActive = true;

  await user.save();

  console.log("\nPASSWORD RESET SUCCESSFUL");
  console.log("Portal:   ", portal.label);
  console.log("Email:    ", user.email);
  console.log("Password: ", password);
  console.log(
    "Existing profileId and related records preserved."
  );
  console.log(
    "IMPORTANT: Save these credentials privately."
  );
}

async function processPortal(portal) {
  console.log("\n==================================");
  console.log(`PORTAL: ${portal.label}`);
  console.log(`ROLE: ${portal.role}`);
  console.log("==================================");

  const accounts = await User.find({
    role: portal.role,
  })
    .select("fullName email role status profileId")
    .sort({ createdAt: 1 })
    .lean();

  console.log(
    `Existing accounts: ${accounts.length}`
  );

  if (accounts.length > 0) {
    accounts.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.email} (${user.status})`
      );
    });
  }

  console.log("\n1 = Create new account");
  console.log("2 = Reset existing account password");
  console.log("0 = Skip this portal");

  const choice = await ask("Choose 1, 2 or 0: ");

  if (choice === "1") {
    await createAccount(portal);
  } else if (choice === "2") {
    if (!accounts.length) {
      console.log("No existing account to reset.");
    } else {
      await resetAccount(portal, accounts);
    }
  } else {
    console.log("Skipped.");
  }
}

async function main() {
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL;

  if (!uri) {
    throw new Error(
      "MongoDB connection variable not found in backend/.env"
    );
  }

  await mongoose.connect(uri);

  const databaseName = mongoose.connection.name;

  console.log("\n==================================");
  console.log("UNIBEE — PORTAL ACCOUNT SETUP");
  console.log("==================================");

  console.log("Connected database:", databaseName);

  const confirmation = await ask(
    `Type ${databaseName} to confirm this database: `
  );

  if (confirmation !== databaseName) {
    console.log(
      "Database confirmation failed. No changes made."
    );
    return;
  }

  for (const portal of PORTALS) {
    try {
      await processPortal(portal);
    } catch (error) {
      console.error(
        `Error in ${portal.label}: ${error.message}`
      );
    }
  }

  console.log("\n==================================");
  console.log("PORTAL ACCOUNT SETUP FINISHED");
  console.log("==================================");

  const totals = await User.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  for (const item of totals) {
    console.log(`${item._id}: ${item.count}`);
  }

  console.log("\nSave your account credentials.");
  console.log(
    "Do not share passwords or terminal screenshots containing passwords."
  );
}

main()
  .catch((error) => {
    console.error("\nSetup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    rl.close();
  });
