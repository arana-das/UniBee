
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  Wallet,
  ClipboardCheck,
  UserPlus,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Clock3,
  Megaphone,
  BarChart3,
  RefreshCcw,
  ShieldCheck,
  Activity,
  Ticket,
  Loader2,
} from "lucide-react";
import { getAuthToken } from "../../services/authApi";

// ========================================
// UNIBEE ADMIN DASHBOARD
// MongoDB-connected, no sample statistics
// ========================================

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const ENDPOINTS = {
  students: "/api/students",
  faculty: "/api/faculty",
  departments: "/api/academic/departments",
  courses: "/api/academic/courses",
  enrollments: "/api/enrollments",
  examinations: "/api/examinations",
  results: "/api/results",
  events: "/api/events",
  notices: "/api/notices",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const QUICK_ACTIONS = [
  {
    title: "Manage Students",
    description: "Student records and profiles",
    icon: GraduationCap,
    path: "/admin/students",
  },
  {
    title: "Faculty Members",
    description: "Faculty management",
    icon: Users,
    path: "/admin/faculty",
  },
  {
    title: "Departments",
    description: "Academic departments",
    icon: Building2,
    path: "/admin/departments",
  },
  {
    title: "Courses",
    description: "Academic course catalog",
    icon: BookOpen,
    path: "/admin/courses",
  },
  {
    title: "Enrollments",
    description: "Course enrollment records",
    icon: UserPlus,
    path: "/admin/enrollment",
  },
  {
    title: "Examinations",
    description: "Examination management",
    icon: ClipboardCheck,
    path: "/admin/examinations",
  },
  {
    title: "Results",
    description: "Marks and publication",
    icon: FileCheck2,
    path: "/admin/results",
  },
  {
    title: "Events",
    description: "Campus events and registrations",
    icon: CalendarDays,
    path: "/admin/events",
  },
  {
    title: "Notices",
    description: "University announcements",
    icon: Megaphone,
    path: "/admin/notices",
  },
  {
    title: "Finance",
    description: "Financial operations",
    icon: Wallet,
    path: "/admin/finance",
  },
];

// ========================================
// HELPERS
// ========================================

function normalizeArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload?.data,
    payload?.records,
    payload?.items,
    payload?.students,
    payload?.faculty,
    payload?.departments,
    payload?.courses,
    payload?.enrollments,
    payload?.examinations,
    payload?.results,
    payload?.events,
    payload?.notices,
  ];

  for (const item of candidates) {
    if (Array.isArray(item)) {
      return item;
    }

    if (item && typeof item === "object") {
      for (const nested of [
        item.data,
        item.records,
        item.items,
        item.results,
      ]) {
        if (Array.isArray(nested)) {
          return nested;
        }
      }
    }
  }

  throw new Error("Unexpected API response format.");
}

