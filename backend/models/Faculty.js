
const mongoose = require("mongoose");

// ========================================
// UNIBEE FACULTY MODEL
// Based on existing AdminFaculty.jsx
// ========================================

const facultySchema = new mongoose.Schema(
  {
    facultyId: {
      type: String,
      required: [true, "Faculty ID is required."],
      unique: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Faculty name is required."],
      trim: true,
      maxlength: 150,
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Enter a valid email address.",
      ],
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    designation: {
      type: String,
      required: true,
      enum: [
        "Professor",
        "Associate Professor",
        "Assistant Professor",
        "Lecturer",
        "Adjunct Faculty",
      ],
    },

    qualification: {
      type: String,
      trim: true,
      default: "",
    },

    specialization: {
      type: String,
      trim: true,
      default: "",
    },

    experience: {
      type: Number,
      default: 0,
      min: 0,
      max: 70,
    },

    office: {
      type: String,
      trim: true,
      default: "",
    },

    joiningDate: {
      type: String,
      default: "",
      validate: {
        validator(value) {
          return (
            !value ||
            /^\d{4}-\d{2}-\d{2}$/.test(value)
          );
        },
        message:
          "Joining date must use YYYY-MM-DD.",
      },
    },

    status: {
      type: String,
      enum: [
        "Active",
        "On Leave",
        "Inactive",
      ],
      default: "Active",
    },
    
     
    // Faculty-managed profile information
    avatar: {
      type: String,
      default: "",
      maxlength: 85000,
    },

    officeHours: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },

    biography: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    teachingInterests: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    researchAreas: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    website: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },


    // Future link to the authenticated
    // Faculty account in the users collection.
    userId: {
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
// FILTERING INDEXES
// ========================================

facultySchema.index({
  department: 1,
  status: 1,
});

facultySchema.index({
  designation: 1,
});

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.Faculty ||
  mongoose.model("Faculty", facultySchema);
