
const mongoose = require("mongoose");

// ==========================================
// UNIBEE — COURSE ASSESSMENT MARKS MODEL
// Exam Controller Managed Assessments
// ==========================================

const ASSESSMENT_TYPES = [
  "Quiz",
  "Class Test",
  "Midterm",
  "Final",
  "Attendance",
  "Other",
];

const ASSESSMENT_STATUSES = [
  "Draft",
  "Published",
];

// ==========================================
// MAIN SCHEMA
// ==========================================

const courseAssessmentMarkSchema =
  new mongoose.Schema(
    {
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        index: true,
      },

      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
        index: true,
      },

      semester: {
        type: String,
        required: true,
        trim: true,
      },

      assessmentType: {
        type: String,
        enum: ASSESSMENT_TYPES,
        required: true,
      },

      assessmentName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      assessmentDate: {
        type: Date,
        default: null,
      },

      obtainedMarks: {
        type: Number,
        required: true,
        min: 0,
      },

      maximumMarks: {
        type: Number,
        required: true,
        min: 0.01,
      },

      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      status: {
        type: String,
        enum: ASSESSMENT_STATUSES,
        default: "Draft",
        index: true,
      },

      remarks: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      publishedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

// ==========================================
// AUTOMATIC MARKS VALIDATION
// ==========================================

courseAssessmentMarkSchema.pre(
  "validate",
  function () {
    const obtained = Number(
      this.obtainedMarks
    );

    const maximum = Number(
      this.maximumMarks
    );

    if (
      !Number.isFinite(obtained) ||
      !Number.isFinite(maximum) ||
      obtained < 0 ||
      maximum <= 0 ||
      obtained > maximum
    ) {
      this.invalidate(
        "obtainedMarks",
        "Obtained marks must be between 0 and maximum marks."
      );
      return;
    }

    this.percentage = Number(
      (
        (obtained / maximum) *
        100
      ).toFixed(2)
    );
  }
);

// ==========================================
// PREVENT DUPLICATE ASSESSMENTS
// ==========================================

// One marks record per student, course,
// semester, assessment type and name.

courseAssessmentMarkSchema.index(
  {
    course: 1,
    student: 1,
    semester: 1,
    assessmentType: 1,
    assessmentName: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// STUDENT PUBLISHED MARKS QUERY INDEX
// ==========================================

courseAssessmentMarkSchema.index({
  student: 1,
  course: 1,
  semester: 1,
  status: 1,
});

// ==========================================
// EXPORT
// ==========================================

module.exports =
  mongoose.models.CourseAssessmentMark ||
  mongoose.model(
    "CourseAssessmentMark",
    courseAssessmentMarkSchema
  );
