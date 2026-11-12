
const express = require("express");
const mongoose = require("mongoose");

const ExamMark = require("../models/ExamMark");
const Examination = require("../models/Examination");
const Student = require("../models/Student");
const Result = require("../models/Result");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// AUTHENTICATION
// ========================================

// Only Exam Controller manages official marks.
router.use(protect);
router.use(authorize("exam-controller"));

// ========================================
// CONFIGURATION
// ========================================

const COMPONENTS = [
  "attendance",
  "assignment",
  "midterm",
  "final",
];

const STATUSES = [
  "Draft",
  "Submitted",
  "Under Review",
  "Verified",
  "Approved",
  "Returned",
];

// Allowed workflow transitions.
const TRANSITIONS = {
  Draft: ["Submitted"],
  Submitted: ["Under Review", "Returned"],
  "Under Review": ["Verified", "Returned"],
  Verified: ["Approved", "Returned"],
  Approved: [],
  Returned: ["Submitted"],
};

const validId = (value) =>
  mongoose.isValidObjectId(value);

// ========================================
// ERROR HANDLER
// ========================================

function handleError(res, error) {
  console.error("Exam Marks API:", error.message);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "Marks already exist for this student and examination.",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError" ||
    error.message?.startsWith("Invalid marks") ||
    error.message?.includes("maximum marks")
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Unable to process examination marks.",
  });
}

// ========================================
// POPULATE RELATED DATA
// ========================================

function populateMark(query) {
  return query
    .populate(
      "student",
      "studentId fullName email department program semester"
    )
    .populate(
      "examination",
      "title type date marks status semester courseCode"
    )
    .populate(
      "course",
      "courseCode courseTitle semester credits department"
    );
}

function formatMark(mark) {
  const data =
    typeof mark.toObject === "function"
      ? mark.toObject()
      : mark;

  return {
    ...data,
    id: String(data._id),
    examinationId: String(
      data.examination?._id || data.examination
    ),
    studentMongoId: String(
      data.student?._id || data.student
    ),
    courseId: String(
      data.course?._id || data.course
    ),
  };
}

// ========================================
// STUDENT LOOKUP
// ========================================

async function findStudent(reference) {
  if (!reference) return null;

  const value = String(reference).trim();

  if (validId(value)) {
    return Student.findById(value);
  }

  return Student.findOne({
    studentId: value.toUpperCase(),
  });
}

// ========================================
// EXAMINATION LOOKUP
// ========================================

async function findExamination(examinationId) {
  if (!validId(examinationId)) return null;

  return Examination.findById(examinationId);
}

// ========================================
// COMPONENT MARKS VALIDATION
// ========================================

function normalizedComponents(input, defaults = {}) {
  if (
    input !== undefined &&
    (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    )
  ) {
    throw new Error("Invalid marks component data.");
  }

  const values = { ...defaults };

  for (const key of COMPONENTS) {
    if (
      input &&
      Object.prototype.hasOwnProperty.call(
        input,
        key
      )
    ) {
      const value = Number(input[key]);

      if (
        input[key] === "" ||
        input[key] === null ||
        !Number.isFinite(value) ||
        value < 0
      ) {
        throw new Error(
          `Invalid marks for ${key}.`
        );
      }

      values[key] = value;
    }
  }

  return Object.fromEntries(
    COMPONENTS.map((key) => [
      key,
      Number(values[key] ?? 0),
    ])
  );
}

function sumComponents(values) {
  return COMPONENTS.reduce(
    (sum, key) => sum + Number(values[key] || 0),
    0
  );
}

function validateMarks(marks, maximum, examTotal) {
  const totalMarks = Number(examTotal);

  if (
    !Number.isFinite(totalMarks) ||
    totalMarks <= 0
  ) {
    throw new Error(
      "Invalid examination maximum marks."
    );
  }

  for (const key of COMPONENTS) {
    if (marks[key] > maximum[key]) {
      throw new Error(
        `Invalid marks for ${key}: obtained marks exceed maximum marks.`
      );
    }
  }

  const maximumTotal = sumComponents(maximum);

  if (
    Math.abs(maximumTotal - totalMarks) > 0.001
  ) {
    throw new Error(
      `Total maximum marks must equal examination marks (${totalMarks}).`
    );
  }
}

