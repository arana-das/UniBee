
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  GraduationCap,
  Users,
  UserPlus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Eye,
  X,
  Save,
  Download,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Building2,
  BookOpen,
  CalendarDays,
  RotateCcw,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} from "../../services/studentApi";

// ========================================
// CONFIGURATION
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 8;

const PROGRAMS = ["BSc", "BA", "BBA", "MSc", "MA", "MBA"];

const STATUSES = ["Active", "Inactive", "Graduated"];

function initialForm() {
  return {
    studentId: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    program: "BSc",
    batch: String(new Date().getFullYear()),
    semester: "1st",
    section: "A",
    status: "Active",
    enrolledAt: new Date().toLocaleDateString("en-CA"),
  };
}

// ========================================
// HELPERS
// ========================================

const cleanText = (value) =>
  String(value ?? "").trim();

function recordId(record) {
  return String(record?._id || record?.id || "");
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function downloadCSV(students) {
  const rows = [
    [
      "Student ID",
      "Name",
      "Email",
      "Phone",
      "Department",
      "Program",
      "Batch",
      "Semester",
      "Section",
      "Status",
    ],
    ...students.map((s) => [
      s.studentId,
      s.name,
      s.email,
      s.phone,
      s.department,
      s.program,
      s.batch,
      s.semester,
      s.section,
      s.status,
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
  const link = document.createElement("a");

  link.href = url;
  link.download = "UniBee_Students.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ========================================
// DEPARTMENT API
// ========================================

async function fetchDepartments() {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in with your Admin account.");
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}/api/academic/departments`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch {
    throw new Error("Cannot connect to UniBee backend.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
        `Department request failed (${response.status}).`
    );
  }

  if (!Array.isArray(result.data)) {
    throw new Error("Invalid department data from server.");
  }

  return result.data;
}

// ========================================
// UI COMPONENTS
// ========================================

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-700",
    Inactive: "bg-rose-50 text-rose-700",
    Graduated: "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || styles.Inactive
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, detail }) {
  return (
    <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>

          <h3 className="mt-3 text-3xl font-bold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  disabled = false,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43] disabled:opacity-50"
      />
    </label>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] =
    useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // ======================================
  // LOAD DATABASE RECORDS
  // ======================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error(
          "Please log in with your Admin account."
        );
      }

      const [studentData, departmentData] =
        await Promise.all([
          getStudents(token),
          fetchDepartments(),
        ]);

      if (!Array.isArray(studentData)) {
        throw new Error(
          "Student API returned an invalid response."
        );
      }

      setStudents(studentData);
      setDepartments(departmentData);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to load student records."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ======================================
  // DEPARTMENT OPTIONS
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
          ...students.map((item) => item.department),
        ]),
      ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [departments, students]
  );

  // ======================================
  // SEARCH & FILTER
  // ======================================

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();

    return students.filter((student) => {
      const matchesSearch = [
        student.name,
        student.studentId,
        student.email,
        student.program,
      ].some((value) =>
        cleanText(value).toLowerCase().includes(q)
      );

      return (
        matchesSearch &&
        (departmentFilter === "All" ||
          student.department === departmentFilter) &&
        (statusFilter === "All" ||
          student.status === statusFilter)
      );
    });
  }, [
    students,
    query,
    departmentFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activeCount = students.filter(
    (s) => s.status === "Active"
  ).length;

  const graduatedCount = students.filter(
    (s) => s.status === "Graduated"
  ).length;

  const inactiveCount = students.filter(
    (s) => s.status === "Inactive"
  ).length;

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
      ...initialForm(),
      department: activeDepartments[0] || "",
    });

    setError("");
    setFeedback("");
    setModal(true);
  }

  function openEdit(student) {
    setEditingId(recordId(student));

    setForm({
      studentId: student.studentId || "",
      name: student.name || "",
      email: student.email || "",
      phone: student.phone || "",
      department: student.department || "",
      program: student.program || "BSc",
      batch: student.batch || "",
      semester: student.semester || "",
      section: student.section || "",
      status: student.status || "Active",
      enrolledAt: formatDate(student.enrolledAt),
    });

    setError("");
    setFeedback("");
    setModal(true);
  }

  function closeModal() {
    if (saving) return;

    setModal(false);
    setEditingId(null);
    setError("");
  }

  // ======================================
  // CREATE / UPDATE
  // ======================================

  async function handleSave(event) {
    event.preventDefault();
    if (saving) return;

    const data = {
      studentId: cleanText(form.studentId).toUpperCase(),
      name: cleanText(form.name),
      email: cleanText(form.email).toLowerCase(),
      phone: cleanText(form.phone),
      department: cleanText(form.department),
      program: cleanText(form.program),
      batch: cleanText(form.batch),
      semester: cleanText(form.semester),
      section: cleanText(form.section),
      status: form.status,
      enrolledAt: form.enrolledAt,
    };

    if (
      !data.studentId ||
      !data.name ||
      !data.email ||
      !data.department
    ) {
      setError(
        "Student ID, name, email and department are required."
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!activeDepartments.includes(data.department)) {
      setError(
        "Select an active department from MongoDB."
      );
      return;
    }

    const duplicate = students.some(
      (student) =>
        recordId(student) !== editingId &&
        (
          cleanText(student.studentId).toUpperCase() ===
            data.studentId ||
          cleanText(student.email).toLowerCase() ===
            data.email
        )
    );

    if (duplicate) {
      setError("Student ID or email already exists.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error("Your login session has ended.");
      }

      if (editingId) {
        await updateStudent(token, editingId, data);
      } else {
        await createStudent(token, data);
      }

      const message = editingId
        ? "Student updated in MongoDB successfully."
        : "Student registered in MongoDB successfully.";

      setModal(false);
      setEditingId(null);
      setPage(1);

      await loadData();
      setFeedback(message);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to save student record."
      );
    } finally {
      setSaving(false);
    }
  }

  // ======================================
  // DELETE
  // ======================================

  async function handleDelete(student) {
    const id = recordId(student);

    if (!id || deletingId) return;

    const confirmed = window.confirm(
      `Delete ${student.name} (${student.studentId})?\n\nThis may affect linked academic records.`
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    setFeedback("");

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error("Your login session has ended.");
      }

      await deleteStudent(token, id);
      await loadData();

      setFeedback("Student deleted successfully.");
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to delete student."
      );
    } finally {
      setDeletingId("");
    }
  }

  function clearFilters() {
    setQuery("");
    setDepartmentFilter("All");
    setStatusFilter("All");
    setPage(1);
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
            People Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Student Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Register and manage real MongoDB student records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading || saving}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-40"
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
            disabled={loading || !activeDepartments.length}
            className="flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <UserPlus size={18} />
            Add Student
          </button>
        </div>
      </section>

      {/* ALERTS */}
      {error && !modal && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </p>
      )}

      {feedback && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </p>
      )}

      {!loading && !activeDepartments.length && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Create an active Department first.
          Student records must use an existing MongoDB department.
        </p>
      )}

      {/* STATS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Students"
          value={loading ? "—" : students.length}
          icon={GraduationCap}
          detail="MongoDB student records"
        />

        <StatCard
          label="Active Students"
          value={loading ? "—" : activeCount}
          icon={UserCheck}
          detail="Currently active"
        />

        <StatCard
          label="Graduated"
          value={loading ? "—" : graduatedCount}
          icon={GraduationCap}
          detail="Completed academic programs"
        />

        <StatCard
          label="Inactive Students"
          value={loading ? "—" : inactiveCount}
          icon={UserX}
          detail="Inactive student records"
        />
      </section>

      {/* FILTER PANEL */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={19} className="text-[#234E43]" />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Students
          </h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_250px_180px]">
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
              placeholder="Search name, ID or email..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(event) => {
              setDepartmentFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter department"
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
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter status"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Statuses</option>

            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {filtered.length} matching students
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              <RotateCcw size={15} />
              Clear Filters
            </button>

            <button
              type="button"
              disabled={!filtered.length}
              onClick={() => downloadCSV(filtered)}
              className="flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43] disabled:opacity-40"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student",
                  "Student ID",
                  "Department",
                  "Program",
                  "Semester",
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
              {visible.map((student) => (
                <tr
                  key={recordId(student)}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[#234E43]">
                      {student.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {student.email}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {student.studentId}
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-600">
                    {student.department}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {student.program}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {student.semester}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={student.status} />
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        title="View Student"
                        onClick={() => setViewing(student)}
                        className="rounded-lg bg-slate-100 p-2 text-[#234E43]"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        title="Edit Student"
                        onClick={() => openEdit(student)}
                        className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43]"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        title="Delete Student"
                        disabled={Boolean(deletingId)}
                        onClick={() => handleDelete(student)}
                        className="rounded-lg bg-rose-50 p-2 text-rose-600 disabled:opacity-40"
                      >
                        {deletingId === recordId(student) ? (
                          <RefreshCw
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && !visible.length && (
            <div className="py-14 text-center text-sm text-slate-500">
              No student records found.
            </div>
          )}

          {loading && (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading students from MongoDB...
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} ·{" "}
            {filtered.length} students
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous page"
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ADD / EDIT MODAL */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="student-form-title"
                className="text-xl font-bold text-[#234E43]"
              >
                {editingId
                  ? "Edit Student"
                  : "Add New Student"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
                className="rounded-lg p-2"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Student ID *"
                  value={form.studentId}
                  required
                  disabled={saving || Boolean(editingId)}
                  placeholder="UB-0013"
                  onChange={(event) =>
                    updateField("studentId", event.target.value)
                  }
                />

                <FormField
                  label="Full Name *"
                  value={form.name}
                  required
                  disabled={saving}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                />

                <FormField
                  label="Email Address *"
                  type="email"
                  value={form.email}
                  required
                  disabled={saving}
                  onChange={(event) =>
                    updateField("email", event.target.value)
                  }
                />

                <FormField
                  label="Phone"
                  value={form.phone}
                  disabled={saving}
                  onChange={(event) =>
                    updateField("phone", event.target.value)
                  }
                />

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Department *
                  </span>

                  <select
                    value={form.department}
                    required
                    disabled={saving}
                    onChange={(event) =>
                      updateField(
                        "department",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select Department</option>

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

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Program
                  </span>
                  <select
                    value={form.program}
                    disabled={saving}
                    onChange={(event) =>
                      updateField("program", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    {PROGRAMS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <FormField
                  label="Batch"
                  value={form.batch}
                  disabled={saving}
                  onChange={(event) =>
                    updateField("batch", event.target.value)
                  }
                />

                <FormField
                  label="Semester"
                  value={form.semester}
                  disabled={saving}
                  onChange={(event) =>
                    updateField("semester", event.target.value)
                  }
                />

                <FormField
                  label="Section"
                  value={form.section}
                  disabled={saving}
                  onChange={(event) =>
                    updateField("section", event.target.value)
                  }
                />

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Status
                  </span>
                  <select
                    value={form.status}
                    disabled={saving}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    {STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <FormField
                  label="Enrollment Date"
                  type="date"
                  value={form.enrolledAt}
                  disabled={saving}
                  onChange={(event) =>
                    updateField(
                      "enrolledAt",
                      event.target.value
                    )
                  }
                />
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
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving ? (
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={18} />
                )}

                {saving
                  ? "Saving to MongoDB..."
                  : editingId
                    ? "Save Changes"
                    : "Register Student"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* STUDENT DETAILS MODAL */}
      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-details-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18A28]">
                  Student Record
                </p>

                <h2
                  id="student-details-title"
                  className="mt-2 text-xl font-bold text-[#234E43]"
                >
                  {viewing.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-5">
              <StatusBadge status={viewing.status} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Student ID", viewing.studentId, GraduationCap],
                ["Email", viewing.email, Mail],
                ["Phone", viewing.phone || "Not provided", Phone],
                ["Department", viewing.department, Building2],
                ["Program", viewing.program, BookOpen],
                ["Batch", viewing.batch, CalendarDays],
                ["Semester", viewing.semester, BookOpen],
                ["Section", viewing.section, Users],
              ].map(([label, value, Icon]) => (
                <div
                  key={label}
                  className="rounded-xl bg-[#F6F8F3] p-3"
                >
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Icon size={15} />
                    {label}
                  </p>

                  <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
                    {String(value ?? "—")}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setViewing(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        UniBee Admin Students · Live MongoDB Records
      </p>
    </div>
  );
}
