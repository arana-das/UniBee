
import { useMemo, useState } from "react";
import {
  FileBarChart2,
  BookOpen,
  BookMarked,
  BookCheck,
  AlertTriangle,
  ClipboardList,
  PackagePlus,
  Megaphone,
  Download,
  Printer,
  RefreshCw,
  Search,
  Database,
  CheckCircle2,
  AlertCircle,
  Wallet,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileSpreadsheet,
} from "lucide-react";

const KEYS = {
  books: "unibee-admin-library-books-v1",
  loans: "unibee-admin-library-loans-v1",
  requests: "unibee-librarian-book-requests-v1",
  stock: "unibee-librarian-stock-v1",
  announcements: "unibee-librarian-announcements-v1",
};

const REPORTS = [
  {
    id: "inventory",
    name: "Book Inventory",
    description: "Book quantities and availability",
    icon: BookOpen,
    sources: ["books", "loans"],
  },
  {
    id: "circulation",
    name: "Issue & Return",
    description: "Complete borrowing history",
    icon: BookMarked,
    sources: ["loans", "books"],
  },
  {
    id: "overdue",
    name: "Overdue Books",
    description: "Unreturned books past their due dates",
    icon: AlertTriangle,
    sources: ["loans", "books"],
  },
  {
    id: "demand",
    name: "Student Book Demand",
    description: "Requested books and quantities",
    icon: ClipboardList,
    sources: ["requests"],
  },
  {
    id: "purchase",
    name: "Purchase Requirements",
    description: "Book acquisition plans and budgets",
    icon: PackagePlus,
    sources: ["stock"],
  },
  {
    id: "announcements",
    name: "Library Announcements",
    description: "Publication and notice records",
    icon: Megaphone,
    sources: ["announcements"],
  },
];

const PAGE_SIZE = 12;

function readArray(key) {
  try {
    const saved = localStorage.getItem(key);

    if (saved === null) {
      return { rows: [], status: "Missing" };
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return { rows: [], status: "Invalid" };
    }

    return { rows: parsed, status: "Available" };
  } catch {
    return { rows: [], status: "Invalid" };
  }
}

function loadSources() {
  const result = {};

  Object.entries(KEYS).forEach(([name, key]) => {
    result[name] = readArray(key);
  });

  return {
    data: result,
    refreshedAt: new Date().toISOString(),
  };
}

function localToday() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function amount(value) {
  return Math.max(0, Number(value) || 0);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-BD");
}

