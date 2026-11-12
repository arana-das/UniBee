
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList, Plus, Search, Filter, Eye, Pencil, Trash2,
  X, Save, Download, RotateCcw, ChevronLeft, ChevronRight,
  CalendarDays, Clock3, MapPin, BookOpen, CheckCircle2,
  AlertCircle, RefreshCw,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 8;

const TYPES = [
  "Midterm", "Final", "Quiz",
  "Practical", "Viva", "Supplementary",
];

const STATUSES = [
  "Scheduled", "Completed", "Postponed", "Cancelled",
];

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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]";

function getId(item) {
  return String(item?._id || item?.id || "");
}

function getCode(course) {
  return course?.courseCode || "";
}

function getTitle(course) {
  return course?.courseTitle || "";
}

function formatDate(value) {
  if (!value) return "Not set";

  const parts = String(value).slice(0, 10).split("-");

  return parts.length === 3
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : String(value);
}

function Badge({ status }) {
  const styles = {
    Scheduled: "bg-sky-50 text-sky-700",
    Completed: "bg-emerald-50 text-emerald-700",
    Postponed: "bg-amber-50 text-amber-800",
    Cancelled: "bg-rose-50 text-rose-700",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
      styles[status] || "bg-slate-100 text-slate-600"
    }`}>
      {status || "Unknown"}
    </span>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-[#234E43]">{value}</p>
      </div>
      <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
        <Icon size={22} />
      </div>
    </div>
  );
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Login session unavailable. Please log in again.");
  }

  let response;

  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot connect to UniBee backend.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

function exportCSV(rows) {
  const headers = [
    "Exam ID", "Title", "Course", "Semester", "Type",
    "Date", "Start", "End", "Room", "Invigilator",
    "Marks", "Status",
  ];

  const safe = (value) => {
    let str = String(value ?? "");

    if (/^\s*[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }

    return `"${str.replace(/"/g, '""')}"`;
  };

  const csv = "\uFEFF" +
    [headers, ...rows.map((item) => [
      item.id,
      item.title,
      item.courseCode,
      item.semester,
      item.type,
      item.date,
      item.startTime,
      item.endTime,
      item.room,
      item.invigilator,
      item.marks,
      item.status,
    ])]
      .map((row) => row.map(safe).join(","))
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = "UniBee_Examinations.csv";
  link.click();

  URL.revokeObjectURL(url);
}

