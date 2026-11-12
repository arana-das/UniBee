
const mongoose = require("mongoose");
const Faculty = require("../models/Faculty");

// ========================================
// UNIBEE FACULTY MANAGEMENT CONTROLLER
// ========================================

const ALLOWED_FIELDS = [
  "facultyId",
  "name",
  "email",
  "phone",
  "department",
  "designation",
  "qualification",
  "specialization",
  "experience",
  "office",
  "joiningDate",
  "status",
];

const REQUIRED_FIELDS = [
  "facultyId",
  "name",
  "email",
  "department",
  "designation",
];

// ========================================
// CLEAN REQUEST DATA
// ========================================

function cleanFacultyData(input = {}) {
  const result = {};

  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return result;
  }

  for (const field of ALLOWED_FIELDS) {
    if (
      !Object.prototype.hasOwnProperty.call(
        input,
        field
      )
    ) {
      continue;
    }

    const value = input[field];

    result[field] =
      typeof value === "string"
        ? value.trim()
        : value;
  }

  if (typeof result.facultyId === "string") {
    result.facultyId =
      result.facultyId.toUpperCase();
  }

  if (typeof result.email === "string") {
    result.email =
      result.email.toLowerCase();
  }

  if (
    result.experience !== undefined &&
    result.experience !== ""
  ) {
    const years = Number(result.experience);

    result.experience =
      Number.isFinite(years) ? years : NaN;
  }

  if (result.experience === "") {
    result.experience = 0;
  }

  return result;
}

// ========================================
// FORMAT FRONTEND RESPONSE
// ========================================

function formatFaculty(faculty) {
  const data =
    typeof faculty.toObject === "function"
      ? faculty.toObject()
      : faculty;

  return {
    ...data,
    id: String(data._id),
  };
}

// ========================================
// VALIDATION
// ========================================

function validateFaculty(data, creating = false) {
  for (const field of REQUIRED_FIELDS) {
    if (
      creating ||
      Object.prototype.hasOwnProperty.call(
        data,
        field
      )
    ) {
      if (
        typeof data[field] !== "string" ||
        !data[field].trim()
      ) {
        return `${field} is required.`;
      }
    }
  }

  if (
    data.email !== undefined &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      data.email
    )
  ) {
    return "Enter a valid email address.";
  }

  if (
    data.experience !== undefined &&
    (
      !Number.isFinite(data.experience) ||
      data.experience < 0 ||
      data.experience > 70
    )
  ) {
    return "Experience must be between 0 and 70 years.";
  }

  return null;
}

// ========================================
// ERROR HANDLER
// ========================================

function handleError(res, error) {
  console.error(
    "Faculty API error:",
    error.message
  );

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "Faculty ID or email already exists.",
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
      message: "Invalid faculty data.",
    });
  }

  return res.status(500).json({
    success: false,
    message:
      "Unable to complete Faculty Management operation.",
  });
}

// ========================================
// CREATE FACULTY
// POST /api/faculty
// ========================================

async function createFaculty(req, res) {
  try {
    const data = cleanFacultyData(
      req.body
    );

    const validationError =
      validateFaculty(data, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const faculty = await Faculty.create(
      data
    );

    return res.status(201).json({
      success: true,
      message:
        "Faculty member created successfully.",
      data: formatFaculty(faculty),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// GET ALL FACULTY
// GET /api/faculty
// ========================================

async function getFaculty(req, res) {
  try {
    const faculty = await Faculty.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: faculty.length,
      data: faculty.map(formatFaculty),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// GET SINGLE FACULTY MEMBER
// GET /api/faculty/:id
// ========================================

async function getFacultyById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid faculty record ID.",
      });
    }

    const faculty = await Faculty.findById(
      id
    ).lean();

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message:
          "Faculty member not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatFaculty(faculty),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// UPDATE FACULTY
// PUT /api/faculty/:id
// ========================================

async function updateFaculty(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid faculty record ID.",
      });
    }

    const updates = cleanFacultyData(
      req.body
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No valid fields provided for update.",
      });
    }

    const validationError =
      validateFaculty(updates);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const faculty =
      await Faculty.findByIdAndUpdate(
        id,
        { $set: updates },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message:
          "Faculty member not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Faculty member updated successfully.",
      data: formatFaculty(faculty),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// DELETE FACULTY
// DELETE /api/faculty/:id
// ========================================

async function deleteFaculty(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid faculty record ID.",
      });
    }

    const faculty =
      await Faculty.findByIdAndDelete(id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message:
          "Faculty member not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Faculty member deleted successfully.",
      data: {
        id: String(faculty._id),
        facultyId: faculty.facultyId,
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
  createFaculty,
  getFaculty,
  getFacultyById,
  updateFaculty,
  deleteFaculty,
};
