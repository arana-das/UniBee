
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ClipboardCheck,
  Users,
  UserCheck,
  UserX,
  Clock3,
  ShieldCheck,
  Search,
  CalendarDays,
  BookOpen,
  Save,
  RotateCcw,
  CheckCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ========================================
// UNIBEE FACULTY ATTENDANCE
// MONGODB CONNECTED
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const ATTENDANCE_API = `${API_BASE}/api/attendance`;

const STATUS_OPTIONS = [
  { value: "Present", label: "Present" },
  { value: "Absent", label: "Absent" },
  { value: "Late", label: "Late" },
  { value: "Excused", label: "Excused" },
];

const STATUS_STYLES = {
  Present:
    "border-emerald-500 bg-emerald-50 text-emerald-700",
  Absent:
    "border-rose-500 bg-rose-50 text-rose-700",
  Late:
    "border-amber-500 bg-amber-50 text-amber-800",
  Excused:
    "border-sky-500 bg-sky-50 text-sky-700",
};

// ========================================
// HELPERS
// ========================================

function localDateString(date = new Date()) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return String(value._id || value.id || "");
}

function getInitials(name) {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ========================================
// API HELPER
// ========================================

async function attendanceRequest(
  path,
  options = {}
) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Your Faculty login session is unavailable. Please log in again."
    );
  }

  const {
    signal,
    method = "GET",
    body,
  } = options;

  let response;

  try {
    response = await fetch(
      `${ATTENDANCE_API}${path}`,
      {
        method,
        signal,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
        },
        ...(body
          ? {
              body: JSON.stringify(body),
            }
          : {}),
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
    result.success === false
  ) {
    throw new Error(
      result?.message ||
      `Attendance request failed (${response.status}).`
    );
  }

  return result;
}

