
const mongoose = require("mongoose");

// ========================================
// UNIBEE ENROLLMENT MODEL
// ========================================

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    semester: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Rejected",
        "Dropped",
      ],
      default: "Pending",
      required: true,
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ========================================
// DUPLICATE ENROLLMENT PROTECTION
// ========================================

// A student can have only one active enrollment
// for the same course and semester.
//
// Rejected and Dropped records remain in history
// without blocking a new enrollment request.

enrollmentSchema.index(
  {
    student: 1,
    course: 1,
    semester: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ["Pending", "Approved"],
      },
    },
    name: "unique_active_student_course_semester",
  }
);

// ========================================
// QUERY INDEXES
// ========================================

enrollmentSchema.index({
  status: 1,
  createdAt: -1,
});

enrollmentSchema.index({
  course: 1,
  status: 1,
});

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.Enrollment ||
  mongoose.model(
    "Enrollment",
    enrollmentSchema
  );