function formatMoney(value) {
  return `৳ ${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? `${value}T12:00:00`
      : value
  );

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function datePart(value) {
  return typeof value === "string"
    ? value.slice(0, 10)
    : "";
}

function loanStatus(loan) {
  if (loan.returnDate) return "Returned";

  return loan.dueDate && loan.dueDate < localToday()
    ? "Overdue"
    : "Borrowed";
}

function announcementStatus(item) {
  if (item.status !== "Published") {
    return item.status || "Draft";
  }

  if (item.expiryDate && item.expiryDate < localToday()) {
    return "Expired";
  }

  if (
    item.publishDate &&
    item.publishDate > localToday()
  ) {
    return "Scheduled";
  }

  return "Published";
}

function createReport(reportId, sources) {
  const books = sources.books.rows;
  const loans = sources.loans.rows;
  const requests = sources.requests.rows;
  const stock = sources.stock.rows;
  const announcements = sources.announcements.rows;

  const bookMap = new Map(
    books.map((book) => [String(book.id), book])
  );

  const activeCounts = new Map();

  loans
    .filter((loan) => !loan.returnDate)
    .forEach((loan) => {
      const id = String(loan.bookId);
      activeCounts.set(
        id,
        (activeCounts.get(id) || 0) + 1
      );
    });

  switch (reportId) {
    case "inventory": {
      const rows = books.map((book) => {
        const borrowed = activeCounts.get(
          String(book.id)
        ) || 0;

        const total = amount(book.copies);
        const available = Math.max(0, total - borrowed);

        const stockStatus =
          String(book.status || "").toLowerCase() !== "active"
            ? "Inactive"
            : available === 0
            ? "Out of Stock"
            : available <= 3
            ? "Low Stock"
            : "Available";

        return {
          id: book.id,
          title: book.title,
          author: book.author,
          category: book.category,
          isbn: book.isbn,
          total,
          borrowed,
          available,
          stockStatus,
        };
      });

      return {
        columns: [
          ["id", "Book ID"],
          ["title", "Book Title"],
          ["author", "Author"],
          ["category", "Category"],
          ["isbn", "ISBN"],
          ["total", "Total Copies"],
          ["borrowed", "Borrowed"],
          ["available", "Available"],
          ["stockStatus", "Stock Status"],
        ],
        rows,
      };
    }

    case "circulation": {
      const rows = loans.map((loan) => ({
        id: loan.id,
        bookTitle:
          bookMap.get(String(loan.bookId))?.title ||
          loan.bookTitle ||
          loan.bookId ||
          "Unknown",
        studentId: loan.studentId,
        studentName: loan.studentName,
        issueDate: loan.issueDate,
        dueDate: loan.dueDate,
        returnDate: loan.returnDate,
        status: loanStatus(loan),
      }));

      return {
        columns: [
          ["id", "Loan ID"],
          ["bookTitle", "Book"],
          ["studentId", "Student ID"],
          ["studentName", "Student"],
          ["issueDate", "Issued"],
          ["dueDate", "Due Date"],
          ["returnDate", "Returned"],
          ["status", "Status"],
        ],
        rows,
      };
    }

    case "overdue": {
      const rows = loans
        .filter(
          (loan) =>
            !loan.returnDate &&
            loan.dueDate &&
            loan.dueDate < localToday()
        )
        .map((loan) => {
          const due = new Date(`${loan.dueDate}T12:00:00`);
          const now = new Date(`${localToday()}T12:00:00`);

          const daysOverdue = Math.max(
            0,
            Math.floor(
              (now.getTime() - due.getTime()) /
                86400000
            )
          );

          return {
            id: loan.id,
            bookTitle:
              bookMap.get(String(loan.bookId))?.title ||
              loan.bookTitle ||
              loan.bookId ||
              "Unknown",
            studentId: loan.studentId,
            studentName: loan.studentName,
            issueDate: loan.issueDate,
            dueDate: loan.dueDate,
            daysOverdue,
            status: "Overdue",
          };
        });

      return {
        columns: [
          ["id", "Loan ID"],
          ["bookTitle", "Book"],
          ["studentId", "Student ID"],
          ["studentName", "Student"],
          ["issueDate", "Issued"],
          ["dueDate", "Due Date"],
          ["daysOverdue", "Days Overdue"],
          ["status", "Status"],
        ],
        rows,
      };
    }

    case "demand": {
      const groups = new Map();

      requests
        .filter((request) =>
          ["Pending", "Approved"].includes(request.status)
        )
        .forEach((request) => {
          const title = String(
            request.bookTitle || ""
          ).trim();

          const key = request.bookId
            ? `id:${request.bookId}`
            : `title:${title.toLowerCase()}`;

          if (!title) return;

          const previous = groups.get(key) || {
            bookTitle: title,
            bookId: request.bookId || "",
            requests: 0,
            requiredCopies: 0,
            pending: 0,
            approved: 0,
          };

          previous.requests += 1;
          previous.requiredCopies +=
            Math.max(1, Number(request.quantity) || 1);

          if (request.status === "Pending") {
            previous.pending += 1;
          } else {
            previous.approved += 1;
          }

          groups.set(key, previous);
        });

      return {
        columns: [
          ["bookTitle", "Requested Book"],
          ["bookId", "Book ID"],
          ["requests", "Student Requests"],
          ["requiredCopies", "Requested Copies"],
          ["pending", "Pending"],
          ["approved", "Approved"],
        ],
        rows: [...groups.values()].sort(
          (a, b) =>
            b.requiredCopies - a.requiredCopies
        ),
      };
    }

    case "purchase": {
      const rows = stock.map((plan) => ({
        id: plan.id,
        bookTitle: plan.bookTitle,
        requiredCopies: amount(plan.requiredCopies),
        unitPrice:
          plan.unitPrice === "" ||
          plan.unitPrice === undefined ||
          plan.unitPrice === null
            ? ""
            : amount(plan.unitPrice),
        estimatedCost:
          plan.unitPrice === "" ||
          plan.unitPrice === undefined ||
          plan.unitPrice === null
            ? ""
            : amount(plan.requiredCopies) *
              amount(plan.unitPrice),
        priority: plan.priority,
        status: plan.status,
        updatedAt: plan.updatedAt || plan.createdAt,
      }));

      return {
        columns: [
          ["id", "Plan ID"],
          ["bookTitle", "Book"],
          ["requiredCopies", "Required Copies"],
          ["unitPrice", "Unit Price (BDT)"],
          ["estimatedCost", "Estimated Cost (BDT)"],
          ["priority", "Priority"],
          ["status", "Status"],
          ["updatedAt", "Updated"],
        ],
        rows,
      };
    }

    case "announcements": {
      const rows = announcements.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        audience: item.audience,
        priority: item.priority,
        publishDate: item.publishDate,
        expiryDate: item.expiryDate,
        status: announcementStatus(item),
        featured: item.featured ? "Yes" : "No",
      }));

      return {
        columns: [
          ["id", "Announcement ID"],
          ["title", "Title"],
          ["category", "Category"],
          ["audience", "Audience"],
          ["priority", "Priority"],
          ["publishDate", "Publish Date"],
          ["expiryDate", "Expiry Date"],
          ["status", "Status"],
          ["featured", "Featured"],
        ],
        rows,
      };
    }

    default:
      return { columns: [], rows: [] };
  }
}

function csvExport(filename, headers, rows) {
  function cell(value) {
    let text = String(value ?? "");

    // Protect spreadsheet software from formula injection.
    if (/^\s*[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  }

  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map(cell).join(","))
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: "text/csv;charset=utf-8",
    })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
}) {
  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>

          <p className="mt-3 break-words text-2xl font-bold text-[#234E43]">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {subtitle}
      </p>
    </article>
  );
}

function StatusBadge({ status }) {
  const colors = {
    Available: "bg-emerald-50 text-emerald-700",
    Missing: "bg-amber-50 text-amber-800",
    Invalid: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        colors[status] || colors.Missing
      }`}
    >
      {status}
    </span>
  );
}

