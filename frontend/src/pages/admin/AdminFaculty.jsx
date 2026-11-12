
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Building2,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Download,
  X,
  Save,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  RefreshCw,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

import {
  getFaculty as fetchFacultyAPI,
  createFaculty as createFacultyAPI,
  updateFaculty as updateFacultyAPI,
  deleteFaculty as deleteFacultyAPI,
} from "../../services/facultyApi";

// ========================================
// CONFIGURATION
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 8;

const DESIGNATIONS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Lecturer",
  "Adjunct Faculty",
];

const STATUSES = [
  "Active",
  "On Leave",
  "Inactive",
];

const EMPTY_FORM = {
  facultyId: "",
  name: "",
  email: "",
  phone: "",
  department: "",
  designation: "Lecturer",
  qualification: "",
  specialization: "",
  experience: 0,
  office: "",
  joiningDate: "",
  status: "Active",
};

// ========================================
// DEPARTMENT API
// ========================================

async function fetchDepartmentsAPI() {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in with your Admin account."
    );
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
    throw new Error(
      "Cannot connect to UniBee backend."
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
        `Department request failed (${response.status}).`
    );
  }

  if (!Array.isArray(result.data)) {
    throw new Error(
      "Invalid department response from server."
    );
  }

  return result.data;
}

// ========================================
// HELPERS
// ========================================

