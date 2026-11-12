
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Clock3,
  MapPin,
  BookOpen,
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building2,
  GraduationCap,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ========================================
// UNIBEE FACULTY CLASS SCHEDULE
// MONGODB CONNECTED — READ ONLY
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const API_URL =
  `${API_BASE}/api/class-schedules/faculty/my`;

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// ========================================
// HELPERS
// ========================================

function formatTime(value) {
  if (!value) return "—";

  const parts = value.split(":");

  if (parts.length !== 2) {
    return value;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return value;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;

  return `${hour}:${String(minutes).padStart(
    2,
    "0"
  )} ${period}`;
}

function getMinutes(value) {
  if (!/^\d{2}:\d{2}$/.test(value || "")) {
    return 0;
  }

  const [hours, minutes] = value
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function getWeeklyHours(records) {
  const minutes = records.reduce(
    (total, item) => {
      return (
        total +
        Math.max(
          0,
          getMinutes(item.endTime) -
            getMinutes(item.startTime)
        )
      );
    },
    0
  );

  return (minutes / 60).toFixed(1);
}

async function fetchSchedule(signal) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to your Faculty account."
    );
  }

  let response;

  try {
    response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal,
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

  if (!Array.isArray(result.data)) {
    throw new Error(
      "Invalid class schedule response."
    );
  }

  return result;
}

// ========================================
// STAT CARD
// ========================================

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-bold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

// ========================================
// CLASS CARD
// ========================================

