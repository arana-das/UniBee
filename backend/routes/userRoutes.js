
const express = require("express");

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  changeUserStatus,
  deleteUser,
} = require("../controllers/userController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// ========================================
// UNIBEE USER MANAGEMENT ROUTES
// ========================================

const router = express.Router();

// All routes require a valid login token
// and the Admin role.
router.use(protect);
router.use(authorize("admin"));

// ========================================
// USER COLLECTION
// ========================================

// GET /api/users
router.get("/", getUsers);

// POST /api/users
router.post("/", createUser);

// ========================================
// INDIVIDUAL USER OPERATIONS
// ========================================

// GET /api/users/:id
router.get("/:id", getUserById);

// PUT /api/users/:id
router.put("/:id", updateUser);

// PATCH /api/users/:id/status
router.patch("/:id/status", changeUserStatus);

// DELETE /api/users/:id
router.delete("/:id", deleteUser);

// ========================================
// EXPORT
// ========================================

module.exports = router;