// ========================================
// STAT CARD
// ========================================

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  detail,
}) {
  return (
    <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <h3 className="mt-3 text-3xl font-bold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className={`rounded-xl p-3 ${accent}`}>
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {detail}
      </p>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function FacultyAttendance() {
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState(null);

  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState(localDateString);
  const [search, setSearch] = useState("");

  const [students, setStudents] = useState([]);
  const [draft, setDraft] = useState({});

  const [savedStatuses, setSavedStatuses] =
    useState({});

  const [savedRecord, setSavedRecord] =
    useState(null);

  const [loadingCourses, setLoadingCourses] =
    useState(true);

  const [loadingRoster, setLoadingRoster] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  const requestIdRef = useRef(0);

  const selectedCourse = courses.find(
    (course) => course.id === courseId
  );

  // ========================================
  // LOAD FACULTY ASSIGNED COURSES
  // ========================================

  const loadCourses = useCallback(
    async (signal) => {
      const result = await attendanceRequest(
        "/faculty/courses",
        { signal }
      );

      const records = Array.isArray(result.data)
        ? result.data
        : [];

      return {
        faculty: result.faculty || null,
        courses: records.map((course) => ({
          id: getId(course),
          code: course.code || "",
          title: course.title || "Untitled Course",
          semester: course.semester || "",
          department: course.department || "",
          credits: course.credits ?? null,
        })),
      };
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoadingCourses(true);
      setError("");

      try {
        const result = await loadCourses(
          controller.signal
        );

        if (controller.signal.aborted) return;

        setCourses(result.courses);
        setFaculty(result.faculty);

        setCourseId((previous) => {
          if (
            result.courses.some(
              (course) => course.id === previous
            )
          ) {
            return previous;
          }

          return result.courses[0]?.id || "";
        });
      } catch (err) {
        if (controller.signal.aborted) return;

        setCourses([]);
        setFaculty(null);
        setCourseId("");
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCourses(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [loadCourses, refreshKey]);

  // ========================================
  // LOAD STUDENT ROSTER + SAVED ATTENDANCE
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    const requestId = ++requestIdRef.current;

    setStudents([]);
    setDraft({});
    setSavedStatuses({});
    setSavedRecord(null);
    setMessage("");
    setSearch("");

    if (!courseId || !date) {
      setLoadingRoster(false);
      return () => controller.abort();
    }

    async function loadAttendance() {
      setLoadingRoster(true);
      setError("");

      try {
        const [rosterResponse, recordResponse] =
          await Promise.all([
            attendanceRequest(
              `/faculty/roster/${encodeURIComponent(
                courseId
              )}`,
              {
                signal: controller.signal,
              }
            ),

            attendanceRequest(
              `/faculty/records?courseId=${encodeURIComponent(
                courseId
              )}&date=${encodeURIComponent(date)}`,
              {
                signal: controller.signal,
              }
            ),
          ]);

        if (
          controller.signal.aborted ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        const roster = Array.isArray(
          rosterResponse.data
        )
          ? rosterResponse.data
          : [];

        const normalizedStudents = roster.map(
          (student) => ({
            id: getId(student),
            studentId: student.studentId || "",
            name: student.name || "Student",
            email: student.email || "",
          })
        );

        const existing = recordResponse.data;

        const existingStatuses = {};

        if (
          existing &&
          Array.isArray(existing.students)
        ) {
          existing.students.forEach((entry) => {
            const id = String(
              entry.studentId || ""
            );

            if (id) {
              existingStatuses[id] = entry.status;
            }
          });
        }

        setStudents(normalizedStudents);
        setDraft(existingStatuses);
        setSavedStatuses(existingStatuses);
        setSavedRecord(existing || null);
      } catch (err) {
        if (
          controller.signal.aborted ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setError(err.message);
      } finally {
        if (
          !controller.signal.aborted &&
          requestId === requestIdRef.current
        ) {
          setLoadingRoster(false);
        }
      }
    }

    loadAttendance();

    return () => controller.abort();
  }, [courseId, date, refreshKey]);

  // ========================================
  // STUDENT ROWS
  // ========================================

  const studentRows = useMemo(
    () =>
      students.map((student) => ({
        ...student,
        status: draft[student.id] || "",
      })),
    [students, draft]
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return studentRows.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.studentId.toLowerCase().includes(query)
    );
  }, [studentRows, search]);

  // ========================================
  // ATTENDANCE COUNTS
  // ========================================

  const counts = useMemo(() => {
    const result = {
      Present: 0,
      Absent: 0,
      Late: 0,
      Excused: 0,
      Unmarked: 0,
    };

    studentRows.forEach((student) => {
      if (
        Object.prototype.hasOwnProperty.call(
          result,
          student.status
        )
      ) {
        result[student.status]++;
      } else {
        result.Unmarked++;
      }
    });

    return result;
  }, [studentRows]);

  const total = students.length;
  const marked = total - counts.Unmarked;

  const attendanceRate =
    total > 0
      ? Math.round(
          ((counts.Present + counts.Late) /
            total) *
            100
        )
      : 0;

  // Compare draft against the
  // actual MongoDB-loaded statuses.
  const hasChanges = useMemo(
    () =>
      students.some(
        (student) =>
          (draft[student.id] || "") !==
          (savedStatuses[student.id] || "")
      ),
    [students, draft, savedStatuses]
  );

  const canEdit =
    Boolean(selectedCourse) &&
    !loadingCourses &&
    !loadingRoster &&
    !saving &&
    !error &&
    total > 0;

  // ========================================
  // MARK ONE STUDENT
  // ========================================

  function markStudent(studentId, status) {
    if (!canEdit) return;

    setDraft((previous) => ({
      ...previous,
      [studentId]: status,
    }));

    setMessage("");
  }

  // ========================================
  // MARK ALL STUDENTS
  // ========================================

  function markAll(status) {
    if (!canEdit) return;

    const updated = {};

    students.forEach((student) => {
      updated[student.id] = status;
    });

    setDraft(updated);
    setMessage("");
  }

  // ========================================
  // RESET UNSAVED CHANGES
  // ========================================

  function resetDraft() {
    if (loadingRoster || saving) return;

    setDraft({ ...savedStatuses });
    setMessage("");
  }

  // ========================================
  // SAVE ATTENDANCE TO MONGODB
  // ========================================

  async function saveAttendance() {
    if (!canEdit) return;

    if (counts.Unmarked > 0) {
      setError(
        `Please mark all ${counts.Unmarked} remaining students.`
      );
      return;
    }

    if (!hasChanges && savedRecord) {
      setMessage(
        "Attendance is already saved. No changes to update."
      );
      return;
    }

    const currentCourseId = courseId;
    const currentDate = date;
    const requestId = requestIdRef.current;

    const entries = students.map((student) => ({
      studentId: student.id,
      status: draft[student.id],
    }));

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await attendanceRequest(
        "/faculty/records",
        {
          method: "PUT",
          body: {
            courseId: currentCourseId,
            semester: selectedCourse.semester,
            date: currentDate,
            students: entries,
          },
        }
      );

      // Ignore response for a class/date
      // the user is no longer viewing.
      if (
        requestId !== requestIdRef.current
      ) {
        return;
      }

      const saved = result.data;

      const nextStatuses = {};

      (saved?.students || []).forEach(
        (entry) => {
          nextStatuses[entry.studentId] =
            entry.status;
        }
      );

      setDraft(nextStatuses);
      setSavedStatuses(nextStatuses);
      setSavedRecord(saved || null);

      setMessage(
        result.message ||
          "Attendance saved successfully in MongoDB."
      );
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // CHANGE COURSE / DATE SAFELY
  // ========================================

  function confirmLeaveChanges() {
    if (!hasChanges) return true;

    return window.confirm(
      "You have unsaved attendance changes. Discard them?"
    );
  }

  function handleCourseChange(value) {
    if (saving || loadingRoster) return;
    if (value === courseId) return;
    if (!confirmLeaveChanges()) return;

    setCourseId(value);
  }

  function handleDateChange(value) {
    if (saving || loadingRoster) return;
    if (value === date) return;
    if (!confirmLeaveChanges()) return;

    setDate(value);
  }

  function refresh() {
    if (
      loadingCourses ||
      loadingRoster ||
      saving
    ) {
      return;
    }

    if (!confirmLeaveChanges()) return;

    setError("");
    setMessage("");

    setRefreshKey((previous) => previous + 1);
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-7">

      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Academic Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Attendance Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Record, review, and update student attendance
            by assigned course and class date.
          </p>

          {faculty && (
            <p className="mt-2 text-sm font-medium text-[#477764]">
              {faculty.name}
              {faculty.facultyId
                ? ` · ${faculty.facultyId}`
                : ""}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-[#A6C1A4]/25 px-4 py-3 text-sm font-semibold text-[#234E43]">
            <ClipboardCheck size={19} />
            Faculty Attendance
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={
              loadingCourses ||
              loadingRoster ||
              saving
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw
              size={17}
              className={
                loadingCourses || loadingRoster
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>
        </div>
      </section>

      {/* ERRORS */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle
            size={20}
            className="shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS */}
      {message && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={20} />
          {message}
        </div>
      )}

      {/* COURSE AND DATE FILTER */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <BookOpen
            size={20}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Class Selection
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="attendance-course"
              className="mb-2 block text-sm font-semibold text-slate-600"
            >
              Assigned Course
            </label>

            <select
              id="attendance-course"
              value={courseId}
              onChange={(event) =>
                handleCourseChange(event.target.value)
              }
              disabled={
                loadingCourses ||
                loadingRoster ||
                saving ||
                courses.length === 0
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43] disabled:opacity-50"
            >
              {courses.length === 0 && (
                <option value="">
                  No assigned courses
                </option>
              )}

              {courses.map((course) => (
                <option
                  key={course.id}
                  value={course.id}
                >
                  {course.code} — {course.title}
                  {course.semester
                    ? ` (${course.semester})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="attendance-date"
              className="mb-2 block text-sm font-semibold text-slate-600"
            >
              Class Date
            </label>

            <div className="relative">
              <CalendarDays
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="attendance-date"
                type="date"
                value={date}
                max={localDateString()}
                onChange={(event) =>
                  handleDateChange(event.target.value)
                }
                disabled={
                  !courseId ||
                  loadingRoster ||
                  saving
                }
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43] disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {loadingRoster ? (
            <span className="inline-flex items-center gap-2 text-slate-500">
              <Loader2
                size={15}
                className="animate-spin"
              />
              Loading attendance...
            </span>
          ) : savedRecord ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
              <CheckCircle2 size={15} />
              Saved in MongoDB
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600">
              <AlertCircle size={15} />
              No saved record for this date
            </span>
          )}

          {hasChanges && (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-700">
              Unsaved changes
            </span>
          )}

          {savedRecord?.savedAt && (
            <span className="text-slate-400">
              Last saved:{" "}
              {formatDate(savedRecord.savedAt)}
            </span>
          )}
        </div>
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Students"
          value={loadingRoster ? "..." : total}
          icon={Users}
          accent="bg-[#A6C1A4]/25 text-[#234E43]"
          detail={`${marked} of ${total} marked`}
        />

        <StatCard
          label="Present"
          value={counts.Present}
          icon={UserCheck}
          accent="bg-emerald-50 text-emerald-700"
          detail="Marked present"
        />

        <StatCard
          label="Absent"
          value={counts.Absent}
          icon={UserX}
          accent="bg-rose-50 text-rose-700"
          detail="Marked absent"
        />

        <StatCard
          label="Late"
          value={counts.Late}
          icon={Clock3}
          accent="bg-amber-50 text-amber-700"
          detail="Late arrivals"
        />

        <StatCard
          label="Excused"
          value={counts.Excused}
          icon={ShieldCheck}
          accent="bg-sky-50 text-sky-700"
          detail="Excused absences"
        />
      </section>

      {/* ATTENDANCE OVERVIEW */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-[#234E43]">
              Attendance Overview
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Present and Late are counted as attended.
            </p>
          </div>

          <span className="text-2xl font-bold text-[#234E43]">
            {total > 0
              ? `${attendanceRate}%`
              : "—"}
          </span>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#D9A536] transition-all"
            style={{
              width: `${attendanceRate}%`,
            }}
          />
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {counts.Unmarked} students remaining to be marked
        </p>
      </section>

      {/* ATTENDANCE TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#234E43]">
                Student Attendance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {selectedCourse
                  ? `${selectedCourse.code} · ${selectedCourse.semester}`
                  : "Select an assigned course"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => markAll("Present")}
                disabled={!canEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
              >
                <CheckCheck size={16} />
                Mark All Present
              </button>

              <button
                type="button"
                onClick={() => markAll("Absent")}
                disabled={!canEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
              >
                <UserX size={16} />
                Mark All Absent
              </button>
            </div>
          </div>

          <div className="relative mt-5">
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
              placeholder="Search student name or ID..."
              aria-label="Search students"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingCourses || loadingRoster ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
              <Loader2
                size={21}
                className="animate-spin"
              />
              Loading students from MongoDB...
            </div>
          ) : !courseId ? (
            <div className="px-6 py-16 text-center">
              <BookOpen
                size={40}
                className="mx-auto text-[#A6C1A4]"
              />

              <h3 className="mt-4 font-bold text-[#234E43]">
                No Assigned Courses
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Attendance courses will appear after your
                Faculty account is linked and Admin or HOD
                assigns a course to you.
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users
                size={40}
                className="mx-auto text-[#A6C1A4]"
              />

              <h3 className="mt-4 font-bold text-[#234E43]">
                No Approved Students
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                No active students with Approved enrollment
                were found for this course and semester.
              </p>
            </div>
          ) : (
            <>
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-[#F6F8F3]">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4 font-semibold">
                      Student
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Student ID
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Attendance Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A6C1A4]/25 text-sm font-bold text-[#234E43]">
                            {getInitials(student.name)}
                          </div>

                          <span className="text-sm font-semibold text-[#234E43]">
                            {student.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {student.studentId || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {STATUS_OPTIONS.map((option) => {
                            const selected =
                              student.status ===
                              option.value;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                disabled={!canEdit}
                                aria-pressed={selected}
                                onClick={() =>
                                  markStudent(
                                    student.id,
                                    option.value
                                  )
                                }
                                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                  selected
                                    ? STATUS_STYLES[
                                        option.value
                                      ]
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredStudents.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-slate-500">
                  No students match your search.
                </div>
              )}
            </>
          )}
        </div>

        {/* SAVE ACTIONS */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-[#F6F8F3] p-5">
          <div>
            <p className="text-sm font-semibold text-[#234E43]">
              {marked}/{total} Students Marked
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Complete all attendance statuses before saving.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetDraft}
              disabled={
                !hasChanges ||
                loadingRoster ||
                saving
              }
              className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-5 py-3 text-sm font-semibold text-[#234E43] hover:bg-slate-50 disabled:opacity-40"
            >
              <RotateCcw size={17} />
              Reset Changes
            </button>

            <button
              type="button"
              onClick={saveAttendance}
              disabled={
                !canEdit ||
                counts.Unmarked > 0 ||
                (!hasChanges && Boolean(savedRecord))
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save size={17} />
              )}

              {saving
                ? "Saving..."
                : savedRecord
                ? "Update Attendance"
                : "Save Attendance"}
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <p className="text-center text-xs text-slate-400">
        UniBee Faculty Attendance · MongoDB Connected
      </p>
    </div>
  );
}
