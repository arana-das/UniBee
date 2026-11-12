
import { useEffect, useMemo, useState } from "react";
import {
  Receipt,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  Save,
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock3,
  FileText,
  Wallet,
  CreditCard,
  Filter,
  RotateCcw,
  Database,
  CalendarDays,
  UserRound,
  Building2,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const STORAGE_KEY = "unibee-accounts-invoices-v1";

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

const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "bKash",
  "Nagad",
  "Rocket",
  "Card",
  "Online Banking",
  "Other",
];

const EMPTY_FORM = {
  invoiceNumber: "",
  studentId: "",
  studentName: "",
  department: "",
  semester: "",
  feeType: "Tuition Fee",
  description: "",
  amount: "",
  paidAmount: "0",
  issueDate: "",
  dueDate: "",
  paymentDate: "",
  paymentMethod: "Cash",
  transactionReference: "",
  notes: "",
};

// ========================================
// UTILITY FUNCTIONS
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

function localToday() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
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

  return `invoice-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function generateInvoiceNumber() {
  const year = new Date().getFullYear();

  const unique = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`.toUpperCase();

  return `INV-${year}-${unique}`;
}

function loadInvoices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            !Array.isArray(item)
        )
      : [];
  } catch {
    return [];
  }
}

function outstanding(record) {
  return Math.max(
    0,
    numeric(record.amount) - numeric(record.paidAmount)
  );
}

function invoiceStatus(record) {
  const total = numeric(record.amount);
  const paid = numeric(record.paidAmount);

  if (total <= 0) return "Invalid";
  if (paid >= total) return "Paid";

  if (
    record.dueDate &&
    record.dueDate < localToday()
  ) {
    return "Overdue";
  }

  if (paid > 0) return "Partial";

  return "Unpaid";
}

// ========================================
// REUSABLE UI COMPONENTS
// ========================================

function StatusBadge({ status }) {
  const styles = {
    Paid: "bg-emerald-50 text-emerald-700",
    Partial: "bg-amber-50 text-amber-700",
    Unpaid: "bg-slate-100 text-slate-700",
    Overdue: "bg-rose-50 text-rose-700",
    Invalid: "bg-slate-100 text-slate-500",
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
        {subtitle}
      </p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2EADC] py-3 text-sm last:border-0">
      <span className="text-[#718579]">
        {label}
      </span>

      <span className="max-w-[65%] break-words text-right font-semibold text-[#234E43]">
        {value ?? "—"}
      </span>
    </div>
  );
}

// ========================================
// MAIN INVOICES PAGE
// ========================================

