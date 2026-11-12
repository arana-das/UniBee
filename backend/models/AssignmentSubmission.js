
const mongoose = require("mongoose");

// ========================================
// UNIBEE ASSIGNMENT SUBMISSION MODEL
// MONGOOSE 9 COMPATIBLE
// ========================================

const assignmentSubmissionSchema =
  new mongoose.Schema(
    {
      // ====================================
      // ASSIGNMENT REFERENCE
      // ====================================

      assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assignment",
        required: [
          true,
          "Assignment is required.",
        ],
        index: true,
      },

      // ====================================
      // STUDENT PROFILE
      // ====================================

      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: [
          true,
          "Student is required.",
        ],
        index: true,
      },

      // ====================================
      // SUBMISSION CONTENT
      // ====================================

      submissionText: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          20000,
          "Submission text cannot exceed 20000 characters.",
        ],
      },

      // Optional external document link.
      // Actual file uploads can be added
      // later using a secure upload service.

      submissionUrl: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          2048,
          "Submission URL is too long.",
        ],
        validate: {
          validator(value) {
            if (!value) return true;

            try {
              const url = new URL(value);

              return [
                "http:",
                "https:",
              ].includes(url.protocol);
            } catch {
              return false;
            }
          },
          message:
            "Submission URL must be a valid HTTP or HTTPS link.",
        },
      },

      // ====================================
      // SUBMISSION STATUS
      // ====================================

      status: {
        type: String,
        enum: [
          "Submitted",
          "Graded",
        ],
        default: "Submitted",
        required: true,
      },

      submittedAt: {
        type: Date,
        default: Date.now,
      },

      isLate: {
        type: Boolean,
        default: false,
      },

      // ====================================
      // FACULTY GRADING
      // ====================================

      obtainedMarks: {
        type: Number,
        default: null,
        min: [
          0,
          "Obtained marks cannot be negative.",
        ],
      },

      feedback: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          5000,
          "Feedback cannot exceed 5000 characters.",
        ],
      },

      gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      gradedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

// ========================================
// DUPLICATE SUBMISSION PROTECTION
// ========================================

// One student can have only one
// submission per assignment.
//
// Resubmission, if permitted by the API,
// updates the existing document.

assignmentSubmissionSchema.index(
  {
    assignment: 1,
    student: 1,
  },
  {
    unique: true,
    name: "unique_assignment_student",
  }
);

// ========================================
// FACULTY REVIEW INDEX
// ========================================

assignmentSubmissionSchema.index({
  assignment: 1,
  status: 1,
  submittedAt: -1,
});

// ========================================
// STUDENT HISTORY INDEX
// ========================================

assignmentSubmissionSchema.index({
  student: 1,
  submittedAt: -1,
});

// ========================================
// DOCUMENT VALIDATION
// ========================================

assignmentSubmissionSchema.pre(
  "validate",
  function () {
    // A submission must contain
    // text, a document URL, or both.

    const hasText = Boolean(
      this.submissionText?.trim()
    );

    const hasUrl = Boolean(
      this.submissionUrl?.trim()
    );

    if (!hasText && !hasUrl) {
      this.invalidate(
        "submissionText",
        "Provide submission text or a document link."
      );
    }

    // Graded submissions must have
    // a valid numeric mark.

    if (this.status === "Graded") {
      if (
        this.obtainedMarks === null ||
        this.obtainedMarks === undefined ||
        !Number.isFinite(
          this.obtainedMarks
        )
      ) {
        this.invalidate(
          "obtainedMarks",
          "Graded submissions require valid marks."
        );
      }

      if (!this.gradedBy) {
        this.invalidate(
          "gradedBy",
          "Grading Faculty is required."
        );
      }

      if (!this.gradedAt) {
        this.invalidate(
          "gradedAt",
          "Grading date is required."
        );
      }
    }

    // Submitted status must not retain
    // previously assigned grades.

    if (this.status === "Submitted") {
      this.obtainedMarks = null;
      this.feedback = "";
      this.gradedBy = null;
      this.gradedAt = null;
    }
  }
);

// ========================================
// JSON SETTINGS
// ========================================

assignmentSubmissionSchema.set("toJSON", {
  virtuals: true,
});

assignmentSubmissionSchema.set("toObject", {
  virtuals: true,
});

// ========================================
// EXPORT
// ========================================

module.exports =
  mongoose.models.AssignmentSubmission ||
  mongoose.model(
    "AssignmentSubmission",
    assignmentSubmissionSchema
  );
