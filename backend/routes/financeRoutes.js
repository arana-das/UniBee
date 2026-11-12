
const express = require("express");
const mongoose = require("mongoose");

const Student = require("../models/Student");
const StudentFee = require("../models/StudentFee");
const StudentPayment = require("../models/StudentPayment");
const StudentScholarship = require("../models/StudentScholarship");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

const manageFinance = authorize("admin", "accounts");

// ========================================
// HELPERS
// ========================================

function fail(res, error) {
  console.error("Finance API:", error.message);

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Finance operation failed.",
  });
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function isManager(req) {
  return ["admin", "accounts"].includes(req.user.role);
}

function studentFilter(req) {
  if (isManager(req)) {
    return {};
  }

  if (req.user.role !== "student") {
    return null;
  }

  return {
    studentId: String(req.user.userId || "")
      .trim()
      .toUpperCase(),
  };
}

function format(document) {
  const obj = document.toObject
    ? document.toObject()
    : document;

  return {
    ...obj,
    id: String(obj._id),
  };
}

function today() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

function validAmount(value, allowZero = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return false;
  }

  if (allowZero ? value < 0 : value <= 0) {
    return false;
  }

  return (
    Math.abs(
      value * 100 - Math.round(value * 100)
    ) < 0.000001
  );
}

function cents(value) {
  return Math.round(Number(value || 0) * 100);
}

// ========================================
// SHARED FINANCE CALCULATION
// FEES - PAYMENTS - APPROVED WAIVERS
// ========================================

function enrichFees(fees, payments, scholarships) {
  const paidByFee = new Map();
  const waivedByFee = new Map();

  for (const payment of payments) {
    if (payment.status !== "Completed") {
      continue;
    }

    const feeId = String(
      payment.fee?._id || payment.fee
    );

    paidByFee.set(
      feeId,
      (paidByFee.get(feeId) || 0) +
        cents(payment.amount)
    );
  }

  for (const scholarship of scholarships) {
    if (scholarship.status !== "Approved") {
      continue;
    }

    const feeId = String(
      scholarship.fee?._id || scholarship.fee
    );

    waivedByFee.set(
      feeId,
      (waivedByFee.get(feeId) || 0) +
        cents(scholarship.approvedAmount)
    );
  }

  return fees.map((fee) => {
    const feeId = String(fee._id);

    const amountCents = cents(fee.amount);
    const paidCents = paidByFee.get(feeId) || 0;
    const waivedCents = waivedByFee.get(feeId) || 0;

    const cancelled = fee.status === "Cancelled";

    const balanceCents = cancelled
      ? 0
      : Math.max(
          0,
          amountCents - paidCents - waivedCents
        );

    let paymentStatus = "Unpaid";

    if (cancelled) {
      paymentStatus = "Cancelled";
    } else if (balanceCents === 0) {
      paymentStatus = "Paid";
    } else if (paidCents > 0 || waivedCents > 0) {
      paymentStatus = "Partial";
    }

    return {
      ...format(fee),

      // Original amount remains unchanged.
      amount: amountCents / 100,

      // Real completed payments only.
      paid: paidCents / 100,

      // Approved scholarships only.
      waived: waivedCents / 100,

      // Actual remaining payable amount.
      balance: balanceCents / 100,

      paymentStatus,
    };
  });
}

// ========================================
// LOAD COMPLETE FEE BALANCES
// ========================================

async function getFeeBalances(filter = {}) {
  const fees = await StudentFee.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  if (fees.length === 0) {
    return [];
  }

  const feeIds = fees.map((fee) => fee._id);

  const [payments, scholarships] = await Promise.all([
    StudentPayment.find({
      fee: { $in: feeIds },
      status: "Completed",
    }).lean(),

    StudentScholarship.find({
      fee: { $in: feeIds },
      status: "Approved",
    }).lean(),
  ]);

  return enrichFees(
    fees,
    payments,
    scholarships
  );
}

// ========================================
// ACTIVE STUDENT DIRECTORY
// ========================================

// GET /api/finance/students

