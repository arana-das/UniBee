
import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Search,
  Eye,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Filter,
  RotateCcw,
  Database,
  CalendarClock,
  Download,
  CreditCard,
  UserRound,
} from "lucide-react";

import {
  getStudentFees,
  getFinanceStudents,
} from "../../services/financeApi";

// ========================================
// HELPERS
// ========================================

const todayLocal = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return `৳ ${num(value).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatus(fee) {
  if (fee.status === "Cancelled") return "Cancelled";

  if (num(fee.balance) <= 0) return "Cleared";

  if (fee.dueDate && fee.dueDate < todayLocal()) {
    return "Overdue";
  }

  if (num(fee.paid) > 0) return "Partial";

  return "Unpaid";
}

function StatusBadge({ status }) {
  const colors = {
    Overdue: "bg-red-50 text-red-700",
    Partial: "bg-amber-50 text-amber-700",
    Unpaid: "bg-slate-100 text-slate-700",
    Cleared: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
      colors[status] || colors.Unpaid
    }`}>
      {status}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#718579]">{title}</p>
          <p className="mt-3 text-2xl font-extrabold text-[#234E43]">
            {value}
          </p>
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

function exportCSV(rows) {
  const headers = [
    "Student ID",
    "Student Name",
    "Department",
    "Semester",
    "Fee Type",
    "Total",
    "Paid",
    "Due",
    "Due Date",
    "Status",
  ];

  const values = rows.map((row) => [
    row.studentId,
    row.studentName,
    row.department,
    row.semester,
    row.feeType,
    row.totalAmount,
    row.paidAmount,
    row.dueAmount,
    row.dueDate,
    getStatus(row),
  ]);

  const escapeCell = (value) => {
    let content = String(value ?? "");

    if (/^\s*[=+\-@]/.test(content)) {
      content = "'" + content;
    }

    return `"${content.replace(/"/g, '""')}"`;
  };

  const csv = "\uFEFF" + [headers, ...values]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "UniBee_Outstanding_Dues.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ========================================
// MAIN PAGE
// ========================================

export default function AccountsDues() {
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  // ======================================
  // LOAD FINANCE DATA FROM MONGODB
  // ======================================

  async function refreshDues() {
    setLoading(true);
    setError("");

    try {
      const [feeData, studentData] = await Promise.all([
        getStudentFees(),
        getFinanceStudents(),
      ]);

      const students = Array.isArray(studentData)
        ? studentData
        : [];

      const studentMap = new Map(
        students.map((student) => [
          student.studentId,
          student,
        ])
      );

      const rows = (Array.isArray(feeData) ? feeData : [])
        .filter((fee) => fee.status !== "Cancelled")
        .map((fee) => {
          const student = studentMap.get(fee.studentId);

          return {
            ...fee,
            id: String(fee._id || fee.id),
            studentId: fee.studentId,
            studentName:
              fee.studentName ||
              student?.fullName ||
              "Unknown Student",
            department: student?.department || "",
            semester: fee.semester || "",
            feeType: fee.title || "Other",
            totalAmount: num(fee.amount),
            paidAmount: num(fee.paid),
            dueAmount: num(fee.balance),
          };
        });

      setDues(rows);
    } catch (err) {
      setDues([]);
      setError(
        err.message || "Could not load dues from MongoDB."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDues();
  }, []);

  // ======================================
  // SUMMARY
  // ======================================

  const summary = useMemo(() => {
    const today = todayLocal();

    const outstanding = dues.reduce(
      (sum, fee) => sum + num(fee.dueAmount),
      0
    );

    const overdueRows = dues.filter(
      (fee) =>
        num(fee.dueAmount) > 0 &&
        fee.dueDate &&
        fee.dueDate < today
    );

    const overdueAmount = overdueRows.reduce(
      (sum, fee) => sum + num(fee.dueAmount),
      0
    );

    const studentsWithDues = new Set(
      dues
        .filter((fee) => num(fee.dueAmount) > 0)
        .map((fee) => fee.studentId)
    );

    return {
      outstanding,
      overdueAmount,
      overdueCount: overdueRows.length,
      studentsWithDues: studentsWithDues.size,
      cleared: dues.filter(
        (fee) => num(fee.dueAmount) === 0
      ).length,
    };
  }, [dues]);

  const stats = [
    {
      title: "Outstanding Balance",
      value: money(summary.outstanding),
      subtitle: "Remaining unpaid student fees",
      icon: Wallet,
    },
    {
      title: "Overdue Amount",
      value: money(summary.overdueAmount),
      subtitle: `${summary.overdueCount} overdue fee records`,
      icon: AlertCircle,
    },
    {
      title: "Students with Dues",
      value: summary.studentsWithDues,
      subtitle: "Distinct students with unpaid balances",
      icon: GraduationCap,
    },
    {
      title: "Cleared Records",
      value: summary.cleared,
      subtitle: "Fully paid fee records",
      icon: CheckCircle2,
    },
  ];

  const feeTypes = useMemo(
    () => [...new Set(dues.map((fee) => fee.feeType))],
    [dues]
  );

  // ======================================
  // SEARCH AND FILTER
  // ======================================

  const filteredDues = useMemo(() => {
    const query = search.trim().toLowerCase();

    return dues
      .filter((fee) => {
        const matchesSearch = [
          fee.studentId,
          fee.studentName,
          fee.department,
          fee.semester,
          fee.feeType,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

        const matchesStatus =
          statusFilter === "All" ||
          getStatus(fee) === statusFilter;

        const matchesType =
          typeFilter === "All" ||
          fee.feeType === typeFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesType
        );
      })
      .sort((a, b) => {
        const aOverdue = getStatus(a) === "Overdue";
        const bOverdue = getStatus(b) === "Overdue";

        if (aOverdue !== bOverdue) {
          return aOverdue ? -1 : 1;
        }

        return String(a.dueDate || "").localeCompare(
          String(b.dueDate || "")
        );
      });
  }, [dues, search, statusFilter, typeFilter]);

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
  }

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            STUDENT FINANCE
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Outstanding Dues
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Monitor outstanding balances, overdue fees
            and student payment progress from MongoDB.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              await refreshDues();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => exportCSV(filteredDues)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </section>

      {/* FEEDBACK */}
      {feedback && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          {feedback}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      {/* INFO */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-[#234E43]">
        <div className="flex items-center gap-2 font-bold">
          <Database size={17} />
          Live MongoDB Finance Data
        </div>

        <p className="mt-2 leading-6">
          Due amounts are calculated automatically from
          assigned fees and completed payments.
          To adjust a fee, use Student Fees.
          To correct a payment, use Payment Records.
        </p>
      </div>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-[#234E43]" />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Dues
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
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
              placeholder="Student ID, name, department..."
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
            {[
              "All",
              "Overdue",
              "Unpaid",
              "Partial",
              "Cleared",
            ].map((status) => (
              <option key={status} value={status}>
                {status === "All"
                  ? "All Statuses"
                  : status}
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
            <option value="All">All Fee Types</option>

            {feeTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-[#718579]">
            Showing {filteredDues.length} of {dues.length} records
          </span>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#234E43]"
          >
            <RotateCcw size={16} />
            Reset Filters
          </button>
        </div>
      </section>

      {/* DUES RECORDS */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-[#234E43]">
          Student Due Records
        </h2>

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-[#718579]">
            Loading from MongoDB...
          </div>
        ) : filteredDues.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white p-12 text-center">
            <Database
              size={35}
              className="mx-auto text-[#A6C1A4]"
            />

            <p className="mt-4 font-bold text-[#234E43]">
              No Due Records Found
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredDues.map((fee) => (
              <article
                key={fee.id}
                className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                      <UserRound size={21} />
                    </div>

                    <div>
                      <h3 className="font-bold text-[#234E43]">
                        {fee.studentName}
                      </h3>

                      <p className="mt-1 text-xs text-[#718579]">
                        ID: {fee.studentId}
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={getStatus(fee)} />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-[#F6F8F3] p-4">
                  <div>
                    <p className="text-xs text-[#718579]">
                      Total Fee
                    </p>
                    <p className="mt-1 font-bold text-[#234E43]">
                      {money(fee.totalAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Paid Amount
                    </p>
                    <p className="mt-1 font-bold text-emerald-700">
                      {money(fee.paidAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Outstanding Due
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-rose-700">
                      {money(fee.dueAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Due Date
                    </p>
                    <p className="mt-1 flex items-center gap-2 font-bold text-[#234E43]">
                      <CalendarClock size={15} />
                      {formatDate(fee.dueDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-[#718579]">
                    {fee.feeType} · {fee.semester}
                  </p>

                  <button
                    type="button"
                    onClick={() => setViewing(fee)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-4 py-2.5 text-xs font-bold text-white"
                  >
                    <Eye size={15} />
                    View Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#234E43]">
                Outstanding Due Details
              </h2>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              {[
                ["Student ID", viewing.studentId],
                ["Student Name", viewing.studentName],
                ["Department", viewing.department],
                ["Semester", viewing.semester],
                ["Fee Type", viewing.feeType],
                ["Total Fee", money(viewing.totalAmount)],
                ["Paid Amount", money(viewing.paidAmount)],
                ["Outstanding Due", money(viewing.dueAmount)],
                ["Due Date", formatDate(viewing.dueDate)],
                ["Status", getStatus(viewing)],
                ["Notes", viewing.notes || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b border-[#E2EADC] py-2"
                >
                  <span className="text-[#718579]">{label}</span>
                  <span className="text-right font-semibold text-[#234E43]">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setViewing(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 font-bold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Accounts Officer — Outstanding Dues
      </p>
    </div>
  );
}
