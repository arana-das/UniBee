
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  BookOpen,
  Users,
  ClipboardCheck,
  FileText,
  CalendarDays,
  ArrowUpRight,
  Clock3,
  Bell,
  GraduationCap,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Loader2,
  MapPin,
  UserRound,
  TrendingUp,
  Camera,
  Mail,
  Building2,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// =============================================
// UNIBEE FACULTY DASHBOARD
// MONGODB DATA INTEGRATION
// =============================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const ENDPOINTS = {
  courses: "/api/assignments/faculty/courses",
  assignments: "/api/assignments/faculty/my",
  schedule: "/api/class-schedules/faculty/my",
  notices: "/api/notices",
  profile: "/api/faculty/me/profile",
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

const TIMEZONE = "Asia/Dhaka";

// =============================================
// API REQUEST
// =============================================

async function apiGet(path, signal) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please login to your Faculty account."
    );
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

    throw new Error(
      "Cannot connect to UniBee backend."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !result ||
    result.success !== true
  ) {
    throw new Error(
      result?.message ||
      `Request failed (${response.status}).`
    );
  }

  return result;
}

// =============================================
// HELPERS
// =============================================

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return String(value.id || value._id || "");
}

function getDay() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: TIMEZONE,
  }).format(new Date());
}

function getDateKey() {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const data = Object.fromEntries(
    parts.map((item) => [
      item.type,
      item.value,
    ])
  );

  return `${data.year}-${data.month}-${data.day}`;
}

function formatTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value || "")) {
    return value || "—";
  }

  const [hours, minutes] = value
    .split(":")
    .map(Number);

  return `${hours % 12 || 12}:${String(
    minutes
  ).padStart(2, "0")} ${
    hours >= 12 ? "PM" : "AM"
  }`;
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

function getInitials(name) {
  return (
    String(name || "Faculty")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "F"
  );
}

function safeArray(payload) {
  return Array.isArray(payload?.data)
    ? payload.data
    : [];
}

// =============================================
// REUSABLE COMPONENTS
// =============================================

