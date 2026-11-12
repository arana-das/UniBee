
const express = require("express");
const Department = require("../models/Department");
const Student = require("../models/Student");

const {
  toStudentFrontend,
} = require("../middleware/studentDataMapper");

const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// Safely match a full department name or code.
function exact(value) {
  const escaped = String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  return new RegExp(`^${escaped}$`, "i");
}

// Admin: all students
// HOD: students from assigned department only
router.get(
  "/",
  authorize("admin", "hod"),
  async (req, res) => {
    if (req.user.role === "admin") {
      return getStudents(req, res);
    }

    try {
      const assigned = String(
        req.user.department || ""
      ).trim();

      if (!assigned) {
        return res.status(403).json({
          success: false,
          message:
            "Your HOD account has no assigned department. Contact Admin.",
        });
      }

      const department = await Department.findOne({
        $or: [
          { code: exact(assigned) },
          { name: exact(assigned) },
        ],
      }).lean();

      if (!department) {
        return res.status(403).json({
          success: false,
          message:
            "Your assigned department is not found in Admin Departments.",
        });
      }

      // Match CSE and Computer Science & Engineering.
      const students = await Student.find({
        department: {
          $in: [
            exact(department.name),
            exact(department.code),
          ],
        },
      })
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        count: students.length,
        data: students.map(toStudentFrontend),
      });
    } catch (error) {
      console.error(
        "HOD students error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load department students.",
      });
    }
  }
);

// Admin-only management
router.post(
  "/",
  authorize("admin"),
  createStudent
);

router.get(
  "/:id",
  authorize("admin"),
  getStudentById
);

router.put(
  "/:id",
  authorize("admin"),
  updateStudent
);

router.delete(
  "/:id",
  authorize("admin"),
  deleteStudent
);

module.exports = router;
