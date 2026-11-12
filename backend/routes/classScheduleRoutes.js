
const express = require("express");
const mongoose = require("mongoose");

const ClassSchedule = require("../models/ClassSchedule");
const Course = require("../models/Course");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const Department = require("../models/Department");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// ========================================
// UNIBEE CLASS SCHEDULE API
// HOD → FACULTY → STUDENT
// ========================================

const router = express.Router();

router.use(protect);

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const TIME_PATTERN =
  /^([01]\d|2[0-3]):[0-5]\d$/;

// ========================================
// HELPERS
// ========================================

function clean(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalize(value) {
  return clean(value).toLowerCase();
}

function exact(value) {
  const escaped = value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  return new RegExp(
    `^${escaped}$`,
    "i"
  );
}

function getId(value) {
  return String(
    value?._id || value || ""
  );
}

function validId(value) {
  return mongoose.isValidObjectId(value);
}

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function handleError(res, error) {
  console.error(
    "Class Schedule API:",
    error
  );

  if (error.name === "ValidationError") {
    return fail(
      res,
      400,
      Object.values(error.errors)
        .map((item) => item.message)
        .join(" ")
    );
  }

  if (error.name === "CastError") {
    return fail(
      res,
      400,
      "Invalid record ID."
    );
  }

  return fail(
    res,
    500,
    "Unable to complete class schedule operation."
  );
}

function validTime(value) {
  return (
    typeof value === "string" &&
    TIME_PATTERN.test(value)
  );
}

function validScheduleTime(start, end) {
  return (
    validTime(start) &&
    validTime(end) &&
    start < end
  );
}

function overlaps(first, second) {
  return (
    first.startTime < second.endTime &&
    first.endTime > second.startTime
  );
}

function departmentFilter(department) {
  return {
    department: {
      $in: [
        exact(department.name),
        exact(department.code),
      ],
    },
  };
}

function departmentMatches(
  value,
  department
) {
  return [
    department.name,
    department.code,
  ].some(
    (item) =>
      normalize(value) ===
      normalize(item)
  );
}

// ========================================
// ACCOUNT VALIDATION
// ========================================

async function getActiveUser(req) {
  if (!validId(req.user?._id)) {
    return null;
  }

  return User.findOne({
    _id: req.user._id,
    role: req.user.role,
    status: "Active",
    isActive: true,
  }).lean();
}

// ========================================
// HOD DEPARTMENT SCOPE
// ========================================

async function getHODScope(req) {
  const user = await getActiveUser(req);

  if (!user || user.role !== "hod") {
    return null;
  }

  const assigned = clean(user.department);

  if (!assigned) {
    return null;
  }

  const department =
    await Department.findOne({
      $or: [
        { code: exact(assigned) },
        { name: exact(assigned) },
      ],
    }).lean();

  if (!department) {
    return null;
  }

  return {
    user,
    department,
  };
}

// ========================================
// FACULTY PROFILE RESOLUTION
// ========================================

async function getFacultyScope(req) {
  const user = await getActiveUser(req);

  if (!user || user.role !== "faculty") {
    return null;
  }

  const byUser = await Faculty.findOne({
    userId: user._id,
    status: "Active",
  }).lean();

  const byProfile = validId(user.profileId)
    ? await Faculty.findOne({
        _id: user.profileId,
        status: "Active",
      }).lean()
    : null;

  if (
    byUser &&
    byProfile &&
    getId(byUser) !== getId(byProfile)
  ) {
    return null;
  }

  const faculty = byUser || byProfile;

  if (!faculty) return null;

  if (
    faculty.userId &&
    getId(faculty.userId) !== getId(user)
  ) {
    return null;
  }

  return {
    user,
    faculty,
  };
}

// ========================================
// STUDENT PROFILE RESOLUTION
// ========================================

async function getStudentScope(req) {
  const user = await getActiveUser(req);

  if (!user || user.role !== "student") {
    return null;
  }

  const byUser = await Student.findOne({
    userId: user._id,
  }).lean();

  const byProfile = validId(user.profileId)
    ? await Student.findById(
        user.profileId
      ).lean()
    : null;

  if (
    byUser &&
    byProfile &&
    getId(byUser) !== getId(byProfile)
  ) {
    return null;
  }

  const student = byUser || byProfile;

  if (!student) return null;

  if (
    student.userId &&
    getId(student.userId) !== getId(user)
  ) {
    return null;
  }

  if (
    student.status &&
    student.status !== "Active"
  ) {
    return null;
  }

  return {
    user,
    student,
  };
}

// ========================================
// RESPONSE FORMATTING
// ========================================

function formatSchedule(item) {
  const row =
    typeof item.toObject === "function"
      ? item.toObject()
      : item;

  const course =
    row.course &&
    typeof row.course === "object"
      ? row.course
      : null;

  const faculty =
    row.faculty &&
    typeof row.faculty === "object"
      ? row.faculty
      : null;

  return {
    id: getId(row),

    department: row.department,
    semester: row.semester,
    section: row.section,
    academicSession:
      row.academicSession,

    day: row.day,
    startTime: row.startTime,
    endTime: row.endTime,

    room: row.room,
    notes: row.notes,
    status: row.status,

    courseId: getId(row.course),
    courseCode:
      course?.courseCode || "",
    courseTitle:
      course?.courseTitle || "",

    facultyId: getId(row.faculty),
    facultyName:
      faculty?.name || "",

    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function populateSchedule(query) {
  return query
    .populate(
      "course",
      "courseCode courseTitle department semester"
    )
    .populate(
      "faculty",
      "facultyId name department designation"
    );
}

// ========================================
// CONFLICT DETECTION
// ========================================

async function findConflicts(
  candidate,
  ignoreId = null
) {
  const existing =
    await ClassSchedule.find({
      day: candidate.day,
      status: "Active",

      ...(ignoreId
        ? {
            _id: {
              $ne: ignoreId,
            },
          }
        : {}),
    }).lean();

  const conflicts = [];

  for (const row of existing) {
    if (
      normalize(row.academicSession) !==
      normalize(
        candidate.academicSession
      )
    ) {
      continue;
    }

    if (!overlaps(candidate, row)) {
      continue;
    }

    const reasons = [];

    // Same physical room:
    // Check across departments.

    if (
      normalize(candidate.room) ===
      normalize(row.room)
    ) {
      reasons.push("Room conflict");
    }

    // Faculty cannot teach overlapping
    // classes, even across departments.

    if (
      getId(candidate.faculty) ===
      getId(row.faculty)
    ) {
      reasons.push("Faculty conflict");
    }

    // Same department, semester
    // and non-empty section.

    if (
      normalize(candidate.department) ===
        normalize(row.department) &&
      normalize(candidate.semester) ===
        normalize(row.semester) &&
      normalize(candidate.section) &&
      normalize(candidate.section) ===
        normalize(row.section)
    ) {
      reasons.push("Section conflict");
    }

    // Prevent an overlapping class for
    // the same course and section.

    if (
      getId(candidate.course) ===
        getId(row.course) &&
      normalize(candidate.section) ===
        normalize(row.section)
    ) {
      reasons.push("Course conflict");
    }

    if (reasons.length > 0) {
      conflicts.push({
        id: getId(row),
        day: row.day,
        startTime: row.startTime,
        endTime: row.endTime,
        room: row.room,
        reasons,
      });
    }
  }

  return conflicts;
}

// ========================================
// HOD COURSE / FACULTY VALIDATION
// ========================================

async function validateHODSelection(
  department,
  courseId,
  facultyId
) {
  if (
    !validId(courseId) ||
    !validId(facultyId)
  ) {
    return {
      error:
        "Select a valid course and faculty member.",
    };
  }

  const [course, faculty] =
    await Promise.all([
      Course.findOne({
        _id: courseId,
        status: "Active",
        ...departmentFilter(department),
      }).lean(),

      Faculty.findOne({
        _id: facultyId,
        status: "Active",
        ...departmentFilter(department),
      }).lean(),
    ]);

  if (!course) {
    return {
      error:
        "Course is not active or does not belong to your department.",
    };
  }

  if (!faculty) {
    return {
      error:
        "Faculty is not active or does not belong to your department.",
    };
  }

  // Course Allocation is authoritative.
  // HOD must allocate the course first.

  if (
    !course.faculty ||
    getId(course.faculty) !==
      getId(faculty)
  ) {
    return {
      error:
        "This faculty member is not allocated to the selected course. Complete Course Allocation first.",
    };
  }

  return {
    course,
    faculty,
  };
}

// ========================================
// VALIDATE SCHEDULE FORM
// ========================================

function validateForm(body) {
  const day = clean(body.day);
  const startTime = clean(
    body.startTime
  );

  const endTime = clean(
    body.endTime
  );

  const room = clean(body.room);

  const academicSession = clean(
    body.academicSession
  );

  const section = clean(
    body.section
  );

  const notes = clean(
    body.notes
  );

  if (!DAYS.includes(day)) {
    return {
      error: "Choose a valid class day.",
    };
  }

  if (
    !validScheduleTime(
      startTime,
      endTime
    )
  ) {
    return {
      error:
        "End time must be later than start time. Use HH:mm format.",
    };
  }

  if (
    !room ||
    room.length > 80
  ) {
    return {
      error:
        "Room is required (maximum 80 characters).",
    };
  }

  if (
    !academicSession ||
    academicSession.length > 80
  ) {
    return {
      error:
        "Academic session is required (maximum 80 characters).",
    };
  }

  if (section.length > 60) {
    return {
      error:
        "Section cannot exceed 60 characters.",
    };
  }

  if (notes.length > 1000) {
    return {
      error:
        "Notes cannot exceed 1000 characters.",
    };
  }

  return {
    values: {
      day,
      startTime,
      endTime,
      room,
      section,
      academicSession,
      notes,
    },
  };
}

// ========================================
// HOD — BOOTSTRAP DATA
// GET /api/class-schedules/hod/bootstrap
// ========================================

router.get(
  "/hod/bootstrap",
  authorize("hod"),
  async (req, res) => {
    try {
      const scope =
        await getHODScope(req);

      if (!scope) {
        return fail(
          res,
          403,
          "Your HOD account has no valid assigned department."
        );
      }

      const filter =
        departmentFilter(
          scope.department
        );

      const [courses, faculty] =
        await Promise.all([
          Course.find({
            ...filter,
            status: "Active",
          })
            .sort({
              courseCode: 1,
            })
            .lean(),

          Faculty.find({
            ...filter,
            status: "Active",
          })
            .sort({
              name: 1,
            })
            .lean(),
        ]);

      return res.json({
        success: true,

        department: {
          id: getId(scope.department),
          name: scope.department.name,
          code: scope.department.code,
        },

        courses: courses.map(
          (item) => ({
            id: getId(item),
            code: item.courseCode,
            title: item.courseTitle,
            semester: item.semester,
            department: item.department,
            facultyId:
              getId(item.faculty) || "",
          })
        ),

        faculty: faculty.map(
          (item) => ({
            id: getId(item),
            facultyId: item.facultyId,
            name: item.name,
            department: item.department,
            designation:
              item.designation,
          })
        ),
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);

// ========================================
// HOD — DEPARTMENT ROUTINE
// GET /api/class-schedules/hod/my
// ========================================

router.get(
  "/hod/my",
  authorize("hod"),
  async (req, res) => {
    try {
      const scope =
        await getHODScope(req);

      if (!scope) {
        return fail(
          res,
          403,
          "HOD department verification failed."
        );
      }

      const records =
        await populateSchedule(
          ClassSchedule.find({
            ...departmentFilter(
              scope.department
            ),
          })
        )
          .sort({
            day: 1,
            startTime: 1,
          })
          .lean();

      return res.json({
        success: true,
        data: records.map(
          formatSchedule
        ),
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);

// ========================================
// HOD — CREATE CLASS
// POST /api/class-schedules/hod
// ========================================

router.post(
  "/hod",
  authorize("hod"),
  async (req, res) => {
    try {
      const scope =
        await getHODScope(req);

      if (!scope) {
        return fail(
          res,
          403,
          "HOD department verification failed."
        );
      }

      const body =
        req.body || {};

      const selection =
        await validateHODSelection(
          scope.department,
          body.courseId,
          body.facultyId
        );

      if (selection.error) {
        return fail(
          res,
          400,
          selection.error
        );
      }

      const checked =
        validateForm(body);

      if (checked.error) {
        return fail(
          res,
          400,
          checked.error
        );
      }

      // Use the verified Course semester.
      // Never trust a manually supplied
      // semester that differs from Course.

      const candidate = {
        course: selection.course._id,
        faculty: selection.faculty._id,

        department:
          scope.department.name,

        semester:
          selection.course.semester,

        ...checked.values,
      };

      const conflicts =
        await findConflicts(
          candidate
        );

      if (conflicts.length) {
        return res.status(409).json({
          success: false,
          message:
            "Scheduling conflict detected. Change the time, room, faculty, or section.",
          conflicts,
        });
      }

      const record =
        await ClassSchedule.create({
          ...candidate,
          status: "Active",
          createdBy: scope.user._id,
        });

      await record.populate([
        {
          path: "course",
          select:
            "courseCode courseTitle department semester",
        },
        {
          path: "faculty",
          select:
            "facultyId name department designation",
        },
      ]);

      return res.status(201).json({
        success: true,
        message:
          "Class schedule created successfully.",
        data: formatSchedule(
          record
        ),
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);

// ========================================
// HOD — UPDATE CLASS
// PUT /api/class-schedules/hod/:id
// ========================================

router.put(
  "/hod/:id",
  authorize("hod"),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return fail(
          res,
          400,
          "Invalid schedule ID."
        );
      }

      const scope =
        await getHODScope(req);

      if (!scope) {
        return fail(
          res,
          403,
          "HOD department verification failed."
        );
      }

      const record =
        await ClassSchedule.findOne({
          _id: req.params.id,
          ...departmentFilter(
            scope.department
          ),
        });

      if (!record) {
        return fail(
          res,
          404,
          "Schedule not found in your department."
        );
      }

      const body =
        req.body || {};

      const selection =
        await validateHODSelection(
          scope.department,
          body.courseId,
          body.facultyId
        );

      if (selection.error) {
        return fail(
          res,
          400,
          selection.error
        );
      }

      const checked =
        validateForm(body);

      if (checked.error) {
        return fail(
          res,
          400,
          checked.error
        );
      }

      const candidate = {
        course: selection.course._id,
        faculty: selection.faculty._id,

        department:
          scope.department.name,

        semester:
          selection.course.semester,

        ...checked.values,
      };

      const conflicts =
        await findConflicts(
          candidate,
          record._id
        );

      if (conflicts.length) {
        return res.status(409).json({
          success: false,
          message:
            "Scheduling conflict detected. Resolve the overlap before saving.",
          conflicts,
        });
      }

      Object.assign(
        record,
        candidate
      );

      record.updatedBy =
        scope.user._id;

      await record.save();

      await record.populate([
        {
          path: "course",
          select:
            "courseCode courseTitle department semester",
        },
        {
          path: "faculty",
          select:
            "facultyId name department designation",
        },
      ]);

      return res.json({
        success: true,
        message:
          "Class schedule updated successfully.",
        data: formatSchedule(
          record
        ),
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);

// ========================================
// HOD — DELETE CLASS
// DELETE /api/class-schedules/hod/:id
// ========================================

router.delete(
  "/hod/:id",
  authorize("hod"),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return fail(
          res,
          400,
          "Invalid schedule ID."
        );
      }

      const scope =
        await getHODScope(req);

      if (!scope) {
        return fail(
          res,
          403,
          "HOD department verification failed."
        );
      }

      const deleted =
        await ClassSchedule.findOneAndDelete({
          _id: req.params.id,
          ...departmentFilter(
            scope.department
          ),
        });

      if (!deleted) {
        return fail(
          res,
          404,
          "Schedule not found in your department."
        );
      }

      return res.json({
        success: true,
        message:
          "Class schedule deleted successfully.",
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);

// ========================================
// FACULTY — MY WEEKLY CLASSES
// GET /api/class-schedules/faculty/my
// ========================================

router.get(
  "/faculty/my",
  authorize("faculty"),
  async (req, res) => {
    try {
      const scope =
        await getFacultyScope(req);

      if (!scope) {
        return fail(
          res,
          403,
          "Faculty account is not linked to an active Faculty profile."
        );
      }

      const records =
        await populateSchedule(
          ClassSchedule.find({
            faculty:
              scope.faculty._id,
            status: "Active",
          })
        )
          .sort({
            day: 1,
            startTime: 1,
          })
          .lean();

      // Only show classes where
      // current Course Allocation still
      // points to this Faculty.

      const data = records
        .filter(
          (item) =>
            item.course &&
            getId(item.course.faculty ||
              item.faculty) ===
              getId(scope.faculty)
        )
        .map(formatSchedule);

      return res.json({
        success: true,
        faculty: {
          id: getId(
            scope.faculty
          ),
          name:
            scope.faculty.name,
          facultyId:
            scope.faculty.facultyId,
        },
        total: data.length,
        data,
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);

// ========================================
// STUDENT — MY WEEKLY ROUTINE
// GET /api/class-schedules/student/my
// ========================================

router.get(
  "/student/my",
  authorize("student"),
  async (req, res) => {
    try {
      const scope =
        await getStudentScope(req);

      if (!scope) {
        return fail(
          res,
          403,
          "Student account is not linked to an active Student profile."
        );
      }

      const enrollments =
        await Enrollment.find({
          student:
            scope.student._id,
          status: "Approved",
        })
          .select(
            "course semester"
          )
          .lean();

      if (!enrollments.length) {
        return res.json({
          success: true,
          total: 0,
          data: [],
        });
      }

      const conditions =
        enrollments.map(
          (item) => ({
            course: item.course,
            semester: item.semester,
          })
        );

      const records =
        await populateSchedule(
          ClassSchedule.find({
            $or: conditions,
            status: "Active",

            // Student section mapping
            // is not available yet.
            // Only common classes.

            section: "",
          })
        )
          .sort({
            day: 1,
            startTime: 1,
          })
          .lean();

      const data = records.map(
        formatSchedule
      );

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);

// ========================================
// STUDENT — TODAY'S CLASSES
// GET /api/class-schedules/student/today
// ========================================

router.get(
  "/student/today",
  authorize("student"),
  async (req, res) => {
    try {
      const scope =
        await getStudentScope(req);

      if (!scope) {
        return fail(
          res,
          403,
          "Student profile link is missing."
        );
      }

      const today = new Date();

      const dayName =
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone:
              "Asia/Dhaka",
            weekday: "long",
          }
        ).format(today);

      const enrollments =
        await Enrollment.find({
          student:
            scope.student._id,
          status: "Approved",
        })
          .select(
            "course semester"
          )
          .lean();

      if (!enrollments.length) {
        return res.json({
          success: true,
          day: dayName,
          total: 0,
          data: [],
        });
      }

      const records =
        await populateSchedule(
          ClassSchedule.find({
            $or: enrollments.map(
              (item) => ({
                course: item.course,
                semester:
                  item.semester,
              })
            ),
            day: dayName,
            status: "Active",
            section: "",
          })
        )
          .sort({
            startTime: 1,
          })
          .lean();

      return res.json({
        success: true,
        day: dayName,
        total: records.length,
        data: records.map(
          formatSchedule
        ),
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);

// ========================================
// EXPORT
// ========================================

module.exports = router;
