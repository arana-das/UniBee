
const mongoose = require("mongoose");

// ========================================
// UNIBEE ACADEMIC APPROVAL MODEL
// ========================================

const academicApprovalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "Course Registration",
        "Course Withdrawal",
        "Section Change",
        "Academic Leave",
        "Attendance Review",
        "Result Recheck",
        "Research Permission",
        "Faculty Academic Request",
        "Other",
      ],
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    requesterName: {
      type: String,
      required: true,
      trim: true,
    },

    requesterId: {
      type: String,
      required: true,
      trim: true,
    },

    requesterRole: {
      type: String,
      enum: ["Student", "Faculty"],
      required: true,
    },

    requesterUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    reviewNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    source: {
      type: String,
      enum: ["Student", "Faculty", "HOD Test"],
      default: "HOD Test",
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

academicApprovalSchema.index({
  department: 1,
  status: 1,
  createdAt: -1,
});

academicApprovalSchema.index({
  requesterUser: 1,
  createdAt: -1,
});

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.AcademicApproval ||
  mongoose.model(
    "AcademicApproval",
    academicApprovalSchema
  );
