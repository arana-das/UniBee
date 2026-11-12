
const express = require("express");
const mongoose = require("mongoose");

const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const User = require("../models/User");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// ========================================
// UNIBEE ASSIGNMENT ROUTES
// ========================================

const router = express.Router();

router.use(protect);

const isValidId = (id) =>
  mongoose.isValidObjectId(id);

const getId = (value) =>
  String(value?._id || value?.id || value || "");

const ALLOWED_STATUSES = [
  "Draft",
  "Published",
  "Closed",
];

// ========================================
// COMMON HELPERS
// ========================================

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function handleError(res, error) {
  console.error("Assignment API:", error);

  if (error.code === 11000) {
    return fail(res, 409, "Duplicate record.");
  }

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
    return fail(res, 400, "Invalid record ID.");
  }

  return fail(
    res,
    500,
    "Assignment operation failed."
  );
}

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
    parsed.toISOString().slice(0, 10) === value
  );
}

function todayDate() {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  return [
    values.year,
    values.month,
    values.day,
  ].join("-");
}

function normalizeAssignment(doc) {
  const item =
    typeof doc.toObject === "function"
      ? doc.toObject()
      : doc;

  const course = item.course;

  return {
    id: getId(item),
    title: item.title,
    description: item.description,
    semester: item.semester,
    deadline: item.deadline,
    marks: item.marks,
    status: item.status,
    publishedAt: item.publishedAt,
    closedAt: item.closedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,

    course:
      course && typeof course === "object"
        ? {
            id: getId(course),
            code: course.courseCode,
            title: course.courseTitle,
            semester: course.semester,
          }
        : {
            id: getId(course),
          },
  };
}

