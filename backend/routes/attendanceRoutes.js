
const express = require("express");
const mongoose = require("mongoose");

const Attendance = require("../models/Attendance");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const User = require("../models/User");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// UNIBEE ATTENDANCE API
// Faculty and Student access
// ========================================

router.use(protect);

const STATUSES = [
  "Present",
  "Absent",
  "Late",
  "Excused",
];

const isValidId = (id) =>
  mongoose.isValidObjectId(id);

const idOf = (value) =>
  String(value?._id || value || "");

function failure(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function handleError(res, error) {
  console.error(
    "Attendance API:",
    error.message
  );

  if (error.code === 11000) {
    return failure(
      res,
      409,
      "An attendance session already exists. Refresh and try again."
    );
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return failure(
      res,
      400,
      error.message
    );
  }

  return failure(
    res,
    500,
    "Attendance operation failed."
  );
}

// ========================================
// DATE VALIDATION
// ========================================

function validDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(
    `${value}T00:00:00.000Z`
  );

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) ===
      value
  );
}

// ========================================
// AUTHENTICATED USER
// ========================================

async function getLoginUser(req) {
  const userId = idOf(req.user);

  if (!isValidId(userId)) {
    return null;
  }

  return User.findOne({
    _id: userId,
    isActive: true,
    status: "Active",
  }).lean();
}

// ========================================
// RESOLVE FACULTY PROFILE
// ========================================

async function resolveFaculty(req) {
  const user = await getLoginUser(req);

  if (!user || user.role !== "faculty") {
    return null;
  }

  // Prefer the direct relationship:
  // Faculty.userId -> User._id

  const byUser = await Faculty.findOne({
    userId: user._id,
    status: "Active",
  }).lean();

  // Alternative existing relationship:
  // User.profileId -> Faculty._id

  const byProfile = isValidId(user.profileId)
    ? await Faculty.findOne({
        _id: user.profileId,
        status: "Active",
      }).lean()
    : null;

  // Reject conflicting profile links.
  if (
    byUser &&
    byProfile &&
    idOf(byUser) !== idOf(byProfile)
  ) {
    return null;
  }

  const faculty = byUser || byProfile;

  if (!faculty) return null;

  // Any explicitly stored reverse link
  // must point to this authenticated user.
  if (
    faculty.userId &&
    idOf(faculty.userId) !== idOf(user._id)
  ) {
    return null;
  }

  return {
    user,
    faculty,
  };
}

// ========================================
// RESOLVE STUDENT PROFILE
// ========================================

async function resolveStudent(req) {
  const user = await getLoginUser(req);

  if (!user || user.role !== "student") {
    return null;
  }

  // First try User.profileId.
  const byProfile = isValidId(user.profileId)
    ? await Student.findById(
        user.profileId
      ).lean()
    : null;

  // Also support Student.userId when
  // that relationship exists.
  const byUser = await Student.findOne({
    userId: user._id,
  }).lean();

  if (
    byProfile &&
    byUser &&
    idOf(byProfile) !== idOf(byUser)
  ) {
    return null;
  }

  const student = byProfile || byUser;

  if (!student) return null;

  if (
    student.userId &&
    idOf(student.userId) !== idOf(user._id)
  ) {
    return null;
  }

  return {
    user,
    student,
  };
}

// ========================================
// ASSIGNED COURSE VERIFICATION
// ========================================

async function getAssignedCourse(
  facultyId,
  courseId
) {
  if (!isValidId(courseId)) {
    return null;
  }

  return Course.findOne({
    _id: courseId,
    faculty: facultyId,
    status: "Active",
  }).lean();
}

// ========================================
// GET APPROVED STUDENT ROSTER
// ========================================

async function getApprovedRoster(
  courseId,
  semester
) {
  const enrollments = await Enrollment.find({
    course: courseId,
    semester,
    status: "Approved",
  })
    .populate(
      "student",
      "studentId fullName email status department"
    )
    .lean();

  const seen = new Set();
  const students = [];

  for (const enrollment of enrollments) {
    const student = enrollment.student;

    if (!student || student.status !== "Active") {
      continue;
    }

    const studentId = idOf(student);

    if (seen.has(studentId)) continue;

    seen.add(studentId);

    students.push({
      _id: studentId,
      studentId:
        student.studentId || "",
      name:
        student.fullName || "Student",
      email:
        student.email || "",
      department:
        student.department || "",
    });
  }

  students.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return students;
}

// ========================================
// ATTENDANCE SUMMARY
// ========================================

