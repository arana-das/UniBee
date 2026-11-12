
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Users,
  GraduationCap,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  X,
  CalendarDays,
  Clock3,
  MapPin,
  CheckCircle2,
  FileText,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Building2,
  Layers3,
} from "lucide-react";
import { getAuthToken } from "../../services/authApi";

// ============================================
// UNIBEE FACULTY MY COURSES
// MongoDB integration - no demo records
// ============================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

async function apiGet(path, signal) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Faculty login required.");
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
    if (error.name === "AbortError") throw error;
    throw new Error("Cannot connect to UniBee backend.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value.id || value._id || "");
}

function formatTime(time) {
  if (!/^\d{2}:\d{2}$/.test(time || "")) {
    return time || "—";
  }

  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(
    2,
    "0"
  )} ${hours >= 12 ? "PM" : "AM"}`;
}

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function CourseCard({ course, onView }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-lg bg-[#A6C1A4]/25 px-3 py-1.5 text-xs font-bold text-[#234E43]">
          {course.code}
        </span>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Active
        </span>
      </div>

      <h3 className="mt-5 min-h-14 text-lg font-bold text-[#234E43]">
        {course.title}
      </h3>

      <p className="mt-1 text-xs text-slate-500">
        {course.department || "Department unavailable"}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-[#F6F8F3] p-4">
        <div>
          <p className="text-xs text-slate-500">Semester</p>
          <p className="mt-1 text-sm font-semibold text-[#234E43]">
            {course.semester || "—"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Credits</p>
          <p className="mt-1 text-sm font-semibold text-[#234E43]">
            {course.credits ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">
            Approved Students
          </p>
          <p className="mt-1 text-sm font-semibold text-[#234E43]">
            {course.students === null
              ? "—"
              : course.students}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Assignments</p>
          <p className="mt-1 text-sm font-semibold text-[#234E43]">
            {course.assignments}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#234E43]">
          <CalendarDays size={17} />
          Class Schedule
        </p>

        {course.schedules.length ? (
          course.schedules.slice(0, 2).map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-[#E2EADC] px-3 py-2 text-xs text-slate-600"
            >
              <span className="font-semibold">
                {item.day}
              </span>
              {" · "}
              {formatTime(item.startTime)}
              {" – "}
              {formatTime(item.endTime)}
              <p className="mt-1">
                <MapPin size={13} className="mr-1 inline" />
                {item.room || "Room unavailable"}
                {item.section
                  ? ` · Section ${item.section}`
                  : " · Common Class"}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No HOD schedule assigned yet.
          </p>
        )}

        {course.schedules.length > 2 && (
          <p className="text-xs text-slate-500">
            +{course.schedules.length - 2} more classes
          </p>
        )}
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={() => onView(course)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white hover:bg-[#193B33]"
        >
          View Course Details
          <ArrowUpRight size={17} />
        </button>
      </div>
    </article>
  );
}

function CourseDetails({ course, onClose }) {
  if (!course) return null;

  const information = [
    ["Course Code", course.code, BookOpen],
    ["Semester", course.semester, CalendarDays],
    ["Credits", course.credits, GraduationCap],
    ["Department", course.department, Building2],
    [
      "Approved Students",
      course.students === null ? "Unavailable" : course.students,
      Users,
    ],
    ["Assignments", course.assignments, FileText],
    [
      "Graded Submissions",
      course.gradedSubmissions,
      CheckCircle2,
    ],
    [
      "Weekly Class Sessions",
      course.schedules.length,
      Clock3,
    ],
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="faculty-course-detail-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
              Assigned Course
            </p>

            <h2
              id="faculty-course-detail-title"
              className="mt-2 text-2xl font-bold text-[#234E43]"
            >
              {course.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg bg-slate-100 p-2 text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {information.map(([label, value, Icon]) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-4"
            >
              <Icon
                size={19}
                className="mt-0.5 shrink-0 text-[#234E43]"
              />
              <div>
                <p className="text-xs text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#234E43]">
                  {value ?? "—"}
                </p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-7 text-lg font-bold text-[#234E43]">
          Weekly Class Routine
        </h3>

        <div className="mt-4 space-y-3">
          {course.schedules.length ? (
            course.schedules.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#E2EADC] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-[#234E43]">
                    {item.day}
                  </p>
                  <span className="text-xs font-semibold text-[#477764]">
                    {item.section
                      ? `Section ${item.section}`
                      : "Common Class"}
                  </span>
                </div>

                <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <Clock3 size={16} />
                  {formatTime(item.startTime)}
                  {" – "}
                  {formatTime(item.endTime)}
                </p>

                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={16} />
                  {item.room || "Room unavailable"}
                </p>

                {item.academicSession && (
                  <p className="mt-2 text-xs text-slate-500">
                    Session: {item.academicSession}
                  </p>
                )}

                {item.notes && (
                  <p className="mt-3 whitespace-pre-wrap text-xs text-slate-500">
                    {item.notes}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
              HOD has not scheduled classes for this course.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 w-full rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white"
        >
          Close Details
        </button>
      </section>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function FacultyCourses() {
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [rosters, setRosters] = useState({});

  const [search, setSearch] = useState("");
  const [semester, setSemester] = useState("All");
  const [selectedCourseId, setSelectedCourseId] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // ==========================================
  // FETCH REAL FACULTY DATA
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      setWarnings([]);

      try {
        // The assigned-courses endpoint determines
        // which courses this faculty may access.
        const courseResult = await apiGet(
          "/api/assignments/faculty/courses",
          controller.signal
        );

        if (!Array.isArray(courseResult.data)) {
          throw new Error(
            "Invalid assigned course response."
          );
        }

        if (controller.signal.aborted) return;

        const assigned = courseResult.data;

        setCourses(assigned);
        setFaculty(courseResult.faculty || null);

        // Additional APIs are independent:
        // failure in one should not hide courses.
        const jobs = await Promise.allSettled([
          apiGet(
            "/api/class-schedules/faculty/my",
            controller.signal
          ),
          apiGet(
            "/api/assignments/faculty/my",
            controller.signal
          ),
          Promise.allSettled(
            assigned.map((course) =>
              apiGet(
                `/api/attendance/faculty/roster/${getId(course)}`,
                controller.signal
              )
            )
          ),
        ]);

        if (controller.signal.aborted) return;

        const nextWarnings = [];

        if (
          jobs[0].status === "fulfilled" &&
          Array.isArray(jobs[0].value.data)
        ) {
          setSchedules(jobs[0].value.data);
        } else {
          setSchedules([]);
          nextWarnings.push(
            "Class schedule could not be loaded."
          );
        }

        if (
          jobs[1].status === "fulfilled" &&
          Array.isArray(jobs[1].value.data)
        ) {
          setAssignments(jobs[1].value.data);
        } else {
          setAssignments([]);
          nextWarnings.push(
            "Assignment statistics could not be loaded."
          );
        }

        const nextRosters = {};

        if (jobs[2].status === "fulfilled") {
          const rosterResults = jobs[2].value;

          rosterResults.forEach((result, index) => {
            const id = getId(assigned[index]);

            nextRosters[id] =
              result.status === "fulfilled" &&
              Array.isArray(result.value.data)
                ? result.value.data.length
                : null;
          });

          if (
            rosterResults.some(
              (result) => result.status === "rejected"
            )
          ) {
            nextWarnings.push(
              "Some student enrollment counts are unavailable."
            );
          }
        } else {
          assigned.forEach((course) => {
            nextRosters[getId(course)] = null;
          });

          nextWarnings.push(
            "Student enrollment counts could not be loaded."
          );
        }

        setRosters(nextRosters);
        setWarnings(nextWarnings);
      } catch (err) {
        if (controller.signal.aborted) return;

        setCourses([]);
        setFaculty(null);
        setSchedules([]);
        setAssignments([]);
        setRosters({});
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

  // ==========================================
  // COMBINE RELATED MONGODB RECORDS
  // ==========================================

  const enrichedCourses = useMemo(
    () =>
      courses.map((course) => {
        const courseId = getId(course);

        const courseSchedules = schedules
          .filter(
            (item) =>
              String(item.courseId) === courseId &&
              item.status === "Active"
          )
          .sort(
            (a, b) =>
              DAYS.indexOf(a.day) -
                DAYS.indexOf(b.day) ||
              String(a.startTime).localeCompare(
                String(b.startTime)
              )
          );

        const courseAssignments = assignments.filter(
          (item) => getId(item.course) === courseId
        );

        return {
          ...course,
          id: courseId,
          status: "Active",
          students: rosters[courseId] ?? null,
          assignments: courseAssignments.length,
          gradedSubmissions: courseAssignments.reduce(
            (sum, item) => sum + Number(item.graded || 0),
            0
          ),
          schedules: courseSchedules,
        };
      }),
    [courses, schedules, assignments, rosters]
  );

  // ==========================================
  // FILTERS
  // ==========================================

  const semesters = useMemo(
    () => [
      "All",
      ...new Set(
        enrichedCourses
          .map((course) => course.semester)
          .filter(Boolean)
      ),
    ],
    [enrichedCourses]
  );

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return enrichedCourses.filter((course) => {
      const matchesSearch = [
        course.code,
        course.title,
        course.department,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      const matchesSemester =
        semester === "All" ||
        course.semester === semester;

      return matchesSearch && matchesSemester;
    });
  }, [enrichedCourses, search, semester]);

  const selectedCourse = enrichedCourses.find(
    (course) => course.id === selectedCourseId
  );

  // ==========================================
  // STATISTICS
  // ==========================================

  const totalStudents =
    enrichedCourses.some(
      (course) => course.students === null
    )
      ? "—"
      : enrichedCourses.reduce(
          (sum, course) => sum + course.students,
          0
        );

  const teachingCredits = enrichedCourses.reduce(
    (sum, course) => sum + Number(course.credits || 0),
    0
  );

  const weeklySessions = enrichedCourses.reduce(
    (sum, course) => sum + course.schedules.length,
    0
  );

  function clearFilters() {
    setSearch("");
    setSemester("All");
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Academic Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            My Courses
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Your HOD-assigned courses, approved students,
            assignments and teaching schedule.
          </p>

          {faculty && (
            <p className="mt-2 text-xs font-semibold text-[#477764]">
              {faculty.name}
              {faculty.facultyId
                ? ` · ${faculty.facultyId}`
                : ""}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setRefreshKey((value) => value + 1)
          }
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          Refresh Courses
        </button>
      </section>

      {/* ERRORS */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {warnings.length > 0 && !error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          {warnings.map((message) => (
            <p
              key={message}
              className="flex items-center gap-2 text-sm text-amber-800"
            >
              <AlertTriangle size={16} />
              {message}
            </p>
          ))}
        </div>
      )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Assigned Courses"
          value={loading ? "..." : enrichedCourses.length}
          icon={BookOpen}
          description="Active allocated courses"
        />

        <StatCard
          title="Approved Enrollments"
          value={loading ? "..." : totalStudents}
          icon={Users}
          description="Course enrollment records"
        />

        <StatCard
          title="Weekly Sessions"
          value={loading ? "..." : weeklySessions}
          icon={CalendarDays}
          description="HOD-scheduled class sessions"
        />

        <StatCard
          title="Teaching Credits"
          value={loading ? "..." : teachingCredits}
          icon={GraduationCap}
          description="Total assigned course credits"
        />
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal
            size={19}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Find Your Courses
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
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
              placeholder="Search course name or code..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={semester}
            onChange={(event) =>
              setSemester(event.target.value)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
          >
            {semesters.map((item) => (
              <option key={item} value={item}>
                {item === "All"
                  ? "All Semesters"
                  : item}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* COURSE COLLECTION */}
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              Course Collection
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredCourses.length} of{" "}
              {enrichedCourses.length} assigned courses
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-[#234E43]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#234E43]"
          >
            Reset Filters
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-14 text-sm text-slate-500">
            <Loader2
              size={20}
              className="animate-spin"
            />
            Loading assigned courses from MongoDB...
          </div>
        ) : !filteredCourses.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <BookOpen
              size={36}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Courses Found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {enrichedCourses.length === 0
                ? "No active courses are currently allocated to this Faculty account."
                : "Try another search or semester."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onView={(item) =>
                  setSelectedCourseId(item.id)
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* COURSE DETAILS */}
      <CourseDetails
        course={selectedCourse}
        onClose={() => setSelectedCourseId("")}
      />

      <p className="text-center text-xs text-slate-400">
        UniBee Faculty Courses · MongoDB
      </p>
    </div>
  );
}
