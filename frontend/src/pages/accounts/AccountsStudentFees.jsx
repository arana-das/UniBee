
import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  Save,
  Wallet,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Filter,
  CalendarDays,
  UserRound,
  BookOpen,
  Receipt,
  Database,
} from "lucide-react";

import {
  getStudentFees,
  getFinanceStudents,
  createStudentFee,
  updateStudentFee,
} from "../../services/financeApi";

// ========================================
// STORAGE
// ========================================

const STORAGE_KEY =
  "unibee-accounts-student-fees-v1";

const EMPTY_FORM = {
  studentId: "",
  studentName: "",
  department: "",
  semester: "",
  feeType: "Tuition Fee",
  totalAmount: "",
  paidAmount: "0",
  dueDate: "",
  notes: "",
};

const FEE_TYPES = [
  "Tuition Fee",
  "Admission Fee",
  "Semester Fee",
  "Examination Fee",
  "Library Fee",
  "Laboratory Fee",
  "Registration Fee",
  "Other",
];

function loadFees() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item)
    );
  } catch {
    return [];
  }
}

function saveFees(rows) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(rows)
  );
}

function numeric(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function money(value) {
  return `৳ ${numeric(value).toLocaleString(
    "en-BD",
    {
      maximumFractionDigits: 2,
    }
  )}`;
}

function getDue(row) {
  return Math.max(
    0,
    numeric(row.totalAmount) -
      numeric(row.paidAmount)
  );
}

function getStatus(row) {
  const total = numeric(row.totalAmount);
  const paid = numeric(row.paidAmount);
  const due = getDue(row);

  if (total <= 0) return "Invalid";

  if (due <= 0) return "Paid";

  if (paid > 0) return "Partial";

  return "Unpaid";
}

function formatDate(value) {
  if (!value) return "Not set";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
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

  return `fee-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// ========================================
// UI COMPONENTS
// ========================================

function StatusBadge({ status }) {
  const styles = {
    Paid: "bg-emerald-50 text-emerald-700",
    Partial: "bg-amber-50 text-amber-700",
    Unpaid: "bg-rose-50 text-rose-700",
    Invalid: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] || styles.Invalid
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[#718579]">
            {title}
          </p>

          <h3 className="mt-3 break-words text-2xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={22} />
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

export default function AccountsStudentFees() {
  
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function refreshFees() {
    setLoading(true);

    try {
      const [feeData, studentData] = await Promise.all([
        getStudentFees(),
        getFinanceStudents(),
      ]);

      const studentRows = Array.isArray(studentData)
        ? studentData
        : [];

      const studentMap = new Map(
        studentRows.map((student) => [
          student.studentId,
          student,
        ])
      );

      const feeRows = (Array.isArray(feeData) ? feeData : [])
        .filter((fee) => fee.status !== "Cancelled")
        .map((fee) => {
          const student = studentMap.get(fee.studentId);

          return {
            ...fee,
            id: String(fee.id || fee._id),
            studentName: fee.studentName,
            department: student?.department || "",
            feeType: fee.title,
            totalAmount: Number(fee.amount || 0),
            paidAmount: Number(fee.paid || 0),
            dueAmount: Number(fee.balance || 0),
          };
        });

      setStudents(studentRows);
      setFees(feeRows);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load fees.");
      setFees([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshFees();
  }, []);


  // ======================================
  // STATISTICS
  // ======================================

  const summary = useMemo(() => {
    return fees.reduce(
      (result, item) => {
        result.total += numeric(
          item.totalAmount
        );

        result.paid += numeric(
          item.paidAmount
        );

        result.due += getDue(item);

        if (getStatus(item) === "Paid") {
          result.completed += 1;
        }

        return result;
      },
      {
        total: 0,
        paid: 0,
        due: 0,
        completed: 0,
      }
    );
  }, [fees]);

  const stats = [
    {
      title: "Total Fee Records",
      value: fees.length,
      subtitle: "Student fee assessments",
      icon: GraduationCap,
    },
    {
      title: "Total Assessed Fees",
      value: money(summary.total),
      subtitle: "Total billed amount",
      icon: Wallet,
    },
    {
      title: "Recorded Paid Amount",
      value: money(summary.paid),
      subtitle: "Paid amount entered in fee records",
      icon: CreditCard,
    },
    {
      title: "Outstanding Balance",
      value: money(summary.due),
      subtitle: "Remaining fee balance",
      icon: AlertCircle,
    },
  ];

  // ======================================
  // FILTERING
  // ======================================

  const filteredFees = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return [...fees]
      .filter((item) => {
        const matchesSearch = [
          item.studentId,
          item.studentName,
          item.department,
          item.semester,
          item.feeType,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query)
        );

        const matchesStatus =
          statusFilter === "All" ||
          getStatus(item) === statusFilter;

        const matchesType =
          typeFilter === "All" ||
          item.feeType === typeFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesType
        );
      })
      .sort((a, b) =>
        String(
          b.updatedAt || b.createdAt || ""
        ).localeCompare(
          String(
            a.updatedAt || a.createdAt || ""
          )
        )
      );
  }, [
    fees,
    search,
    statusFilter,
    typeFilter,
  ]);

  // ======================================
  // CRUD OPERATIONS
  // ======================================

  
  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);

    setForm({
      studentId: item.studentId || "",
      studentName: item.studentName || "",
      department: item.department || "",
      semester: item.semester || "",
      feeType: item.feeType || "Tuition Fee",
      totalAmount: String(item.totalAmount ?? ""),
      paidAmount: String(item.paidAmount ?? 0),
      dueDate: item.dueDate || "",
      notes: item.notes || "",
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (saving) return;

    const studentId = form.studentId.trim().toUpperCase();

    const student = students.find(
      (item) => item.studentId === studentId
    );

    if (!student) {
      setError(
        "Student ID not found. Use an existing Real Student ID."
      );
      return;
    }

    const amount = Number(form.totalAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid fee amount.");
      return;
    }

    if (!form.dueDate) {
      setError("Due Date is required.");
      return;
    }

    const record = {
      studentId,
      title: form.feeType,
      amount,
      semester: form.semester.trim(),
      dueDate: form.dueDate,
      notes: form.notes.trim(),
    };

    setSaving(true);
    setError("");

    try {
      if (editingId) {
        await updateStudentFee(editingId, {
          title: record.title,
          amount: record.amount,
          semester: record.semester,
          dueDate: record.dueDate,
          notes: record.notes,
        });
      } else {
        await createStudentFee(record);
      }

      await refreshFees();

      setFeedback(
        editingId
          ? "Student fee updated in MongoDB."
          : "Student fee created in MongoDB."
      );

      setModalOpen(false);
      setEditingId(null);
    } catch (err) {
      setError(err.message || "Unable to save student fee.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFee(id) {
    if (
      !window.confirm(
        "Cancel this fee record? Fees with payments cannot be cancelled."
      )
    ) {
      return;
    }

    try {
      setError("");

      await updateStudentFee(id, {
        status: "Cancelled",
      });

      await refreshFees();

      setFeedback(
        "Fee cancelled in MongoDB. Audit record preserved."
      );
    } catch (err) {
      setError(err.message || "Unable to cancel fee.");
    }
  }



  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
  }

  // ======================================
  // PAGE
  // ======================================

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            STUDENT FINANCE
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Student Fee Management
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Create, organize, and monitor
            university student fee records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              refreshFees();
              setFeedback(
                "Fee records refreshed."
              );
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
            Add Fee Record
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
            <GraduationCap size={16} />
            ACCOUNTS OFFICER
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            Student Financial Records
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Track assessed fees, recorded
            payments, and outstanding balances
            across university departments.
          </p>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border-[35px] border-white/5" />
      </section>

      {/* SUMMARY CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
          />
        ))}
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={18}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Fees
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
              placeholder="Search student ID, name..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
            aria-label="Filter fee status"
          >
            <option value="All">
              All Statuses
            </option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
            aria-label="Filter fee type"
          >
            <option value="All">
              All Fee Types
            </option>

            {FEE_TYPES.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#718579]">
            Showing {filteredFees.length} of{" "}
            {fees.length} records
          </p>

          <button
            type="button"
            onClick={resetFilters}
            className="text-sm font-bold text-[#234E43] hover:underline"
          >
            Reset Filters
          </button>
        </div>
      </section>

      {/* FEE RECORDS */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Fee Records
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            Student-wise fee assessment and
            balance details
          </p>
        </div>

        {filteredFees.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-5 py-14 text-center">
            <Database
              size={35}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Fee Records Found
            </h3>

            <p className="mt-2 text-sm text-[#718579]">
              Add a fee record or adjust
              your search filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredFees.map((item) => {
              const status = getStatus(item);

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                        <UserRound size={23} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-[#234E43]">
                          {item.studentName}
                        </h3>

                        <p className="mt-1 text-xs text-[#718579]">
                          ID: {item.studentId}
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      status={status}
                    />
                  </div>

                  <div className="mt-5 grid gap-3 rounded-xl bg-[#F6F8F3] p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#718579]">
                        Department
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#234E43]">
                        {item.department}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Semester
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#234E43]">
                        {item.semester}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Fee Type
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#234E43]">
                        {item.feeType}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Due Date
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#234E43]">
                        {formatDate(
                          item.dueDate
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-[#718579]">
                        Total
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#234E43]">
                        {money(
                          item.totalAmount
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Paid
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-700">
                        {money(
                          item.paidAmount
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Due
                      </p>
                      <p className="mt-1 text-sm font-bold text-rose-700">
                        {money(
                          getDue(item)
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E2EADC] pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setViewing(item)
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-4 py-2.5 text-xs font-bold text-white"
                    >
                      <Eye size={15} />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openEdit(item)
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-4 py-2.5 text-xs font-bold text-[#234E43]"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteFee(item.id)
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-600"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="fee-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  ACCOUNTS OFFICER
                </p>

                <h2
                  id="fee-form-title"
                  className="mt-2 text-xl font-bold text-[#234E43]"
                >
                  {editingId !== null
                    ? "Edit Fee Record"
                    : "Add Student Fee"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModalOpen(false)
                }
                aria-label="Close"
                className="rounded-lg bg-[#F6F8F3] p-2 text-[#234E43]"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Student ID *
                  </label>

                  <input
                    required
                    value={form.studentId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        studentId:
                          event.target.value,
                      })
                    }
                    placeholder="e.g. 20260001"
                    className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm outline-none focus:border-[#234E43]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Student Name *
                  </label>

                  <input
                    required
                    value={form.studentName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        studentName:
                          event.target.value,
                      })
                    }
                    placeholder="Full name"
                    className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm outline-none focus:border-[#234E43]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Department *
                  </label>

                  <input
                    required
                    value={form.department}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        department:
                          event.target.value,
                      })
                    }
                    placeholder="e.g. ICT"
                    className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm outline-none focus:border-[#234E43]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Semester *
                  </label>

                  <input
                    required
                    value={form.semester}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        semester:
                          event.target.value,
                      })
                    }
                    placeholder="e.g. Fall 2026"
                    className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm outline-none focus:border-[#234E43]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Fee Type
                  </label>

                  <select
                    value={form.feeType}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        feeType:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                  >
                    {FEE_TYPES.map((type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Due Date
                  </label>

                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        dueDate:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Total Amount (৳) *
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.totalAmount}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        totalAmount:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Recorded Paid (৳)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    readOnly
                    required
                    value={form.paidAmount}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        paidAmount:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[#EAF2E8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#234E43]">
                    Remaining Balance
                  </p>

                  <p className="text-lg font-extrabold text-[#234E43]">
                    {money(
                      Math.max(
                        0,
                        numeric(
                          form.totalAmount
                        ) -
                          numeric(
                            form.paidAmount
                          )
                      )
                    )}
                  </p>
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
                    setForm({
                      ...form,
                      notes:
                        event.target.value,
                    })
                  }
                  placeholder="Optional notes..."
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white hover:bg-[#193B33]"
              >
                <Save size={18} />

                {editingId !== null
                  ? "Save Changes"
                  : "Create Fee Record"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setViewing(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="fee-view-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  STUDENT FEE RECORD
                </p>

                <h2
                  id="fee-view-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {viewing.studentName}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewing(null)
                }
                aria-label="Close"
                className="rounded-lg bg-[#F6F8F3] p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5">
              <StatusBadge
                status={getStatus(viewing)}
              />
            </div>

            <div className="mt-6 space-y-4 rounded-xl bg-[#F6F8F3] p-5">
              {[
                ["Student ID", viewing.studentId],
                ["Department", viewing.department],
                ["Semester", viewing.semester],
                ["Fee Type", viewing.feeType],
                [
                  "Due Date",
                  formatDate(viewing.dueDate),
                ],
                [
                  "Total Amount",
                  money(viewing.totalAmount),
                ],
                [
                  "Recorded Paid",
                  money(viewing.paidAmount),
                ],
                [
                  "Outstanding",
                  money(getDue(viewing)),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-wrap justify-between gap-2 border-b border-[#E2EADC] pb-3 text-sm"
                >
                  <span className="text-[#718579]">
                    {label}
                  </span>

                  <span className="font-bold text-[#234E43]">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {viewing.notes && (
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#607B6C]">
                {viewing.notes}
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                setViewing(null)
              }
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 font-bold text-white"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      {/* INFORMATION */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <Receipt
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Fee records
          are saved in browser localStorage.
          The paid amount is entered manually
          and is not a verified payment transaction.
          Payment reconciliation, invoices,
          refunds, and cross-portal integration
          will be added later.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Accounts Officer — Student Fees
      </p>
    </div>
  );
}
