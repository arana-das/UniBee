
const express = require("express");
const mongoose = require("mongoose");

const Student = require("../models/Student");
const Enrollment = require("../models/Enrollment");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(authorize("student"));

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

const normalizedId = (value) =>
  String(value || "").trim().toUpperCase();

const objectId = (value) =>
  value && mongoose.isValidObjectId(value);

function sameIdentity(user, student) {
  if (!student) return false;

  if (
    user.userId &&
    normalizedId(user.userId) !== normalizedId(student.studentId)
  ) {
    return false;
  }

  if (
    user.email &&
    normalize(user.email) !== normalize(student.email)
  ) {
    return false;
  }

  return Boolean(user.userId || user.email);
}

async function resolveStudent(user) {
  // First try the explicitly linked Student profile.
  if (objectId(user.profileId)) {
    const linked = await Student.findById(user.profileId).lean();

    if (linked && sameIdentity(user, linked)) {
      return linked;
    }
  }

  // Safe fallback: match identity, not name or department.
  // Both identifiers must agree if both are available.
  const conditions = [];

  if (user.userId) {
    conditions.push({
      studentId: normalizedId(user.userId),
    });
  }

  if (user.email) {
    conditions.push({
      email: normalize(user.email),
    });
  }

  if (!conditions.length) return null;

  const matches = await Student.find({
    $and: conditions,
  })
    .limit(2)
    .lean();

  if (matches.length !== 1) return null;

  return sameIdentity(user, matches[0])
    ? matches[0]
    : null;
}

// ========================================
// GET LOGGED-IN STUDENT'S COURSES
// GET /api/student-enrollments/my
// ========================================

router.get("/my", async (req, res) => {
  try {
    const user = req.user;

    if (user.status !== "Active" || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Student account is not active.",
      });
    }

    const student = await resolveStudent(user);

    // Missing Student profile is NOT substituted
    // with another student's records.
    if (!student) {
      return res.json({
        success: true,
        linked: false,
        student: null,
        count: 0,
        summary: {
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          dropped: 0,
        },
        data: [],
        message:
          "No matching Student database profile found.",
      });
    }

    const enrollments = await Enrollment.find({
      student: student._id,
    })
      .populate({
        path: "course",
        select:
          "courseCode courseTitle semester credits department faculty status",
        populate: {
          path: "faculty",
          select: "fullName name",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    const records = enrollments.map((item) => {
      const course =
        item.course &&
        typeof item.course === "object"
          ? item.course
          : null;

      const faculty =
        course?.faculty &&
        typeof course.faculty === "object"
          ? course.faculty
          : null;

      return {
        id: String(item._id),
        studentId: student.studentId,
        status: item.status,
        semester: item.semester || course?.semester || null,
        appliedAt: item.appliedAt || null,
        reviewedAt: item.reviewedAt || null,
        notes: item.notes || null,
        course: course
          ? {
              id: String(course._id),
              code: course.courseCode || null,
              title: course.courseTitle || null,
              semester: course.semester || null,
              credits: course.credits ?? null,
              department: course.department || null,
              status: course.status || null,
              instructor:
                faculty?.fullName ||
                faculty?.name ||
                null,
            }
          : null,
      };
    });

    const summary = {
      total: records.length,
      approved: records.filter(
        (item) => item.status === "Approved"
      ).length,
      pending: records.filter(
        (item) => item.status === "Pending"
      ).length,
      rejected: records.filter(
        (item) => item.status === "Rejected"
      ).length,
      dropped: records.filter(
        (item) => item.status === "Dropped"
      ).length,
    };

    return res.json({
      success: true,
      linked: true,
      student: {
        id: String(student._id),
        studentId: student.studentId,
        fullName: student.fullName,
        department: student.department || null,
        program: student.program || null,
        semester: student.semester || null,
      },
      count: records.length,
      summary,
      data: records,
    });
  } catch (error) {
    console.error(
      "Student Enrollment API Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load student enrollments.",
    });
  }
});

module.exports = router;
