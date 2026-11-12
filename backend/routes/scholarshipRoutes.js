
const express = require("express");
const mongoose = require("mongoose");

const StudentFee = require("../models/StudentFee");
const StudentPayment = require("../models/StudentPayment");
const StudentScholarship = require("../models/StudentScholarship");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

const manage = authorize("accounts", "admin");

const editableFields = [
  "scholarshipType",
  "scholarshipName",
  "applicationDate",
  "tuitionAmount",
  "waiverType",
  "waiverValue",
  "status",
  "notes",
];

const statuses = [
  "Pending",
  "Under Review",
  "Approved",
  "Rejected",
  "Cancelled",
];

function cents(value) {
  return Math.round(Number(value) * 100);
}

function validMoney(value, positive = true) {
  const n = Number(value);
  return Number.isFinite(n) &&
    (positive ? n > 0 : n >= 0) &&
    Math.abs(n * 100 - Math.round(n * 100)) < 0.000001;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function format(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: String(obj._id) };
}

function calculateAward(record) {
  const tuition = cents(record.tuitionAmount);
  const waiver = Number(record.waiverValue);

  if (record.waiverType === "Percentage") {
    return Math.min(
      tuition,
      Math.round(tuition * waiver / 100)
    );
  }

  return Math.min(tuition, cents(waiver));
}

function validateRecord(record) {
  if (!record.scholarshipName?.trim()) {
    return "Scholarship name is required.";
  }

  if (!record.scholarshipType?.trim()) {
    return "Scholarship type is required.";
  }

  if (!validDate(record.applicationDate)) {
    return "Invalid application date.";
  }

  if (!validMoney(record.tuitionAmount) ||
      !validMoney(record.waiverValue)) {
    return "Enter valid tuition and waiver values.";
  }

  if (!["Percentage", "Fixed Amount"].includes(
    record.waiverType
  )) {
    return "Invalid waiver type.";
  }

  if (record.waiverType === "Percentage" &&
      Number(record.waiverValue) > 100) {
    return "Waiver percentage cannot exceed 100%.";
  }

  if (!statuses.includes(record.status)) {
    return "Invalid scholarship status.";
  }

  return null;
}

async function approvedAmountAvailable(record, excludeId) {
  const [fee, payments, otherAwards] = await Promise.all([
    StudentFee.findById(record.fee),
    StudentPayment.find({
      fee: record.fee,
      status: "Completed",
    }).lean(),
    StudentScholarship.find({
      fee: record.fee,
      status: "Approved",
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).lean(),
  ]);

  if (!fee || fee.status !== "Active") {
    return {
      error: "An active student fee is required.",
    };
  }

  const paid = payments.reduce(
    (sum, p) => sum + cents(p.amount),
    0
  );

  const otherWaivers = otherAwards.reduce(
    (sum, award) => sum + cents(award.approvedAmount),
    0
  );

  const requested = calculateAward(record);
  const remaining = cents(fee.amount) - paid - otherWaivers;

  if (requested > remaining) {
    return {
      error:
        "Approved waiver exceeds the unpaid fee balance. " +
        `Maximum available waiver: ৳${Math.max(0, remaining) / 100}`,
    };
  }

  return { approvedAmount: requested / 100 };
}

async function saveScholarship(req, res, existing = null) {
  try {
    const body = req.body || {};

    let record;
    let fee;

    if (existing) {
      record = existing;

      for (const field of editableFields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          record[field] = body[field];
        }
      }

      fee = await StudentFee.findById(record.fee);
    } else {
      if (!mongoose.isValidObjectId(body.feeId)) {
        return res.status(400).json({
          success: false,
          message: "Select a valid Student Fee.",
        });
      }

      fee = await StudentFee.findById(body.feeId);

      if (!fee || fee.status !== "Active") {
        return res.status(404).json({
          success: false,
          message: "Active student fee not found.",
        });
      }

      const fields = {};

      for (const field of editableFields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          fields[field] = body[field];
        }
      }

      record = new StudentScholarship({
        ...fields,
        fee: fee._id,
        student: fee.student,
        studentId: fee.studentId,
        studentName: fee.studentName,
        semester: fee.semester,
        createdBy: req.user._id,
      });
    }

    const error = validateRecord(record);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    if (record.status === "Approved") {
      const result = await approvedAmountAvailable(
        record,
        existing ? existing._id : null
      );

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      record.approvedAmount = result.approvedAmount;
      record.approvedDate = today();
    } else {
      record.approvedAmount = 0;
      record.approvedDate = "";
    }

    await record.save();

    return res.status(existing ? 200 : 201).json({
      success: true,
      message: existing
        ? "Scholarship updated in MongoDB."
        : "Scholarship created in MongoDB.",
      data: format(record),
    });
  } catch (error) {
    console.error("Scholarship Save:", error);

    return res.status(
      error.name === "ValidationError" ? 400 : 500
    ).json({
      success: false,
      message:
        error.name === "ValidationError"
          ? error.message
          : "Could not save scholarship.",
    });
  }
}

// Admin/Accounts: all records
// Student: own records only
router.get("/", async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "student") {
      filter = {
        studentId: String(req.user.userId || "")
          .trim()
          .toUpperCase(),
      };
    } else if (!["accounts", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const rows = await StudentScholarship.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: rows.map(format),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not load scholarships.",
    });
  }
});

router.post("/", manage, async (req, res) => {
  return saveScholarship(req, res);
});

router.put("/:id", manage, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid scholarship ID.",
    });
  }

  const existing = await StudentScholarship.findById(
    req.params.id
  );

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Scholarship not found.",
    });
  }

  return saveScholarship(req, res, existing);
});

// Keep scholarship history: cancel instead of deleting.
router.delete("/:id", manage, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid scholarship ID.",
      });
    }

    const record = await StudentScholarship.findById(
      req.params.id
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Scholarship not found.",
      });
    }

    record.status = "Cancelled";
    record.approvedAmount = 0;
    record.approvedDate = "";

    await record.save();

    return res.json({
      success: true,
      message: "Scholarship cancelled in MongoDB.",
      data: format(record),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not cancel scholarship.",
    });
  }
});

module.exports = router;
