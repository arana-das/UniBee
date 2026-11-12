
const mongoose = require("mongoose");

// ========================================
// UNIBEE LIBRARY ANNOUNCEMENT MODEL
// ========================================

const libraryAnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required."],
      trim: true,
      maxlength: 180,
    },

    category: {
      type: String,
      enum: [
        "New Book Arrival",
        "Book Availability",
        "Library Notice",
        "Borrowing Rules",
        "Return Reminder",
        "Library Hours",
        "Library Event",
        "Other",
      ],
      default: "Library Notice",
    },

    audience: {
      type: String,
      enum: [
        "All Students",
        "Students & Faculty",
        "Faculty Only",
        "Everyone",
      ],
      default: "All Students",
    },

    content: {
      type: String,
      required: [true, "Announcement content is required."],
      trim: true,
      maxlength: 6000,
    },

    publishDate: {
      type: String,
      default: "",
      match: [/^$|^\d{4}-\d{2}-\d{2}$/, "Invalid publish date."],
    },

    expiryDate: {
      type: String,
      default: "",
      match: [/^$|^\d{4}-\d{2}-\d{2}$/, "Invalid expiry date."],
    },

    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Urgent"],
      default: "Normal",
    },

    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
    },

    featured: {
      type: Boolean,
      default: false,
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
    collection: "libraryannouncements",
  }
);

libraryAnnouncementSchema.index({
  status: 1,
  audience: 1,
  publishDate: 1,
  expiryDate: 1,
});

module.exports =
  mongoose.models.LibraryAnnouncement ||
  mongoose.model(
    "LibraryAnnouncement",
    libraryAnnouncementSchema
  );
