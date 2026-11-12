
import { useMemo, useState } from "react";
import {
  FileBarChart2,
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CalendarDays,
  Wallet,
  LibraryBig,
  CalendarCheck,
  Megaphone,
  Award,
  ChevronLeft,
  ChevronRight,
  Database,
  History,
  BarChart3,
  FileDown,
  Clock3,
} from "lucide-react";

const HISTORY_KEY = "unibee-admin-report-history-v1";
const PAGE_SIZE = 8;
const PREVIEW_SIZE = 12;

const REPORT_TYPES = [
  {
    id: "students",
    title: "Student Directory",
    category: "People",
    storageKey: "unibee-admin-students-v1",
    icon: GraduationCap,
    description: "Student profiles and enrollment status",
  },
  {
    id: "faculty",
    title: "Faculty Directory",
    category: "People",
    storageKey: "unibee-admin-faculty-v1",
    icon: Users,
    description: "Faculty members and departments",
  },
  {
    id: "courses",
    title: "Academic Courses",
    category: "Academic",
    storageKey: "unibee-admin-courses-v1",
    icon: BookOpen,
    description: "Courses, credits and seat allocation",
  },
  {
    id: "enrollment",
    title: "Course Enrollments",
    category: "Academic",
    storageKey: "unibee-admin-enrollment-v1",
    icon: ClipboardList,
    description: "Student enrollment requests and approvals",
  },
  {
    id: "attendance",
    title: "Attendance Records",
    category: "Academic",
    storageKey: "unibee-admin-attendance-v1",
    icon: CalendarCheck,
    description: "Attendance monitoring records",
  },
  {
    id: "examinations",
    title: "Examination Schedule",
    category: "Academic",
    storageKey: "unibee-admin-examinations-v1",
    icon: CalendarDays,
    description: "Examinations, rooms and schedules",
  },
  {
    id: "results",
    title: "Academic Results",
    category: "Academic",
    storageKey: "unibee-admin-results-v1",
    icon: Award,
    description: "Marks, grades and publication status",
  },
  {
    id: "finance",
    title: "Finance Statement",
    category: "Finance",
    storageKey: "unibee-admin-finance-v1",
    icon: Wallet,
    description: "Fee billing, payments and outstanding balances",
  },
  {
    id: "library",
    title: "Library Inventory",
    category: "Campus Operations",
    storageKey: "unibee-admin-library-books-v1",
    icon: LibraryBig,
    description: "Books, copies and inventory availability",
  },
  {
    id: "events",
    title: "Campus Events",
    category: "Campus Operations",
    storageKey: "unibee-admin-events-v1",
    icon: CalendarDays,
    description: "Event schedules and registration capacity",
  },
  {
    id: "notices",
    title: "University Notices",
    category: "Campus Operations",
    storageKey: "unibee-admin-notices-v1",
    icon: Megaphone,
    description: "Announcements and publication status",
  },
];

const DEFAULT_HISTORY = [];

