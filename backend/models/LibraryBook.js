
const mongoose = require("mongoose");

// ========================================
// UNIBEE LIBRARY BOOK MODEL
// ========================================

const libraryBookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book title is required."],
      trim: true,
      maxlength: 250,
    },

    author: {
      type: String,
      required: [true, "Author is required."],
      trim: true,
      maxlength: 200,
    },

    isbn: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      required: true,
      trim: true,
      default: "General",
    },

    publisher: {
      type: String,
      trim: true,
      default: "",
    },

    edition: {
      type: String,
      trim: true,
      default: "",
    },

    year: {
      type: String,
      trim: true,
      default: "",
    },

    shelf: {
      type: String,
      trim: true,
      default: "",
    },

    copies: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Copies must be a whole number.",
      },
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
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

libraryBookSchema.index({
  title: 1,
  author: 1,
});

libraryBookSchema.index({
  category: 1,
  status: 1,
});

libraryBookSchema.index({
  isbn: 1,
});

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.LibraryBook ||
  mongoose.model(
    "LibraryBook",
    libraryBookSchema
  );
