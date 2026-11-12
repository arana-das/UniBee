
const mongoose = require("mongoose");

// ========================================
// UNIBEE STUDENT DATABASE MODEL
// Based on existing frontend requirements
// ========================================

const studentSchema = new mongoose.Schema(
  {
    // ------------------------------------
    // STUDENT IDENTITY
    // ------------------------------------

    studentId: {
      type: String,
      required: [true, "Student ID is required."],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },

    // Stored as fullName in MongoDB.
    // The future API will map frontend
    // "name" to this field.

    fullName: {
      type: String,
      required: [true, "Student name is required."],
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

    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
    },

    // ------------------------------------
    // ACADEMIC INFORMATION
    // ------------------------------------

    department: {
      type: String,
      required: true,
      trim: true,
    },

    program: {
      type: String,
      required: true,
      trim: true,
    },

    batch: {
      type: String,
      trim: true,
      default: "",
    },

    semester: {
      type: String,
      required: true,
      trim: true,
    },

    section: {
      type: String,
      trim: true,
      default: "",
    },

    academicSession: {
      type: String,
      trim: true,
      default: "",
    },

    // ------------------------------------
    // ENROLLMENT INFORMATION
    // ------------------------------------

    enrolledAt: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator(value) {
          return (
            !value ||
            /^\d{4}-\d{2}-\d{2}$/.test(value)
          );
        },
        message:
          "Enrollment date must use YYYY-MM-DD format.",
      },
    },

    status: {
      type: String,
      enum: [
        "Active",
        "Inactive",
        "Graduated",
        "Suspended",
      ],
      default: "Active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ========================================
// INDEXES
// ========================================

// Unique indexes are declared through
// the studentId and email field options.

// Helpful for future Admin and HOD filters.

studentSchema.index({
  department: 1,
  status: 1,
});

studentSchema.index({
  batch: 1,
  semester: 1,
});

// ========================================
// MODEL EXPORT
// ========================================

module.exports =
  mongoose.models.Student ||
  mongoose.model("Student", studentSchema);