const FIELD_MAP = {
  students: [
    ["studentId", "Student ID"],
    ["name", "Student Name"],
    ["email", "Email"],
    ["department", "Department"],
    ["program", "Program"],
    ["semester", "Semester"],
    ["status", "Status"],
  ],
  faculty: [
    ["facultyId", "Faculty ID"],
    ["name", "Faculty Name"],
    ["email", "Email"],
    ["department", "Department"],
    ["designation", "Designation"],
    ["status", "Status"],
  ],
  courses: [
    ["code", "Course Code"],
    ["title", "Course Title"],
    ["department", "Department"],
    ["semester", "Semester"],
    ["credit", "Credits"],
    ["faculty", "Instructor"],
    ["capacity", "Capacity"],
    ["enrolled", "Enrolled"],
    ["status", "Status"],
  ],
  enrollment: [
    ["id", "Enrollment ID"],
    ["studentId", "Student ID"],
    ["courseCode", "Course"],
    ["semester", "Semester"],
    ["status", "Status"],
    ["appliedAt", "Applied Date"],
    ["reviewedAt", "Reviewed Date"],
  ],
  attendance: [
    ["studentId", "Student ID"],
    ["studentName", "Student Name"],
    ["courseCode", "Course"],
    ["date", "Date"],
    ["status", "Status"],
    ["source", "Source"],
  ],
  examinations: [
    ["title", "Examination"],
    ["courseCode", "Course"],
    ["semester", "Semester"],
    ["type", "Exam Type"],
    ["date", "Date"],
    ["startTime", "Start"],
    ["endTime", "End"],
    ["room", "Room"],
    ["status", "Status"],
  ],
  results: [
    ["studentId", "Student ID"],
    ["courseCode", "Course"],
    ["semester", "Semester"],
    ["marks", "Marks"],
    ["status", "Status"],
    ["updatedAt", "Updated"],
  ],
  finance: [
    ["id", "Record ID"],
    ["studentId", "Student ID"],
    ["semester", "Semester"],
    ["feeType", "Fee Type"],
    ["amount", "Billed (BDT)"],
    ["paid", "Paid (BDT)"],
    ["outstanding", "Outstanding (BDT)"],
    ["status", "Status"],
    ["paymentDate", "Payment Date"],
  ],
  library: [
    ["id", "Book ID"],
    ["title", "Title"],
    ["author", "Author"],
    ["category", "Category"],
    ["isbn", "ISBN"],
    ["copies", "Total Copies"],
    ["available", "Available"],
    ["status", "Status"],
  ],
  events: [
    ["title", "Event"],
    ["category", "Category"],
    ["date", "Date"],
    ["venue", "Venue"],
    ["organizer", "Organizer"],
    ["capacity", "Capacity"],
    ["registered", "Registered"],
    ["status", "Status"],
  ],
  notices: [
    ["title", "Notice"],
    ["category", "Category"],
    ["audience", "Audience"],
    ["priority", "Priority"],
    ["status", "Status"],
    ["createdAt", "Created"],
    ["expiryDate", "Expiry"],
  ],
};

function readStorageArray(key) {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return {
        rows: [],
        state: "missing",
      };
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return {
        rows: [],
        state: "invalid",
      };
    }

    return {
      rows: parsed,
      state: "available",
    };
  } catch {
    return {
      rows: [],
      state: "invalid",
    };
  }
}

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return DEFAULT_HISTORY;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_HISTORY;
  } catch {
    return DEFAULT_HISTORY;
  }
}