function normalizeSubmission(doc) {
  const item =
    typeof doc.toObject === "function"
      ? doc.toObject()
      : doc;

  const student = item.student;

  return {
    id: getId(item),
    assignmentId: getId(item.assignment),

    student:
      student && typeof student === "object"
        ? {
            id: getId(student),
            studentId: student.studentId,
            name: student.fullName,
            email: student.email,
          }
        : {
            id: getId(student),
          },

    submissionText: item.submissionText,
    submissionUrl: item.submissionUrl,
    status: item.status,
    submittedAt: item.submittedAt,
    isLate: item.isLate,
    obtainedMarks: item.obtainedMarks,
    feedback: item.feedback,
    gradedAt: item.gradedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// ========================================
// AUTHENTICATED USER
// ========================================

async function getLoginUser(req) {
  const userId = getId(req.user);

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
// FACULTY IDENTITY
// ========================================

async function resolveFaculty(req) {
  const user = await getLoginUser(req);

  if (!user || user.role !== "faculty") {
    return null;
  }

  const byUser = await Faculty.findOne({
    userId: user._id,
    status: "Active",
  }).lean();

  const byProfile = isValidId(user.profileId)
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

  return { user, faculty };
}

// ========================================
// STUDENT IDENTITY
// ========================================

async function resolveStudent(req) {
  const user = await getLoginUser(req);

  if (!user || user.role !== "student") {
    return null;
  }

  const byProfile = isValidId(user.profileId)
    ? await Student.findById(
        user.profileId
      ).lean()
    : null;

  const byUser = await Student.findOne({
    userId: user._id,
  }).lean();

  if (
    byProfile &&
    byUser &&
    getId(byProfile) !== getId(byUser)
  ) {
    return null;
  }

  const student = byProfile || byUser;

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

  return { user, student };
}

// ========================================
// COURSE OWNERSHIP
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

async function getOwnedAssignment(
  faculty,
  user,
  assignmentId
) {
  if (!isValidId(assignmentId)) {
    return null;
  }

  const assignment = await Assignment.findOne({
    _id: assignmentId,
    faculty: faculty._id,
    createdBy: user._id,
  });

  if (!assignment) return null;

  const course = await getAssignedCourse(
    faculty._id,
    assignment.course
  );

  if (!course) return null;

  return { assignment, course };
}

// ========================================
// APPROVED ENROLLMENT
// ========================================

async function approvedEnrollment(
  studentId,
  courseId,
  semester
) {
  return Enrollment.exists({
    student: studentId,
    course: courseId,
    semester,
    status: "Approved",
  });
}

// ========================================
// FACULTY — ASSIGNED COURSES
// GET /api/assignments/faculty/courses
// ========================================

router.get(
  "/faculty/courses",
  authorize("faculty"),
  async (req, res) => {
    try {
      const identity = await resolveFaculty(req);

      if (!identity) {
        return fail(
          res,
          403,
          "Faculty account is not linked to an active Faculty profile."
        );
      }

      const courses = await Course.find({
        faculty: identity.faculty._id,
        status: "Active",
      })
        .sort({ courseCode: 1 })
        .lean();

      return res.json({
        success: true,

        faculty: {
          id: getId(identity.faculty),
          name: identity.faculty.name,
          facultyId: identity.faculty.facultyId,
        },

        data: courses.map((course) => ({
          id: getId(course),
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
// FACULTY — MY ASSIGNMENTS
// GET /api/assignments/faculty/my
// ========================================

router.get(
  "/faculty/my",
  authorize("faculty"),
  async (req, res) => {
    try {
      const identity = await resolveFaculty(req);

      if (!identity) {
        return fail(
          res,
          403,
          "Faculty profile link is missing."
        );
      }

      const assignments = await Assignment.find({
        faculty: identity.faculty._id,
        createdBy: identity.user._id,
      })
        .populate(
          "course",
          "courseCode courseTitle semester"
        )
        .sort({ createdAt: -1 })
        .lean();

      const ids = assignments.map(
        (item) => item._id
      );

      const counts = ids.length
        ? await AssignmentSubmission.aggregate([
            {
              $match: {
                assignment: { $in: ids },
              },
            },
            {
              $group: {
                _id: "$assignment",
                count: { $sum: 1 },
                graded: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", "Graded"] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ])
        : [];

      const countMap = new Map(
        counts.map((item) => [
          getId(item._id),
          item,
        ])
      );

      return res.json({
        success: true,
        data: assignments.map((item) => {
          const count =
            countMap.get(getId(item)) || {};

          return {
            ...normalizeAssignment(item),
            submissions: count.count || 0,
            graded: count.graded || 0,
          };
        }),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// FACULTY — CREATE ASSIGNMENT
// POST /api/assignments/faculty
// ========================================

router.post(
  "/faculty",
  authorize("faculty"),
  async (req, res) => {
    try {
      const identity = await resolveFaculty(req);

      if (!identity) {
        return fail(
          res,
          403,
          "Faculty profile link is missing."
        );
      }

      const {
        courseId,
        title,
        description,
        deadline,
        marks,
        status = "Draft",
      } = req.body || {};

      if (!isValidId(courseId)) {
        return fail(
          res,
          400,
          "Select a valid assigned course."
        );
      }

      const course = await getAssignedCourse(
        identity.faculty._id,
        courseId
      );

      if (!course) {
        return fail(
          res,
          403,
          "This course is not assigned to you."
        );
      }

      if (
        !["Draft", "Published"].includes(status)
      ) {
        return fail(
          res,
          400,
          "New assignments must be Draft or Published."
        );
      }

      if (!validDate(deadline)) {
        return fail(
          res,
          400,
          "Enter a valid deadline."
        );
      }

      if (
        status === "Published" &&
        deadline < todayDate()
      ) {
        return fail(
          res,
          400,
          "Cannot publish an assignment with an expired deadline."
        );
      }

      const maxMarks = Number(marks);

      if (
        !Number.isFinite(maxMarks) ||
        maxMarks < 1 ||
        maxMarks > 1000
      ) {
        return fail(
          res,
          400,
          "Total marks must be between 1 and 1000."
        );
      }

      const assignment = await Assignment.create({
        course: course._id,
        semester: course.semester,
        faculty: identity.faculty._id,
        createdBy: identity.user._id,
        title,
        description,
        deadline,
        marks: maxMarks,
        status,
        publishedAt:
          status === "Published"
            ? new Date()
            : null,
      });

      await assignment.populate(
        "course",
        "courseCode courseTitle semester"
      );

      return res.status(201).json({
        success: true,
        message: "Assignment created successfully.",
        data: normalizeAssignment(assignment),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// FACULTY — UPDATE ASSIGNMENT
// PUT /api/assignments/faculty/:id
// ========================================

router.put(
  "/faculty/:id",
  authorize("faculty"),
  async (req, res) => {
    try {
      const identity = await resolveFaculty(req);

      if (!identity) {
        return fail(
          res,
          403,
          "Faculty profile link is missing."
        );
      }

      const owned = await getOwnedAssignment(
        identity.faculty,
        identity.user,
        req.params.id
      );

      if (!owned) {
        return fail(
          res,
          404,
          "Assignment not found or access denied."
        );
      }

      const { assignment, course } = owned;
      const body = req.body || {};

      const allowedFields = [
        "title",
        "description",
        "deadline",
        "marks",
        "status",
      ];

      if (
        Object.keys(body).some(
          (key) => !allowedFields.includes(key)
        )
      ) {
        return fail(
          res,
          400,
          "Unsupported assignment update field."
        );
      }

      if (assignment.status === "Closed") {
        return fail(
          res,
          409,
          "Closed assignments cannot be edited."
        );
      }

      const submissionCount =
        await AssignmentSubmission.countDocuments({
          assignment: assignment._id,
        });

      if (submissionCount > 0) {
        const protectedFields = [
          "title",
          "description",
          "deadline",
          "marks",
        ];

        const changingProtected =
          protectedFields.some(
            (key) =>
              body[key] !== undefined &&
              String(body[key]) !==
                String(assignment[key])
          );

        if (changingProtected) {
          return fail(
            res,
            409,
            "Assignment content cannot be changed after student submissions."
          );
        }

        if (
          body.status &&
          !["Published", "Closed"].includes(
            body.status
          )
        ) {
          return fail(
            res,
            409,
            "Cannot return an assignment with submissions to Draft."
          );
        }
      }

      if (
        body.status !== undefined &&
        !ALLOWED_STATUSES.includes(
          body.status
        )
      ) {
        return fail(
          res,
          400,
          "Invalid assignment status."
        );
      }

      if (
        getId(assignment.course) !==
        getId(course)
      ) {
        return fail(
          res,
          403,
          "Assignment course mismatch."
        );
      }

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          assignment[field] = body[field];
        }
      }

      if (!validDate(assignment.deadline)) {
        return fail(
          res,
          400,
          "Invalid assignment deadline."
        );
      }

      const totalMarks = Number(
        assignment.marks
      );

      if (
        !Number.isFinite(totalMarks) ||
        totalMarks < 1 ||
        totalMarks > 1000
      ) {
        return fail(
          res,
          400,
          "Marks must be between 1 and 1000."
        );
      }

      assignment.marks = totalMarks;

      if (assignment.status === "Published") {
        if (
          !assignment.publishedAt &&
          assignment.deadline < todayDate()
        ) {
          return fail(
            res,
            400,
            "Cannot publish an assignment with an expired deadline."
          );
        }

        if (!assignment.publishedAt) {
          assignment.publishedAt = new Date();
        }

        assignment.closedAt = null;
      }

      if (assignment.status === "Closed") {
        if (!assignment.publishedAt) {
          return fail(
            res,
            400,
            "Publish the assignment before closing it."
          );
        }

        assignment.closedAt = new Date();
      }

      await assignment.save();

      await assignment.populate(
        "course",
        "courseCode courseTitle semester"
      );

      return res.json({
        success: true,
        message: "Assignment updated successfully.",
        data: normalizeAssignment(assignment),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// FACULTY — DELETE ASSIGNMENT
// DELETE /api/assignments/faculty/:id
// ========================================

router.delete(
  "/faculty/:id",
  authorize("faculty"),
  async (req, res) => {
    try {
      const identity = await resolveFaculty(req);

      if (!identity) {
        return fail(
          res,
          403,
          "Faculty profile link is missing."
        );
      }

      const owned = await getOwnedAssignment(
        identity.faculty,
        identity.user,
        req.params.id
      );

      if (!owned) {
        return fail(
          res,
          404,
          "Assignment not found or access denied."
        );
      }

      const submissionCount =
        await AssignmentSubmission.countDocuments({
          assignment: owned.assignment._id,
        });

      if (submissionCount > 0) {
        return fail(
          res,
          409,
          "Assignments with student submissions cannot be deleted."
        );
      }

      await owned.assignment.deleteOne();

      return res.json({
        success: true,
        message: "Assignment deleted successfully.",
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// FACULTY — VIEW SUBMISSIONS
// GET /api/assignments/faculty/:id/submissions
// ========================================

router.get(
  "/faculty/:id/submissions",
  authorize("faculty"),
  async (req, res) => {
    try {
      const identity = await resolveFaculty(req);

      if (!identity) {
        return fail(
          res,
          403,
          "Faculty profile link is missing."
        );
      }

      const owned = await getOwnedAssignment(
        identity.faculty,
        identity.user,
        req.params.id
      );

      if (!owned) {
        return fail(
          res,
          404,
          "Assignment not found or access denied."
        );
      }

      const submissions =
        await AssignmentSubmission.find({
          assignment: owned.assignment._id,
        })
          .populate(
            "student",
            "studentId fullName email"
          )
          .sort({ submittedAt: -1 })
          .lean();

      return res.json({
        success: true,
        assignment: normalizeAssignment(
          owned.assignment
        ),
        total: submissions.length,
        data: submissions.map(
          normalizeSubmission
        ),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// FACULTY — GRADE SUBMISSION
// PATCH /api/assignments/faculty/
// submissions/:submissionId/grade
// ========================================

router.patch(
  "/faculty/submissions/:submissionId/grade",
  authorize("faculty"),
  async (req, res) => {
    try {
      const identity = await resolveFaculty(req);

      if (!identity) {
        return fail(
          res,
          403,
          "Faculty profile link is missing."
        );
      }

      if (
        !isValidId(req.params.submissionId)
      ) {
        return fail(
          res,
          400,
          "Invalid submission ID."
        );
      }

      const submission =
        await AssignmentSubmission.findById(
          req.params.submissionId
        );

      if (!submission) {
        return fail(
          res,
          404,
          "Submission not found."
        );
      }

      const owned = await getOwnedAssignment(
        identity.faculty,
        identity.user,
        submission.assignment
      );

      if (!owned) {
        return fail(
          res,
          403,
          "You cannot grade this submission."
        );
      }

      const marks = Number(
        req.body?.obtainedMarks
      );

      const feedback =
        req.body?.feedback ?? "";

      if (
        req.body?.obtainedMarks === null ||
        req.body?.obtainedMarks === undefined ||
        !Number.isFinite(marks) ||
        marks < 0 ||
        marks > owned.assignment.marks
      ) {
        return fail(
          res,
          400,
          `Obtained marks must be between 0 and ${owned.assignment.marks}.`
        );
      }

      if (
        typeof feedback !== "string" ||
        feedback.length > 5000
      ) {
        return fail(
          res,
          400,
          "Feedback must be text within 5000 characters."
        );
      }

      submission.status = "Graded";
      submission.obtainedMarks = marks;
      submission.feedback = feedback.trim();
      submission.gradedBy =
        identity.user._id;
      submission.gradedAt = new Date();

      await submission.save();

      await submission.populate(
        "student",
        "studentId fullName email"
      );

      return res.json({
        success: true,
        message: "Submission graded successfully.",
        data: normalizeSubmission(
          submission
        ),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// EXAM CONTROLLER — FACULTY GRADES
// GET /api/assignments/exam-controller/grades
// ========================================

router.get(
  "/exam-controller/grades",
  authorize("exam-controller"),
  async (req, res) => {
    try {
      const { courseId, studentId } = req.query;

      if (courseId && !isValidId(courseId)) {
        return fail(
          res,
          400,
          "Invalid course ID."
        );
      }

      const filter = {};

      if (courseId) {
        filter.course = courseId;
      }

      const assignments = await Assignment.find(
        filter
      )
        .select(
          "course semester title marks faculty"
        )
        .populate(
          "course",
          "courseCode courseTitle semester"
        )
        .lean();

      if (assignments.length === 0) {
        return res.json({
          success: true,
          count: 0,
          data: [],
          summary: [],
        });
      }

      const assignmentById = new Map(
        assignments.map((item) => [
          getId(item),
          item,
        ])
      );

      const submissions =
        await AssignmentSubmission.find({
          assignment: {
            $in: assignments.map(
              (item) => item._id
            ),
          },
          status: "Graded",
        })
          .populate(
            "student",
            "studentId fullName email"
          )
          .sort({
            gradedAt: -1,
            _id: -1,
          })
          .lean();

      const filtered = studentId
        ? submissions.filter(
            (item) =>
              String(
                item.student?.studentId || ""
              ).toUpperCase() ===
              String(studentId)
                .trim()
                .toUpperCase()
          )
        : submissions;

      const data = filtered.flatMap(
        (submission) => {
          const assignment =
            assignmentById.get(
              getId(submission.assignment)
            );

          if (
            !assignment ||
            !submission.student
          ) {
            return [];
          }

          const obtainedMarks = Number(
            submission.obtainedMarks
          );

          const maximumMarks = Number(
            assignment.marks
          );

          if (
            !Number.isFinite(obtainedMarks) ||
            !Number.isFinite(maximumMarks) ||
            maximumMarks <= 0
          ) {
            return [];
          }

          return [{
            id: getId(submission),
            submissionId: getId(submission),
            assignmentId: getId(assignment),
            assignmentTitle: assignment.title,
            courseId: getId(assignment.course),
            courseCode:
              assignment.course?.courseCode || "",
            courseTitle:
              assignment.course?.courseTitle || "",
            semester: assignment.semester || "",
            studentMongoId:
              getId(submission.student),
            studentId:
              submission.student.studentId || "",
            studentName:
              submission.student.fullName || "",
            obtainedMarks,
            maximumMarks,
            percentage: Number(
              (
                (obtainedMarks / maximumMarks) *
                100
              ).toFixed(2)
            ),
            gradedAt: submission.gradedAt || null,
            source: "Faculty Assignment Grading",
          }];
        }
      );

      // Group marks by course + student + semester.

      const groups = new Map();

      for (const entry of data) {
        const key = [
          entry.courseId,
          entry.studentMongoId,
          entry.semester,
        ].join(":");

        if (!groups.has(key)) {
          groups.set(key, {
            courseId: entry.courseId,
            courseCode: entry.courseCode,
            semester: entry.semester,
            studentMongoId:
              entry.studentMongoId,
            studentId: entry.studentId,
            studentName: entry.studentName,
            obtainedMarks: 0,
            maximumMarks: 0,
            assignments: 0,
          });
        }

        const group = groups.get(key);

        group.obtainedMarks +=
          entry.obtainedMarks;

        group.maximumMarks +=
          entry.maximumMarks;

        group.assignments += 1;
      }

      const summary = [
        ...groups.values(),
      ].map((group) => ({
        ...group,

        obtainedMarks: Number(
          group.obtainedMarks.toFixed(2)
        ),

        maximumMarks: Number(
          group.maximumMarks.toFixed(2)
        ),

        percentage:
          group.maximumMarks > 0
            ? Number(
                (
                  (group.obtainedMarks /
                    group.maximumMarks) *
                  100
                ).toFixed(2)
              )
            : 0,
      }));

      return res.json({
        success: true,
        count: data.length,
        data,
        summary,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// STUDENT — MY ASSIGNMENTS
// GET /api/assignments/student/my
// ========================================

router.get(
  "/student/my",
  authorize("student"),
  async (req, res) => {
    try {
      const identity =
        await resolveStudent(req);

      if (!identity) {
        return fail(
          res,
          403,
          "Student account is not linked to an active Student profile."
        );
      }

      const enrollments =
        await Enrollment.find({
          student: identity.student._id,
          status: "Approved",
        })
          .select("course semester")
          .lean();

      const conditions =
        enrollments.map((enrollment) => ({
          course: enrollment.course,
          semester: enrollment.semester,
        }));

      if (conditions.length === 0) {
        return res.json({
          success: true,
          data: [],
          pendingCount: 0,
          total: 0,
        });
      }

      const assignments =
        await Assignment.find({
          $or: conditions,
          status: {
            $in: ["Published", "Closed"],
          },
        })
          .populate(
            "course",
            "courseCode courseTitle semester"
          )
          .sort({
            deadline: 1,
            createdAt: -1,
          })
          .lean();

      const submissions =
        await AssignmentSubmission.find({
          student: identity.student._id,
          assignment: {
            $in: assignments.map(
              (item) => item._id
            ),
          },
        }).lean();

      const submissionMap = new Map(
        submissions.map((item) => [
          getId(item.assignment),
          normalizeSubmission(item),
        ])
      );

      const today = todayDate();

      const data = assignments.map(
        (assignment) => {
          const submission =
            submissionMap.get(
              getId(assignment)
            ) || null;

          const canSubmit =
            assignment.status === "Published" &&
            assignment.deadline >= today &&
            submission?.status !== "Graded";

          return {
            ...normalizeAssignment(assignment),
            mySubmission: submission,
            canSubmit,
            isOverdue:
              assignment.deadline < today,
          };
        }
      );

      const pendingCount = data.filter(
        (item) =>
          item.canSubmit &&
          !item.mySubmission
      ).length;

      return res.json({
        success: true,
        student: {
          id: getId(identity.student),
          name: identity.student.fullName,
          studentId:
            identity.student.studentId,
        },
        total: data.length,
        pendingCount,
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// STUDENT — SUBMIT ASSIGNMENT
// POST /api/assignments/student/:id/submit
// ========================================

router.post(
  "/student/:id/submit",
  authorize("student"),
  async (req, res) => {
    try {
      const identity =
        await resolveStudent(req);

      if (!identity) {
        return fail(
          res,
          403,
          "Student profile link is missing."
        );
      }

      if (!isValidId(req.params.id)) {
        return fail(
          res,
          400,
          "Invalid assignment ID."
        );
      }

      const assignment =
        await Assignment.findById(
          req.params.id
        );

      if (!assignment) {
        return fail(
          res,
          404,
          "Assignment not found."
        );
      }

      if (
        assignment.status !== "Published"
      ) {
        return fail(
          res,
          403,
          "This assignment is not open for submission."
        );
      }

      if (
        assignment.deadline < todayDate()
      ) {
        return fail(
          res,
          409,
          "The assignment deadline has passed."
        );
      }

      const enrolled =
        await approvedEnrollment(
          identity.student._id,
          assignment.course,
          assignment.semester
        );

      if (!enrolled) {
        return fail(
          res,
          403,
          "You are not approved for this course and semester."
        );
      }

      const submissionText =
        req.body?.submissionText;

      const submissionUrl =
        req.body?.submissionUrl;

      if (
        typeof submissionText !== "string" ||
        typeof submissionUrl !== "string"
      ) {
        return fail(
          res,
          400,
          "Submission text and URL must be strings."
        );
      }

      const content =
        submissionText.trim();

      const url =
        submissionUrl.trim();

      if (!content && !url) {
        return fail(
          res,
          400,
          "Provide submission text or a document URL."
        );
      }

      if (
        content.length > 20000 ||
        url.length > 2048
      ) {
        return fail(
          res,
          400,
          "Submission content exceeds the allowed length."
        );
      }

      if (url) {
        try {
          const parsed = new URL(url);

          if (
            !["http:", "https:"].includes(
              parsed.protocol
            )
          ) {
            throw new Error(
              "Invalid protocol."
            );
          }
        } catch {
          return fail(
            res,
            400,
            "Enter a valid HTTP or HTTPS document URL."
          );
        }
      }

      const filter = {
        assignment: assignment._id,
        student: identity.student._id,
      };

      let submission =
        await AssignmentSubmission.findOne(
          filter
        );

      if (
        submission?.status === "Graded"
      ) {
        return fail(
          res,
          409,
          "Graded submissions cannot be replaced."
        );
      }

      if (submission) {
        submission.submissionText = content;
        submission.submissionUrl = url;
        submission.status = "Submitted";
        submission.submittedAt = new Date();
        submission.isLate = false;

        await submission.save();
      } else {
        submission =
          await AssignmentSubmission.create({
            ...filter,
            submissionText: content,
            submissionUrl: url,
            status: "Submitted",
            submittedAt: new Date(),
            isLate: false,
          });
      }

      return res.json({
        success: true,
        message:
          "Assignment submitted successfully.",
        data: normalizeSubmission(
          submission
        ),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// EXPORT — KEEP THIS AT THE VERY END
// ========================================

module.exports = router;