router.get(
  "/students",
  manageFinance,
  async (req, res) => {
    try {
      const students = await Student.find({
        status: "Active",
      })
        .select(
          "studentId fullName email department"
        )
        .sort({ fullName: 1 })
        .lean();

      return res.json({
        success: true,
        data: students.map((student) => ({
          id: String(student._id),
          studentId: student.studentId,
          fullName: student.fullName,
          email: student.email,
          department: student.department,
        })),
      });
    } catch (error) {
      return fail(res, error);
    }
  }
);

// ========================================
// STUDENT FEES
// ========================================

// GET /api/finance/fees

router.get("/fees", async (req, res) => {
  try {
    const filter = studentFilter(req);

    if (!filter) {
      return res.status(403).json({
        success: false,
        message: "Finance access denied.",
      });
    }

    const rows = await getFeeBalances(filter);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return fail(res, error);
  }
});

// POST /api/finance/fees

router.post(
  "/fees",
  manageFinance,
  async (req, res) => {
    try {
      const {
        studentId,
        title,
        amount,
        semester = "",
        dueDate,
        notes = "",
      } = req.body || {};

      const id = String(studentId || "")
        .trim()
        .toUpperCase();

      const student = await Student.findOne({
        studentId: id,
        status: "Active",
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Active student not found.",
        });
      }

      if (
        !String(title || "").trim() ||
        !validAmount(amount, true) ||
        !validDate(dueDate)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid fee title, amount and due date required.",
        });
      }

      const fee = await StudentFee.create({
        student: student._id,
        studentId: student.studentId,
        studentName: student.fullName,
        title: String(title).trim(),
        amount,
        semester,
        dueDate,
        notes,
        createdBy: req.user._id,
      });

      return res.status(201).json({
        success: true,
        message: "Student fee saved to MongoDB.",
        data: format(fee),
      });
    } catch (error) {
      return fail(res, error);
    }
  }
);

// PUT /api/finance/fees/:id

router.put(
  "/fees/:id",
  manageFinance,
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid fee ID.",
        });
      }

      const fee = await StudentFee.findById(
        req.params.id
      );

      if (!fee) {
        return res.status(404).json({
          success: false,
          message: "Fee not found.",
        });
      }

      const allowedFields = [
        "title",
        "amount",
        "semester",
        "dueDate",
        "notes",
        "status",
      ];

      for (const field of allowedFields) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body || {},
            field
          )
        ) {
          fee[field] = req.body[field];
        }
      }

      if (
        !String(fee.title || "").trim() ||
        !validAmount(fee.amount, true) ||
        !validDate(fee.dueDate)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid fee details.",
        });
      }

      const [payments, scholarships] = await Promise.all([
        StudentPayment.find({
          fee: fee._id,
          status: "Completed",
        }).lean(),

        StudentScholarship.find({
          fee: fee._id,
          status: "Approved",
        }).lean(),
      ]);

      const paid = payments.reduce(
        (sum, item) => sum + cents(item.amount),
        0
      );

      const waived = scholarships.reduce(
        (sum, item) =>
          sum + cents(item.approvedAmount),
        0
      );

      if (
        fee.status === "Cancelled" &&
        (paid > 0 || waived > 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot cancel a fee with completed payments " +
            "or approved scholarships.",
        });
      }

      if (cents(fee.amount) < paid + waived) {
        return res.status(400).json({
          success: false,
          message:
            "Fee amount cannot be below total payments " +
            "and approved waivers.",
        });
      }

      await fee.save();

      return res.json({
        success: true,
        message: "Fee updated in MongoDB.",
        data: format(fee),
      });
    } catch (error) {
      return fail(res, error);
    }
  }
);

// ========================================
// PAYMENT RECORDS
// ========================================

// GET /api/finance/payments

router.get("/payments", async (req, res) => {
  try {
    const filter = studentFilter(req);

    if (!filter) {
      return res.status(403).json({
        success: false,
        message: "Finance access denied.",
      });
    }

    const payments = await StudentPayment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: payments.map(format),
    });
  } catch (error) {
    return fail(res, error);
  }
});

