
require("dotenv").config();

const studentCourseMarksRoutes = require("./routes/studentCourseMarksRoutes");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const courseAssessmentMarkRoutes = require("./routes/courseAssessmentMarkRoutes");


// ========================================
// UNIBEE — COMPLETE SERVER
// ========================================

// Authentication
const authRoutes = require("./routes/authRoutes");

// People Management
const studentRoutes = require("./routes/studentRoutes");
const userRoutes = require("./routes/userRoutes");
const facultyRoutes = require("./routes/facultyRoutes");

// Academic Management
const academicRoutes = require("./routes/academicRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const studentEnrollmentRoutes = require(
  "./routes/studentEnrollmentRoutes"
);
const examinationRoutes = require(
  "./routes/examinationRoutes"
);
const resultRoutes = require("./routes/resultRoutes");

// Exam Controller
const examMarkRoutes = require("./routes/examMarkRoutes");
const seatPlanRoutes = require("./routes/seatPlanRoutes");

// Attendance & Assignments
const attendanceRoutes = require(
  "./routes/attendanceRoutes"
);
const assignmentRoutes = require(
  "./routes/assignmentRoutes"
);

// Class Schedule
const classScheduleRoutes = require(
  "./routes/classScheduleRoutes"
);

// Campus Services
const libraryRoutes = require("./routes/libraryRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const financeRoutes = require("./routes/financeRoutes");

// Events
const eventRoutes = require("./routes/eventRoutes");

// Messaging
const messageRoutes = require("./routes/messageRoutes");

// Scholarships & Academic Approvals
const scholarshipRoutes = require(
  "./routes/scholarshipRoutes"
);
const academicApprovalRoutes = require(
  "./routes/academicApprovalRoutes"
);

// ========================================
// EXPRESS APPLICATION
// ========================================

const app = express();

// ========================================
// CORS — LOCAL VITE FRONTEND
// ========================================

// Allows ports 5173 through 5179,
// including http://localhost:5176.

const allowedLocalFrontend =
  /^http:\/\/(?:localhost|127\.0\.0\.1):517[3-9]$/;

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedLocalFrontend.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(
          "CORS: frontend origin not allowed"
        )
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
    ],
  })
);

// ========================================
// REQUEST BODY MIDDLEWARE
// ========================================

app.use(
  express.json({
    limit: "100kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "UniBee API is running!",
  });
});

// ========================================
// AUTHENTICATION
// ========================================

app.use("/api/auth", authRoutes);

// ========================================
// USER, STUDENT & FACULTY
// ========================================

app.use("/api/users", userRoutes);

app.use("/api/students", studentRoutes);

app.use("/api/faculty", facultyRoutes);

// ========================================
// ACADEMIC MANAGEMENT
// ========================================

app.use("/api/academic", academicRoutes);

app.use("/api/enrollments", enrollmentRoutes);

app.use(
  "/api/student-enrollments",
  studentEnrollmentRoutes
);

// ========================================
// EXAMINATIONS
// ========================================

app.use(
  "/api/examinations",
  examinationRoutes
);

// ========================================
// MONGODB SEAT PLAN MANAGEMENT
// ========================================

// Room Number
// Building
// Exam Date
// Morning/Afternoon/Evening
// Room Capacity
// Multiple Batches
// Student Counts
// Starting & Ending IDs
// CRUD + Conflict Prevention

app.use(
  "/api/seat-plans",
  seatPlanRoutes
);

// ========================================
// EXAM MARKS & RESULTS
// ========================================

app.use(
  "/api/exam-marks",
  examMarkRoutes
);

app.use(
  "/api/results",
  resultRoutes
);

// ========================================
// ATTENDANCE
// ========================================

app.use(
  "/api/attendance",
  attendanceRoutes
);

// ========================================
// FACULTY ASSIGNMENTS
// ========================================

app.use(
  "/api/assignments",
  assignmentRoutes
);

// ========================================
// CLASS SCHEDULE
// ========================================

app.use(
  "/api/class-schedules",
  classScheduleRoutes
);

// ========================================
// LIBRARY
// ========================================

app.use(
  "/api/library",
  libraryRoutes
);

// ========================================
// NOTICES
// ========================================

app.use(
  "/api/notices",
  noticeRoutes
);

// ========================================
// FINANCE
// ========================================

app.use(
  "/api/finance",
  financeRoutes
);

// ========================================
// EVENTS
// ========================================

app.use(
  "/api/events",
  eventRoutes
);

// ========================================
// STUDENT ↔ FACULTY MESSAGING
// ========================================

app.use(
  "/api/messages",
  messageRoutes
);

// ========================================
// SCHOLARSHIPS & WAIVERS
// ========================================

app.use(
  "/api/finance/scholarships",
  scholarshipRoutes
);

// ========================================
// HOD ACADEMIC APPROVALS
// ========================================

app.use(
  "/api/academic-approvals",
  academicApprovalRoutes
);

// ========================================
// API NOT FOUND
// ========================================
app.use("/api/student-course-marks", studentCourseMarksRoutes);
app.use("/api/course-assessment-marks", courseAssessmentMarkRoutes);
app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use((error, req, res, next) => {
  console.error(
    "UniBee Server Error:",
    error
  );

  return res.status(
    error.status || 500
  ).json({
    success: false,

    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error."
        : error.message,
  });
});

// ========================================
// SERVER STARTUP
// ========================================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("");
      console.log("================================");
      console.log("       UNIBEE BACKEND");
      console.log("================================");

      console.log(`Server Port: ${PORT}`);
      console.log("MongoDB: Connected");

      console.log(
        "Authentication API: Registered"
      );
      console.log(
        "Student API: Registered"
      );
      console.log(
        "User API: Registered"
      );
      console.log(
        "Faculty API: Registered"
      );

      console.log(
        "Academic API: Registered"
      );
      console.log(
        "Enrollment API: Registered"
      );
      console.log(
        "Student Enrollment API: Registered"
      );

      console.log(
        "Examination API: Registered"
      );

      console.log(
        "Seat Plan MongoDB API: Registered"
      );

      console.log(
        "Exam Marks API: Registered"
      );
      console.log(
        "Results API: Registered"
      );

      console.log(
        "Attendance API: Registered"
      );
      console.log(
        "Assignment API: Registered"
      );
      console.log(
        "Class Schedule API: Registered"
      );

      console.log(
        "Library API: Registered"
      );
      console.log(
        "Notice API: Registered"
      );
      console.log(
        "Finance API: Registered"
      );

      console.log(
        "Event API: Registered"
      );
      console.log(
        "Messaging API: Registered"
      );

      console.log(
        "Scholarship API: Registered"
      );
      console.log(
        "HOD Academic Approval API: Registered"
      );

      console.log("--------------------------------");

      console.log(
        "Frontend: http://localhost:5176"
      );

      console.log(
        `Health: http://localhost:${PORT}/api/health`
      );

      console.log(
        `Seat Plans: http://localhost:${PORT}/api/seat-plans`
      );

      console.log("================================");
    });
  } catch (error) {
    console.error(
      "UniBee startup failed:",
      error.message
    );

    process.exit(1);
  }
}

startServer();
