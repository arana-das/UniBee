
import { useEffect, useMemo, useState } from "react";
import {
  RefreshCcw,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  Save,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Filter,
  RotateCcw,
  Database,
  Wallet,
  CreditCard,
  CalendarDays,
  UserRound,
  GraduationCap,
  FileText,
  RefreshCw,
  Send,
  Ban,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const STORAGE_KEY = "unibee-accounts-refunds-v1";

const REFUND_REASONS = [
  "Excess Payment",
  "Duplicate Payment",
  "Course Withdrawal",
  "Semester Cancellation",
  "Admission Cancellation",
  "Scholarship Adjustment",
  "Incorrect Fee Collection",
  "Other",
];

const REFUND_METHODS = [
  "Bank Transfer",
  "bKash",
  "Nagad",
  "Rocket",
  "Cash",
  "Original Payment Method",
  "Other",
];

const STATUSES = [
  "Pending",
  "Under Review",
  "Approved",
  "Rejected",
  "Processed",
  "Cancelled",
];

const EMPTY_FORM = {
  studentId: "",
  studentName: "",
  department: "",
  semester: "",
  originalPaymentId: "",
  refundReason: "Excess Payment",
  requestedAmount: "",
  approvedAmount: "",
  requestDate: "",
  refundMethod: "Bank Transfer",
  transactionReference: "",
  processedDate: "",
  status: "Pending",
  notes: "",
};

// ========================================
// GENERAL HELPERS
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return text(value).toLowerCase();
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function money(value) {
  return `৳ ${numeric(value).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function todayLocal() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value) {
  if (!value) return "Not set";

  const raw = text(value);

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T12:00:00`
      : raw
  );

  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `refund-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function createRefundNumber() {
  return `REF-${new Date().getFullYear()}-${Date.now()
    .toString(36)
    .toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

function loadRefunds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (row) =>
            row &&
            typeof row === "object" &&
            !Array.isArray(row)
        )
      : [];
  } catch {
    return [];
  }
}

// ========================================
// UI COMPONENTS
// ========================================

function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-amber-50 text-amber-700",
    "Under Review": "bg-blue-50 text-blue-700",
    Approved: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-rose-50 text-rose-700",
    Processed: "bg-teal-50 text-teal-700",
    Cancelled: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[#718579]">{title}</p>
          <h3 className="mt-3 break-words text-2xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="shrink-0 rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#718579]">
        {description}
      </p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2EADC] py-3 text-sm last:border-b-0">
      <span className="text-[#718579]">{label}</span>
      <span className="max-w-[65%] break-words text-right font-semibold text-[#234E43]">
        {value === undefined || value === null || value === ""
          ? "—"
          : value}
      </span>
    </div>
  );
}

// ========================================
// MAIN REFUNDS COMPONENT
// ========================================