export default function AdminExaminations() {
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [query, setQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const [form, setForm] = useState(blankForm);

  // ========================================
  // LOAD COURSES AND EXAMINATIONS
  // ========================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [courseResult, examResult] = await Promise.all([
        apiRequest("/api/academic/courses"),
        apiRequest("/api/examinations"),
      ]);

      const courseList = Array.isArray(courseResult.data)
        ? courseResult.data
        : [];

      const examList = Array.isArray(examResult.data)
        ? examResult.data
        : [];

      setCourses(courseList);
      setExams(
        examList.map((item) => ({
          ...item,
          id: getId(item),
          courseId: item.courseId || getId(item.course),
          courseCode:
            item.course?.courseCode || item.courseCode || "",
          courseTitle:
            item.course?.courseTitle || "",
          semester:
            item.course?.semester || item.semester || "",
        }))
      );
    } catch (err) {
      setError(err.message);
      setCourses([]);
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================
  // COURSE LOOKUP
  // ========================================

  const courseById = useMemo(
    () => new Map(courses.map((item) => [getId(item), item])),
    [courses]
  );

  const selectableCourses = useMemo(
    () => courses.filter((item) => item.status === "Active"),
    [courses]
  );

  const semesters = useMemo(
    () => [...new Set(exams.map((item) => item.semester).filter(Boolean))].sort(),
    [exams]
  );

  // ========================================
  // SEARCH AND FILTER
  // ========================================

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return exams.filter((exam) => {
      const matchesSearch = [
        exam.title,
        exam.courseCode,
        exam.courseTitle,
        exam.room,
        exam.invigilator,
        exam.id,
      ].some((value) =>
        String(value || "").toLowerCase().includes(search)
      );

      return (
        matchesSearch &&
        (semesterFilter === "All" || exam.semester === semesterFilter) &&
        (typeFilter === "All" || exam.type === typeFilter) &&
        (statusFilter === "All" || exam.status === statusFilter)
      );
    });
  }, [exams, query, semesterFilter, typeFilter, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ========================================
  // FORM
  // ========================================

  function updateField(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
    setError("");
  }

  function openCreate() {
    setEditingId(null);
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
    setModalOpen(true);
  }

  // ========================================
  // CREATE / UPDATE
  // ========================================

  async function handleSave(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      const course = courseById.get(form.courseId);

      if (!course) {
        throw new Error("Select a valid active MongoDB Course.");
      }

      if (!form.title.trim() || !form.room.trim()) {
        throw new Error("Exam title and room are required.");
      }

      if (form.endTime <= form.startTime) {
        throw new Error("End time must be after start time.");
      }

      const marks = Number(form.marks);

      if (!Number.isFinite(marks) || marks < 1 || marks > 1000) {
        throw new Error("Marks must be between 1 and 1000.");
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

      if (editingId) {
        await apiRequest(`/api/examinations/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setFeedback("Examination updated successfully.");
      } else {
        await apiRequest("/api/examinations", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setFeedback("Examination saved to MongoDB successfully.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(blankForm());

      await loadData();
      setPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // DELETE
  // ========================================

  async function handleDelete(exam) {
    if (!window.confirm(`Delete examination "${exam.title}"?`)) {
      return;
    }

    setError("");
    setFeedback("");

    try {
      await apiRequest(`/api/examinations/${exam.id}`, {
        method: "DELETE",
      });

      setFeedback("Examination deleted from MongoDB.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  // ========================================
  // STATUS UPDATE
  // ========================================

  async function updateStatus(exam, nextStatus) {
    if (!window.confirm(`Change "${exam.title}" to ${nextStatus}?`)) {
      return;
    }

    setError("");
    setFeedback("");

    try {
      await apiRequest(`/api/examinations/${exam.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      setFeedback(`Examination marked ${nextStatus}.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function clearFilters() {
    setQuery("");
    setSemesterFilter("All");
    setTypeFilter("All");
    setStatusFilter("All");
    setPage(1);
  }

  const formCourse = courseById.get(form.courseId);

  const courseOptions = formCourse &&
    !selectableCourses.some((item) => getId(item) === form.courseId)
    ? [formCourse, ...selectableCourses]
    : selectableCourses;

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-7">

      {/* HEADER */}

      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Academic Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Examination Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Schedule exams, allocate rooms and manage examinations.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            onClick={openCreate}
            disabled={loading || !!error && !courses.length || !selectableCourses.length}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Plus size={18} />
            Schedule Exam
          </button>
        </div>
      </section>

      {/* FEEDBACK */}

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={17} className="mr-2 inline" />
          {error}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={17} className="mr-2 inline" />
          {feedback}
        </div>
      )}

      {loading && (
        <div className="rounded-xl bg-[#F1F7EF] p-4 text-sm text-[#234E43]">
          Loading examinations from MongoDB...
        </div>
      )}

      {!loading && !selectableCourses.length && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          No active courses found. Create an active course first.
        </div>
      )}

      {/* STATISTICS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total Examinations"
          value={exams.length}
          icon={ClipboardList}
        />

        <Stat
          label="Scheduled"
          value={exams.filter((e) => e.status === "Scheduled").length}
          icon={CalendarDays}
        />

        <Stat
          label="Completed"
          value={exams.filter((e) => e.status === "Completed").length}
          icon={CheckCircle2}
        />

        <Stat
          label="Postponed"
          value={exams.filter((e) => e.status === "Postponed").length}
          icon={AlertCircle}
        />
      </section>

      {/* FILTERS */}

      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-[#234E43]">
          <Filter size={19} />
          <h2 className="font-bold">Search & Filter Examinations</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search examinations..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={semesterFilter}
            onChange={(e) => {
              setSemesterFilter(e.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="All">All Semesters</option>
            {semesters.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="All">All Exam Types</option>
            {TYPES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="All">All Statuses</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {filtered.length} matching records
          </p>

          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
            >
              <RotateCcw size={15} />
              Clear Filters
            </button>

            <button
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* EXAMINATION TABLE */}

      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Examination",
                  "Course",
                  "Date & Time",
                  "Room",
                  "Invigilator",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-4">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visible.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[#234E43]">
                      {exam.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {exam.type}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-xs font-bold text-[#B18A28]">
                      {exam.courseCode}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {exam.semester}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {formatDate(exam.date)}
                    <p className="text-xs text-slate-400">
                      {exam.startTime} – {exam.endTime}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {exam.room}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {exam.invigilator || "Unassigned"}
                  </td>

                  <td className="px-5 py-4">
                    <Badge status={exam.status} />
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        title="View"
                        onClick={() => setViewing(exam)}
                        className="rounded-lg bg-slate-100 p-2"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        title="Edit"
                        onClick={() => openEdit(exam)}
                        className="rounded-lg bg-emerald-50 p-2"
                      >
                        <Pencil size={17} />
                      </button>

                      {exam.status === "Scheduled" && (
                        <button
                          title="Mark Completed"
                          onClick={() => updateStatus(exam, "Completed")}
                          className="rounded-lg bg-emerald-50 p-2 text-emerald-700"
                        >
                          <CheckCircle2 size={17} />
                        </button>
                      )}

                      <button
                        title="Delete"
                        onClick={() => handleDelete(exam)}
                        className="rounded-lg bg-rose-50 p-2 text-rose-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && !visible.length && (
            <div className="py-14 text-center text-sm text-slate-500">
              No examination records found.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* CREATE / EDIT MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#234E43]">
                {editingId ? "Edit Examination" : "Schedule Examination"}
              </h2>

              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">
                  Exam Title *
                </span>

                <input
                  required
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className={inputClass}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">
                    Course *
                  </span>

                  <select
                    required
                    value={form.courseId}
                    onChange={(e) => updateField("courseId", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select Course</option>

                    {courseOptions.map((course) => (
                      <option key={getId(course)} value={getId(course)}>
                        {getCode(course)} — {getTitle(course)} ({course.semester})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">
                    Semester
                  </span>

                  <input
                    readOnly
                    value={formCourse?.semester || ""}
                    className={`${inputClass} bg-slate-50`}
                    placeholder="Select a course"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">
                    Exam Type
                  </span>

                  <select
                    value={form.type}
                    onChange={(e) => updateField("type", e.target.value)}
                    className={inputClass}
                  >
                    {TYPES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">
                    Status
                  </span>

                  <select
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                    className={inputClass}
                  >
                    {STATUSES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                {[
                  ["Exam Date", "date", "date"],
                  ["Room", "room", "text"],
                  ["Start Time", "startTime", "time"],
                  ["End Time", "endTime", "time"],
                  ["Invigilator", "invigilator", "text"],
                  ["Total Marks", "marks", "number"],
                ].map(([label, key, type]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-sm font-semibold">
                      {label}
                    </span>

                    <input
                      type={type}
                      required={key !== "invigilator"}
                      min={key === "marks" ? 1 : undefined}
                      max={key === "marks" ? 1000 : undefined}
                      value={form[key]}
                      onChange={(e) => updateField(key, e.target.value)}
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold">
                  Instructions
                </span>

                <textarea
                  rows={3}
                  maxLength={1500}
                  value={form.instructions}
                  onChange={(e) => updateField("instructions", e.target.value)}
                  className={inputClass}
                />
              </label>

              {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                <Save size={18} />
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Schedule Exam"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* DETAILS MODAL */}

      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between gap-3">
              <h2 className="text-xl font-bold text-[#234E43]">
                {viewing.title}
              </h2>

              <button
                onClick={() => setViewing(null)}
                aria-label="Close details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-4">
              <Badge status={viewing.status} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Course", viewing.courseCode, BookOpen],
                ["Semester", viewing.semester, CalendarDays],
                ["Type", viewing.type, ClipboardList],
                ["Date", formatDate(viewing.date), CalendarDays],
                ["Time", `${viewing.startTime} – ${viewing.endTime}`, Clock3],
                ["Room", viewing.room, MapPin],
                ["Invigilator", viewing.invigilator || "Unassigned", Eye],
                ["Marks", viewing.marks, CheckCircle2],
                ["Instructions", viewing.instructions || "None", ClipboardList],
              ].map(([label, value, Icon]) => (
                <div key={label} className="rounded-xl bg-[#F6F8F3] p-3">
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Icon size={15} />
                    {label}
                  </p>

                  <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setViewing(null)}
              className="mt-5 w-full rounded-xl bg-[#234E43] py-3 font-semibold text-white"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        UniBee Admin Examinations · MongoDB Connected
      </p>
    </div>
  );
}
