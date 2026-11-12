
const mongoose = require("mongoose");

// ========================================
// UNIBEE EVENT REGISTRATION MODEL
// ========================================

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event is required."],
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required."],
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User account is required."],
    },

    status: {
      type: String,
      enum: ["Registered", "Cancelled"],
      default: "Registered",
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },

    cancelledAt: {
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
// PREVENT DUPLICATE REGISTRATION
// ========================================

// One registration record per student per event.
// If the student cancels, the same record can
// later be reactivated by the registration API.

eventRegistrationSchema.index(
  {
    event: 1,
    student: 1,
  },
  {
    unique: true,
  }
);

// ========================================
// QUERY INDEXES
// ========================================

eventRegistrationSchema.index({
  student: 1,
  status: 1,
});

eventRegistrationSchema.index({
  event: 1,
  status: 1,
});

// ========================================
// VALIDATION
// ========================================

eventRegistrationSchema.pre("validate", function () {
  if (this.status === "Registered") {
    this.cancelledAt = null;

    if (!this.registeredAt) {
      this.registeredAt = new Date();
    }
  }

  if (this.status === "Cancelled") {
    if (!this.cancelledAt) {
      this.cancelledAt = new Date();
    }
  }
});

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.EventRegistration ||
  mongoose.model(
    "EventRegistration",
    eventRegistrationSchema
  );
