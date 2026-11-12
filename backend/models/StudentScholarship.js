
const mongoose = require("mongoose");

const scholarshipSchema = new mongoose.Schema(
  {
    fee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentFee",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    studentId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      default: "",
    },
    semester: {
      type: String,
      default: "",
    },
    scholarshipType: {
      type: String,
      required: true,
    },
    scholarshipName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    applicationDate: {
      type: String,
      required: true,
    },
    tuitionAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    waiverType: {
      type: String,
      enum: ["Percentage", "Fixed Amount"],
      required: true,
    },
    waiverValue: {
      type: Number,
      required: true,
      min: 0.01,
    },
    approvedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "Approved",
        "Rejected",
        "Cancelled",
      ],
      default: "Pending",
    },
    approvedDate: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "studentscholarships",
  }
);

scholarshipSchema.index({ studentId: 1, status: 1 });
scholarshipSchema.index({ fee: 1, status: 1 });

module.exports =
  mongoose.models.StudentScholarship ||
  mongoose.model(
    "StudentScholarship",
    scholarshipSchema
  );
