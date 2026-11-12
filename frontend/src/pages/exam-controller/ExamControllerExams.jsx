
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock3,
  MapPin,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Filter,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ==================================================
// UNIBEE EXAM CONTROLLER - EXAM MANAGEMENT
// Real MongoDB Examination CRUD
// ==================================================

const API = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 8;

const TYPES = [
  "Midterm",
  "Final",
  "Quiz",
  "Practical",
  "Viva",
  "Supplementary",
];

const STATUSES = [
  "Scheduled",
  "Completed",
  "Postponed",
  "Cancelled",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]";

const blankForm = () => ({
  title: "",
  courseId: "",
  type: "Final",
  date: "",
  startTime: "09:00",
  endTime: "12:00",
  room: "",
  invigilator: "",
  marks: 100,
  status: "Scheduled",
  instructions: "",
});

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || "");
}

function formatDate(value) {
  if (!value) return "—";
  const parts = String(value).slice(0, 10).split("-");
  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : String(value);
}

function formatTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value || "")) {
    return value || "—";
  }

  const [hour, minute] = value.split(":").map(Number);

  return `${hour % 12 || 12}:${String(minute).padStart(
    2,
    "0"
  )} ${hour >= 12 ? "PM" : "AM"}`;
}

function normalizeExam(item) {
  return {
    ...item,
    id: getId(item),
    courseId: item.courseId || getId(item.course),
    courseCode:
      item.course?.courseCode || item.courseCode || "",
    courseTitle: item.course?.courseTitle || "",
    semester:
      item.course?.semester || item.semester || "",
  };
}

