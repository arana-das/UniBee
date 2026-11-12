
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Clock3,
  Building2,
  Users,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Download,
  RefreshCw,
  Search,
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Database,
  Loader2,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ========================================
// UNIBEE HOD CLASS SCHEDULE
// REAL MONGODB INTEGRATION
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const BASE = `${API_BASE}/api/class-schedules`;

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  courseId: "",
  facultyId: "",
  day: "Sunday",
  startTime: "09:00",
  endTime: "10:30",
  room: "",
  section: "",
  academicSession: "",
  notes: "",
};

// ========================================
// API HELPER
// ========================================

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to your HOD account."
    );
  }

  const {
    method = "GET",
    body,
    signal,
  } = options;

  let response;

  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      signal,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(body !== undefined
        ? { body: JSON.stringify(body) }
        : {}),
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
    const message =
      result?.message ||
      `Request failed (${response.status}).`;

    const error = new Error(message);

    error.conflicts = Array.isArray(
      result?.conflicts
    )
      ? result.conflicts
      : [];

    throw error;
  }

  return result;
}

// ========================================
// HELPERS
// ========================================

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return String(value.id || value._id || "");
}

function formatTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value || "")) {
    return value || "—";
  }

  const [hours, minutes] = value
    .split(":")
    .map(Number);

  const hour = hours % 12 || 12;
  const period = hours >= 12 ? "PM" : "AM";

  return `${hour}:${String(minutes).padStart(
    2,
    "0"
  )} ${period}`;
}