function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `report-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function sum(rows, key) {
  return rows.reduce(
    (total, row) => total + (Number(row[key]) || 0),
    0
  );
}

function countStatus(rows, status) {
  return rows.filter(
    (row) =>
      String(row.status || "").toLowerCase() ===
      status.toLowerCase()
  ).length;
}

function getReportRows(type, sourceRows) {
  const records = sourceRows.map((item) => ({ ...item }));

  if (type === "finance") {
    return records.map((item) => {
      const amount = Number(item.amount) || 0;
      const paid = Number(item.paid) || 0;

      return {
        ...item,
        outstanding: Math.max(0, amount - paid),
        status:
          amount > 0 && paid >= amount
            ? "Paid"
            : paid > 0
            ? "Partial"
            : "Due",
      };
    });
  }

  if (type === "library") {
    const loans = readStorageArray(
      "unibee-admin-library-loans-v1"
    ).rows;

    return records.map((item) => {
      const borrowed = loans.filter(
        (loan) =>
          loan.bookId === item.id && !loan.returnDate
      ).length;

      return {
        ...item,
        available: Math.max(
          0,
          (Number(item.copies) || 0) - borrowed
        ),
      };
    });
  }

  if (type === "events") {
    const registrations = readStorageArray(
      "unibee-admin-event-registrations-v1"
    ).rows;

    return records.map((item) => ({
      ...item,
      registered: registrations.filter(
        (registration) =>
          registration.eventId === item.id
      ).length,
    }));
  }

  return records;
}

function getSummary(type, rows) {
  const basic = [
    { label: "Total Records", value: rows.length },
  ];

  switch (type) {
    case "students":
    case "faculty":
    case "courses":
    case "library":
      return [
        ...basic,
        {
          label: "Active",
          value: countStatus(rows, "Active"),
        },
      ];

    case "enrollment":
      return [
        ...basic,
        {
          label: "Approved",
          value: countStatus(rows, "Approved"),
        },
        {
          label: "Pending",
          value: countStatus(rows, "Pending"),
        },
      ];

    case "attendance":
      return [
        ...basic,
        {
          label: "Present",
          value: countStatus(rows, "Present"),
        },
        {
          label: "Absent",
          value: countStatus(rows, "Absent"),
        },
      ];

    case "examinations":
      return [
        ...basic,
        {
          label: "Scheduled",
          value: countStatus(rows, "Scheduled"),
        },
        {
          label: "Completed",
          value: countStatus(rows, "Completed"),
        },
      ];

    case "results":
      return [
        ...basic,
        {
          label: "Published",
          value: countStatus(rows, "Published"),
        },
        {
          label: "Draft",
          value: countStatus(rows, "Draft"),
        },
      ];

    case "finance":
      return [
        ...basic,
        {
          label: "Billed (BDT)",
          value: sum(rows, "amount"),
          currency: true,
        },
        {
          label: "Collected (BDT)",
          value: sum(rows, "paid"),
          currency: true,
        },
        {
          label: "Outstanding (BDT)",
          value: sum(rows, "outstanding"),
          currency: true,
        },
      ];

    case "events":
      return [
        ...basic,
        {
          label: "Published",
          value: countStatus(rows, "Published"),
        },
        {
          label: "Registrations",
          value: sum(rows, "registered"),
        },
      ];

    case "notices":
      return [
        ...basic,
        {
          label: "Published",
          value: countStatus(rows, "Published"),
        },
        {
          label: "Draft",
          value: countStatus(rows, "Draft"),
        },
      ];

    default:
      return basic;
  }
}

function formatMetric(metric) {
  const number = Number(metric.value) || 0;

  if (metric.currency) {
    return `৳ ${number.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return number.toLocaleString("en-BD");
}

