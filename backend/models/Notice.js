const mongoose = require("mongoose");

// ========================================
// UNIBEE NOTICE MODEL
// Cross-portal notice broadcast system
// ========================================

const NOTICE_CATEGORIES = [
  "Academic",
  "Examination",
  "Admission",
  "General",
  "Event",
  "Finance",
  "Emergency",
  "Library",
];

const NOTICE_AUDIENCES = [
  "All",
  "Students",
  "Faculty",
  "Admin",
];

const NOTICE_PRIORITIES = [
  "Low",
  "Normal",
  "High",
  "Urgent",
];

const NOTICE_STATUSES = [
  "Draft",
  "Published",
  "Archived",
];

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notice title is required."],
      trim: true,
      maxlength: 300,
    },

    content: {
      type: String,
      required: [true, "Notice content is required."],
      trim: true,
      maxlength: 10000,
    },

    category: {
      type: String,
      enum: NOTICE_CATEGORIES,
      default: "General",
    },

    audience: {
      type: String,
      enum: NOTICE_AUDIENCES,
      default: "All",
    },

    priority: {
      type: String,
      enum: NOTICE_PRIORITIES,
      default: "Normal",
    },

    status: {
      type: String,
      enum: NOTICE_STATUSES,
      default: "Published",
    },

    pinned: {
      type: Boolean,
      default: false,
    },

    author: {
      type: String,
      trim: true,
      default: "University Administration",
      maxlength: 150,
    },

    publishedAt: {
      type: Date,
      default: Date.now,
    },

    expiryDate: {
      type: String,
      trim: true,
      default: "",
    },

    department: {
      type: String,
      trim: true,
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

noticeSchema.index({
  status: 1,
  audience: 1,
  publishedAt: -1,
});

noticeSchema.index({
  pinned: -1,
  publishedAt: -1,
});

module.exports =
  mongoose.models.Notice ||
  mongoose.model("Notice", noticeSchema);
