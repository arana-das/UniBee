
import { useEffect, useMemo, useState } from "react";
import {
  FileBarChart2,
  RefreshCw,
  Download,
  CalendarDays,
  CreditCard,
  Wallet,
  BadgePercent,
  HandCoins,
  Receipt,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Clock3,
  TrendingUp,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Database,
  Filter,
  RotateCcw,
  ArrowUpRight,
  Landmark,
  Info,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const STORAGE_KEYS = {
  fees: "unibee-accounts-student-fees-v1",
  payments: "unibee-accounts-payments-v1",
  dues: "unibee-accounts-dues-v1",
  scholarships: "unibee-accounts-scholarships-v1",
  invoices: "unibee-accounts-invoices-v1",
  refunds: "unibee-accounts-refunds-v1",
  expenses: "unibee-accounts-expenses-v1",
};

const PAYMENT_STATUSES = [
  "Completed",
  "Pending",
  "Failed",
  "Cancelled",
];

const COLORS = [
  "#234E43",
  "#D9A536",
  "#5E8B78",
  "#8FB4A0",
  "#B58C58",
  "#A6C1A4",
  "#64748B",
];

// ========================================
// GENERAL UTILITIES
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return text(value).toLowerCase();
}

function numeric(value) {
  if (
    value === null ||
    value === undefined ||
    text(value) === ""
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function money(value) {
  return `৳ ${numeric(value).toLocaleString(
    "en-BD",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
}

function percent(value) {
  return `${numeric(value).toFixed(1)}%`;
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
  if (!value) return "Not available";

  const raw = text(value);

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

function inDateRange(date, from, to) {
  const value = text(date);

  if (!value) return !from && !to;

  const day = value.slice(0, 10);

  if (from && day < from) return false;
  if (to && day > to) return false;

  return true;
}

function isCompleted(status) {
  return [
    "completed",
    "paid",
    "success",
    "successful",
  ].includes(normalized(status));
}

function isApproved(status) {
  return normalized(status) === "approved";
}

function getBalance(record) {
  return Math.max(
    0,
    numeric(
      record.totalAmount ?? record.amount
    ) - numeric(record.paidAmount)
  );
}

function getScholarshipAmount(record) {
  const tuition = Math.max(
    0,
    numeric(record.tuitionAmount)
  );

  const waiver = Math.max(
    0,
    numeric(record.waiverValue)
  );

  if (record.waiverType === "Percentage") {
    return Math.min(
      tuition,
      (tuition * waiver) / 100
    );
  }

  return Math.min(tuition, waiver);
}

// ========================================
// LOCAL STORAGE HELPERS
// ========================================

function readRecords(key) {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return {
        rows: [],
        status: "missing",
      };
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return {
        rows: [],
        status: "invalid",
      };
    }

    return {
      rows: parsed.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          !Array.isArray(item)
      ),
      status: "available",
    };
  } catch {
    return {
      rows: [],
      status: "invalid",
    };
  }
}

function loadAllData() {
  const result = {};

  Object.entries(STORAGE_KEYS).forEach(
    ([name, key]) => {
      result[name] = readRecords(key);
    }
  );

  return result;
}

// ========================================
// CSV EXPORT HELPERS
// ========================================

function escapeCSV(value) {
  const result = String(value ?? "");

  // Prevent spreadsheet formula execution
  // when a CSV is opened in Excel or Sheets.
  const safeValue = /^[\s]*[=+\-@\t\r]/.test(
    result
  )
    ? `'${result}`
    : result;

  return `"${safeValue.replace(/"/g, '""')}"`;
}

function exportCSV(filename, headers, rows) {
  const content = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) =>
      row.map(escapeCSV).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(
    ["\uFEFF", content],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

// ========================================
// REUSABLE UI COMPONENTS
// ========================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
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

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-[#EAF2E8] p-2.5 text-[#234E43]">
        <Icon size={20} />
      </div>

      <div>
        <h2 className="text-lg font-extrabold text-[#234E43]">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-[#718579]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2EADC] py-3 last:border-b-0">
      <p className="text-sm text-[#718579]">
        {label}
      </p>

      <p className="text-sm font-bold text-[#234E43]">
        {value}
      </p>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  total,
  color = "#234E43",
  valueLabel,
}) {
  const width =
    total > 0
      ? Math.min(100, (value / total) * 100)
      : 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#234E43]">
          {label}
        </span>

        <span className="text-xs font-bold text-[#718579]">
          {valueLabel ?? money(value)}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-[#EAF2E8]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${width}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-10 text-center">
      <Database
        size={30}
        className="mx-auto text-[#A6C1A4]"
      />

      <p className="mt-3 text-sm text-[#718579]">
        {message}
      </p>
    </div>
  );
}

function ExportButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D5E3D5] bg-white px-4 py-2.5 text-xs font-bold text-[#234E43] transition hover:bg-[#EAF2E8]"
    >
      <Download size={16} />
      {label}
    </button>
  );
}

// ========================================
// MAIN FINANCIAL REPORTS PAGE
// ========================================

export default function AccountsReports() {
  const [data, setData] = useState(
    loadAllData
  );

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [feedback, setFeedback] =
    useState("");

  const [error, setError] =
    useState("");

  // ======================================
  // AUTO REFRESH
  // ======================================

  useEffect(() => {
    function refresh() {
      setData(loadAllData());
    }

    function onVisible() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        refresh();
      }
    }

    window.addEventListener(
      "storage",
      refresh
    );

    window.addEventListener(
      "focus",
      refresh
    );

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

  function refreshReports() {
    setData(loadAllData());
    setFeedback(
      "Financial reports refreshed."
    );
    setError("");
  }

  function resetDates() {
    setFromDate("");
    setToDate("");
    setError("");
  }

  // ======================================
  // DATASET REFERENCES
  // ======================================

  const fees = data.fees.rows;
  const payments = data.payments.rows;
  const dues = data.dues.rows;
  const scholarships = data.scholarships.rows;
  const invoices = data.invoices.rows;
  const refunds = data.refunds.rows;
  const expenses = data.expenses.rows;

  // Date filtering applies to transactions,
  // refunds and expenses only.
  const filteredPayments = useMemo(
    () =>
      payments.filter((item) =>
        inDateRange(
          item.paymentDate || item.date,
          fromDate,
          toDate
        )
      ),
    [payments, fromDate, toDate]
  );

  const filteredRefunds = useMemo(
    () =>
      refunds.filter((item) =>
        inDateRange(
          item.requestDate,
          fromDate,
          toDate
        )
      ),
    [refunds, fromDate, toDate]
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((item) =>
        inDateRange(
          item.expenseDate,
          fromDate,
          toDate
        )
      ),
    [expenses, fromDate, toDate]
  );

  // ======================================
  // STUDENT FEE REPORT
  // ======================================

  const feeSummary = useMemo(() => {
    const result = {
      records: fees.length,
      assessed: 0,
      paid: 0,
      outstanding: 0,
      fullyPaid: 0,
      partial: 0,
      unpaid: 0,
    };

    fees.forEach((fee) => {
      const total = numeric(
        fee.totalAmount
      );

      const paid = numeric(
        fee.paidAmount
      );

      result.assessed += total;
      result.paid += paid;
      result.outstanding +=
        getBalance(fee);

      if (total > 0 && paid >= total) {
        result.fullyPaid += 1;
      } else if (paid > 0) {
        result.partial += 1;
      } else {
        result.unpaid += 1;
      }
    });

    return result;
  }, [fees]);

  // ======================================
  // PAYMENT REPORT
  // ======================================

  const paymentSummary = useMemo(() => {
    const result = {
      records: filteredPayments.length,
      completed: 0,
      pending: 0,
      failed: 0,
      cancelled: 0,
      collectedAmount: 0,
      pendingAmount: 0,
    };

    filteredPayments.forEach(
      (payment) => {
        const status = normalized(
          payment.status
        );

        const value = numeric(
          payment.amount
        );

        if (isCompleted(status)) {
          result.completed += 1;
          result.collectedAmount += value;
        } else if (status === "pending") {
          result.pending += 1;
          result.pendingAmount += value;
        } else if (status === "failed") {
          result.failed += 1;
        } else if (
          status === "cancelled"
        ) {
          result.cancelled += 1;
        }
      }
    );

    return result;
  }, [filteredPayments]);

  // ======================================
  // DUES REPORT
  // ======================================

  const duesSummary = useMemo(() => {
    let outstanding = 0;
    let overdue = 0;
    let overdueCount = 0;

    const today = todayLocal();

    dues.forEach((record) => {
      const balance = getBalance(
        record
      );

      outstanding += balance;

      if (
        balance > 0 &&
        record.dueDate &&
        record.dueDate < today
      ) {
        overdue += balance;
        overdueCount += 1;
      }
    });

    return {
      records: dues.length,
      outstanding,
      overdue,
      overdueCount,
    };
  }, [dues]);

  // ======================================
  // SCHOLARSHIP REPORT
  // ======================================

  const scholarshipSummary = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let approvedAmount = 0;

    scholarships.forEach((record) => {
      const status = normalized(
        record.status
      );

      if (status === "approved") {
        approved += 1;
        approvedAmount +=
          getScholarshipAmount(
            record
          );
      }

      if (
        status === "pending" ||
        status === "under review"
      ) {
        pending += 1;
      }

      if (status === "rejected") {
        rejected += 1;
      }
    });

    return {
      records: scholarships.length,
      approved,
      pending,
      rejected,
      approvedAmount,
    };
  }, [scholarships]);

  // ======================================
  // REFUND REPORT
  // ======================================

  const refundSummary = useMemo(() => {
    let requested = 0;
    let approved = 0;
    let processed = 0;
    let pendingCount = 0;

    filteredRefunds.forEach((record) => {
      requested += numeric(
        record.requestedAmount
      );

      const status = normalized(
        record.status
      );

      if (status === "approved") {
        approved += numeric(
          record.approvedAmount
        );
      }

      if (status === "processed") {
        processed += numeric(
          record.approvedAmount
        );
      }

      if (
        status === "pending" ||
        status === "under review"
      ) {
        pendingCount += 1;
      }
    });

    return {
      records: filteredRefunds.length,
      requested,
      approved,
      processed,
      pendingCount,
    };
  }, [filteredRefunds]);

  // ======================================
  // EXPENSE REPORT
  // ======================================

  const expenseSummary = useMemo(() => {
    let requested = 0;
    let approved = 0;
    let recordedPaid = 0;
    let payable = 0;
    let pending = 0;

    filteredExpenses.forEach((record) => {
      const total = numeric(
        record.amount
      );

      requested += total;

      if (
        isApproved(
          record.approvalStatus
        )
      ) {
        approved += total;
        recordedPaid += numeric(
          record.paidAmount
        );
        payable += getBalance(
          record
        );
      } else if (
        ["pending", "under review"].includes(
          normalized(
            record.approvalStatus
          )
        )
      ) {
        pending += 1;
      }
    });

    return {
      records: filteredExpenses.length,
      requested,
      approved,
      recordedPaid,
      payable,
      pending,
    };
  }, [filteredExpenses]);

  // ======================================
  // INVOICE REPORT
  // ======================================

  const invoiceSummary = useMemo(() => {
    return invoices.reduce(
      (result, record) => {
        result.billed += numeric(
          record.amount
        );

        result.paid += numeric(
          record.paidAmount
        );

        result.outstanding += getBalance(
          record
        );

        return result;
      },
      {
        records: invoices.length,
        billed: 0,
        paid: 0,
        outstanding: 0,
      }
    );
  }, [invoices]);

  // ======================================
  // EXPENSE CATEGORY ANALYSIS
  // ======================================

  const expenseCategories = useMemo(() => {
    const grouped = {};

    filteredExpenses
      .filter((item) =>
        isApproved(
          item.approvalStatus
        )
      )
      .forEach((item) => {
        const category =
          item.category || "Other";

        grouped[category] =
          (grouped[category] || 0) +
          numeric(item.amount);
      });

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort(
        (a, b) => b.value - a.value
      );
  }, [filteredExpenses]);

  // ======================================
  // PAYMENT METHODS
  // ======================================

  const paymentMethods = useMemo(() => {
    const grouped = {};

    filteredPayments
      .filter((item) =>
        isCompleted(
          item.status
        )
      )
      .forEach((item) => {
        const method =
          item.paymentMethod ||
          "Other";

        grouped[method] =
          (grouped[method] || 0) +
          numeric(item.amount);
      });

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort(
        (a, b) => b.value - a.value
      );
  }, [filteredPayments]);

  // ======================================
  // MONTHLY PAYMENT COLLECTION
  // ======================================

  const monthlyCollection = useMemo(() => {
    const grouped = {};

    filteredPayments
      .filter(
        (item) =>
          isCompleted(item.status) &&
          /^\d{4}-\d{2}/.test(
            text(item.paymentDate)
          )
      )
      .forEach((item) => {
        const month = text(
          item.paymentDate
        ).slice(0, 7);

        grouped[month] =
          (grouped[month] || 0) +
          numeric(item.amount);
      });

    return Object.entries(grouped)
      .map(([month, value]) => ({
        month,
        value,
      }))
      .sort((a, b) =>
        a.month.localeCompare(
          b.month
        )
      );
  }, [filteredPayments]);

  // ======================================
  // MAIN REPORT CARDS
  // ======================================

  const stats = [
    {
      title: "Completed Collections",
      value:
        data.payments.status === "available"
          ? money(
              paymentSummary.collectedAmount
            )
          : "—",
      subtitle:
        "Completed payment records in selected period",
      icon: CreditCard,
    },
    {
      title: "Outstanding Dues",
      value:
        data.dues.status === "available"
          ? money(
              duesSummary.outstanding
            )
          : "—",
      subtitle:
        "Outstanding balance in Dues module",
      icon: Wallet,
    },
    {
      title: "Approved Scholarships",
      value:
        data.scholarships.status === "available"
          ? money(
              scholarshipSummary.approvedAmount
            )
          : "—",
      subtitle:
        "Calculated approved waiver value",
      icon: BadgePercent,
    },
    {
      title: "Approved Expenses",
      value:
        data.expenses.status === "available"
          ? money(
              expenseSummary.approved
            )
          : "—",
      subtitle:
        "Approved expenses in selected period",
      icon: HandCoins,
    },
  ];

  // ======================================
  // EXPORT DATA
  // ======================================

  function downloadSummary() {
    try {
      const rows = [
        [
          "Completed Payment Collection",
          data.payments.status === "available"
            ? paymentSummary.collectedAmount
            : "Unavailable",
          "Payment Records",
          "Selected date range",
        ],
        [
          "Outstanding Dues",
          data.dues.status === "available"
            ? duesSummary.outstanding
            : "Unavailable",
          "Dues",
          "All saved records",
        ],
        [
          "Approved Scholarships",
          data.scholarships.status === "available"
            ? scholarshipSummary.approvedAmount
            : "Unavailable",
          "Scholarships",
          "All saved records",
        ],
        [
          "Processed Refunds",
          data.refunds.status === "available"
            ? refundSummary.processed
            : "Unavailable",
          "Refunds",
          "Selected date range by request date",
        ],
        [
          "Approved Expenses",
          data.expenses.status === "available"
            ? expenseSummary.approved
            : "Unavailable",
          "Expenses",
          "Selected date range",
        ],
        [
          "Expense Payments Recorded",
          data.expenses.status === "available"
            ? expenseSummary.recordedPaid
            : "Unavailable",
          "Expenses",
          "Selected date range",
        ],
        [
          "Total Fee Assessments",
          data.fees.status === "available"
            ? feeSummary.assessed
            : "Unavailable",
          "Student Fees",
          "All saved records",
        ],
        [
          "Invoice Amounts",
          data.invoices.status === "available"
            ? invoiceSummary.billed
            : "Unavailable",
          "Invoices",
          "All saved records",
        ],
      ];

      exportCSV(
        `unibee-financial-summary-${todayLocal()}.csv`,
        [
          "Metric",
          "Amount BDT",
          "Source",
          "Reporting Scope",
        ],
        rows
      );

      setFeedback(
        "Financial summary CSV downloaded."
      );
    } catch {
      setError(
        "Unable to export the financial summary."
      );
    }
  }

  function downloadPayments() {
    try {
      const headers = [
        "Student ID",
        "Student Name",
        "Department",
        "Semester",
        "Fee Type",
        "Amount BDT",
        "Payment Method",
        "Transaction ID",
        "Payment Date",
        "Status",
      ];

      const rows = filteredPayments.map(
        (payment) => [
          payment.studentId,
          payment.studentName,
          payment.department,
          payment.semester,
          payment.feeType,
          payment.amount,
          payment.paymentMethod,
          payment.transactionId,
          payment.paymentDate,
          payment.status,
        ]
      );

      exportCSV(
        `unibee-payment-report-${todayLocal()}.csv`,
        headers,
        rows
      );

      setFeedback(
        "Payment report CSV downloaded."
      );
    } catch {
      setError(
        "Unable to export payment records."
      );
    }
  }

  function downloadExpenses() {
    try {
      const headers = [
        "Expense Number",
        "Title",
        "Category",
        "Department",
        "Vendor",
        "Expense Date",
        "Expense Amount BDT",
        "Allocated Budget BDT",
        "Approval Status",
        "Paid Amount BDT",
        "Payment Status",
        "Payment Reference",
      ];

      const rows = filteredExpenses.map(
        (record) => [
          record.expenseNumber,
          record.expenseTitle,
          record.category,
          record.department,
          record.vendor,
          record.expenseDate,
          record.amount,
          record.allocatedBudget,
          record.approvalStatus,
          record.paidAmount,
          record.paymentStatus,
          record.paymentReference,
        ]
      );

      exportCSV(
        `unibee-expense-report-${todayLocal()}.csv`,
        headers,
        rows
      );

      setFeedback(
        "Expense report CSV downloaded."
      );
    } catch {
      setError(
        "Unable to export expense records."
      );
    }
  }

  const datasetStatus = [
    ["Student Fees", data.fees],
    ["Payments", data.payments],
    ["Dues", data.dues],
    ["Scholarships", data.scholarships],
    ["Invoices", data.invoices],
    ["Refunds", data.refunds],
    ["Expenses", data.expenses],
  ];

  // ======================================
  // RENDER PAGE
  // ======================================

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            MANAGEMENT & REPORTS
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Financial Reports
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Explore student finance records,
            payments, dues, scholarships,
            refunds, and expense reports.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshReports}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] hover:bg-[#F1F7EF]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={downloadSummary}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#193B33]"
          >
            <Download size={18} />
            Export Summary
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

      {error && (
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
            <FileBarChart2 size={16} />
            ACCOUNTS OFFICER
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            Financial Reporting Center
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Monitor recorded financial activities,
            compare spending categories, review
            collections, and export structured
            financial reports.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[11px] text-[#D0E2D7]">
                Reporting Date
              </p>

              <p className="mt-1 text-sm font-bold">
                {formatDate(todayLocal())}
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[11px] text-[#D0E2D7]">
                Data Source
              </p>

              <p className="mt-1 text-sm font-bold">
                Browser Local Storage
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border-[35px] border-white/5" />
      </section>

      {/* DATE FILTER */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={19}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Reporting Period
          </h2>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-2 block text-xs font-semibold text-[#718579]">
              From Date
            </label>

            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
              className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43]"
            />
          </div>

          <div className="min-w-[180px] flex-1">
            <label className="mb-2 block text-xs font-semibold text-[#718579]">
              To Date
            </label>

            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) =>
                setToDate(event.target.value)
              }
              className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43]"
            />
          </div>

          <button
            type="button"
            onClick={resetDates}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] px-4 py-3 text-sm font-bold text-[#234E43] hover:bg-[#F1F7EF]"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <p className="mt-4 text-xs leading-6 text-[#718579]">
          The selected date range filters
          Payments by payment date, Refunds
          by request date, and Expenses by
          expense date. Student Fees, Dues,
          Scholarships, and Invoices remain
          all-record summaries.
        </p>
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

      {/* COLLECTION VS EXPENSE */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
          <SectionHeader
            title="Payment Collection"
            subtitle="Completed and pending transactions in selected period"
            icon={CreditCard}
          />

          <div className="mt-6 space-y-1">
            <MetricRow
              label="Total Transactions"
              value={paymentSummary.records}
            />

            <MetricRow
              label="Completed"
              value={paymentSummary.completed}
            />

            <MetricRow
              label="Pending"
              value={paymentSummary.pending}
            />

            <MetricRow
              label="Failed"
              value={paymentSummary.failed}
            />

            <MetricRow
              label="Collected Amount"
              value={money(
                paymentSummary.collectedAmount
              )}
            />

            <MetricRow
              label="Pending Amount"
              value={money(
                paymentSummary.pendingAmount
              )}
            />
          </div>

          <div className="mt-5 rounded-xl bg-[#EAF2E8] p-4">
            <p className="text-xs text-[#718579]">
              Completed Transaction Rate
            </p>

            <p className="mt-2 text-2xl font-extrabold text-[#234E43]">
              {percent(
                paymentSummary.records > 0
                  ? (paymentSummary.completed /
                      paymentSummary.records) *
                      100
                  : 0
              )}
            </p>
          </div>

          <div className="mt-5">
            <ExportButton
              label="Export Payments CSV"
              onClick={downloadPayments}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
          <SectionHeader
            title="University Expenses"
            subtitle="Expense requests and approvals in selected period"
            icon={HandCoins}
          />

          <div className="mt-6 space-y-1">
            <MetricRow
              label="Total Expense Requests"
              value={expenseSummary.records}
            />

            <MetricRow
              label="Requested Amount"
              value={money(
                expenseSummary.requested
              )}
            />

            <MetricRow
              label="Approved Amount"
              value={money(
                expenseSummary.approved
              )}
            />

            <MetricRow
              label="Recorded Paid Amount"
              value={money(
                expenseSummary.recordedPaid
              )}
            />

            <MetricRow
              label="Remaining Payable"
              value={money(
                expenseSummary.payable
              )}
            />

            <MetricRow
              label="Awaiting Approval"
              value={expenseSummary.pending}
            />
          </div>

          <div className="mt-5 rounded-xl bg-[#EAF2E8] p-4">
            <p className="text-xs text-[#718579]">
              Approved Expense Payment Progress
            </p>

            <p className="mt-2 text-2xl font-extrabold text-[#234E43]">
              {percent(
                expenseSummary.approved > 0
                  ? (expenseSummary.recordedPaid /
                      expenseSummary.approved) *
                      100
                  : 0
              )}
            </p>
          </div>

          <div className="mt-5">
            <ExportButton
              label="Export Expenses CSV"
              onClick={downloadExpenses}
            />
          </div>
        </div>
      </section>

      {/* STUDENT FEE / DUES */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
          <SectionHeader
            title="Student Fee Analysis"
            subtitle="All saved Student Fee records"
            icon={GraduationCap}
          />

          <div className="mt-6 space-y-1">
            <MetricRow
              label="Total Fee Records"
              value={feeSummary.records}
            />

            <MetricRow
              label="Total Assessed"
              value={money(
                feeSummary.assessed
              )}
            />

            <MetricRow
              label="Manually Recorded Paid"
              value={money(feeSummary.paid)}
            />

            <MetricRow
              label="Remaining Balance"
              value={money(
                feeSummary.outstanding
              )}
            />

            <MetricRow
              label="Fully Paid Records"
              value={feeSummary.fullyPaid}
            />

            <MetricRow
              label="Partially Paid Records"
              value={feeSummary.partial}
            />

            <MetricRow
              label="Unpaid Records"
              value={feeSummary.unpaid}
            />
          </div>

          <div className="mt-6">
            <ProgressBar
              label="Recorded Fee Settlement"
              value={Math.min(
                feeSummary.paid,
                feeSummary.assessed
              )}
              total={feeSummary.assessed}
              valueLabel={percent(
                feeSummary.assessed > 0
                  ? (feeSummary.paid /
                      feeSummary.assessed) *
                      100
                  : 0
              )}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
          <SectionHeader
            title="Outstanding Dues Analysis"
            subtitle="All saved Outstanding Dues records"
            icon={Wallet}
          />

          <div className="mt-6 space-y-1">
            <MetricRow
              label="Total Due Records"
              value={duesSummary.records}
            />

            <MetricRow
              label="Outstanding Amount"
              value={money(
                duesSummary.outstanding
              )}
            />

            <MetricRow
              label="Overdue Amount"
              value={money(
                duesSummary.overdue
              )}
            />

            <MetricRow
              label="Overdue Records"
              value={duesSummary.overdueCount}
            />
          </div>

          <div className="mt-6">
            <ProgressBar
              label="Overdue Share"
              value={duesSummary.overdue}
              total={
                duesSummary.outstanding
              }
              color="#D9A536"
              valueLabel={percent(
                duesSummary.outstanding > 0
                  ? (duesSummary.overdue /
                      duesSummary.outstanding) *
                      100
                  : 0
              )}
            />
          </div>

          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            Fee records and due records are
            currently independent datasets.
            Their balances may overlap and
            must not be added together.
          </div>
        </div>
      </section>

      {/* SCHOLARSHIP / REFUND */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
          <SectionHeader
            title="Scholarships & Waivers"
            subtitle="All saved scholarship applications"
            icon={BadgePercent}
          />

          <div className="mt-6 space-y-1">
            <MetricRow
              label="Total Applications"
              value={
                scholarshipSummary.records
              }
            />

            <MetricRow
              label="Approved"
              value={
                scholarshipSummary.approved
              }
            />

            <MetricRow
              label="Pending / Under Review"
              value={
                scholarshipSummary.pending
              }
            />

            <MetricRow
              label="Rejected"
              value={
                scholarshipSummary.rejected
              }
            />

            <MetricRow
              label="Approved Award Value"
              value={money(
                scholarshipSummary.approvedAmount
              )}
            />
          </div>

          <div className="mt-6">
            <ProgressBar
              label="Application Approval Rate"
              value={
                scholarshipSummary.approved
              }
              total={
                scholarshipSummary.records
              }
              valueLabel={percent(
                scholarshipSummary.records > 0
                  ? (scholarshipSummary.approved /
                      scholarshipSummary.records) *
                      100
                  : 0
              )}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
          <SectionHeader
            title="Refund Management Report"
            subtitle="Refund requests submitted in selected period"
            icon={RefreshCw}
          />

          <div className="mt-6 space-y-1">
            <MetricRow
              label="Total Requests"
              value={refundSummary.records}
            />

            <MetricRow
              label="Requested Amount"
              value={money(
                refundSummary.requested
              )}
            />

            <MetricRow
              label="Approved / Not Processed"
              value={money(
                refundSummary.approved
              )}
            />

            <MetricRow
              label="Recorded as Processed"
              value={money(
                refundSummary.processed
              )}
            />

            <MetricRow
              label="Awaiting Decision"
              value={
                refundSummary.pendingCount
              }
            />
          </div>

          <div className="mt-6 rounded-xl bg-[#F6F8F3] p-4 text-xs leading-6 text-[#718579]">
            Refund processing status is a manually
            recorded value. It does not confirm
            that money was actually transferred.
          </div>
        </div>
      </section>

      {/* CATEGORY AND METHOD ANALYSIS */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
          <SectionHeader
            title="Expenses by Category"
            subtitle="Approved expense amounts by category"
            icon={BarChart3}
          />

          {expenseCategories.length === 0 ? (
            <EmptyState
              message="No approved expenses available for this period."
            />
          ) : (
            <div className="mt-6 space-y-5">
              {expenseCategories.map(
                (item, index) => (
                  <ProgressBar
                    key={item.name}
                    label={item.name}
                    value={item.value}
                    total={
                      expenseSummary.approved
                    }
                    color={
                      COLORS[
                        index %
                          COLORS.length
                      ]
                    }
                  />
                )
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
          <SectionHeader
            title="Collection by Payment Method"
            subtitle="Completed payment amounts by method"
            icon={PieChart}
          />

          {paymentMethods.length === 0 ? (
            <EmptyState
              message="No completed payment records available for this period."
            />
          ) : (
            <div className="mt-6 space-y-5">
              {paymentMethods.map(
                (item, index) => (
                  <ProgressBar
                    key={item.name}
                    label={item.name}
                    value={item.value}
                    total={
                      paymentSummary.collectedAmount
                    }
                    color={
                      COLORS[
                        index %
                          COLORS.length
                      ]
                    }
                  />
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* MONTHLY COLLECTION */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <SectionHeader
          title="Monthly Payment Collection"
          subtitle="Completed transactions grouped by payment month"
          icon={TrendingUp}
        />

        {monthlyCollection.length === 0 ? (
          <EmptyState
            message="No dated completed payments available for monthly analysis."
          />
        ) : (
          <div className="mt-6 space-y-5">
            {monthlyCollection.map(
              (item) => (
                <ProgressBar
                  key={item.month}
                  label={item.month}
                  value={item.value}
                  total={Math.max(
                    ...monthlyCollection.map(
                      (row) => row.value
                    )
                  )}
                />
              )
            )}
          </div>
        )}
      </section>

      {/* INVOICE SUMMARY */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <SectionHeader
          title="Invoice & Billing Summary"
          subtitle="All saved Invoices & Receipts records"
          icon={Receipt}
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Invoices",
              value:
                invoiceSummary.records,
            },
            {
              label: "Billed Amount",
              value: money(
                invoiceSummary.billed
              ),
            },
            {
              label: "Recorded Paid",
              value: money(
                invoiceSummary.paid
              ),
            },
            {
              label: "Outstanding",
              value: money(
                invoiceSummary.outstanding
              ),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-[#F6F8F3] p-4"
            >
              <p className="text-xs text-[#718579]">
                {item.label}
              </p>

              <p className="mt-2 break-words text-lg font-extrabold text-[#234E43]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* AVAILABLE DATA SOURCES */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <SectionHeader
          title="Report Data Sources"
          subtitle="Saved records available from Accounts modules"
          icon={Database}
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {datasetStatus.map(
            ([name, source]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F8F3] p-4"
              >
                <div>
                  <p className="text-sm font-bold text-[#234E43]">
                    {name}
                  </p>

                  <p className="mt-1 text-xs text-[#718579]">
                    {source.status === "available"
                      ? `${source.rows.length} records`
                      : source.status === "invalid"
                      ? "Invalid saved data"
                      : "No saved dataset"}
                  </p>
                </div>

                {source.status === "available" ? (
                  <CheckCircle2
                    size={18}
                    className="shrink-0 text-emerald-600"
                  />
                ) : (
                  <AlertCircle
                    size={18}
                    className="shrink-0 text-amber-600"
                  />
                )}
              </div>
            )
          )}
        </div>
      </section>

      {/* REPORT EXPORTS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <SectionHeader
          title="Download Financial Reports"
          subtitle="Export locally saved financial records"
          icon={FileSpreadsheet}
        />

        <div className="mt-5 flex flex-wrap gap-3">
          <ExportButton
            label="Financial Summary CSV"
            onClick={downloadSummary}
          />

          <ExportButton
            label="Payment Records CSV"
            onClick={downloadPayments}
          />

          <ExportButton
            label="Expense Records CSV"
            onClick={downloadExpenses}
          />
        </div>

        <p className="mt-4 text-xs leading-6 text-[#718579]">
          CSV files can be opened in Microsoft
          Excel or Google Sheets. Exports reflect
          the currently saved prototype records.
          Payment and expense exports follow
          the selected date range.
        </p>
      </section>

      {/* REPORTING LIMITATIONS */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <Info
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo — Important:</strong>{" "}
          These reports summarize independent
          localStorage datasets and are not
          audited financial statements. Student
          Fees, Dues, Invoices, and Payment
          Records may describe the same financial
          obligations. They must not be added
          together to calculate university
          revenue. Similarly, scholarship awards,
          refunds, and expense records have not
          been reconciled with bank transactions.
          Final financial reporting and a
          unified accounting ledger will be
          implemented during the integration phase.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Accounts Officer — Financial Reports
      </p>
    </div>
  );
}