export default function AccountsInvoices() {
  const [invoices, setInvoices] = useState(loadInvoices);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    issueDate: localToday(),
  });

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // ======================================
  // REFRESH DATA
  // ======================================

  useEffect(() => {
    function refresh() {
      setInvoices(loadInvoices());
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
  // SUMMARY CALCULATIONS
  // ======================================

  const summary = useMemo(() => {
    return invoices.reduce(
      (result, invoice) => {
        const total = numeric(invoice.amount);
        const paid = numeric(invoice.paidAmount);
        const due = outstanding(invoice);

        result.totalInvoices += 1;
        result.billed += total;
        result.recordedPaid += paid;
        result.outstanding += due;

        if (invoiceStatus(invoice) === "Paid") {
          result.paidInvoices += 1;
        }

        if (invoiceStatus(invoice) === "Overdue") {
          result.overdueInvoices += 1;
        }

        return result;
      },
      {
        totalInvoices: 0,
        billed: 0,
        recordedPaid: 0,
        outstanding: 0,
        paidInvoices: 0,
        overdueInvoices: 0,
      }
    );
  }, [invoices]);

  const stats = [
    {
      title: "Total Invoices",
      value: summary.totalInvoices,
      subtitle: "Invoices created",
      icon: Receipt,
    },
    {
      title: "Total Billed",
      value: money(summary.billed),
      subtitle: "Sum of invoice amounts",
      icon: FileText,
    },
    {
      title: "Recorded Payments",
      value: money(summary.recordedPaid),
      subtitle: `${summary.paidInvoices} fully paid invoices`,
      icon: CreditCard,
    },
    {
      title: "Outstanding Balance",
      value: money(summary.outstanding),
      subtitle: `${summary.overdueInvoices} overdue invoices`,
      icon: Wallet,
    },
  ];

  // ======================================
  // SEARCH AND FILTER
  // ======================================

  const filteredInvoices = useMemo(() => {
    const query = norm(search);

    return [...invoices]
      .filter((invoice) => {
        const matchesSearch = [
          invoice.invoiceNumber,
          invoice.studentId,
          invoice.studentName,
          invoice.department,
          invoice.semester,
          invoice.feeType,
          invoice.transactionReference,
        ].some((value) => norm(value).includes(query));

        const matchesStatus =
          statusFilter === "All" ||
          invoiceStatus(invoice) === statusFilter;

        const matchesType =
          typeFilter === "All" ||
          invoice.feeType === typeFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesType
        );
      })
      .sort((a, b) =>
        text(b.issueDate || b.createdAt).localeCompare(
          text(a.issueDate || a.createdAt)
        )
      );
  }, [invoices, search, statusFilter, typeFilter]);

  // ======================================
  // STORAGE ACTIONS
  // ======================================

  function persist(next) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      setInvoices(next);
      setError("");

      return true;
    } catch {
      setError(
        "Unable to save invoices in browser storage."
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
      invoiceNumber: generateInvoiceNumber(),
      issueDate: localToday(),
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(invoice) {
    setEditingId(invoice.id);

    setForm({
      invoiceNumber: text(invoice.invoiceNumber),
      studentId: text(invoice.studentId),
      studentName: text(invoice.studentName),
      department: text(invoice.department),
      semester: text(invoice.semester),
      feeType: invoice.feeType || "Tuition Fee",
      description: text(invoice.description),
      amount: String(invoice.amount ?? ""),
      paidAmount: String(invoice.paidAmount ?? 0),
      issueDate: invoice.issueDate || "",
      dueDate: invoice.dueDate || "",
      paymentDate: invoice.paymentDate || "",
      paymentMethod:
        invoice.paymentMethod || "Cash",
      transactionReference: text(
        invoice.transactionReference
      ),
      notes: text(invoice.notes),
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ======================================
  // SAVE INVOICE
  // ======================================

  function handleSave(event) {
    event.preventDefault();

    const total = Number(form.amount);
    const paid = Number(form.paidAmount);

    if (
      !form.invoiceNumber.trim() ||
      !form.studentId.trim() ||
      !form.studentName.trim() ||
      !form.department.trim() ||
      !form.semester.trim()
    ) {
      setError(
        "Invoice number and all student information are required."
      );
      return;
    }

    if (!form.issueDate) {
      setError("Please select an issue date.");
      return;
    }

    if (
      form.amount.trim() === "" ||
      !Number.isFinite(total) ||
      total <= 0
    ) {
      setError(
        "Invoice amount must be greater than zero."
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
        "Paid amount must be between zero and the invoice amount."
      );
      return;
    }

    if (paid > 0 && !form.paymentDate) {
      setError(
        "A payment date is required when a paid amount is recorded."
      );
      return;
    }

    if (
      form.dueDate &&
      form.dueDate < form.issueDate
    ) {
      setError(
        "Due date cannot be earlier than issue date."
      );
      return;
    }

    const duplicate = invoices.some(
      (invoice) =>
        invoice.id !== editingId &&
        norm(invoice.invoiceNumber) ===
          norm(form.invoiceNumber)
    );

    if (duplicate) {
      setError(
        "This invoice number already exists."
      );
      return;
    }

    const now = new Date().toISOString();

    const values = {
      invoiceNumber: form.invoiceNumber.trim(),
      studentId: form.studentId.trim(),
      studentName: form.studentName.trim(),
      department: form.department.trim(),
      semester: form.semester.trim(),
      feeType: form.feeType,
      description: form.description.trim(),
      amount: total,
      paidAmount: paid,
      dueAmount: Math.max(0, total - paid),
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      paymentDate:
        paid > 0 ? form.paymentDate : "",
      paymentMethod: form.paymentMethod,
      transactionReference:
        form.transactionReference.trim(),
      notes: form.notes.trim(),
      updatedAt: now,
    };

    const next =
      editingId !== null
        ? invoices.map((invoice) =>
            invoice.id === editingId
              ? { ...invoice, ...values }
              : invoice
          )
        : [
            {
              id: generateId(),
              ...values,
              createdAt: now,
            },
            ...invoices,
          ];

    if (persist(next)) {
      setModalOpen(false);
      setEditingId(null);

      setFeedback(
        editingId !== null
          ? "Invoice updated successfully."
          : "Invoice created successfully."
      );
    }
  }

  // ======================================
  // DELETE INVOICE
  // ======================================

  function deleteInvoice(id) {
    if (
      !window.confirm(
        "Are you sure you want to delete this invoice?"
      )
    ) {
      return;
    }

    const next = invoices.filter(
      (invoice) => invoice.id !== id
    );

    if (persist(next)) {
      setFeedback("Invoice deleted successfully.");
    }
  }

  // ======================================
  // PRINT PREVIEW
  // ======================================

  function printInvoice() {
    // Print only the active invoice preview.
    // Print media CSS below hides the rest of
    // the application in the printed output.
    window.print();
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
  }

  const previewStatus = viewing
    ? invoiceStatus(viewing)
    : "";

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7">

      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            FINANCIAL OPERATIONS
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Invoices & Receipts
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Create student invoices, record billed
            amounts, review balances, and generate
            printable invoice or receipt previews.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setInvoices(loadInvoices());
              setFeedback("Invoice records refreshed.");
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
            Create Invoice
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
            <Receipt size={16} />
            ACCOUNTS OFFICER
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            Student Billing & Documentation
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Maintain organized billing records,
            monitor invoice settlement, and prepare
            financial documents from one workspace.
          </p>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border-[35px] border-white/5" />
      </section>

      {/* SUMMARY CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={18}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Invoices
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
              placeholder="Invoice number, student name..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter invoice status"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Overdue">Overdue</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
            aria-label="Filter fee type"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Fee Types</option>

            {FEE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#718579]">
            Showing {filteredInvoices.length} of{" "}
            {invoices.length} invoices
          </p>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#234E43]"
          >
            <RotateCcw size={15} />
            Reset Filters
          </button>
        </div>
      </section>

      {/* INVOICE COLLECTION */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Invoice Records
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            Student billing and payment documentation
          </p>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-6 py-14 text-center">
            <Database
              size={36}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Invoices Found
            </h3>

            <p className="mt-2 text-sm text-[#718579]">
              Create an invoice or adjust your filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredInvoices.map((invoice) => (
              <article
                key={invoice.id}
                className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                      <Receipt size={22} />
                    </div>

                    <div>
                      <h3 className="font-bold text-[#234E43]">
                        {invoice.invoiceNumber}
                      </h3>

                      <p className="mt-1 text-xs text-[#718579]">
                        {invoice.studentName}
                      </p>
                    </div>
                  </div>

                  <StatusBadge
                    status={invoiceStatus(invoice)}
                  />
                </div>

                <div className="mt-5 grid gap-3 rounded-xl bg-[#F6F8F3] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-[#718579]">
                      Student ID
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#234E43]">
                      {invoice.studentId}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Department
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#234E43]">
                      {invoice.department}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Fee Type
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#234E43]">
                      {invoice.feeType}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Due Date
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#234E43]">
                      <CalendarDays size={15} />
                      {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-[#718579]">
                      Billed
                    </p>

                    <p className="mt-1 break-words text-sm font-bold text-[#234E43]">
                      {money(invoice.amount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Paid
                    </p>

                    <p className="mt-1 break-words text-sm font-bold text-emerald-700">
                      {money(invoice.paidAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Due
                    </p>

                    <p className="mt-1 break-words text-sm font-bold text-rose-700">
                      {money(outstanding(invoice))}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E2EADC] pt-4">
                  <button
                    type="button"
                    onClick={() => setViewing(invoice)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <Eye size={15} />
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(invoice)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewing(invoice)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                  >
                    <Printer size={15} />
                    Print
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteInvoice(invoice.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-600"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
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
            aria-labelledby="invoice-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  ACCOUNTS OFFICER
                </p>

                <h2
                  id="invoice-form-title"
                  className="mt-2 text-xl font-bold text-[#234E43]"
                >
                  {editingId !== null
                    ? "Edit Invoice"
                    : "Create Invoice"}
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

            <form
              onSubmit={handleSave}
              className="space-y-5"
            >
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <FileText size={19} />
                  Invoice Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Invoice Number *
                    </label>

                    <input
                      required
                      value={form.invoiceNumber}
                      onChange={(event) =>
                        updateField(
                          "invoiceNumber",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Issue Date *
                    </label>

                    <input
                      type="date"
                      required
                      value={form.issueDate}
                      onChange={(event) =>
                        updateField(
                          "issueDate",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Due Date
                    </label>

                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(event) =>
                        updateField(
                          "dueDate",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Fee Type
                    </label>

                    <select
                      value={form.feeType}
                      onChange={(event) =>
                        updateField(
                          "feeType",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      {FEE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <UserRound size={19} />
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
                        className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <Wallet size={19} />
                  Billing & Payment
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Invoice Amount (৳) *
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
                      Recorded Paid (৳) *
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

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Transaction Reference
                    </label>

                    <input
                      value={form.transactionReference}
                      onChange={(event) =>
                        updateField(
                          "transactionReference",
                          event.target.value
                        )
                      }
                      placeholder="Optional payment reference"
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#EAF2E8] p-4">
                <p className="text-sm font-bold text-[#234E43]">
                  Remaining Balance
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

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Invoice Description
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
                  className="w-full resize-y rounded-xl border border-[#E2EADC] p-3 text-sm"
                />
              </div>

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
                  : "Create Invoice"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* INVOICE / RECEIPT PREVIEW */}
      {viewing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 print:static print:block print:bg-white print:p-0"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewing(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-preview-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8 print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:p-0 print:shadow-none"
            id="accounts-invoice-print"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  UNIBEE UNIVERSITY
                </p>

                <h2
                  id="invoice-preview-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {previewStatus === "Paid"
                    ? "Payment Receipt Preview"
                    : "Student Invoice"}
                </h2>

                <p className="mt-2 text-sm text-[#718579]">
                  {viewing.invoiceNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close preview"
                className="rounded-lg bg-[#F6F8F3] p-2 text-[#234E43] print:hidden"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between border-b border-[#E2EADC] pb-5">
              <div className="flex items-center gap-2 text-sm font-bold text-[#234E43]">
                <Building2 size={20} />
                University Accounts Office
              </div>

              <StatusBadge status={previewStatus} />
            </div>

            <div className="mt-5 rounded-xl bg-[#F6F8F3] px-5 print:bg-white">
              <DetailRow
                label="Invoice Number"
                value={viewing.invoiceNumber}
              />

              <DetailRow
                label="Student ID"
                value={viewing.studentId}
              />

              <DetailRow
                label="Student Name"
                value={viewing.studentName}
              />

              <DetailRow
                label="Department"
                value={viewing.department}
              />

              <DetailRow
                label="Semester"
                value={viewing.semester}
              />

              <DetailRow
                label="Fee Type"
                value={viewing.feeType}
              />

              <DetailRow
                label="Issue Date"
                value={formatDate(viewing.issueDate)}
              />

              <DetailRow
                label="Due Date"
                value={formatDate(viewing.dueDate)}
              />
            </div>

            {viewing.description && (
              <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-[#607B6C]">
                {viewing.description}
              </p>
            )}

            <div className="mt-6 space-y-3 rounded-xl border border-[#E2EADC] p-5">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-[#718579]">
                  Total Billed
                </span>

                <strong className="text-[#234E43]">
                  {money(viewing.amount)}
                </strong>
              </div>

              <div className="flex justify-between gap-3 text-sm">
                <span className="text-[#718579]">
                  Recorded Paid
                </span>

                <strong className="text-emerald-700">
                  {money(viewing.paidAmount)}
                </strong>
              </div>

              <div className="flex justify-between gap-3 border-t border-[#E2EADC] pt-3 text-base">
                <span className="font-bold text-[#234E43]">
                  Remaining Balance
                </span>

                <strong className="text-[#234E43]">
                  {money(outstanding(viewing))}
                </strong>
              </div>
            </div>

            {numeric(viewing.paidAmount) > 0 && (
              <div className="mt-5 rounded-xl bg-[#F6F8F3] px-5">
                <DetailRow
                  label="Payment Date"
                  value={formatDate(viewing.paymentDate)}
                />

                <DetailRow
                  label="Payment Method"
                  value={viewing.paymentMethod}
                />

                <DetailRow
                  label="Transaction Reference"
                  value={
                    viewing.transactionReference ||
                    "Not provided"
                  }
                />
              </div>
            )}

            <div className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800 print:border print:border-gray-200 print:bg-white print:text-gray-700">
              Frontend-generated document preview.
              Payment information is manually entered
              and has not been independently verified.
              This is not an official payment receipt.
            </div>

            <button
              type="button"
              onClick={printInvoice}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] py-3 font-bold text-white print:hidden"
            >
              <Printer size={18} />
              Print / Save as PDF
            </button>
          </section>
        </div>
      )}

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }

          body:has(#accounts-invoice-print) * {
            visibility: hidden !important;
          }

          body:has(#accounts-invoice-print)
          #accounts-invoice-print,
          body:has(#accounts-invoice-print)
          #accounts-invoice-print * {
            visibility: visible !important;
          }

          body:has(#accounts-invoice-print)
          #accounts-invoice-print {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
          }

          body:has(#accounts-invoice-print)
          #accounts-invoice-print button {
            display: none !important;
          }
        }
      `}</style>

      {/* INFORMATION */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <AlertCircle
          size={18}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Invoices and
          manually entered payment amounts are saved
          in browser localStorage. This module does not
          automatically reconcile with Payment Records,
          Student Fees, or Outstanding Dues. Printed
          documents are prototype previews, not verified
          institutional invoices or official receipts.
          Reconciliation, authorization, and official
          document numbering will be implemented later.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Accounts Officer — Invoices & Receipts
      </p>
    </div>
  );
}
