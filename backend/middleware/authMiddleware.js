
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ========================================
// UNIBEE AUTHENTICATION MIDDLEWARE
// ========================================

// Verify a logged-in user's JWT token
async function protect(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return res.status(500).json({
        success: false,
        message: "Authentication service is unavailable.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
      }
    );

    if (
      !decoded ||
      typeof decoded.id !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const user = await User.findById(
      decoded.id
    ).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is unavailable.",
      });
    }

    // Use the current database role, not a
    // potentially outdated role in the token.
    req.user = user;

    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError" ||
      error.name === "CastError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired login session.",
      });
    }

    console.error(
      "Authentication middleware error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Authentication verification failed.",
    });
  }
}

// ========================================
// ROLE-BASED ACCESS CONTROL
// ========================================

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action.",
      });
    }

    return next();
  };
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
  protect,
  authorize,
};
