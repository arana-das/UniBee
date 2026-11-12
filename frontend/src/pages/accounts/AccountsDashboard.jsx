
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Wallet,
  CreditCard,
  Users,
  BadgePercent,
  Receipt,
  FileBarChart2,
  ArrowUpRight,
  RefreshCw,
  Clock3,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  Database,
  GraduationCap,
  Loader2,
  Banknote,
  Bell,
  ShieldCheck,
} from "lucide-react";

import {
  getFinanceSummary,
  getStudentFees,
  getStudentPayments,
  getStudentScholarships,
} from "../../services/financeApi";

import { getAuthToken } from "../../services/authApi";

// ============================================
// UNIBEE ACCOUNT OFFICER DASHBOARD
// Real MongoDB Finance Integration
// ============================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const EMPTY_DATA = {
  summary: null,
  fees: null,
  payments: null,
  scholarships: null,
  notices: null,
};

// ============================================
// HELPERS
// ============================================

function number(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result) ? result : null;
}

function money(value) {
  const amount = number(value);

  if (amount === null) return "—";

  return `৳ ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateInDhaka() {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getId(item) {
  if (!item) return "";

  if (typeof item === "string") {
    return item;
  }

  return String(item.id || item._id || "");
}

function arrayOrNull(value) {
  return Array.isArray(value) ? value : null;
}

function dateKey(value) {
  if (!value) return "";

  return String(value).slice(0, 10);
}

// Existing Finance API returns balance-enriched
// fee records. No balance recalculation needed.
function activeFees(rows) {
  return (rows || []).filter(
    (item) => item.status === "Active"
  );
}

function completedPayments(rows) {
  return (rows || []).filter(
    (item) => item.status === "Completed"
  );
}

// ============================================
// NOTICES API
// ============================================

async function getNotices() {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to your Accounts account."
    );
  }

  const response = await fetch(
    `${API_BASE}/api/notices`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  const result = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    result?.success !== true ||
    !Array.isArray(result.data)
  ) {
    throw new Error(
      result?.message ||
      "Unable to load notices."
    );
  }

  return result.data;
}

// ============================================
// REUSABLE COMPONENTS
// ============================================

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
          <p className="text-sm font-medium text-[#718579]">
            {title}
          </p>

          <h3 className="mt-3 break-words text-2xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="shrink-0 rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#718579]">
        {subtitle}
      </p>
    </div>
  );
}

function Panel({
  children,
  className = "",
}) {
  return (
    <section
      className={`rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  title,
  description,
  link,
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-[#234E43]">
          {title}
        </h2>

        <p className="mt-1 text-sm text-[#718579]">
          {description}
        </p>
      </div>

      {link && (
        <Link
          to={link}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#477764] hover:underline"
        >
          View All
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="rounded-xl bg-[#F6F8F3] px-5 py-10 text-center">
      <Icon
        size={31}
        className="mx-auto text-[#A6C1A4]"
      />

      <h3 className="mt-3 font-bold text-[#234E43]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#718579]">
        {description}
      </p>
    </div>
  );
}

function QuickAction({
  title,
  description,
  icon: Icon,
  path,
}) {
  return (
    <Link
      to={path}
      className="group flex items-center justify-between gap-3 rounded-xl border border-[#E2EADC] bg-white p-4 transition hover:border-[#A6C1A4] hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={20} />
        </div>

        <div>
          <p className="text-sm font-bold text-[#234E43]">
            {title}
          </p>

          <p className="mt-1 text-xs text-[#718579]">
            {description}
          </p>
        </div>
      </div>

      <ArrowUpRight
        size={17}
        className="shrink-0 text-[#8AA092]"
      />
    </Link>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function AccountsDashboard() {
  const [data, setData] = useState(EMPTY_DATA);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // ==========================================
  // LOAD REAL MONGODB DATA
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setErrors({});

      const tasks = {
        summary: getFinanceSummary,
        fees: getStudentFees,
        payments: getStudentPayments,
        scholarships: getStudentScholarships,
        notices: getNotices,
      };

      const entries = Object.entries(tasks);

      const results = await Promise.allSettled(
        entries.map(([, request]) => request())
      );

      if (cancelled) return;

      const nextData = { ...EMPTY_DATA };
      const nextErrors = {};

      entries.forEach(([key], index) => {
        const outcome = results[index];

        if (outcome.status === "rejected") {
          nextErrors[key] =
            outcome.reason?.message ||
            "Unable to load data.";

          return;
        }

        const value = outcome.value;

        if (key === "summary") {
          if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
          ) {
            nextData.summary = value;
          } else {
            nextErrors[key] =
              "Invalid finance summary response.";
          }
        } else if (Array.isArray(value)) {
          nextData[key] = value;
        } else {
          nextErrors[key] =
            "Invalid API response.";
        }
      });

      setData(nextData);
      setErrors(nextErrors);
      setLoading(false);
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function refreshDashboard() {
    setRefreshKey((previous) => previous + 1);
  }

  // ==========================================
  // FINANCE SUMMARY
  // ==========================================

  const summary = data.summary;

  const totalFees = number(summary?.totalFees);
  const totalPaid = number(summary?.totalPaid);
  const totalWaived = number(summary?.totalWaived);
  const totalDue = number(summary?.totalDue);

  const collectionRate =
    totalFees !== null &&
    totalPaid !== null &&
    totalFees > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (totalPaid / totalFees) * 100
          )
        )
      : null;

  // ==========================================
  // FEE BALANCES AND DUES
  // ==========================================

  const fees = useMemo(
    () => arrayOrNull(data.fees),
    [data.fees]
  );

  const currentFees = useMemo(
    () => activeFees(fees),
    [fees]
  );

  const today = dateInDhaka();

  const outstandingFees = useMemo(
    () =>
      currentFees
        .filter(
          (fee) =>
            Number(fee.balance) > 0
        )
        .sort(
          (a, b) =>
            String(a.dueDate || "").localeCompare(
              String(b.dueDate || "")
            )
        ),
    [currentFees]
  );

  const overdueFees = useMemo(
    () =>
      outstandingFees.filter(
        (fee) =>
          fee.dueDate &&
          dateKey(fee.dueDate) < today
      ),
    [outstandingFees, today]
  );

  const dueSoonFees = useMemo(
    () =>
      outstandingFees.filter(
        (fee) =>
          fee.dueDate &&
          dateKey(fee.dueDate) >= today
      ),
    [outstandingFees, today]
  );

  const overdueAmount = overdueFees.reduce(
    (sum, fee) =>
      sum + Number(fee.balance || 0),
    0
  );

  const outstandingStudents = new Set(
    outstandingFees
      .map((fee) =>
        String(fee.studentId || "")
      )
      .filter(Boolean)
  ).size;

  // ==========================================
  // PAYMENTS
  // ==========================================

  const payments = useMemo(
    () => arrayOrNull(data.payments),
    [data.payments]
  );

  const validPayments = useMemo(
    () =>
      completedPayments(payments).sort(
        (a, b) =>
          String(b.paymentDate || "").localeCompare(
            String(a.paymentDate || "")
          ) ||
          String(b.createdAt || "").localeCompare(
            String(a.createdAt || "")
          )
      ),
    [payments]
  );

  const recentPayments = validPayments.slice(0, 6);

  const todayCollections = validPayments
    .filter(
      (payment) =>
        dateKey(payment.paymentDate) === today
    )
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  const todayPaymentCount =
    validPayments.filter(
      (payment) =>
        dateKey(payment.paymentDate) === today
    ).length;

  // ==========================================
  // SCHOLARSHIPS / WAIVERS
  // ==========================================

  const scholarships = useMemo(
    () => arrayOrNull(data.scholarships),
    [data.scholarships]
  );

  const pendingScholarships = useMemo(
    () =>
      (scholarships || []).filter(
        (item) =>
          item.status === "Pending" ||
          item.status === "Under Review"
      ),
    [scholarships]
  );

  const approvedScholarships = useMemo(
    () =>
      (scholarships || []).filter(
        (item) => item.status === "Approved"
      ),
    [scholarships]
  );

  // Use finance summary for actual waived
  // amount to avoid double counting.
  const approvedWaiverCount =
    approvedScholarships.length;

  // ==========================================
  // RECENT NOTICES
  // ==========================================

  const notices = useMemo(
    () => arrayOrNull(data.notices),
    [data.notices]
  );

  const recentNotices = useMemo(
    () =>
      (notices || [])
        .filter(
          (notice) =>
            notice.status === "Published"
        )
        .sort(
          (a, b) =>
            String(
              b.publishedAt || b.createdAt || ""
            ).localeCompare(
              String(
                a.publishedAt ||
                a.createdAt ||
                ""
              )
            )
        )
        .slice(0, 4),
    [notices]
  );

  // ==========================================
  // STATISTICS
  // ==========================================

  const stats = [
    {
      title: "Total Fees",
      value: money(totalFees),
      subtitle: "Active fee charges in MongoDB",
      icon: Receipt,
    },
    {
      title: "Total Collections",
      value: money(totalPaid),
      subtitle: "Completed payments against active fees",
      icon: CreditCard,
    },
    {
      title: "Outstanding Dues",
      value: money(totalDue),
      subtitle: "Remaining payable fee balances",
      icon: Wallet,
    },
    {
      title: "Approved Waivers",
      value: money(totalWaived),
      subtitle: "Scholarship-adjusted fee reductions",
      icon: BadgePercent,
    },
  ];

  const quickActions = [
    {
      title: "Student Fees",
      description: "Manage student fee records",
      path: "/accounts/student-fees",
      icon: GraduationCap,
    },
    {
      title: "Payment Records",
      description: "Record and review payments",
      path: "/accounts/payments",
      icon: CreditCard,
    },
    {
      title: "Outstanding Dues",
      description: "Track unpaid student balances",
      path: "/accounts/dues",
      icon: Wallet,
    },
    {
      title: "Scholarships & Waivers",
      description: "Review scholarship applications",
      path: "/accounts/scholarships",
      icon: BadgePercent,
    },
    {
      title: "My Profile",
      description: "View your accounts profile",
      path: "/accounts/profile",
      icon: Users,
    },
  ];

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="space-y-7">

      {/* WELCOME HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white shadow-sm md:p-9">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D9A536]">
              University Financial Management
            </p>

            <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">
              Account Officer Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
              Monitor fee collections, student dues,
              payments and scholarship adjustments
              using real financial records.
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-[#D0E2D7]">
              <ShieldCheck size={16} />
              Authorized Finance Workspace
            </div>
          </div>

          <button
            type="button"
            onClick={refreshDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#234E43] disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loading ? "animate-spin" : ""
              }
            />
            Refresh Dashboard
          </button>
        </div>

        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />
      </section>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center gap-3 rounded-xl border border-[#E2EADC] bg-white p-4 text-sm text-[#718579]">
          <Loader2
            size={19}
            className="animate-spin"
          />
          Loading financial data from MongoDB...
        </div>
      )}

      {/* ERROR REPORT */}
      {!loading &&
        Object.keys(errors).length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <AlertCircle size={18} />
              Some Financial Data Could Not Load
            </p>

            <div className="mt-3 space-y-2">
              {Object.entries(errors).map(
                ([key, message]) => (
                  <p
                    key={key}
                    className="text-xs text-amber-800"
                  >
                    <strong className="capitalize">
                      {key}:
                    </strong>{" "}
                    {message}
                  </p>
                )
              )}
            </div>
          </div>
        )}

      {/* MAIN FINANCE STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
            value={
              loading ? "..." : stat.value
            }
          />
        ))}
      </section>

      {/* COLLECTION OVERVIEW */}
      <section className="grid gap-6 lg:grid-cols-3">

        <Panel className="lg:col-span-2">
          <SectionHeader
            title="Collection Overview"
            description="Summary of active student fee charges"
            link="/accounts/payments"
          />

          {summary === null ? (
            <EmptyState
              icon={FileBarChart2}
              title="Finance Summary Unavailable"
              description="Unable to retrieve financial totals."
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-[#F6F8F3] p-4">
                  <p className="text-xs text-[#718579]">
                    Collection Rate
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-[#234E43]">
                    {collectionRate === null
                      ? "—"
                      : `${collectionRate.toFixed(1)}%`}
                  </h3>
                </div>

                <div className="rounded-xl bg-[#F6F8F3] p-4">
                  <p className="text-xs text-[#718579]">
                    Active Fee Records
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-[#234E43]">
                    {summary.feeCount ?? "—"}
                  </h3>
                </div>

                <div className="rounded-xl bg-[#F6F8F3] p-4">
                  <p className="text-xs text-[#718579]">
                    Completed Payments
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-[#234E43]">
                    {summary.paymentCount ?? "—"}
                  </h3>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold text-[#234E43]">
                    Collection Progress
                  </span>

                  <span className="font-bold text-[#234E43]">
                    {collectionRate === null
                      ? "—"
                      : `${collectionRate.toFixed(1)}%`}
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#EDF1EB]">
                  <div
                    className="h-full rounded-full bg-[#D9A536]"
                    style={{
                      width:
                        `${collectionRate || 0}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-xs text-[#718579]">
                  Based on completed payments
                  against active fee charges.
                  Approved waivers are shown separately.
                </p>
              </div>
            </>
          )}
        </Panel>

        {/* TODAY COLLECTION */}
        <Panel>
          <SectionHeader
            title="Today's Collections"
            description={`Payment date: ${today}`}
            link="/accounts/payments"
          />

          {payments === null ? (
            <EmptyState
              icon={Banknote}
              title="Payments Unavailable"
              description="Payment data could not be loaded."
            />
          ) : (
            <>
              <div className="rounded-xl bg-[#EAF2E8] p-5">
                <p className="text-sm text-[#607B6C]">
                  Amount Collected Today
                </p>

                <h3 className="mt-3 break-words text-3xl font-extrabold text-[#234E43]">
                  {money(todayCollections)}
                </h3>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#F6F8F3] p-4">
                <span className="text-sm text-[#718579]">
                  Completed Transactions
                </span>

                <span className="text-xl font-bold text-[#234E43]">
                  {todayPaymentCount}
                </span>
              </div>
            </>
          )}
        </Panel>
      </section>

      {/* DUES + QUICK ACTIONS */}
      <section className="grid gap-6 xl:grid-cols-3">

        {/* DUES OVERVIEW */}
        <Panel className="xl:col-span-2">
          <SectionHeader
            title="Outstanding Dues"
            description="Unpaid student fee balances"
            link="/accounts/dues"
          />

          {fees === null ? (
            <EmptyState
              icon={Wallet}
              title="Dues Unavailable"
              description="Student fee balances could not be loaded."
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#F6F8F3] p-4">
                  <p className="text-xs text-[#718579]">
                    Outstanding Fee Records
                  </p>

                  <p className="mt-3 text-2xl font-bold text-[#234E43]">
                    {outstandingFees.length}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F6F8F3] p-4">
                  <p className="text-xs text-[#718579]">
                    Students with Dues
                  </p>

                  <p className="mt-3 text-2xl font-bold text-[#234E43]">
                    {outstandingStudents}
                  </p>
                </div>

                <div className="rounded-xl bg-rose-50 p-4">
                  <p className="text-xs text-rose-600">
                    Overdue Amount
                  </p>

                  <p className="mt-3 break-words text-xl font-bold text-rose-700">
                    {money(overdueAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {overdueFees.length} Overdue Fee(s)
                </span>

                <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  {dueSoonFees.length} Not Yet Overdue
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {outstandingFees.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                    <CheckCircle2 size={20} />
                    No outstanding fees found.
                  </div>
                ) : (
                  outstandingFees
                    .slice(0, 5)
                    .map((fee) => (
                      <div
                        key={getId(fee)}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2EADC] p-4"
                      >
                        <div>
                          <p className="font-bold text-[#234E43]">
                            {fee.studentName ||
                              fee.studentId ||
                              "Student"}
                          </p>

                          <p className="mt-1 text-xs text-[#718579]">
                            {fee.studentId} ·{" "}
                            {fee.title}
                          </p>

                          <p className="mt-2 flex items-center gap-1 text-xs text-[#718579]">
                            <CalendarDays size={14} />
                            Due: {formatDate(fee.dueDate)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-[#234E43]">
                            {money(fee.balance)}
                          </p>

                          <span
                            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                              dateKey(fee.dueDate) < today
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {dateKey(fee.dueDate) < today
                              ? "Overdue"
                              : "Outstanding"}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </>
          )}
        </Panel>

        {/* QUICK ACTIONS */}
        <Panel>
          <SectionHeader
            title="Quick Actions"
            description="Accounts Officer tools"
          />

          <div className="space-y-3">
            {quickActions.map((item) => (
              <QuickAction
                key={item.path}
                {...item}
              />
            ))}
          </div>
        </Panel>
      </section>

      {/* PAYMENTS + SCHOLARSHIPS */}
      <section className="grid gap-6 xl:grid-cols-2">

        {/* RECENT PAYMENTS */}
        <Panel>
          <SectionHeader
            title="Recent Payments"
            description="Latest completed transactions"
            link="/accounts/payments"
          />

          {payments === null ? (
            <EmptyState
              icon={CreditCard}
              title="Payments Unavailable"
              description="Could not load payment records."
            />
          ) : recentPayments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No Completed Payments"
              description="Transactions will appear when payments are recorded."
            />
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div
                  key={getId(payment)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2EADC] p-4"
                >
                  <div>
                    <p className="text-sm font-bold text-[#234E43]">
                      {payment.studentId}
                    </p>

                    <p className="mt-1 text-xs text-[#718579]">
                      {payment.method || "Payment"}
                      {" · "}
                      {formatDate(payment.paymentDate)}
                    </p>

                    {payment.reference && (
                      <p className="mt-1 break-all text-xs text-[#718579]">
                        Ref: {payment.reference}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-[#234E43]">
                      {money(payment.amount)}
                    </p>

                    <span className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* SCHOLARSHIPS */}
        <Panel>
          <SectionHeader
            title="Scholarships & Waivers"
            description="Financial assistance applications"
            link="/accounts/scholarships"
          />

          {scholarships === null ? (
            <EmptyState
              icon={BadgePercent}
              title="Scholarships Unavailable"
              description="Unable to load scholarship records."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-amber-50 p-5">
                  <p className="text-sm text-amber-700">
                    Pending / Under Review
                  </p>

                  <p className="mt-3 text-3xl font-bold text-amber-800">
                    {pendingScholarships.length}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-5">
                  <p className="text-sm text-emerald-700">
                    Approved Applications
                  </p>

                  <p className="mt-3 text-3xl font-bold text-emerald-800">
                    {approvedWaiverCount}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {pendingScholarships.length === 0 ? (
                  <div className="rounded-xl bg-[#F6F8F3] p-4 text-sm text-[#718579]">
                    No scholarship applications
                    currently require review.
                  </div>
                ) : (
                  pendingScholarships
                    .slice(0, 5)
                    .map((item) => (
                      <div
                        key={getId(item)}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2EADC] p-4"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#234E43]">
                            {item.studentName ||
                              item.studentId}
                          </p>

                          <p className="mt-1 text-xs text-[#718579]">
                            {item.scholarshipName ||
                              item.scholarshipType}
                          </p>
                        </div>

                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                          {item.status}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </>
          )}
        </Panel>
      </section>

      {/* NOTICES */}
      <Panel>
        <SectionHeader
          title="Recent Notices"
          description="Published announcements for Accounts Officers"
        />

        {notices === null ? (
          <EmptyState
            icon={Bell}
            title="Notices Unavailable"
            description="Unable to retrieve announcements."
          />
        ) : recentNotices.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No Recent Notices"
            description="Published announcements will appear here."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recentNotices.map((notice) => (
              <div
                key={getId(notice)}
                className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Bell
                    size={17}
                    className="text-[#477764]"
                  />

                  <span className="text-xs font-semibold text-[#B18A28]">
                    {notice.category || "General"}
                  </span>
                </div>

                <h3 className="font-bold text-[#234E43]">
                  {notice.title}
                </h3>

                <p className="mt-3 text-xs text-[#718579]">
                  {formatDate(
                    notice.publishedAt ||
                    notice.createdAt
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* DATA SOURCE */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2EADC] pt-5 text-xs text-[#8AA092]">
        <span className="flex items-center gap-2">
          <Database size={15} />
          UniBee Accounts Dashboard · MongoDB
        </span>

        <span>
          Completed payments · Active fees ·
          Approved waivers
        </span>
      </div>
    </div>
  );
}
