
const express = require("express");
const mongoose = require("mongoose");

const Department = require("../models/Department");
const Course = require("../models/Course");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// AUTHENTICATION & ROLE PERMISSIONS
// ========================================

router.use(protect);

// Admin retains all existing academic operations.
// HOD can read departments/courses and assign faculty.
// Faculty can read departments/courses.
// Exam Controller can read departments/courses.
// All other operations remain Admin-only.
router.use((req, res, next) => {
  const isAcademicRead =
    req.method === "GET" &&
    (req.path === "/departments" ||
      req.path === "/courses");

  if (isAcademicRead) {
    return authorize(
      "admin",
      "hod",
      "faculty",
      "exam-controller"
    )(req, res, next);
  }

  const isFacultyAssignment =
    req.method === "PATCH" &&
    /^\/courses\/[^/]+\/faculty$/.test(req.path);

  if (isFacultyAssignment) {
    return authorize("admin", "hod")(
      req,
      res,
      next
    );
  }

  return authorize("admin")(req, res, next);
});

// ========================================
// HELPERS
// ========================================

const validId = (id) =>
  mongoose.isValidObjectId(id);

const sendError = (res, error) => {
  console.error("Academic API:", error.message);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "This code or name already exists.",
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors)
        .map((e) => e.message)
        .join(" "),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid data provided.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Academic operation failed.",
  });
};

const pick = (body, fields) => {
  const result = {};

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return result;
  }

  for (const field of fields) {
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        field
      )
    ) {
      result[field] = body[field];
    }
  }

  return result;
};

const format = (doc) => {
  const data =
    typeof doc.toObject === "function"
      ? doc.toObject()
      : doc;

  return {
    ...data,
    id: String(data._id),
  };
};

const departmentFields = [
  "code",
  "name",
  "description",
  "status",
];

const courseFields = [
  "courseCode",
  "courseTitle",
  "department",
  "credits",
  "semester",
  "description",
  "status",
];

// ========================================
// DEPARTMENT CRUD
// ========================================

