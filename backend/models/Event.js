
const mongoose = require("mongoose");

// ========================================
// UNIBEE EVENT MODEL
// MONGOOSE 9 COMPATIBLE
// ========================================

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required."],
      trim: true,
      minlength: 5,
      maxlength: 180,
    },

    category: {
      type: String,
      enum: [
        "Academic",
        "Workshop",
        "Seminar",
        "Cultural",
        "Sports",
        "Career",
        "Competition",
        "Other",
      ],
      default: "Academic",
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },

    date: {
      type: String,
      required: [true, "Event date is required."],
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        "Date must use YYYY-MM-DD format.",
      ],
    },

    startTime: {
      type: String,
      required: [true, "Start time is required."],
      match: [
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "Invalid start time.",
      ],
    },

    endTime: {
      type: String,
      required: [true, "End time is required."],
      match: [
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "Invalid end time.",
      ],
    },

    venue: {
      type: String,
      required: [true, "Venue is required."],
      trim: true,
      maxlength: 200,
    },

    organizer: {
      type: String,
      required: [true, "Organizer is required."],
      trim: true,
      maxlength: 180,
    },

    audience: {
      type: String,
      enum: [
        "All",
        "Students",
        "Faculty",
        "Staff",
      ],
      default: "All",
    },

    capacity: {
      type: Number,
      required: [true, "Capacity is required."],
      min: 1,
      max: 100000,
      validate: {
        validator: Number.isInteger,
        message: "Capacity must be a whole number.",
      },
    },

    registrationDeadline: {
      type: Date,
      default: null,
    },

    registrationCount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Registration count must be a whole number.",
      },
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Published",
        "Cancelled",
        "Completed",
      ],
      default: "Draft",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Event creator is required."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ========================================
// DATABASE INDEXES
// ========================================

eventSchema.index({
  status: 1,
  date: 1,
});

eventSchema.index({
  category: 1,
  status: 1,
});

eventSchema.index({
  audience: 1,
  status: 1,
});

// ========================================
// VALIDATION — MONGOOSE 9
// ========================================

// Mongoose 9 middleware does not use
// the legacy next() callback.

eventSchema.pre("validate", function () {
  // End time must be later than start time.

  if (
    this.startTime &&
    this.endTime &&
    this.startTime >= this.endTime
  ) {
    this.invalidate(
      "endTime",
      "End time must be later than start time."
    );
  }

  // Registration count must not exceed capacity.

  if (
    this.registrationCount !== undefined &&
    this.capacity !== undefined &&
    this.registrationCount > this.capacity
  ) {
    this.invalidate(
      "capacity",
      "Capacity cannot be lower than existing registrations."
    );
  }

  // Validate registration deadline.

  if (
    this.registrationDeadline &&
    this.date &&
    this.startTime
  ) {
    // UniBee campus timezone: Asia/Dhaka (UTC+06:00).
    // Must match the timezone used in eventRoutes.js.

    const eventStart = new Date(
      `${this.date}T${this.startTime}:00+06:00`
    );

    const deadline = new Date(
      this.registrationDeadline
    );

    if (
      !Number.isNaN(eventStart.getTime()) &&
      !Number.isNaN(deadline.getTime()) &&
      deadline > eventStart
    ) {
      this.invalidate(
        "registrationDeadline",
        "Registration deadline cannot be after event start."
      );
    }
  }
});

// ========================================
// VIRTUAL: AVAILABLE SEATS
// ========================================

eventSchema.virtual("availableSeats").get(function () {
  return Math.max(
    0,
    Number(this.capacity || 0) -
      Number(this.registrationCount || 0)
  );
});

// ========================================
// JSON OUTPUT
// ========================================

eventSchema.set("toJSON", {
  virtuals: true,
});

eventSchema.set("toObject", {
  virtuals: true,
});

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.Event ||
  mongoose.model("Event", eventSchema);