export default function AccountsRefunds() {
  const [refunds, setRefunds] = useState(loadRefunds);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [reasonFilter, setReasonFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    requestDate: todayLocal(),
  });

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  // ======================================
  // REFRESH
  // ======================================

  useEffect(() => {
    function refresh() {
      setRefunds(loadRefunds());
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  // ======================================
  // STATISTICS
  // ======================================

  const summary = useMemo(() => {
    return refunds.reduce(
      (result, refund) => {
        const requested = numeric(refund.requestedAmount);
        const approved = numeric(refund.approvedAmount);

        result.total += 1;
        result.requestedAmount += requested;

        if (["Pending", "Under Review"].includes(refund.status)) {
          result.pending += 1;
        }

        if (refund.status === "Approved") {
          result.approved += 1;
          result.approvedAmount += approved;
        }

        if (refund.status === "Processed") {
          result.processed += 1;
          result.processedAmount += approved;
        }

        return result;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        processed: 0,
        requestedAmount: 0,
        approvedAmount: 0,
        processedAmount: 0,
      }
    );
  }, [refunds]);

  const stats = [
    {
      title: "Total Refund Requests",
      value: summary.total,
      description: "All submitted refund records",
      icon: RefreshCcw,
    },
    {
      title: "Awaiting Decision",
      value: summary.pending,
      description: "Pending and under-review requests",
      icon: Clock3,
    },
    {
      title: "Approved Refunds",
      value: money(summary.approvedAmount),
      description: `${summary.approved} approved, not yet processed`,
      icon: CheckCircle2,
    },
    {
      title: "Processed Refunds",
      value: money(summary.processedAmount),
      description: `${summary.processed} recorded as processed`,
      icon: Wallet,
    },
  ];

  // ======================================
  // FILTERING
  // ======================================

  const filteredRefunds = useMemo(() => {
    const query = norm(search);

    return [...refunds]
      .filter((item) => {
        const matchesSearch = [
          item.refundNumber,
          item.studentId,
          item.studentName,
          item.department,
          item.semester,
          item.originalPaymentId,
          item.transactionReference,
        ].some((value) => norm(value).includes(query));

        const matchesStatus =
          statusFilter === "All" ||
          item.status === statusFilter;

        const matchesReason =
          reasonFilter === "All" ||
          item.refundReason === reasonFilter;

        return matchesSearch && matchesStatus && matchesReason;
      })
      .sort((a, b) =>
        text(b.requestDate || b.createdAt).localeCompare(
          text(a.requestDate || a.createdAt)
        )
      );
  }, [refunds, search, statusFilter, reasonFilter]);

  // ======================================
  // STORAGE ACTIONS
  // ======================================

  function persist(next) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      setRefunds(next);
      setError("");
      return true;
    } catch {
      setError("Unable to save refund records in browser storage.");
      return false;
    }
  }

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      requestDate: todayLocal(),
    });
    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditingId(record.id);

    setForm({
      studentId: text(record.studentId),
      studentName: text(record.studentName),
      department: text(record.department),
      semester: text(record.semester),
      originalPaymentId: text(record.originalPaymentId),
      refundReason: record.refundReason || "Other",
      requestedAmount: String(record.requestedAmount ?? ""),
      approvedAmount: String(record.approvedAmount ?? ""),
      requestDate: record.requestDate || todayLocal(),
      refundMethod: record.refundMethod || "Bank Transfer",
      transactionReference: text(record.transactionReference),
      processedDate: record.processedDate || "",
      status: record.status || "Pending",
      notes: text(record.notes),
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ======================================
  // CREATE / EDIT REFUND
  // ======================================

  function handleSave(event) {
    event.preventDefault();

    const requested = Number(form.requestedAmount);
    const approved =
      form.approvedAmount.trim() === ""
        ? 0
        : Number(form.approvedAmount);

    if (
      !form.studentId.trim() ||
      !form.studentName.trim() ||
      !form.department.trim() ||
      !form.semester.trim()
    ) {
      setError(
        "Student ID, name, department, and semester are required."
      );
      return;
    }

    if (!form.requestDate) {
      setError("Please select a request date.");
      return;
    }

    if (
      form.requestedAmount.trim() === "" ||
      !Number.isFinite(requested) ||
      requested <= 0
    ) {
      setError("Requested refund must be greater than zero.");
      return;
    }

    if (
      !Number.isFinite(approved) ||
      approved < 0 ||
      approved > requested
    ) {
      setError(
        "Approved amount must be between zero and the requested amount."
      );
      return;
    }

    if (
      ["Approved", "Processed"].includes(form.status) &&
      approved <= 0
    ) {
      setError(
        "An approved amount greater than zero is required."
      );
      return;
    }

    if (
      form.status === "Processed" &&
      (!form.processedDate || !form.transactionReference.trim())
    ) {
      setError(
        "Processed refunds require a processing date and transaction reference."
      );
      return;
    }

    if (
      form.processedDate &&
      form.processedDate < form.requestDate
    ) {
      setError("Processing date cannot be before request date.");
      return;
    }

    const now = new Date().toISOString();

    const values = {
      studentId: form.studentId.trim(),
      studentName: form.studentName.trim(),
      department: form.department.trim(),
      semester: form.semester.trim(),
      originalPaymentId: form.originalPaymentId.trim(),
      refundReason: form.refundReason,
      requestedAmount: requested,
      approvedAmount:
        ["Approved", "Processed"].includes(form.status)
          ? approved
          : 0,
      requestDate: form.requestDate,
      refundMethod: form.refundMethod,
      transactionReference:
        form.status === "Processed"
          ? form.transactionReference.trim()
          : "",
      processedDate:
        form.status === "Processed"
          ? form.processedDate
          : "",
      status: form.status,
      notes: form.notes.trim(),
      updatedAt: now,
    };

    const next =
      editingId !== null
        ? refunds.map((record) =>
            record.id === editingId
              ? { ...record, ...values }
              : record
          )
        : [
            {
              id: createId(),
              refundNumber: createRefundNumber(),
              ...values,
              createdAt: now,
            },
            ...refunds,
          ];

    if (persist(next)) {
      setModalOpen(false);
      setEditingId(null);
      setFeedback(
        editingId !== null
          ? "Refund record updated successfully."
          : "Refund request created successfully."
      );
    }
  }

  // ======================================
  // STATUS ACTIONS
  // ======================================

  function changeStatus(record, newStatus) {
    if (!window.confirm(`Change refund status to ${newStatus}?`)) {
      return;
    }

    // Processing requires documented transaction details.
    if (newStatus === "Processed") {
      openEdit(record);
      setForm((previous) => ({
        ...previous,
        status: "Processed",
        processedDate: todayLocal(),
        approvedAmount: String(
          numeric(record.approvedAmount) > 0
            ? record.approvedAmount
            : record.requestedAmount
        ),
      }));
      setFeedback("");
      return;
    }

    const now = new Date().toISOString();

    const approvedAmount =
      newStatus === "Approved"
        ? numeric(record.approvedAmount) > 0
          ? numeric(record.approvedAmount)
          : numeric(record.requestedAmount)
        : 0;

    const next = refunds.map((item) =>
      item.id === record.id
        ? {
            ...item,
            status: newStatus,
            approvedAmount,
            processedDate: "",
            transactionReference: "",
            updatedAt: now,
          }
        : item
    );

    if (persist(next)) {
      setFeedback(`Refund marked as ${newStatus}.`);
    }
  }

  // ======================================
  // DELETE
  // ======================================

  function deleteRecord(id) {
    if (!window.confirm("Delete this refund record?")) {
      return;
    }

    const next = refunds.filter((item) => item.id !== id);

    if (persist(next)) {
      setFeedback("Refund record deleted successfully.");
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setReasonFilter("All");
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
            FINANCIAL OPERATIONS
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Refund Management
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Review refund requests, record approval
            decisions, and track refund processing.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setRefunds(loadRefunds());
              setFeedback("Refund records refreshed.");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] hover:bg-[#F1F7EF]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33]"
          >
            <Plus size={18} />
            New Refund Request
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
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
            <RefreshCcw size={16} />
            ACCOUNTS OFFICER
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            Student Refund Processing
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Track refund requests from submission
            to review, approval, and recorded processing.
          </p>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border-[35px] border-white/5" />
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-[#234E43]" />
          <h2 className="font-bold text-[#234E43]">
            Search & Filter Refunds
          </h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Student, refund ID, payment reference..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter refund status"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Statuses</option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={reasonFilter}
            onChange={(event) =>
              setReasonFilter(event.target.value)
            }
            aria-label="Filter refund reason"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Refund Reasons</option>

            {REFUND_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#718579]">
            Showing {filteredRefunds.length} of{" "}
            {refunds.length} refunds
          </p>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#234E43] hover:underline"
          >
            <RotateCcw size={15} />
            Reset Filters
          </button>
        </div>
      </section>

      {/* REFUND RECORDS */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Refund Requests
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            Student requests, decisions, and processing records
          </p>
        </div>

        {filteredRefunds.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-6 py-14 text-center">
            <Database
              size={36}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Refund Records Found
            </h3>

            <p className="mt-2 text-sm text-[#718579]">
              Create a refund request or adjust your filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredRefunds.map((record) => (
              <article
                key={record.id}
                className="flex flex-col rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                      <UserRound size={22} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-[#234E43]">
                        {record.studentName}
                      </h3>

                      <p className="mt-1 text-xs text-[#718579]">
                        {record.refundNumber}
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={record.status} />
                </div>

                <div className="mt-5 grid gap-3 rounded-xl bg-[#F6F8F3] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-[#718579]">
                      Student ID
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#234E43]">
                      {record.studentId}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Department
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#234E43]">
                      {record.department}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Refund Reason
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#234E43]">
                      {record.refundReason}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Request Date
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#234E43]">
                      <CalendarDays size={15} />
                      {formatDate(record.requestDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl border border-[#E2EADC] p-3">
                    <p className="text-xs text-[#718579]">
                      Requested
                    </p>

                    <p className="mt-2 break-words text-lg font-extrabold text-[#234E43]">
                      {money(record.requestedAmount)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#E2EADC] p-3">
                    <p className="text-xs text-[#718579]">
                      Approved
                    </p>

                    <p className="mt-2 break-words text-lg font-extrabold text-emerald-700">
                      {money(record.approvedAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-2 border-t border-[#E2EADC] pt-4">
                  <button
                    type="button"
                    onClick={() => setViewing(record)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <Eye size={15} />
                    View
                  </button>

                  {record.status !== "Processed" && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(record)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      {["Pending", "Under Review"].includes(
                        record.status
                      ) && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              changeStatus(record, "Approved")
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700"
                          >
                            <CheckCircle2 size={15} />
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              changeStatus(record, "Rejected")
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-700"
                          >
                            <Ban size={15} />
                            Reject
                          </button>
                        </>
                      )}

                      {record.status === "Approved" && (
                        <button
                          type="button"
                          onClick={() =>
                            changeStatus(record, "Processed")
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-2.5 text-xs font-bold text-teal-700"
                        >
                          <Send size={15} />
                          Process
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteRecord(record.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-600"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CREATE / EDIT FORM */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  ACCOUNTS OFFICER
                </p>

                <h2
                  id="refund-form-title"
                  className="mt-2 text-xl font-bold text-[#234E43]"
                >
                  {editingId !== null
                    ? "Edit Refund Request"
                    : "Create Refund Request"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close form"
                className="rounded-lg bg-[#F6F8F3] p-2 text-[#234E43]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <GraduationCap size={19} />
                  Student Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Student ID", "studentId"],
                    ["Student Name", "studentName"],
                    ["Department", "department"],
                    ["Semester", "semester"],
                  ].map(([label, field]) => (
                    <div key={field}>
                      <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                        {label} *
                      </label>

                      <input
                        required
                        value={form[field]}
                        onChange={(event) =>
                          updateField(field, event.target.value)
                        }
                        className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm outline-none focus:border-[#234E43]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <CreditCard size={19} />
                  Refund Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Original Payment Reference
                    </label>

                    <input
                      value={form.originalPaymentId}
                      onChange={(event) =>
                        updateField(
                          "originalPaymentId",
                          event.target.value
                        )
                      }
                      placeholder="Payment transaction reference"
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Refund Reason
                    </label>

                    <select
                      value={form.refundReason}
                      onChange={(event) =>
                        updateField(
                          "refundReason",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      {REFUND_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Requested Amount (৳) *
                    </label>

                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.requestedAmount}
                      onChange={(event) =>
                        updateField(
                          "requestedAmount",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Request Date *
                    </label>

                    <input
                      required
                      type="date"
                      value={form.requestDate}
                      onChange={(event) =>
                        updateField(
                          "requestDate",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateField(
                          "status",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {["Approved", "Processed"].includes(
                    form.status
                  ) && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                        Approved Amount (৳) *
                      </label>

                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.approvedAmount}
                        onChange={(event) =>
                          updateField(
                            "approvedAmount",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <Wallet size={19} />
                  Refund Processing Details
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Refund Method
                    </label>

                    <select
                      value={form.refundMethod}
                      onChange={(event) =>
                        updateField(
                          "refundMethod",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      {REFUND_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.status === "Processed" && (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                          Processing Date *
                        </label>

                        <input
                          required
                          type="date"
                          value={form.processedDate}
                          onChange={(event) =>
                            updateField(
                              "processedDate",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                          Refund Transaction Reference *
                        </label>

                        <input
                          required
                          value={form.transactionReference}
                          onChange={(event) =>
                            updateField(
                              "transactionReference",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Notes
                </label>

                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    updateField("notes", event.target.value)
                  }
                  placeholder="Refund explanation or review notes..."
                  className="w-full resize-y rounded-xl border border-[#E2EADC] p-3 text-sm"
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white"
              >
                <Save size={18} />
                {editingId !== null
                  ? "Save Changes"
                  : "Create Refund Request"}
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
            aria-labelledby="refund-view-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  REFUND RECORD
                </p>

                <h2
                  id="refund-view-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {viewing.refundNumber}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close details"
                className="rounded-lg bg-[#F6F8F3] p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5">
              <StatusBadge status={viewing.status} />
            </div>

            <div className="mt-6 rounded-xl bg-[#F6F8F3] px-5">
              {[
                ["Student ID", viewing.studentId],
                ["Student Name", viewing.studentName],
                ["Department", viewing.department],
                ["Semester", viewing.semester],
                ["Refund Reason", viewing.refundReason],
                ["Original Payment", viewing.originalPaymentId],
                ["Request Date", formatDate(viewing.requestDate)],
                ["Requested Amount", money(viewing.requestedAmount)],
                ["Approved Amount", money(viewing.approvedAmount)],
                ["Refund Method", viewing.refundMethod],
                ["Processing Date", formatDate(viewing.processedDate)],
                [
                  "Transaction Reference",
                  viewing.transactionReference,
                ],
              ].map(([label, value]) => (
                <DetailRow
                  key={label}
                  label={label}
                  value={value}
                />
              ))}
            </div>

            {viewing.notes && (
              <div className="mt-5 rounded-xl border border-[#E2EADC] p-4">
                <p className="text-xs font-bold text-[#234E43]">
                  Notes
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#718579]">
                  {viewing.notes}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setViewing(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 font-bold text-white"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      {/* INFORMATION */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <FileText
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Refund requests,
          approvals, and processing information are
          stored in browser localStorage. Marking a
          refund as Processed does not transfer money.
          Payment references and refund eligibility
          are not automatically verified. Integration
          with payment records, student fee balances,
          and secure financial workflows will be
          implemented later.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Accounts Officer — Refund Management
      </p>
    </div>
  );
}
