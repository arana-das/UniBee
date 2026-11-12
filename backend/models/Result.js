
const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    examination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Examination",
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
      trim: true,
      uppercase: true,
    },

    courseCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    obtainedMarks: {
      type: Number,
      required: true,
      min: 0,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 1,
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

    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    status: {
  type: String,
  enum: ["Draft", "Published", "Withheld"],
  default: "Draft",
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

// One result per student per examination.
resultSchema.index(
  {
    student: 1,
    examination: 1,
  },
  {
    unique: true,
  }
);

resultSchema.index({
  status: 1,
  student: 1,
});

resultSchema.index({
  course: 1,
  examination: 1,
});

module.exports =
  mongoose.models.Result ||
  mongoose.model("Result", resultSchema);
