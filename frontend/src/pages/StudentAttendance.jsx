
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ClipboardCheck,
  CalendarDays,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  TrendingUp,
  Clock3,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { getAuthToken } from "../services/authApi";

// ========================================
// UNIBEE STUDENT ATTENDANCE
// MONGODB CONNECTED
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const ATTENDANCE_ENDPOINT =
  `${API_BASE}/api/attendance/student/my`;

const STATUS_COLORS = {
  Present: "#234E43",
  Absent: "#D9534F",
  Late: "#D9A536",
  Excused: "#6798B7",
};

const STATUS_STYLES = {
  Present: "bg-emerald-50 text-emerald-700",
  Absent: "bg-red-50 text-red-700",
  Late: "bg-amber-50 text-amber-800",
  Excused: "bg-sky-50 text-sky-700",
};

const STATUSES = [
  "Present",
  "Absent",
  "Late",
  "Excused",
];

// ========================================
// HELPERS
// ========================================

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return String(value._id || value.id || "");
}

function percent(attended, total) {
  return total > 0
    ? Math.round((attended / total) * 100)
    : 0;
}

function formatDate(value) {
  if (!value) return "—";

  // YYYY-MM-DD is interpreted as a
  // local calendar date, not UTC.
  const parts = String(value)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (parts.length !== 3) {
    return String(value);
  }

  const [year, month, day] = parts;

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateSummary(records) {
  const counts = {
    Present: 0,
    Absent: 0,
    Late: 0,
    Excused: 0,
  };

  records.forEach((record) => {
    if (
      Object.prototype.hasOwnProperty.call(
        counts,
        record.status
      )
    ) {
      counts[record.status]++;
    }
  });

  const total = records.length;

  const attended =
    counts.Present + counts.Late;

  return {
    ...counts,
    total,
    attended,
    notAttended:
      counts.Absent + counts.Excused,
    rate: percent(attended, total),
  };
}

function normalizeRecord(item, index) {
  const course = item.course || {};

  const courseId = getId(course);

  return {
    id:
      getId(item) ||
      `attendance-${index}`,

    date: item.date || "",

    semester: item.semester || "",

    courseId:
      courseId || "unknown",

    code:
      course.code || "N/A",

    name:
      course.title ||
      "Course information unavailable",

    status: item.status || "",
  };
}

// ========================================
// API REQUEST
// ========================================

async function getMyAttendance(signal) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to your Student account."
    );
  }

  let response;

  try {
    response = await fetch(
      ATTENDANCE_ENDPOINT,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal,
      }
    );
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
      `Unable to load attendance (${response.status}).`
    );
  }

  if (!Array.isArray(result.data)) {
    throw new Error(
      "Invalid attendance records received from the server."
    );
  }

  return result;
}

// ========================================
// SUMMARY CARD
// ========================================

