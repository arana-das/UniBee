
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ========================================
// UNIBEE AUTHENTICATION CONTROLLER
// ========================================

const TOKEN_EXPIRES_IN = "8h";

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    { id: String(userId) },
    process.env.JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRES_IN,
      algorithm: "HS256",
    }
  );
}

// ========================================
// LOGIN
// POST /api/auth/login
// ========================================

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches =
      await user.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user._id);

    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      tokenType: "Bearer",
      expiresIn: TOKEN_EXPIRES_IN,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to complete login.",
    });
  }
}

// ========================================
// GET CURRENT USER
// GET /api/auth/me
// ========================================

async function getCurrentUser(req, res) {
  try {
    return res.status(200).json({
      success: true,
      user: req.user.toSafeObject(),
    });
  } catch (error) {
    console.error(
      "Current user error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user profile.",
    });
  }
}

// ========================================
// EXPORT
// ========================================

module.exports = {
  login,
  getCurrentUser,
};
