
const mongoose = require("mongoose");

// ========================================
// UNIBEE ATTENDANCE MODEL
// MONGOOSE 9 COMPATIBLE
// ========================================

const attendanceEntrySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "Present",
        "Absent",
        "Late",
        "Excused",
      ],
      required: true,
    },
  },
  {
    _id: false,
  }
);

const attendanceSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    semester: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: String,
      required: true,
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        "Date must use YYYY-MM-DD format.",
      ],
    },

    // Authenticated Faculty User ID.
    // The API must verify that this User
    // owns the assigned Faculty profile.

    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    students: {
      type: [attendanceEntrySchema],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ========================================
// UNIQUE ATTENDANCE SESSION
// ========================================

// One attendance session per
// course + semester + class date.

attendanceSchema.index(
  {
    course: 1,
    semester: 1,
    date: 1,
  },
  {
    unique: true,
    name: "unique_course_semester_date",
  }
);

// ========================================
// QUERY INDEXES
// ========================================

attendanceSchema.index({
  faculty: 1,
  date: -1,
});

attendanceSchema.index({
  "students.student": 1,
  date: -1,
});

// ========================================
// VALIDATION
// ========================================

attendanceSchema.pre("validate", function () {
  if (this.date) {
    const parsed = new Date(
      `${this.date}T00:00:00Z`
    );

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !==
        this.date
    ) {
      this.invalidate(
        "date",
        "Invalid class date."
      );
    }
  }

  const ids = this.students.map(
    (item) => String(item.student)
  );

  if (ids.length !== new Set(ids).size) {
    this.invalidate(
      "students",
      "Duplicate students are not allowed."
    );
  }
});

// ========================================
// ATTENDANCE SUMMARY
// ========================================

attendanceSchema.virtual("summary").get(
  function () {
    const counts = {
      Present: 0,
      Absent: 0,
      Late: 0,
      Excused: 0,
    };

    for (const item of this.students) {
      if (
        Object.prototype.hasOwnProperty.call(
          counts,
          item.status
        )
      ) {
        counts[item.status] += 1;
      }
    }

    const total = this.students.length;

    const attended =
      counts.Present + counts.Late;

    return {
      total,
      ...counts,
      attended,
      attendanceRate:
        total > 0
          ? Math.round(
              (attended / total) * 100
            )
          : 0,
    };
  }
);

// ========================================
// JSON SETTINGS
// ========================================

attendanceSchema.set("toJSON", {
  virtuals: true,
});

attendanceSchema.set("toObject", {
  virtuals: true,
});

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.Attendance ||
  mongoose.model(
    "Attendance",
    attendanceSchema
  );
