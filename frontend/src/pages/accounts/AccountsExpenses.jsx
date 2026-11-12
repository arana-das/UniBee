
import { useEffect, useMemo, useState } from "react";
import {
  HandCoins,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Filter,
  RotateCcw,
  Database,
  Wallet,
  CreditCard,
  CalendarDays,
  FileText,
  Building2,
  Receipt,
  TrendingUp,
  Banknote,
  BadgeCheck,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const STORAGE_KEY = "unibee-accounts-expenses-v1";

const CATEGORIES = [
  "Office Supplies",
  "Laboratory Equipment",
  "Maintenance & Repairs",
  "Utilities",
  "IT & Software",
  "Library Resources",
  "Academic Events",
  "Research Expenses",
  "Transportation",
  "Administrative Expenses",
  "Other",
];

const DEPARTMENTS = [
  "Accounts & Finance",
  "Administration",
  "ICT",
  "CSE",
  "EEE",
  "Business Administration",
  "English",
  "Law",
  "Library",
  "Examination Office",
  "Research Office",
  "Other",
];

const APPROVAL_STATUSES = [
  "Pending",
  "Under Review",
  "Approved",
  "Rejected",
  "Cancelled",
];

const PAYMENT_STATUSES = [
  "Unpaid",
  "Partially Paid",
  "Paid",
];

const PAYMENT_METHODS = [
  "Bank Transfer",
  "Cash",
  "Card",
  "Mobile Banking",
  "Cheque",
  "Other",
];

const EMPTY_FORM = {
  expenseTitle: "",
  category: "Office Supplies",
  department: "Accounts & Finance",
  vendor: "",
  expenseDate: "",
  description: "",
  amount: "",
  allocatedBudget: "",
  approvalStatus: "Pending",
  paymentStatus: "Unpaid",
  paidAmount: "0",
  paymentMethod: "Bank Transfer",
  paymentReference: "",
  paymentDate: "",
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

  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function generateId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `expense-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function generateExpenseNumber() {
  return `EXP-${new Date().getFullYear()}-${Date.now()
    .toString(36)
    .toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

function loadExpenses() {
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

function getBalance(record) {
  return Math.max(
    0,
    numeric(record.amount) -
      numeric(record.paidAmount)
  );
}

function getPaymentStatus(record) {
  const total = numeric(record.amount);
  const paid = numeric(record.paidAmount);

  if (total <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  if (paid > 0) return "Partially Paid";

  return "Unpaid";
}

function getBudgetVariance(record) {
  const budget = numeric(record.allocatedBudget);

  if (
    record.allocatedBudget === "" ||
    record.allocatedBudget === null ||
    record.allocatedBudget === undefined
  ) {
    return null;
  }

  return budget - numeric(record.amount);
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-amber-50 text-amber-700",
    "Under Review": "bg-blue-50 text-blue-700",
    Approved: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-rose-50 text-rose-700",
    Cancelled: "bg-slate-100 text-slate-600",
    Paid: "bg-emerald-50 text-emerald-700",
    "Partially Paid": "bg-amber-50 text-amber-700",
    Unpaid: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[#718579]">
            {title}
          </p>

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
      <span className="text-[#718579]">
        {label}
      </span>

      <span className="max-w-[65%] break-words text-right font-semibold text-[#234E43]">
        {value === null ||
        value === undefined ||
        value === ""
          ? "—"
          : value}
      </span>
    </div>
  );
}

// ========================================
// MAIN EXPENSE MANAGEMENT
// ========================================

export default function AccountsExpenses() {
  const [expenses, setExpenses] =
    useState(loadExpenses);

  const [search, setSearch] = useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [approvalFilter, setApprovalFilter] =
    useState("All");

  const [paymentFilter, setPaymentFilter] =
    useState("All");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [viewing, setViewing] =
    useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    expenseDate: todayLocal(),
  });

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  // ======================================
  // REFRESH DATA
  // ======================================

  useEffect(() => {
    function refresh() {
      setExpenses(loadExpenses());
    }

    function onVisible() {
      if (
        document.visibilityState === "visible"
      ) {
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
      window.removeEventListener(
        "storage",
        refresh
      );

      window.removeEventListener(
        "focus",
        refresh
      );

      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  // ======================================
  // SUMMARY
  // ======================================

  const summary = useMemo(() => {
    return expenses.reduce(
      (result, expense) => {
        const total = numeric(expense.amount);
        const paid = numeric(expense.paidAmount);

        result.totalRecords += 1;
        result.requestedAmount += total;

        if (expense.approvalStatus === "Approved") {
          result.approvedCount += 1;
          result.approvedAmount += total;
          result.recordedPaid += paid;
          result.remainingPayable +=
            getBalance(expense);
        }

        if (
          ["Pending", "Under Review"].includes(
            expense.approvalStatus
          )
        ) {
          result.awaitingApproval += 1;
        }

        return result;
      },
      {
        totalRecords: 0,
        requestedAmount: 0,
        approvedCount: 0,
        approvedAmount: 0,
        recordedPaid: 0,
        remainingPayable: 0,
        awaitingApproval: 0,
      }
    );
  }, [expenses]);

  const stats = [
    {
      title: "Total Expense Requests",
      value: summary.totalRecords,
      description: "All submitted expense records",
      icon: HandCoins,
    },
    {
      title: "Approved Expenses",
      value: money(summary.approvedAmount),
      description: `${summary.approvedCount} approved records`,
      icon: BadgeCheck,
    },
    {
      title: "Recorded Payments",
      value: money(summary.recordedPaid),
      description: "Amounts entered against approved expenses",
      icon: CreditCard,
    },
    {
      title: "Remaining Payable",
      value: money(summary.remainingPayable),
      description: `${summary.awaitingApproval} requests awaiting approval`,
      icon: Wallet,
    },
  ];

  // ======================================
  // FILTERING
  // ======================================

  const filteredExpenses = useMemo(() => {
    const query = norm(search);

    return [...expenses]
      .filter((record) => {
        const matchesSearch = [
          record.expenseNumber,
          record.expenseTitle,
          record.category,
          record.department,
          record.vendor,
          record.description,
          record.paymentReference,
        ].some((value) =>
          norm(value).includes(query)
        );

        const matchesCategory =
          categoryFilter === "All" ||
          record.category === categoryFilter;

        const matchesApproval =
          approvalFilter === "All" ||
          record.approvalStatus === approvalFilter;

        const matchesPayment =
          paymentFilter === "All" ||
          getPaymentStatus(record) ===
            paymentFilter;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesApproval &&
          matchesPayment
        );
      })
      .sort((a, b) =>
        text(
          b.expenseDate || b.createdAt
        ).localeCompare(
          text(a.expenseDate || a.createdAt)
        )
      );
  }, [
    expenses,
    search,
    categoryFilter,
    approvalFilter,
    paymentFilter,
  ]);

  // ======================================
  // STORAGE OPERATIONS
  // ======================================

  function persist(next) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      setExpenses(next);
      setError("");

      return true;
    } catch {
      setError(
        "Unable to save expense records in browser storage."
      );

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
      expenseDate: todayLocal(),
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditingId(record.id);

    setForm({
      expenseTitle: text(record.expenseTitle),
      category: record.category || "Other",
      department:
        record.department || "Accounts & Finance",
      vendor: text(record.vendor),
      expenseDate:
        record.expenseDate || todayLocal(),
      description: text(record.description),
      amount: String(record.amount ?? ""),
      allocatedBudget:
        record.allocatedBudget === null ||
        record.allocatedBudget === undefined
          ? ""
          : String(record.allocatedBudget),
      approvalStatus:
        record.approvalStatus || "Pending",
      paymentStatus:
        getPaymentStatus(record),
      paidAmount:
        String(record.paidAmount ?? 0),
      paymentMethod:
        record.paymentMethod || "Bank Transfer",
      paymentReference:
        text(record.paymentReference),
      paymentDate:
        record.paymentDate || "",
      notes: text(record.notes),
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ======================================
  // CREATE / EDIT EXPENSE
  // ======================================

  function handleSave(event) {
    event.preventDefault();

    const total = Number(form.amount);
    const paid = Number(form.paidAmount);

    const budget =
      form.allocatedBudget.trim() === ""
        ? null
        : Number(form.allocatedBudget);

    if (!form.expenseTitle.trim()) {
      setError("Expense title is required.");
      return;
    }

    if (!form.expenseDate) {
      setError("Please select an expense date.");
      return;
    }

    if (
      form.amount.trim() === "" ||
      !Number.isFinite(total) ||
      total <= 0
    ) {
      setError(
        "Expense amount must be greater than zero."
      );
      return;
    }

    if (
      budget !== null &&
      (!Number.isFinite(budget) || budget < 0)
    ) {
      setError(
        "Allocated budget must be zero or greater."
      );
      return;
    }

    if (
      form.paidAmount.trim() === "" ||
      !Number.isFinite(paid) ||
      paid < 0 ||
      paid > total
    ) {
      setError(
        "Paid amount must be between zero and the expense amount."
      );
      return;
    }

    if (
      form.approvalStatus !== "Approved" &&
      paid > 0
    ) {
      setError(
        "An expense must be approved before a payment amount can be recorded."
      );
      return;
    }

    if (paid > 0 && !form.paymentDate) {
      setError(
        "Payment date is required when a paid amount is recorded."
      );
      return;
    }

    if (
      paid > 0 &&
      !form.paymentReference.trim()
    ) {
      setError(
        "A payment reference is required when recording a payment."
      );
      return;
    }

    if (
      paid > 0 &&
      form.paymentDate < form.expenseDate
    ) {
      setError(
        "Payment date cannot be earlier than the expense date."
      );
      return;
    }

    const now = new Date().toISOString();

    const values = {
      expenseTitle: form.expenseTitle.trim(),
      category: form.category,
      department: form.department,
      vendor: form.vendor.trim(),
      expenseDate: form.expenseDate,
      description: form.description.trim(),
      amount: total,
      allocatedBudget: budget,
      approvalStatus: form.approvalStatus,
      paymentStatus:
        paid >= total
          ? "Paid"
          : paid > 0
          ? "Partially Paid"
          : "Unpaid",
      paidAmount: paid,
      paymentMethod: form.paymentMethod,
      paymentReference:
        paid > 0
          ? form.paymentReference.trim()
          : "",
      paymentDate:
        paid > 0 ? form.paymentDate : "",
      notes: form.notes.trim(),
      updatedAt: now,
    };

    const next =
      editingId !== null
        ? expenses.map((record) =>
            record.id === editingId
              ? { ...record, ...values }
              : record
          )
        : [
            {
              id: generateId(),
              expenseNumber:
                generateExpenseNumber(),
              ...values,
              createdAt: now,
            },
            ...expenses,
          ];

    if (persist(next)) {
      setModalOpen(false);

      setFeedback(
        editingId !== null
          ? "Expense record updated successfully."
          : "Expense request created successfully."
      );

      setEditingId(null);
    }
  }

  // ======================================
  // APPROVAL ACTIONS
  // ======================================

  function changeApproval(record, status) {
    if (
      !window.confirm(
        `Change expense approval status to ${status}?`
      )
    ) {
      return;
    }

    if (
      status !== "Approved" &&
      numeric(record.paidAmount) > 0
    ) {
      setError(
        "This expense has a recorded payment. Remove or reconcile that payment before changing its approval status."
      );
      return;
    }

    const now = new Date().toISOString();

    const next = expenses.map((item) =>
      item.id === record.id
        ? {
            ...item,
            approvalStatus: status,
            updatedAt: now,
          }
        : item
    );

    if (persist(next)) {
      setFeedback(
        `Expense status changed to ${status}.`
      );
    }
  }

  // ======================================
  // DELETE
  // ======================================

  function deleteRecord(id) {
    const record = expenses.find(
      (item) => item.id === id
    );

    if (
      record &&
      numeric(record.paidAmount) > 0
    ) {
      setError(
        "This expense has a recorded payment. Paid expense records cannot be deleted directly in this prototype."
      );
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete this expense record?"
      )
    ) {
      return;
    }

    const next = expenses.filter(
      (item) => item.id !== id
    );

    if (persist(next)) {
      setFeedback(
        "Expense record deleted successfully."
      );
    }
  }

  function resetFilters() {
    setSearch("");
    setCategoryFilter("All");
    setApprovalFilter("All");
    setPaymentFilter("All");
  }

  // ======================================
  // CATEGORY SUMMARY
  // ======================================

  const categorySummary = useMemo(() => {
    const result = new Map();

    expenses
      .filter(
        (item) =>
          item.approvalStatus === "Approved"
      )
      .forEach((item) => {
        const category =
          item.category || "Other";

        result.set(
          category,
          (result.get(category) || 0) +
            numeric(item.amount)
        );
      });

    return Array.from(result, ([name, value]) => ({
      name,
      value,
    })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const highestCategory =
    categorySummary[0]?.value || 0;

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
            Expense Management
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Manage university expense requests,
            approvals, budgets, and recorded
            payments.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setExpenses(loadExpenses());
              setFeedback(
                "Expense records refreshed."
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
            Add Expense
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
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
            <HandCoins size={16} />
            ACCOUNTS OFFICER
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            University Expense Control
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Review spending requests, compare
            expense amounts against allocated
            budgets, and maintain financial
            records in one organized workspace.
          </p>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border-[35px] border-white/5" />
      </section>

      {/* SUMMARY CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard
            key={item.title}
            {...item}
          />
        ))}
      </section>

      {/* CATEGORY BREAKDOWN */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <TrendingUp
            size={20}
            className="text-[#234E43]"
          />

          <h2 className="text-lg font-bold text-[#234E43]">
            Approved Expenses by Category
          </h2>
        </div>

        {categorySummary.length === 0 ? (
          <div className="py-10 text-center">
            <Database
              size={29}
              className="mx-auto text-[#A6C1A4]"
            />

            <p className="mt-3 text-sm text-[#718579]">
              No approved expenses available
              for category analysis.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {categorySummary.map((item) => (
              <div key={item.name}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#234E43]">
                    {item.name}
                  </span>

                  <span className="text-sm font-bold text-[#234E43]">
                    {money(item.value)}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#EAF2E8]">
                  <div
                    className="h-full rounded-full bg-[#D9A536]"
                    style={{
                      width: `${
                        highestCategory > 0
                          ? (item.value /
                              highestCategory) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={18}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Expenses
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              placeholder="Expense title, vendor, ID..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
            aria-label="Filter expense category"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Categories
            </option>

            {CATEGORIES.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>

          <select
            value={approvalFilter}
            onChange={(event) =>
              setApprovalFilter(event.target.value)
            }
            aria-label="Filter approval status"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Approval Statuses
            </option>

            {APPROVAL_STATUSES.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(event) =>
              setPaymentFilter(event.target.value)
            }
            aria-label="Filter payment status"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Payment Statuses
            </option>

            {PAYMENT_STATUSES.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#718579]">
            Showing {filteredExpenses.length} of{" "}
            {expenses.length} expense records
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

      {/* EXPENSE RECORDS */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Expense Records
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            University spending requests
            and expense tracking
          </p>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-6 py-14 text-center">
            <Database
              size={36}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Expense Records Found
            </h3>

            <p className="mt-2 text-sm text-[#718579]">
              Add an expense record or
              adjust the search filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredExpenses.map((record) => {
              const variance =
                getBudgetVariance(record);

              return (
                <article
                  key={record.id}
                  className="flex flex-col rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  {/* TITLE */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0 rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                        <HandCoins size={22} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words font-bold text-[#234E43]">
                          {record.expenseTitle}
                        </h3>

                        <p className="mt-1 text-xs text-[#718579]">
                          {record.expenseNumber}
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      status={record.approvalStatus}
                    />
                  </div>

                  {/* EXPENSE DETAILS */}
                  <div className="mt-5 grid gap-3 rounded-xl bg-[#F6F8F3] p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#718579]">
                        Category
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#234E43]">
                        {record.category}
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
                        Vendor
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#234E43]">
                        {record.vendor || "Not specified"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Expense Date
                      </p>

                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#234E43]">
                        <CalendarDays size={15} />
                        {formatDate(record.expenseDate)}
                      </p>
                    </div>
                  </div>

                  {/* AMOUNTS */}
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-[#718579]">
                        Expense
                      </p>

                      <p className="mt-1 break-words text-sm font-bold text-[#234E43]">
                        {money(record.amount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Paid
                      </p>

                      <p className="mt-1 break-words text-sm font-bold text-emerald-700">
                        {money(record.paidAmount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Payable
                      </p>

                      <p className="mt-1 break-words text-sm font-bold text-rose-700">
                        {money(getBalance(record))}
                      </p>
                    </div>
                  </div>

                  {/* BUDGET */}
                  {variance !== null && (
                    <div
                      className={`mt-4 rounded-xl p-3 text-xs ${
                        variance >= 0
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      <strong>
                        Allocated Budget:{" "}
                        {money(record.allocatedBudget)}
                      </strong>

                      <p className="mt-1">
                        {variance >= 0
                          ? `Within allocation by ${money(variance)}`
                          : `Exceeds allocation by ${money(
                              Math.abs(variance)
                            )}`}
                      </p>
                    </div>
                  )}

                  {/* STATUS */}
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#E2EADC] p-3">
                    <span className="text-xs font-semibold text-[#718579]">
                      Payment Status
                    </span>

                    <StatusBadge
                      status={getPaymentStatus(record)}
                    />
                  </div>

                  {/* ACTIONS */}
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-[#E2EADC] pt-4">
                    <button
                      type="button"
                      onClick={() => setViewing(record)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-bold text-white"
                    >
                      <Eye size={15} />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(record)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    {["Pending", "Under Review"].includes(
                      record.approvalStatus
                    ) && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            changeApproval(record, "Approved")
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700"
                        >
                          <CheckCircle2 size={15} />
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            changeApproval(record, "Rejected")
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-700"
                        >
                          <AlertCircle size={15} />
                          Reject
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteRecord(record.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-600"
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
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  ACCOUNTS OFFICER
                </p>

                <h2
                  id="expense-form-title"
                  className="mt-2 text-xl font-bold text-[#234E43]"
                >
                  {editingId !== null
                    ? "Edit Expense Record"
                    : "Create Expense Record"}
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

            <form onSubmit={handleSave} className="space-y-6">
              {/* GENERAL DETAILS */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <Building2 size={19} />
                  General Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Expense Title *
                    </label>

                    <input
                      required
                      value={form.expenseTitle}
                      onChange={(event) =>
                        updateField(
                          "expenseTitle",
                          event.target.value
                        )
                      }
                      placeholder="e.g. Laboratory equipment purchase"
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Expense Category
                    </label>

                    <select
                      value={form.category}
                      onChange={(event) =>
                        updateField(
                          "category",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Department
                    </label>

                    <select
                      value={form.department}
                      onChange={(event) =>
                        updateField(
                          "department",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      {DEPARTMENTS.map((department) => (
                        <option
                          key={department}
                          value={department}
                        >
                          {department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Vendor / Supplier
                    </label>

                    <input
                      value={form.vendor}
                      onChange={(event) =>
                        updateField(
                          "vendor",
                          event.target.value
                        )
                      }
                      placeholder="Vendor name"
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Expense Date *
                    </label>

                    <input
                      required
                      type="date"
                      value={form.expenseDate}
                      onChange={(event) =>
                        updateField(
                          "expenseDate",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* BUDGET AND APPROVAL */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <Wallet size={19} />
                  Budget & Approval
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Expense Amount (৳) *
                    </label>

                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={(event) =>
                        updateField(
                          "amount",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Allocated Budget (৳)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.allocatedBudget}
                      onChange={(event) =>
                        updateField(
                          "allocatedBudget",
                          event.target.value
                        )
                      }
                      placeholder="Optional"
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Approval Status
                    </label>

                    <select
                      value={form.approvalStatus}
                      onChange={(event) =>
                        updateField(
                          "approvalStatus",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      {APPROVAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BUDGET PREVIEW */}
              {form.allocatedBudget.trim() !== "" && (
                <div className="rounded-xl bg-[#EAF2E8] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[#234E43]">
                      Budget Variance
                    </p>

                    <p className="text-lg font-extrabold text-[#234E43]">
                      {money(
                        numeric(form.allocatedBudget) -
                          numeric(form.amount)
                      )}
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-[#718579]">
                    Positive = within allocation.
                    Negative = over allocation.
                  </p>
                </div>
              )}

              {/* PAYMENT INFORMATION */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <CreditCard size={19} />
                  Payment Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Recorded Paid Amount (৳) *
                    </label>

                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.paidAmount}
                      onChange={(event) =>
                        updateField(
                          "paidAmount",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Payment Method
                    </label>

                    <select
                      value={form.paymentMethod}
                      onChange={(event) =>
                        updateField(
                          "paymentMethod",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Payment Date
                    </label>

                    <input
                      type="date"
                      value={form.paymentDate}
                      onChange={(event) =>
                        updateField(
                          "paymentDate",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Payment Reference
                    </label>

                    <input
                      value={form.paymentReference}
                      onChange={(event) =>
                        updateField(
                          "paymentReference",
                          event.target.value
                        )
                      }
                      placeholder="Receipt / transaction number"
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* PAYMENT PREVIEW */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#EAF2E8] p-4">
                <p className="text-sm font-bold text-[#234E43]">
                  Remaining Payable
                </p>

                <p className="text-xl font-extrabold text-[#234E43]">
                  {money(
                    Math.max(
                      0,
                      numeric(form.amount) -
                        numeric(form.paidAmount)
                    )
                  )}
                </p>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Expense Description
                </label>

                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Explain the purpose of the expense..."
                  className="w-full resize-y rounded-xl border border-[#E2EADC] p-3 text-sm"
                />
              </div>

              {/* NOTES */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Notes
                </label>

                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(event) =>
                    updateField(
                      "notes",
                      event.target.value
                    )
                  }
                  placeholder="Optional review notes..."
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
                  : "Create Expense Record"}
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
            aria-labelledby="expense-view-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  EXPENSE RECORD
                </p>

                <h2
                  id="expense-view-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {viewing.expenseTitle}
                </h2>

                <p className="mt-2 text-xs text-[#718579]">
                  {viewing.expenseNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close details"
                className="rounded-lg bg-[#F6F8F3] p-2 text-[#234E43]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge
                status={viewing.approvalStatus}
              />

              <StatusBadge
                status={getPaymentStatus(viewing)}
              />
            </div>

            <div className="mt-6 rounded-xl bg-[#F6F8F3] px-5">
              <DetailRow
                label="Expense Number"
                value={viewing.expenseNumber}
              />

              <DetailRow
                label="Category"
                value={viewing.category}
              />

              <DetailRow
                label="Department"
                value={viewing.department}
              />

              <DetailRow
                label="Vendor"
                value={viewing.vendor}
              />

              <DetailRow
                label="Expense Date"
                value={formatDate(viewing.expenseDate)}
              />

              <DetailRow
                label="Expense Amount"
                value={money(viewing.amount)}
              />

              <DetailRow
                label="Allocated Budget"
                value={
                  viewing.allocatedBudget === null ||
                  viewing.allocatedBudget === undefined
                    ? "Not specified"
                    : money(viewing.allocatedBudget)
                }
              />

              <DetailRow
                label="Approval Status"
                value={viewing.approvalStatus}
              />

              <DetailRow
                label="Recorded Paid"
                value={money(viewing.paidAmount)}
              />

              <DetailRow
                label="Remaining Payable"
                value={money(getBalance(viewing))}
              />

              <DetailRow
                label="Payment Method"
                value={viewing.paymentMethod}
              />

              <DetailRow
                label="Payment Date"
                value={formatDate(viewing.paymentDate)}
              />

              <DetailRow
                label="Payment Reference"
                value={viewing.paymentReference}
              />
            </div>

            {viewing.description && (
              <div className="mt-5 rounded-xl border border-[#E2EADC] p-4">
                <p className="text-xs font-bold text-[#234E43]">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#718579]">
                  {viewing.description}
                </p>
              </div>
            )}

            {viewing.notes && (
              <div className="mt-4 rounded-xl border border-[#E2EADC] p-4">
                <p className="text-xs font-bold text-[#234E43]">
                  Notes
                </p>

                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#718579]">
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
          <strong>Frontend Demo:</strong> Expense
          requests, approvals, allocated budgets,
          and manually entered payments are saved
          in browser localStorage. Budget values
          are per-record allocations, not a shared
          university-wide budget. Approval and
          payment records are not independently
          verified. Accounting reconciliation,
          authorization, audit history, and
          backend integration will be implemented
          later.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Accounts Officer — Expense Management
      </p>
    </div>
  );
}
