
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Building2,
  CalendarDays,
  UserRound,
  RefreshCw,
  Users,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ========================================
// CONFIGURATION
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 8;

const EMPTY_FORM = {
  courseCode: "",
  courseTitle: "",
  department: "",
  credits: "3",
  semester: "Fall 2026",
  description: "",
  status: "Active",
};

// ========================================
// API HELPER
// ========================================

async function academicRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in with your Admin account.");
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}/api/academic${path}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      }
    );
  } catch {
    throw new Error(
      "Cannot connect to UniBee backend. Check port 5000."
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
        `Academic request failed (${response.status}).`
    );
  }

  return result.data ?? result;
}

// ========================================
// DATA HELPERS
// ========================================

const cleanText = (value) => String(value ?? "").trim();

function recordId(record) {
  return String(record?._id || record?.id || "");
}

function facultyName(course) {
  if (!course?.faculty) return "Unassigned";

  if (typeof course.faculty === "object") {
    return (
      course.faculty.name ||
      course.faculty.fullName ||
      course.faculty.facultyId ||
      "Assigned Faculty"
    );
  }

  return "Assigned Faculty";
}

function enrollmentCount(course) {
  return Array.isArray(course.enrolledStudents)
    ? course.enrolledStudents.length
    : 0;
}

function downloadCSV(courses) {
  const rows = [
    [
      "Course Code",
      "Course Title",
      "Department",
      "Semester",
      "Credits",
      "Assigned Faculty",
      "Enrolled Students",
      "Status",
      "Description",
    ],
    ...courses.map((course) => [
      course.courseCode,
      course.courseTitle,
      course.department,
      course.semester,
      course.credits,
      facultyName(course),
      enrollmentCount(course),
      course.status,
      course.description,
    ]),
  ];

  const safeCell = (value) => {
    let text = cleanText(value);

    if (/^[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv =
    "\uFEFF" +
    rows
      .map((row) => row.map(safeCell).join(","))
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "UniBee_Courses.csv";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ========================================
// REUSABLE UI COMPONENTS
// ========================================

function StatusBadge({ status }) {
  const active = status === "Active";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold text-[#234E43]">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {detail}
      </p>
    </article>
  );
}

function FormInput({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder = "",
  min,
  max,
  step,
  disabled = false,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43] disabled:opacity-50"
      />
    </label>
  );
}

// ========================================
// MAIN PAGE
// ========================================

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // ======================================
  // LOAD REAL MONGODB RECORDS
  // ======================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [courseData, departmentData] = await Promise.all([
        academicRequest("/courses"),
        academicRequest("/departments"),
      ]);

      if (!Array.isArray(courseData)) {
        throw new Error("Invalid Course API response.");
      }

      if (!Array.isArray(departmentData)) {
        throw new Error("Invalid Department API response.");
      }

      setCourses(courseData);
      setDepartments(departmentData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ======================================
  // DEPARTMENT / SEMESTER OPTIONS
  // ======================================

  const activeDepartments = useMemo(
    () =>
      departments
        .filter((item) => item.status === "Active")
        .map((item) => item.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [departments]
  );

  const allDepartments = useMemo(
    () =>
      [
        ...new Set([
          ...departments.map((item) => item.name),
          ...courses.map((item) => item.department),
        ]),
      ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [departments, courses]
  );

  const semesters = useMemo(
    () =>
      [
        ...new Set(
          courses.map((item) => item.semester).filter(Boolean)
        ),
      ].sort(),
    [courses]
  );

  // ======================================
  // FILTERING
  // ======================================

  const filteredCourses = useMemo(() => {
    const search = query.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesSearch = [
        course.courseCode,
        course.courseTitle,
        course.department,
        facultyName(course),
      ].some((value) =>
        cleanText(value).toLowerCase().includes(search)
      );

      return (
        matchesSearch &&
        (departmentFilter === "All" ||
          course.department === departmentFilter) &&
        (semesterFilter === "All" ||
          course.semester === semesterFilter) &&
        (statusFilter === "All" ||
          course.status === statusFilter)
      );
    });
  }, [
    courses,
    query,
    departmentFilter,
    semesterFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCourses.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleCourses = filteredCourses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activeCount = courses.filter(
    (course) => course.status === "Active"
  ).length;

  const allocatedCount = courses.filter(
    (course) => Boolean(course.faculty)
  ).length;

  const totalEnrollments = courses.reduce(
    (sum, course) => sum + enrollmentCount(course),
    0
  );

  function clearFilters() {
    setQuery("");
    setDepartmentFilter("All");
    setSemesterFilter("All");
    setStatusFilter("All");
    setPage(1);
  }

  // ======================================
  // FORM ACTIONS
  // ======================================

  function updateField(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
    setError("");
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      department: activeDepartments[0] || "",
    });
    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(course) {
    setEditingId(recordId(course));

    setForm({
      courseCode: course.courseCode || "",
      courseTitle: course.courseTitle || "",
      department: course.department || "",
      credits: String(course.credits ?? 3),
      semester: course.semester || "",
      description: course.description || "",
      status: course.status || "Active",
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function closeModal() {
    if (busy) return;
    setModalOpen(false);
    setEditingId(null);
    setError("");
  }

  // ======================================
  // CREATE / UPDATE COURSE
  // ======================================

  async function handleSave(event) {
    event.preventDefault();

    if (busy) return;

    const clean = {
      courseCode: cleanText(form.courseCode).toUpperCase(),
      courseTitle: cleanText(form.courseTitle),
      department: cleanText(form.department),
      credits: Number(form.credits),
      semester: cleanText(form.semester),
      description: cleanText(form.description),
      status: form.status,
    };

    if (
      !clean.courseCode ||
      !clean.courseTitle ||
      !clean.department ||
      !clean.semester
    ) {
      setError("Complete all required course fields.");
      return;
    }

    if (
      !Number.isFinite(clean.credits) ||
      clean.credits < 0 ||
      clean.credits > 10
    ) {
      setError("Credits must be between 0 and 10.");
      return;
    }

    if (!activeDepartments.includes(clean.department)) {
      setError(
        "Select an active department from MongoDB."
      );
      return;
    }

    const duplicate = courses.some(
      (course) =>
        recordId(course) !== editingId &&
        cleanText(course.courseCode).toUpperCase() ===
          clean.courseCode
    );

    if (duplicate) {
      setError(
        "This course code already exists. Course codes must be unique."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (editingId) {
        await academicRequest(
          `/courses/${encodeURIComponent(editingId)}`,
          {
            method: "PUT",
            body: JSON.stringify(clean),
          }
        );
      } else {
        await academicRequest("/courses", {
          method: "POST",
          body: JSON.stringify(clean),
        });
      }

      const message = editingId
        ? "Course updated in MongoDB successfully."
        : "Course created in MongoDB successfully.";

      setModalOpen(false);
      setEditingId(null);
      setPage(1);

      await loadData();

      setFeedback(message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  // ======================================
  // DELETE COURSE
  // ======================================

  async function handleDelete(course) {
    const id = recordId(course);

    if (!id || busy) return;

    const confirmed = window.confirm(
      `Delete ${course.courseCode} — ${course.courseTitle}?\n\nCourses with enrolled students cannot be deleted.`
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setFeedback("");

    try {
      await academicRequest(
        `/courses/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      await loadData();

      setFeedback(
        "Course deleted from MongoDB successfully."
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Academic Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Course Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage real courses and review HOD faculty
            allocations from MongoDB.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading || busy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-40"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={
              loading ||
              busy ||
              !activeDepartments.length
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Plus size={18} />
            Add Course
          </button>
        </div>
      </section>

      {/* ALERTS */}
      {feedback && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </p>
      )}

      {error && !modalOpen && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </p>
      )}

      {!loading && !activeDepartments.length && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No active departments found. Create a department
          in Admin Department Management first.
        </p>
      )}

      {/* STATS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Courses"
          value={loading ? "—" : courses.length}
          detail="MongoDB course records"
          icon={BookOpen}
        />

        <MetricCard
          label="Active Courses"
          value={loading ? "—" : activeCount}
          detail="Currently active courses"
          icon={CheckCircle2}
        />

        <MetricCard
          label="Assigned Courses"
          value={loading ? "—" : allocatedCount}
          detail="Courses with assigned faculty"
          icon={Users}
        />

        <MetricCard
          label="Student Enrollments"
          value={loading ? "—" : totalEnrollments}
          detail="Actual course enrollment references"
          icon={GraduationCap}
        />
      </section>

      {/* SEARCH AND FILTER */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={19} className="text-[#234E43]" />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Courses
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
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search code, title or instructor..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(event) => {
              setDepartmentFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by department"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Departments</option>

            {allDepartments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={(event) => {
              setSemesterFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by semester"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Semesters</option>

            {semesters.map((item) => (
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
            aria-label="Filter by status"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {filteredCourses.length} matching courses
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              <RotateCcw size={15} />
              Clear Filters
            </button>

            <button
              type="button"
              onClick={() => downloadCSV(filteredCourses)}
              disabled={!filteredCourses.length}
              className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43] disabled:opacity-40"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* COURSE TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Course",
                  "Department",
                  "Semester",
                  "Credits",
                  "Instructor",
                  "Enrollments",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4 font-semibold"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleCourses.map((course) => (
                <tr
                  key={recordId(course)}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="text-xs font-bold text-[#B18A28]">
                      {course.courseCode}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#234E43]">
                      {course.courseTitle}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-600">
                    {course.department}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {course.semester}
                  </td>

                  <td className="px-5 py-4 text-sm font-semibold text-[#234E43]">
                    {course.credits}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {facultyName(course)}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {enrollmentCount(course)}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={course.status} />
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        title="View Course"
                        onClick={() => setViewing(course)}
                        className="rounded-lg bg-slate-100 p-2 text-[#234E43]"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        title="Edit Course"
                        onClick={() => openEdit(course)}
                        className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43]"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        title="Delete Course"
                        disabled={busy}
                        onClick={() => handleDelete(course)}
                        className="rounded-lg bg-rose-50 p-2 text-rose-600 disabled:opacity-40"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && visibleCourses.length === 0 && (
            <div className="py-14 text-center text-sm text-slate-500">
              No course records found.
            </div>
          )}

          {loading && (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading courses from MongoDB...
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} ·{" "}
            {filteredCourses.length} course records
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2
                id="course-form-title"
                className="text-xl font-bold text-[#234E43]"
              >
                {editingId ? "Edit Course" : "Add New Course"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                disabled={busy}
                aria-label="Close form"
                className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="Course Code *"
                  value={form.courseCode}
                  required
                  disabled={busy}
                  placeholder="CSE 321"
                  onChange={(event) =>
                    updateField(
                      "courseCode",
                      event.target.value
                    )
                  }
                />

                <FormInput
                  label="Course Title *"
                  value={form.courseTitle}
                  required
                  disabled={busy}
                  placeholder="Database Management Systems"
                  onChange={(event) =>
                    updateField(
                      "courseTitle",
                      event.target.value
                    )
                  }
                />

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Department *
                  </span>

                  <select
                    value={form.department}
                    required
                    disabled={busy}
                    onChange={(event) =>
                      updateField(
                        "department",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">
                      Select Department
                    </option>

                    {[
                      ...new Set([
                        ...activeDepartments,
                        ...(form.department &&
                        !activeDepartments.includes(form.department)
                          ? [form.department]
                          : []),
                      ]),
                    ].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <FormInput
                  label="Semester *"
                  value={form.semester}
                  required
                  disabled={busy}
                  placeholder="Fall 2026"
                  onChange={(event) =>
                    updateField(
                      "semester",
                      event.target.value
                    )
                  }
                />

                <FormInput
                  label="Credit Hours *"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={form.credits}
                  required
                  disabled={busy}
                  onChange={(event) =>
                    updateField(
                      "credits",
                      event.target.value
                    )
                  }
                />

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Course Status
                  </span>

                  <select
                    value={form.status}
                    disabled={busy}
                    onChange={(event) =>
                      updateField(
                        "status",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Course Description
                </span>

                <textarea
                  rows={4}
                  maxLength={1800}
                  value={form.description}
                  disabled={busy}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Course overview and learning content..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
                />
              </label>

              <div className="rounded-xl bg-[#F6F8F3] p-4 text-xs leading-6 text-[#607B6C]">
                Faculty allocation is managed by HOD.
                Existing faculty assignments and student
                enrollments will not be overwritten
                when editing course details.
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? (
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={18} />
                )}

                {busy
                  ? "Saving to MongoDB..."
                  : editingId
                    ? "Save Changes"
                    : "Create Course"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* DETAILS MODAL */}
      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-details-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18A28]">
                  Academic Course
                </p>

                <h2
                  id="course-details-title"
                  className="mt-2 text-xl font-bold text-[#234E43]"
                >
                  {viewing.courseTitle}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {viewing.courseCode}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close details"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-4">
              <StatusBadge status={viewing.status} />
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-600">
              {viewing.description ||
                "No course description provided."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Department", viewing.department, Building2],
                ["Semester", viewing.semester, CalendarDays],
                ["Credits", viewing.credits, BookOpen],
                ["Assigned Faculty", facultyName(viewing), UserRound],
                ["Enrolled Students", enrollmentCount(viewing), GraduationCap],
              ].map(([label, value, Icon]) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-4"
                >
                  <Icon
                    size={18}
                    className="mt-0.5 shrink-0 text-[#234E43]"
                  />

                  <div>
                    <p className="text-xs text-slate-500">
                      {label}
                    </p>

                    <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
                      {String(value ?? "—")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setViewing(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        UniBee Admin Courses · Live MongoDB Academic Management
      </p>
    </div>
  );
}
