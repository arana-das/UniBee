
import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Filter,
  CalendarDays,
  UserRound,
  Receipt,
  Database,
  Banknote,
  Smartphone,
  Landmark,
  Hash,
  RotateCcw,
} from "lucide-react";

import {
  getStudentFees,
  getStudentPayments,
  getFinanceStudents,
  createStudentPayment,
  voidStudentPayment,
} from "../../services/financeApi";

// ========================================
// CONFIGURATION
// ========================================

const GREEN = "#234E43";

const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "bKash",
  "Nagad",
  "Rocket",
  "Card",
  "Online Banking",
  "Mobile Banking",
  "Other",
];

const EMPTY_FORM = {
  feeId: "",
  studentId: "",
  studentName: "",
  department: "",
  semester: "",
  feeType: "",
  amount: "",
  paymentMethod: "Cash",
  transactionId: "",
  paymentDate: "",
  notes: "",
};

// ========================================
// UTILITIES
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return text(value).toLowerCase();
}

function amountNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function money(value) {
  return `৳ ${amountNumber(value).toLocaleString(
    "en-BD",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
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
  if (!value) return "—";

  const raw = String(value);

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T12:00:00`
      : raw
  );

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getId(item) {
  return String(item?._id || item?.id || "");
}

function displayMethod(method) {
  return method === "Mobile Banking"
    ? "Mobile Banking"
    : method || "Cash";
}

function normalizeMethod(method) {
  if (
    ["bKash", "Nagad", "Rocket", "Online Banking"]
      .includes(method)
  ) {
    return "Mobile Banking";
  }

  return method;
}

// ========================================
// REUSABLE UI COMPONENTS
// ========================================

function StatusBadge({ status }) {
  const isVoided = status === "Voided";

  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold " +
        (isVoided
          ? "bg-slate-100 text-slate-600"
          : "bg-emerald-50 text-emerald-700")
      }
    >
      {status || "Unknown"}
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
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2EADC] py-3 text-sm last:border-b-0">
      <span className="text-[#718579]">
        {label}
      </span>

      <span className="max-w-[65%] break-words text-right font-semibold text-[#234E43]">
        {value === undefined || value === null || value === ""
          ? "—"
          : value}
      </span>
    </div>
  );
}

function PaymentMethodIcon({ method }) {
  if (
    ["bKash", "Nagad", "Rocket", "Mobile Banking"]
      .includes(method)
  ) {
    return <Smartphone size={19} />;
  }

  if (method === "Cash") {
    return <Banknote size={19} />;
  }

  if (
    ["Bank Transfer", "Online Banking"]
      .includes(method)
  ) {
    return <Landmark size={19} />;
  }

  return <CreditCard size={19} />;
}

// ========================================
// MAIN ACCOUNTS PAYMENTS PAGE
// ========================================

