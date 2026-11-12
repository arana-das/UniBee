
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FileCheck2,
  Building2,
  Clock3,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Eye,
  X,
  Save,
  Download,
  RefreshCw,
  AlertCircle,
  ClipboardList,
  UserRound,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  getAuthToken,
  fetchCurrentUser,
  getStoredUser,
} from "../../services/authApi";

// ========================================
// CONFIGURATION
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 8;

const REQUEST_TYPES = [
  "Course Registration",
  "Course Withdrawal",
  "Section Change",
  "Academic Leave",
  "Attendance Review",
  "Result Recheck",
  "Research Permission",
  "Faculty Academic Request",
  "Other",
];

const EMPTY_FORM = {
  title: "",
  type: "Course Registration",
  requesterName: "",
  requesterId: "",
  requesterRole: "Student",
  description: "",
};

const clean = (value) =>
  String(value ?? "").trim();

const norm = (value) =>
  clean(value).toLowerCase();

const recordId = (record) =>
  clean(record?._id || record?.id);

// ========================================
// AUTHENTICATED API
// ========================================

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Authentication required. Please log in."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}/api/academic-approvals${path}`,
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
      "Cannot connect to UniBee backend."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
      `Academic Approval API failed (${response.status}).`
    );
  }

  return result.data;
}

async function fetchDepartments() {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in again.");
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

  const result = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !result?.success ||
    !Array.isArray(result.data)
  ) {
    throw new Error(
      result?.message ||
      "Unable to load department records."
    );
  }

  return result.data;
}

// ========================================
// DATA HELPERS
// ========================================

function departmentValues(value) {
  if (value && typeof value === "object") {
    return [
      value.name,
      value.code,
      value._id,
      value.id,
    ]
      .map(norm)
      .filter(Boolean);
  }

  return [norm(value)].filter(Boolean);
}

function departmentMatches(
  value,
  assigned,
  departments
) {
  const selected = departmentValues(assigned);

  if (!selected.length) return false;

  const department = departments.find((item) =>
    departmentValues(item).some((part) =>
      selected.includes(part)
    )
  );

  const allowed = new Set([
    ...selected,
    ...(department
      ? departmentValues(department)
      : []),
  ]);

  return departmentValues(value).some((part) =>
    allowed.has(part)
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return clean(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function requestStatus(record) {
  const status = norm(record?.status);

  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "pending") return "Pending";

  return "Unknown";
}

// ========================================
// CSV EXPORT
// ========================================

function exportCSV(records) {
  const headers = [
    "Request ID",
    "Title",
    "Type",
    "Department",
    "Requester",
    "Requester ID",
    "Requester Role",
    "Status",
    "Submitted",
    "Reviewed",
    "Review Note",
  ];

  const rows = records.map((record) => [
    recordId(record),
    record.title,
    record.type,
    record.department,
    record.requesterName,
    record.requesterId,
    record.requesterRole,
    requestStatus(record),
    formatDate(record.createdAt),
    formatDate(record.reviewedAt),
    record.reviewNote,
  ]);

  const safeCell = (value) => {
    let cell = clean(value);

    if (/^[=+\-@\t\r]/.test(cell)) {
      cell = "'" + cell;
    }

    return `"${cell.replace(/"/g, '""')}"`;
  };

  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) =>
        row.map(safeCell).join(",")
      )
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: "text/csv;charset=utf-8",
    })
  );

  const link = document.createElement("a");

  link.href = url;
  link.download =
    "UniBee_HOD_Academic_Approvals.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}

// ========================================
// REUSABLE UI
// ========================================

