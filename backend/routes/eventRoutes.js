
const express = require("express");
const mongoose = require("mongoose");

const Event = require("../models/Event");
const EventRegistration = require("../models/EventRegistration");
const Student = require("../models/Student");
const User = require("../models/User");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// ========================================
// CONFIGURATION
// ========================================

// UniBee campus timezone: Bangladesh (UTC+06:00).
// Change this if the university uses another timezone.
const CAMPUS_OFFSET = "+06:00";

const CATEGORIES = [
  "Academic",
  "Workshop",
  "Seminar",
  "Cultural",
  "Sports",
  "Career",
  "Competition",
  "Other",
];

const AUDIENCES = [
  "All",
  "Students",
  "Faculty",
  "Staff",
];

const STATUSES = [
  "Draft",
  "Published",
  "Cancelled",
  "Completed",
];

// ========================================
// HELPERS
// ========================================

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function handleError(res, error) {
  console.error("Event API Error:", error.message);

  if (error.code === 11000) {
    return fail(
      res,
      409,
      "This student is already registered for the event."
    );
  }

  if (error.name === "ValidationError") {
    return fail(
      res,
      400,
      Object.values(error.errors)
        .map((item) => item.message)
        .join(" ")
    );
  }

  if (error.name === "CastError") {
    return fail(res, 400, "Invalid database reference.");
  }

  return fail(
    res,
    500,
    "Unable to process the event request."
  );
}

function isValidDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isValidTime(value) {
  return (
    typeof value === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

function eventStartDate(event) {
  return new Date(
    `${event.date}T${event.startTime}:00${CAMPUS_OFFSET}`
  );
}

function eventIsUpcoming(event) {
  return eventStartDate(event).getTime() > Date.now();
}

function deadlineIsOpen(event) {
  return (
    !event.registrationDeadline ||
    new Date(event.registrationDeadline).getTime() >
      Date.now()
  );
}

function studentCanSee(event) {
  return (
    event.status === "Published" &&
    ["All", "Students"].includes(event.audience)
  );
}

function registrationIsOpen(event) {
  return (
    studentCanSee(event) &&
    eventIsUpcoming(event) &&
    deadlineIsOpen(event)
  );
}

function eventPublicData(event) {
  const data =
    typeof event.toObject === "function"
      ? event.toObject({ virtuals: true })
      : { ...event };

  delete data.createdBy;

  return {
    ...data,
    availableSeats: Math.max(
      0,
      Number(data.capacity) -
        Number(data.registrationCount || 0)
    ),
    registrationOpen:
      registrationIsOpen(data) &&
      Number(data.registrationCount || 0) <
        Number(data.capacity),
  };
}

function cleanText(value) {
  return String(value ?? "").trim();
}

// ========================================
// VALIDATE EVENT FORM
// ========================================

function validateEventInput(body) {
  const data = {
    title: cleanText(body.title),
    category: cleanText(body.category || "Academic"),
    description: cleanText(body.description),
    date: cleanText(body.date),
    startTime: cleanText(body.startTime),
    endTime: cleanText(body.endTime),
    venue: cleanText(body.venue),
    organizer: cleanText(body.organizer),
    audience: cleanText(body.audience || "All"),
    status: cleanText(body.status || "Draft"),
    capacity: Number(body.capacity),
    registrationDeadline:
      body.registrationDeadline === null ||
      body.registrationDeadline === undefined ||
      body.registrationDeadline === ""
        ? null
        : new Date(body.registrationDeadline),
  };

  if (
    data.title.length < 5 ||
    data.title.length > 180
  ) {
    return {
      error: "Event title must contain 5–180 characters.",
    };
  }

  if (!CATEGORIES.includes(data.category)) {
    return { error: "Invalid event category." };
  }

  if (!AUDIENCES.includes(data.audience)) {
    return { error: "Invalid event audience." };
  }

  if (!STATUSES.includes(data.status)) {
    return { error: "Invalid event status." };
  }

  if (!isValidDate(data.date)) {
    return { error: "Enter a valid event date." };
  }

  if (
    !isValidTime(data.startTime) ||
    !isValidTime(data.endTime) ||
    data.startTime >= data.endTime
  ) {
    return {
      error: "Event end time must be later than start time.",
    };
  }

  if (!data.venue || !data.organizer) {
    return {
      error: "Venue and organizer are required.",
    };
  }

  if (
    !Number.isInteger(data.capacity) ||
    data.capacity < 1 ||
    data.capacity > 100000
  ) {
    return {
      error: "Capacity must be between 1 and 100000.",
    };
  }

  if (
    data.description.length > 3000 ||
    data.venue.length > 200 ||
    data.organizer.length > 180
  ) {
    return { error: "An event field is too long." };
  }

  if (
    data.registrationDeadline &&
    Number.isNaN(
      data.registrationDeadline.getTime()
    )
  ) {
    return {
      error: "Invalid registration deadline.",
    };
  }

  const start = eventStartDate(data);

  if (
    data.registrationDeadline &&
    data.registrationDeadline > start
  ) {
    return {
      error:
        "Registration deadline cannot be after event start.",
    };
  }

  return { data };
}

// ========================================
// IDENTIFY LOGGED-IN STUDENT
// ========================================

async function findAuthenticatedStudent(user) {
  const email = cleanText(user.email).toLowerCase();
  const studentId = cleanText(user.userId).toUpperCase();

  if (!email) return null;

  // Prefer the explicitly linked Student profile.
  if (
    user.profileId &&
    validId(String(user.profileId))
  ) {
    const linked = await Student.findById(
      user.profileId
    );

    if (
      linked &&
      cleanText(linked.email).toLowerCase() === email &&
      (
        !studentId ||
        cleanText(linked.studentId).toUpperCase() ===
          studentId
      )
    ) {
      return linked;
    }
  }

  // Verified fallback: BOTH Student ID and email.
  if (!studentId) return null;

  return Student.findOne({
    studentId,
    email,
  });
}

// ========================================
// RESOLVE AN ADMIN-SELECTED STUDENT
// ========================================

async function findStudentForAdmin(reference) {
  const value = cleanText(reference);

  if (!value) return null;

  const student = validId(value)
    ? await Student.findById(value)
    : await Student.findOne({
        studentId: value.toUpperCase(),
      });

  if (!student) return null;

  const studentEmail = cleanText(
    student.email
  ).toLowerCase();

  const user = await User.findOne({
    role: "student",
    isActive: true,
    email: studentEmail,
    $or: [
      { profileId: student._id },
      { userId: student.studentId },
    ],
  });

  if (!user) return null;

  return { student, user };
}

// ========================================
// REGISTER A STUDENT
// ========================================

// Reserve capacity atomically before creating a
// registration. If registration fails, release it.

async function registerStudent(event, student, user) {
  const existing =
    await EventRegistration.findOne({
      event: event._id,
      student: student._id,
    });

  if (existing?.status === "Registered") {
    return {
      error: "You are already registered for this event.",
      status: 409,
    };
  }

  if (!registrationIsOpen(event)) {
    return {
      error:
        "Registration is closed for this event.",
      status: 400,
    };
  }

  const now = new Date();

  const reserved = await Event.findOneAndUpdate(
    {
      _id: event._id,
      status: "Published",
      audience: { $in: ["All", "Students"] },
      $expr: {
        $lt: [
          "$registrationCount",
          "$capacity",
        ],
      },
      $or: [
        { registrationDeadline: null },
        { registrationDeadline: { $gt: now } },
      ],
    },
    {
      $inc: { registrationCount: 1 },
    },
    { new: true }
  );

  if (!reserved) {
    return {
      error:
        "Registration closed or no seats remaining.",
      status: 409,
    };
  }

  // Recheck schedule after reserving.
  if (!eventIsUpcoming(reserved)) {
    await Event.updateOne(
      { _id: event._id },
      { $inc: { registrationCount: -1 } }
    );

    return {
      error: "The event has already started.",
      status: 400,
    };
  }

  try {
    let registration;

    if (existing?.status === "Cancelled") {
      registration =
        await EventRegistration.findOneAndUpdate(
          {
            _id: existing._id,
            status: "Cancelled",
          },
          {
            $set: {
              status: "Registered",
              user: user._id,
              registeredAt: new Date(),
              cancelledAt: null,
            },
          },
          { new: true }
        );

      if (!registration) {
        const duplicate = new Error(
          "Registration was already reactivated."
        );
        duplicate.code = 11000;
        throw duplicate;
      }
    } else {
      registration =
        await EventRegistration.create({
          event: event._id,
          student: student._id,
          user: user._id,
          status: "Registered",
        });
    }

    return { registration };
  } catch (error) {
    await Event.updateOne(
      { _id: event._id },
      { $inc: { registrationCount: -1 } }
    );

    if (error.code === 11000) {
      return {
        error:
          "You are already registered for this event.",
        status: 409,
      };
    }

    throw error;
  }
}

// ========================================
// CANCEL REGISTRATION
// ========================================

async function cancelRegistration(registration) {
  const updated =
    await EventRegistration.findOneAndUpdate(
      {
        _id: registration._id,
        status: "Registered",
      },
      {
        $set: {
          status: "Cancelled",
          cancelledAt: new Date(),
        },
      },
      { new: true }
    );

  if (!updated) return false;

  await Event.updateOne(
    {
      _id: registration.event,
      registrationCount: { $gt: 0 },
    },
    {
      $inc: { registrationCount: -1 },
    }
  );

  return true;
}

// ========================================
// GET EVENTS
// GET /api/events
// ========================================

router.get("/", async (req, res) => {
  try {
    const query =
      req.user.role === "admin"
        ? {}
        : req.user.role === "student"
          ? {
              status: "Published",
              audience: { $in: ["All", "Students"] },
            }
          : {
              status: "Published",
              audience: "All",
            };

    const events = await Event.find(query)
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({
      success: true,
      count: events.length,
      data: events.map(eventPublicData),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// STUDENT: MY REGISTRATIONS
// GET /api/events/my-registrations
// ========================================

router.get(
  "/my-registrations",
  authorize("student"),
  async (req, res) => {
    try {
      const student =
        await findAuthenticatedStudent(req.user);

      if (!student) {
        return fail(
          res,
          403,
          "Student account is not linked to a valid Student profile."
        );
      }

      const registrations =
        await EventRegistration.find({
          student: student._id,
        })
          .populate(
            "event",
            "title category description date startTime endTime venue organizer audience capacity registrationCount status registrationDeadline"
          )
          .sort({ createdAt: -1 })
          .lean();

      return res.json({
        success: true,
        count: registrations.length,
        data: registrations,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// ADMIN: CREATE EVENT
// POST /api/events
// ========================================

router.post(
  "/",
  authorize("admin"),
  async (req, res) => {
    try {
      const validated = validateEventInput(
        req.body || {}
      );

      if (validated.error) {
        return fail(res, 400, validated.error);
      }

      const event = await Event.create({
        ...validated.data,
        registrationCount: 0,
        createdBy: req.user._id,
      });

      return res.status(201).json({
        success: true,
        message: "Event created successfully.",
        data: eventPublicData(event),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// ADMIN: UPDATE EVENT
// PUT /api/events/:id
// ========================================

router.put(
  "/:id",
  authorize("admin"),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return fail(res, 400, "Invalid event ID.");
      }

      const event = await Event.findById(
        req.params.id
      );

      if (!event) {
        return fail(res, 404, "Event not found.");
      }

      const merged = {
        ...event.toObject(),
        ...(req.body || {}),
      };

      const validated =
        validateEventInput(merged);

      if (validated.error) {
        return fail(res, 400, validated.error);
      }

      const activeCount =
        await EventRegistration.countDocuments({
          event: event._id,
          status: "Registered",
        });

      if (
        validated.data.capacity < activeCount
      ) {
        return fail(
          res,
          400,
          "Capacity cannot be lower than existing registrations."
        );
      }

      // Keep registrationCount in sync.
      Object.assign(event, validated.data);
      event.registrationCount = activeCount;

      await event.save();

      return res.json({
        success: true,
        message: "Event updated successfully.",
        data: eventPublicData(event),
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// ADMIN: DELETE EVENT
// DELETE /api/events/:id
// ========================================

router.delete(
  "/:id",
  authorize("admin"),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return fail(res, 400, "Invalid event ID.");
      }

      const event = await Event.findById(
        req.params.id
      );

      if (!event) {
        return fail(res, 404, "Event not found.");
      }

      const activeCount =
        await EventRegistration.countDocuments({
          event: event._id,
          status: "Registered",
        });

      // Do not silently erase active registrations.
      if (activeCount > 0) {
        return fail(
          res,
          409,
          "This event has registered students. Cancel their registrations before deleting the event."
        );
      }

      await EventRegistration.deleteMany({
        event: event._id,
      });

      await Event.deleteOne({
        _id: event._id,
      });

      return res.json({
        success: true,
        message: "Event deleted successfully.",
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// STUDENT: REGISTER
// POST /api/events/:id/register
// ========================================

router.post(
  "/:id/register",
  authorize("student"),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return fail(res, 400, "Invalid event ID.");
      }

      const student =
        await findAuthenticatedStudent(req.user);

      if (!student) {
        return fail(
          res,
          403,
          "Your login account is not linked to a Student profile."
        );
      }

      const event = await Event.findById(
        req.params.id
      );

      if (!event || !studentCanSee(event)) {
        return fail(
          res,
          404,
          "Event not available."
        );
      }

      const result = await registerStudent(
        event,
        student,
        req.user
      );

      if (result.error) {
        return fail(
          res,
          result.status,
          result.error
        );
      }

      return res.status(201).json({
        success: true,
        message: "Event registration successful.",
        data: result.registration,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// STUDENT: CANCEL MY REGISTRATION
// DELETE /api/events/:id/register
// ========================================

router.delete(
  "/:id/register",
  authorize("student"),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return fail(res, 400, "Invalid event ID.");
      }

      const student =
        await findAuthenticatedStudent(req.user);

      if (!student) {
        return fail(
          res,
          403,
          "Student profile not found."
        );
      }

      const registration =
        await EventRegistration.findOne({
          event: req.params.id,
          student: student._id,
          status: "Registered",
        });

      if (!registration) {
        return fail(
          res,
          404,
          "Active registration not found."
        );
      }

      const event = await Event.findById(
        req.params.id
      );

      if (
        !event ||
        !eventIsUpcoming(event)
      ) {
        return fail(
          res,
          400,
          "Registration cannot be cancelled after the event starts."
        );
      }

      const cancelled =
        await cancelRegistration(registration);

      if (!cancelled) {
        return fail(
          res,
          409,
          "Registration is already cancelled."
        );
      }

      return res.json({
        success: true,
        message: "Registration cancelled successfully.",
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// ADMIN: EVENT PARTICIPANTS
// GET /api/events/:id/registrations
// ========================================

router.get(
  "/:id/registrations",
  authorize("admin"),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return fail(res, 400, "Invalid event ID.");
      }

      const event = await Event.findById(
        req.params.id
      );

      if (!event) {
        return fail(res, 404, "Event not found.");
      }

      const registrations =
        await EventRegistration.find({
          event: event._id,
          status: "Registered",
        })
          .populate(
            "student",
            "studentId fullName email department program semester"
          )
          .sort({ registeredAt: -1 })
          .lean();

      return res.json({
        success: true,
        count: registrations.length,
        data: registrations,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// ADMIN: REGISTER A STUDENT
// POST /api/events/:id/registrations
// ========================================

router.post(
  "/:id/registrations",
  authorize("admin"),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return fail(res, 400, "Invalid event ID.");
      }

      const reference =
        req.body?.studentMongoId ||
        req.body?.studentId;

      const linked =
        await findStudentForAdmin(reference);

      if (!linked) {
        return fail(
          res,
          404,
          "Active linked Student account not found."
        );
      }

      const event = await Event.findById(
        req.params.id
      );

      if (!event) {
        return fail(res, 404, "Event not found.");
      }

      const result = await registerStudent(
        event,
        linked.student,
        linked.user
      );

      if (result.error) {
        return fail(
          res,
          result.status,
          result.error
        );
      }

      return res.status(201).json({
        success: true,
        message:
          "Student registered successfully.",
        data: result.registration,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// ADMIN: REMOVE A REGISTRATION
// DELETE /api/events/:id/registrations/:registrationId
// ========================================

router.delete(
  "/:id/registrations/:registrationId",
  authorize("admin"),
  async (req, res) => {
    try {
      if (
        !validId(req.params.id) ||
        !validId(req.params.registrationId)
      ) {
        return fail(
          res,
          400,
          "Invalid registration reference."
        );
      }

      const registration =
        await EventRegistration.findOne({
          _id: req.params.registrationId,
          event: req.params.id,
          status: "Registered",
        });

      if (!registration) {
        return fail(
          res,
          404,
          "Active registration not found."
        );
      }

      const cancelled =
        await cancelRegistration(registration);

      if (!cancelled) {
        return fail(
          res,
          409,
          "Registration is already cancelled."
        );
      }

      return res.json({
        success: true,
        message:
          "Participant registration removed.",
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// EVENT DETAILS
// GET /api/events/:id
// ========================================

router.get("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid event ID.");
    }

    const event = await Event.findById(
      req.params.id
    );

    if (!event) {
      return fail(res, 404, "Event not found.");
    }

    if (
      req.user.role === "student" &&
      !studentCanSee(event)
    ) {
      return fail(
        res,
        404,
        "Event not available."
      );
    }

    if (
      !["admin", "student"].includes(req.user.role) &&
      (
        event.status !== "Published" ||
        event.audience !== "All"
      )
    ) {
      return fail(
        res,
        404,
        "Event not available."
      );
    }

    return res.json({
      success: true,
      data: eventPublicData(event),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// EXPORT
// ========================================

module.exports = router;
