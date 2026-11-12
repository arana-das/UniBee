
const express = require("express");
const mongoose = require("mongoose");

const Result = require("../models/Result");
const Student = require("../models/Student");
const Examination = require("../models/Examination");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// AUTHENTICATION
// ========================================

router.use(protect);

// ========================================
// HELPERS
// ========================================

const validId = (id) =>
  mongoose.isValidObjectId(id);

function handleError(res, error) {
  console.error("Result API Error:", error.message);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "Result already exists for this student and examination.",
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors)
        .map((item) => item.message)
        .join(" "),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid result information.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Unable to process result request.",
  });
}

// ========================================
// POPULATE STUDENT, EXAM AND COURSE
// ========================================

const populateResult = (query) =>
  query
    .populate(
      "student",
      "studentId fullName email department program semester"
    )
    .populate(
      "examination",
      "title type date marks status"
    )
    .populate(
      "course",
      "courseCode courseTitle semester credits"
    );

// ========================================
// STUDENT: MY PUBLISHED RESULTS
// GET /api/results/my
// ========================================

router.get(
  "/my",
  authorize("student"),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      let student = null;

      // First, use explicitly linked Student profile.
      if (
        user.profileId &&
        validId(String(user.profileId))
      ) {
        student = await Student.findById(
          user.profileId
        ).lean();

        // Ensure the linked profile belongs to
        // the authenticated account.
        if (
          student &&
          user.email &&
          String(student.email || "")
            .trim()
            .toLowerCase() !==
            String(user.email)
              .trim()
              .toLowerCase()
        ) {
          student = null;
        }

        if (
          student &&
          user.userId &&
          String(student.studentId || "")
            .trim()
            .toUpperCase() !==
            String(user.userId)
              .trim()
              .toUpperCase()
        ) {
          student = null;
        }
      }

      // Fallback: match BOTH Student ID and email.
      // No student identifier comes from request input.
      if (!student) {
        const studentId = String(
          user.userId || ""
        ).trim().toUpperCase();

        const email = String(
          user.email || ""
        ).trim().toLowerCase();

        if (studentId && email) {
          student = await Student.findOne({
            studentId,
            email,
          }).lean();
        }
      }

      if (!student) {
        return res.status(403).json({
          success: false,
          message:
            "No matching Student profile found for this account. Contact Admin.",
        });
      }

      // Return only authenticated student's
      // Published results.
      const results = await populateResult(
        Result.find({
          student: student._id,
          status: "Published",
        }).sort({
          publishedAt: -1,
          createdAt: -1,
        })
      ).lean();

      return res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// RESULT MANAGEMENT ACCESS
// Temporary Admin + Exam Controller Access
//
// Student /my route remains protected above.
// ========================================

router.use(
  authorize("admin", "exam-controller")
);

// ========================================
// GET ALL RESULTS
// GET /api/results
// ========================================

router.get("/", async (req, res) => {
  try {
    const {
      student,
      examination,
      course,
      status,
      semester,
    } = req.query;

    const query = {};

    if (student) {
      if (!validId(student)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      query.student = student;
    }

    if (examination) {
      if (!validId(examination)) {
        return res.status(400).json({
          success: false,
          message: "Invalid examination ID.",
        });
      }

      query.examination = examination;
    }

    if (course) {
      if (!validId(course)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID.",
        });
      }

      query.course = course;
    }

    if (status && status !== "All") {
      if (
        !["Draft", "Published", "Withheld"].includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid result status.",
        });
      }

      query.status = status;
    }

    let results = await populateResult(
      Result.find(query).sort({
        createdAt: -1,
      })
    ).lean();

    if (semester && semester !== "All") {
      results = results.filter(
        (item) =>
          item.course?.semester === semester
      );
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// CREATE RESULT
// POST /api/results
// ========================================

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    const studentReference =
      body.studentMongoId ||
      body.studentObjectId ||
      body.student ||
      body.studentId;

    const examinationId =
      body.examinationId ||
      body.examId ||
      body.examination;

    if (!studentReference || !examinationId) {
      return res.status(400).json({
        success: false,
        message:
          "Student and Examination are required.",
      });
    }

    // Find student by MongoDB ID or Student ID.
    const student = validId(
      String(studentReference)
    )
      ? await Student.findById(studentReference)
      : await Student.findOne({
          studentId: String(studentReference)
            .trim()
            .toUpperCase(),
        });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    if (!validId(String(examinationId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid Examination ID.",
      });
    }

    const examination = await Examination.findById(
      examinationId
    );

    if (!examination) {
      return res.status(404).json({
        success: false,
        message: "Examination not found.",
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
          "Cannot create results for a cancelled or postponed examination.",
      });
    }

    // Validate obtained marks.
    if (
      body.obtainedMarks === undefined ||
      body.obtainedMarks === null ||
      body.obtainedMarks === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Obtained marks are required.",
      });
    }

    const obtainedMarks = Number(
      body.obtainedMarks
    );

    if (
      !Number.isFinite(obtainedMarks) ||
      obtainedMarks < 0 ||
      obtainedMarks > examination.marks
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Obtained marks must be between 0 and ${examination.marks}.`,
      });
    }

    // Validate grade point.
    const gradePoint =
      body.gradePoint === null ||
      body.gradePoint === undefined ||
      body.gradePoint === ""
        ? null
        : Number(body.gradePoint);

    if (
      gradePoint !== null &&
      (
        !Number.isFinite(gradePoint) ||
        gradePoint < 0 ||
        gradePoint > 4
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Grade point must be between 0 and 4.",
      });
    }

    const status = body.status || "Draft";

    if (
      !["Draft", "Published", "Withheld"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid result status.",
      });
    }

    // Publishing requires Completed examination.
    if (
      status === "Published" &&
      examination.status !== "Completed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Complete the examination before publishing results.",
      });
    }

    const result = await Result.create({
      student: student._id,
      examination: examination._id,
      course: examination.course,

      studentId: student.studentId,
      courseCode: examination.courseCode,

      obtainedMarks,
      totalMarks: examination.marks,

      grade: String(body.grade || "").trim(),
      gradePoint,

      remarks: String(body.remarks || "").trim(),

      status,

      publishedAt:
        status === "Published"
          ? new Date()
          : null,
    });

    const populated = await populateResult(
      Result.findById(result._id)
    );

    return res.status(201).json({
      success: true,
      message:
        "Result created successfully.",
      data: populated,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// UPDATE RESULT
// PUT /api/results/:id
// ========================================

router.put("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Result ID.",
      });
    }

    const result = await Result.findById(
      req.params.id
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found.",
      });
    }

    const body = req.body || {};

    // ====================================
    // MARKS VALIDATION
    // ====================================

    let obtainedMarks = result.obtainedMarks;

    if (body.obtainedMarks !== undefined) {
      if (
        body.obtainedMarks === null ||
        body.obtainedMarks === ""
      ) {
        return res.status(400).json({
          success: false,
          message: "Obtained marks cannot be empty.",
        });
      }

      obtainedMarks = Number(
        body.obtainedMarks
      );
    }

    if (
      !Number.isFinite(obtainedMarks) ||
      obtainedMarks < 0 ||
      obtainedMarks > result.totalMarks
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Marks must be between 0 and ${result.totalMarks}.`,
      });
    }

    if (body.obtainedMarks !== undefined) {
      result.obtainedMarks = obtainedMarks;
    }

    // ====================================
    // GRADE
    // ====================================

    if (body.grade !== undefined) {
      result.grade = String(
        body.grade
      ).trim();
    }

    // ====================================
    // GRADE POINT
    // ====================================

    if (body.gradePoint !== undefined) {
      const point =
        body.gradePoint === null ||
        body.gradePoint === ""
          ? null
          : Number(body.gradePoint);

      if (
        point !== null &&
        (
          !Number.isFinite(point) ||
          point < 0 ||
          point > 4
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Grade point must be between 0 and 4.",
        });
      }

      result.gradePoint = point;
    }

    // ====================================
    // REMARKS
    // ====================================

    if (body.remarks !== undefined) {
      result.remarks = String(
        body.remarks
      ).trim();
    }

    // ====================================
    // STATUS
    // ====================================

    if (body.status !== undefined) {
      const status = body.status;

      if (
        !["Draft", "Published", "Withheld"].includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid result status.",
        });
      }

      if (status === "Published") {
        const examination =
          await Examination.findById(
            result.examination
          );

        if (
          !examination ||
          examination.status !== "Completed"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Complete the examination before publishing results.",
          });
        }

        if (result.status !== "Published") {
          result.publishedAt = new Date();
        }
      } else {
        // Both Draft and Withheld are unpublished.
        result.publishedAt = null;
      }

      result.status = status;
    }

    await result.save();

    const populated = await populateResult(
      Result.findById(result._id)
    );

    return res.status(200).json({
      success: true,
      message:
        "Result updated successfully.",
      data: populated,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// DELETE RESULT
// DELETE /api/results/:id
// ========================================

router.delete("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Result ID.",
      });
    }

    const result =
      await Result.findByIdAndDelete(
        req.params.id
      );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Result deleted successfully.",
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// EXPORT
// ========================================

module.exports = router;