function SummaryCard({
  title,
  value,
  icon: Icon,
  background,
  color,
  subtitle,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{
          background,
          color,
        }}
      >
        <Icon size={24} />
      </div>

      <p className="text-sm text-[#718579]">
        {title}
      </p>

      <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
        {value}
      </h2>

      {subtitle && (
        <p className="mt-2 text-xs text-[#8A9F90]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ========================================
// STATUS BADGE
// ========================================

function StatusBadge({ status }) {
  const Icon =
    status === "Present"
      ? CheckCircle2
      : status === "Absent"
      ? XCircle
      : status === "Late"
      ? Clock3
      : ShieldCheck;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
        STATUS_STYLES[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      <Icon size={14} />
      {status}
    </span>
  );
}

// ========================================
// STUDENT ATTENDANCE
// ========================================

export default function StudentAttendance() {
  const [records, setRecords] = useState([]);
  const [student, setStudent] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [refreshKey, setRefreshKey] =
    useState(0);

  // ========================================
  // LOAD FROM MONGODB
  // ========================================

  const refresh = useCallback(() => {
    setRefreshKey(
      (previous) => previous + 1
    );
  }, []);

  useEffect(() => {
    const controller =
      new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result =
          await getMyAttendance(
            controller.signal
          );

        if (controller.signal.aborted) {
          return;
        }

        const normalized = result.data
          .map(normalizeRecord)
          .filter((item) =>
            STATUSES.includes(item.status)
          )
          .sort((a, b) =>
            b.date.localeCompare(a.date)
          );

        setRecords(normalized);
        setStudent(result.student || null);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setRecords([]);
        setStudent(null);

        setError(
          requestError.message ||
          "Unable to load attendance."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [refreshKey]);

  // ========================================
  // OVERALL STATISTICS
  // ========================================

  const summary = useMemo(
    () => calculateSummary(records),
    [records]
  );

  const pieData = useMemo(
    () =>
      STATUSES.map((status) => ({
        name: status,
        value: summary[status],
        color: STATUS_COLORS[status],
      })).filter((item) => item.value > 0),
    [summary]
  );

  // ========================================
  // COURSE-WISE ATTENDANCE
  // ========================================

  const courses = useMemo(() => {
    const map = new Map();

    records.forEach((record) => {
      const key = [
        record.courseId,
        record.semester,
      ].join("__");

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          courseId: record.courseId,
          code: record.code,
          name: record.name,
          semester: record.semester,
          records: [],
        });
      }

      map.get(key).records.push(record);
    });

    return [...map.values()]
      .map((course) => ({
        ...course,
        ...calculateSummary(course.records),
      }))
      .sort((a, b) =>
        a.code.localeCompare(b.code) ||
        a.semester.localeCompare(b.semester)
      );
  }, [records]);

  const chartData = useMemo(
    () =>
      courses.map((course) => ({
        name: course.code,
        attendance: course.rate,
        semester: course.semester,
        title: course.name,
      })),
    [courses]
  );

  // ========================================
  // COURSE SEARCH
  // ========================================

  const filteredCourses = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return courses.filter((course) =>
      [
        course.code,
        course.name,
        course.semester,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [courses, search]);

  // ========================================
  // ATTENDANCE HISTORY FILTER
  // ========================================

  const filteredHistory = useMemo(() => {
    return records.filter((record) => {
      const key = [
        record.courseId,
        record.semester,
      ].join("__");

      const matchesCourse =
        selectedCourse === "all" ||
        key === selectedCourse;

      const matchesStatus =
        statusFilter === "all" ||
        record.status === statusFilter;

      return matchesCourse && matchesStatus;
    });
  }, [
    records,
    selectedCourse,
    statusFilter,
  ]);

  const statCards = [
    {
      title: "Overall Attendance",
      value:
        loading || error || summary.total === 0
          ? "—"
          : `${summary.rate}%`,
      icon: TrendingUp,
      background: "#EAF2E8",
      color: "#234E43",
      subtitle:
        "Present and Late count as attended",
    },
    {
      title: "Total Classes",
      value:
        loading || error
          ? "—"
          : summary.total,
      icon: BookOpen,
      background: "#EEF2F7",
      color: "#52677F",
      subtitle: "Recorded class sessions",
    },
    {
      title: "Classes Attended",
      value:
        loading || error
          ? "—"
          : summary.attended,
      icon: CheckCircle2,
      background: "#EAF2E8",
      color: "#427A67",
      subtitle: "Present + Late",
    },
    {
      title: "Classes Not Attended",
      value:
        loading || error
          ? "—"
          : summary.notAttended,
      icon: XCircle,
      background: "#FFF4DC",
      color: "#B78B28",
      subtitle: "Absent + Excused",
    },
  ];

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-8">

      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            STUDENT ACADEMICS
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            My Attendance
          </h1>

          <p className="mt-3 text-[#718579]">
            Monitor your class participation and track
            attendance across your enrolled courses.
          </p>

          {student && (
            <p className="mt-2 text-sm font-medium text-[#45685B]">
              {student.name || "Student"}
              {student.studentId
                ? ` · ${student.studentId}`
                : ""}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              loading ? "animate-spin" : ""
            }
          />
          Refresh Attendance
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl bg-[#F1F7EF] p-5 text-sm text-[#234E43]"
        >
          <Loader2
            size={20}
            className="animate-spin"
          />
          Loading your attendance from MongoDB...
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"
        >
          <AlertCircle
            size={20}
            className="shrink-0"
          />
          <span>{error}</span>
        </div>
      )}

      {/* OVERVIEW CARDS */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => (
          <SummaryCard
            key={item.title}
            {...item}
          />
        ))}
      </section>

      {/* ANALYTICS */}
      <section className="grid gap-6 xl:grid-cols-5">

        {/* DONUT CHART */}
        <div className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-xl font-bold text-[#234E43]">
            Attendance Overview
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            Overall participation distribution
          </p>

          {!loading && !error && summary.total > 0 ? (
            <>
              <div className="relative mt-5 h-64">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={77}
                      outerRadius={102}
                      paddingAngle={3}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>

                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-[#234E43]">
                    {summary.rate}%
                  </span>

                  <span className="text-xs text-[#718579]">
                    Overall
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 text-xs">
                {STATUSES.map((status) => (
                  <span
                    key={status}
                    className="flex items-center gap-2 text-[#607B6C]"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          STATUS_COLORS[status],
                      }}
                    />
                    {status} ({summary[status]})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center text-center text-sm text-[#718579]">
              {loading
                ? "Loading chart..."
                : error
                ? "Attendance chart unavailable."
                : "No attendance records yet."}
            </div>
          )}
        </div>

        {/* COURSE-WISE BAR CHART */}
        <div className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm xl:col-span-3">
          <h2 className="text-xl font-bold text-[#234E43]">
            Course-wise Attendance
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            Percentage comparison across courses
          </p>

          {!loading && !error && chartData.length > 0 ? (
            <div className="mt-7 h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -10,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="#EDF1EB"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "#718579",
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={55}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                    tick={{
                      fill: "#718579",
                      fontSize: 12,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Attendance",
                    ]}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.title ||
                      label
                    }
                  />

                  <Bar
                    dataKey="attendance"
                    fill="#477764"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center text-center text-sm text-[#718579]">
              {loading
                ? "Loading chart..."
                : error
                ? "Course attendance unavailable."
                : "Course attendance will appear after your Faculty records it."}
            </div>
          )}
        </div>
      </section>

      {/* COURSE-WISE RECORDS */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              Course Attendance Details
            </h2>

            <p className="mt-1 text-sm text-[#718579]">
              Review your attendance in each course
            </p>
          </div>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search courses..."
              aria-label="Search courses"
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-11 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4] sm:w-64"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredCourses.map((course) => {
            const lowAttendance =
              course.rate < 75;

            return (
              <div
                key={course.id}
                className="rounded-2xl border border-[#E5ECE2] bg-[#FBFCFA] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#B18B37]">
                      {course.code}
                    </span>

                    <h3 className="mt-1 font-bold text-[#234E43]">
                      {course.name}
                    </h3>

                    {course.semester && (
                      <p className="mt-1 text-xs text-[#718579]">
                        {course.semester}
                      </p>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      lowAttendance
                        ? "bg-red-50 text-red-700"
                        : "bg-[#EAF2E8] text-[#427A67]"
                    }`}
                  >
                    {course.rate}%
                  </span>
                </div>

                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#E7EEE4]">
                  <div
                    className={`h-full rounded-full ${
                      lowAttendance
                        ? "bg-red-500"
                        : "bg-[#477764]"
                    }`}
                    style={{
                      width: `${course.rate}%`,
                    }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#718579]">
                  <span>
                    Present: {course.Present}
                  </span>

                  <span>
                    Late: {course.Late}
                  </span>

                  <span>
                    Absent: {course.Absent}
                  </span>

                  <span>
                    Excused: {course.Excused}
                  </span>
                </div>

                <p className="mt-3 text-xs text-[#718579]">
                  Total recorded classes:{" "}
                  {course.total}
                </p>

                {lowAttendance && (
                  <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-red-700">
                    <AlertTriangle size={15} />
                    Attendance below 75%
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {!loading &&
          !error &&
          filteredCourses.length === 0 && (
            <p className="py-10 text-center text-[#718579]">
              {courses.length === 0
                ? "No course attendance has been recorded yet."
                : "No matching courses found."}
            </p>
          )}
      </section>

      {/* ATTENDANCE HISTORY */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              Attendance History
            </h2>

            <p className="mt-1 text-sm text-[#718579]">
              Your recorded class attendance
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={selectedCourse}
              onChange={(event) =>
                setSelectedCourse(
                  event.target.value
                )
              }
              aria-label="Filter attendance by course"
              className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm text-[#45685B]"
            >
              <option value="all">
                All Courses
              </option>

              {courses.map((course) => (
                <option
                  key={course.id}
                  value={course.id}
                >
                  {course.code}
                  {course.semester
                    ? ` · ${course.semester}`
                    : ""}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              aria-label="Filter attendance by status"
              className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm text-[#45685B]"
            >
              <option value="all">
                All Status
              </option>

              {STATUSES.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead className="bg-[#F6F8F3]">
              <tr className="text-xs uppercase tracking-wide text-[#718579]">
                <th className="rounded-l-xl px-5 py-4">
                  Date
                </th>

                <th className="px-5 py-4">
                  Course
                </th>

                <th className="rounded-r-xl px-5 py-4">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredHistory.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-[#EDF1EB] text-sm"
                >
                  <td className="px-5 py-4 text-[#607B6C]">
                    <span className="flex items-center gap-2">
                      <CalendarDays size={16} />
                      {formatDate(
                        record.date
                      )}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-semibold text-[#234E43]">
                      {record.name}
                    </p>

                    <p className="mt-1 text-xs text-[#8A9F90]">
                      {record.code}
                      {record.semester
                        ? ` · ${record.semester}`
                        : ""}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge
                      status={record.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading &&
            !error &&
            filteredHistory.length === 0 && (
              <p className="py-10 text-center text-[#718579]">
                {records.length === 0
                  ? "No attendance records found for your account."
                  : "No attendance records match your filters."}
              </p>
            )}
        </div>
      </section>

      {/* FOOTER */}
      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — MongoDB Attendance
      </div>
    </div>
  );
}