function StatCard({
  title,
  value,
  note,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h3 className="mt-4 text-3xl font-bold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {note}
      </p>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  link,
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-[#234E43]">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {link && (
        <Link
          to={link}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#477764] hover:underline"
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
    <div className="rounded-xl bg-[#F6F8F3] px-5 py-9 text-center">
      <Icon
        size={31}
        className="mx-auto text-[#A6C1A4]"
      />

      <h3 className="mt-3 text-sm font-bold text-[#234E43]">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm md:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function QuickAction({
  label,
  description,
  icon: Icon,
  path,
}) {
  return (
    <Link
      to={path}
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 transition hover:border-[#A6C1A4] hover:bg-[#F6F8F3]"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-[#A6C1A4]/25 p-2.5 text-[#234E43]">
          <Icon size={19} />
        </div>

        <div>
          <p className="text-sm font-semibold text-[#234E43]">
            {label}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <ArrowUpRight
        size={17}
        className="shrink-0 text-slate-400"
      />
    </Link>
  );
}

// =============================================
// MAIN DASHBOARD
// =============================================

export default function FacultyDashboard() {
  const [responses, setResponses] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);
  const [day, setDay] = useState(getDay);
  const [date, setDate] = useState(getDateKey);

  const [rosters, setRosters] = useState({});
  const [attendanceRecords, setAttendanceRecords] =
    useState({});

  // ===========================================
  // FETCH FACULTY DATA
  // ===========================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setErrors({});

      const entries = Object.entries(ENDPOINTS);

      const outcomes = await Promise.allSettled(
        entries.map(([, path]) =>
          apiGet(path, controller.signal)
        )
      );

      if (controller.signal.aborted) return;

      const nextResponses = {};
      const nextErrors = {};

      entries.forEach(([key], index) => {
        const result = outcomes[index];

        if (result.status === "fulfilled") {
          nextResponses[key] = result.value;
        } else {
          nextResponses[key] = null;
          nextErrors[key] =
            result.reason?.message ||
            "Unable to load data.";
        }
      });

      // =====================================
      // LOAD APPROVED STUDENT ROSTERS
      // AND TODAY'S ATTENDANCE
      // =====================================

      const assignedCourses = safeArray(
        nextResponses.courses
      );

      const currentDate = getDateKey();

      const courseOutcomes =
        await Promise.allSettled(
          assignedCourses.map(async (course) => {
            const courseId = getId(course);

            const [roster, attendance] =
              await Promise.allSettled([
                apiGet(
                  `/api/attendance/faculty/roster/${courseId}`,
                  controller.signal
                ),
                apiGet(
                  `/api/attendance/faculty/records?courseId=${encodeURIComponent(
                    courseId
                  )}&date=${encodeURIComponent(currentDate)}`,
                  controller.signal
                ),
              ]);

            return {
              courseId,
              roster,
              attendance,
            };
          })
        );

      if (controller.signal.aborted) return;

      const nextRosters = {};
      const nextAttendance = {};

      courseOutcomes.forEach((outcome, index) => {
        const courseId = getId(
          assignedCourses[index]
        );

        if (outcome.status !== "fulfilled") {
          nextRosters[courseId] = null;
          nextAttendance[courseId] = null;
          return;
        }

        const { roster, attendance } = outcome.value;

        nextRosters[courseId] =
          roster.status === "fulfilled" &&
          Array.isArray(roster.value.data)
            ? roster.value.data
            : null;

        nextAttendance[courseId] =
          attendance.status === "fulfilled"
            ? attendance.value.data
            : null;
      });

      setResponses(nextResponses);
      setErrors(nextErrors);
      setRosters(nextRosters);
      setAttendanceRecords(nextAttendance);
      setDay(getDay());
      setDate(currentDate);
      setLoading(false);
    }

    loadDashboard();

    return () => controller.abort();
  }, [refreshKey]);

  function refreshDashboard() {
    setRefreshKey((previous) => previous + 1);
  }

  // ===========================================
  // FACULTY PROFILE
  // ===========================================

  const facultyFromCourses =
    responses.courses?.faculty || {};

  const facultyProfile =
    responses.profile?.data || {};

  const facultyName =
    facultyProfile.fullName ||
    facultyFromCourses.name ||
    "Faculty Member";

  const facultyId =
    facultyProfile.facultyId ||
    facultyFromCourses.facultyId ||
    "";

  const department =
    facultyProfile.department || "";

  const designation =
    facultyProfile.designation || "Faculty";

  const avatar =
    facultyProfile.avatar || "";

  // ===========================================
  // MY COURSES
  // ===========================================

  const courses = useMemo(
    () => safeArray(responses.courses),
    [responses.courses]
  );

  const totalCredits = courses.reduce(
    (sum, item) =>
      sum + Number(item.credits || 0),
    0
  );

  const rosterAvailable = courses.every(
    (course) =>
      Array.isArray(rosters[getId(course)])
  );

  // Count distinct students, not duplicate
  // enrollment records across courses.
  const uniqueStudents = useMemo(() => {
    const ids = new Set();

    courses.forEach((course) => {
      const students =
        rosters[getId(course)];

      if (!Array.isArray(students)) return;

      students.forEach((student) => {
        const id = getId(student);

        if (id) ids.add(id);
      });
    });

    return ids.size;
  }, [courses, rosters]);

  // ===========================================
  // ASSIGNMENTS AND PENDING GRADING
  // ===========================================

  const assignments = useMemo(
    () => safeArray(responses.assignments),
    [responses.assignments]
  );

  const publishedAssignments =
    assignments.filter(
      (item) => item.status === "Published"
    );

  const totalSubmissions = assignments.reduce(
    (sum, item) =>
      sum + Number(item.submissions || 0),
    0
  );

  const gradedSubmissions = assignments.reduce(
    (sum, item) =>
      sum + Number(item.graded || 0),
    0
  );

  const pendingReviews = Math.max(
    0,
    totalSubmissions - gradedSubmissions
  );

  const gradingProgress =
    totalSubmissions > 0
      ? Math.round(
          (gradedSubmissions / totalSubmissions) * 100
        )
      : 0;

  const assignmentByCourse = useMemo(() => {
    const result = {};

    assignments.forEach((assignment) => {
      const courseId = getId(
        assignment.course
      );

      if (!result[courseId]) {
        result[courseId] = [];
      }

      result[courseId].push(assignment);
    });

    return result;
  }, [assignments]);

  // ===========================================
  // CLASS SCHEDULE
  // ===========================================

  const schedule = useMemo(
    () => safeArray(responses.schedule),
    [responses.schedule]
  );

  const activeSchedule = useMemo(
    () =>
      schedule
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
    [schedule]
  );

  const todayClasses = useMemo(
    () =>
      activeSchedule
        .filter((item) => item.day === day)
        .sort((a, b) =>
          String(a.startTime).localeCompare(
            String(b.startTime)
          )
        ),
    [activeSchedule, day]
  );

  // ===========================================
  // TODAY'S ATTENDANCE
  // ===========================================

  const todayAttendance = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let total = 0;
    let sessions = 0;

    Object.values(attendanceRecords).forEach(
      (record) => {
        if (!record || !record.summary) {
          return;
        }

        sessions++;

        present += Number(
          record.summary.Present || 0
        );

        late += Number(
          record.summary.Late || 0
        );

        absent += Number(
          record.summary.Absent || 0
        );

        total += Number(
          record.summary.total || 0
        );
      }
    );

    const rate =
      total > 0
        ? Math.round(
            ((present + late) / total) * 100
          )
        : null;

    return {
      present,
      late,
      absent,
      total,
      sessions,
      rate,
    };
  }, [attendanceRecords]);

  // ===========================================
  // NOTICES
  // ===========================================

  const notices = useMemo(
    () => safeArray(responses.notices),
    [responses.notices]
  );

  const recentNotices = useMemo(
    () =>
      notices
        .filter(
          (item) =>
            !item.status ||
            item.status === "Published"
        )
        .sort(
          (a, b) =>
            new Date(
              b.publishedAt ||
              b.createdAt ||
              0
            ).getTime() -
            new Date(
              a.publishedAt ||
              a.createdAt ||
              0
            ).getTime()
        )
        .slice(0, 4),
    [notices]
  );

  // ===========================================
  // RECENT ACTIVITY
  // ===========================================

  const recentActivity = useMemo(() => {
    const items = [];

    assignments.forEach((assignment) => {
      items.push({
        id: `assignment-${assignment.id}`,
        title: assignment.title,
        description:
          `${assignment.submissions || 0} submissions · ` +
          `${assignment.graded || 0} graded`,
        type: "Assignment",
        date:
          assignment.updatedAt ||
          assignment.createdAt,
        path: "/faculty/assignments",
        icon: FileText,
      });
    });

    notices.forEach((notice) => {
      items.push({
        id: `notice-${getId(notice)}`,
        title: notice.title,
        description:
          notice.category || "Academic Notice",
        type: "Notice",
        date:
          notice.publishedAt ||
          notice.createdAt,
        path: "/faculty/notices",
        icon: Bell,
      });
    });

    return items
      .filter((item) => item.date)
      .sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      )
      .slice(0, 5);
  }, [assignments, notices]);

  // ===========================================
  // STATISTICS
  // ===========================================

  const stats = [
    {
      title: "Assigned Courses",
      value:
        responses.courses
          ? courses.length
          : "—",
      note: `${totalCredits} teaching credits`,
      icon: BookOpen,
    },
    {
      title: "Total Students",
      value:
        responses.courses &&
        rosterAvailable
          ? uniqueStudents
          : "—",
      note: "Unique approved students",
      icon: Users,
    },
    {
      title: "Today's Attendance",
      value:
        todayAttendance.rate === null
          ? "—"
          : `${todayAttendance.rate}%`,
      note:
        todayAttendance.sessions > 0
          ? `${todayAttendance.sessions} saved attendance session(s)`
          : "No attendance recorded today",
      icon: ClipboardCheck,
    },
    {
      title: "Pending Reviews",
      value:
        responses.assignments
          ? pendingReviews
          : "—",
      note: "Submitted work awaiting grading",
      icon: FileText,
    },
  ];

  // ===========================================
  // QUICK ACTIONS
  // ===========================================

  const quickActions = [
    {
      label: "Take Attendance",
      description: "Record class attendance",
      path: "/faculty/attendance",
      icon: ClipboardCheck,
    },
    {
      label: "Review Assignments",
      description: "Manage student submissions",
      path: "/faculty/assignments",
      icon: FileText,
    },
    {
      label: "Manage Grades",
      description: "Grade submitted work",
      path: "/faculty/grading",
      icon: GraduationCap,
    },
    {
      label: "Class Schedule",
      description: "View your weekly routine",
      path: "/faculty/schedule",
      icon: CalendarDays,
    },
    {
      label: "My Courses",
      description: "View teaching courses",
      path: "/faculty/courses",
      icon: BookOpen,
    },
    {
      label: "View Notices",
      description: "University announcements",
      path: "/faculty/notices",
      icon: Bell,
    },
  ];

  // ===========================================
  // UI
  // ===========================================

  return (
    <div className="space-y-7">

      {/* WELCOME SECTION */}
      <section className="rounded-2xl bg-[#234E43] p-6 text-white shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-2 text-sm font-bold tracking-wider text-[#D9A536]">
              FACULTY OVERVIEW
            </p>

            <h1 className="text-2xl font-bold md:text-3xl">
              Welcome back, {facultyName}!
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              Manage your courses, review assignments,
              track attendance, and stay updated
              with academic activities.
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#D9E7DC]">
              {facultyId && (
                <span>Faculty ID: {facultyId}</span>
              )}

              {department && (
                <span>Department: {department}</span>
              )}

              <span>{designation}</span>
            </div>

            <button
              type="button"
              onClick={refreshDashboard}
              disabled={loading}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#234E43] disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  loading ? "animate-spin" : ""
                }
              />
              Refresh Dashboard
            </button>
          </div>

          <Link
            to="/faculty/profile"
            title="View Faculty Profile"
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/25 bg-white/10"
          >
            {avatar ? (
              <img
                src={avatar}
                alt="Faculty profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-white">
                {getInitials(facultyName)}
              </span>
            )}
          </Link>
        </div>
      </section>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center gap-3 rounded-xl border border-[#234E43]/10 bg-white p-4 text-sm text-slate-500">
          <Loader2
            size={20}
            className="animate-spin"
          />
          Loading Faculty Dashboard from MongoDB...
        </div>
      )}

      {/* ERRORS */}
      {!loading &&
        Object.keys(errors).length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <AlertTriangle size={18} />
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

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
            value={
              loading ? "..." : stat.value
            }
          />
        ))}
      </section>

      {/* CLASS SCHEDULE + QUICK ACTIONS */}
      <section className="grid gap-6 xl:grid-cols-3">

        {/* TODAY'S CLASSES */}
        <Panel className="xl:col-span-2">
          <SectionHeading
            title="Today's Classes"
            description={`${day} · Your teaching schedule`}
            link="/faculty/schedule"
          />

          <div className="mt-5">
            {!responses.schedule ? (
              <EmptyState
                icon={AlertTriangle}
                title="Schedule Unavailable"
                description="Unable to load your class schedule."
              />
            ) : todayClasses.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No Classes Today"
                description="You have no classes scheduled for today."
              />
            ) : (
              <div className="space-y-3">
                {todayClasses.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-[#F6F8F3] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white p-3 text-[#234E43]">
                        <Clock3 size={20} />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-[#234E43]">
                          {item.courseTitle}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.courseCode}
                        </p>

                        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin size={13} />
                          {item.room || "Room unavailable"}
                          {" · "}
                          {item.section
                            ? `Section ${item.section}`
                            : "Common Class"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#234E43]">
                      {formatTime(item.startTime)}
                      {" – "}
                      {formatTime(item.endTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {responses.schedule && (
            <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
              <span className="rounded-lg bg-[#F6F8F3] px-3 py-2 text-xs font-semibold text-[#477764]">
                Weekly Classes: {activeSchedule.length}
              </span>

              <span className="rounded-lg bg-[#F6F8F3] px-3 py-2 text-xs font-semibold text-[#477764]">
                Today: {todayClasses.length}
              </span>
            </div>
          )}
        </Panel>

        {/* QUICK ACTIONS */}
        <Panel>
          <SectionHeading
            title="Quick Actions"
            description="Frequently used faculty tools"
          />

          <div className="mt-5 space-y-3">
            {quickActions.map((action) => (
              <QuickAction
                key={action.path}
                {...action}
              />
            ))}
          </div>
        </Panel>
      </section>

      {/* COURSES + GRADING */}
      <section className="grid gap-6 xl:grid-cols-2">

        {/* MY COURSES */}
        <Panel>
          <SectionHeading
            title="My Courses"
            description="Your active assigned courses"
            link="/faculty/courses"
          />

          <div className="mt-5 space-y-3">
            {!responses.courses ? (
              <EmptyState
                icon={BookOpen}
                title="Courses Unavailable"
                description="Could not load your assigned courses."
              />
            ) : courses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No Assigned Courses"
                description="Courses will appear after HOD allocation."
              />
            ) : (
              courses.slice(0, 5).map((course) => {
                const courseId = getId(course);
                const courseAssignments =
                  assignmentByCourse[courseId] || [];

                const studentCount =
                  rosters[courseId];

                return (
                  <Link
                    key={courseId}
                    to="/faculty/courses"
                    className="block rounded-xl border border-slate-100 bg-[#F6F8F3] p-4 transition hover:border-[#A6C1A4]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#B18A28]">
                          {course.code}
                        </p>

                        <h3 className="mt-1 text-sm font-bold text-[#234E43]">
                          {course.title}
                        </h3>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#477764]">
                        {course.credits} Credits
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Semester: {course.semester}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#607B6C]">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {Array.isArray(studentCount)
                          ? studentCount.length
                          : "—"} Students
                      </span>

                      <span className="flex items-center gap-1">
                        <FileText size={14} />
                        {courseAssignments.length} Assignments
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Panel>

        {/* ASSIGNMENT GRADING PROGRESS */}
        <Panel>
          <SectionHeading
            title="Assignment Grading"
            description="Submission reviews and grading progress"
            link="/faculty/grading"
          />

          {!responses.assignments ? (
            <div className="mt-5">
              <EmptyState
                icon={FileText}
                title="Assignment Data Unavailable"
                description="Unable to load grading information."
              />
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Total Submissions",
                    value: totalSubmissions,
                  },
                  {
                    label: "Graded",
                    value: gradedSubmissions,
                  },
                  {
                    label: "Pending Reviews",
                    value: pendingReviews,
                  },
                  {
                    label: "Published Assignments",
                    value: publishedAssignments.length,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-[#F6F8F3] p-4"
                  >
                    <p className="text-2xl font-bold text-[#234E43]">
                      {item.value}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#234E43]">
                    Grading Completion
                  </span>

                  <span className="text-sm font-bold text-[#234E43]">
                    {gradingProgress}%
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#EDF1EB]">
                  <div
                    className="h-full rounded-full bg-[#D9A536]"
                    style={{
                      width: `${gradingProgress}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  {gradedSubmissions} of{" "}
                  {totalSubmissions} submissions graded
                </p>
              </div>

              {pendingReviews === 0 && (
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                  <CheckCircle2 size={18} />
                  No submitted assignments are awaiting grading.
                </div>
              )}
            </>
          )}
        </Panel>
      </section>

      {/* TODAY'S ATTENDANCE + NOTICES */}
      <section className="grid gap-6 xl:grid-cols-2">

        {/* ATTENDANCE */}
        <Panel>
          <SectionHeading
            title="Today's Attendance"
            description={`Saved attendance records · ${date}`}
            link="/faculty/attendance"
          />

          <div className="mt-5">
            {todayAttendance.sessions === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No Attendance Recorded Today"
                description="Take attendance from the Attendance page."
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#234E43]">
                    Attendance Rate
                  </span>

                  <span className="text-2xl font-bold text-[#234E43]">
                    {todayAttendance.rate ?? "—"}%
                  </span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#EDF1EB]">
                  <div
                    className="h-full rounded-full bg-[#477764]"
                    style={{
                      width: `${todayAttendance.rate || 0}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    ["Present", todayAttendance.present],
                    ["Late", todayAttendance.late],
                    ["Absent", todayAttendance.absent],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-[#F6F8F3] p-4 text-center"
                    >
                      <p className="text-xl font-bold text-[#234E43]">
                        {value}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Total attendance entries:{" "}
                  {todayAttendance.total}
                </p>
              </>
            )}
          </div>
        </Panel>

        {/* NOTICES */}
        <Panel>
          <SectionHeading
            title="Recent Notices"
            description="Published university announcements"
            link="/faculty/notices"
          />

          <div className="mt-5 space-y-3">
            {!responses.notices ? (
              <EmptyState
                icon={Bell}
                title="Notices Unavailable"
                description="Unable to load notices."
              />
            ) : recentNotices.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No Recent Notices"
                description="University announcements will appear here."
              />
            ) : (
              recentNotices.map((notice) => (
                <Link
                  key={getId(notice)}
                  to="/faculty/notices"
                  className="block rounded-xl border border-slate-100 bg-[#F6F8F3] p-4 transition hover:border-[#A6C1A4]"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white p-3 text-[#234E43]">
                      <Bell size={19} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-[#234E43]">
                        {notice.title}
                      </h3>

                      <p className="mt-2 text-xs text-slate-500">
                        {formatDate(
                          notice.publishedAt ||
                          notice.createdAt
                        )}
                        {" · "}
                        {notice.category || "General"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Panel>
      </section>

      {/* PROFILE CARD */}
      <Panel>
        <SectionHeading
          title="My Faculty Profile"
          description="Your academic identity and profile information"
          link="/faculty/profile"
        />

        <div className="mt-5 flex flex-wrap items-center gap-5 rounded-xl bg-[#F6F8F3] p-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#A6C1A4] text-xl font-bold text-[#234E43]">
            {avatar ? (
              <img
                src={avatar}
                alt="Faculty"
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(facultyName)
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-[#234E43]">
              {facultyName}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {designation}
            </p>

            {facultyId && (
              <p className="mt-2 text-xs font-medium text-[#477764]">
                Faculty ID: {facultyId}
              </p>
            )}

            {department && (
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <Building2 size={14} />
                {department}
              </p>
            )}
          </div>

          <Link
            to="/faculty/profile"
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
          >
            <UserRound size={17} />
            View Profile
          </Link>
        </div>

        {facultyProfile.email && (
          <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Mail size={15} />
            {facultyProfile.email}
          </p>
        )}

        {!avatar && (
          <Link
            to="/faculty/profile"
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#477764] hover:underline"
          >
            <Camera size={16} />
            Add Your Profile Picture
          </Link>
        )}
      </Panel>

      {/* RECENT ACTIVITY */}
      <Panel>
        <SectionHeading
          title="Recent Activity"
          description="Latest assignments and academic notices"
        />

        <div className="mt-5 space-y-3">
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No Recent Activity"
              description="New assignments and academic announcements will appear here."
            />
          ) : (
            recentActivity.map((activity) => {
              const Icon = activity.icon;

              return (
                <Link
                  key={activity.id}
                  to={activity.path}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#F6F8F3] p-4 transition hover:border-[#A6C1A4]"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2.5 text-[#234E43]">
                      <Icon size={19} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-[#234E43]">
                        {activity.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {activity.description}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-xs text-slate-400">
                    {formatDate(activity.date)}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </Panel>

      {/* FOOTER */}
      <p className="text-center text-xs text-slate-400">
        UniBee Faculty Dashboard · MongoDB Academic Data
      </p>
    </div>
  );
}