async function fetchRecords(endpoint, token) {
  const response = await fetch(
    `${API}${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const payload = await response.json().catch(
    () => null
  );

  if (
    !response.ok ||
    payload?.success === false
  ) {
    throw new Error(
      payload?.message ||
      `Request failed (${response.status}).`
    );
  }

  return normalizeArray(payload);
}

function safeDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getRecordDate(record) {
  return safeDate(
    record.createdAt ||
    record.registeredAt ||
    record.enrolledAt ||
    record.publishedAt ||
    record.updatedAt
  );
}

function formatDate(value) {
  const date = safeDate(value);

  if (!date) return "Date unavailable";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  const date = safeDate(value);

  if (!date) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDepartmentName(value) {
  if (!value) return "Unassigned";

  if (typeof value === "string") {
    return value;
  }

  return (
    value.departmentName ||
    value.name ||
    value.title ||
    value.departmentCode ||
    value.code ||
    "Unassigned"
  );
}

function getEventStart(event) {
  if (!event?.date || !event?.startTime) {
    return null;
  }

  // Same timezone as UniBee eventRoutes.js.
  const date = new Date(
    `${String(event.date).slice(0, 10)}T${event.startTime}:00+06:00`
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function numberText(value) {
  return value === null ||
    value === undefined
    ? "—"
    : Number(value).toLocaleString();
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function SectionTitle({
  title,
  subtitle,
  action,
  to,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-[#234E43]">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      {action && to && (
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#234E43] hover:underline"
        >
          {action}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  loading,
}) {
  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h3 className="mt-4 text-3xl font-bold tracking-tight text-[#234E43]">
            {loading ? "..." : numberText(value)}
          </h3>
        </div>

        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {detail}
      </p>
    </article>
  );
}

function SimpleMetric({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F6F8F3] p-4">
      <div>
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-2xl font-bold text-[#234E43]">
          {numberText(value)}
        </p>
      </div>

      <Icon
        size={23}
        className="text-[#477764]"
      />
    </div>
  );
}

// ========================================
// ENROLLMENT TREND
// ========================================

function EnrollmentChart({
  enrollments,
  period,
  onPeriodChange,
  available,
}) {
  const monthly = useMemo(() => {
    const now = new Date();
    const count = period === "6 Months" ? 6 : 12;

    return Array.from(
      { length: count },
      (_, index) => {
        const start = new Date(
          now.getFullYear(),
          now.getMonth() - count + index + 1,
          1
        );

        const end = new Date(
          start.getFullYear(),
          start.getMonth() + 1,
          1
        );

        const students = enrollments.filter(
          (record) => {
            const date = getRecordDate(record);

            return (
              date &&
              date >= start &&
              date < end
            );
          }
        ).length;

        return {
          key: `${start.getFullYear()}-${start.getMonth()}`,
          label: MONTHS[start.getMonth()],
          year: start.getFullYear(),
          students,
        };
      }
    );
  }, [enrollments, period]);

  const max = Math.max(
    1,
    ...monthly.map((item) => item.students)
  );

  const anyDatedRecord = enrollments.some(
    (item) => getRecordDate(item)
  );

  return (
    <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle
          title="Student Enrollment Trends"
          subtitle="Actual enrollment records by creation date"
        />

        <select
          value={period}
          onChange={(event) =>
            onPeriodChange(event.target.value)
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#234E43]"
        >
          <option>12 Months</option>
          <option>6 Months</option>
        </select>
      </div>

      {!available ? (
        <p className="flex h-64 items-center justify-center text-sm text-slate-500">
          Enrollment data unavailable.
        </p>
      ) : !anyDatedRecord ? (
        <p className="flex h-64 items-center justify-center text-center text-sm text-slate-500">
          No dated enrollment records available
          for this chart.
        </p>
      ) : (
        <>
          <div className="mt-7 flex h-64 items-end gap-2 border-b border-slate-200 pb-2 sm:gap-3">
            {monthly.map((item) => (
              <div
                key={item.key}
                className="group flex h-full min-w-0 flex-1 flex-col justify-end"
              >
                <div
                  className="relative w-full rounded-t-lg bg-[#A6C1A4] transition-colors hover:bg-[#234E43]"
                  style={{
                    height: `${
                      item.students
                        ? Math.max(
                            5,
                            item.students / max * 100
                          )
                        : 0
                    }%`,
                  }}
                  title={`${item.label} ${item.year}: ${item.students} enrollments`}
                >
                  <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded-md bg-[#234E43] px-2 py-1 text-xs text-white group-hover:block">
                    {item.students}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2 sm:gap-3">
            {monthly.map((item) => (
              <span
                key={item.key}
                className="min-w-0 flex-1 text-center text-[10px] text-slate-500 sm:text-xs"
              >
                {item.label}
              </span>
            ))}
          </div>
        </>
      )}

      <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
        Records are grouped by their stored enrollment/creation timestamps.
      </p>
    </section>
  );
}

// ========================================
// DEPARTMENT DISTRIBUTION
// ========================================

function DepartmentChart({
  students,
  departments,
  available,
}) {
  const distribution = useMemo(() => {
    const map = new Map();

    for (const department of departments) {
      const name = getDepartmentName(department);
      const id = String(
        department._id || department.id || name
      );

      map.set(id, {
        name,
        count: 0,
      });
    }

    for (const student of students) {
      const department = student.department;

      const id =
        department &&
        typeof department === "object"
          ? String(department._id || department.id || "")
          : String(department || "");

      const name = getDepartmentName(department);

      // Prefer existing department label when possible.
      let key = id;

      if (
        !map.has(key) &&
        typeof department === "string"
      ) {
        const match = [...map.entries()].find(
          ([, item]) =>
            item.name.toLowerCase() ===
            department.toLowerCase()
        );

        if (match) key = match[0];
      }

      if (!map.has(key)) {
        map.set(key, {
          name,
          count: 0,
        });
      }

      map.get(key).count += 1;
    }

    return [...map.values()]
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [students, departments]);

  const max = Math.max(
    1,
    ...distribution.map((item) => item.count)
  );

  return (
    <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm md:p-6">
      <SectionTitle
        title="Students by Department"
        subtitle="Current MongoDB student distribution"
        action="View Departments"
        to="/admin/departments"
      />

      {!available ? (
        <p className="flex h-64 items-center justify-center text-sm text-slate-500">
          Student data unavailable.
        </p>
      ) : distribution.length === 0 ? (
        <p className="flex h-64 items-center justify-center text-sm text-slate-500">
          No department distribution records yet.
        </p>
      ) : (
        <div className="mt-7 max-h-80 space-y-5 overflow-y-auto pr-1">
          {distribution.map((item) => (
            <div key={item.name}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="truncate text-xs font-medium text-slate-600">
                  {item.name}
                </span>

                <span className="text-xs font-bold text-[#234E43]">
                  {item.count}
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#D9A536]"
                  style={{
                    width: `${
                      item.count / max * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ========================================
// MAIN ADMIN DASHBOARD
// ========================================

export default function AdminDashboard() {
  const [records, setRecords] = useState({});
  const [failed, setFailed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [period, setPeriod] = useState("12 Months");
  const [activityFilter, setActivityFilter] =
    useState("All");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getAuthToken();

    if (!token) {
      setError("Login session unavailable. Please log in again.");
      setRecords({});
      setFailed(Object.keys(ENDPOINTS));
      setLoading(false);
      return;
    }

    const entries = Object.entries(ENDPOINTS);

    const settled = await Promise.allSettled(
      entries.map(([, endpoint]) =>
        fetchRecords(endpoint, token)
      )
    );

    const next = {};
    const unavailable = [];

    settled.forEach((result, index) => {
      const key = entries[index][0];

      if (result.status === "fulfilled") {
        next[key] = result.value;
      } else {
        next[key] = null;
        unavailable.push(key);
        console.warn(
          `Dashboard ${key}:`,
          result.reason?.message
        );
      }
    });

    setRecords(next);
    setFailed(unavailable);
    setLastUpdated(new Date());

    if (unavailable.length) {
      setError(
        `Some dashboard data could not be loaded: ${unavailable.join(", ")}.`
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const students = records.students || [];
  const faculty = records.faculty || [];
  const departments = records.departments || [];
  const courses = records.courses || [];
  const enrollments = records.enrollments || [];
  const examinations = records.examinations || [];
  const results = records.results || [];
  const events = records.events || [];
  const notices = records.notices || [];

  const countOf = (key) =>
    Array.isArray(records[key])
      ? records[key].length
      : null;

  const stats = [
    {
      title: "Total Students",
      value: countOf("students"),
      detail: "Student records in MongoDB",
      icon: GraduationCap,
    },
    {
      title: "Faculty Members",
      value: countOf("faculty"),
      detail: "Faculty records in MongoDB",
      icon: Users,
    },
    {
      title: "Academic Courses",
      value: countOf("courses"),
      detail: "Registered course records",
      icon: BookOpen,
    },
    {
      title: "Departments",
      value: countOf("departments"),
      detail: "Academic department records",
      icon: Building2,
    },
  ];

  // ========================================
  // REAL OPERATIONAL METRICS
  // ========================================

  const now = Date.now();

  const publishedNotices = notices.filter(
    (notice) => notice.status === "Published"
  );

  const upcomingEvents = events.filter(
    (event) => {
      const start = getEventStart(event);

      return (
        event.status === "Published" &&
        start &&
        start.getTime() > now
      );
    }
  );

  const eventRegistrations = events.reduce(
    (total, event) =>
      total +
      Number(event.registrationCount || 0),
    0
  );

  const draftResults = results.filter(
    (result) => result.status === "Draft"
  );

  const completedExaminations = examinations.filter(
    (exam) => exam.status === "Completed"
  );

  const scheduledExaminations = examinations.filter(
    (exam) => exam.status === "Scheduled"
  );

  const unpublishedNotices = notices.filter(
    (notice) => notice.status === "Draft"
  );

  // ========================================
  // RECENT ACTIVITY FROM REAL RECORDS
  // ========================================

  const activities = useMemo(() => {
    const sources = [
      {
        key: "students",
        category: "Students",
        label: "Student record created",
        field: (item) =>
          item.fullName ||
          item.studentId ||
          "Student",
        icon: GraduationCap,
      },
      {
        key: "faculty",
        category: "Faculty",
        label: "Faculty record created",
        field: (item) =>
          item.fullName ||
          item.name ||
          "Faculty member",
        icon: Users,
      },
      {
        key: "enrollments",
        category: "Enrollment",
        label: "Enrollment recorded",
        field: (item) =>
          item.studentId ||
          item.courseCode ||
          "Course enrollment",
        icon: UserPlus,
      },
      {
        key: "examinations",
        category: "Academic",
        label: "Examination recorded",
        field: (item) =>
          item.title ||
          item.courseCode ||
          "Examination",
        icon: CalendarDays,
      },
      {
        key: "results",
        category: "Results",
        label: "Examination result recorded",
        field: (item) =>
          item.courseCode ||
          "Academic result",
        icon: FileCheck2,
      },
      {
        key: "events",
        category: "Events",
        label: "Campus event created",
        field: (item) =>
          item.title || "Event",
        icon: Ticket,
      },
      {
        key: "notices",
        category: "Notices",
        label: "University notice created",
        field: (item) =>
          item.title || "Notice",
        icon: Megaphone,
      },
    ];

    return sources
      .flatMap((source) =>
        (records[source.key] || []).map(
          (item) => ({
            id: `${
              source.key
            }-${item._id || item.id || Math.random()}`,
            title: source.label,
            detail: source.field(item),
            category: source.category,
            date: getRecordDate(item),
            icon: source.icon,
          })
        )
      )
      .filter((item) => item.date)
      .sort((a, b) => b.date - a.date)
      .slice(0, 25);
  }, [records]);

  const filteredActivities = useMemo(
    () =>
      activityFilter === "All"
        ? activities
        : activities.filter(
            (item) =>
              item.category === activityFilter
          ),
    [activities, activityFilter]
  );

  const activityCategories = [
    "All",
    ...new Set(
      activities.map((item) => item.category)
    ),
  ];

  // ========================================
  // VIEW
  // ========================================

  return (
    <div className="space-y-7">

      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Administration Overview
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            University Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor academic operations,
            student enrollment and campus
            activities using MongoDB records.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-50"
        >
          <RefreshCcw
            size={17}
            className={
              loading ? "animate-spin" : ""
            }
          />
          Refresh Dashboard
        </button>
      </section>

      {/* LOADING / ERROR */}
      {loading && (
        <div className="flex items-center gap-3 rounded-xl bg-[#EAF2E8] p-4 text-sm text-[#234E43]">
          <Loader2
            size={18}
            className="animate-spin"
          />
          Loading dashboard data...
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          <AlertCircle
            size={20}
            className="shrink-0"
          />
          <p>{error}</p>
        </div>
      )}

      {/* WELCOME BANNER */}
      <section className="relative overflow-hidden rounded-2xl bg-[#234E43] p-6 text-white shadow-sm md:p-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#D9A536]">
              UniBee Administration
            </p>

            <h2 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">
              Welcome to your Admin Workspace
            </h2>

            <p className="mt-3 text-sm leading-7 text-white/75">
              Your central workspace for university
              administration, academic management,
              and campus operations.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/admin/students"
                className="inline-flex items-center gap-2 rounded-xl bg-[#D9A536] px-4 py-2.5 text-sm font-bold text-[#234E43]"
              >
                Manage Students
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/admin/events"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Campus Events
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>

          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 md:h-24 md:w-24">
            <ShieldCheck
              size={44}
              className="text-[#D9A536]"
            />
          </div>
        </div>

        <div className="pointer-events-none absolute -bottom-20 -right-16 h-64 w-64 rounded-full border-[35px] border-white/5" />
      </section>

      {/* MAIN STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
            loading={loading}
          />
        ))}
      </section>

      {/* CHARTS */}
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="min-w-0 xl:col-span-3">
          <EnrollmentChart
            enrollments={enrollments}
            period={period}
            onPeriodChange={setPeriod}
            available={Array.isArray(records.enrollments)}
          />
        </div>

        <div className="min-w-0 xl:col-span-2">
          <DepartmentChart
            students={students}
            departments={departments}
            available={Array.isArray(records.students)}
          />
        </div>
      </div>

      {/* ACADEMIC OPERATIONS */}
      <section className="grid gap-6 lg:grid-cols-2">

        <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm md:p-6">
          <SectionTitle
            title="Academic Operations"
            subtitle="Examinations, enrollments and results"
            action="View Results"
            to="/admin/results"
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <SimpleMetric
              label="Enrollment Records"
              value={countOf("enrollments")}
              icon={UserPlus}
            />

            <SimpleMetric
              label="Examinations"
              value={countOf("examinations")}
              icon={ClipboardCheck}
            />

            <SimpleMetric
              label="Completed Examinations"
              value={
                records.examinations
                  ? completedExaminations.length
                  : null
              }
              icon={CheckCircle2}
            />

            <SimpleMetric
              label="Published Exam Results"
              value={
                records.results
                  ? results.filter(
                      (item) =>
                        item.status === "Published"
                    ).length
                  : null
              }
              icon={FileCheck2}
            />
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Result counts represent examination-result
            records, not final course grades.
          </p>
        </div>

        {/* CAMPUS OPERATIONS */}
        <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm md:p-6">
          <SectionTitle
            title="Campus Operations"
            subtitle="Events and university announcements"
            action="Manage Events"
            to="/admin/events"
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <SimpleMetric
              label="Upcoming Events"
              value={
                records.events
                  ? upcomingEvents.length
                  : null
              }
              icon={CalendarDays}
            />

            <SimpleMetric
              label="Event Registrations"
              value={
                records.events
                  ? eventRegistrations
                  : null
              }
              icon={Ticket}
            />

            <SimpleMetric
              label="Published Notices"
              value={
                records.notices
                  ? publishedNotices.length
                  : null
              }
              icon={Megaphone}
            />

            <SimpleMetric
              label="Total Notices"
              value={countOf("notices")}
              icon={BookOpen}
            />
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm md:p-6">
        <SectionTitle
          title="Quick Actions"
          subtitle="Navigate to administrative modules"
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK_ACTIONS.map(
            ({
              title,
              description,
              icon: Icon,
              path,
            }) => (
              <Link
                key={path}
                to={path}
                className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-[#F6F8F3] p-4 transition-all hover:border-[#A6C1A4] hover:bg-[#A6C1A4]/15"
              >
                <div className="rounded-xl bg-white p-3 text-[#234E43]">
                  <Icon size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#234E43]">
                    {title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {description}
                  </p>
                </div>

                <ArrowUpRight
                  size={17}
                  className="shrink-0 text-slate-400"
                />
              </Link>
            )
          )}
        </div>
      </section>

      {/* ACTIVITY + FOLLOW UPS */}
      <div className="grid gap-6 xl:grid-cols-5">

        {/* ACTIVITY */}
        <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm md:p-6 xl:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              title="Recent Activity"
              subtitle="Latest dated records across connected modules"
            />

            <select
              value={activityFilter}
              onChange={(event) =>
                setActivityFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              {activityCategories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category === "All"
                      ? "All Activities"
                      : category}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="mt-6 divide-y divide-slate-100">
            {filteredActivities
              .slice(0, 8)
              .map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-4 first:pt-0"
                  >
                    <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
                      <Icon size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#234E43]">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.detail}
                      </p>
                    </div>

                    <span className="shrink-0 text-[11px] text-slate-400">
                      {formatTime(item.date)}
                    </span>
                  </div>
                );
              })}

            {!filteredActivities.length && (
              <p className="py-10 text-center text-sm text-slate-500">
                No dated activity records available.
              </p>
            )}
          </div>
        </section>

        {/* OPERATIONAL FOLLOW UPS */}
        <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm md:p-6 xl:col-span-2">
          <SectionTitle
            title="Operational Follow-ups"
            subtitle="Records that may need administrative attention"
          />

          <div className="mt-6 space-y-3">
            {[
              {
                title: "Draft Examination Results",
                detail: "Results awaiting publication",
                count: records.results
                  ? draftResults.length
                  : null,
                path: "/admin/results",
                icon: FileCheck2,
              },
              {
                title: "Scheduled Examinations",
                detail: "Upcoming or scheduled exam records",
                count: records.examinations
                  ? scheduledExaminations.length
                  : null,
                path: "/admin/examinations",
                icon: CalendarDays,
              },
              {
                title: "Draft Notices",
                detail: "Unpublished announcements",
                count: records.notices
                  ? unpublishedNotices.length
                  : null,
                path: "/admin/notices",
                icon: Megaphone,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  to={item.path}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-[#F6F8F3] p-4 hover:border-[#A6C1A4]"
                >
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#234E43]">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.detail}
                    </p>
                  </div>

                  <span className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#234E43]">
                    {numberText(item.count)}
                  </span>

                  <ArrowUpRight
                    size={16}
                    className="text-slate-400"
                  />
                </Link>
              );
            })}
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            These are record counts, not formal
            approval requests.
          </p>
        </section>
      </div>

      {/* SYSTEM STATUS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#234E43]">
              <Activity size={19} />
              Data Synchronization
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current Admin Dashboard API status
            </p>
          </div>

          <span className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
            failed.length
              ? "bg-amber-50 text-amber-800"
              : "bg-emerald-50 text-emerald-700"
          }`}>
            {loading
              ? "Loading"
              : failed.length
                ? "Partial Data"
                : "Connected"}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SimpleMetric
            label="Connected Modules"
            value={
              loading
                ? null
                : Object.keys(ENDPOINTS).length -
                  failed.length
            }
            icon={CheckCircle2}
          />

          <SimpleMetric
            label="Unavailable Modules"
            value={
              loading ? null : failed.length
            }
            icon={AlertCircle}
          />

          <div className="flex items-center justify-between rounded-xl bg-[#F6F8F3] p-4">
            <div>
              <p className="text-xs text-slate-500">
                Last Refreshed
              </p>

              <p className="mt-1 text-sm font-bold text-[#234E43]">
                {lastUpdated
                  ? formatTime(lastUpdated)
                  : "Not yet"}
              </p>
            </div>

            <Clock3
              size={23}
              className="text-[#477764]"
            />
          </div>
        </div>

        {failed.length > 0 && (
          <p className="mt-4 text-xs text-amber-800">
            Check these API responses:
            {" "}
            {failed.join(", ")}.
          </p>
        )}
      </section>

      <p className="text-center text-xs text-slate-400">
        UniBee Administration Dashboard · MongoDB Data Overview
      </p>
    </div>
  );
}