// GET /api/academic/departments
router.get("/departments", async (req, res) => {
  try {
    const records = await Department.find()
      .sort({ name: 1 })
      .lean();

    return res.json({
      success: true,
      data: records.map(format),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// POST /api/academic/departments
router.post("/departments", async (req, res) => {
  try {
    const data = pick(req.body, departmentFields);

    const created = await Department.create(data);

    return res.status(201).json({
      success: true,
      message: "Department created.",
      data: format(created),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// PUT /api/academic/departments/:id
router.put("/departments/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Department ID.",
      });
    }

    const updates = pick(req.body, departmentFields);

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: "No valid update fields.",
      });
    }

    const updated = await Department.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    return res.json({
      success: true,
      message: "Department updated.",
      data: format(updated),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// DELETE /api/academic/departments/:id
router.delete("/departments/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Department ID.",
      });
    }

    const department = await Department.findById(
      req.params.id
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    const [hasCourses, hasFaculty, hasStudents] =
      await Promise.all([
        Course.exists({
          department: department.name,
        }),
        Faculty.exists({
          department: department.name,
        }),
        Student.exists({
          department: department.name,
        }),
      ]);

    if (hasCourses || hasFaculty || hasStudents) {
      return res.status(409).json({
        success: false,
        message:
          "Department has linked records. Remove or reassign them first.",
      });
    }

    await Department.findByIdAndDelete(
      department._id
    );

    return res.json({
      success: true,
      message: "Department deleted.",
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// COURSE CRUD
// ========================================

// GET /api/academic/courses
router.get("/courses", async (req, res) => {
  try {
    const courses = await Course.find()
      .populate(
        "faculty",
        "facultyId name email designation"
      )
      .populate(
        "enrolledStudents",
        "studentId fullName email"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: courses.map(format),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// POST /api/academic/courses
router.post("/courses", async (req, res) => {
  try {
    const data = pick(req.body, courseFields);

    const department = await Department.findOne({
      name: data.department,
      status: "Active",
    });

    if (!department) {
      return res.status(400).json({
        success: false,
        message: "Select an existing active department.",
      });
    }

    const course = await Course.create(data);

    return res.status(201).json({
      success: true,
      message: "Course created.",
      data: format(course),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// PUT /api/academic/courses/:id
router.put("/courses/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Course ID.",
      });
    }

    const updates = pick(req.body, courseFields);

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: "No valid update fields.",
      });
    }

    if (updates.department !== undefined) {
      const department = await Department.findOne({
        name: updates.department,
        status: "Active",
      });

      if (!department) {
        return res.status(400).json({
          success: false,
          message: "Select an existing active department.",
        });
      }

      const existing = await Course.findById(
        req.params.id
      );

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
        });
      }

      if (
        existing.department !== updates.department &&
        (
          existing.faculty ||
          existing.enrolledStudents.length
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Reassign faculty and remove enrollments before changing course department.",
        });
      }
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.json({
      success: true,
      message: "Course updated.",
      data: format(course),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// DELETE /api/academic/courses/:id
router.delete("/courses/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Course ID.",
      });
    }

    const course = await Course.findById(
      req.params.id
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    if (course.enrolledStudents.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Remove enrolled students before deleting this course.",
      });
    }

    await course.deleteOne();

    return res.json({
      success: true,
      message: "Course deleted.",
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// ASSIGN FACULTY TO COURSE
// ========================================

// PATCH /api/academic/courses/:id/faculty
// Allowed roles: admin, hod

router.patch(
  "/courses/:id/faculty",
  async (req, res) => {
    try {
      const { id } = req.params;
      const { facultyId } = req.body || {};

      if (
        !validId(id) ||
        (
          facultyId !== null &&
          facultyId !== undefined &&
          !validId(facultyId)
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid Course or Faculty ID.",
        });
      }

      const course = await Course.findById(id);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
        });
      }

      if (facultyId) {
        const faculty = await Faculty.findById(
          facultyId
        );

        if (!faculty) {
          return res.status(404).json({
            success: false,
            message: "Faculty not found.",
          });
        }

        if (
          faculty.department !== course.department
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Faculty and course departments must match.",
          });
        }

        if (faculty.status !== "Active") {
          return res.status(400).json({
            success: false,
            message: "Faculty must be active.",
          });
        }

        if (course.status !== "Active") {
          return res.status(400).json({
            success: false,
            message:
              "Only active courses can receive faculty assignments.",
          });
        }

        course.faculty = faculty._id;
      } else {
        course.faculty = null;
      }

      await course.save();

      return res.json({
        success: true,
        message:
          "Course faculty assignment updated.",
        data: format(course),
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

// ========================================
// ENROLL STUDENT IN COURSE
// ========================================

// POST /api/academic/courses/:id/enroll
router.post(
  "/courses/:id/enroll",
  async (req, res) => {
    try {
      const { id } = req.params;
      const { studentId } = req.body || {};

      if (
        !validId(id) ||
        !validId(studentId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Course or Student ID.",
        });
      }

      const [course, student] =
        await Promise.all([
          Course.findById(id),
          Student.findById(studentId),
        ]);

      if (!course || !student) {
        return res.status(404).json({
          success: false,
          message:
            "Course or Student not found.",
        });
      }

      if (
        course.status !== "Active" ||
        student.status !== "Active"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Course and student must be active.",
        });
      }

      if (
        course.department !== student.department
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Student and course departments must match.",
        });
      }

      const updated =
        await Course.findByIdAndUpdate(
          id,
          {
            $addToSet: {
              enrolledStudents: student._id,
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

      return res.json({
        success: true,
        message: "Student enrollment saved.",
        data: format(updated),
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

// ========================================
// REMOVE STUDENT ENROLLMENT
// ========================================

// DELETE /api/academic/courses/:id/enroll/:studentId
router.delete(
  "/courses/:id/enroll/:studentId",
  async (req, res) => {
    try {
      const { id, studentId } = req.params;

      if (
        !validId(id) ||
        !validId(studentId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid record ID.",
        });
      }

      const course =
        await Course.findByIdAndUpdate(
          id,
          {
            $pull: {
              enrolledStudents: studentId,
            },
          },
          { new: true }
        );

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
        });
      }

      return res.json({
        success: true,
        message: "Student removed from course.",
        data: format(course),
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

// ========================================
// EXPORT
// ========================================

module.exports = router;