// ========================================
// GET ALL MARKS
// GET /api/exam-marks
// ========================================

router.get("/", async (req, res) => {
  try {
    const {
      examinationId,
      studentId,
      status,
    } = req.query;

    const query = {};

    if (examinationId) {
      if (!validId(examinationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Examination ID.",
        });
      }

      query.examination = examinationId;
    }

    if (studentId) {
      query.studentId = String(studentId)
        .trim()
        .toUpperCase();
    }

    if (status && status !== "All") {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid marks status.",
        });
      }

      query.status = status;
    }

    const marks = await populateMark(
      ExamMark.find(query).sort({
        createdAt: -1,
      })
    ).lean();

    return res.json({
      success: true,
      count: marks.length,
      data: marks.map(formatMark),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// GET MARKS SUMMARY
// GET /api/exam-marks/summary
// ========================================

router.get("/summary", async (req, res) => {
  try {
    const counts = await ExamMark.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = {
      total: 0,
      Draft: 0,
      Submitted: 0,
      "Under Review": 0,
      Verified: 0,
      Approved: 0,
      Returned: 0,
    };

    for (const item of counts) {
      if (
        Object.prototype.hasOwnProperty.call(
          summary,
          item._id
        )
      ) {
        summary[item._id] = item.count;
        summary.total += item.count;
      }
    }

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// GET SINGLE MARK RECORD
// GET /api/exam-marks/:id
// ========================================

router.get("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Marks ID.",
      });
    }

    const record = await populateMark(
      ExamMark.findById(req.params.id)
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Marks record not found.",
      });
    }

    return res.json({
      success: true,
      data: formatMark(record),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// CREATE MARKS
// POST /api/exam-marks
// ========================================

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    const examinationId =
      body.examinationId || body.examination;

    const studentReference =
      body.studentMongoId ||
      body.studentId ||
      body.student;

    if (!examinationId || !studentReference) {
      return res.status(400).json({
        success: false,
        message:
          "Examination and Student are required.",
      });
    }

    const [examination, student] =
      await Promise.all([
        findExamination(examinationId),
        findStudent(studentReference),
      ]);

    if (!examination) {
      return res.status(404).json({
        success: false,
        message: "Examination not found.",
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    if (
      ["Cancelled", "Postponed"].includes(
        examination.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot enter marks for a cancelled or postponed examination.",
      });
    }

    const existing = await ExamMark.findOne({
      examination: examination._id,
      student: student._id,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Marks already exist for this student and examination.",
      });
    }

    // By default, a single examination score
    // is entered under the final component.
    // Custom component distributions may be
    // supplied explicitly by the frontend.
    const defaultMaximum = {
      attendance: 0,
      assignment: 0,
      midterm: 0,
      final: Number(examination.marks),
    };

    const maximumMarks = normalizedComponents(
      body.maximumMarks,
      body.maximumMarks
        ? {
            attendance: 0,
            assignment: 0,
            midterm: 0,
            final: 0,
          }
        : defaultMaximum
    );

    const componentMarks = normalizedComponents(
      body.componentMarks
    );

    validateMarks(
      componentMarks,
      maximumMarks,
      examination.marks
    );

    const record = await ExamMark.create({
      examination: examination._id,
      student: student._id,
      course: examination.course,

      studentId: student.studentId,
      courseCode: examination.courseCode,

      componentMarks,
      maximumMarks,

      remarks:
        typeof body.remarks === "string"
          ? body.remarks.trim()
          : "",

      status: "Draft",
      createdBy: req.user._id,
    });

    const populated = await populateMark(
      ExamMark.findById(record._id)
    );

    return res.status(201).json({
      success: true,
      message:
        "Draft marks saved successfully.",
      data: formatMark(populated),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// UPDATE MARKS
// PUT /api/exam-marks/:id
// ========================================

router.put("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Marks ID.",
      });
    }

    const record = await ExamMark.findById(
      req.params.id
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Marks record not found.",
      });
    }

    // Submitted, Reviewed, Verified and Approved
    // marks cannot be edited directly.
    if (
      !["Draft", "Returned"].includes(
        record.status
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This record is locked. Only Draft or Returned marks can be edited.",
      });
    }

    const examination =
      await Examination.findById(
        record.examination
      );

    if (!examination) {
      return res.status(404).json({
        success: false,
        message: "Linked examination not found.",
      });
    }

    const body = req.body || {};

    const currentMarks =
      record.componentMarks.toObject();

    const currentMaximum =
      record.maximumMarks.toObject();

    const componentMarks = normalizedComponents(
      body.componentMarks,
      currentMarks
    );

    const maximumMarks = normalizedComponents(
      body.maximumMarks,
      currentMaximum
    );

    validateMarks(
      componentMarks,
      maximumMarks,
      examination.marks
    );

    record.set("componentMarks", componentMarks);
    record.set("maximumMarks", maximumMarks);

    if (body.remarks !== undefined) {
      if (typeof body.remarks !== "string") {
        return res.status(400).json({
          success: false,
          message: "Remarks must be text.",
        });
      }

      record.remarks = body.remarks.trim();
    }

    await record.save();

    const populated = await populateMark(
      ExamMark.findById(record._id)
    );

    return res.json({
      success: true,
      message: "Marks updated successfully.",
      data: formatMark(populated),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// CHANGE MARKS WORKFLOW STATUS
// PATCH /api/exam-marks/:id/status
// ========================================

router.patch(
  "/:id/status",
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Marks ID.",
        });
      }

      const record = await ExamMark.findById(
        req.params.id
      );

      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Marks record not found.",
        });
      }

      const nextStatus = req.body?.status;

      if (!STATUSES.includes(nextStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid marks status.",
        });
      }

      if (
        !TRANSITIONS[record.status]?.includes(
          nextStatus
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            `Cannot change marks from ${record.status} to ${nextStatus}.`,
        });
      }

      // Approval is only possible for
      // an examination marked Completed.
      if (nextStatus === "Approved") {
        const examination =
          await Examination.findById(
            record.examination
          );

        if (
          !examination ||
          examination.status !== "Completed"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Complete the examination before approving marks.",
          });
        }
      }

      record.status = nextStatus;

      if (nextStatus === "Approved") {
        record.approvedAt = new Date();
        record.approvedBy = req.user._id;
      }

      if (nextStatus === "Returned") {
        const notes = req.body?.reviewNotes;

        if (
          typeof notes !== "string" ||
          !notes.trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Review notes are required when returning marks.",
          });
        }

        record.reviewNotes = notes.trim();
        record.approvedAt = null;
        record.approvedBy = null;
      }

      if (nextStatus === "Submitted") {
        record.reviewNotes = "";
      }

      await record.save();

      const populated = await populateMark(
        ExamMark.findById(record._id)
      );

      return res.json({
        success: true,
        message:
          `Marks status changed to ${nextStatus}.`,
        data: formatMark(populated),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// DELETE DRAFT / RETURNED MARKS
// DELETE /api/exam-marks/:id
// ========================================

router.delete("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Marks ID.",
      });
    }

    const record = await ExamMark.findById(
      req.params.id
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Marks record not found.",
      });
    }

    if (
      !["Draft", "Returned"].includes(
        record.status
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Only Draft or Returned marks can be deleted.",
      });
    }

    // Prevent deleting marks when an
    // official Result already exists.
    const linkedResult = await Result.exists({
      examination: record.examination,
      student: record.student,
    });

    if (linkedResult) {
      return res.status(409).json({
        success: false,
        message:
          "This marks record has a linked Result. Resolve the Result before deleting marks.",
      });
    }

    await record.deleteOne();

    return res.json({
      success: true,
      message:
        "Marks record deleted successfully.",
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// EXPORT
// ========================================

module.exports = router;