function summarize(entries) {
  const counts = {
    Present: 0,
    Absent: 0,
    Late: 0,
    Excused: 0,
  };

  for (const entry of entries) {
    if (
      Object.prototype.hasOwnProperty.call(
        counts,
        entry.status
      )
    ) {
      counts[entry.status]++;
    }
  }

  const total =
    entries.length;

  const attended =
    counts.Present + counts.Late;

  return {
    total,
    ...counts,
    attended,
    attendanceRate:
      total === 0
        ? 0
        : Math.round(
            (attended / total) * 100
          ),
  };
}

// ========================================
// FACULTY ROUTES
// ========================================

router.get(
  "/faculty/courses",
  authorize("faculty"),
  async (req, res) => {
    try {
      const identity =
        await resolveFaculty(req);

      if (!identity) {
        return failure(
          res,
          403,
          "Faculty account is not linked to an active Faculty profile."
        );
      }

      const courses = await Course.find({
        faculty: identity.faculty._id,
        status: "Active",
      })
        .sort({
          courseCode: 1,
        })
        .lean();

      return res.json({
        success: true,
        faculty: {
          id: idOf(identity.faculty),
          facultyId:
            identity.faculty.facultyId,
          name:
            identity.faculty.name,
        },
        data: courses.map((course) => ({
          id: idOf(course),
          code: course.courseCode,
          title: course.courseTitle,
          semester: course.semester,
          department: course.department,
          credits: course.credits,
        })),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// GET FACULTY COURSE STUDENTS
// GET /api/attendance/faculty/roster/:courseId
// ========================================

router.get(
  "/faculty/roster/:courseId",
  authorize("faculty"),
  async (req, res) => {
    try {
      const identity =
        await resolveFaculty(req);

      if (!identity) {
        return failure(
          res,
          403,
          "Faculty profile link is missing."
        );
      }

      const course =
        await getAssignedCourse(
          identity.faculty._id,
          req.params.courseId
        );

      if (!course) {
        return failure(
          res,
          403,
          "This course is not assigned to your Faculty profile."
        );
      }

      const students =
        await getApprovedRoster(
          course._id,
          course.semester
        );

      return res.json({
        success: true,
        course: {
          id: idOf(course),
          code: course.courseCode,
          title: course.courseTitle,
          semester: course.semester,
        },
        total: students.length,
        data: students,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// GET DATE-WISE ATTENDANCE
// GET /api/attendance/faculty/records
// ?courseId=...&date=YYYY-MM-DD
// ========================================

router.get(
  "/faculty/records",
  authorize("faculty"),
  async (req, res) => {
    try {
      const { courseId, date } = req.query;

      if (
        !isValidId(courseId) ||
        !validDate(date)
      ) {
        return failure(
          res,
          400,
          "Valid courseId and date are required."
        );
      }

      const identity =
        await resolveFaculty(req);

      if (!identity) {
        return failure(
          res,
          403,
          "Faculty profile link is missing."
        );
      }

      const course =
        await getAssignedCourse(
          identity.faculty._id,
          courseId
        );

      if (!course) {
        return failure(
          res,
          403,
          "You are not assigned to this course."
        );
      }

      const record =
        await Attendance.findOne({
          course: course._id,
          semester: course.semester,
          date,
        }).lean();

      if (
        record &&
        idOf(record.faculty) !==
          idOf(identity.user)
      ) {
        return failure(
          res,
          409,
          "This attendance record belongs to another Faculty account."
        );
      }

      return res.json({
        success: true,
        exists: Boolean(record),
        data: record
          ? {
              id: idOf(record),
              courseId: idOf(
                record.course
              ),
              semester:
                record.semester,
              date:
                record.date,
              students:
                record.students.map(
                  (item) => ({
                    studentId: idOf(
                      item.student
                    ),
                    status:
                      item.status,
                  })
                ),
              summary: summarize(
                record.students
              ),
              savedAt:
                record.updatedAt,
            }
          : null,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// SAVE OR UPDATE ATTENDANCE
// PUT /api/attendance/faculty/records
//
// Body:
// {
//   "courseId": "...",
//   "semester": "Fall 2026",
//   "date": "2026-11-11",
//   "students": [
//     {
//       "studentId": "...",
//       "status": "Present"
//     }
//   ]
// }
// ========================================

router.put(
  "/faculty/records",
  authorize("faculty"),
  async (req, res) => {
    try {
      const {
        courseId,
        semester,
        date,
        students,
      } = req.body || {};

      if (
        !isValidId(courseId) ||
        !validDate(date) ||
        typeof semester !== "string" ||
        !semester.trim() ||
        !Array.isArray(students)
      ) {
        return failure(
          res,
          400,
          "Valid courseId, semester, date and students array are required."
        );
      }

      const identity =
        await resolveFaculty(req);

      if (!identity) {
        return failure(
          res,
          403,
          "Faculty profile link is missing."
        );
      }

      const course =
        await getAssignedCourse(
          identity.faculty._id,
          courseId
        );

      if (!course) {
        return failure(
          res,
          403,
          "You cannot save attendance for this course."
        );
      }

      if (
        semester.trim() !==
        course.semester
      ) {
        return failure(
          res,
          400,
          "Semester does not match the assigned course."
        );
      }

      const roster =
        await getApprovedRoster(
          course._id,
          course.semester
        );

      if (roster.length === 0) {
        return failure(
          res,
          400,
          "No approved active students are enrolled in this course."
        );
      }

      // Require every approved student,
      // exactly once.
      if (
        students.length !==
        roster.length
      ) {
        return failure(
          res,
          400,
          "Attendance must include every approved student exactly once."
        );
      }

      const allowedIds = new Set(
        roster.map((item) => item._id)
      );

      const seen = new Set();
      const entries = [];

      for (const item of students) {
        const studentId =
          item?.studentId;

        const status =
          item?.status;

        if (
          !isValidId(studentId) ||
          !allowedIds.has(
            String(studentId)
          ) ||
          !STATUSES.includes(status)
        ) {
          return failure(
            res,
            400,
            "Invalid student or attendance status."
          );
        }

        if (seen.has(String(studentId))) {
          return failure(
            res,
            400,
            "Duplicate student attendance entries are not allowed."
          );
        }

        seen.add(String(studentId));

        entries.push({
          student: studentId,
          status,
        });
      }

      const filter = {
        course: course._id,
        semester: course.semester,
        date,
      };

      let record =
        await Attendance.findOne(filter);

      if (record) {
        if (
          idOf(record.faculty) !==
          idOf(identity.user)
        ) {
          return failure(
            res,
            409,
            "This attendance session was saved by another Faculty account."
          );
        }

        record.students = entries;
        await record.save();
      } else {
        record = await Attendance.create({
          ...filter,
          faculty: identity.user._id,
          students: entries,
        });
      }

      return res.json({
        success: true,
        message:
          "Attendance saved successfully in MongoDB.",
        data: {
          id: idOf(record),
          courseId:
            idOf(record.course),
          semester:
            record.semester,
          date:
            record.date,
          students:
            record.students.map(
              (item) => ({
                studentId:
                  idOf(item.student),
                status:
                  item.status,
              })
            ),
          summary:
            summarize(record.students),
          savedAt:
            record.updatedAt,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// STUDENT ROUTES
// ========================================

// GET /api/attendance/student/my
router.get(
  "/student/my",
  authorize("student"),
  async (req, res) => {
    try {
      const identity =
        await resolveStudent(req);

      if (!identity) {
        return failure(
          res,
          403,
          "Student account is not linked to a Student profile."
        );
      }

      const studentId =
        identity.student._id;

      const records =
        await Attendance.find({
          "students.student": studentId,
        })
          .populate(
            "course",
            "courseCode courseTitle semester"
          )
          .sort({
            date: -1,
          })
          .lean();

      const data = records
        .map((record) => {
          const entry =
            record.students.find(
              (item) =>
                idOf(item.student) ===
                idOf(studentId)
            );

          if (!entry) return null;

          return {
            id: idOf(record),
            date: record.date,
            semester:
              record.semester,
            course: record.course
              ? {
                  id: idOf(
                    record.course
                  ),
                  code:
                    record.course.courseCode,
                  title:
                    record.course.courseTitle,
                }
              : null,
            status: entry.status,
          };
        })
        .filter(Boolean);

      return res.json({
        success: true,
        student: {
          id: idOf(
            identity.student
          ),
          studentId:
            identity.student.studentId ||
            "",
          name:
            identity.student.fullName ||
            "",
        },
        data,
        summary: summarize(data),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// STUDENT ATTENDANCE SUMMARY
// ========================================

// GET /api/attendance/student/summary
router.get(
  "/student/summary",
  authorize("student"),
  async (req, res) => {
    try {
      const identity =
        await resolveStudent(req);

      if (!identity) {
        return failure(
          res,
          403,
          "Student account is not linked to a Student profile."
        );
      }

      const studentId =
        identity.student._id;

      const records =
        await Attendance.find({
          "students.student": studentId,
        })
          .select(
            "course semester date students"
          )
          .lean();

      const entries = [];

      for (const record of records) {
        const item =
          record.students.find(
            (entry) =>
              idOf(entry.student) ===
              idOf(studentId)
          );

        if (item) {
          entries.push({
            status: item.status,
          });
        }
      }

      return res.json({
        success: true,
        data: summarize(entries),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// EXPORT
// ========================================

module.exports = router;
