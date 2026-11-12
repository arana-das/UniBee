const mongoose = require("mongoose");

// ========================================
// UNIBEE BOOK REQUEST MODEL
// Student library reservations and approvals
// ========================================

const bookRequestSchema = new mongoose.Schema(
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

    status: {
      type: String,
      enum: ["Pending", "Approved", "Issued", "Rejected", "Cancelled"],
      default: "Pending",
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    actionDate: {
      type: Date,
      default: null,
    },

    actionBy: {
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

bookRequestSchema.index({
  studentId: 1,
  status: 1,
});

bookRequestSchema.index({
  book: 1,
  status: 1,
});

module.exports =
  mongoose.models.BookRequest ||
  mongoose.model("BookRequest", bookRequestSchema);
