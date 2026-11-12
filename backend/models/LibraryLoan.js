const mongoose = require("mongoose");

// ========================================
// UNIBEE LIBRARY LOAN MODEL
// Tracks book circulation between Library & Students
// ========================================

const libraryLoanSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LibraryBook",
      required: [true, "Book reference is required."],
    },

    bookTitle: {
      type: String,
      required: [true, "Book title is required."],
      trim: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },

    studentId: {
      type: String,
      required: [true, "Student ID is required."],
      trim: true,
      uppercase: true,
    },

    studentName: {
      type: String,
      required: [true, "Student name is required."],
      trim: true,
    },

    studentEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    issueDate: {
      type: String,
      required: [true, "Issue date is required (YYYY-MM-DD)."],
      trim: true,
    },

    dueDate: {
      type: String,
      required: [true, "Due date is required (YYYY-MM-DD)."],
      trim: true,
    },

    returnDate: {
      type: String,
      default: null,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Borrowed", "Returned", "Overdue"],
      default: "Borrowed",
    },

    fine: {
      type: Number,
      default: 0,
      min: 0,
    },

    fineStatus: {
      type: String,
      enum: ["None", "Pending", "Paid"],
      default: "None",
    },

    renewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

libraryLoanSchema.index({
  studentId: 1,
  status: 1,
});

libraryLoanSchema.index({
  book: 1,
  status: 1,
});

module.exports =
  mongoose.models.LibraryLoan ||
  mongoose.model("LibraryLoan", libraryLoanSchema);