function toMinutes(time) {
  if (!/^\d{2}:\d{2}$/.test(time || "")) {
    return 0;
  }

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function getFacultyName(faculty, id) {
  return (
    faculty.find((item) => getId(item) === id)
      ?.name || "Faculty unavailable"
  );
}

function csvCell(value) {
  let text = String(value ?? "");

  if (/^\s*[=+\-@\t\r]/.test(text)) {
    text = "'" + text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function exportCSV(filename, rows) {
  const content =
    "\uFEFF" +
    rows
      .map((row) =>
        row.map(csvCell).join(",")
      )
      .join("\r\n");

  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// ========================================
// STAT CARD
// ========================================

function StatCard({
  title,
  count,
  icon: Icon,
  subtitle,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#718579]">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {count}
          </h3>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-3 text-xs text-[#718579]">
        {subtitle}
      </p>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function HODSchedule() {
  const [department, setDepartment] =
    useState(null);

  const [courses, setCourses] =
    useState([]);

  const [faculty, setFaculty] =
    useState([]);

  const [schedules, setSchedules] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [feedback, setFeedback] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [search, setSearch] =
    useState("");

  const [dayFilter, setDayFilter] =
    useState("All");

  const [page, setPage] =
    useState(1);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState("");

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [modalError, setModalError] =
    useState("");

  const [conflicts, setConflicts] =
    useState([]);

  // ========================================
  // LOAD MONGODB DATA
  // ========================================

  const refresh = useCallback(() => {
    setRefreshKey((previous) => previous + 1);
  }, []);

  const loadSchedules = useCallback(async () => {
    const result = await apiRequest("/hod/my");

    if (!Array.isArray(result.data)) {
      throw new Error(
        "Invalid schedule response."
      );
    }

    setSchedules(result.data);

    return result.data;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [
          bootstrap,
          scheduleResult,
        ] = await Promise.all([
          apiRequest("/hod/bootstrap", {
            signal: controller.signal,
          }),

          apiRequest("/hod/my", {
            signal: controller.signal,
          }),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        if (
          !bootstrap.department ||
          !Array.isArray(bootstrap.courses) ||
          !Array.isArray(bootstrap.faculty) ||
          !Array.isArray(scheduleResult.data)
        ) {
          throw new Error(
            "Invalid HOD schedule data received."
          );
        }

        setDepartment(bootstrap.department);
        setCourses(bootstrap.courses);
        setFaculty(bootstrap.faculty);
        setSchedules(scheduleResult.data);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setDepartment(null);
        setCourses([]);
        setFaculty([]);
        setSchedules([]);

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
  // COURSE ALLOCATION
  // ========================================

  const courseMap = useMemo(
    () =>
      new Map(
        courses.map((item) => [
          getId(item),
          item,
        ])
      ),
    [courses]
  );

  const selectedCourse = courseMap.get(
    form.courseId
  );

  // Backend Course Allocation determines
  // which faculty teaches each course.

  const allocatedFacultyId =
    selectedCourse?.facultyId || "";

  const allocatedFaculty = faculty.find(
    (item) =>
      getId(item) === allocatedFacultyId
  );

  const allocatedCourses = useMemo(
    () =>
      courses.filter(
        (course) =>
          course.facultyId &&
          faculty.some(
            (member) =>
              getId(member) ===
              course.facultyId
          )
      ),
    [courses, faculty]
  );

  // ========================================
  // FILTERS
  // ========================================

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return schedules
      .filter((item) => {
        const matchesDay =
          dayFilter === "All" ||
          item.day === dayFilter;

        const matchesSearch = [
          item.courseCode,
          item.courseTitle,
          item.facultyName,
          item.room,
          item.section,
          item.semester,
          item.academicSession,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

        return (
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
    schedules,
    dayFilter,
    search,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(
    page,
    totalPages
  );

  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ========================================
  // STATISTICS
  // ========================================

  const workingDays = new Set(
    schedules
      .filter((item) => item.status === "Active")
      .map((item) => item.day)
  ).size;

  const scheduledCourses = new Set(
    schedules
      .filter((item) => item.status === "Active")
      .map((item) => item.courseId)
  ).size;

  const scheduledFaculty = new Set(
    schedules
      .filter((item) => item.status === "Active")
      .map((item) => item.facultyId)
  ).size;

  const activeClasses = schedules.filter(
    (item) => item.status === "Active"
  );

  const stats = [
    {
      title: "Scheduled Classes",
      count: loading
        ? "..."
        : activeClasses.length,
      subtitle: "Active weekly class entries",
      icon: CalendarDays,
    },
    {
      title: "Scheduled Courses",
      count: loading
        ? "..."
        : scheduledCourses,
      subtitle: "Distinct scheduled courses",
      icon: BookOpen,
    },
    {
      title: "Teaching Faculty",
      count: loading
        ? "..."
        : scheduledFaculty,
      subtitle: "Distinct faculty members",
      icon: Users,
    },
    {
      title: "Teaching Days",
      count: loading
        ? "..."
        : workingDays,
      subtitle: "Days with scheduled classes",
      icon: Clock3,
    },
  ];

  // ========================================
  // OPEN CREATE FORM
  // ========================================

  function openAdd() {
    if (!allocatedCourses.length) {
      setError(
        "No allocated courses found. Complete HOD Course Allocation first."
      );
      return;
    }

    setEditingId("");

    setForm({
      ...EMPTY_FORM,
    });

    setModalError("");
    setConflicts([]);
    setFeedback("");
    setError("");

    setModalOpen(true);
  }

  // ========================================
  // OPEN EDIT FORM
  // ========================================

  function openEdit(item) {
    setEditingId(getId(item));

    setForm({
      courseId: item.courseId,
      facultyId: item.facultyId,
      day: item.day,
      startTime: item.startTime,
      endTime: item.endTime,
      room: item.room || "",
      section: item.section || "",
      academicSession:
        item.academicSession || "",
      notes: item.notes || "",
    });

    setModalError("");
    setConflicts([]);
    setFeedback("");
    setError("");

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId("");
    setModalError("");
    setConflicts([]);
  }

  function updateForm(field, value) {
    setForm((previous) => {
      const next = {
        ...previous,
        [field]: value,
      };

      if (field === "courseId") {
        next.facultyId =
          courseMap.get(value)?.facultyId ||
          "";
      }

      return next;
    });

    setModalError("");
    setConflicts([]);
  }

  // ========================================
  // SAVE CLASS SCHEDULE
  // ========================================

  async function handleSave(event) {
    event.preventDefault();

    if (saving) return;

    if (!selectedCourse) {
      setModalError(
        "Select a valid allocated course."
      );
      return;
    }

    if (
      !allocatedFaculty ||
      form.facultyId !== allocatedFacultyId
    ) {
      setModalError(
        "The selected course has no valid allocated faculty."
      );
      return;
    }

    if (
      !DAYS.includes(form.day) ||
      !/^\d{2}:\d{2}$/.test(form.startTime) ||
      !/^\d{2}:\d{2}$/.test(form.endTime) ||
      toMinutes(form.startTime) >=
        toMinutes(form.endTime)
    ) {
      setModalError(
        "Choose a valid day and class time."
      );
      return;
    }

    if (
      !form.room.trim() ||
      !form.academicSession.trim()
    ) {
      setModalError(
        "Room and Academic Session are required."
      );
      return;
    }

    setSaving(true);
    setModalError("");
    setConflicts([]);
    setError("");

    try {
      const body = {
        courseId: form.courseId,
        facultyId: allocatedFacultyId,
        day: form.day,
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room.trim(),
        section: form.section.trim(),
        academicSession:
          form.academicSession.trim(),
        notes: form.notes.trim(),
      };

      const result = editingId
        ? await apiRequest(
            `/hod/${editingId}`,
            {
              method: "PUT",
              body,
            }
          )
        : await apiRequest("/hod", {
            method: "POST",
            body,
          });

      await loadSchedules();

      setFeedback(
        result.message ||
        "Class schedule saved successfully."
      );

      closeModalAfterSave();
    } catch (err) {
      setModalError(err.message);
      setConflicts(err.conflicts || []);
    } finally {
      setSaving(false);
    }
  }

  function closeModalAfterSave() {
    setModalOpen(false);
    setEditingId("");
    setModalError("");
    setConflicts([]);
  }

  // ========================================
  // DELETE CLASS SCHEDULE
  // ========================================

  async function deleteSchedule(item) {
    if (saving) return;

    const confirmed = window.confirm(
      `Delete the ${item.day} class for "${item.courseTitle}"?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      const result = await apiRequest(
        `/hod/${getId(item)}`,
        {
          method: "DELETE",
        }
      );

      await loadSchedules();

      setFeedback(
        result.message ||
        "Class schedule deleted."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // CSV EXPORT
  // ========================================

  function downloadReport() {
    const rows = [
      [
        "Day",
        "Start",
        "End",
        "Course Code",
        "Course Title",
        "Faculty",
        "Room",
        "Semester",
        "Section",
        "Academic Session",
        "Status",
      ],
      ...filtered.map((item) => [
        item.day,
        item.startTime,
        item.endTime,
        item.courseCode,
        item.courseTitle,
        item.facultyName,
        item.room,
        item.semester,
        item.section,
        item.academicSession,
        item.status,
      ]),
    ];

    exportCSV(
      "UniBee_HOD_Class_Schedule.csv",
      rows
    );

    setFeedback(
      "Class schedule exported successfully."
    );
  }

  // ========================================
  // UI
  // ========================================

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            ACADEMIC MANAGEMENT
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Class Schedule
          </h1>

          <p className="mt-2 text-sm text-[#718579]">
            Manage department classes and
            prevent faculty, classroom,
            and section conflicts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading || saving}
            className="flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
          >
            <RefreshCw
              size={17}
              className={
                loading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={downloadReport}
            disabled={loading || !schedules.length}
            className="flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={openAdd}
            disabled={
              loading ||
              saving ||
              !allocatedCourses.length
            }
            className="flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            <Plus size={18} />
            Add Class
          </button>
        </div>
      </section>

      {/* ACTIVE DEPARTMENT */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
            <Building2 size={22} />
          </div>

          <div>
            <h2 className="font-bold text-[#234E43]">
              Active Department
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Verified from your HOD account.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-5 py-3 text-sm font-semibold text-[#234E43]">
          {loading
            ? "Loading..."
            : department
            ? `${department.name} (${department.code})`
            : "Department unavailable"}
        </div>
      </section>

      {/* FEEDBACK */}
      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {!loading &&
        department &&
        !allocatedCourses.length && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Database
              size={19}
              className="shrink-0"
            />

            <p>
              No allocated courses are available.
              Complete HOD Course Allocation
              before creating class schedules.
            </p>
          </div>
        )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
          />
        ))}
      </section>

      {/* WEEKLY FILTER */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#234E43]">
          Weekly Routine
        </h2>

        <p className="mt-1 text-xs text-[#718579]">
          Filter classes by day or view the entire week.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {["All", ...DAYS].map((day) => (
            <button
              type="button"
              key={day}
              onClick={() => {
                setDayFilter(day);
                setPage(1);
              }}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold ${
                dayFilter === day
                  ? "bg-[#234E43] text-white"
                  : "bg-[#F6F8F3] text-[#607B6C]"
              }`}
            >
              {day === "All"
                ? "Entire Week"
                : day}
            </button>
          ))}
        </div>
      </section>

      {/* SCHEDULE TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#E2EADC] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <h2 className="text-lg font-bold text-[#234E43]">
            Department Class Routine
          </h2>

          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search routine..."
              className="w-full rounded-xl border border-[#E2EADC] py-3 pl-10 pr-4 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-14 text-sm text-[#718579]">
            <Loader2
              size={20}
              className="animate-spin"
            />
            Loading department schedule...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
                <tr>
                  {[
                    "Day",
                    "Time",
                    "Course",
                    "Faculty",
                    "Room",
                    "Section",
                    "Action",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#EDF1EB]">
                {pageRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[#F9FBF8]"
                  >
                    <td className="px-5 py-4 text-sm font-bold text-[#234E43]">
                      {row.day}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {formatTime(row.startTime)}
                      {" – "}
                      {formatTime(row.endTime)}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-[#234E43]">
                        {row.courseTitle}
                      </p>

                      <p className="mt-1 text-xs text-[#718579]">
                        {row.courseCode}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {row.facultyName}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      <span className="flex items-center gap-2">
                        <MapPin size={15} />
                        {row.room}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {row.section || "Common"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            openEdit(row)
                          }
                          aria-label="Edit class"
                          title="Edit class"
                          className="rounded-lg bg-sky-50 p-2 text-sky-700 disabled:opacity-40"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            deleteSchedule(row)
                          }
                          aria-label="Delete class"
                          title="Delete class"
                          className="rounded-lg bg-rose-50 p-2 text-rose-700 disabled:opacity-40"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!pageRows.length && (
              <div className="py-14 text-center">
                <CalendarDays
                  size={38}
                  className="mx-auto text-[#A6C1A4]"
                />

                <p className="mt-4 font-bold text-[#234E43]">
                  No Classes Found
                </p>

                <p className="mt-2 text-sm text-[#718579]">
                  Add a class or adjust the filters.
                </p>
              </div>
            )}
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex items-center justify-between gap-3 border-t border-[#EDF1EB] p-5">
          <p className="text-xs text-[#718579]">
            Page {currentPage} of {totalPages}
            {" · "}
            {filtered.length} entries
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() =>
                setPage(currentPage - 1)
              }
              aria-label="Previous page"
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setPage(currentPage + 1)
              }
              aria-label="Next page"
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* MONGODB STATUS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Database
            size={20}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            MongoDB Class Schedule
          </h2>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#718579]">
          Class schedules are saved in MongoDB.
          Faculty can view their scheduled classes
          from the Faculty Portal. Student Routine
          integration will use the same database.
        </p>
      </section>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="hod-schedule-title"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#E2EADC] p-5">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  CLASS SCHEDULING
                </p>

                <h2
                  id="hod-schedule-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {editingId
                    ? "Edit Class Schedule"
                    : "Add Class Schedule"}
                </h2>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={closeModal}
                aria-label="Close form"
                className="rounded-xl p-2 hover:bg-[#F6F8F3] disabled:opacity-40"
              >
                <X size={21} />
              </button>
            </div>

            <form
              id="hod-schedule-form"
              onSubmit={handleSave}
              className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2"
            >
              {/* COURSE */}
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-[#234E43]">
                  Allocated Course *
                </span>

                <select
                  required
                  value={form.courseId}
                  onChange={(event) =>
                    updateForm(
                      "courseId",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                >
                  <option value="">
                    Select Course
                  </option>

                  {allocatedCourses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.code} — {course.title}
                    </option>
                  ))}
                </select>
              </label>

              {/* FACULTY */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-bold text-[#234E43]">
                  Allocated Faculty
                </label>

                <div className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] p-3 text-sm text-[#45685B]">
                  {allocatedFaculty
                    ? `${allocatedFaculty.name} (${allocatedFaculty.facultyId || "Faculty"})`
                    : "Select an allocated course first."}
                </div>

                <p className="mt-1 text-xs text-[#718579]">
                  Faculty is determined by HOD Course Allocation.
                </p>
              </div>

              {/* DAY */}
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#234E43]">
                  Day *
                </span>

                <select
                  value={form.day}
                  onChange={(event) =>
                    updateForm(
                      "day",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>

              {/* ROOM */}
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#234E43]">
                  Room *
                </span>

                <input
                  required
                  maxLength={80}
                  value={form.room}
                  onChange={(event) =>
                    updateForm(
                      "room",
                      event.target.value
                    )
                  }
                  placeholder="Room 302"
                  className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                />
              </label>

              {/* START */}
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#234E43]">
                  Start Time *
                </span>

                <input
                  required
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    updateForm(
                      "startTime",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                />
              </label>

              {/* END */}
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#234E43]">
                  End Time *
                </span>

                <input
                  required
                  type="time"
                  value={form.endTime}
                  onChange={(event) =>
                    updateForm(
                      "endTime",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                />
              </label>

              {/* SEMESTER */}
              <div>
                <label className="mb-2 block text-sm font-bold text-[#234E43]">
                  Semester
                </label>

                <div className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] p-3 text-sm text-[#45685B]">
                  {selectedCourse?.semester ||
                    "Select a course"}
                </div>
              </div>

              {/* SECTION */}
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#234E43]">
                  Section
                </span>

                <input
                  maxLength={60}
                  value={form.section}
                  onChange={(event) =>
                    updateForm(
                      "section",
                      event.target.value
                    )
                  }
                  placeholder="Leave blank for common class"
                  className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                />
              </label>

              {/* SESSION */}
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-[#234E43]">
                  Academic Session *
                </span>

                <input
                  required
                  maxLength={80}
                  value={form.academicSession}
                  onChange={(event) =>
                    updateForm(
                      "academicSession",
                      event.target.value
                    )
                  }
                  placeholder="Example: 2026-2027"
                  className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                />
              </label>

              {/* NOTES */}
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-[#234E43]">
                  Notes
                </span>

                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.notes}
                  onChange={(event) =>
                    updateForm(
                      "notes",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                />
              </label>

              {/* CONFLICTS */}
              {conflicts.length > 0 && (
                <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 sm:col-span-2">
                  <p className="flex items-center gap-2 font-bold">
                    <AlertTriangle size={18} />
                    Scheduling Conflict Detected
                  </p>

                  {conflicts.map((item, index) => (
                    <p
                      key={item.id || index}
                      className="mt-2 text-xs"
                    >
                      {item.reasons?.join(", ") ||
                        "Conflict"}
                      {" — "}
                      {item.day},{" "}
                      {item.startTime}–
                      {item.endTime}
                      {" · "}
                      {item.room}
                    </p>
                  ))}
                </div>
              )}

              {/* VALIDATION */}
              {modalError && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 sm:col-span-2"
                >
                  {modalError}
                </p>
              )}
            </form>

            <div className="flex justify-end gap-3 border-t border-[#E2EADC] p-5">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-[#E2EADC] px-5 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="hod-schedule-form"
                disabled={saving || !allocatedFaculty}
                className="flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
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
                  : editingId
                  ? "Save Changes"
                  : "Save Schedule"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* FOOTER */}
      <p className="text-center text-xs text-[#8AA092]">
        UniBee Head of Department Portal
        {" · "}
        MongoDB Class Schedule
      </p>
    </div>
  );
}
