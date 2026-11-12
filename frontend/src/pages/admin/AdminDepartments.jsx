
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ========================================
// CONFIGURATION
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 6;

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  status: "Active",
};

// ========================================
// API REQUEST
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
// HELPERS
// ========================================

function recordId(item) {
  return String(item?._id || item?.id || "");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function exportDepartmentsCSV(departments) {
  const rows = [
    [
      "Department Code",
      "Department Name",
      "Description",
      "Status",
    ],
    ...departments.map((item) => [
      item.code,
      item.name,
      item.description,
      item.status,
    ]),
  ];

  const escapeCell = (value) => {
    let text = cleanText(value);

    // Prevent spreadsheet formula injection.
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
  const link = document.createElement("a");

  link.href = url;
  link.download = "UniBee_Departments.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// ========================================
// STATUS BADGE
// ========================================

function StatusBadge({ status }) {
  const active = status === "Active";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />

      {status}
    </span>
  );
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
// FORM FIELD
// ========================================

function InputField({
  label,
  value,
  onChange,
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
        type="text"
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43] disabled:opacity-60"
      />
    </label>
  );
}

// ========================================
// MAIN PAGE
// ========================================

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // ======================================
  // LOAD REAL DEPARTMENTS
  // ======================================

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await academicRequest("/departments");

      if (!Array.isArray(data)) {
        throw new Error(
          "Department API returned an invalid response."
        );
      }

      setDepartments(data);
    } catch (requestError) {
      setError(requestError.message);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // ======================================
  // SEARCH AND FILTER
  // ======================================

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return departments.filter((department) => {
      const matchesSearch = [
        department.code,
        department.name,
        department.description,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      );

      const matchesStatus =
        statusFilter === "All" ||
        department.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [departments, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDepartments.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleDepartments = filteredDepartments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activeCount = departments.filter(
    (item) => item.status === "Active"
  ).length;

  const inactiveCount = departments.filter(
    (item) => item.status === "Inactive"
  ).length;

  function resetFilters() {
    setSearch("");
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
    setForm({ ...EMPTY_FORM });
    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(department) {
    setEditingId(recordId(department));

    setForm({
      code: department.code || "",
      name: department.name || "",
      description: department.description || "",
      status: department.status || "Active",
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setError("");
  }

  // ======================================
  // CREATE / UPDATE
  // ======================================

  async function handleSave(event) {
    event.preventDefault();

    if (saving) return;

    const clean = {
      code: cleanText(form.code).toUpperCase(),
      name: cleanText(form.name),
      description: cleanText(form.description),
      status: form.status,
    };

    if (!clean.code || !clean.name) {
      setError(
        "Department code and name are required."
      );
      return;
    }

    if (!/^[A-Z0-9-]{2,15}$/.test(clean.code)) {
      setError(
        "Department code must contain 2–15 letters, numbers or hyphens."
      );
      return;
    }

    const duplicate = departments.some(
      (department) =>
        recordId(department) !== editingId &&
        (
          department.code?.toUpperCase() === clean.code ||
          department.name?.toLowerCase() ===
            clean.name.toLowerCase()
        )
    );

    if (duplicate) {
      setError(
        "A department with this code or name already exists."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingId) {
        await academicRequest(
          `/departments/${encodeURIComponent(editingId)}`,
          {
            method: "PUT",
            body: JSON.stringify(clean),
          }
        );
      } else {
        await academicRequest("/departments", {
          method: "POST",
          body: JSON.stringify(clean),
        });
      }

      const successMessage = editingId
        ? "Department updated in MongoDB successfully."
        : "Department created in MongoDB successfully.";

      setModalOpen(false);
      setEditingId(null);
      setPage(1);

      await loadDepartments();

      setFeedback(successMessage);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  // ======================================
  // DELETE
  // ======================================

  async function deleteDepartment(department) {
    const id = recordId(department);

    if (!id || deletingId) return;

    const confirmed = window.confirm(
      `Delete ${department.name} (${department.code}) from MongoDB?\n\nDepartments linked to courses, faculty or students cannot be deleted.`
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    setFeedback("");

    try {
      await academicRequest(
        `/departments/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      await loadDepartments();

      setFeedback(
        "Department deleted from MongoDB successfully."
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId("");
    }
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Academic Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Department Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage university departments using live
            MongoDB records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadDepartments}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/10 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-50"
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
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33] disabled:opacity-50"
          >
            <Plus size={18} />
            Add Department
          </button>
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

      {error && !modalOpen && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Departments"
          value={loading ? "—" : departments.length}
          description="Real MongoDB department records"
          icon={Building2}
        />

        <StatCard
          title="Active Departments"
          value={loading ? "—" : activeCount}
          description="Currently active departments"
          icon={CheckCircle2}
        />

        <StatCard
          title="Inactive Departments"
          value={loading ? "—" : inactiveCount}
          description="Departments marked inactive"
          icon={Building2}
        />
      </section>

      {/* SEARCH AND FILTER */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={19}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Departments
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search department, code or description..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="All">
              All Statuses
            </option>

            <option value="Active">
              Active
            </option>

            <option value="Inactive">
              Inactive
            </option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {filteredDepartments.length} matching departments
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              <RotateCcw size={15} />
              Clear Filters
            </button>

            <button
              type="button"
              disabled={!filteredDepartments.length}
              onClick={() =>
                exportDepartmentsCSV(filteredDepartments)
              }
              className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43] disabled:opacity-40"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* DEPARTMENT TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">
                  Department
                </th>

                <th className="px-5 py-4">
                  Description
                </th>

                <th className="px-5 py-4">
                  Status
                </th>

                <th className="px-5 py-4">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleDepartments.map((department) => (
                <tr
                  key={recordId(department)}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A6C1A4]/30 px-2 text-xs font-bold text-[#234E43]">
                        {department.code}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[#234E43]">
                          {department.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {department.code}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="max-w-sm px-5 py-4 text-sm text-slate-600">
                    <p className="line-clamp-2">
                      {department.description ||
                        "No description"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge
                      status={department.status}
                    />
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        title="View Department"
                        onClick={() =>
                          setViewing(department)
                        }
                        className="rounded-lg bg-slate-100 p-2 text-[#234E43] hover:bg-slate-200"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        title="Edit Department"
                        onClick={() =>
                          openEdit(department)
                        }
                        className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43] hover:bg-[#A6C1A4]/40"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        title="Delete Department"
                        disabled={Boolean(deletingId)}
                        onClick={() =>
                          deleteDepartment(department)
                        }
                        className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 disabled:opacity-40"
                      >
                        {deletingId === recordId(department) ? (
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

          {!loading && visibleDepartments.length === 0 && (
            <div className="py-14 text-center">
              <Building2
                size={36}
                className="mx-auto text-[#A6C1A4]"
              />

              <p className="mt-4 font-bold text-[#234E43]">
                No Departments Found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Add a department to create its MongoDB record.
              </p>
            </div>
          )}

          {loading && (
            <p className="p-8 text-center text-sm text-slate-500">
              Loading departments from MongoDB...
            </p>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} ·{" "}
            {filteredDepartments.length} departments
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

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="department-form-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2
                id="department-form-title"
                className="text-xl font-bold text-[#234E43]"
              >
                {editingId
                  ? "Edit Department"
                  : "Add Department"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Department Code *"
                  value={form.code}
                  required
                  disabled={saving}
                  placeholder="e.g. CSE"
                  onChange={(event) =>
                    updateField(
                      "code",
                      event.target.value
                    )
                  }
                />

                <InputField
                  label="Department Name *"
                  value={form.name}
                  required
                  disabled={saving}
                  placeholder="e.g. Computer Science and Engineering"
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                />
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Department Status
                </span>

                <select
                  value={form.status}
                  disabled={saving}
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Description
                </span>

                <textarea
                  rows={4}
                  maxLength={1500}
                  value={form.description}
                  disabled={saving}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Describe this department..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
                />
              </label>

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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33] disabled:opacity-40"
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
                    : "Add Department"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* DETAILS MODAL */}
      {viewing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewing(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="department-details-title"
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18A28]">
                  Academic Department
                </p>

                <h2
                  id="department-details-title"
                  className="mt-2 text-xl font-bold text-[#234E43]"
                >
                  {viewing.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {viewing.code}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewing(null)
                }
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-5">
              <StatusBadge
                status={viewing.status}
              />
            </div>

            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {viewing.description ||
                "No description available."}
            </p>

            <button
              type="button"
              onClick={() =>
                setViewing(null)
              }
              className="mt-6 w-full rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        UniBee Admin Departments · MongoDB Academic Management
      </p>
    </div>
  );
}
