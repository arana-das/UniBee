
const express = require("express");
const mongoose = require("mongoose");

const SeatPlan = require("../models/SeatPlan");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// ========================================
// UNIBEE SEAT PLAN ROUTES
// ========================================

const router = express.Router();

router.use(protect);
router.use(authorize("admin", "exam-controller"));

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function format(doc) {
  const item =
    typeof doc.toObject === "function"
      ? doc.toObject()
      : doc;

  return {
    ...item,
    id: String(item._id),
  };
}

// Parse student ID containing a numeric suffix.
function parseId(value) {
  const input = String(value ?? "")
    .trim()
    .toUpperCase();

  const match = /^(.*?)(\d+)$/.exec(input);

  if (!match) return null;

  return {
    text: input,
    prefix: match[1],
    number: BigInt(match[2]),
    width: match[2].length,
  };
}

// Detect duplicate student ranges.
function overlaps(a, b) {
  const aStart = parseId(a.startId);
  const aEnd = parseId(a.endId);
  const bStart = parseId(b.startId);
  const bEnd = parseId(b.endId);

  if (
    !aStart ||
    !aEnd ||
    !bStart ||
    !bEnd
  ) {
    return false;
  }

  return (
    aStart.prefix === bStart.prefix &&
    aStart.number <= bEnd.number &&
    bStart.number <= aEnd.number
  );
}

// ========================================
// VALIDATE AND NORMALIZE INPUT
// ========================================

function normalize(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new Error("Invalid request body.");
  }

  const room = String(
    body.room ?? ""
  ).trim().toUpperCase();

  const building = String(
    body.building ?? ""
  ).trim();

  const examDate = String(
    body.examDate ?? ""
  ).trim();

  const session = String(
    body.session ?? ""
  ).trim();

  const capacity = Number(body.capacity);

  if (
    !room ||
    room.length > 50 ||
    building.length > 100
  ) {
    throw new Error(
      "Enter valid Room Number and Building."
    );
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(examDate)) {
    throw new Error(
      "Enter a valid Examination Date."
    );
  }

  const parsedDate = new Date(
    `${examDate}T00:00:00Z`
  );

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== examDate
  ) {
    throw new Error(
      "Enter a valid Examination Date."
    );
  }

  if (
    ![
      "Morning",
      "Afternoon",
      "Evening",
    ].includes(session)
  ) {
    throw new Error(
      "Select a valid Examination Session."
    );
  }

  if (
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    capacity > 10000
  ) {
    throw new Error(
      "Room Capacity must be between 1 and 10000."
    );
  }

  if (
    !Array.isArray(body.batches) ||
    body.batches.length === 0 ||
    body.batches.length > 200
  ) {
    throw new Error("Add 1–200 batches.");
  }

  const batches = body.batches.map(
    (row, index) => {
      const batch = String(
        row?.batch ?? ""
      ).trim();

      const students = Number(
        row?.students
      );

      const startId = String(
        row?.startId ?? ""
      ).trim().toUpperCase();

      const endId = String(
        row?.endId ?? ""
      ).trim().toUpperCase();

      const first = parseId(startId);
      const last = parseId(endId);

      if (
        !batch ||
        batch.length > 50
      ) {
        throw new Error(
          `Batch ${index + 1}: Enter a valid batch name.`
        );
      }

      if (
        !Number.isSafeInteger(students) ||
        students < 1
      ) {
        throw new Error(
          `Batch ${batch}: Invalid student count.`
        );
      }

      if (
        !first ||
        !last ||
        startId.length > 70 ||
        endId.length > 70 ||
        first.prefix !== last.prefix ||
        first.width !== last.width ||
        first.number > last.number
      ) {
        throw new Error(
          `Batch ${batch}: Invalid Student ID range.`
        );
      }

      const rangeCount =
        last.number - first.number + 1n;

      if (rangeCount !== BigInt(students)) {
        throw new Error(
          `Batch ${batch}: ID range must contain exactly ${students} consecutive students.`
        );
      }

      return {
        batch,
        students,
        startId,
        endId,
      };
    }
  );

  const total = batches.reduce(
    (sum, item) => sum + item.students,
    0
  );

  if (total > capacity) {
    throw new Error(
      `Capacity exceeded: ${total} students / ${capacity} seats.`
    );
  }

  // Prevent overlap inside the same room.
  for (
    let i = 0;
    i < batches.length;
    i++
  ) {
    for (
      let j = i + 1;
      j < batches.length;
      j++
    ) {
      if (overlaps(batches[i], batches[j])) {
        throw new Error(
          "Student ID ranges overlap within this room."
        );
      }
    }
  }

  return {
    room,
    building,
    examDate,
    session,
    capacity,
    batches,
    total,
  };
}

