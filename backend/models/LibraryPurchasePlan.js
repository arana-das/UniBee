
const mongoose = require("mongoose");

// ========================================
// UNIBEE LIBRARY PURCHASE PLAN MODEL
// ========================================

const purchasePlanSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LibraryBook",
      default: null,
    },

    bookId: {
      type: String,
      trim: true,
      default: "",
    },

    bookTitle: {
      type: String,
      required: [true, "Book title is required."],
      trim: true,
      maxlength: 200,
    },

    requiredCopies: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Required copies must be a whole number.",
      },
    },

    unitPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: [
        "Planned",
        "Requested",
        "Approved",
        "Ordered",
        "Received",
        "Cancelled",
      ],
      default: "Planned",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "librarypurchaseplans",
  }
);

purchasePlanSchema.index({
  status: 1,
  priority: 1,
});

module.exports =
  mongoose.models.LibraryPurchasePlan ||
  mongoose.model("LibraryPurchasePlan", purchasePlanSchema);
