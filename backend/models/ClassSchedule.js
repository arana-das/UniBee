
const mongoose = require("mongoose");

// ========================================
// UNIBEE CLASS SCHEDULE MODEL
// HOD → FACULTY → STUDENT
// ========================================

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const TIME_PATTERN =
  /^([01]\d|2[0-3]):[0-5]\d$/;

const classScheduleSchema =
  new mongoose.Schema(
    {
      // ====================================
      // ACADEMIC INFORMATION
      // ====================================

      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: [
          true,
          "Course is required.",
        ],
        index: true,
      },

      faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Faculty",
        required: [
          true,
          "Faculty is required.",
        ],
        index: true,
      },

      department: {
        type: String,
        required: [
          true,
          "Department is required.",
        ],
        trim: true,
        maxlength: 150,
        index: true,
      },

      semester: {
        type: String,
        required: [
          true,
          "Semester is required.",
        ],
        trim: true,
        maxlength: 100,
      },

      section: {
        type: String,
        trim: true,
        default: "",
        maxlength: 60,
      },

      academicSession: {
        type: String,
        required: [
          true,
          "Academic session is required.",
        ],
        trim: true,
        maxlength: 80,
      },

      // ====================================
      // WEEKLY CLASS INFORMATION
      // ====================================

      day: {
        type: String,
        enum: DAYS,
        required: [
          true,
          "Class day is required.",
        ],
      },

      startTime: {
        type: String,
        required: [
          true,
          "Start time is required.",
        ],
        match: [
          TIME_PATTERN,
          "Start time must be HH:mm.",
        ],
      },

      endTime: {
        type: String,
        required: [
          true,
          "End time is required.",
        ],
        match: [
          TIME_PATTERN,
          "End time must be HH:mm.",
        ],
      },

      room: {
        type: String,
        required: [
          true,
          "Classroom is required.",
        ],
        trim: true,
        maxlength: 80,
      },

      notes: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1000,
      },

      // ====================================
      // SCHEDULE STATUS
      // ====================================

      status: {
        type: String,
        enum: [
          "Active",
          "Cancelled",
        ],
        default: "Active",
        required: true,
      },

      // ====================================
      // CREATED / UPDATED BY
      // ====================================

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "Creator is required.",
        ],
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
    }
  );

// ========================================
// VALIDATE CLASS TIME
// ========================================

classScheduleSchema.pre(
  "validate",
  function () {
    if (
      this.startTime &&
      this.endTime &&
      TIME_PATTERN.test(this.startTime) &&
      TIME_PATTERN.test(this.endTime) &&
      this.startTime >= this.endTime
    ) {
      this.invalidate(
        "endTime",
        "End time must be later than start time."
      );
    }
  }
);

// ========================================
// DATABASE INDEXES
// ========================================

// HOD department schedule
classScheduleSchema.index({
  department: 1,
  academicSession: 1,
  day: 1,
  startTime: 1,
});

// Faculty weekly schedule
classScheduleSchema.index({
  faculty: 1,
  status: 1,
  day: 1,
  startTime: 1,
});

// Student course schedule
classScheduleSchema.index({
  course: 1,
  semester: 1,
  status: 1,
});

// Room conflict lookup
classScheduleSchema.index({
  academicSession: 1,
  day: 1,
  room: 1,
  status: 1,
});

// ========================================
// OUTPUT SETTINGS
// ========================================

classScheduleSchema.set("toJSON", {
  virtuals: true,
});

classScheduleSchema.set("toObject", {
  virtuals: true,
});

// ========================================
// EXPORT MODEL
// ========================================

module.exports =
  mongoose.models.ClassSchedule ||
  mongoose.model(
    "ClassSchedule",
    classScheduleSchema
  );