function recordId(record) {
  return String(record?._id || record?.id || "");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function getInitials(name) {
  return cleanText(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "F";
}

function csvExport(records) {
  const rows = [
    [
      "Faculty ID",
      "Name",
      "Email",
      "Phone",
      "Department",
      "Designation",
      "Qualification",
      "Specialization",
      "Experience",
      "Office",
      "Joining Date",
      "Status",
    ],
    ...records.map((item) => [
      item.facultyId,
      item.name,
      item.email,
      item.phone,
      item.department,
      item.designation,
      item.qualification,
      item.specialization,
      item.experience,
      item.office,
      item.joiningDate,
      item.status,
    ]),
  ];

  const escapeCell = (value) => {
    let text = cleanText(value);

    if (/^[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv =
    "\uFEFF" +
    rows
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "UniBee_Faculty.csv";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-700",
    "On Leave": "bg-amber-50 text-amber-700",
    Inactive: "bg-rose-50 text-rose-700",
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

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {label}
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
        {detail}
      </p>
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
  min,
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
        min={min}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43] disabled:opacity-50"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43] disabled:opacity-50"
      >
        {placeholder && (
          <option value="">
            {placeholder}
          </option>
        )}

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

// ========================================
// MAIN PAGE
// ========================================

export default function AdminFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] =
    useState("All");
  const [designationFilter, setDesignationFilter] =
    useState("All");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
  });

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // ======================================
  // LOAD MONGODB DATA
  // ======================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [facultyData, departmentData] =
        await Promise.all([
          fetchFacultyAPI(),
          fetchDepartmentsAPI(),
        ]);

      if (!Array.isArray(facultyData)) {
        throw new Error(
          "Invalid faculty list returned by server."
        );
      }

      setFaculty(facultyData);
      setDepartments(departmentData);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to load faculty records."
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

  const departmentOptions = useMemo(
    () =>
      departments
        .filter((item) => item.status === "Active")
        .map((item) => item.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [departments]
  );

  const allDepartmentOptions = useMemo(
    () =>
      [
        ...new Set([
          ...departments.map((item) => item.name),
          ...faculty.map((item) => item.department),
        ]),
      ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [departments, faculty]
  );

  // ======================================
  // FILTERING
  // ======================================

  const filteredFaculty = useMemo(() => {
    const search = query.trim().toLowerCase();

    return faculty.filter((member) => {
      const matchesSearch = [
        member.name,
        member.facultyId,
        member.email,
        member.specialization,
      ].some((value) =>
        cleanText(value)
          .toLowerCase()
          .includes(search)
      );

      const matchesDepartment =
        departmentFilter === "All" ||
        member.department === departmentFilter;

      const matchesDesignation =
        designationFilter === "All" ||
        member.designation === designationFilter;

      const matchesStatus =
        statusFilter === "All" ||
        member.status === statusFilter;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesDesignation &&
        matchesStatus
      );
    });
  }, [
    faculty,
    query,
    departmentFilter,
    designationFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFaculty.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleFaculty = filteredFaculty.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activeCount = faculty.filter(
    (member) => member.status === "Active"
  ).length;

  const leaveCount = faculty.filter(
    (member) => member.status === "On Leave"
  ).length;

  const departmentCount = new Set(
    faculty.map((item) => item.department).filter(Boolean)
  ).size;

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
      department: departmentOptions[0] || "",
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(member) {
    setEditingId(recordId(member));

    setForm({
      facultyId: member.facultyId || "",
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      department: member.department || "",
      designation: member.designation || "Lecturer",
      qualification: member.qualification || "",
      specialization: member.specialization || "",
      experience: member.experience ?? 0,
      office: member.office || "",
      joiningDate: member.joiningDate
        ? String(member.joiningDate).slice(0, 10)
        : "",
      status: member.status || "Active",
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
  // CREATE / UPDATE FACULTY
  // ======================================

  async function handleSave(event) {
    event.preventDefault();

    if (busy) return;

    const clean = {
      facultyId: cleanText(form.facultyId).toUpperCase(),
      name: cleanText(form.name),
      email: cleanText(form.email).toLowerCase(),
      phone: cleanText(form.phone),
      department: form.department,
      designation: form.designation,
      qualification: cleanText(form.qualification),
      specialization: cleanText(form.specialization),
      experience: Number(form.experience),
      office: cleanText(form.office),
      joiningDate: form.joiningDate,
      status: form.status,
    };

    if (
      !clean.facultyId ||
      !clean.name ||
      !clean.email ||
      !clean.department ||
      !clean.designation
    ) {
      setError("Complete all required fields.");
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)
    ) {
      setError("Enter a valid email address.");
      return;
    }

    if (
      !Number.isFinite(clean.experience) ||
      clean.experience < 0 ||
      clean.experience > 70
    ) {
      setError(
        "Experience must be between 0 and 70 years."
      );
      return;
    }

    if (!departmentOptions.includes(clean.department)) {
      setError(
        "Select an active department from MongoDB."
      );
      return;
    }

    const duplicate = faculty.some(
      (member) =>
        recordId(member) !== editingId &&
        (
          cleanText(member.facultyId).toUpperCase() ===
            clean.facultyId ||
          cleanText(member.email).toLowerCase() ===
            clean.email
        )
    );

    if (duplicate) {
      setError(
        "Faculty ID or email already exists."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (editingId) {
        await updateFacultyAPI(editingId, clean);
      } else {
        await createFacultyAPI(clean);
      }

      setModalOpen(false);
      setEditingId(null);

      setPage(1);

      await loadData();

      setFeedback(
        editingId
          ? "Faculty updated in MongoDB successfully."
          : "Faculty created in MongoDB successfully."
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to save faculty record."
      );
    } finally {
      setBusy(false);
    }
  }

  // ======================================
  // DELETE FACULTY
  // ======================================

  async function handleDelete(member) {
    const id = recordId(member);

    if (!id || busy) return;

    const confirmed = window.confirm(
      `Delete ${member.name} (${member.facultyId})?\n\nAssigned faculty may be protected by the backend.`
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setFeedback("");

    try {
      await deleteFacultyAPI(id);

      await loadData();

      setFeedback(
        "Faculty deleted from MongoDB successfully."
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to delete faculty."
      );
    } finally {
      setBusy(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setDepartmentFilter("All");
    setDesignationFilter("All");
    setStatusFilter("All");
    setPage(1);
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7">
      {/* ALERTS */}
      {error && !modalOpen && (
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

      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            People Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Faculty Member Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage real faculty records connected to
            MongoDB and HOD Course Allocation.
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
              !departmentOptions.length
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33] disabled:opacity-40"
          >
            <UserPlus size={18} />
            Add Faculty
          </button>
        </div>
      </section>

      {!loading && !departmentOptions.length && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Create an active Department in Admin
          Department Management before adding Faculty.
        </p>
      )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Faculty"
          value={loading ? "—" : faculty.length}
          detail="MongoDB faculty records"
          icon={Users}
        />

        <StatCard
          label="Active Faculty"
          value={loading ? "—" : activeCount}
          detail="Currently active"
          icon={UserCheck}
        />

        <StatCard
          label="On Leave"
          value={loading ? "—" : leaveCount}
          detail="Faculty currently on leave"
          icon={UserX}
        />

        <StatCard
          label="Departments"
          value={loading ? "—" : departmentCount}
          detail="Departments with faculty"
          icon={Building2}
        />
      </section>

      {/* FILTER PANEL */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={19}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Faculty
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
            aria-label="Filter by department"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Departments
            </option>

            {allDepartmentOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={designationFilter}
            onChange={(event) => {
              setDesignationFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by designation"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Designations
            </option>

            {DESIGNATIONS.map((name) => (
              <option key={name} value={name}>
                {name}
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
            <option value="All">
              All Statuses
            </option>

            {STATUSES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {filteredFaculty.length} faculty members
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
              onClick={() => csvExport(filteredFaculty)}
              disabled={!filteredFaculty.length}
              className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43] disabled:opacity-40"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* FACULTY TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Faculty Member",
                  "Faculty ID",
                  "Department",
                  "Designation",
                  "Experience",
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
              {visibleFaculty.map((member) => (
                <tr
                  key={recordId(member)}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A6C1A4]/30 text-xs font-bold text-[#234E43]">
                        {getInitials(member.name)}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[#234E43]">
                          {member.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {member.facultyId}
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-600">
                    {member.department}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {member.designation}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {member.experience ?? 0} Years
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge
                      status={member.status}
                    />
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title="View Faculty"
                        onClick={() => setViewing(member)}
                        className="rounded-lg bg-slate-100 p-2 text-[#234E43]"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        title="Edit Faculty"
                        onClick={() => openEdit(member)}
                        className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43]"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        title="Delete Faculty"
                        disabled={busy}
                        onClick={() => handleDelete(member)}
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

          {!loading && !visibleFaculty.length && (
            <div className="py-14 text-center text-sm text-slate-500">
              No faculty records found.
            </div>
          )}

          {loading && (
            <div className="py-10 text-center text-sm text-slate-500">
              Loading faculty records from MongoDB...
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} ·{" "}
            {filteredFaculty.length} faculty members
          </p>

          <div className="flex gap-2">
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
      </section>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="faculty-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2
                id="faculty-form-title"
                className="text-xl font-bold text-[#234E43]"
              >
                {editingId
                  ? "Edit Faculty Member"
                  : "Add Faculty Member"}
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

            <form
              onSubmit={handleSave}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Faculty ID *"
                  value={form.facultyId}
                  required
                  disabled={busy}
                  placeholder="FAC-001"
                  onChange={(e) =>
                    updateField("facultyId", e.target.value)
                  }
                />

                <FormField
                  label="Full Name *"
                  value={form.name}
                  required
                  disabled={busy}
                  placeholder="Faculty full name"
                  onChange={(e) =>
                    updateField("name", e.target.value)
                  }
                />

                <FormField
                  label="Email Address *"
                  type="email"
                  value={form.email}
                  required
                  disabled={busy}
                  placeholder="faculty@example.edu"
                  onChange={(e) =>
                    updateField("email", e.target.value)
                  }
                />

                <FormField
                  label="Phone Number"
                  value={form.phone}
                  disabled={busy}
                  onChange={(e) =>
                    updateField("phone", e.target.value)
                  }
                />

                <SelectField
                  label="Department *"
                  value={form.department}
                  options={[
                    ...new Set([
                      ...departmentOptions,
                      ...(form.department &&
                      !departmentOptions.includes(form.department)
                        ? [form.department]
                        : []),
                    ]),
                  ]}
                  placeholder="Select Department"
                  required
                  disabled={busy}
                  onChange={(e) =>
                    updateField("department", e.target.value)
                  }
                />

                <SelectField
                  label="Designation"
                  value={form.designation}
                  options={DESIGNATIONS}
                  disabled={busy}
                  onChange={(e) =>
                    updateField("designation", e.target.value)
                  }
                />

                <FormField
                  label="Qualification"
                  value={form.qualification}
                  disabled={busy}
                  placeholder="PhD / MSc / MA"
                  onChange={(e) =>
                    updateField("qualification", e.target.value)
                  }
                />

                <FormField
                  label="Specialization"
                  value={form.specialization}
                  disabled={busy}
                  placeholder="Teaching area"
                  onChange={(e) =>
                    updateField("specialization", e.target.value)
                  }
                />

                <FormField
                  label="Experience (Years)"
                  type="number"
                  min="0"
                  value={form.experience}
                  disabled={busy}
                  onChange={(e) =>
                    updateField("experience", e.target.value)
                  }
                />

                <FormField
                  label="Office Location"
                  value={form.office}
                  disabled={busy}
                  onChange={(e) =>
                    updateField("office", e.target.value)
                  }
                />

                <FormField
                  label="Joining Date"
                  type="date"
                  value={form.joiningDate}
                  disabled={busy}
                  onChange={(e) =>
                    updateField("joiningDate", e.target.value)
                  }
                />

                <SelectField
                  label="Status"
                  value={form.status}
                  options={STATUSES}
                  disabled={busy}
                  onChange={(e) =>
                    updateField("status", e.target.value)
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
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33] disabled:opacity-50"
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
                    : "Register Faculty"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* FACULTY DETAILS MODAL */}
      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="faculty-details-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18A28]">
                  Faculty Record
                </p>

                <h2
                  id="faculty-details-title"
                  className="mt-2 text-xl font-bold text-[#234E43]"
                >
                  {viewing.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {viewing.designation}
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Faculty ID", viewing.facultyId, Users],
                ["Email", viewing.email, Mail],
                ["Phone", viewing.phone || "Not provided", Phone],
                ["Department", viewing.department, Building2],
                ["Qualification", viewing.qualification || "Not provided", GraduationCap],
                ["Specialization", viewing.specialization || "Not provided", BookOpen],
                ["Experience", `${viewing.experience ?? 0} Years`, UserCheck],
                ["Joining Date", viewing.joiningDate || "Not provided", CalendarDays],
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
                    {String(value)}
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

      <p className="text-center text-xs leading-6 text-slate-400">
        UniBee Admin Faculty · Live MongoDB Records
      </p>
    </div>
  );
}
