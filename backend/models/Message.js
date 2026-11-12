
const mongoose = require("mongoose");

// ========================================
// UNIBEE MESSAGE MODEL
// STUDENT ↔ FACULTY MESSAGING
// Compatible with Mongoose 9
// ========================================

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Message sender is required."],
      index: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Message receiver is required."],
      index: true,
    },

    text: {
      type: String,
      required: [true, "Message text is required."],
      trim: true,
      minlength: [1, "Message cannot be empty."],
      maxlength: [1000, "Message cannot exceed 1000 characters."],
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
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

messageSchema.index({
  sender: 1,
  receiver: 1,
  createdAt: -1,
});

messageSchema.index({
  receiver: 1,
  isRead: 1,
  createdAt: -1,
});

// ========================================
// VALIDATION
// ========================================

messageSchema.pre("validate", function () {
  if (
    this.sender &&
    this.receiver &&
    String(this.sender) === String(this.receiver)
  ) {
    this.invalidate(
      "receiver",
      "You cannot send a message to yourself."
    );
  }
});

// ========================================
// INSTANCE METHODS
// ========================================

messageSchema.methods.markAsRead = async function () {
  if (this.isRead) {
    return this;
  }

  this.isRead = true;
  this.readAt = new Date();

  await this.save();

  return this;
};

// ========================================
// JSON OUTPUT
// ========================================

messageSchema.set("toJSON", {
  virtuals: true,
});

messageSchema.set("toObject", {
  virtuals: true,
});

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.Message ||
  mongoose.model("Message", messageSchema);
