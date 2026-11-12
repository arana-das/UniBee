
const mongoose = require("mongoose");
const Student = require("../models/Student");

const {
  toStudentDatabase,
  toStudentFrontend,
} = require("../middleware/studentDataMapper");

// ========================================
// UNIBEE STUDENT CONTROLLER
// ========================================

const REQUIRED_FIELDS = [
  "studentId",
  "fullName",
  "email",
  "department",
  "program",
  "semester",
];

// ========================================
// HELPER: VALIDATE REQUIRED FIELDS
// ========================================

function validateRequiredFields(data) {
  for (const field of REQUIRED_FIELDS) {
    if (
      typeof data[field] !== "string" ||
      !data[field].trim()
    ) {
      return `${field} is required.`;
    }
  }

  return null;
}

// ========================================
// HELPER: HANDLE DATABASE ERRORS
// ========================================

function handleError(res, error) {
  console.error("Student API error:", error.message);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Student ID or email already exists.",
    });
  }

  if (error.name === "ValidationError") {
    const messages = Object.values(
      error.errors
    ).map((item) => item.message);

    return res.status(400).json({
      success: false,
      message: messages.join(" "),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid student data.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
}

// ========================================
// CREATE STUDENT
// POST /api/students
// ========================================

async function createStudent(req, res) {
  try {
    const data = toStudentDatabase(req.body);

    const validationError = validateRequiredFields(data);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const student = await Student.create(data);

    return res.status(201).json({
      success: true,
      message: "Student created successfully.",
      data: toStudentFrontend(student),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// GET ALL STUDENTS
// GET /api/students
// ========================================

async function getStudents(req, res) {
  try {
    const students = await Student.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students.map(toStudentFrontend),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// GET ONE STUDENT
// GET /api/students/:id
// ========================================

async function getStudentById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student record ID.",
      });
    }

    const student = await Student.findById(id).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: toStudentFrontend(student),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// UPDATE STUDENT
// PUT /api/students/:id
// ========================================

async function updateStudent(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student record ID.",
      });
    }

    const updates = toStudentDatabase(req.body);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    for (const field of REQUIRED_FIELDS) {
      if (
        Object.prototype.hasOwnProperty.call(
          updates,
          field
        ) &&
        (
          typeof updates[field] !== "string" ||
          !updates[field].trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} cannot be empty.`,
        });
      }
    }

    const student = await Student.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student updated successfully.",
      data: toStudentFrontend(student),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// DELETE STUDENT
// DELETE /api/students/:id
// ========================================

async function deleteStudent(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student record ID.",
      });
    }

    const student = await Student.findByIdAndDelete(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student deleted successfully.",
      data: {
        id: String(student._id),
        studentId: student.studentId,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// EXPORT
// ========================================

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};