function ClassCard({ item }) {
  return (
    <article className="rounded-xl border border-[#234E43]/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-lg bg-[#A6C1A4]/25 px-2.5 py-1 text-xs font-bold text-[#234E43]">
          {item.courseCode || "Course"}
        </span>

        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Scheduled
        </span>
      </div>

      <h3 className="mt-3 text-sm font-bold leading-6 text-[#234E43]">
        {item.courseTitle ||
          "Course information unavailable"}
      </h3>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>
          {item.section
            ? `Section ${item.section}`
            : "Common Class"}
        </span>

        {item.semester && (
          <span>· {item.semester}</span>
        )}
      </div>

      <div className="mt-4 space-y-2 text-xs text-slate-600">
        <p className="flex items-center gap-2">
          <Clock3 size={15} />
          {formatTime(item.startTime)}
          {" – "}
          {formatTime(item.endTime)}
        </p>

        <p className="flex items-center gap-2">
          <MapPin size={15} />
          {item.room || "Room not assigned"}
        </p>

        {item.department && (
          <p className="flex items-center gap-2">
            <Building2 size={15} />
            {item.department}
          </p>
        )}

        {item.academicSession && (
          <p className="flex items-center gap-2">
            <GraduationCap size={15} />
            Session: {item.academicSession}
          </p>
        )}
      </div>

      {item.notes && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">
            {item.notes}
          </p>
        </div>
      )}
    </article>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function FacultySchedule() {
  const [classes, setClasses] = useState([]);
  const [faculty, setFaculty] = useState(null);

  const [view, setView] = useState("Weekly");
  const [day, setDay] = useState("Sunday");

  const [courseFilter, setCourseFilter] =
    useState("All");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  // ========================================
  // LOAD MONGODB SCHEDULE
  // ========================================

  const refresh = useCallback(() => {
    setRefreshKey((previous) => previous + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await fetchSchedule(
          controller.signal
        );

        if (controller.signal.aborted) {
          return;
        }

        setClasses(result.data);
        setFaculty(result.faculty || null);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setClasses([]);
        setFaculty(null);
        setError(err.message);
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
  // COURSE FILTER OPTIONS
  // ========================================

  const courses = useMemo(() => {
    const unique = new Map();

    for (const item of classes) {
      if (
        item.courseId &&
        !unique.has(item.courseId)
      ) {
        unique.set(item.courseId, {
          id: item.courseId,
          code: item.courseCode,
          title: item.courseTitle,
        });
      }
    }

    return [...unique.values()].sort(
      (a, b) =>
        String(a.code || "").localeCompare(
          String(b.code || "")
        )
    );
  }, [classes]);

  // ========================================
  // FILTERED CLASSES
  // ========================================

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return classes
      .filter((item) => {
        const matchesCourse =
          courseFilter === "All" ||
          item.courseId === courseFilter;

        const matchesDay =
          view === "Weekly" ||
          item.day === day;

        const matchesSearch = [
          item.courseCode,
          item.courseTitle,
          item.room,
          item.section,
          item.semester,
          item.department,
          item.academicSession,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

        return (
          matchesCourse &&
          matchesDay &&
          matchesSearch
        );
      })
      .sort(
        (a, b) =>
          DAYS.indexOf(a.day) -
            DAYS.indexOf(b.day) ||
          String(a.startTime).localeCompare(
            String(b.startTime)
          )
      );
  }, [
    classes,
    courseFilter,
    search,
    view,
    day,
  ]);

  // ========================================
  // STATISTICS
  // ========================================

  const activeDays = new Set(
    classes.map((item) => item.day)
  ).size;

  const uniqueCourses = new Set(
    classes.map((item) => item.courseId)
  ).size;

  const totalHours = getWeeklyHours(classes);

  const stats = [
    {
      title: "Weekly Sessions",
      value: loading ? "..." : classes.length,
      description:
        "Active weekly class entries",
      icon: CalendarDays,
    },
    {
      title: "Assigned Courses",
      value: loading ? "..." : uniqueCourses,
      description:
        "Distinct courses in your routine",
      icon: BookOpen,
    },
    {
      title: "Teaching Days",
      value: loading ? "..." : activeDays,
      description:
        "Days with scheduled classes",
      icon: Users,
    },
    {
      title: "Weekly Hours",
      value: loading ? "..." : totalHours,
      description:
        "Total weekly scheduled hours",
      icon: Clock3,
    },
  ];

  // ========================================
  // UI
  // ========================================

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Academic Planning
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Class Schedule
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View your HOD-managed teaching
            timetable, rooms, and weekly sessions.
          </p>

          {faculty && (
            <p className="mt-2 text-sm font-semibold text-[#477764]">
              {faculty.name || "Faculty"}
              {faculty.facultyId
                ? ` · ${faculty.facultyId}`
                : ""}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33] disabled:opacity-50"
        >
          <RefreshCw
            size={18}
            className={loading ? "animate-spin" : ""}
          />
          Refresh Schedule
        </button>
      </section>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertTriangle
            size={19}
            className="shrink-0"
          />
          {error}
        </div>
      )}

      {/* INFO */}
      {!error && (
        <div className="flex items-start gap-3 rounded-xl border border-[#E2EADC] bg-[#F6F8F3] p-4 text-sm text-[#477764]">
          <CheckCircle2
            size={19}
            className="shrink-0"
          />

          <p>
            This schedule is managed by your HOD.
            Contact your HOD to add, edit, or
            reschedule a class.
          </p>
        </div>
      )}

      {/* STATS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
          />
        ))}
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-[#234E43]">
            Schedule Controls
          </h2>

          <div className="flex rounded-xl bg-[#F6F8F3] p-1">
            {["Weekly", "Daily"].map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setView(option)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                    view === option
                      ? "bg-[#234E43] text-white"
                      : "text-[#234E43]"
                  }`}
                >
                  {option}
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search course or room..."
              aria-label="Search class schedule"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(event) =>
              setCourseFilter(event.target.value)
            }
            aria-label="Filter by course"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
          >
            <option value="All">
              All Courses
            </option>

            {courses.map((course) => (
              <option
                key={course.id}
                value={course.id}
              >
                {course.code} — {course.title}
              </option>
            ))}
          </select>

          {view === "Daily" ? (
            <select
              value={day}
              onChange={(event) =>
                setDay(event.target.value)
              }
              aria-label="Select day"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
            >
              {DAYS.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-[#F9FBF8] px-4 py-3 text-xs font-medium text-slate-500">
              HOD-managed · Read Only
            </div>
          )}
        </div>
      </section>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#234E43]/10 bg-white p-12 text-sm text-slate-500">
          <Loader2
            size={21}
            className="animate-spin"
          />
          Loading schedule from MongoDB...
        </div>
      )}

      {/* WEEKLY VIEW */}
      {!loading && !error && view === "Weekly" && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {DAYS.map((item) => {
            const dayClasses = filtered.filter(
              (entry) => entry.day === item
            );

            return (
              <div
                key={item}
                className="min-h-56 rounded-2xl border border-[#234E43]/10 bg-[#F6F8F3] p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-bold text-[#234E43]">
                    {item}
                  </h2>

                  <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                    {dayClasses.length} Classes
                  </span>
                </div>

                <div className="space-y-3">
                  {dayClasses.length ? (
                    dayClasses.map((entry) => (
                      <ClassCard
                        key={entry.id}
                        item={entry}
                      />
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-xs text-slate-400">
                      No classes scheduled
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* DAILY VIEW */}
      {!loading && !error && view === "Daily" && (
        <section className="rounded-2xl border border-[#234E43]/10 bg-[#F6F8F3] p-5">
          <h2 className="mb-4 text-lg font-bold text-[#234E43]">
            {day} Schedule
          </h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.length ? (
              filtered.map((item) => (
                <ClassCard
                  key={item.id}
                  item={item}
                />
              ))
            ) : (
              <p className="rounded-xl bg-white p-6 text-sm text-slate-500">
                No matching classes for this day.
              </p>
            )}
          </div>
        </section>
      )}

      {/* EMPTY DATA NOTE */}
      {!loading &&
        !error &&
        classes.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No active class schedule is currently
            available for your Faculty profile.
            Ask your HOD to create the routine
            in MongoDB.
          </div>
        )}

      {/* FOOTER */}
      <p className="text-center text-xs text-slate-400">
        UniBee Faculty Schedule · MongoDB Connected
      </p>
    </div>
  );
}
