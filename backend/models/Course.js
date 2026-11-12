
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    courseTitle: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    credits: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },

    semester: {
      type: String,
      required: true,
      trim: true,
    },

    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },

    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],

    description: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

courseSchema.index({
  department: 1,
  semester: 1,
});

courseSchema.index({
  faculty: 1,
});

module.exports =
  mongoose.models.Course ||
  mongoose.model(
    "Course",
    courseSchema
  );
