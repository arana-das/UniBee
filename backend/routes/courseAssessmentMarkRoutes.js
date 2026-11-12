
const express = require("express");
const mongoose = require("mongoose");

const CourseAssessmentMark = require(
  "../models/CourseAssessmentMark"
);
const Course = require("../models/Course");
const Student = require("../models/Student");
const Enrollment = require("../models/Enrollment");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

const TYPES = [
  "Quiz",
  "Class Test",
  "Midterm",
  "Final",
  "Attendance",
  "Other",
];

const isId = (value) =>
  mongoose.isValidObjectId(value);

const clean = (value) =>
  String(value ?? "").trim();

function fail(res, code, message) {
  return res.status(code).json({
    success: false,
    message,
  });
}

function format(doc) {
  const value =
    typeof doc.toObject === "function"
      ? doc.toObject()
      : doc;

  return {
    ...value,
    id: String(value._id),
  };
}

function handleError(res, error) {
  console.error(
    "Course Assessment Marks API:",
    error
  );

  if (error.code === 11000) {
    return fail(
      res,
      409,
      "This student already has marks for that assessment."
    );
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return fail(res, 400, error.message);
  }

  return fail(
    res,
    500,
    "Unable to process assessment marks."
  );
}

function populated(query) {
  return query
    .populate(
      "student",
      "studentId fullName department batch"
    )
    .populate(
      "course",
      "courseCode courseTitle department semester"
    )
    .lean();
}

// ========================================
// STUDENT — OWN PUBLISHED MARKS
// GET /api/course-assessment-marks/my/:courseId
// ========================================