function StatCard({
  label,
  value,
  icon: Icon,
  note,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#718579]">
            {label}
          </p>

          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-3 text-xs text-[#718579]">
        {note}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-amber-50 text-amber-800",
    Approved: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-rose-50 text-rose-700",
    Unknown: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
        styles[status] || styles.Unknown
      }`}
    >
      {status}
    </span>
  );
}

// ========================================
// CREATE TEST REQUEST MODAL
// ========================================

function RequestModal({
  form,
  setForm,
  error,
  saving,
  onClose,
  onSave,
}) {
  function update(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hod-new-request-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#B18B37]">
              MONGODB TEST REQUEST
            </p>

            <h2
              id="hod-new-request-title"
              className="mt-2 text-xl font-extrabold text-[#234E43]"
            >
              Create Academic Request
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close request form"
            className="rounded-xl p-2 hover:bg-slate-100 disabled:opacity-40"
          >
            <X size={21} />
          </button>
        </div>

        <p className="mt-4 text-xs leading-6 text-[#718579]">
          This is an HOD test request. It will be
          saved in MongoDB with Pending status.
          Real Student and Faculty submissions
          will be connected later.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
          className="mt-5 space-y-4"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Request Title *
            </span>

            <input
              required
              maxLength={140}
              value={form.title}
              disabled={saving}
              onChange={(event) =>
                update("title", event.target.value)
              }
              placeholder="Permission to change section"
              className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Request Type *
            </span>

            <select
              required
              value={form.type}
              disabled={saving}
              onChange={(event) =>
                update("type", event.target.value)
              }
              className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
            >
              {REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Requester Name *
              </span>

              <input
                required
                maxLength={100}
                value={form.requesterName}
                disabled={saving}
                onChange={(event) =>
                  update(
                    "requesterName",
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Requester ID *
              </span>

              <input
                required
                maxLength={70}
                value={form.requesterId}
                disabled={saving}
                onChange={(event) =>
                  update(
                    "requesterId",
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Requester Role *
            </span>

            <select
              value={form.requesterRole}
              disabled={saving}
              onChange={(event) =>
                update(
                  "requesterRole",
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
            >
              <option value="Student">Student</option>
              <option value="Faculty">Faculty</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Request Details *
            </span>

            <textarea
              required
              rows={4}
              maxLength={3000}
              value={form.description}
              disabled={saving}
              onChange={(event) =>
                update(
                  "description",
                  event.target.value
                )
              }
              placeholder="Describe the academic request..."
              className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm"
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

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#E2EADC] px-5 py-3 text-sm font-bold text-[#234E43]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {saving ? (
                <RefreshCw
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save size={17} />
              )}

              {saving
                ? "Saving..."
                : "Submit Test Request"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

// ========================================
// DECISION MODAL
// ========================================

function DecisionModal({
  request,
  decision,
  setDecision,
  reviewNote,
  setReviewNote,
  saving,
  error,
  canReview,
  onSave,
  onClose,
}) {
  const status = requestStatus(request);
  const isPending = status === "Pending";

  const details = [
    ["Request Type", request.type],
    ["Department", request.department],
    ["Requester", request.requesterName],
    ["Requester ID", request.requesterId],
    ["Requester Role", request.requesterRole],
    ["Submitted", formatDate(request.createdAt)],
    ["Reviewed", formatDate(request.reviewedAt)],
    ["Source", request.source],
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hod-decision-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#B18B37]">
              ACADEMIC APPROVAL REVIEW
            </p>

            <h2
              id="hod-decision-title"
              className="mt-2 text-xl font-extrabold text-[#234E43]"
            >
              {request.title}
            </h2>

            <div className="mt-3">
              <StatusBadge status={status} />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close request"
            className="rounded-xl p-2 hover:bg-slate-100 disabled:opacity-40"
          >
            <X size={21} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl bg-[#F6F8F3] p-5 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-[#718579]">
                {label}
              </p>

              <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
                {clean(value) || "—"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-[#E2EADC] p-5">
          <h3 className="font-bold text-[#234E43]">
            Request Description
          </h3>

          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#607B6C]">
            {request.description ||
              "No description provided."}
          </p>
        </div>

        {!isPending && (
          <div className="mt-5 rounded-2xl bg-[#F6F8F3] p-5">
            <h3 className="font-bold text-[#234E43]">
              Decision History
            </h3>

            <p className="mt-3 text-sm text-[#607B6C]">
              <strong>Decision:</strong> {status}
            </p>

            <p className="mt-2 text-sm text-[#607B6C]">
              <strong>Reviewed:</strong>{" "}
              {formatDate(request.reviewedAt)}
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#607B6C]">
              <strong>Review Note:</strong>{" "}
              {request.reviewNote || "—"}
            </p>
          </div>
        )}

        {isPending && canReview && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-bold text-[#234E43]">
              HOD Decision
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setDecision("Approved")
                }
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${
                  decision === "Approved"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-[#E2EADC] text-[#607B6C]"
                }`}
              >
                <CheckCircle2 size={18} />
                Approve
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setDecision("Rejected")
                }
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${
                  decision === "Rejected"
                    ? "border-rose-600 bg-rose-50 text-rose-800"
                    : "border-[#E2EADC] text-[#607B6C]"
                }`}
              >
                <XCircle size={18} />
                Reject
              </button>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Review Note *
              </span>

              <textarea
                rows={4}
                maxLength={2000}
                disabled={saving}
                value={reviewNote}
                onChange={(event) =>
                  setReviewNote(event.target.value)
                }
                placeholder="Explain your decision..."
                className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm"
              />
            </label>

            <p className="text-xs text-[#718579]">
              Your decision will be saved to MongoDB.
              Reviewed requests cannot be changed
              again through this workflow.
            </p>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white disabled:opacity-40"
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
                ? "Saving Decision..."
                : "Save Decision"}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="mt-5 w-full rounded-xl border border-[#E2EADC] px-5 py-3 text-sm font-bold text-[#234E43]"
        >
          Close
        </button>
      </section>
    </div>
  );
}

// ========================================
// MAIN HOD APPROVALS PAGE
// ========================================

export default function HODApprovals() {
  const [user, setUser] =
    useState(getStoredUser);

  const [departments, setDepartments] =
    useState([]);

  const [records, setRecords] =
    useState([]);

  const [adminDepartment, setAdminDepartment] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [modalError, setModalError] =
    useState("");

  const [feedback, setFeedback] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [typeFilter, setTypeFilter] =
    useState("All");

  const [page, setPage] =
    useState(1);

  const [requestModalOpen, setRequestModalOpen] =
    useState(false);

  const [requestForm, setRequestForm] =
    useState({ ...EMPTY_FORM });

  const [selectedRequestId, setSelectedRequestId] =
    useState(null);

  const [decision, setDecision] =
    useState("");

  const [reviewNote, setReviewNote] =
    useState("");

  // ======================================
  // LOAD MONGODB RECORDS
  // ======================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const currentUser =
        await fetchCurrentUser();

      if (
        !["hod", "admin"].includes(
          currentUser?.role
        )
      ) {
        throw new Error(
          "Your account cannot access Academic Approvals."
        );
      }

      const [approvalData, departmentData] =
        await Promise.all([
          apiRequest(""),
          fetchDepartments(),
        ]);

      if (!Array.isArray(approvalData)) {
        throw new Error(
          "Invalid academic approval data returned by server."
        );
      }

      setUser(currentUser);
      setRecords(approvalData);
      setDepartments(departmentData);
    } catch (requestError) {
      setError(
        requestError?.message ||
        "Unable to load academic requests."
      );

      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isHOD = user?.role === "hod";

  const assignedDepartment = isHOD
    ? clean(user?.department)
    : adminDepartment;

  const officialDepartment =
    departments.find((department) =>
      departmentValues(department).includes(
        norm(assignedDepartment)
      )
    );

  const displayDepartment =
    officialDepartment?.name ||
    assignedDepartment;

  // ======================================
  // DEPARTMENT APPROVAL RECORDS
  // ======================================

  const departmentRequests = useMemo(() => {
    if (!assignedDepartment) return [];

    return records.filter((record) =>
      departmentMatches(
        record.department,
        assignedDepartment,
        departments
      )
    );
  }, [
    records,
    assignedDepartment,
    departments,
  ]);

  const types = useMemo(
    () =>
      [
        ...new Set(
          departmentRequests
            .map((record) => clean(record.type))
            .filter(Boolean)
        ),
      ].sort(),
    [departmentRequests]
  );

  // ======================================
  // SEARCH & FILTER
  // ======================================

  const filtered = useMemo(() => {
    const query = norm(search);

    return departmentRequests
      .filter((record) => {
        const searchable = [
          record.title,
          record.type,
          record.requesterName,
          record.requesterId,
          record.description,
        ];

        return (
          searchable.some((value) =>
            norm(value).includes(query)
          ) &&
          (
            statusFilter === "All" ||
            requestStatus(record) === statusFilter
          ) &&
          (
            typeFilter === "All" ||
            record.type === typeFilter
          )
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      );
  }, [
    departmentRequests,
    search,
    statusFilter,
    typeFilter,
  ]);

  // ======================================
  // PAGINATION
  // ======================================

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

  const selectedRequest =
    departmentRequests.find(
      (record) =>
        recordId(record) === selectedRequestId
    );

  const ready =
    !loading &&
    !error &&
    !!officialDepartment;

  const pending =
    departmentRequests.filter(
      (record) =>
        requestStatus(record) === "Pending"
    ).length;

  const approved =
    departmentRequests.filter(
      (record) =>
        requestStatus(record) === "Approved"
    ).length;

  const rejected =
    departmentRequests.filter(
      (record) =>
        requestStatus(record) === "Rejected"
    ).length;

  const stats = [
    {
      label: "Total Requests",
      value: ready
        ? departmentRequests.length
        : "—",
      icon: FileCheck2,
      note: "Department academic requests",
    },
    {
      label: "Pending",
      value: ready ? pending : "—",
      icon: Clock3,
      note: "Awaiting HOD review",
    },
    {
      label: "Approved",
      value: ready ? approved : "—",
      icon: CheckCircle2,
      note: "Approved academic requests",
    },
    {
      label: "Rejected",
      value: ready ? rejected : "—",
      icon: XCircle,
      note: "Rejected academic requests",
    },
  ];

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
    setPage(1);
  }

  // ======================================
  // CREATE TEST REQUEST
  // ======================================

  function openRequestModal() {
    setRequestForm({ ...EMPTY_FORM });
    setModalError("");
    setFeedback("");
    setRequestModalOpen(true);
  }

  async function createRequest() {
    if (saving || !isHOD) return;

    const payload = {
      title: clean(requestForm.title),
      type: clean(requestForm.type),
      requesterName: clean(
        requestForm.requesterName
      ),
      requesterId: clean(
        requestForm.requesterId
      ),
      requesterRole: clean(
        requestForm.requesterRole
      ),
      description: clean(
        requestForm.description
      ),
    };

    if (
      !payload.title ||
      !payload.type ||
      !payload.requesterName ||
      !payload.requesterId ||
      !payload.description
    ) {
      setModalError(
        "Complete all required fields."
      );
      return;
    }

    setSaving(true);
    setModalError("");

    try {
      await apiRequest("", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setRequestModalOpen(false);
      setRequestForm({ ...EMPTY_FORM });

      await loadData();

      resetFilters();

      setFeedback(
        "Academic test request saved to MongoDB successfully."
      );
    } catch (requestError) {
      setModalError(
        requestError?.message ||
        "Unable to create academic request."
      );
    } finally {
      setSaving(false);
    }
  }

  // ======================================
  // APPROVE / REJECT
  // ======================================

  function openDecision(record) {
    setSelectedRequestId(recordId(record));
    setDecision("");
    setReviewNote("");
    setModalError("");
    setFeedback("");
  }

  function closeDecision() {
    if (saving) return;

    setSelectedRequestId(null);
    setDecision("");
    setReviewNote("");
    setModalError("");
  }

  async function saveDecision() {
    if (
      saving ||
      !isHOD ||
      !selectedRequest
    ) {
      return;
    }

    if (
      requestStatus(selectedRequest) !==
      "Pending"
    ) {
      setModalError(
        "Only pending requests can be reviewed."
      );
      return;
    }

    if (
      !["Approved", "Rejected"].includes(
        decision
      )
    ) {
      setModalError(
        "Choose Approve or Reject."
      );
      return;
    }

    if (!clean(reviewNote)) {
      setModalError(
        "A review note is required."
      );
      return;
    }

    setSaving(true);
    setModalError("");

    try {
      await apiRequest(
        `/${encodeURIComponent(
          recordId(selectedRequest)
        )}/decision`,
        {
          method: "PATCH",
          body: JSON.stringify({
            decision,
            reviewNote: clean(reviewNote),
          }),
        }
      );

      setSelectedRequestId(null);
      setDecision("");
      setReviewNote("");

      await loadData();

      setFeedback(
        `Academic request ${decision.toLowerCase()} successfully.`
      );
    } catch (requestError) {
      setModalError(
        requestError?.message ||
        "Unable to save decision."
      );
    } finally {
      setSaving(false);
    }
  }

  // ======================================
  // EXPORT
  // ======================================

  function downloadReport() {
    if (!ready) return;

    exportCSV(filtered);

    setFeedback(
      "Academic approval CSV exported successfully."
    );
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            ACADEMIC MANAGEMENT
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Academic Approvals
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Review academic requests, record decisions
            and track approval history from MongoDB.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={downloadReport}
            disabled={
              !ready ||
              !filtered.length
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
          >
            <Download size={17} />
            Export CSV
          </button>

          {isHOD && (
            <button
              type="button"
              onClick={openRequestModal}
              disabled={!ready || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              <Plus size={18} />
              Test Request
            </button>
          )}
        </div>
      </section>

      {/* DEPARTMENT */}
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
              {isHOD
                ? "Department assigned to your HOD account"
                : "Select an Admin department"}
            </p>
          </div>
        </div>

        {isHOD ? (
          <div className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72">
            {displayDepartment ||
              "No department assigned"}
          </div>
        ) : (
          <select
            aria-label="Select department"
            value={adminDepartment}
            disabled={loading}
            onChange={(event) => {
              setAdminDepartment(
                event.target.value
              );
              resetFilters();
              setSelectedRequestId(null);
            }}
            className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72"
          >
            <option value="">
              Select Department
            </option>

            {departments.map((item) => (
              <option
                key={
                  recordId(item) ||
                  item.name
                }
                value={item.name}
              >
                {item.name}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* MESSAGES */}
      {loading && (
        <p className="rounded-xl bg-[#F6F8F3] p-4 text-sm text-[#234E43]">
          Loading academic requests from MongoDB...
        </p>
      )}

      {error && (
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

      {!loading &&
        !error &&
        !officialDepartment && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {assignedDepartment
              ? "Your selected department was not found in Admin Departments."
              : isHOD
                ? "Your HOD account has no assigned department. Contact Admin."
                : "Select a department to view requests."}
          </p>
        )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            {...stat}
          />
        ))}
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <h2 className="font-bold text-[#234E43]">
          Search Academic Requests
        </h2>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_210px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search title, requester, ID..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-4 text-sm"
            />
          </div>

          <select
            aria-label="Filter request status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value
              );
              setPage(1);
            }}
            className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm"
          >
            <option value="All">
              All Statuses
            </option>
            <option value="Pending">
              Pending
            </option>
            <option value="Approved">
              Approved
            </option>
            <option value="Rejected">
              Rejected
            </option>
          </select>

          <select
            aria-label="Filter request type"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(
                event.target.value
              );
              setPage(1);
            }}
            className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm"
          >
            <option value="All">
              All Request Types
            </option>

            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* APPROVAL TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#E2EADC] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              Department Request Queue
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Pending requests and decision history
            </p>
          </div>

          <span className="rounded-full bg-[#F6F8F3] px-3 py-2 text-xs font-bold text-[#234E43]">
            {ready
              ? filtered.length
              : 0}{" "}
            Requests
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
              <tr>
                {[
                  "Request",
                  "Requester",
                  "Type",
                  "Submitted",
                  "Status",
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
              {ready &&
                visible.map((record) => (
                  <tr
                    key={recordId(record)}
                    className="hover:bg-[#F9FBF8]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                          <FileCheck2 size={19} />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-[#234E43]">
                            {record.title ||
                              "Academic Request"}
                          </p>

                          <p className="mt-1 text-xs text-[#718579]">
                            {recordId(record).slice(
                              0,
                              16
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#234E43]">
                        {record.requesterName ||
                          "—"}
                      </p>

                      <p className="mt-1 text-xs text-[#718579]">
                        {record.requesterId ||
                          "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {record.type || "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {formatDate(
                        record.createdAt
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={requestStatus(
                          record
                        )}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          openDecision(record)
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-[#EAF2E8] px-3 py-2 text-xs font-bold text-[#234E43]"
                      >
                        <Eye size={15} />

                        {requestStatus(record) ===
                        "Pending" &&
                        isHOD
                          ? "Review"
                          : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {!loading &&
            ready &&
            !visible.length && (
              <div className="py-14 text-center">
                <ClipboardList
                  size={38}
                  className="mx-auto text-[#A6C1A4]"
                />

                <p className="mt-4 font-bold text-[#234E43]">
                  No Academic Requests Found
                </p>

                <p className="mt-2 text-sm text-[#718579]">
                  No requests match this department
                  and filters.
                </p>
              </div>
            )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1EB] p-5">
          <p className="text-xs text-[#718579]">
            Page {currentPage} of{" "}
            {totalPages} ·{" "}
            {ready
              ? filtered.length
              : 0}{" "}
            requests
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() =>
                setPage(
                  currentPage - 1
                )
              }
              aria-label="Previous page"
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={
                currentPage === totalPages
              }
              onClick={() =>
                setPage(
                  currentPage + 1
                )
              }
              aria-label="Next page"
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* WORKFLOW INFO */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-bold text-[#234E43]">
          Academic Approval Workflow
        </h2>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: UserRound,
              title: "1. Request Submitted",
              description:
                "A test academic request is saved to MongoDB.",
            },
            {
              icon: Clock3,
              title: "2. HOD Review",
              description:
                "HOD selects Approve or Reject and adds a review note.",
            },
            {
              icon: CheckCircle2,
              title: "3. Decision Recorded",
              description:
                "MongoDB stores the decision, reviewer and review time.",
            },
          ].map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="rounded-xl bg-[#F6F8F3] p-4"
              >
                <Icon
                  size={22}
                  className="text-[#234E43]"
                />

                <p className="mt-3 text-sm font-bold text-[#234E43]">
                  {step.title}
                </p>

                <p className="mt-2 text-xs leading-6 text-[#718579]">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* INTEGRATION NOTE */}
      <div className="flex items-start gap-3 rounded-xl border border-[#E2EADC] bg-[#F6F8F3] p-4 text-xs leading-6 text-[#45685B]">
        <AlertCircle
          size={18}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>MongoDB Integration:</strong>{" "}
          Academic test requests and HOD decisions
          are stored in MongoDB. These decisions
          do not automatically change course
          enrollments, attendance or results.
          Authenticated Student/Faculty submission
          will require separate integration.
        </p>
      </div>

      {/* TEST REQUEST MODAL */}
      {requestModalOpen && (
        <RequestModal
          form={requestForm}
          setForm={setRequestForm}
          error={modalError}
          saving={saving}
          onClose={() => {
            if (saving) return;
            setRequestModalOpen(false);
            setModalError("");
          }}
          onSave={createRequest}
        />
      )}

      {/* DECISION MODAL */}
      {selectedRequest && (
        <DecisionModal
          request={selectedRequest}
          decision={decision}
          setDecision={setDecision}
          reviewNote={reviewNote}
          setReviewNote={setReviewNote}
          saving={saving}
          error={modalError}
          canReview={isHOD}
          onSave={saveDecision}
          onClose={closeDecision}
        />
      )}

      <p className="text-center text-xs text-[#8AA092]">
        UniBee HOD Portal · Academic Approvals · MongoDB
      </p>
    </div>
  );
}
