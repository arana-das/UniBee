
const express = require("express");
const mongoose = require("mongoose");

const Enrollment = require("../models/Enrollment");
const Student = require("../models/Student");
const Course = require("../models/Course");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Admin-only Enrollment Management
router.use(protect);
router.use(authorize("admin"));

// ========================================
// HELPERS
// ========================================

const clean = (value) =>
  typeof value === "string" ? value.trim() : "";

const validId = (id) =>
  mongoose.isValidObjectId(id);

const STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
  "Dropped",
];

function sendError(res, error) {
  console.error("Enrollment API:", error.message);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "This student already has a pending or approved enrollment for this course and semester.",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Enrollment operation failed.",
  });
}

function populateEnrollment(query) {
  return query
    .populate(
      "student",
      "studentId fullName email department status"
    )
    .populate(
      "course",
      "courseCode courseTitle department semester credits status"
    )
    .populate(
      "reviewedBy",
      "name email"
    );
}

function formatEnrollment(row) {
  const data =
    typeof row.toObject === "function"
      ? row.toObject()
      : row;

  const student = data.student;
  const course = data.course;

  return {
    ...data,
    id: String(data._id),

    studentId:
      student && typeof student === "object"
        ? student.studentId
        : "",

    studentName:
      student && typeof student === "object"
        ? student.fullName
        : "",

    courseCode:
      course && typeof course === "object"
        ? course.courseCode
        : "",

    courseTitle:
      course && typeof course === "object"
        ? course.courseTitle
        : "",
  };
}

// Keep Course.enrolledStudents in sync with
// approved Enrollment records.
async function syncCourse(courseId, studentId) {
  if (!courseId || !studentId) return;

  const approved = await Enrollment.exists({
    course: courseId,
    student: studentId,
    status: "Approved",
  });

  if (approved) {
    await Course.updateOne(
      { _id: courseId },
      { $addToSet: { enrolledStudents: studentId } }
    );
  } else {
    await Course.updateOne(
      { _id: courseId },
      { $pull: { enrolledStudents: studentId } }
    );
  }
}

async function validateSelection(studentId, courseId) {
  if (!validId(studentId) || !validId(courseId)) {
    return {
      error: "Select a valid MongoDB Student and Course.",
    };
  }

  const [student, course] = await Promise.all([
    Student.findById(studentId),
    Course.findById(courseId),
  ]);

  if (!student || !course) {
    return {
      error: "Student or Course record not found.",
    };
  }

  return { student, course };
}