router.get(
  "/my/:courseId",
  authorize("student"),
  async (req, res) => {
    try {
      if (!isId(req.params.courseId)) {
        return fail(
          res,
          400,
          "Invalid Course ID."
        );
      }

      let student = null;

      if (isId(req.user.profileId)) {
        student = await Student.findById(
          req.user.profileId
        ).lean();
      }

      if (!student && req.user.email) {
        student = await Student.findOne({
          email: clean(
            req.user.email
          ).toLowerCase(),
        }).lean();
      }

      if (
        !student ||
        student.status !== "Active"
      ) {
        return fail(
          res,
          403,
          "Your login is not linked to an active student profile."
        );
      }

      const enrollments =
        await Enrollment.find({
          student: student._id,
          course: req.params.courseId,
          status: "Approved",
        })
          .select("semester")
          .lean();

      if (!enrollments.length) {
        return fail(
          res,
          403,
          "You are not approved for this course."
        );
      }

      const records = await populated(
        CourseAssessmentMark.find({
          student: student._id,
          course: req.params.courseId,
          semester: {
            $in: enrollments.map(
              (item) => item.semester
            ),
          },
          status: "Published",
        }).sort({
          assessmentDate: 1,
          assessmentType: 1,
          assessmentName: 1,
        })
      );

      return res.json({
        success: true,
        count: records.length,
        data: records.map(format),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// EXAM CONTROLLER / ADMIN ACCESS
// ========================================

router.use(
  authorize("exam-controller", "admin")
);

// ========================================
// GET ACTIVE COURSES
// GET /api/course-assessment-marks/courses
// ========================================

router.get("/courses", async (req, res) => {
  try {
    const courses = await Course.find({
      status: "Active",
    })
      .select(
        "courseCode courseTitle department semester"
      )
      .sort({
        department: 1,
        courseCode: 1,
      })
      .lean();

    return res.json({
      success: true,
      count: courses.length,
      data: courses.map(format),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// GET APPROVED STUDENTS BY COURSE
// GET /api/course-assessment-marks/students
// ?courseId=...
// ========================================

router.get("/students", async (req, res) => {
  try {
    if (!isId(req.query.courseId)) {
      return fail(
        res,
        400,
        "A valid courseId is required."
      );
    }

    const course = await Course.findById(
      req.query.courseId
    ).lean();

    if (!course) {
      return fail(
        res,
        404,
        "Course not found."
      );
    }

    const enrollments = await Enrollment.find({
      course: course._id,
      semester: course.semester,
      status: "Approved",
    })
      .populate(
        "student",
        "studentId fullName status department batch"
      )
      .lean();

    const students = enrollments
      .filter(
        (item) =>
          item.student &&
          item.student.status === "Active"
      )
      .map((item) => ({
        ...format(item.student),
        semester: item.semester,
      }));

    return res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// GET ALL ASSESSMENT MARKS
// GET /api/course-assessment-marks
// ========================================

router.get("/", async (req, res) => {
  try {
    const query = {};

    if (req.query.courseId) {
      if (!isId(req.query.courseId)) {
        return fail(
          res,
          400,
          "Invalid Course ID."
        );
      }

      query.course = req.query.courseId;
    }

    if (req.query.studentId) {
      const student = await Student.findOne({
        studentId: clean(
          req.query.studentId
        ).toUpperCase(),
      }).lean();

      if (!student) {
        return res.json({
          success: true,
          count: 0,
          data: [],
        });
      }

      query.student = student._id;
    }

    if (req.query.status) {
      if (
        !["Draft", "Published"].includes(
          req.query.status
        )
      ) {
        return fail(
          res,
          400,
          "Invalid status filter."
        );
      }

      query.status = req.query.status;
    }

    if (req.query.assessmentType) {
      if (
        !TYPES.includes(
          req.query.assessmentType
        )
      ) {
        return fail(
          res,
          400,
          "Invalid assessment type."
        );
      }

      query.assessmentType =
        req.query.assessmentType;
    }

    const records = await populated(
      CourseAssessmentMark.find(query)
        .sort({ createdAt: -1 })
        .limit(1000)
    );

    return res.json({
      success: true,
      count: records.length,
      data: records.map(format),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// VALIDATE ASSESSMENT MARKS
// ========================================

async function prepareInput(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new Error("Invalid request body.");
  }

  if (!isId(body.courseId)) {
    throw new Error(
      "Choose a valid Course."
    );
  }

  const course = await Course.findOne({
    _id: body.courseId,
    status: "Active",
  }).lean();

  if (!course) {
    throw new Error(
      "Active Course not found."
    );
  }

  const studentReference = clean(
    body.studentId
  );

  const student = isId(studentReference)
    ? await Student.findById(
        studentReference
      ).lean()
    : await Student.findOne({
        studentId:
          studentReference.toUpperCase(),
      }).lean();

  if (
    !student ||
    student.status !== "Active"
  ) {
    throw new Error(
      "Active Student not found."
    );
  }

  const enrolled = await Enrollment.exists({
    course: course._id,
    student: student._id,
    semester: course.semester,
    status: "Approved",
  });

  if (!enrolled) {
    throw new Error(
      "Student has no approved enrollment for this Course and semester."
    );
  }

  const assessmentType = clean(
    body.assessmentType
  );

  const assessmentName = clean(
    body.assessmentName
  );

  if (!TYPES.includes(assessmentType)) {
    throw new Error(
      "Choose a valid assessment type."
    );
  }

  if (
    !assessmentName ||
    assessmentName.length > 100
  ) {
    throw new Error(
      "Assessment name is required (maximum 100 characters)."
    );
  }

  const obtainedMarks = Number(
    body.obtainedMarks
  );

  const maximumMarks = Number(
    body.maximumMarks
  );

  if (
    body.obtainedMarks === "" ||
    body.maximumMarks === "" ||
    !Number.isFinite(obtainedMarks) ||
    !Number.isFinite(maximumMarks) ||
    maximumMarks <= 0 ||
    obtainedMarks < 0 ||
    obtainedMarks > maximumMarks
  ) {
    throw new Error(
      "Marks must satisfy 0 <= obtained marks <= maximum marks, and maximum > 0."
    );
  }

  let assessmentDate = null;

  if (body.assessmentDate) {
    if (
      typeof body.assessmentDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        body.assessmentDate
      )
    ) {
      throw new Error(
        "Date must use YYYY-MM-DD."
      );
    }

    assessmentDate = new Date(
      `${body.assessmentDate}T00:00:00.000Z`
    );

    if (
      Number.isNaN(
        assessmentDate.getTime()
      ) ||
      assessmentDate
        .toISOString()
        .slice(0, 10) !==
        body.assessmentDate
    ) {
      throw new Error(
        "Invalid assessment date."
      );
    }
  }

  const remarks = clean(body.remarks);

  if (remarks.length > 500) {
    throw new Error(
      "Remarks cannot exceed 500 characters."
    );
  }

  return {
    course: course._id,
    student: student._id,
    semester: course.semester,
    assessmentType,
    assessmentName,
    assessmentDate,
    obtainedMarks,
    maximumMarks,
    remarks,
  };
}

// ========================================
// CREATE DRAFT MARKS
// POST /api/course-assessment-marks
// ========================================

router.post("/", async (req, res) => {
  let input;

  try {
    input = await prepareInput(req.body);
  } catch (error) {
    return fail(
      res,
      400,
      error.message
    );
  }

  try {
    const record =
      await CourseAssessmentMark.create({
        ...input,
        status: "Draft",
        createdBy: req.user._id,
        updatedBy: req.user._id,
      });

    return res.status(201).json({
      success: true,
      message: "Draft marks saved.",
      data: format(record),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// UPDATE DRAFT MARKS
// PUT /api/course-assessment-marks/:id
// ========================================

router.put("/:id", async (req, res) => {
  if (!isId(req.params.id)) {
    return fail(
      res,
      400,
      "Invalid Marks ID."
    );
  }

  try {
    const record =
      await CourseAssessmentMark.findById(
        req.params.id
      );

    if (!record) {
      return fail(
        res,
        404,
        "Marks record not found."
      );
    }

    if (record.status !== "Draft") {
      return fail(
        res,
        409,
        "Published marks are locked."
      );
    }

    const input = await prepareInput(
      req.body
    );

    record.set({
      ...input,
      updatedBy: req.user._id,
    });

    await record.save();

    return res.json({
      success: true,
      message: "Draft marks updated.",
      data: format(record),
    });
  } catch (error) {
    if (error.name === "Error") {
      return fail(
        res,
        400,
        error.message
      );
    }

    return handleError(res, error);
  }
});

// ========================================
// PUBLISH ASSESSMENT MARKS
// PATCH /api/course-assessment-marks/:id/publish
// ========================================

router.patch(
  "/:id/publish",
  async (req, res) => {
    if (!isId(req.params.id)) {
      return fail(
        res,
        400,
        "Invalid Marks ID."
      );
    }

    try {
      const record =
        await CourseAssessmentMark.findById(
          req.params.id
        );

      if (!record) {
        return fail(
          res,
          404,
          "Marks record not found."
        );
      }

      if (record.status !== "Draft") {
        return fail(
          res,
          409,
          "Marks are already published."
        );
      }

      record.status = "Published";
      record.publishedBy = req.user._id;
      record.publishedAt = new Date();
      record.updatedBy = req.user._id;

      await record.save();

      return res.json({
        success: true,
        message:
          "Marks published to the Student Portal.",
        data: format(record),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// DELETE DRAFT MARKS
// DELETE /api/course-assessment-marks/:id
// ========================================

router.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) {
    return fail(
      res,
      400,
      "Invalid Marks ID."
    );
  }

  try {
    const record =
      await CourseAssessmentMark.findById(
        req.params.id
      );

    if (!record) {
      return fail(
        res,
        404,
        "Marks record not found."
      );
    }

    if (record.status !== "Draft") {
      return fail(
        res,
        409,
        "Published marks cannot be deleted."
      );
    }

    await record.deleteOne();

    return res.json({
      success: true,
      message: "Draft marks deleted.",
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// EXPORT
// ========================================

module.exports = router;