// POST /api/finance/payments

router.post(
  "/payments",
  manageFinance,
  async (req, res) => {
    try {
      const {
        feeId,
        amount,
        method = "Cash",
        reference = "",
        paymentDate = today(),
        notes = "",
      } = req.body || {};

      if (
        !validId(feeId) ||
        !validAmount(amount) ||
        !validDate(paymentDate)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid fee, amount and payment date required.",
        });
      }

      const fee = await StudentFee.findById(feeId);

      if (!fee || fee.status !== "Active") {
        return res.status(404).json({
          success: false,
          message: "Active fee not found.",
        });
      }

      // Payments must also respect approved waivers.
      const [payments, scholarships] = await Promise.all([
        StudentPayment.find({
          fee: fee._id,
          status: "Completed",
        }).lean(),

        StudentScholarship.find({
          fee: fee._id,
          status: "Approved",
        }).lean(),
      ]);

      const alreadyPaid = payments.reduce(
        (sum, item) => sum + cents(item.amount),
        0
      );

      const alreadyWaived = scholarships.reduce(
        (sum, item) =>
          sum + cents(item.approvedAmount),
        0
      );

      const remaining =
        cents(fee.amount) -
        alreadyPaid -
        alreadyWaived;

      if (cents(amount) > remaining) {
        return res.status(400).json({
          success: false,
          message:
            "Payment exceeds balance after approved waivers. " +
            `Remaining: ৳${Math.max(0, remaining) / 100}`,
        });
      }

      const payment = await StudentPayment.create({
        fee: fee._id,
        student: fee.student,
        studentId: fee.studentId,
        amount,
        method,
        reference,
        paymentDate,
        notes,
        recordedBy: req.user._id,
      });

      return res.status(201).json({
        success: true,
        message: "Payment recorded in MongoDB.",
        data: format(payment),
      });
    } catch (error) {
      return fail(res, error);
    }
  }
);

// ========================================
// VOID PAYMENT
// ========================================

// PUT /api/finance/payments/:id/void

router.put(
  "/payments/:id/void",
  manageFinance,
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment ID.",
        });
      }

      const payment = await StudentPayment.findById(
        req.params.id
      );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found.",
        });
      }

      if (payment.status === "Voided") {
        return res.status(400).json({
          success: false,
          message: "Payment already voided.",
        });
      }

      payment.status = "Voided";

      payment.notes = [
        payment.notes,
        "Voided by authorized finance user",
      ]
        .filter(Boolean)
        .join(" | ");

      await payment.save();

      return res.json({
        success: true,
        message:
          "Payment voided. Fee balance recalculated.",
        data: format(payment),
      });
    } catch (error) {
      return fail(res, error);
    }
  }
);

// ========================================
// SHARED FINANCE SUMMARY
// ========================================

// GET /api/finance/summary

router.get("/summary", async (req, res) => {
  try {
    const filter = studentFilter(req);

    if (!filter) {
      return res.status(403).json({
        success: false,
        message: "Finance access denied.",
      });
    }

    const rows = (
      await getFeeBalances({
        ...filter,
        status: "Active",
      })
    );

    const totalFeesCents = rows.reduce(
      (sum, row) => sum + cents(row.amount),
      0
    );

    const totalPaidCents = rows.reduce(
      (sum, row) => sum + cents(row.paid),
      0
    );

    const totalWaivedCents = rows.reduce(
      (sum, row) => sum + cents(row.waived),
      0
    );

    const totalDueCents = rows.reduce(
      (sum, row) => sum + cents(row.balance),
      0
    );

    const paymentCount =
      await StudentPayment.countDocuments({
        ...filter,
        status: "Completed",
      });

    return res.json({
      success: true,
      data: {
        totalFees: totalFeesCents / 100,
        totalPaid: totalPaidCents / 100,
        totalWaived: totalWaivedCents / 100,
        totalDue: totalDueCents / 100,
        feeCount: rows.length,
        paymentCount,
      },
    });
  } catch (error) {
    return fail(res, error);
  }
});

module.exports = router;
