
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ========================================
// UNIBEE USER MODEL
// Seven portals + Admin User Management
// ========================================

const USER_ROLES = [
  "student",
  "faculty",
  "admin",
  "hod",
  "librarian",
  "accounts",
  "exam-controller",
];

const USER_STATUSES = [
  "Active",
  "Pending",
  "Suspended",
];

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      maxlength: 50,
    },

    fullName: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      maxlength: 150,
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Enter a valid email address.",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required."],
      select: false,
    },

    role: {
      type: String,
      enum: USER_ROLES,
      required: [true, "User role is required."],
    },

    status: {
      type: String,
      enum: USER_STATUSES,
      default: "Active",
    },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    joinedAt: {
      type: String,
      trim: true,
      default: "",
    },

    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ========================================
// PASSWORD HASHING
// ========================================

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(
    this.password,
    12
  );
});

// ========================================
// PASSWORD VERIFICATION
// ========================================

userSchema.methods.comparePassword =
  async function (candidatePassword) {
    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };

// ========================================
// SAFE USER RESPONSE
// ========================================

userSchema.methods.toSafeObject = function () {
  const user = this.toObject();

  delete user.password;

  return user;
};

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.User ||
  mongoose.model("User", userSchema);
