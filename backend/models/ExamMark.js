
const mongoose = require("mongoose");

// ========================================
// UNIBEE EXAMINATION MARKS MODEL
// ========================================

const COMPONENT_KEYS = [
  "attendance",
  "assignment",
  "midterm",
  "final",
];

const marksComponentSchema = new mongoose.Schema(
  {
    attendance: {
      type: Number,
      min: 0,
      default: 0,
    },
    assignment: {
      type: Number,
      min: 0,
      default: 0,
    },
    midterm: {
      type: Number,
      min: 0,
      default: 0,
    },
    final: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const maximumMarksSchema = new mongoose.Schema(
  {
    attendance: {
      type: Number,
      min: 0,
      default: 10,
    },
    assignment: {
      type: Number,
      min: 0,
      default: 10,
    },
    midterm: {
      type: Number,
      min: 0,
      default: 30,
    },
    final: {
      type: Number,
      min: 0,
      default: 50,
    },
  },
  { _id: false }
);

// ========================================
// MAIN SCHEMA
// ========================================

const examMarkSchema = new mongoose.Schema(
  {
    examination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Examination",
      required: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    studentId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    courseCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    componentMarks: {
      type: marksComponentSchema,
      default: () => ({}),
    },

    maximumMarks: {
      type: maximumMarksSchema,
      default: () => ({}),
    },

    totalObtained: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalMaximum: {
      type: Number,
      min: 0,
      default: 100,
    },

    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    grade: {
      type: String,
      trim: true,
      default: "",
    },

    gradePoint: {
      type: Number,
      min: 0,
      max: 4,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Submitted",
        "Under Review",
        "Verified",
        "Approved",
        "Returned",
      ],
      default: "Draft",
      index: true,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    reviewNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdBy: {
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
// PREVENT DUPLICATE MARKS
// One student per examination
// ========================================

examMarkSchema.index(
  {
    examination: 1,
    student: 1,
  },
  {
    unique: true,
  }
);

// ========================================
// INDEXES
// ========================================

examMarkSchema.index({
  examination: 1,
  status: 1,
});

examMarkSchema.index({
  course: 1,
  status: 1,
});

// ========================================
// AUTOMATIC TOTAL CALCULATION
// ========================================

examMarkSchema.pre("validate", function () {
  let obtained = 0;
  let maximum = 0;

  for (const key of COMPONENT_KEYS) {
    const mark = Number(
      this.componentMarks?.[key] ?? 0
    );

    const maxMark = Number(
      this.maximumMarks?.[key] ?? 0
    );

    if (
      !Number.isFinite(mark) ||
      !Number.isFinite(maxMark) ||
      mark < 0 ||
      maxMark < 0 ||
      mark > maxMark
    ) {
      throw new Error(
        `Invalid marks for ${key}.`
      );
    }

    obtained += mark;
    maximum += maxMark;
  }

  if (maximum <= 0) {
    throw new Error(
      "Total maximum marks must be greater than zero."
    );
  }

  this.totalObtained = Number(
    obtained.toFixed(2)
  );

  this.totalMaximum = Number(
    maximum.toFixed(2)
  );

  this.percentage = Number(
    ((obtained / maximum) * 100).toFixed(2)
  );

  const percentage = this.percentage;

  const scale = [
    [80, "A+", 4.0],
    [75, "A", 3.75],
    [70, "A-", 3.5],
    [65, "B+", 3.25],
    [60, "B", 3.0],
    [55, "B-", 2.75],
    [50, "C+", 2.5],
    [45, "C", 2.25],
    [40, "D", 2.0],
    [0, "F", 0.0],
  ];

  const matched = scale.find(
    ([minimum]) => percentage >= minimum
  );

  this.grade = matched[1];
  this.gradePoint = matched[2];

  if (
    this.isModified("componentMarks") ||
    this.isModified("maximumMarks")
  ) {
    if (this.status === "Approved") {
      this.status = "Draft";
      this.approvedAt = null;
      this.approvedBy = null;
    }
  }
});

// ========================================
// EXPORT MODEL
// ========================================

module.exports =
  mongoose.models.ExamMark ||
  mongoose.model("ExamMark", examMarkSchema);
