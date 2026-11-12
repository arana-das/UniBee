
const mongoose = require("mongoose");

// ========================================
// UNIBEE SEAT PLAN MODEL
// ========================================

const batchSchema = new mongoose.Schema(
  {
    batch: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    students: {
      type: Number,
      required: true,
      min: 1,
    },
    startId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 70,
    },
    endId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 70,
    },
  },
  { _id: false }
);

const seatPlanSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    building: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },
    examDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    session: {
      type: String,
      required: true,
      enum: [
        "Morning",
        "Afternoon",
        "Evening",
      ],
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 10000,
    },
    batches: {
      type: [batchSchema],
      validate: [
        (value) => value.length > 0,
        "At least one batch is required.",
      ],
    },
    total: {
      type: Number,
      required: true,
      min: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// A room can have only one plan per session.
seatPlanSchema.index(
  {
    building: 1,
    room: 1,
    examDate: 1,
    session: 1,
  },
  { unique: true }
);

seatPlanSchema.index({
  examDate: 1,
  session: 1,
});

module.exports =
  mongoose.models.SeatPlan ||
  mongoose.model("SeatPlan", seatPlanSchema);
