const express = require("express");
const mongoose = require("mongoose");
const Notice = require("../models/Notice");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

function formatNotice(doc) {
  const data = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    ...data,
    id: String(data._id),
    createdAt: data.createdAt ? new Date(data.createdAt).toISOString().split("T")[0] : "",
    publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString().split("T")[0] : "",
  };
}

// ========================================
// GET ALL NOTICES (Role-Filtered)
// ========================================
router.get("/", async (req, res) => {
  try {
    const userRole = req.user.role;
    const filter = {};

    if (userRole === "student") {
      filter.status = "Published";
      filter.audience = { $in: ["All", "Students"] };
    } else if (userRole === "faculty") {
      filter.status = "Published";
      filter.audience = { $in: ["All", "Faculty"] };
    } else if (userRole === "admin") {
      // Admin sees everything
    } else if (userRole === "hod") {
      // HOD sees All, Faculty, Students
      filter.$or = [
        { status: "Published" },
        { createdBy: req.user._id },
      ];
    } else {
      // Other roles (accounts, exam-controller, librarian)
      filter.status = "Published";
      filter.audience = { $in: ["All", userRole] };
    }

    const notices = await Notice.find(filter)
      .sort({ pinned: -1, publishedAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: notices.map(formatNotice),
    });
  } catch (error) {
    console.error("Notice fetch error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve notices.",
    });
  }
});

// ========================================
// GET SINGLE NOTICE
// ========================================
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID.",
      });
    }

    const notice = await Notice.findById(req.params.id).lean();

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found.",
      });
    }

    // Role visibility check
    if (
      req.user.role === "student" &&
      (notice.status !== "Published" ||
        !["All", "Students"].includes(notice.audience))
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatNotice(notice),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch notice.",
    });
  }
});

// ========================================
// CREATE NOTICE (Admin & HOD)
// ========================================
router.post("/", authorize("admin", "hod"), async (req, res) => {
  try {
    const {
      title,
      content,
      category = "General",
      audience = "All",
      priority = "Normal",
      status = "Published",
      pinned = false,
      expiryDate = "",
      department = "",
      author,
    } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice title is required.",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice content is required.",
      });
    }

    const notice = await Notice.create({
      title: title.trim(),
      content: content.trim(),
      category,
      audience,
      priority,
      status,
      pinned: Boolean(pinned),
      expiryDate: expiryDate ? expiryDate.trim() : "",
      department: department ? department.trim() : "",
      author: author && author.trim() ? author.trim() : req.user.fullName || "University Administration",
      createdBy: req.user._id,
      publishedAt: status === "Published" ? new Date() : null,
    });

    return res.status(201).json({
      success: true,
      message: "Notice created successfully.",
      data: formatNotice(notice),
    });
  } catch (error) {
    console.error("Notice creation error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create notice.",
    });
  }
});

// ========================================
// UPDATE NOTICE (Admin & HOD)
// ========================================
router.put("/:id", authorize("admin", "hod"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID.",
      });
    }

    const existing = await Notice.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Notice not found.",
      });
    }

    const {
      title,
      content,
      category,
      audience,
      priority,
      status,
      pinned,
      expiryDate,
      department,
      author,
    } = req.body || {};

    if (title !== undefined) existing.title = title.trim();
    if (content !== undefined) existing.content = content.trim();
    if (category !== undefined) existing.category = category;
    if (audience !== undefined) existing.audience = audience;
    if (priority !== undefined) existing.priority = priority;
    if (pinned !== undefined) existing.pinned = Boolean(pinned);
    if (expiryDate !== undefined) existing.expiryDate = expiryDate;
    if (department !== undefined) existing.department = department;
    if (author !== undefined) existing.author = author;

    if (status !== undefined) {
      if (status === "Published" && existing.status !== "Published") {
        existing.publishedAt = new Date();
      }
      existing.status = status;
    }

    await existing.save();

    return res.status(200).json({
      success: true,
      message: "Notice updated successfully.",
      data: formatNotice(existing),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update notice.",
    });
  }
});

// ========================================
// DELETE NOTICE (Admin)
// ========================================
router.delete("/:id", authorize("admin", "hod"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID.",
      });
    }

    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notice deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete notice.",
    });
  }
});

module.exports = router;
