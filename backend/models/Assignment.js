
const mongoose = require("mongoose");

// ========================================
// UNIBEE ASSIGNMENT MODEL
// MONGOOSE 9 COMPATIBLE
// ========================================

const assignmentSchema = new mongoose.Schema(
  {
    // Academic Course
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [
        true,
        "Course is required.",
      ],
      index: true,
    },

    // Semester Snapshot
    semester: {
      type: String,
      required: [
        true,
        "Semester is required.",
      ],
      trim: true,
      maxlength: 100,
    },

    // Assigned Faculty Profile
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: [
        true,
        "Faculty profile is required.",
      ],
      index: true,
    },

    // Authenticated Faculty Account
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "Creator is required.",
      ],
    },

    // Assignment Information
    title: {
      type: String,
      required: [
        true,
        "Assignment title is required.",
      ],
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      required: [
        true,
        "Assignment description is required.",
      ],
      trim: true,
      maxlength: 10000,
    },

    // Date-only deadline:
    // YYYY-MM-DD
    deadline: {
      type: String,
      required: [
        true,
        "Assignment deadline is required.",
      ],
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        "Deadline must use YYYY-MM-DD.",
      ],
    },

    marks: {
      type: Number,
      required: [
        true,
        "Total marks are required.",
      ],
      min: [
        1,
        "Marks must be at least 1.",
      ],
      max: [
        1000,
        "Marks cannot exceed 1000.",
      ],
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Published",
        "Closed",
      ],
      default: "Draft",
      required: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
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
// INDEXES
// ========================================

// Faculty's assignment list
assignmentSchema.index({
  faculty: 1,
  createdAt: -1,
});

// Student's published assignments
assignmentSchema.index({
  course: 1,
  semester: 1,
  status: 1,
  deadline: 1,
});

// ========================================
// DATE VALIDATION
// ========================================

assignmentSchema.pre(
  "validate",
  function () {
    if (!this.deadline) return;

    const parsed = new Date(
      `${this.deadline}T00:00:00.000Z`
    );

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !==
        this.deadline
    ) {
      this.invalidate(
        "deadline",
        "Invalid assignment deadline."
      );
    }
  }
);

// ========================================
// JSON SETTINGS
// ========================================

assignmentSchema.set("toJSON", {
  virtuals: true,
});

assignmentSchema.set("toObject", {
  virtuals: true,
});

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.Assignment ||
  mongoose.model(
    "Assignment",
    assignmentSchema
  );
