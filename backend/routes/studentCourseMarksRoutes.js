
const express = require("express");
const mongoose = require("mongoose");

const Student = require("../models/Student");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const AssignmentSubmission = require(
  "../models/AssignmentSubmission"
);
const CourseAssessmentMark = require(
  "../models/CourseAssessmentMark"
);

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// ========================================
// UNIBEE — STUDENT COURSE MARKS API
//
// Faculty -> Assignment Marks
// Exam Controller -> Published Exam Marks
// Student -> Own Course Marks Only
// ========================================

const router = express.Router();

router.use(protect);
router.use(authorize("student"));

const validId = (value) =>
  mongoose.isValidObjectId(value);

const getId = (value) =>
  String(value?._id || value || "");

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function percent(obtained, maximum) {
  if (
    !Number.isFinite(obtained) ||
    !Number.isFinite(maximum) ||
    maximum <= 0
  ) {
    return null;
  }

  return Number(
    ((obtained / maximum) * 100).toFixed(2)
  );
}

// ========================================
// RESOLVE LOGGED-IN STUDENT
// ========================================

async function resolveStudent(user) {
  if (
    !user ||
    user.role !== "student" ||
    user.status !== "Active" ||
    user.isActive !== true
  ) {
    return null;
  }

  const email = String(user.email || "")
    .trim()
    .toLowerCase();

  // First use the explicitly linked profile.
  if (validId(user.profileId)) {
    const linked = await Student.findById(
      user.profileId
    ).lean();

    if (
      linked &&
      linked.status === "Active" &&
      email &&
      String(linked.email || "")
        .trim()
        .toLowerCase() === email
    ) {
      return linked;
    }

    // Do not silently switch to a different
    // profile when a link already exists.
    return null;
  }

  if (!email) {
    return null;
  }

  // Only a matching, unique student email
  // may resolve an unlinked login account.
  const matches = await Student.find({
    email,
    status: "Active",
  })
    .limit(2)
    .lean();

  return matches.length === 1
    ? matches[0]
    : null;
}

// ========================================
// GET COURSE MARKS
//
// GET /api/student-course-marks/:courseId
//
// Only the logged-in student's approved
// courses are accessible.
// ========================================

router.get("/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!validId(courseId)) {
      return fail(
        res,
        400,
        "Invalid Course ID."
      );
    }

    const student = await resolveStudent(
      req.user
    );

    if (!student) {
      return fail(
        res,
        403,
        "Student account is not linked to an active Student profile."
      );
    }

    const course = await Course.findById(
      courseId
    )
      .select(
        "courseCode courseTitle semester department credits"
      )
      .lean();

    if (!course) {
      return fail(
        res,
        404,
        "Course not found."
      );
    }

    // ====================================
    // VERIFY APPROVED COURSE ENROLLMENT
    // ====================================

    const enrollments = await Enrollment.find({
      student: student._id,
      course: course._id,
      status: "Approved",
    })
      .select("semester")
      .lean();

    if (!enrollments.length) {
      return fail(
        res,
        403,
        "You do not have approved enrollment in this course."
      );
    }

    const semesters = [
      ...new Set(
        enrollments.map(
          (item) => item.semester
        )
      ),
    ];

    // ====================================
    // FACULTY ASSIGNMENT GRADES
    // ====================================

    const submissions =
      await AssignmentSubmission.find({
        student: student._id,
        status: "Graded",
      })
        .select(
          "assignment obtainedMarks gradedAt status"
        )
        .populate({
          path: "assignment",
          match: {
            course: course._id,
            semester: { $in: semesters },
            status: {
              $in: ["Published", "Closed"],
            },
          },
          select:
            "title marks course semester status",
        })
        .sort({ gradedAt: -1 })
        .lean();

    const assignmentMarks = submissions
      .filter((item) => {
        if (!item.assignment) return false;

        const obtained = Number(
          item.obtainedMarks
        );

        const maximum = Number(
          item.assignment.marks
        );

        return (
          Number.isFinite(obtained) &&
          Number.isFinite(maximum) &&
          maximum > 0 &&
          obtained >= 0 &&
          obtained <= maximum
        );
      })
      .map((item) => {
        const obtained = Number(
          item.obtainedMarks
        );

        const maximum = Number(
          item.assignment.marks
        );

        return {
          id: getId(item),
          source: "Faculty",
          assessmentType: "Assignment",
          assessmentName:
            item.assignment.title,
          semester:
            item.assignment.semester,
          obtainedMarks: obtained,
          maximumMarks: maximum,
          percentage: percent(
            obtained,
            maximum
          ),
          status: "Graded",
          gradedAt:
            item.gradedAt || null,
        };
      });

    // ====================================
    // EXAM CONTROLLER PUBLISHED MARKS
    // ====================================

    const examRecords =
      await CourseAssessmentMark.find({
        course: course._id,
        student: student._id,
        semester: {
          $in: semesters,
        },
        status: "Published",
      })
        .sort({
          assessmentDate: 1,
          assessmentName: 1,
        })
        .lean();

    const assessmentMarks =
      examRecords.map((item) => ({
        id: getId(item),
        source: "Exam Controller",
        assessmentType:
          item.assessmentType,
        assessmentName:
          item.assessmentName,
        semester:
          item.semester,
        assessmentDate:
          item.assessmentDate,
        obtainedMarks:
          item.obtainedMarks,
        maximumMarks:
          item.maximumMarks,
        percentage:
          item.percentage,
        status:
          item.status,
        publishedAt:
          item.publishedAt,
        remarks:
          item.remarks || "",
      }));

    // ====================================
    // COMBINED COURSE MARKS
    // ====================================

    const marks = [
      ...assignmentMarks,
      ...assessmentMarks,
    ].sort((a, b) =>
      String(a.semester).localeCompare(
        String(b.semester)
      ) ||
      String(a.assessmentType).localeCompare(
        String(b.assessmentType)
      ) ||
      String(a.assessmentName).localeCompare(
        String(b.assessmentName)
      )
    );

    // Totals are raw recorded totals,
    // not weighted course final grades.
    const totalObtained = marks.reduce(
      (sum, item) =>
        sum + Number(item.obtainedMarks),
      0
    );

    const totalMaximum = marks.reduce(
      (sum, item) =>
        sum + Number(item.maximumMarks),
      0
    );

    return res.json({
      success: true,

      student: {
        id: getId(student),
        studentId:
          student.studentId,
        fullName:
          student.fullName,
      },

      course: {
        id: getId(course),
        courseCode:
          course.courseCode,
        courseTitle:
          course.courseTitle,
        semester:
          course.semester,
        department:
          course.department,
        credits:
          course.credits,
      },

      semesters,

      assignments: assignmentMarks,

      assessments: assessmentMarks,

      data: marks,

      summary: {
        assignmentCount:
          assignmentMarks.length,

        assessmentCount:
          assessmentMarks.length,

        totalRecords:
          marks.length,

        totalObtained: Number(
          totalObtained.toFixed(2)
        ),

        totalMaximum: Number(
          totalMaximum.toFixed(2)
        ),

        rawPercentage: percent(
          totalObtained,
          totalMaximum
        ),
      },
    });
  } catch (error) {
    console.error(
      "Student Course Marks API:",
      error
    );

    return fail(
      res,
      500,
      "Unable to load course marks."
    );
  }
});

// ========================================
// EXPORT
// ========================================

module.exports = router;
