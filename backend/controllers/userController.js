
const mongoose = require("mongoose");
const User = require("../models/User");

// ========================================
// UNIBEE ADMIN USER CONTROLLER
// ========================================

const VALID_ROLES = [
  "student",
  "faculty",
  "admin",
  "hod",
  "librarian",
  "accounts",
  "exam-controller",
];

const VALID_STATUSES = [
  "Active",
  "Pending",
  "Suspended",
];

const EDITABLE_FIELDS = [
  "userId",
  "name",
  "email",
  "role",
  "status",
  "department",
  "joinedAt",
];

// ========================================
// HELPER: FRONTEND RESPONSE FORMAT
// ========================================

function formatUser(user) {
  const data =
    typeof user.toObject === "function"
      ? user.toObject()
      : user;

  return {
    id: String(data._id),
    userId: data.userId || "",
    name: data.fullName,
    email: data.email,
    role: data.role,
    status:
      data.status ||
      (data.isActive ? "Active" : "Suspended"),
    department: data.department || "",
    joinedAt: data.joinedAt || "",
    isActive: data.isActive,
    createdAt: data.createdAt,
  };
}

// ========================================
// HELPER: CLEAN REQUEST DATA
// ========================================

function cleanUserData(body = {}) {
  const result = {};

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return result;
  }

  for (const field of EDITABLE_FIELDS) {
    if (
      !Object.prototype.hasOwnProperty.call(
        body,
        field
      )
    ) {
      continue;
    }

    const value = body[field];

    if (typeof value !== "string") {
      result[field] = value;
      continue;
    }

    result[field] = value.trim();
  }

  if (typeof result.userId === "string") {
    result.userId = result.userId.toUpperCase();
  }

  if (typeof result.email === "string") {
    result.email = result.email.toLowerCase();
  }

  if (typeof result.role === "string") {
    result.role = result.role.toLowerCase();
  }

  return result;
}

// ========================================
// HELPER: VALIDATION
// ========================================

function validateUser(data, creating = false) {
  const required = [
    "userId",
    "name",
    "email",
    "role",
  ];

  for (const field of required) {
    if (
      (creating ||
        Object.prototype.hasOwnProperty.call(
          data,
          field
        )) &&
      (
        typeof data[field] !== "string" ||
        !data[field].trim()
      )
    ) {
      return `${field} is required.`;
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
    data.role !== undefined &&
    !VALID_ROLES.includes(data.role)
  ) {
    return "Invalid user role.";
  }

  if (
    data.status !== undefined &&
    !VALID_STATUSES.includes(data.status)
  ) {
    return "Invalid account status.";
  }

  if (
    data.joinedAt &&
    !/^\d{4}-\d{2}-\d{2}$/.test(
      data.joinedAt
    )
  ) {
    return "Joined date must use YYYY-MM-DD.";
  }

  return null;
}

// ========================================
// HELPER: DATABASE ERRORS
// ========================================

function handleError(res, error) {
  console.error(
    "User Management Error:",
    error.message
  );

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "User ID or email already exists.",
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
      message: "Invalid user data.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Unable to complete the operation.",
  });
}

// ========================================
// HELPER: VALIDATE DATABASE ID
// ========================================

function validId(id) {
  return mongoose.isValidObjectId(id);
}

// ========================================
// HELPER: PREVENT REMOVING LAST ADMIN
// ========================================

async function isLastActiveAdmin(user) {
  if (
    user.role !== "admin" ||
    !user.isActive
  ) {
    return false;
  }

  const otherAdmins = await User.countDocuments({
    _id: { $ne: user._id },
    role: "admin",
    isActive: true,
  });

  return otherAdmins === 0;
}

// ========================================
// CREATE USER
// POST /api/users
// ========================================

async function createUser(req, res) {
  try {
    const data = cleanUserData(req.body);

    const validationError = validateUser(
      data,
      true
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const password = req.body?.password;

    if (
      typeof password !== "string" ||
      password.length < 12
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A password of at least 12 characters is required.",
      });
    }

    const status = data.status || "Pending";

    const user = await User.create({
      userId: data.userId,
      fullName: data.name,
      email: data.email,
      password,
      role: data.role,
      department: data.department || "",
      joinedAt:
        data.joinedAt ||
        new Date().toISOString().slice(0, 10),
      status,
      isActive: status === "Active",
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: formatUser(user),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// GET ALL USERS
// GET /api/users
// ========================================

async function getUsers(req, res) {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users.map(formatUser),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// GET SINGLE USER
// GET /api/users/:id
// ========================================

async function getUserById(req, res) {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user record ID.",
      });
    }

    const user = await User.findById(id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatUser(user),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// UPDATE USER
// PUT /api/users/:id
// ========================================

async function updateUser(req, res) {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user record ID.",
      });
    }

    const data = cleanUserData(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update.",
      });
    }

    const validationError = validateUser(data);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isSelf =
      String(req.user._id) === String(user._id);

    if (
      isSelf &&
      (
        (data.role && data.role !== "admin") ||
        (data.status && data.status !== "Active")
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot remove your own Admin access.",
      });
    }

    if (
      user.role === "admin" &&
      user.isActive &&
      (
        (data.role && data.role !== "admin") ||
        (data.status && data.status !== "Active")
      ) &&
      await isLastActiveAdmin(user)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Cannot remove the last active Admin.",
      });
    }

    if (data.userId !== undefined) {
      user.userId = data.userId;
    }

    if (data.name !== undefined) {
      user.fullName = data.name;
    }

    if (data.email !== undefined) {
      user.email = data.email;
    }

    if (data.role !== undefined) {
      user.role = data.role;
    }

    if (data.department !== undefined) {
      user.department = data.department;
    }

    if (data.joinedAt !== undefined) {
      user.joinedAt = data.joinedAt;
    }

    if (data.status !== undefined) {
      user.status = data.status;
      user.isActive =
        data.status === "Active";
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: formatUser(user),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// CHANGE ACCOUNT STATUS
// PATCH /api/users/:id/status
// ========================================

async function changeUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user record ID.",
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account status.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (
      String(req.user._id) === String(user._id) &&
      status !== "Active"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot suspend your own account.",
      });
    }

    if (
      user.role === "admin" &&
      user.isActive &&
      status !== "Active" &&
      await isLastActiveAdmin(user)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Cannot suspend the last active Admin.",
      });
    }

    user.status = status;
    user.isActive = status === "Active";

    await user.save();

    return res.status(200).json({
      success: true,
      message: `User status changed to ${status}.`,
      data: formatUser(user),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// DELETE USER
// DELETE /api/users/:id
// ========================================

async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user record ID.",
      });
    }

    if (String(req.user._id) === id) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot delete your own account.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (await isLastActiveAdmin(user)) {
      return res.status(403).json({
        success: false,
        message:
          "Cannot delete the last active Admin.",
      });
    }

    await user.deleteOne();

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
      data: {
        id: String(user._id),
        userId: user.userId || "",
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ========================================
// EXPORT CONTROLLER
// ========================================

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  changeUserStatus,
  deleteUser,
};