export default function AccountsPayments() {
  const [payments, setPayments] = useState([]);
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voidingId, setVoidingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [methodFilter, setMethodFilter] =
    useState("All");

  const [typeFilter, setTypeFilter] =
    useState("All");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [viewing, setViewing] =
    useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    paymentDate: todayLocal(),
  });

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  // ======================================
  // MONGODB DATA REFRESH
  // ======================================

  async function refreshPayments() {
    setLoading(true);

    try {
      const [
        paymentData,
        feeData,
        studentData,
      ] = await Promise.all([
        getStudentPayments(),
        getStudentFees(),
        getFinanceStudents(),
      ]);

      const feeRows = Array.isArray(feeData)
        ? feeData
        : [];

      const studentRows = Array.isArray(studentData)
        ? studentData
        : [];

      const paymentRows = Array.isArray(paymentData)
        ? paymentData
        : [];

      const feeMap = new Map(
        feeRows.map((fee) => [
          getId(fee),
          fee,
        ])
      );

      const studentMap = new Map(
        studentRows.map((student) => [
          student.studentId,
          student,
        ])
      );

      const normalizedPayments = paymentRows.map(
        (payment) => {
          const fee = feeMap.get(
            String(payment.fee || "")
          );

          const student = studentMap.get(
            payment.studentId
          );

          return {
            ...payment,
            id: getId(payment),

            studentName:
              fee?.studentName ||
              student?.fullName ||
              payment.studentId,

            department:
              student?.department || "",

            semester:
              fee?.semester || "",

            feeType:
              fee?.title || "Other",

            paymentMethod:
              payment.method || "Cash",

            transactionId:
              payment.reference || "",
          };
        }
      );

      setPayments(normalizedPayments);
      setFees(feeRows);
      setStudents(studentRows);
      setError("");
    } catch (err) {
      setPayments([]);
      setFees([]);
      setStudents([]);

      setError(
        err.message ||
        "Could not load payments from MongoDB."
      );

      throw err;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshPayments().catch(() => {});
  }, []);

  // ======================================
  // PAYMENT SUMMARY
  // ======================================

  const summary = useMemo(() => {
    return payments.reduce(
      (result, payment) => {
        result.totalRecords += 1;

        if (payment.status === "Completed") {
          result.completed += 1;
          result.collected +=
            amountNumber(payment.amount);
        }

        if (payment.status === "Voided") {
          result.voided += 1;
        }

        return result;
      },
      {
        totalRecords: 0,
        completed: 0,
        collected: 0,
        voided: 0,
      }
    );
  }, [payments]);

  const stats = [
    {
      title: "Total Transactions",
      value: summary.totalRecords,
      subtitle: "All MongoDB payment records",
      icon: CreditCard,
    },
    {
      title: "Completed Collection",
      value: money(summary.collected),
      subtitle:
        `${summary.completed} completed payments`,
      icon: CheckCircle2,
    },
    {
      title: "Voided Transactions",
      value: summary.voided,
      subtitle:
        "Excluded from collection totals",
      icon: RotateCcw,
    },
    {
      title: "Active Transactions",
      value: summary.completed,
      subtitle:
        "Payments contributing to collected total",
      icon: CheckCircle2,
    },
  ];

  // ======================================
  // FILTERING
  // ======================================

  const feeTypes = useMemo(() => {
    return [
      ...new Set(
        fees
          .map((fee) => fee.title)
          .filter(Boolean)
      ),
    ];
  }, [fees]);

  const filteredPayments = useMemo(() => {
    const query = norm(search);

    return payments
      .filter((item) => {
        const matchesSearch = [
          item.studentId,
          item.studentName,
          item.department,
          item.semester,
          item.transactionId,
          item.feeType,
        ].some((value) =>
          norm(value).includes(query)
        );

        const matchesStatus =
          statusFilter === "All" ||
          item.status === statusFilter;

        const matchesMethod =
          methodFilter === "All" ||
          item.paymentMethod === methodFilter;

        const matchesType =
          typeFilter === "All" ||
          item.feeType === typeFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesMethod &&
          matchesType
        );
      })
      .sort((a, b) => {
        const dateA = String(
          a.paymentDate || a.createdAt || ""
        );

        const dateB = String(
          b.paymentDate || b.createdAt || ""
        );

        return dateB.localeCompare(dateA);
      });
  }, [
    payments,
    search,
    statusFilter,
    methodFilter,
    typeFilter,
  ]);

  // ======================================
  // FORM ACTIONS
  // ======================================

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setMethodFilter("All");
    setTypeFilter("All");
  }

  function openCreate() {
    setForm({
      ...EMPTY_FORM,
      paymentDate: todayLocal(),
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function selectFee(feeId) {
    const fee = fees.find(
      (item) => getId(item) === feeId
    );

    const student = students.find(
      (item) =>
        item.studentId === fee?.studentId
    );

    setForm((previous) => ({
      ...previous,
      feeId,

      studentId:
        fee?.studentId || "",

      studentName:
        fee?.studentName || "",

      department:
        student?.department || "",

      semester:
        fee?.semester || "",

      feeType:
        fee?.title || "",

      amount: "",
    }));
  }

  // ======================================
  // CREATE MONGODB PAYMENT
  // ======================================

  async function handleSave(event) {
    event.preventDefault();

    if (saving) return;

    setError("");

    const selectedFee = fees.find(
      (fee) =>
        getId(fee) === form.feeId
    );

    if (!selectedFee) {
      setError(
        "Please select a valid Student Fee."
      );
      return;
    }

    if (selectedFee.status !== "Active") {
      setError(
        "The selected fee is not active."
      );
      return;
    }

    const amount = Number(form.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Please enter a valid payment amount."
      );
      return;
    }

    if (
      amount >
      Number(selectedFee.balance || 0)
    ) {
      setError(
        "Payment cannot exceed outstanding balance."
      );
      return;
    }

    if (!form.paymentDate) {
      setError("Payment date is required.");
      return;
    }

    setSaving(true);

    try {
      await createStudentPayment({
        feeId: form.feeId,
        amount,
        method: normalizeMethod(
          form.paymentMethod
        ),
        reference:
          form.transactionId.trim(),
        paymentDate:
          form.paymentDate,
        notes:
          form.notes.trim(),
      });

      await refreshPayments();

      setModalOpen(false);

      setFeedback(
        "Payment saved successfully to MongoDB."
      );
    } catch (err) {
      setError(
        err.message ||
        "Payment could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  // ======================================
  // VOID MONGODB PAYMENT
  // ======================================

  async function handleVoid(item) {
    if (item.status === "Voided") {
      return;
    }

    const confirmed = window.confirm(
      `Void this ${money(item.amount)} payment for ${item.studentName}?\n\n` +
      "The payment record will remain in MongoDB, " +
      "but it will no longer count toward collected fees."
    );

    if (!confirmed) return;

    setVoidingId(item.id);
    setError("");
    setFeedback("");

    try {
      await voidStudentPayment(item.id);

      await refreshPayments();

      setFeedback(
        "Payment voided in MongoDB. " +
        "Outstanding fee balance recalculated."
      );
    } catch (err) {
      setError(
        err.message ||
        "Could not void the payment."
      );
    } finally {
      setVoidingId(null);
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
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            FINANCIAL OPERATIONS
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Payment Records
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Record student payments, monitor transactions
            and track fee collections across the university.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              refreshPayments()
                .then(() =>
                  setFeedback(
                    "Payment records refreshed from MongoDB."
                  )
                )
                .catch(() => {});
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] hover:bg-[#F1F7EF] disabled:opacity-50"
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
            Add Payment
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

          <button
            type="button"
            onClick={() => setFeedback("")}
            className="ml-auto"
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
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

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
            <CreditCard size={16} />
            ACCOUNTS OFFICER
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            Student Payment Management
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Keep student payment records organized,
            track completed collections and maintain
            a clear financial transaction history.
          </p>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border-[35px] border-white/5" />
      </section>

      {/* SUMMARY */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
          />
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
            Search & Filter Payments
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
              placeholder="Student ID, name, transaction..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Statuses
            </option>

            <option value="Completed">
              Completed
            </option>

            <option value="Voided">
              Voided
            </option>
          </select>

          <select
            value={methodFilter}
            onChange={(event) =>
              setMethodFilter(event.target.value)
            }
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Payment Methods
            </option>

            {PAYMENT_METHODS.map((method) => (
              <option
                key={method}
                value={method}
              >
                {method}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Fee Types
            </option>

            {feeTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#718579]">
            Showing {filteredPayments.length} of{" "}
            {payments.length} records
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

      {/* TRANSACTION RECORDS */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Transaction Records
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            Student-wise MongoDB payment records
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-5 py-12 text-center text-[#718579]">
            Loading payments from MongoDB...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-5 py-14 text-center">
            <Database
              size={35}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Payment Records Found
            </h3>

            <p className="mt-2 text-sm text-[#718579]">
              Add a payment record or adjust your filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredPayments.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                {/* STUDENT */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                      <UserRound size={22} />
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
                    status={item.status}
                  />
                </div>

                {/* PAYMENT INFORMATION */}
                <div className="mt-5 grid gap-3 rounded-xl bg-[#F6F8F3] p-4 sm:grid-cols-2">

                  <div>
                    <p className="text-xs text-[#718579]">
                      Payment Amount
                    </p>

                    <p className="mt-1 text-lg font-extrabold text-[#234E43]">
                      {money(item.amount)}
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
                      Payment Method
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#234E43]">
                      <PaymentMethodIcon
                        method={item.paymentMethod}
                      />

                      {displayMethod(item.paymentMethod)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Payment Date
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#234E43]">
                      <CalendarDays size={15} />

                      {formatDate(item.paymentDate)}
                    </p>
                  </div>
                </div>

                {/* REFERENCE */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#718579]">
                  <Hash size={15} />

                  <span className="break-all">
                    Transaction:{" "}
                    {item.transactionId || "Not provided"}
                  </span>
                </div>

                {/* ACTION BUTTONS */}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E2EADC] pt-4">

                  <button
                    type="button"
                    onClick={() => setViewing(item)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <Eye size={15} />
                    View
                  </button>

                  <button
                    type="button"
                    disabled
                    title="Completed payments cannot be edited. Void and re-record an incorrect payment."
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43] opacity-40"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVoid(item)}
                    disabled={
                      item.status === "Voided" ||
                      voidingId === item.id
                    }
                    title={
                      item.status === "Voided"
                        ? "Already voided"
                        : "Void this payment in MongoDB"
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={15} />

                    {voidingId === item.id
                      ? "Voiding..."
                      : "Void"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ADD PAYMENT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  ACCOUNTS OFFICER
                </p>

                <h2
                  id="payment-form-title"
                  className="mt-2 text-xl font-bold text-[#234E43]"
                >
                  Add Payment
                </h2>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
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
              {/* FEE SELECTOR */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Select Student Fee (MongoDB) *
                </label>

                <select
                  required
                  value={form.feeId}
                  onChange={(event) =>
                    selectFee(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                >
                  <option value="">
                    Select an unpaid or partially paid fee
                  </option>

                  {fees
                    .filter(
                      (fee) =>
                        fee.status === "Active" &&
                        Number(fee.balance) > 0
                    )
                    .map((fee) => (
                      <option
                        key={getId(fee)}
                        value={getId(fee)}
                      >
                        {fee.studentId} — {fee.studentName}
                        {" — "}
                        {fee.title}
                        {" — Due "}
                        {money(fee.balance)}
                      </option>
                    ))}
                </select>
              </div>

              {/* STUDENT DETAILS */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <UserRound size={19} />
                  Student Details
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">

                  {[
                    {
                      label: "Student ID",
                      field: "studentId",
                    },
                    {
                      label: "Student Name",
                      field: "studentName",
                    },
                    {
                      label: "Department",
                      field: "department",
                    },
                    {
                      label: "Semester",
                      field: "semester",
                    },
                  ].map((item) => (
                    <div key={item.field}>
                      <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                        {item.label}
                      </label>

                      <input
                        readOnly
                        value={form[item.field]}
                        className="w-full rounded-xl border border-[#E2EADC] bg-slate-50 p-3 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* PAYMENT DETAILS */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <Receipt size={19} />
                  Payment Details
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Fee Type
                    </label>

                    <input
                      readOnly
                      value={form.feeType}
                      className="w-full rounded-xl border border-[#E2EADC] bg-slate-50 p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Amount (৳) *
                    </label>

                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={(event) =>
                        updateForm(
                          "amount",
                          event.target.value
                        )
                      }
                      placeholder="0.00"
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
                        updateForm(
                          "paymentMethod",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option
                          key={method}
                          value={method}
                        >
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Payment Date *
                    </label>

                    <input
                      type="date"
                      required
                      value={form.paymentDate}
                      onChange={(event) =>
                        updateForm(
                          "paymentDate",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Transaction Reference
                    </label>

                    <input
                      value={form.transactionId}
                      onChange={(event) =>
                        updateForm(
                          "transactionId",
                          event.target.value
                        )
                      }
                      placeholder="Transaction / receipt ID"
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Transaction Status
                    </label>

                    <input
                      readOnly
                      value="Completed"
                      className="w-full rounded-xl border border-[#E2EADC] bg-slate-50 p-3 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* NOTES */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Notes
                </label>

                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    updateForm(
                      "notes",
                      event.target.value
                    )
                  }
                  placeholder="Optional payment information..."
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
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white hover:bg-[#193B33] disabled:opacity-50"
              >
                <Save size={18} />

                {saving
                  ? "Saving..."
                  : "Create Payment Record"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* PAYMENT DETAILS MODAL */}
      {viewing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setViewing(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-view-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  PAYMENT TRANSACTION
                </p>

                <h2
                  id="payment-view-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {viewing.studentName}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close"
                className="rounded-lg bg-[#F6F8F3] p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5">
              <StatusBadge
                status={viewing.status}
              />
            </div>

            <div className="mt-6 rounded-xl bg-[#F6F8F3] px-5">

              <DetailRow
                label="Student ID"
                value={viewing.studentId}
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
                label="Amount"
                value={money(viewing.amount)}
              />

              <DetailRow
                label="Payment Method"
                value={viewing.paymentMethod}
              />

              <DetailRow
                label="Payment Date"
                value={formatDate(
                  viewing.paymentDate
                )}
              />

              <DetailRow
                label="Transaction Reference"
                value={
                  viewing.transactionId ||
                  "Not provided"
                }
              />

              <DetailRow
                label="Status"
                value={viewing.status}
              />
            </div>

            {viewing.notes && (
              <div className="mt-5 rounded-xl border border-[#E2EADC] p-4">
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
        <AlertCircle
          size={18}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>MongoDB-backed payment records:</strong>{" "}
          Payments entered here are accounting records,
          not independent verification of bank or mobile
          payment settlement. Completed payments affect
          student fee balances automatically. Incorrect
          payments should be voided and recorded again.
          Voided transactions remain in the audit history.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Accounts Officer — Payment Records
      </p>
    </div>
  );
}
