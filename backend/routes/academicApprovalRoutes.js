
const express = require("express");
const mongoose = require("mongoose");

const AcademicApproval = require("../models/AcademicApproval");
const Department = require("../models/Department");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// ========================================
// HELPERS
// ========================================

const clean = (value) =>
  typeof value === "string" ? value.trim() : "";

function exact(value) {
  const escaped = value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  return new RegExp(`^${escaped}$`, "i");
}

// Resolve a HOD's assigned department from MongoDB.
// Supports both CSE and Computer Science & Engineering.
async function getHODDepartment(user) {
  const assigned = clean(user.department);

  if (!assigned) {
    return null;
  }

  return Department.findOne({
    $or: [
      { code: exact(assigned) },
      { name: exact(assigned) },
    ],
  }).lean();
}

async function resolveScope(req, res) {
  if (req.user.role === "admin") {
    return { admin: true };
  }

  const department = await getHODDepartment(req.user);

  if (!department) {
    res.status(403).json({
      success: false,
      message:
        "Your HOD account has no valid assigned department.",
    });

    return null;
  }

  return {
    admin: false,
    department,
    filter: {
      department: {
        $in: [
          exact(department.name),
          exact(department.code),
        ],
      },
    },
  };
}

// ========================================
// GET ACADEMIC REQUESTS
// GET /api/academic-approvals
// ========================================

router.get(
  "/",
  authorize("admin", "hod"),
  async (req, res) => {
    try {
      const scope = await resolveScope(req, res);

      if (!scope) return;

      const records = await AcademicApproval.find(
        scope.admin ? {} : scope.filter
      )
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (error) {
      console.error(
        "Academic approval list error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Unable to load academic requests.",
      });
    }
  }
);

// ========================================
// CREATE HOD TEST REQUEST
// POST /api/academic-approvals
// ========================================

router.post(
  "/",
  authorize("hod"),
  async (req, res) => {
    try {
      const scope = await resolveScope(req, res);

      if (!scope) return;

      const body = req.body || {};

      const title = clean(body.title);
      const type = clean(body.type);
      const requesterName = clean(body.requesterName);
      const requesterId = clean(body.requesterId);
      const requesterRole = clean(body.requesterRole);
      const description = clean(body.description);

      if (
        !title ||
        !type ||
        !requesterName ||
        !requesterId ||
        !requesterRole ||
        !description
      ) {
        return res.status(400).json({
          success: false,
          message: "Complete all required fields.",
        });
      }

      const request = await AcademicApproval.create({
        title,
        type,
        department: scope.department.name,
        requesterName,
        requesterId,
        requesterRole,
        description,
        status: "Pending",
        source: "HOD Test",
      });

      return res.status(201).json({
        success: true,
        message: "Academic test request saved to MongoDB.",
        data: request,
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error(
        "Academic request creation error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Unable to create academic request.",
      });
    }
  }
);

// ========================================
// APPROVE / REJECT
// PATCH /api/academic-approvals/:id/decision
// ========================================

router.patch(
  "/:id/decision",
  authorize("hod"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic request ID.",
        });
      }

      const scope = await resolveScope(req, res);

      if (!scope) return;

      const decision = clean(req.body?.decision);
      const reviewNote = clean(req.body?.reviewNote);

      if (!["Approved", "Rejected"].includes(decision)) {
        return res.status(400).json({
          success: false,
          message: "Choose Approved or Rejected.",
        });
      }

      if (!reviewNote || reviewNote.length > 2000) {
        return res.status(400).json({
          success: false,
          message:
            "Review note is required (maximum 2000 characters).",
        });
      }

      // Atomic update:
      // Only a pending request from this HOD's
      // department can be reviewed.
      const updated = await AcademicApproval.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "Pending",
          ...scope.filter,
        },
        {
          $set: {
            status: decision,
            reviewNote,
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updated) {
        return res.status(409).json({
          success: false,
          message:
            "Request not found, already reviewed, or outside your department.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Request ${decision.toLowerCase()} successfully.`,
        data: updated,
      });
    } catch (error) {
      console.error(
        "Academic approval decision error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Unable to save academic decision.",
      });
    }
  }
);

module.exports = router;