function BarRow({ label, value, maximum, color }) {
  const width =
    maximum > 0 ? (value / maximum) * 100 : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-600">
          {label}
        </span>

        <span className="text-xs font-bold text-[#234E43]">
          {formatNumber(value)}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

export default function LibrarianReports() {
  const [snapshot, setSnapshot] = useState(loadSources);

  const [selectedReport, setSelectedReport] =
    useState("inventory");

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const data = snapshot.data;

  const reportDefinition = REPORTS.find(
    (report) => report.id === selectedReport
  );

  const requiredSources =
    reportDefinition?.sources || [];

  const unavailableSources = requiredSources.filter(
    (name) => data[name].status !== "Available"
  );

  const reportReady =
    unavailableSources.length === 0;

  const report = useMemo(
    () => createReport(selectedReport, data),
    [selectedReport, data]
  );

  const dateField = {
    inventory: null,
    circulation: "issueDate",
    overdue: "issueDate",
    demand: null,
    purchase: "updatedAt",
    announcements: "publishDate",
  }[selectedReport];

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return report.rows.filter((row) => {
      const matchesSearch = Object.values(row).some(
        (value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query)
      );

      if (!matchesSearch) return false;

      if (!dateField) return true;

      const date = datePart(row[dateField]);

      if (startDate && (!date || date < startDate)) {
        return false;
      }

      if (endDate && (!date || date > endDate)) {
        return false;
      }

      return true;
    });
  }, [
    report,
    search,
    startDate,
    endDate,
    dateField,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const inventoryMetrics = useMemo(() => {
    const books = data.books.rows;
    const loans = data.loans.rows;

    const activeLoans = loans.filter(
      (loan) => !loan.returnDate
    );

    const totalCopies = books.reduce(
      (sum, book) => sum + amount(book.copies),
      0
    );

    const trackedLoanCount = activeLoans.filter(
      (loan) =>
        books.some(
          (book) =>
            String(book.id) === String(loan.bookId)
        )
    ).length;

    return {
      titles: books.length,
      totalCopies,
      borrowed: activeLoans.length,
      available: Math.max(
        0,
        totalCopies - trackedLoanCount
      ),
      overdue: activeLoans.filter(
        (loan) =>
          loan.dueDate &&
          loan.dueDate < localToday()
      ).length,
    };
  }, [data.books.rows, data.loans.rows]);

  const purchaseMetrics = useMemo(() => {
    const active = data.stock.rows.filter(
      (plan) =>
        !["Received", "Cancelled"].includes(plan.status)
    );

    return {
      copies: active.reduce(
        (sum, plan) =>
          sum + amount(plan.requiredCopies),
        0
      ),
      budget: active.reduce(
        (sum, plan) =>
          sum +
          amount(plan.requiredCopies) *
            amount(plan.unitPrice),
        0
      ),
      unpriced: active.filter(
        (plan) =>
          plan.unitPrice === "" ||
          plan.unitPrice === null ||
          plan.unitPrice === undefined
      ).length,
    };
  }, [data.stock.rows]);

  const statusStats = useMemo(() => {
    const groups = new Map();

    filteredRows.forEach((row) => {
      const status =
        row.status ||
        row.stockStatus ||
        "Other";

      groups.set(
        status,
        (groups.get(status) || 0) + 1
      );
    });

    return [...groups.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  const maximumStatus = Math.max(
    1,
    ...statusStats.map((item) => item.value)
  );

  function refresh() {
    setSnapshot(loadSources());
    setFeedback("Library reports refreshed.");
    setError("");
  }

  function switchReport(id) {
    setSelectedReport(id);
    setSearch("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setError("");
    setFeedback("");
  }

  function downloadReport() {
    if (!reportReady) {
      setError(
        "Required data sources are unavailable. CSV export is disabled."
      );
      return;
    }

    csvExport(
      `UniBee_Library_${selectedReport}_Report.csv`,
      report.columns.map(([, label]) => label),
      filteredRows.map((row) =>
        report.columns.map(
          ([key]) => row[key] ?? ""
        )
      )
    );

    setFeedback("Report exported as CSV.");
    setError("");
  }

  function printReport() {
    if (!reportReady) {
      setError(
        "Required data sources are unavailable. Print is disabled."
      );
      return;
    }

    window.print();
  }

  return (
    <div className="space-y-7">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }

            #librarian-print-report,
            #librarian-print-report * {
              visibility: visible !important;
            }

            #librarian-print-report {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: none !important;
              padding: 12px !important;
              border: none !important;
              box-shadow: none !important;
              overflow: visible !important;
            }

            #librarian-print-report .report-table-scroll {
              overflow: visible !important;
            }

            #librarian-print-report table {
              min-width: 0 !important;
              width: 100% !important;
              font-size: 9px !important;
            }

            .librarian-no-print {
              display: none !important;
            }

            @page {
              size: A4 landscape;
              margin: 12mm;
            }
          }
        `}
      </style>

      {/* HEADER */}
      <section className="librarian-no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Library Administration
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Library Reports
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Analyze library inventory, circulation,
            book demand and acquisition requirements.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/20 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <RefreshCw size={17} />
            Refresh Data
          </button>

          <button
            type="button"
            onClick={downloadReport}
            disabled={!reportReady}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </section>

      {feedback && (
        <p
          role="status"
          className="librarian-no-print flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="librarian-no-print flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </p>
      )}

      {/* SUMMARY CARDS */}
      <section className="librarian-no-print grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Book Titles"
          value={
            data.books.status === "Available"
              ? formatNumber(inventoryMetrics.titles)
              : "—"
          }
          subtitle="Catalog records"
          icon={BookOpen}
        />

        <MetricCard
          label="Total Copies"
          value={
            data.books.status === "Available"
              ? formatNumber(inventoryMetrics.totalCopies)
              : "—"
          }
          subtitle="Physical inventory"
          icon={BookCheck}
        />

        <MetricCard
          label="Active Loans"
          value={
            data.loans.status === "Available"
              ? formatNumber(inventoryMetrics.borrowed)
              : "—"
          }
          subtitle="Currently borrowed copies"
          icon={BookMarked}
        />

        <MetricCard
          label="Overdue Loans"
          value={
            data.loans.status === "Available"
              ? formatNumber(inventoryMetrics.overdue)
              : "—"
          }
          subtitle="Books past their due dates"
          icon={AlertTriangle}
        />

        <MetricCard
          label="Copies to Purchase"
          value={
            data.stock.status === "Available"
              ? formatNumber(purchaseMetrics.copies)
              : "—"
          }
          subtitle="Active purchase plans"
          icon={PackagePlus}
        />

        <MetricCard
          label="Estimated Purchase Budget"
          value={
            data.stock.status === "Available"
              ? formatMoney(purchaseMetrics.budget)
              : "—"
          }
          subtitle={
            purchaseMetrics.unpriced
              ? `${purchaseMetrics.unpriced} active plans have no price`
              : "Priced active purchase plans"
          }
          icon={Wallet}
        />
      </section>

      {/* REPORT SELECTION */}
      <section className="librarian-no-print rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <FileBarChart2
            size={21}
            className="text-[#234E43]"
          />

          <h2 className="text-lg font-bold text-[#234E43]">
            Select Report Type
          </h2>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchReport(item.id)}
                aria-pressed={selectedReport === item.id}
                className={`rounded-xl border p-4 text-left transition ${
                  selectedReport === item.id
                    ? "border-[#234E43] bg-[#A6C1A4]/15 ring-1 ring-[#234E43]"
                    : "border-slate-200 hover:border-[#A6C1A4]"
                }`}
              >
                <Icon
                  size={22}
                  className="text-[#234E43]"
                />

                <p className="mt-3 text-sm font-bold text-[#234E43]">
                  {item.name}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* DATA SOURCE HEALTH */}
      <section className="librarian-no-print rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#234E43]">
            Data Source Health
          </h2>

          <span className="text-xs text-slate-400">
            Updated {formatDate(snapshot.refreshedAt)}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Object.entries(data).map(([name, source]) => (
            <div
              key={name}
              className="rounded-xl bg-[#F6F8F3] p-3"
            >
              <p className="mb-3 text-xs font-semibold capitalize text-[#234E43]">
                {name}
              </p>

              <StatusBadge status={source.status} />

              <p className="mt-3 text-xs text-slate-500">
                {source.status === "Available"
                  ? `${source.rows.length} records`
                  : "No verified records"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* REPORT PREVIEW */}
      <section
        id="librarian-print-report"
        className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
              UniBee University Library
            </p>

            <h2 className="mt-2 text-xl font-bold text-[#234E43]">
              {reportDefinition?.name} Report
            </h2>

            <p className="mt-2 text-xs text-slate-500">
              Report Date: {formatDate(localToday())}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Records: {reportReady ? filteredRows.length : "Unavailable"}
            </p>
          </div>

          <button
            type="button"
            onClick={printReport}
            disabled={!reportReady}
            className="librarian-no-print inline-flex items-center gap-2 rounded-xl border border-[#234E43]/20 px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-40"
          >
            <Printer size={17} />
            Print / Save PDF
          </button>
        </div>

        {!reportReady ? (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <Database
              size={32}
              className="text-[#A6C1A4]"
            />

            <h3 className="mt-4 text-sm font-bold text-[#234E43]">
              Required Data Unavailable
            </h3>

            <p className="mt-2 max-w-lg text-xs leading-6 text-slate-500">
              This report requires valid saved records from:{" "}
              {unavailableSources.join(", ")}.
              Save the corresponding module data and
              refresh the report.
            </p>
          </div>
        ) : (
          <>
            {/* FILTERS */}
            <div className="librarian-no-print grid gap-3 border-b border-slate-100 p-5 lg:grid-cols-[minmax(0,1fr)_170px_170px]">
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
                  placeholder="Search report records..."
                  aria-label="Search report records"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
                />
              </div>

              {dateField ? (
                <>
                  <input
                    type="date"
                    aria-label="Report start date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
                  />

                  <input
                    type="date"
                    aria-label="Report end date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
                  />
                </>
              ) : (
                <div className="flex items-center rounded-xl bg-[#F6F8F3] px-4 text-xs text-slate-500 lg:col-span-2">
                  Date filtering is not applicable to this report.
                </div>
              )}
            </div>

            {/* SIMPLE ANALYTICS */}
            {statusStats.length > 0 && (
              <div className="librarian-no-print border-b border-slate-100 p-5">
                <div className="flex items-center gap-2">
                  <BarChart3
                    size={18}
                    className="text-[#234E43]"
                  />

                  <h3 className="text-sm font-bold text-[#234E43]">
                    Report Distribution
                  </h3>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {statusStats.map((item, index) => (
                    <BarRow
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      maximum={maximumStatus}
                      color={
                        [
                          "#234E43",
                          "#D9A536",
                          "#7BA8C7",
                          "#A6C1A4",
                          "#E78080",
                        ][index % 5]
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* TABLE */}
            <div className="report-table-scroll overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {report.columns.map(([, label]) => (
                      <th
                        key={label}
                        className="whitespace-nowrap px-4 py-4 font-semibold"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {(typeof window !== "undefined" &&
                  window.matchMedia?.("print").matches
                    ? filteredRows
                    : visibleRows
                  ).map((row, index) => (
                    <tr
                      key={row.id || `${index}-${selectedReport}`}
                      className="hover:bg-slate-50"
                    >
                      {report.columns.map(([key]) => (
                        <td
                          key={key}
                          className="max-w-[250px] break-words px-4 py-3 text-xs text-slate-600"
                        >
                          {String(row[key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {visibleRows.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <FileSpreadsheet
                    size={30}
                    className="text-[#A6C1A4]"
                  />

                  <p className="mt-3 text-sm font-semibold text-[#234E43]">
                    No matching records
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Adjust your report filters or save new data.
                  </p>
                </div>
              )}
            </div>

            {/* PAGINATION */}
            <div className="librarian-no-print flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
              <p className="text-xs text-slate-500">
                Page {currentPage} of {totalPages} ·{" "}
                {filteredRows.length} records
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                  aria-label="Previous report page"
                  className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  aria-label="Next report page"
                  className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* IMPORTANT NOTE */}
      <section className="librarian-no-print rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> All reports are
        calculated from saved LocalStorage records.
        Missing or invalid data sources prevent the
        corresponding report from being generated.
        Financial values are purchase estimates,
        not actual payments. Student demand represents
        requests, not confirmed orders.
        Cross-device synchronization requires a backend.
      </section>

      <p className="librarian-no-print text-center text-xs text-slate-400">
        UniBee Librarian Reports · Frontend Demo
      </p>
    </div>
  );
}
