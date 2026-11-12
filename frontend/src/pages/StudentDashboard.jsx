
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Bell,
  Clock3,
  MapPin,
  UserRound,
  RefreshCw,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  CalendarClock,
  TrendingUp,
} from "lucide-react";

import { getAuthToken } from "../services/authApi";

// ============================================
// UNIBEE STUDENT DASHBOARD
// MongoDB-backed, student-specific data
// ============================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const ENDPOINTS = {
  courses: "/api/student-enrollments/my",
  attendance: "/api/attendance/student/summary",
  assignments: "/api/assignments/student/my",
  results: "/api/results/my",
  notices: "/api/notices",
  routine: "/api/class-schedules/student/my",
};

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const UNIVERSITY_TIMEZONE = "Asia/Dhaka";

// ============================================
// API
// ============================================

async function apiGet(path, signal) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Student login required.");
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      cache: "no-store",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error("Backend connection failed.");
  }

  const body = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !body ||
    body.success !== true
  ) {
    throw new Error(
      body?.message ||
      `API request failed (${response.status}).`
    );
  }

  return body;
}

// ============================================
// DATA HELPERS
// ============================================

function getArray(payload) {
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return null;
}

function getId(item) {
  if (!item) return "";

  if (typeof item === "string") {
    return item;
  }

  return String(item.id || item._id || "");
}

function getToday() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: UNIVERSITY_TIMEZONE,
  }).format(new Date());
}

function getLocalDate() {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: UNIVERSITY_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ])
  );

  return [
    values.year,
    values.month,
    values.day,
  ].join("-");
}

function formatTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value || "")) {
    return value || "—";
  }

  const [hours, minutes] = value
    .split(":")
    .map(Number);

  const period = hours >= 12 ? "PM" : "AM";

  return `${hours % 12 || 12}:${String(
    minutes
  ).padStart(2, "0")} ${period}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeAttendance(payload) {
  const record = payload?.data;

  if (!record || typeof record !== "object") {
    return null;
  }

  const total = Number(record.total ?? 0);
  const present = Number(record.Present ?? 0);
  const late = Number(record.Late ?? 0);
  const absent = Number(record.Absent ?? 0);
  const excused = Number(record.Excused ?? 0);

  const rawRate = record.attendanceRate;

  const attendanceRate =
    rawRate !== null &&
    rawRate !== undefined &&
    Number.isFinite(Number(rawRate))
      ? Number(rawRate)
      : total > 0
        ? Math.round(
            ((present + late) / total) * 100
          )
        : null;

  return {
    total,
    present,
    late,
    absent,
    excused,
    rate: attendanceRate,
  };
}

function getOfficialCGPA(payload) {
  const values = [
    payload?.cgpa,
    payload?.overallCGPA,
    payload?.summary?.cgpa,
    payload?.data?.cgpa,
    payload?.data?.summary?.cgpa,
  ];

  for (const value of values) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= 0 &&
      number <= 4
    ) {
      return number;
    }
  }

  return null;
}

function isPendingAssignment(item) {
  if (item.status !== "Published") {
    return false;
  }

  if (item.isOverdue === true) {
    return false;
  }

  if (item.canSubmit !== true) {
    return false;
  }

  // Submitted and graded assignments
  // are not pending submissions.
  return !item.mySubmission;
}

function getCourseName(course) {
  return (
    course?.title ||
    course?.courseTitle ||
    "Untitled Course"
  );
}

function getCourseCode(course) {
  return (
    course?.code ||
    course?.courseCode ||
    "Course"
  );
}

// ============================================
// REUSABLE UI
// ============================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#718579]">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-3 text-xs text-[#8A9F90]">
        {subtitle}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  link,
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-[#234E43]">
          {title}
        </h2>

        <p className="mt-1 text-sm text-[#718579]">
          {description}
        </p>
      </div>

      {link && (
        <Link
          to={link}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#477764] hover:underline"
        >
          View All
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="rounded-xl bg-[#F9FBF8] px-5 py-10 text-center">
      <Icon
        size={34}
        className="mx-auto text-[#A6C1A4]"
      />

      <h3 className="mt-3 font-bold text-[#234E43]">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718579]">
        {description}
      </p>
    </div>
  );
}

function Panel({ children }) {
  return (
    <section className="rounded-3xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
      {children}
    </section>
  );
}

function QuickLink({
  label,
  path,
  icon: Icon,
}) {
  return (
    <Link
      to={path}
      className="flex items-center justify-between rounded-xl border border-[#E2EADC] bg-white p-4 text-sm font-bold text-[#234E43] transition hover:border-[#A6C1A4] hover:shadow-sm"
    >
      <span className="flex items-center gap-2">
        <Icon size={18} />
        {label}
      </span>

      <ArrowUpRight size={17} />
    </Link>
  );
}

function ClassCard({ item }) {
  return (
    <div className="rounded-2xl border border-[#EDF1EB] bg-[#FBFCFA] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-[#EAF2E8] px-3 py-1 text-xs font-bold text-[#477764]">
          {item.courseCode || "Course"}
        </span>

        <span className="text-xs font-medium text-[#718579]">
          {item.day}
        </span>
      </div>

      <h3 className="mt-4 font-bold text-[#234E43]">
        {item.courseTitle || "Scheduled Class"}
      </h3>

      <div className="mt-4 space-y-3 text-sm text-[#607B6C]">
        <p className="flex items-center gap-2">
          <Clock3 size={17} />
          {formatTime(item.startTime)}
          {" – "}
          {formatTime(item.endTime)}
        </p>

        <p className="flex items-center gap-2">
          <MapPin size={17} />
          {item.room || "Room unavailable"}
        </p>

        <p className="flex items-center gap-2">
          <UserRound size={17} />
          {item.facultyName || "Faculty unavailable"}
        </p>

        {item.semester && (
          <p className="flex items-center gap-2">
            <GraduationCap size={17} />
            {item.semester}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function StudentDashboard() {
  const [responses, setResponses] = useState({});
  const [errors, setErrors] = useState({});

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] =
    useState(0);

  const [today, setToday] = useState(getToday);
  const [localDate, setLocalDate] =
    useState(getLocalDate);

  // ==========================================
  // FETCH ALL DASHBOARD DATA
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setErrors({});

      const entries = Object.entries(ENDPOINTS);

      const results = await Promise.allSettled(
        entries.map(([, endpoint]) =>
          apiGet(endpoint, controller.signal)
        )
      );

      if (controller.signal.aborted) {
        return;
      }

      const nextResponses = {};
      const nextErrors = {};

      entries.forEach(([name], index) => {
        const outcome = results[index];

        if (outcome.status === "fulfilled") {
          nextResponses[name] = outcome.value;
        } else {
          nextResponses[name] = null;
          nextErrors[name] =
            outcome.reason?.message ||
            "Unable to load data.";
        }
      });

      setResponses(nextResponses);
      setErrors(nextErrors);
      setLoading(false);
    }

    loadDashboard();

    return () => controller.abort();
  }, [refreshKey]);

  function refreshDashboard() {
    setToday(getToday());
    setLocalDate(getLocalDate());

    setRefreshKey((previous) => previous + 1);
  }

  // ==========================================
  // STUDENT IDENTITY
  // ==========================================

  const student =
    responses.courses?.student ||
    responses.assignments?.student ||
    null;

  const studentName =
    student?.fullName ||
    student?.name ||
    "Student";

  const studentId =
    student?.studentId || "";

  // ==========================================
  // APPROVED COURSES
  // ==========================================

  const enrollments = useMemo(
    () => getArray(responses.courses),
    [responses.courses]
  );

  const approvedCourses = useMemo(
    () =>
      (enrollments || []).filter(
        (item) => item.status === "Approved"
      ),
    [enrollments]
  );

  // ==========================================
  // ATTENDANCE
  // ==========================================

  const attendance = useMemo(
    () => normalizeAttendance(responses.attendance),
    [responses.attendance]
  );

  // ==========================================
  // ASSIGNMENTS
  // ==========================================

  const assignments = useMemo(
    () => getArray(responses.assignments),
    [responses.assignments]
  );

  const pendingAssignments = useMemo(
    () =>
      (assignments || [])
        .filter(isPendingAssignment)
        .sort((a, b) =>
          String(a.deadline || "").localeCompare(
            String(b.deadline || "")
          )
        ),
    [assignments]
  );

  const upcomingAssignments =
    pendingAssignments.slice(0, 5);

  // ==========================================
  // PUBLISHED RESULTS
  // ==========================================

  const results = useMemo(
    () => getArray(responses.results),
    [responses.results]
  );

  // The /results/my endpoint already filters
  // for Published results on the backend.
  const publishedResults = results || [];

  const officialCGPA = getOfficialCGPA(
    responses.results
  );

  // ==========================================
  // NOTICES
  // ==========================================

  const notices = useMemo(
    () => getArray(responses.notices),
    [responses.notices]
  );

  const recentNotices = useMemo(
    () =>
      (notices || [])
        .filter((notice) => {
          if (
            notice.status &&
            notice.status !== "Published"
          ) {
            return false;
          }

          if (
            notice.expiryDate &&
            String(notice.expiryDate).slice(0, 10) <
              localDate
          ) {
            return false;
          }

          return true;
        })
        .sort(
          (a, b) =>
            new Date(
              b.publishedAt || b.createdAt || 0
            ).getTime() -
            new Date(
              a.publishedAt || a.createdAt || 0
            ).getTime()
        )
        .slice(0, 4),
    [notices, localDate]
  );

  // ==========================================
  // CLASS ROUTINE
  // ==========================================

  const routine = useMemo(
    () => getArray(responses.routine),
    [responses.routine]
  );

  const activeRoutine = useMemo(
    () =>
      (routine || [])
        .filter(
          (item) =>
            item.status === "Active" &&
            DAYS.includes(item.day)
        )
        .sort(
          (a, b) =>
            DAYS.indexOf(a.day) -
              DAYS.indexOf(b.day) ||
            String(a.startTime).localeCompare(
              String(b.startTime)
            )
        ),
    [routine]
  );

  const todayClasses = useMemo(
    () =>
      activeRoutine.filter(
        (item) => item.day === today
      ),
    [activeRoutine, today]
  );

  const teachingDays = new Set(
    activeRoutine.map((item) => item.day)
  ).size;

  const scheduledCourseIds = useMemo(
    () =>
      new Set(
        activeRoutine.map((item) =>
          String(item.courseId)
        )
      ),
    [activeRoutine]
  );

  // ==========================================
  // STATS
  // ==========================================

  const courseCount =
    enrollments === null
      ? "—"
      : approvedCourses.length;

  const attendanceValue =
    attendance?.rate !== null &&
    attendance?.rate !== undefined
      ? `${attendance.rate}%`
      : "—";

  const assignmentCount =
    assignments === null
      ? "—"
      : pendingAssignments.length;

  const cgpaValue =
    officialCGPA === null
      ? "—"
      : officialCGPA.toFixed(2);

  const stats = [
    {
      title: "Enrolled Courses",
      value: courseCount,
      subtitle: "Approved course enrollments",
      icon: BookOpen,
    },
    {
      title: "Attendance",
      value: attendanceValue,
      subtitle: "Actual recorded attendance rate",
      icon: ClipboardCheck,
    },
    {
      title: "Pending Assignments",
      value: assignmentCount,
      subtitle: "Published work awaiting submission",
      icon: FileText,
    },
    {
      title: "CGPA",
      value: cgpaValue,
      subtitle:
        officialCGPA === null
          ? "Official CGPA not available"
          : "Official cumulative GPA",
      icon: GraduationCap,
    },
  ];

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-7">

      {/* WELCOME HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white shadow-sm md:p-9">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-sm text-[#D9C184]">
              <Sparkles size={18} />
              Student Academic Dashboard
            </div>

            <h1 className="mt-4 text-2xl font-extrabold md:text-4xl">
              Welcome back, {studentName}!
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-[#C9DDCF]">
              Track your courses, attendance,
              assignments, results, notices,
              and class schedule in one place.
            </p>

            {studentId && (
              <p className="mt-3 text-xs font-semibold text-[#D9C184]">
                Student ID: {studentId}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={refreshDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#234E43] disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Dashboard
          </button>
        </div>

        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />

        <div className="pointer-events-none absolute -bottom-24 right-28 h-56 w-56 rounded-full bg-white/5" />
      </section>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center gap-3 rounded-xl border border-[#E2EADC] bg-white p-4 text-sm text-[#718579]">
          <Loader2 size={19} className="animate-spin" />
          Fetching Student Dashboard data...
        </div>
      )}

      {/* API ERROR REPORT */}
      {!loading &&
        Object.keys(errors).length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <AlertCircle size={18} />
              Some Dashboard Data Could Not Load
            </p>

            <div className="mt-2 space-y-1">
              {Object.entries(errors).map(
                ([key, message]) => (
                  <p
                    key={key}
                    className="text-xs text-amber-800"
                  >
                    {key}: {message}
                  </p>
                )
              )}
            </div>
          </div>
        )}

      {/* STAT CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard
            key={item.title}
            {...item}
            value={loading ? "..." : item.value}
          />
        ))}
      </section>

      {/* QUICK ACCESS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickLink
          label="My Courses"
          path="/student/courses"
          icon={BookOpen}
        />
        <QuickLink
          label="Class Routine"
          path="/student/routine"
          icon={CalendarDays}
        />
        <QuickLink
          label="Assignments"
          path="/student/assignments"
          icon={FileText}
        />
        <QuickLink
          label="Results"
          path="/student/results"
          icon={GraduationCap}
        />
      </section>

      {/* COURSES + ASSIGNMENTS */}
      <section className="grid gap-6 xl:grid-cols-2">

        {/* MY COURSES */}
        <Panel>
          <SectionHeader
            title="My Courses"
            description="Your approved academic courses"
            link="/student/courses"
          />

          {enrollments === null ? (
            <EmptyState
              icon={AlertCircle}
              title="Courses Unavailable"
              description="The enrollment API could not provide course records."
            />
          ) : approvedCourses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No Approved Courses"
              description="Your approved enrollments will appear here."
            />
          ) : (
            <div className="space-y-3">
              {approvedCourses
                .slice(0, 5)
                .map((enrollment, index) => {
                  const course = enrollment.course || {};
                  const courseId = getId(course);

                  const courseClasses =
                    activeRoutine.filter(
                      (item) =>
                        String(item.courseId) === courseId
                    );

                  const hasSchedule =
                    scheduledCourseIds.has(courseId);

                  return (
                    <div
                      key={enrollment.id || index}
                      className="rounded-2xl border border-[#EDF1EB] bg-[#FBFCFA] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                          <BookOpen size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#B18B37]">
                            {getCourseCode(course)}
                          </p>

                          <h3 className="mt-1 font-bold text-[#234E43]">
                            {getCourseName(course)}
                          </h3>

                          <p className="mt-2 text-xs text-[#718579]">
                            Instructor:{" "}
                            {course.instructor ||
                              "Not assigned"}
                          </p>

                          <p className="mt-1 text-xs text-[#718579]">
                            Semester:{" "}
                            {enrollment.semester ||
                              course.semester ||
                              "—"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Approved
                            </span>

                            {routine !== null && (
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  hasSchedule
                                    ? "bg-[#EAF2E8] text-[#477764]"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {hasSchedule
                                  ? `${courseClasses.length} Weekly Class(es)`
                                  : "Routine Not Available"}
                              </span>
                            )}
                          </div>

                          {courseClasses.length > 0 && (
                            <div className="mt-4 space-y-2 border-t border-[#E2EADC] pt-3">
                              {courseClasses.map((item) => (
                                <p
                                  key={item.id}
                                  className="flex flex-wrap items-center gap-2 text-xs text-[#607B6C]"
                                >
                                  <CalendarDays size={14} />
                                  {item.day}
                                  {" · "}
                                  {formatTime(item.startTime)}
                                  {" – "}
                                  {formatTime(item.endTime)}
                                  {" · "}
                                  {item.room}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Panel>

        {/* UPCOMING ASSIGNMENTS */}
        <Panel>
          <SectionHeader
            title="Upcoming Assignments"
            description="Your unsubmitted published assignments"
            link="/student/assignments"
          />

          {assignments === null ? (
            <EmptyState
              icon={AlertCircle}
              title="Assignments Unavailable"
              description="Unable to load your assignment records."
            />
          ) : upcomingAssignments.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No Pending Assignments"
              description="You have no open assignments awaiting submission."
            />
          ) : (
            <div className="space-y-3">
              {upcomingAssignments.map((item) => (
                <Link
                  key={item.id}
                  to="/student/assignments"
                  className="block rounded-2xl border border-[#EDF1EB] bg-[#FBFCFA] p-4 transition hover:border-[#A6C1A4]"
                >
                  <p className="text-xs font-bold text-[#B18B37]">
                    {getCourseCode(item.course)}
                  </p>

                  <h3 className="mt-2 font-bold text-[#234E43]">
                    {item.title}
                  </h3>

                  <p className="mt-2 flex items-center gap-2 text-xs text-[#718579]">
                    <CalendarDays size={15} />
                    Due: {formatDate(item.deadline)}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-[#718579]">
                      {item.marks} Marks
                    </span>

                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      Pending
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </section>

      {/* ATTENDANCE + ACADEMIC RESULTS */}
      <section className="grid gap-6 xl:grid-cols-2">

        {/* ATTENDANCE */}
        <Panel>
          <SectionHeader
            title="Attendance Overview"
            description="Your real attendance records"
            link="/student/attendance"
          />

          {attendance === null ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Attendance Unavailable"
              description="Attendance data could not be loaded."
            />
          ) : attendance.total === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No Attendance Recorded"
              description="Attendance will appear when your faculty records a class."
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#234E43]">
                  Attendance Rate
                </span>

                <span className="text-2xl font-extrabold text-[#234E43]">
                  {attendance.rate}%
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#EDF1EB]">
                <div
                  className="h-full rounded-full bg-[#477764]"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, attendance.rate || 0)
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[
                  ["Present", attendance.present],
                  ["Late", attendance.late],
                  ["Absent", attendance.absent],
                  ["Total", attendance.total],
                  ["Excused", attendance.excused],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-[#F6F8F3] p-3"
                  >
                    <p className="text-xl font-bold text-[#234E43]">
                      {value}
                    </p>

                    <p className="mt-1 text-xs text-[#718579]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

        {/* RESULTS */}
        <Panel>
          <SectionHeader
            title="Academic Performance"
            description="Official published academic results"
            link="/student/results"
          />

          {results === null ? (
            <EmptyState
              icon={GraduationCap}
              title="Results Unavailable"
              description="The Results API could not be loaded."
            />
          ) : publishedResults.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No Published Results"
              description="Results will appear after official publication."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-[#F6F8F3] p-4">
                <TrendingUp
                  size={22}
                  className="text-[#477764]"
                />

                <div>
                  <p className="text-xs text-[#718579]">
                    Published Result Records
                  </p>

                  <p className="text-2xl font-extrabold text-[#234E43]">
                    {publishedResults.length}
                  </p>
                </div>
              </div>

              {publishedResults
                .slice(0, 4)
                .map((item, index) => (
                  <div
                    key={item.id || item._id || index}
                    className="rounded-xl border border-[#EDF1EB] p-4"
                  >
                    <p className="font-semibold text-[#234E43]">
                      {getCourseName(item.course) !==
                      "Untitled Course"
                        ? getCourseName(item.course)
                        : item.courseTitle ||
                          "Published Result"}
                    </p>

                    <p className="mt-1 text-xs text-[#718579]">
                      {item.semester ||
                        getCourseCode(item.course)}
                    </p>

                    {item.grade && (
                      <p className="mt-2 text-sm font-bold text-[#477764]">
                        Grade: {item.grade}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </Panel>
      </section>

      {/* TODAY'S CLASSES */}
      <Panel>
        <SectionHeader
          title="Today's Classes"
          description={`${today} · Your scheduled classes`}
          link="/student/routine"
        />

        {routine === null ? (
          <EmptyState
            icon={AlertCircle}
            title="Class Routine Unavailable"
            description="Student Routine API could not load."
          />
        ) : todayClasses.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No Classes Found Today"
            description={
              activeRoutine.length === 0
                ? "No class schedule matches your approved enrollments yet."
                : "No classes are scheduled for today. Check your weekly routine."
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {todayClasses.map((item) => (
              <ClassCard
                key={item.id}
                item={item}
              />
            ))}
          </div>
        )}

        {routine !== null && (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-[#EDF1EB] pt-4">
            <span className="rounded-lg bg-[#F6F8F3] px-3 py-2 text-xs font-semibold text-[#477764]">
              Weekly Classes: {activeRoutine.length}
            </span>

            <span className="rounded-lg bg-[#F6F8F3] px-3 py-2 text-xs font-semibold text-[#477764]">
              Teaching Days: {teachingDays}
            </span>
          </div>
        )}
      </Panel>

      {/* RECENT NOTICES */}
      <Panel>
        <SectionHeader
          title="Recent Notices"
          description="Latest published university announcements"
          link="/student/notices"
        />

        {notices === null ? (
          <EmptyState
            icon={Bell}
            title="Notices Unavailable"
            description="Unable to retrieve published notices."
          />
        ) : recentNotices.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No Recent Notices"
            description="New university notices will appear here."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recentNotices.map((notice) => (
              <Link
                key={notice.id || notice._id}
                to="/student/notices"
                className="rounded-2xl border border-[#EDF1EB] bg-[#FBFCFA] p-5 transition hover:border-[#A6C1A4]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                    <Bell size={19} />
                  </div>

                  <span className="rounded-full bg-[#F1F7EF] px-2.5 py-1 text-xs font-semibold text-[#477764]">
                    {notice.category || "General"}
                  </span>
                </div>

                <h3 className="mt-4 font-bold text-[#234E43]">
                  {notice.title}
                </h3>

                <p className="mt-3 text-xs text-[#718579]">
                  {formatDate(
                    notice.publishedAt ||
                    notice.createdAt
                  )}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {/* FOOTER */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        <p>UniBee Student Portal</p>
        <p>Learn. Connect. Bloom.</p>
      </div>
    </div>
  );
}
