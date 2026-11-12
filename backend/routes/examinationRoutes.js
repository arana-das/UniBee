
const express = require("express");
const mongoose = require("mongoose");

const Examination = require("../models/Examination");
const Course = require("../models/Course");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// AUTHENTICATION
// Temporary Admin + Exam Controller Access
// ========================================

router.use(protect);
router.use(authorize("admin", "exam-controller"));

// ========================================
// HELPERS
// ========================================

const validId = (id) => mongoose.isValidObjectId(id);

const format = (doc) => {
  const data = doc.toObject
    ? doc.toObject()
    : doc;

  return {
    ...data,
    id: String(data._id),
    courseId: String(data.course?._id || data.course),
  };
};

const sendError = (res, error) => {
  console.error("Examination API:", error.message);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate examination record.",
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
      message: "Invalid data provided.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Examination operation failed.",
  });
};

const EXAM_FIELDS = [
  "title",
  "type",
  "date",
  "startTime",
  "endTime",
  "room",
  "invigilator",
  "marks",
  "status",
  "instructions",
];

// ========================================
// COURSE VALIDATION
// ========================================

async function getActiveCourse(courseId) {
  if (!validId(courseId)) {
    return null;
  }

  return Course.findOne({
    _id: courseId,
    status: "Active",
  });
}

// ========================================
// ROOM CONFLICT CHECK
// ========================================

async function checkRoomConflict(data, excludeId = null) {
  if (
    ["Cancelled", "Postponed"].includes(data.status)
  ) {
    return null;
  }

  const query = {
    date: data.date,
    room: data.room.trim().toUpperCase(),
    status: {
      $nin: ["Cancelled", "Postponed"],
    },
    startTime: { $lt: data.endTime },
    endTime: { $gt: data.startTime },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return Examination.findOne(query).lean();
}

// ========================================
// GET ALL EXAMINATIONS
// GET /api/examinations
// ========================================

router.get("/", async (req, res) => {
  try {
    const {
      search,
      status,
      type,
      semester,
      courseId,
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (type && type !== "All") {
      query.type = type;
    }

    if (semester && semester !== "All") {
      query.semester = semester;
    }

    if (courseId) {
      if (!validId(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Course ID.",
        });
      }

      query.course = courseId;
    }

    if (search) {
      const regex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      query.$or = [
        { title: regex },
        { courseCode: regex },
        { room: regex },
        { invigilator: regex },
      ];
    }

    const records = await Examination.find(query)
      .populate(
        "course",
        "courseCode courseTitle department semester"
      )
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({
      success: true,
      count: records.length,
      data: records.map((item) => ({
        ...item,
        id: String(item._id),
        courseId: String(item.course?._id || item.course),
      })),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// GET SINGLE EXAMINATION
// GET /api/examinations/:id
// ========================================

router.get("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Examination ID.",
      });
    }

    const examination = await Examination.findById(
      req.params.id
    ).populate(
      "course",
      "courseCode courseTitle department semester"
    );

    if (!examination) {
      return res.status(404).json({
        success: false,
        message: "Examination not found.",
      });
    }

    return res.json({
      success: true,
      data: format(examination),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// CREATE EXAMINATION
// POST /api/examinations
// ========================================

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    const courseId = body.courseId || body.course;

    const course = await getActiveCourse(courseId);

    if (!course) {
      return res.status(400).json({
        success: false,
        message: "Select an existing active course.",
      });
    }

    const data = {};

    for (const field of EXAM_FIELDS) {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
      ) {
        data[field] = body[field];
      }
    }

    data.course = course._id;
    data.courseCode = course.courseCode;
    data.semester = course.semester;

    const conflict = await checkRoomConflict(data);

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Room conflict with "${conflict.title}".`,
      });
    }

    const duplicate = await Examination.findOne({
      course: course._id,
      type: data.type,
      date: data.date,
      status: {
        $nin: ["Cancelled", "Postponed"],
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "This examination already exists for this course and date.",
      });
    }

    const examination = await Examination.create(data);

    const populated = await Examination.findById(
      examination._id
    ).populate(
      "course",
      "courseCode courseTitle department semester"
    );

    return res.status(201).json({
      success: true,
      message: "Examination scheduled successfully.",
      data: format(populated),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// UPDATE EXAMINATION
// PUT /api/examinations/:id
// ========================================

router.put("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Examination ID.",
      });
    }

    const examination = await Examination.findById(
      req.params.id
    );

    if (!examination) {
      return res.status(404).json({
        success: false,
        message: "Examination not found.",
      });
    }

    const body = req.body || {};

    let course = null;

    if (body.courseId || body.course) {
      course = await getActiveCourse(
        body.courseId || body.course
      );

      if (!course) {
        return res.status(400).json({
          success: false,
          message: "Select an existing active course.",
        });
      }
    } else {
      course = await Course.findById(examination.course);
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Linked course not found.",
      });
    }

    for (const field of EXAM_FIELDS) {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
      ) {
        examination[field] = body[field];
      }
    }

    examination.course = course._id;
    examination.courseCode = course.courseCode;
    examination.semester = course.semester;

    const conflict = await checkRoomConflict(
      examination,
      examination._id
    );

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Room conflict with "${conflict.title}".`,
      });
    }

    const duplicate = await Examination.findOne({
      _id: { $ne: examination._id },
      course: course._id,
      type: examination.type,
      date: examination.date,
      status: {
        $nin: ["Cancelled", "Postponed"],
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Another examination of this type already exists for this course and date.",
      });
    }

    await examination.save();

    const populated = await Examination.findById(
      examination._id
    ).populate(
      "course",
      "courseCode courseTitle department semester"
    );

    return res.json({
      success: true,
      message: "Examination updated successfully.",
      data: format(populated),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// DELETE EXAMINATION
// DELETE /api/examinations/:id
// ========================================

router.delete("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Examination ID.",
      });
    }

    const examination = await Examination.findById(
      req.params.id
    );

    if (!examination) {
      return res.status(404).json({
        success: false,
        message: "Examination not found.",
      });
    }

    await examination.deleteOne();

    return res.json({
      success: true,
      message: "Examination deleted successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// EXPORT
// ========================================

module.exports = router;