function exportCSV(filename, headers, rows) {
  const escapeCell = (value) => {
    let text = String(value ?? "");

    if (/^\s*[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) =>
        row.map(escapeCell).join(",")
      )
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: "text/csv;charset=utf-8",
    })
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StatusLabel({ state }) {
  const styles = {
    available: "bg-emerald-50 text-emerald-700",
    missing: "bg-amber-50 text-amber-800",
    invalid: "bg-rose-50 text-rose-700",
  };

  const labels = {
    available: "Saved Data",
    missing: "No Saved Data",
    invalid: "Invalid Data",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[state] || styles.missing
      }`}
    >
      {labels[state] || "Unknown"}
    </span>
  );
}

export default function AdminReports() {
  const [selectedType, setSelectedType] = useState("students");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [reportSearch, setReportSearch] = useState("");

  const [historySearch, setHistorySearch] = useState("");

  const [historyPage, setHistoryPage] = useState(1);

  const [history, setHistory] = useState(readHistory);

  const [activeReport, setActiveReport] = useState(null);

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [sourceStates, setSourceStates] = useState(() =>
    Object.fromEntries(
      REPORT_TYPES.map((type) => [
        type.id,
        readStorageArray(type.storageKey).state,
      ])
    )
  );

  const filteredTypes = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();

    return REPORT_TYPES.filter(
      (type) =>
        (categoryFilter === "All" ||
          type.category === categoryFilter) &&
        (
          type.title.toLowerCase().includes(query) ||
          type.description.toLowerCase().includes(query) ||
          type.category.toLowerCase().includes(query)
        )
    );
  }, [categoryFilter, reportSearch]);

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    return history.filter((item) =>
      [
        item.title,
        item.category,
        item.id,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [history, historySearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredHistory.length / PAGE_SIZE)
  );

  const currentPage = Math.min(historyPage, totalPages);

  const visibleHistory = filteredHistory.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function refreshSources() {
    setSourceStates(
      Object.fromEntries(
        REPORT_TYPES.map((type) => [
          type.id,
          readStorageArray(type.storageKey).state,
        ])
      )
    );

    setFeedback("Saved data sources refreshed.");
    setError("");
  }

  function buildReport(typeId, saveToHistory = true) {
    const definition = REPORT_TYPES.find(
      (type) => type.id === typeId
    );

    if (!definition) {
      setError("Select a valid report type.");
      return;
    }

    const source = readStorageArray(
      definition.storageKey
    );

    if (source.state !== "available") {
      setError(
        source.state === "missing"
          ? `No saved data found for "${definition.title}". Open and save records in that module first.`
          : `The saved data for "${definition.title}" is not a valid record array.`
      );

      setFeedback("");
      return;
    }

    const rows = getReportRows(
      typeId,
      source.rows
    );

    const report = {
      id: createId(),
      typeId,
      title: definition.title,
      category: definition.category,
      generatedAt: new Date().toISOString(),
      recordCount: rows.length,
      rows,
      summary: getSummary(typeId, rows),
      columns: FIELD_MAP[typeId],
    };

    setActiveReport(report);
    setError("");
    setFeedback(
      `${definition.title} generated successfully with ${rows.length} records.`
    );

    if (!saveToHistory) return;

    // History saves metadata only.
    // Report data itself remains in the current preview.
    const entry = {
      id: report.id,
      typeId: report.typeId,
      title: report.title,
      category: report.category,
      generatedAt: report.generatedAt,
      recordCount: report.recordCount,
    };

    const next = [entry, ...history];

    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(next)
      );

      setHistory(next);
      setHistoryPage(1);
    } catch {
      setFeedback(
        "Report preview created, but browser storage could not save its history."
      );
    }
  }

  function openHistoryReport(item) {
    // History is metadata, so this regenerates using latest saved data.
    buildReport(item.typeId, false);
  }

  function exportActiveReport() {
    if (!activeReport) return;

    const headers = activeReport.columns.map(
      ([, label]) => label
    );

    const rows = activeReport.rows.map(
      (record) =>
        activeReport.columns.map(
          ([key]) => record[key] ?? ""
        )
    );

    exportCSV(
      `UniBee_${activeReport.typeId}_Report.csv`,
      headers,
      rows
    );
  }

  function printReport() {
    if (!activeReport) return;

    // Print styles below hide the rest of the dashboard.
    window.print();
  }

  function deleteHistoryItem(id) {
    if (!window.confirm(
      "Remove this report history entry?"
    )) {
      return;
    }

    const next = history.filter(
      (item) => item.id !== id
    );

    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(next)
      );

      setHistory(next);
      setFeedback("Report history entry removed.");
      setError("");
    } catch {
      setError("Unable to update report history.");
    }
  }

  function clearHistory() {
    if (!window.confirm(
      "Clear all saved report history? This will not delete source module records."
    )) {
      return;
    }

    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify([])
      );

      setHistory([]);
      setHistoryPage(1);
      setFeedback("Report history cleared.");
      setError("");
    } catch {
      setError("Unable to clear report history.");
    }
  }

  const availableSources = Object.values(
    sourceStates
  ).filter((state) => state === "available").length;

  return (
    <div className="space-y-7">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }

            #unibee-report-print,
            #unibee-report-print * {
              visibility: visible !important;
            }

            #unibee-report-print {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: none !important;
              overflow: visible !important;
              border: none !important;
              box-shadow: none !important;
              padding: 16px !important;
            }

            #unibee-report-print .report-scroll {
              overflow: visible !important;
              max-height: none !important;
            }

            #unibee-report-print table {
              min-width: 0 !important;
              width: 100% !important;
              font-size: 9px !important;
            }

            .report-no-print {
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
      <section className="report-no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            System Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Reports Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Generate academic, financial, and campus
            management reports from locally saved data.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshSources}
          className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-5 py-3 text-sm font-semibold text-[#234E43]"
        >
          <RefreshCw size={17} />
          Refresh Data Sources
        </button>
      </section>

      {/* METRICS */}
      <section className="report-no-print grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Available Report Types",
            value: REPORT_TYPES.length,
            icon: FileBarChart2,
            detail: "Supported management modules",
          },
          {
            label: "Saved Data Sources",
            value: availableSources,
            icon: Database,
            detail: "Modules with valid saved arrays",
          },
          {
            label: "Reports Generated",
            value: history.length,
            icon: History,
            detail: "Saved report history entries",
          },
          {
            label: "Report Categories",
            value: 4,
            icon: BarChart3,
            detail: "People, Academic, Finance & Campus",
          },
        ].map(({ label, value, icon: Icon, detail }) => (
          <article
            key={label}
            className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  {label}
                </p>

                <p className="mt-3 text-3xl font-bold text-[#234E43]">
                  {value}
                </p>
              </div>

              <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
                <Icon size={21} />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {detail}
            </p>
          </article>
        ))}
      </section>

      {/* REPORT GENERATOR */}
      <section className="report-no-print rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              Report Generator
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Select a module and generate a report
            </p>
          </div>

          <span className="rounded-full bg-[#F6F8F3] px-3 py-1.5 text-xs font-semibold text-[#234E43]">
            Local Data Sources
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={reportSearch}
              onChange={(event) =>
                setReportSearch(event.target.value)
              }
              placeholder="Search available reports..."
              aria-label="Search report types"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
            aria-label="Filter report category"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="All">All Categories</option>
            <option value="People">People</option>
            <option value="Academic">Academic</option>
            <option value="Finance">Finance</option>
            <option value="Campus Operations">
              Campus Operations
            </option>
          </select>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredTypes.map((type) => {
            const Icon = type.icon;
            const selected = selectedType === type.id;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                aria-pressed={selected}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-[#234E43] bg-[#A6C1A4]/15 ring-1 ring-[#234E43]"
                    : "border-slate-200 bg-white hover:border-[#A6C1A4]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-lg bg-[#F6F8F3] p-2.5 text-[#234E43]">
                    <Icon size={21} />
                  </div>

                  <StatusLabel
                    state={sourceStates[type.id] || "missing"}
                  />
                </div>

                <h3 className="mt-4 text-sm font-bold text-[#234E43]">
                  {type.title}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {type.description}
                </p>

                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#B18A28]">
                  {type.category}
                </p>
              </button>
            );
          })}
        </div>

        {filteredTypes.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            No matching report types found.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F6F8F3] p-4">
          <div>
            <p className="text-xs text-slate-500">
              Selected Report
            </p>

            <p className="mt-1 text-sm font-bold text-[#234E43]">
              {REPORT_TYPES.find(
                (type) => type.id === selectedType
              )?.title}
            </p>
          </div>

          <button
            type="button"
            onClick={() => buildReport(selectedType)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33]"
          >
            <FileBarChart2 size={18} />
            Generate Report
          </button>
        </div>
      </section>

      {/* FEEDBACK */}
      {feedback && (
        <p
          role="status"
          className="report-no-print flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="report-no-print flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </p>
      )}

      {/* REPORT PREVIEW */}
      {activeReport && (
        <section
          id="unibee-report-print"
          className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
                UniBee University
              </p>

              <h2 className="mt-2 text-xl font-bold text-[#234E43]">
                {activeReport.title}
              </h2>

              <p className="mt-2 text-xs text-slate-500">
                Generated: {formatDateTime(activeReport.generatedAt)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Report ID: {activeReport.id}
              </p>
            </div>

            <div className="report-no-print flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportActiveReport}
                className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-4 py-2.5 text-xs font-semibold text-white"
              >
                <Download size={16} />
                Export CSV
              </button>

              <button
                type="button"
                onClick={printReport}
                className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-4 py-2.5 text-xs font-semibold text-[#234E43]"
              >
                <Printer size={16} />
                Print / PDF
              </button>

              <button
                type="button"
                onClick={() => setActiveReport(null)}
                aria-label="Close report preview"
                className="rounded-lg border border-slate-200 p-2.5 text-slate-500"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* REPORT SUMMARY */}
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
            {activeReport.summary.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl bg-[#F6F8F3] p-4"
              >
                <p className="text-xs text-slate-500">
                  {metric.label}
                </p>

                <p className="mt-2 break-words text-xl font-bold text-[#234E43]">
                  {formatMetric(metric)}
                </p>
              </div>
            ))}
          </div>

          {/* REPORT DATA */}
          <div className="report-scroll max-h-[600px] overflow-auto border-t border-slate-100">
            <table className="w-full min-w-[850px] text-left">
              <thead className="sticky top-0 bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {activeReport.columns.map(([, label]) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-3 font-semibold"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {activeReport.rows.map((row, index) => (
                  <tr
                    key={row.id || `${row.studentId}-${row.courseCode}-${index}`}
                    className="hover:bg-slate-50"
                  >
                    {activeReport.columns.map(([key]) => (
                      <td
                        key={key}
                        className="max-w-[260px] break-words px-4 py-3 text-xs text-slate-600"
                      >
                        {String(row[key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {activeReport.rows.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-500">
                This module has no records.
              </p>
            )}
          </div>

          <div className="report-no-print border-t border-slate-100 p-4 text-center text-xs text-slate-500">
            Preview: {Math.min(
              activeReport.rows.length,
              PREVIEW_SIZE
            )} of {activeReport.rows.length} records shown initially.
            Scroll to view all records.
          </div>
        </section>
      )}

      {/* REPORT HISTORY */}
      <section className="report-no-print overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#234E43]">
              <History size={20} />
              Report History
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Previously generated report metadata
            </p>
          </div>

          <button
            type="button"
            onClick={clearHistory}
            disabled={history.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-40"
          >
            <Trash2 size={15} />
            Clear History
          </button>
        </div>

        <div className="border-y border-slate-100 px-5 py-4">
          <div className="relative max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={historySearch}
              onChange={(event) => {
                setHistorySearch(event.target.value);
                setHistoryPage(1);
              }}
              placeholder="Search report history..."
              aria-label="Search report history"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Report",
                  "Category",
                  "Generated",
                  "Records",
                  "Actions",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-5 py-4 font-semibold"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleHistory.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[#234E43]">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {item.id}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {item.category}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {formatDateTime(item.generatedAt)}
                  </td>

                  <td className="px-5 py-4 text-sm font-semibold text-[#234E43]">
                    {item.recordCount}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openHistoryReport(item)}
                        title="Regenerate report using latest saved data"
                        aria-label={`Regenerate ${item.title}`}
                        className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43]"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteHistoryItem(item.id)}
                        title="Delete history entry"
                        aria-label={`Delete history ${item.title}`}
                        className="rounded-lg bg-rose-50 p-2 text-rose-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visibleHistory.length === 0 && (
            <p className="py-12 text-center text-sm text-slate-500">
              No report history found.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} ·{" "}
            {filteredHistory.length} history entries
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setHistoryPage(currentPage - 1)}
              aria-label="Previous history page"
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setHistoryPage(currentPage + 1)}
              aria-label="Next history page"
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* DEMO NOTE */}
      <div className="report-no-print rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> Reports are generated from
        LocalStorage data saved by the Admin modules. Missing
        sources are not automatically filled with sample data.
        Report history stores metadata only; opening a previous
        entry regenerates the report using current saved data.
        Attendance imports, academic calculations, financial
        records and user access permissions are not verified
        through a backend.
      </div>

      <p className="report-no-print text-center text-xs text-slate-400">
        UniBee Admin Reports · Frontend Demo
      </p>
    </div>
  );
}
