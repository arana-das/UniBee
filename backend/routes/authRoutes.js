
const express = require("express");

const {
  login,
  getCurrentUser,
} = require("../controllers/authController");

const {
  protect,
} = require("../middleware/authMiddleware");

// ========================================
// UNIBEE AUTHENTICATION ROUTES
// ========================================

const router = express.Router();

// Public login endpoint
router.post("/login", login);

// Protected current-user endpoint
router.get("/me", protect, getCurrentUser);

// ========================================
// EXPORT
// ========================================

module.exports = router;
