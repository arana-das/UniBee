
const mongoose = require("mongoose");

const examinationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // Link to existing MongoDB Course
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    // Course information snapshot
    courseCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    semester: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "Midterm",
        "Final",
        "Quiz",
        "Practical",
        "Viva",
        "Supplementary",
      ],
      required: true,
    },

    date: {
      type: String,
      required: true,
      validate: {
        validator(value) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
          }

          const parsed = new Date(`${value}T00:00:00Z`);

          return (
            !Number.isNaN(parsed.getTime()) &&
            parsed.toISOString().slice(0, 10) === value
          );
        },
        message: "Date must use YYYY-MM-DD format.",
      },
    },

    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid start time."],
    },

    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid end time."],
    },

    room: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },

    invigilator: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    marks: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },

    status: {
      type: String,
      enum: [
        "Scheduled",
        "Completed",
        "Postponed",
        "Cancelled",
      ],
      default: "Scheduled",
    },

    instructions: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ========================================
// VALIDATION
// ========================================

examinationSchema.pre("validate", function () {
  if (
    this.startTime &&
    this.endTime &&
    this.endTime <= this.startTime
  ) {
    this.invalidate(
      "endTime",
      "End time must be after start time."
    );
  }
});

// ========================================
// INDEXES
// ========================================

examinationSchema.index({
  date: 1,
  room: 1,
  status: 1,
});

examinationSchema.index({
  course: 1,
  semester: 1,
  date: 1,
});

examinationSchema.index({
  status: 1,
  date: 1,
});

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.Examination ||
  mongoose.model("Examination", examinationSchema);
