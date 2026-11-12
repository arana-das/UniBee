
const express = require("express");
const mongoose = require("mongoose");
const Faculty = require("../models/Faculty");

const {
  createFaculty,
  getFaculty,
  getFacultyById,
  updateFaculty,
  deleteFaculty,
} = require("../controllers/facultyController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// ==========================================
// RESOLVE AUTHENTICATED FACULTY
// ==========================================

async function resolveMyFaculty(user) {
  if (!user || user.role !== "faculty") {
    return null;
  }

  const byUser = await Faculty.findOne({
    userId: user._id,
    status: "Active",
  });

  const byProfile =
    user.profileId &&
    mongoose.isValidObjectId(user.profileId)
      ? await Faculty.findOne({
          _id: user.profileId,
          status: "Active",
        })
      : null;

  if (
    byUser &&
    byProfile &&
    String(byUser._id) !==
      String(byProfile._id)
  ) {
    return null;
  }

  const faculty = byUser || byProfile;

  if (!faculty) return null;

  if (
    faculty.userId &&
    String(faculty.userId) !==
      String(user._id)
  ) {
    return null;
  }

  return faculty;
}

function formatProfile(faculty) {
  return {
    id: String(faculty._id),
    facultyId: faculty.facultyId,
    fullName: faculty.name,
    email: faculty.email,
    phone: faculty.phone || "",
    department: faculty.department,
    designation: faculty.designation,
    qualification: faculty.qualification || "",
    specialization: faculty.specialization || "",
    experience: faculty.experience ?? 0,
    office: faculty.office || "",
    officeHours: faculty.officeHours || "",
    biography: faculty.biography || "",
    teachingInterests:
      faculty.teachingInterests || "",
    researchAreas: faculty.researchAreas || "",
    website: faculty.website || "",
    avatar: faculty.avatar || "",
    status: faculty.status,
  };
}

// ==========================================
// GET /api/faculty/me/profile
// ==========================================

router.get(
  "/me/profile",
  authorize("faculty"),
  async (req, res) => {
    try {
      const faculty =
        await resolveMyFaculty(req.user);

      if (!faculty) {
        return res.status(403).json({
          success: false,
          message:
            "Faculty account is not linked to an active Faculty profile.",
        });
      }

      return res.json({
        success: true,
        data: formatProfile(faculty),
      });
    } catch (error) {
      console.error("Faculty profile error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to load Faculty profile.",
      });
    }
  }
);

// ==========================================
// PATCH /api/faculty/me/profile
// ==========================================

router.patch(
  "/me/profile",
  authorize("faculty"),
  async (req, res) => {
    try {
      const faculty =
        await resolveMyFaculty(req.user);

      if (!faculty) {
        return res.status(403).json({
          success: false,
          message: "Faculty profile not linked.",
        });
      }

      const editable = {
        phone: 40,
        office: 200,
        officeHours: 200,
        qualification: 500,
        specialization: 500,
        biography: 2000,
        teachingInterests: 1000,
        researchAreas: 1000,
        website: 300,
      };

      const input = req.body || {};

      for (const [field, maximum] of Object.entries(editable)) {
        if (
          !Object.prototype.hasOwnProperty.call(
            input,
            field
          )
        ) {
          continue;
        }

        if (
          typeof input[field] !== "string" ||
          input[field].length > maximum
        ) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field}. Maximum ${maximum} characters.`,
          });
        }

        faculty[field] = input[field].trim();
      }

      if (
        Object.prototype.hasOwnProperty.call(
          input,
          "experience"
        )
      ) {
        const years = Number(input.experience);

        if (
          !Number.isFinite(years) ||
          years < 0 ||
          years > 70
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Experience must be between 0 and 70 years.",
          });
        }

        faculty.experience = years;
      }

      if (faculty.website) {
        try {
          const url = new URL(faculty.website);

          if (!["https:", "http:"].includes(url.protocol)) {
            throw new Error("Invalid URL");
          }
        } catch {
          return res.status(400).json({
            success: false,
            message: "Enter a valid website URL.",
          });
        }
      }

      await faculty.save();

      return res.json({
        success: true,
        message: "Profile updated successfully.",
        data: formatProfile(faculty),
      });
    } catch (error) {
      console.error("Profile update error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update profile.",
      });
    }
  }
);

// ==========================================
// PATCH /api/faculty/me/photo
// ==========================================

router.patch(
  "/me/photo",
  authorize("faculty"),
  async (req, res) => {
    try {
      const faculty =
        await resolveMyFaculty(req.user);

      if (!faculty) {
        return res.status(403).json({
          success: false,
          message: "Faculty profile not linked.",
        });
      }

      const avatar = req.body?.avatar;

      if (typeof avatar !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid profile picture.",
        });
      }

      // Empty string removes an existing picture.
      if (avatar !== "") {
        const match = avatar.match(
          /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/
        );

        if (
          !match ||
          avatar.length > 85000
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Profile picture is invalid or too large.",
          });
        }

        const buffer = Buffer.from(
          match[1],
          "base64"
        );

        const validJPEG =
          buffer.length > 4 &&
          buffer[0] === 0xff &&
          buffer[1] === 0xd8 &&
          buffer[buffer.length - 2] === 0xff &&
          buffer[buffer.length - 1] === 0xd9;

        if (
          !validJPEG ||
          buffer.length > 63000
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please upload a valid compressed JPEG picture.",
          });
        }
      }

      faculty.avatar = avatar;

      await faculty.save();

      return res.json({
        success: true,
        message: avatar
          ? "Profile picture updated successfully."
          : "Profile picture removed successfully.",
        data: {
          avatar: faculty.avatar,
        },
      });
    } catch (error) {
      console.error("Faculty photo error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to save profile picture.",
      });
    }
  }
);

// ==========================================
// EXISTING ADMIN / HOD ROUTES
// ==========================================

router.get(
  "/",
  authorize("admin", "hod"),
  getFaculty
);

router.post(
  "/",
  authorize("admin"),
  createFaculty
);

router.get(
  "/:id",
  authorize("admin", "hod"),
  getFacultyById
);

router.put(
  "/:id",
  authorize("admin"),
  updateFaculty
);

router.delete(
  "/:id",
  authorize("admin"),
  deleteFaculty
);

module.exports = router;