// ==================================================
// API HELPER
// ==================================================

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in to Exam Controller.");
  }

  let response;

  try {
    response = await fetch(`${API}${path}`, {
      method: options.method || "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    });
  } catch {
    throw new Error("Cannot connect to UniBee backend.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.message ||
      `Request failed (${response.status}).`
    );
  }

  return result;
}

// ==================================================
// CSV EXPORT
// ==================================================

function exportCSV(rows) {
  const columns = [
    "Exam ID",
    "Title",
    "Course Code",
    "Course Title",
    "Semester",
    "Type",
    "Date",
    "Start Time",
    "End Time",
    "Room",
    "Invigilator",
    "Marks",
    "Status",
  ];

  const safe = (value) => {
    let str = String(value ?? "");

    // Prevent CSV formula injection
    if (/^\s*[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }

    return `"${str.replace(/"/g, '""')}"`;
  };

  const data = rows.map((exam) => [
    exam.id,
    exam.title,
    exam.courseCode,
    exam.courseTitle,
    exam.semester,
    exam.type,
    exam.date,
    exam.startTime,
    exam.endTime,
    exam.room,
    exam.invigilator,
    exam.marks,
    exam.status,
  ]);

  const csv =
    "\uFEFF" +
    [columns, ...data]
      .map((row) => row.map(safe).join(","))
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "UniBee_Exam_Controller_Examinations.csv";
  anchor.click();

  URL.revokeObjectURL(url);
}

// ==================================================
// SMALL COMPONENTS
// ==================================================

function StatusBadge({ status }) {
  const colors = {
    Scheduled: "bg-sky-50 text-sky-700",
    Completed: "bg-emerald-50 text-emerald-700",
    Postponed: "bg-amber-50 text-amber-800",
    Cancelled: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        colors[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function Stat({ title, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-slate-500">
          {title}
        </p>
        <h3 className="mt-2 text-3xl font-bold text-[#234E43]">
          {value}
        </h3>
      </div>

      <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
        <Icon size={22} />
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

// ==================================================
// MAIN PAGE
// ==================================================

export default function ExamControllerExams() {
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [viewing, setViewing] = useState(null);

  const [form, setForm] = useState(blankForm);

  // ==========================================
  // LOAD REAL MONGODB DATA
  // ==========================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      apiRequest("/api/academic/courses"),
      apiRequest("/api/examinations"),
    ]);

    if (
      results[0].status === "fulfilled" &&
      Array.isArray(results[0].value.data)
    ) {
      setCourses(results[0].value.data);
    } else {
      setCourses([]);
      setError(
        "Course data could not load. Check Academic API permissions."
      );
    }

    if (
      results[1].status === "fulfilled" &&
      Array.isArray(results[1].value.data)
    ) {
      setExams(
        results[1].value.data.map(normalizeExam)
      );
    } else {
      setExams([]);
      const message =
        results[1].reason?.message ||
        "Examinations API unavailable.";

      setError((previous) =>
        previous
          ? `${previous} ${message}`
          : message
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================
  // COURSE LOOKUP
  // ==========================================

  const courseMap = useMemo(
    () =>
      new Map(
        courses.map((course) => [
          getId(course),
          course,
        ])
      ),
    [courses]
  );

  const activeCourses = useMemo(
    () =>
      courses.filter(
        (course) => course.status === "Active"
      ),
    [courses]
  );

  const semesters = useMemo(
    () =>
      [
        ...new Set(
          exams
            .map((exam) => exam.semester)
            .filter(Boolean)
        ),
      ].sort(),
    [exams]
  );

  // ==========================================
  // SEARCH / FILTER / PAGINATION
  // ==========================================

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return exams.filter((exam) => {
      const matchesSearch = [
        exam.title,
        exam.courseCode,
        exam.courseTitle,
        exam.room,
        exam.invigilator,
        exam.id,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      return (
        matchesSearch &&
        (semesterFilter === "All" ||
          exam.semester === semesterFilter) &&
        (typeFilter === "All" ||
          exam.type === typeFilter) &&
        (statusFilter === "All" ||
          exam.status === statusFilter)
      );
    });
  }, [
    exams,
    search,
    semesterFilter,
    typeFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(
    page,
    totalPages
  );

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ==========================================
  // STATISTICS
  // ==========================================

  const stats = [
    {
      title: "Total Examinations",
      value: exams.length,
      icon: ClipboardList,
    },
    {
      title: "Scheduled",
      value: exams.filter(
        (item) => item.status === "Scheduled"
      ).length,
      icon: CalendarDays,
    },
    {
      title: "Completed",
      value: exams.filter(
        (item) => item.status === "Completed"
      ).length,
      icon: CheckCircle2,
    },
    {
      title: "Postponed",
      value: exams.filter(
        (item) => item.status === "Postponed"
      ).length,
      icon: Clock3,
    },
  ];

  // ==========================================
  // FORM ACTIONS
  // ==========================================

  function updateField(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openCreate() {
    setEditingId("");
    setForm(blankForm());
    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(exam) {
    setEditingId(exam.id);

    setForm({
      title: exam.title || "",
      courseId: exam.courseId || "",
      type: exam.type || "Final",
      date: exam.date || "",
      startTime: exam.startTime || "09:00",
      endTime: exam.endTime || "12:00",
      room: exam.room || "",
      invigilator: exam.invigilator || "",
      marks: exam.marks ?? 100,
      status: exam.status || "Scheduled",
      instructions: exam.instructions || "",
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setFeedback("");

    const selectedCourse = courseMap.get(
      form.courseId
    );

    if (!selectedCourse) {
      setError("Select an existing MongoDB course.");
      return;
    }

    if (
      !form.title.trim() ||
      !form.date ||
      !form.room.trim()
    ) {
      setError(
        "Title, date and room are required."
      );
      return;
    }

    if (form.endTime <= form.startTime) {
      setError(
        "End time must be after start time."
      );
      return;
    }

    const marks = Number(form.marks);

    if (
      !Number.isFinite(marks) ||
      marks < 1 ||
      marks > 1000
    ) {
      setError(
        "Total marks must be between 1 and 1000."
      );
      return;
    }

    const payload = {
      title: form.title.trim(),
      courseId: form.courseId,
      type: form.type,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      room: form.room.trim().toUpperCase(),
      invigilator: form.invigilator.trim(),
      marks,
      status: form.status,
      instructions: form.instructions.trim(),
    };

    setSaving(true);

    try {
      if (editingId) {
        await apiRequest(
          `/api/examinations/${editingId}`,
          {
            method: "PUT",
            body: payload,
          }
        );

        setFeedback(
          "Examination updated successfully in MongoDB."
        );
      } else {
        await apiRequest(
          "/api/examinations",
          {
            method: "POST",
            body: payload,
          }
        );

        setFeedback(
          "Examination created successfully in MongoDB."
        );
      }

      setModalOpen(false);
      setEditingId("");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(exam) {
    if (
      !window.confirm(
        `Delete "${exam.title}" permanently?\n\nThis cannot be undone. Check that no published results depend on this examination.`
      )
    ) {
      return;
    }

    setDeletingId(exam.id);
    setError("");
    setFeedback("");

    try {
      await apiRequest(
        `/api/examinations/${exam.id}`,
        { method: "DELETE" }
      );

      setFeedback(
        "Examination deleted successfully."
      );

      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId("");
    }
  }

  function resetFilters() {
    setSearch("");
    setSemesterFilter("All");
    setTypeFilter("All");
    setStatusFilter("All");
    setPage(1);
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Exam Controller Portal
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Examination Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage university examinations using
            the existing MongoDB academic records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-50"
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
            onClick={openCreate}
            disabled={loading || !activeCourses.length}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus size={18} />
            Create Examination
          </button>
        </div>
      </section>

      {/* NOTIFICATIONS */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle
            size={19}
            className="shrink-0"
          />
          <p>{error}</p>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={19} />
          {feedback}
        </div>
      )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Stat key={stat.title} {...stat} />
          );
        })}
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={19} className="text-[#234E43]" />
          <h2 className="font-bold text-[#234E43]">
            Search & Filter Examinations
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              placeholder="Search examinations..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={semesterFilter}
            onChange={(event) => {
              setSemesterFilter(event.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="All">
              All Semesters
            </option>

            {semesters.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="All">
              All Exam Types
            </option>

            {TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="All">
              All Statuses
            </option>

            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#234E43]"
          >
            <RotateCcw size={16} />
            Reset Filters
          </button>

          <button
            type="button"
            onClick={() => exportCSV(filtered)}
            disabled={!filtered.length}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#234E43] disabled:opacity-50"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </section>

      {/* EXAMINATION TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-[#234E43]">
              Examination Records
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Showing {visible.length} of{" "}
              {filtered.length} records
            </p>
          </div>

          <span className="text-xs font-semibold text-[#477764]">
            MongoDB Connected
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-14 text-sm text-slate-500">
            <Loader2
              size={20}
              className="animate-spin"
            />
            Loading examinations...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <ClipboardList
              size={38}
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 font-bold text-[#234E43]">
              No Examinations Found
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Create a new examination or change
              your search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#F6F8F3] text-xs uppercase text-[#607B6C]">
                <tr>
                  <th className="px-5 py-4">
                    Examination
                  </th>
                  <th className="px-5 py-4">
                    Course
                  </th>
                  <th className="px-5 py-4">
                    Type
                  </th>
                  <th className="px-5 py-4">
                    Date & Time
                  </th>
                  <th className="px-5 py-4">
                    Room
                  </th>
                  <th className="px-5 py-4">
                    Status
                  </th>
                  <th className="px-5 py-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visible.map((exam) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-[#FBFCFA]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#234E43]">
                        {exam.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {exam.semester}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {exam.courseCode}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {exam.courseTitle}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {exam.type}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium">
                        {formatDate(exam.date)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatTime(exam.startTime)}
                        {" – "}
                        {formatTime(exam.endTime)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={15} />
                        {exam.room}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={exam.status} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          title="View examination"
                          onClick={() => setViewing(exam)}
                          className="rounded-lg bg-slate-100 p-2 text-slate-700"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          title="Edit examination"
                          onClick={() => openEdit(exam)}
                          className="rounded-lg bg-amber-50 p-2 text-amber-700"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          title="Delete examination"
                          disabled={deletingId === exam.id}
                          onClick={() => handleDelete(exam)}
                          className="rounded-lg bg-rose-50 p-2 text-rose-700 disabled:opacity-50"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  setPage(currentPage - 1)
                }
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage(currentPage + 1)
                }
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3">
          <form
            onSubmit={handleSave}
            className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
                  Examination Management
                </p>

                <h2 className="mt-2 text-xl font-bold text-[#234E43]">
                  {editingId
                    ? "Edit Examination"
                    : "Create Examination"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setError("");
                }}
                className="rounded-lg bg-slate-100 p-2"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Examination Title *">
                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) =>
                    updateField(
                      "title",
                      event.target.value
                    )
                  }
                  className={inputClass}
                  placeholder="e.g. Final Examination"
                />
              </Field>

              <Field label="Select Course *">
                <select
                  required
                  value={form.courseId}
                  onChange={(event) =>
                    updateField(
                      "courseId",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Select a course
                  </option>

                  {activeCourses.map((course) => (
                    <option
                      key={getId(course)}
                      value={getId(course)}
                    >
                      {course.courseCode}
                      {" — "}
                      {course.courseTitle}
                    </option>
                  ))}

                  {editingId &&
                    !activeCourses.some(
                      (course) =>
                        getId(course) === form.courseId
                    ) &&
                    courseMap.has(form.courseId) && (
                      <option value={form.courseId}>
                        {courseMap.get(form.courseId)
                          .courseCode}
                        {" — "}
                        {courseMap.get(form.courseId)
                          .courseTitle}
                      </option>
                    )}
                </select>
              </Field>

              <Field label="Exam Type *">
                <select
                  value={form.type}
                  onChange={(event) =>
                    updateField(
                      "type",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Exam Date *">
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    updateField(
                      "date",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Start Time *">
                <input
                  required
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    updateField(
                      "startTime",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="End Time *">
                <input
                  required
                  type="time"
                  value={form.endTime}
                  onChange={(event) =>
                    updateField(
                      "endTime",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Room *">
                <input
                  required
                  maxLength={50}
                  value={form.room}
                  onChange={(event) =>
                    updateField(
                      "room",
                      event.target.value
                    )
                  }
                  className={inputClass}
                  placeholder="e.g. EXAM-201"
                />
              </Field>

              <Field label="Invigilator">
                <input
                  maxLength={150}
                  value={form.invigilator}
                  onChange={(event) =>
                    updateField(
                      "invigilator",
                      event.target.value
                    )
                  }
                  className={inputClass}
                  placeholder="Invigilator name"
                />
              </Field>

              <Field label="Total Marks *">
                <input
                  required
                  type="number"
                  min={1}
                  max={1000}
                  value={form.marks}
                  onChange={(event) =>
                    updateField(
                      "marks",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Exam Instructions">
                  <textarea
                    rows={4}
                    maxLength={1500}
                    value={form.instructions}
                    onChange={(event) =>
                      updateField(
                        "instructions",
                        event.target.value
                      )
                    }
                    className={inputClass}
                    placeholder="Examination guidelines..."
                  />
                </Field>
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={18} />
                )}

                {saving ? "Saving..." : "Save Examination"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW DETAILS */}
      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3">
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#B18A28]">
                  EXAMINATION DETAILS
                </p>

                <h2 className="mt-2 text-xl font-bold text-[#234E43]">
                  {viewing.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg bg-slate-100 p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5">
              <StatusBadge status={viewing.status} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Course Code", viewing.courseCode],
                ["Course Title", viewing.courseTitle],
                ["Semester", viewing.semester],
                ["Type", viewing.type],
                ["Date", formatDate(viewing.date)],
                [
                  "Time",
                  `${formatTime(
                    viewing.startTime
                  )} – ${formatTime(
                    viewing.endTime
                  )}`,
                ],
                ["Room", viewing.room],
                [
                  "Invigilator",
                  viewing.invigilator || "Not assigned",
                ],
                ["Total Marks", viewing.marks],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-[#F6F8F3] p-4"
                >
                  <p className="text-xs text-slate-500">
                    {label}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#234E43]">
                    {value || "—"}
                  </p>
                </div>
              ))}
            </div>

            {viewing.instructions && (
              <div className="mt-5 rounded-xl bg-[#F6F8F3] p-4">
                <p className="font-semibold text-[#234E43]">
                  Instructions
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {viewing.instructions}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setViewing(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white"
            >
              Close
            </button>
          </section>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        UniBee Exam Controller · MongoDB Examination Management
      </p>
    </div>
  );
}