// ========================================
// FIND CONFLICT WITH OTHER ROOM PLANS
// ========================================

async function findConflict(input, excludeId) {
  const filter = {
    examDate: input.examDate,
    session: input.session,
  };

  if (excludeId) {
    filter._id = {
      $ne: excludeId,
    };
  }

  const existing = await SeatPlan.find(
    filter
  ).lean();

  for (const plan of existing) {
    const sameRoom =
      plan.room === input.room &&
      String(plan.building || "")
        .trim()
        .toUpperCase() ===
        input.building.toUpperCase();

    if (sameRoom) {
      return (
        `Room ${input.room} already has a plan ` +
        "for this date and session."
      );
    }

    for (const batch of input.batches) {
      if (
        plan.batches.some(
          (other) =>
            overlaps(batch, other)
        )
      ) {
        return (
          "Student ID range overlaps with " +
          `Room ${plan.room} ` +
          `(${plan.building || "No building"}).`
        );
      }
    }
  }

  return null;
}

// ========================================
// ERROR HANDLING
// ========================================

function handleError(res, error) {
  console.error(
    "Seat Plan API:",
    error
  );

  if (error.code === 11000) {
    return fail(
      res,
      409,
      "This room already has a plan for the selected date/session."
    );
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return fail(
      res,
      400,
      error.message
    );
  }

  return fail(
    res,
    500,
    "Seat Plan operation failed."
  );
}

// ========================================
// GET ALL SEAT PLANS
// GET /api/seat-plans
// ========================================

router.get("/", async (req, res) => {
  try {
    const records = await SeatPlan.find({})
      .sort({
        examDate: -1,
        session: 1,
        room: 1,
      })
      .lean();

    return res.json({
      success: true,
      count: records.length,
      data: records.map(format),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// CREATE SEAT PLAN
// POST /api/seat-plans
// ========================================

router.post("/", async (req, res) => {
  let input;

  try {
    input = normalize(req.body);
  } catch (error) {
    return fail(
      res,
      400,
      error.message
    );
  }

  try {
    const conflict = await findConflict(input);

    if (conflict) {
      return fail(res, 409, conflict);
    }

    const record = await SeatPlan.create({
      ...input,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Seat Plan saved to MongoDB.",
      data: format(record),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// UPDATE SEAT PLAN
// PUT /api/seat-plans/:id
// ========================================

router.put("/:id", async (req, res) => {
  if (
    !mongoose.isValidObjectId(
      req.params.id
    )
  ) {
    return fail(
      res,
      400,
      "Invalid Seat Plan ID."
    );
  }

  let input;

  try {
    input = normalize(req.body);
  } catch (error) {
    return fail(
      res,
      400,
      error.message
    );
  }

  try {
    const existing =
      await SeatPlan.findById(
        req.params.id
      );

    if (!existing) {
      return fail(
        res,
        404,
        "Seat Plan not found."
      );
    }

    const conflict = await findConflict(
      input,
      existing._id
    );

    if (conflict) {
      return fail(
        res,
        409,
        conflict
      );
    }

    existing.set({
      ...input,
      updatedBy: req.user._id,
    });

    await existing.save();

    return res.json({
      success: true,
      message: "Seat Plan updated in MongoDB.",
      data: format(existing),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// DELETE SEAT PLAN
// DELETE /api/seat-plans/:id
// ========================================

router.delete("/:id", async (req, res) => {
  if (
    !mongoose.isValidObjectId(
      req.params.id
    )
  ) {
    return fail(
      res,
      400,
      "Invalid Seat Plan ID."
    );
  }

  try {
    const deleted =
      await SeatPlan.findByIdAndDelete(
        req.params.id
      );

    if (!deleted) {
      return fail(
        res,
        404,
        "Seat Plan not found."
      );
    }

    return res.json({
      success: true,
      message: "Seat Plan deleted.",
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// EXPORT
// ========================================

module.exports = router;
