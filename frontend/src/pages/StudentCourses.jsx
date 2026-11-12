
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  BookOpen,
  GraduationCap,
  Clock3,
  ArrowUpRight,
  SlidersHorizontal,
  Layers3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  X,
  CalendarDays,
  UserRound,
  ClipboardList,
  ArrowLeft,
} from "lucide-react";

import { getAuthToken } from "../services/authApi";
import StudentCourseMarks from "./StudentCourseMarks";

// ==========================================
// UNIBEE STUDENT COURSES
// MongoDB Enrollment + Course Marks
// ==========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const STATUS_OPTIONS = [
  "All Courses",
  "Approved",
  "Pending",
  "Rejected",
  "Dropped",
];

const COLORS = [
  "#234E43",
  "#B78B28",
  "#477764",
  "#64748B",
  "#6D8071",
  "#8C7959",
];

const text = (value, fallback = "—") => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
};

function mongoId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return "";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return text(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  const styles = {
    Approved:
      "bg-emerald-50 text-emerald-700",

    Pending:
      "bg-amber-50 text-amber-800",

    Rejected:
      "bg-rose-50 text-rose-700",

    Dropped:
      "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
        styles[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

// ==========================================
// FETCH STUDENT ENROLLMENTS
// ==========================================

async function getMyEnrollments(signal) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to your Student account."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}/api/student-enrollments/my`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
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

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
      `Unable to load courses (${response.status}).`
    );
  }

  return result;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function StudentCourses() {
  const [records, setRecords] = useState([]);
  const [student, setStudent] = useState(null);
  const [linked, setLinked] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [semester, setSemester] = useState(
    "All Semesters"
  );

  const [status, setStatus] = useState(
    "All Courses"
  );

  const [selectedCourse, setSelectedCourse] =
    useState(null);

  // Selected MongoDB Course ID for Marks.
  const [marksCourseId, setMarksCourseId] =
    useState(null);

  const [refreshKey, setRefreshKey] =
    useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(
      (previous) => previous + 1
    );
  }, []);

  // ========================================
  // LOAD DATA FROM MONGODB
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getMyEnrollments(
          controller.signal
        );

        if (controller.signal.aborted) {
          return;
        }

        setRecords(
          Array.isArray(result.data)
            ? result.data
            : []
        );

        setStudent(result.student || null);
        setLinked(result.linked === true);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setRecords([]);
        setStudent(null);
        setLinked(null);

        setError(
          requestError.message ||
          "Unable to load courses."
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
  // NORMALIZE COURSE RECORDS
  // ========================================

  const courses = useMemo(
    () =>
      records.map((record, index) => {
        const courseRecord =
          record.course &&
          typeof record.course === "object"
            ? record.course
            : {};

        // IMPORTANT:
        // record.id is the enrollment ID.
        // courseId must be the actual Course ID.
        const courseId =
          mongoId(courseRecord) ||
          mongoId(record.courseId) ||
          mongoId(record.course);

        return {
          id:
            mongoId(record) ||
            `enrollment-${index}`,

          courseId,

          code:
            courseRecord.code ||
            courseRecord.courseCode ||
            null,

          title:
            courseRecord.title ||
            courseRecord.courseTitle ||
            null,

          instructor:
            courseRecord.instructor ||
            null,

          semester:
            record.semester ||
            courseRecord.semester ||
            null,

          credits:
            courseRecord.credits ?? null,

          department:
            courseRecord.department || null,

          courseStatus:
            courseRecord.status || null,

          enrollmentStatus:
            record.status || "Unknown",

          appliedAt:
            record.appliedAt || null,

          reviewedAt:
            record.reviewedAt || null,

          notes:
            record.notes || null,

          color:
            COLORS[index % COLORS.length],
        };
      }),
    [records]
  );

  // ========================================
  // SEMESTER FILTER OPTIONS
  // ========================================

  const semesters = useMemo(
    () =>
      [
        ...new Set(
          courses
            .map((course) => course.semester)
            .filter(Boolean)
        ),
      ].sort(),
    [courses]
  );

  // ========================================
  // FILTER COURSES
  // ========================================

  const filteredCourses = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return courses.filter((course) => {
      const matchesSearch = [
        course.title,
        course.code,
        course.instructor,
        course.department,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      const matchesSemester =
        semester === "All Semesters" ||
        course.semester === semester;

      const matchesStatus =
        status === "All Courses" ||
        course.enrollmentStatus === status;

      return (
        matchesSearch &&
        matchesSemester &&
        matchesStatus
      );
    });
  }, [
    courses,
    search,
    semester,
    status,
  ]);

  // ========================================
  // STATISTICS
  // ========================================

  const approvedCount = courses.filter(
    (course) =>
      course.enrollmentStatus === "Approved"
  ).length;

  const pendingCount = courses.filter(
    (course) =>
      course.enrollmentStatus === "Pending"
  ).length;

  function clearFilters() {
    setSearch("");
    setSemester("All Semesters");
    setStatus("All Courses");
  }

  // ========================================
  // OPEN COURSE MARKS
  // ========================================

  function openMarks(course) {
    setError("");

    if (
      course.enrollmentStatus !== "Approved"
    ) {
      setError(
        "Only approved course enrollments can access assessment marks."
      );
      return;
    }

    if (!course.courseId) {
      setError(
        "Course MongoDB ID is missing from the enrollment response."
      );
      return;
    }

    // Close details modal if opened.
    setSelectedCourse(null);

    // Actual MongoDB Course ID.
    setMarksCourseId(course.courseId);
  }

  function closeMarks() {
    setMarksCourseId(null);
  }

  // ========================================
  // COURSE MARKS VIEW
  // ========================================

  if (marksCourseId) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={closeMarks}
          className="inline-flex items-center gap-2 rounded-xl border border-[#DCE8DA] bg-white px-4 py-3 text-sm font-bold text-[#234E43] hover:bg-[#F1F7EF]"
        >
          <ArrowLeft size={18} />
          Back to My Courses
        </button>

        <StudentCourseMarks
          courseId={marksCourseId}
          onBack={closeMarks}
        />
      </div>
    );
  }

  // ========================================
  // MAIN COURSES PAGE
  // ========================================

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.15em] text-[#B18B37]">
            STUDENT ACADEMICS
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            My Courses
          </h1>

          <p className="mt-3 text-[#718579]">
            View your course enrollments,
            registration status and published
            assessment marks.
          </p>

          {student && (
            <p className="mt-2 text-sm font-medium text-[#45685B]">
              {text(student.fullName)}
              {" · "}
              {text(student.studentId)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[#DCE8DA] bg-white px-4 py-2 text-sm font-semibold text-[#45685B]">
            <GraduationCap
              size={18}
              className="text-[#B78B28]"
            />
            Academic Workspace
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE8DA] bg-white px-4 py-2 text-sm font-semibold text-[#234E43] disabled:opacity-40"
          >
            <RefreshCw
              size={17}
              className={
                loading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div
          role="status"
          className="rounded-2xl bg-[#F1F7EF] p-5 text-sm text-[#234E43]"
        >
          Loading your enrollments from
          MongoDB...
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

      {/* ACCOUNT LINK WARNING */}
      {!loading &&
        !error &&
        linked === false && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            No matching Student database
            profile was found for this login
            account. Your courses will appear
            after the Student account and
            academic record are linked.
          </div>
        )}

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Total Enrollments",
            value:
              loading || error
                ? "—"
                : courses.length,
            icon: Layers3,
          },
          {
            title: "Approved Courses",
            value:
              loading || error
                ? "—"
                : approvedCount,
            icon: CheckCircle2,
          },
          {
            title: "Pending Requests",
            value:
              loading || error
                ? "—"
                : pendingCount,
            icon: Clock3,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="flex items-center gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={23} />
              </div>

              <div>
                <p className="text-sm text-[#718579]">
                  {item.title}
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-[#234E43]">
                  {item.value}
                </h2>
              </div>
            </div>
          );
        })}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by course, code, or instructor..."
              aria-label="Search courses"
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={semester}
              onChange={(event) =>
                setSemester(
                  event.target.value
                )
              }
              aria-label="Filter by semester"
              className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3.5 text-sm text-[#45685B]"
            >
              <option value="All Semesters">
                All Semesters
              </option>

              {semesters.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              aria-label="Filter by enrollment status"
              className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3.5 text-sm text-[#45685B]"
            >
              {STATUS_OPTIONS.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-5 flex items-center gap-2 text-sm text-[#718579]">
          <SlidersHorizontal size={16} />
          Showing {filteredCourses.length} of{" "}
          {courses.length} enrollments
        </p>
      </div>

      {/* COURSE CARDS */}
      {!loading &&
        !error &&
        (filteredCourses.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map(
              (course) => (
                <article
                  key={course.id}
                  className="group overflow-hidden rounded-3xl border border-[#E2EADC] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* COURSE BANNER */}
                  <div
                    className="relative flex h-36 items-center justify-between overflow-hidden p-6"
                    style={{
                      backgroundColor:
                        course.color,
                    }}
                  >
                    <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full border-[28px] border-white/10" />

                    <div className="relative z-10">
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                        {text(
                          course.department,
                          "Department unavailable"
                        )}
                      </span>

                      <p className="mt-6 text-sm font-bold tracking-wide text-white/90">
                        {text(
                          course.code,
                          "Course code unavailable"
                        )}
                      </p>
                    </div>

                    <BookOpen
                      size={43}
                      strokeWidth={1.3}
                      className="relative z-10 shrink-0 text-white/75"
                    />
                  </div>

                  {/* COURSE INFO */}
                  <div className="p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <h3 className="min-h-[56px] text-xl font-bold leading-snug text-[#234E43]">
                        {text(
                          course.title,
                          "Course details unavailable"
                        )}
                      </h3>

                      <ArrowUpRight
                        size={20}
                        className="shrink-0 text-[#9BAFA1]"
                      />
                    </div>

                    <p className="text-sm text-[#718579]">
                      Instructor:{" "}
                      <span className="font-semibold text-[#45685B]">
                        {text(
                          course.instructor,
                          "Not assigned"
                        )}
                      </span>
                    </p>

                    <div className="mt-5 flex items-center justify-between gap-3 text-xs text-[#718579]">
                      <span>
                        {text(course.semester)}
                      </span>

                      <span>
                        {text(
                          course.credits
                        )}{" "}
                        Credits
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <StatusBadge
                        status={
                          course.enrollmentStatus
                        }
                      />

                      <span className="text-xs text-[#718579]">
                        {formatDate(
                          course.appliedAt
                        )}
                      </span>
                    </div>

                    {/* COURSE ACTIONS */}
                    <div className="mt-6 space-y-3">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCourse(
                            course
                          )
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#234E43] px-4 py-3 font-semibold text-[#234E43] transition hover:bg-[#F1F7EF]"
                      >
                        View Course Details
                        <ArrowUpRight
                          size={18}
                        />
                      </button>

                      {course.enrollmentStatus ===
                        "Approved" && (
                        <button
                          type="button"
                          onClick={() =>
                            openMarks(course)
                          }
                          disabled={
                            !course.courseId
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 font-semibold text-white transition hover:bg-[#326657] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ClipboardList
                            size={18}
                          />
                          View Marks
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-[#E2EADC] bg-white px-6 py-16 text-center">
            <BookOpen
              size={40}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-5 text-xl font-bold text-[#234E43]">
              No courses found
            </h3>

            <p className="mt-2 text-[#718579]">
              {courses.length === 0
                ? "There are no enrollment records for your account."
                : "Try changing your search or filters."}
            </p>

            {courses.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-[#234E43] px-5 py-3 font-semibold text-white"
              >
                Clear Filters
              </button>
            )}
          </div>
        ))}

      {/* COURSE DETAILS MODAL */}
      {selectedCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedCourse(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-dialog-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#B18B37]">
                  {text(
                    selectedCourse.code
                  )}
                </p>

                <h2
                  id="course-dialog-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {text(
                    selectedCourse.title,
                    "Course unavailable"
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedCourse(null)
                }
                aria-label="Close course details"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-5">
              <StatusBadge
                status={
                  selectedCourse.enrollmentStatus
                }
              />
            </div>

            <div className="mt-6 space-y-4 text-sm text-[#45685B]">
              <p className="flex items-center gap-2">
                <UserRound size={17} />
                <strong>Instructor:</strong>{" "}
                {text(
                  selectedCourse.instructor,
                  "Not assigned"
                )}
              </p>

              <p className="flex items-center gap-2">
                <CalendarDays size={17} />
                <strong>Semester:</strong>{" "}
                {text(
                  selectedCourse.semester
                )}
              </p>

              <p>
                <strong>Credits:</strong>{" "}
                {text(
                  selectedCourse.credits
                )}
              </p>

              <p>
                <strong>
                  Enrollment Status:
                </strong>{" "}
                {text(
                  selectedCourse.enrollmentStatus
                )}
              </p>

              <p>
                <strong>Course Status:</strong>{" "}
                {text(
                  selectedCourse.courseStatus
                )}
              </p>

              <p>
                <strong>Applied On:</strong>{" "}
                {formatDate(
                  selectedCourse.appliedAt
                )}
              </p>

              <p>
                <strong>Reviewed On:</strong>{" "}
                {formatDate(
                  selectedCourse.reviewedAt
                )}
              </p>

              <p>
                <strong>Notes:</strong>{" "}
                {text(
                  selectedCourse.notes
                )}
              </p>
            </div>

            {/* APPROVAL STATUS */}
            {selectedCourse.enrollmentStatus ===
              "Pending" && (
              <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                Your course enrollment is
                awaiting Admin approval.
              </div>
            )}

            {selectedCourse.enrollmentStatus ===
              "Approved" && (
              <div className="mt-6 rounded-xl bg-[#F1F7EF] p-4 text-sm text-[#45685B]">
                Your enrollment has been approved.
                You can view your published
                course assessment marks.
              </div>
            )}

            {[
              "Rejected",
              "Dropped",
            ].includes(
              selectedCourse.enrollmentStatus
            ) && (
              <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <XCircle
                  size={18}
                  className="shrink-0"
                />
                This enrollment is not
                currently active.
              </div>
            )}

            {/* DETAIL MODAL ACTIONS */}
            <div className="mt-6 space-y-3">
              {selectedCourse.enrollmentStatus ===
                "Approved" && (
                <button
                  type="button"
                  disabled={
                    !selectedCourse.courseId
                  }
                  onClick={() =>
                    openMarks(
                      selectedCourse
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 font-semibold text-white hover:bg-[#326657] disabled:opacity-50"
                >
                  <ClipboardList
                    size={18}
                  />
                  View Course Marks
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setSelectedCourse(null)
                }
                className="w-full rounded-xl border border-[#DCE8DA] py-3 font-semibold text-[#234E43] hover:bg-[#F1F7EF]"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <p className="text-center text-xs text-slate-400">
        UniBee Student Courses · MongoDB
      </p>
    </div>
  );
}