function duplicateQuery(
  student,
  course,
  semester,
  excludeId = null
) {
  const query = {
    student,
    course,
    semester,
    status: { $in: ["Pending", "Approved"] },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return query;
}

// ========================================
// GET ALL ENROLLMENTS
// GET /api/enrollments
// ========================================

router.get("/", async (req, res) => {
  try {
    const rows = await populateEnrollment(
      Enrollment.find().sort({ createdAt: -1 })
    ).lean();

    return res.json({
      success: true,
      count: rows.length,
      data: rows.map(formatEnrollment),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// GET ONE ENROLLMENT
// GET /api/enrollments/:id
// ========================================

router.get("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Enrollment ID.",
      });
    }

    const row = await populateEnrollment(
      Enrollment.findById(req.params.id)
    ).lean();

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found.",
      });
    }

    return res.json({
      success: true,
      data: formatEnrollment(row),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// CREATE ENROLLMENT
// POST /api/enrollments
// ========================================

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    const studentId = body.student;
    const courseId = body.course;
    const status = clean(body.status) || "Pending";
    const notes = clean(body.notes);

    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment status.",
      });
    }

    const selection = await validateSelection(
      studentId,
      courseId
    );

    if (selection.error) {
      return res.status(400).json({
        success: false,
        message: selection.error,
      });
    }

    const { student, course } = selection;

    if (student.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Only active students can enroll.",
      });
    }

    if (course.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Only active courses accept enrollments.",
      });
    }

    const semester = clean(body.semester) ||
      course.semester;

    if (semester !== course.semester) {
      return res.status(400).json({
        success: false,
        message:
          "Enrollment semester must match the selected course.",
      });
    }

    if (["Pending", "Approved"].includes(status)) {
      const duplicate = await Enrollment.exists(
        duplicateQuery(student._id, course._id, semester)
      );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Student already has an active enrollment request for this course.",
        });
      }
    }

    const row = await Enrollment.create({
      student: student._id,
      course: course._id,
      semester,
      status,
      notes,
      appliedAt: body.appliedAt || new Date(),
      createdBy: req.user._id,
      reviewedBy:
        status === "Pending" ? null : req.user._id,
      reviewedAt:
        status === "Pending" ? null : new Date(),
    });

    await syncCourse(course._id, student._id);

    const populated = await populateEnrollment(
      Enrollment.findById(row._id)
    ).lean();

    return res.status(201).json({
      success: true,
      message: "Enrollment created successfully.",
      data: formatEnrollment(populated),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// UPDATE ENROLLMENT
// PUT /api/enrollments/:id
// ========================================

router.put("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Enrollment ID.",
      });
    }

    const existing = await Enrollment.findById(
      req.params.id
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found.",
      });
    }

    const body = req.body || {};

    const studentId = body.student ??
      existing.student;

    const courseId = body.course ??
      existing.course;

    const selection = await validateSelection(
      studentId,
      courseId
    );

    if (selection.error) {
      return res.status(400).json({
        success: false,
        message: selection.error,
      });
    }

    const { student, course } = selection;

    const status = body.status === undefined
      ? existing.status
      : clean(body.status);

    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment status.",
      });
    }

    const semester = body.semester === undefined
      ? existing.semester
      : clean(body.semester);

    if (semester !== course.semester) {
      return res.status(400).json({
        success: false,
        message:
          "Enrollment semester must match the selected course.",
      });
    }

    const selectionChanged =
      String(existing.student) !== String(student._id) ||
      String(existing.course) !== String(course._id);

    if (
      (selectionChanged ||
        existing.status !== status) &&
      ["Pending", "Approved"].includes(status)
    ) {
      if (
        student.status !== "Active" ||
        course.status !== "Active"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Student and Course must be active.",
        });
      }
    }

    if (["Pending", "Approved"].includes(status)) {
      const duplicate = await Enrollment.exists(
        duplicateQuery(
          student._id,
          course._id,
          semester,
          existing._id
        )
      );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Duplicate pending or approved enrollment.",
        });
      }
    }

    const oldCourse = existing.course;
    const oldStudent = existing.student;

    existing.student = student._id;
    existing.course = course._id;
    existing.semester = semester;
    existing.status = status;

    if (body.notes !== undefined) {
      existing.notes = clean(body.notes);
    }

    if (body.appliedAt !== undefined) {
      existing.appliedAt = body.appliedAt;
    }

    if (status === "Pending") {
      existing.reviewedAt = null;
      existing.reviewedBy = null;
    } else if (
      existing.isModified("status") ||
      !existing.reviewedAt
    ) {
      existing.reviewedAt = new Date();
      existing.reviewedBy = req.user._id;
    }

    await existing.save();

    await syncCourse(oldCourse, oldStudent);
    await syncCourse(course._id, student._id);

    const populated = await populateEnrollment(
      Enrollment.findById(existing._id)
    ).lean();

    return res.json({
      success: true,
      message: "Enrollment updated successfully.",
      data: formatEnrollment(populated),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// CHANGE ENROLLMENT STATUS
// PATCH /api/enrollments/:id/status
// ========================================

router.patch("/:id/status", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Enrollment ID.",
      });
    }

    const status = clean(req.body?.status);

    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment status.",
      });
    }

    const existing = await Enrollment.findById(
      req.params.id
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found.",
      });
    }

    if (existing.status === status) {
      return res.status(409).json({
        success: false,
        message: "Enrollment already has this status.",
      });
    }

    if (["Pending", "Approved"].includes(status)) {
      const selection = await validateSelection(
        existing.student,
        existing.course
      );

      if (
        selection.error ||
        selection.student.status !== "Active" ||
        selection.course.status !== "Active"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Student and Course must be active.",
        });
      }

      const duplicate = await Enrollment.exists(
        duplicateQuery(
          existing.student,
          existing.course,
          existing.semester,
          existing._id
        )
      );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Duplicate active enrollment.",
        });
      }
    }

    // Atomic status transition prevents two
    // reviewers from overwriting the same decision.
    const updated = await Enrollment.findOneAndUpdate(
      {
        _id: existing._id,
        status: existing.status,
      },
      {
        $set: {
          status,
          reviewedAt:
            status === "Pending" ? null : new Date(),
          reviewedBy:
            status === "Pending"
              ? null
              : req.user._id,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message:
          "Enrollment was changed. Refresh and retry.",
      });
    }

    await syncCourse(updated.course, updated.student);

    const populated = await populateEnrollment(
      Enrollment.findById(updated._id)
    ).lean();

    return res.json({
      success: true,
      message: `Enrollment marked ${status}.`,
      data: formatEnrollment(populated),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// DELETE ENROLLMENT
// DELETE /api/enrollments/:id
// ========================================

router.delete("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Enrollment ID.",
      });
    }

    const existing = await Enrollment.findByIdAndDelete(
      req.params.id
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found.",
      });
    }

    await syncCourse(
      existing.course,
      existing.student
    );

    return res.json({
      success: true,
      message: "Enrollment deleted successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
});

module.exports = router;
