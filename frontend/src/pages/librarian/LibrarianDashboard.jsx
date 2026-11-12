
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  LibraryBig,
  BookOpen,
  BookMarked,
  BookCheck,
  AlertTriangle,
  ClipboardList,
  ArrowLeftRight,
  PackageSearch,
  Megaphone,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Database,
  CalendarDays,
  Users,
  AlertCircle,
} from "lucide-react";

import {
  getLibraryBooks,
  getLibraryLoans,
  getLibraryRequests,
  getLibraryPurchasePlans,
  getLibraryAnnouncements,
} from "../../services/libraryApi";

// =========================================
// UNIBEE LIBRARIAN DASHBOARD
// MONGODB INTEGRATION
// =========================================

const BASE = "/librarian";

const SOURCES = [
  {
    key: "books",
    label: "Books",
    load: getLibraryBooks,
  },
  {
    key: "loans",
    label: "Circulation",
    load: getLibraryLoans,
  },
  {
    key: "requests",
    label: "Book Requests",
    load: getLibraryRequests,
  },
  {
    key: "purchasePlans",
    label: "Stock / Purchase Plans",
    load: getLibraryPurchasePlans,
  },
  {
    key: "announcements",
    label: "Announcements",
    load: getLibraryAnnouncements,
  },
];

const QUICK_ACTIONS = [
  {
    title: "Book Inventory",
    description: "Manage books and copies",
    icon: BookOpen,
    path: `${BASE}/books`,
  },
  {
    title: "Book Requests",
    description: "Review student requests",
    icon: ClipboardList,
    path: `${BASE}/requests`,
  },
  {
    title: "Issue & Return",
    description: "Manage book circulation",
    icon: ArrowLeftRight,
    path: `${BASE}/circulation`,
  },
  {
    title: "Stock Management",
    description: "Manage purchase plans",
    icon: PackageSearch,
    path: `${BASE}/stock`,
  },
  {
    title: "Announcements",
    description: "Publish library notices",
    icon: Megaphone,
    path: `${BASE}/announcements`,
  },
];

// =========================================
// HELPER FUNCTIONS
// =========================================

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result)
    ? result
    : 0;
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

  const raw = clean(value);

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

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return String(value._id || value.id || "");
}

function getRows(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  throw new Error(
    "Unexpected Library API response."
  );
}

function isReturned(loan) {
  return (
    Boolean(loan.returnDate) ||
    lower(loan.status) === "returned"
  );
}

function isOverdue(loan, today) {
  return (
    !isReturned(loan) &&
    Boolean(loan.dueDate) &&
    clean(loan.dueDate).slice(0, 10) < today
  );
}

// =========================================
// REUSABLE COMPONENTS
// =========================================

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  path,
  available,
}) {
  return (
    <Link
      to={path}
      className="group rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#718579]">
            {label}
          </p>

          <p className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {available
              ? value.toLocaleString("en-US")
              : "—"}
          </p>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-[#718579]">
          {available
            ? detail
            : "Data unavailable"}
        </p>

        <ArrowUpRight
          size={17}
          className="text-[#8AA092]"
        />
      </div>
    </Link>
  );
}

function Panel({
  title,
  description,
  icon: Icon,
  path,
  children,
}) {
  return (
    <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#EAF2E8] p-2.5 text-[#234E43]">
            <Icon size={20} />
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-[#234E43]">
              {title}
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              {description}
            </p>
          </div>
        </div>

        {path && (
          <Link
            to={path}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#234E43] hover:underline"
          >
            View All
            <ArrowUpRight size={15} />
          </Link>
        )}
      </div>

      {children}
    </section>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-xl bg-[#F6F8F3] px-5 py-9 text-center text-sm text-[#718579]">
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const value = lower(status);

  const green = [
    "returned",
    "approved",
    "published",
    "active",
    "completed",
  ];

  const amber = [
    "pending",
    "borrowed",
    "draft",
    "requested",
  ];

  let style =
    "bg-slate-100 text-slate-700";

  if (green.includes(value)) {
    style =
      "bg-emerald-50 text-emerald-700";
  } else if (amber.includes(value)) {
    style =
      "bg-amber-50 text-amber-800";
  } else if (
    ["overdue", "rejected"].includes(value)
  ) {
    style =
      "bg-rose-50 text-rose-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}
    >
      {status || "Unknown"}
    </span>
  );
}

// =========================================
// MAIN DASHBOARD
// =========================================

export default function LibrarianDashboard() {
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] =
    useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  // =======================================
  // LOAD ALL LIBRARY DATA
  // =======================================

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      const responses =
        await Promise.allSettled(
          SOURCES.map((source) =>
            source.load()
          )
        );

      if (!active) return;

      const nextData = {};
      const nextErrors = {};

      responses.forEach(
        (response, index) => {
          const source = SOURCES[index];

          if (
            response.status === "fulfilled"
          ) {
            try {
              nextData[source.key] =
                getRows(response.value);
            } catch (error) {
              nextData[source.key] = null;
              nextErrors[source.key] =
                error.message;
            }
          } else {
            nextData[source.key] = null;

            nextErrors[source.key] =
              response.reason?.message ||
              "Request failed.";
          }
        }
      );

      setData(nextData);
      setErrors(nextErrors);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    const onFocus = () => {
      refresh();
    };

    window.addEventListener(
      "focus",
      onFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        onFocus
      );
    };
  }, [refresh]);

  const books = data.books || [];
  const loans = data.loans || [];
  const requests = data.requests || [];
  const purchasePlans =
    data.purchasePlans || [];
  const announcements =
    data.announcements || [];

  const available = (key) =>
    Array.isArray(data[key]);

  const today = todayLocal();

  // =======================================
  // STATISTICS CALCULATION
  // =======================================

  const summary = useMemo(() => {
    const activeLoans =
      loans.filter(
        (loan) => !isReturned(loan)
      );

    const overdueLoans =
      activeLoans.filter(
        (loan) =>
          isOverdue(loan, today)
      );

    const totalCopies =
      books.reduce(
        (sum, book) =>
          sum + number(book.copies),
        0
      );

    const borrowedByBook =
      new Map();

    activeLoans.forEach((loan) => {
      const bookId = getId(
        loan.book
      );

      if (!bookId) return;

      borrowedByBook.set(
        bookId,
        (borrowedByBook.get(bookId) || 0) + 1
      );
    });

    const availableCopies =
      books.reduce((sum, book) => {
        const borrowed =
          borrowedByBook.get(
            getId(book)
          ) || 0;

        return sum + Math.max(
          0,
          number(book.copies) - borrowed
        );
      }, 0);

    const lowStockBooks =
      books.filter((book) => {
        if (
          lower(book.status) !==
          "active"
        ) {
          return false;
        }

        const borrowed =
          borrowedByBook.get(
            getId(book)
          ) || 0;

        const remaining =
          number(book.copies) - borrowed;

        return remaining > 0 &&
          remaining <= 3;
      });

    const pendingRequests =
      requests.filter(
        (request) =>
          lower(request.status) ===
          "pending"
      );

    const publishedNotices =
      announcements.filter(
        (notice) =>
          lower(notice.status) ===
          "published"
      );

    return {
      totalTitles: books.length,
      totalCopies,
      availableCopies,
      activeLoans: activeLoans.length,
      overdueLoans: overdueLoans.length,
      pendingRequests:
        pendingRequests.length,
      lowStockBooks:
        lowStockBooks.length,
      purchasePlans:
        purchasePlans.length,
      publishedNotices:
        publishedNotices.length,
    };
  }, [
    books,
    loans,
    requests,
    purchasePlans,
    announcements,
    today,
  ]);

  // =======================================
  // RECENT CIRCULATION RECORDS
  // =======================================

  const recentLoans = useMemo(
    () =>
      [...loans]
        .sort((a, b) =>
          clean(
            b.createdAt || b.issueDate
          ).localeCompare(
            clean(
              a.createdAt || a.issueDate
            )
          )
        )
        .slice(0, 6),
    [loans]
  );

  // =======================================
  // RECENT STUDENT REQUESTS
  // =======================================

  const recentRequests = useMemo(
    () =>
      [...requests]
        .sort((a, b) =>
          clean(
            b.createdAt
          ).localeCompare(
            clean(
              a.createdAt
            )
          )
        )
        .slice(0, 5),
    [requests]
  );

  const statistics = [
    {
      label: "Book Titles",
      value: summary.totalTitles,
      detail: "Catalogued books",
      icon: BookOpen,
      path: `${BASE}/books`,
      available: available("books"),
    },
    {
      label: "Total Book Copies",
      value: summary.totalCopies,
      detail: "Inventory copies",
      icon: LibraryBig,
      path: `${BASE}/books`,
      available: available("books"),
    },
    {
      label: "Available Copies",
      value: summary.availableCopies,
      detail: "Calculated from active loans",
      icon: BookCheck,
      path: `${BASE}/books`,
      available:
        available("books") &&
        available("loans"),
    },
    {
      label: "Books Issued",
      value: summary.activeLoans,
      detail: "Currently borrowed",
      icon: BookMarked,
      path: `${BASE}/circulation`,
      available: available("loans"),
    },
    {
      label: "Overdue Loans",
      value: summary.overdueLoans,
      detail: "Past due and not returned",
      icon: AlertTriangle,
      path: `${BASE}/circulation`,
      available: available("loans"),
    },
    {
      label: "Pending Requests",
      value: summary.pendingRequests,
      detail: "Awaiting librarian review",
      icon: ClipboardList,
      path: `${BASE}/requests`,
      available: available("requests"),
    },
    {
      label: "Low Stock Titles",
      value: summary.lowStockBooks,
      detail: "1–3 copies available",
      icon: PackageSearch,
      path: `${BASE}/books`,
      available:
        available("books") &&
        available("loans"),
    },
    {
      label: "Purchase Plans",
      value: summary.purchasePlans,
      detail: "Saved stock purchase plans",
      icon: CalendarDays,
      path: `${BASE}/stock`,
      available: available("purchasePlans"),
    },
  ];

  const connectedSources =
    SOURCES.filter(
      (source) =>
        available(source.key)
    ).length;

  // =======================================
  // RENDER DASHBOARD
  // =======================================

  return (
    <div className="space-y-7 pb-10">
      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18B37]">
            LIBRARY ADMINISTRATION
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-[#234E43]">
            Librarian Dashboard
          </h1>

          <p className="mt-2 text-sm text-[#718579]">
            Monitor books, circulation,
            requests and library operations.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#DCE8DA] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              loading ? "animate-spin" : ""
            }
          />
          Refresh Dashboard
        </button>
      </section>

      {/* HERO */}
      <section className="rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#E6C36B]">
          <LibraryBig size={17} />
          UNIBEE LIBRARY
        </div>

        <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
          Library Control Center
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
          Manage library books, handle student
          requests, issue and return books,
          monitor overdue loans and plan
          stock purchases.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="text-xs text-[#D0E2D7]">
              Today
            </p>

            <p className="mt-1 font-bold">
              {formatDate(today)}
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="text-xs text-[#D0E2D7]">
              Library Data Sources
            </p>

            <p className="mt-1 font-bold">
              {connectedSources} /{" "}
              {SOURCES.length}
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="text-xs text-[#D0E2D7]">
              API Status
            </p>

            <p className="mt-1 font-bold">
              {loading
                ? "Loading..."
                : connectedSources ===
                  SOURCES.length
                ? "Connected"
                : "Some sources unavailable"}
            </p>
          </div>
        </div>
      </section>

      {/* LOAD STATUS */}
      {loading && (
        <div className="flex items-center gap-2 rounded-xl bg-[#EAF2E8] p-4 text-sm text-[#234E43]">
          <RefreshCw
            size={17}
            className="animate-spin"
          />
          Loading Library data from MongoDB...
        </div>
      )}

      {!loading &&
        Object.keys(errors).length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <AlertCircle size={18} />
              Some Library Data Could Not Be Loaded
            </p>

            <div className="mt-2 space-y-1 text-xs text-amber-800">
              {SOURCES.filter(
                (source) =>
                  errors[source.key]
              ).map((source) => (
                <p key={source.key}>
                  <strong>
                    {source.label}:
                  </strong>{" "}
                  {errors[source.key]}
                </p>
              ))}
            </div>
          </div>
        )}

      {/* STATISTICS */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-[#234E43]">
          Library Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statistics.map((stat) => (
            <StatCard
              key={stat.label}
              {...stat}
              available={
                !loading && stat.available
              }
            />
          ))}
        </div>
      </section>

      {/* CIRCULATION + REQUESTS */}
      <section className="grid gap-6 xl:grid-cols-2">
        <Panel
          icon={ArrowLeftRight}
          title="Recent Book Circulation"
          description="Latest issue and return records"
          path={`${BASE}/circulation`}
        >
          {!available("loans") ? (
            <EmptyState>
              Circulation records are unavailable.
            </EmptyState>
          ) : recentLoans.length === 0 ? (
            <EmptyState>
              No book loans recorded yet.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {recentLoans.map(
                (loan, index) => {
                  const overdue =
                    isOverdue(loan, today);

                  return (
                    <div
                      key={
                        getId(loan) ||
                        index
                      }
                      className="rounded-xl border border-[#E2EADC] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[#234E43]">
                            {loan.bookTitle ||
                              "Book"}
                          </p>

                          <p className="mt-1 flex items-center gap-1 text-xs text-[#718579]">
                            <Users size={14} />
                            {loan.studentName ||
                              "Student"}
                            {" · "}
                            {loan.studentId ||
                              "—"}
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            overdue
                              ? "Overdue"
                              : isReturned(loan)
                              ? "Returned"
                              : "Borrowed"
                          }
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#718579]">
                        <span>
                          Issued:{" "}
                          {formatDate(
                            loan.issueDate
                          )}
                        </span>

                        <span>
                          Due:{" "}
                          {formatDate(
                            loan.dueDate
                          )}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </Panel>

        <Panel
          icon={ClipboardList}
          title="Recent Book Requests"
          description="Student book reservation requests"
          path={`${BASE}/requests`}
        >
          {!available("requests") ? (
            <EmptyState>
              Book Requests are unavailable.
            </EmptyState>
          ) : recentRequests.length === 0 ? (
            <EmptyState>
              No student requests yet.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {recentRequests.map(
                (request, index) => (
                  <div
                    key={
                      getId(request) ||
                      index
                    }
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2EADC] p-4"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#234E43]">
                        {request.bookTitle ||
                          "Book Request"}
                      </p>

                      <p className="mt-1 text-xs text-[#718579]">
                        {request.studentName ||
                          request.studentId ||
                          "Student"}
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        request.status
                      }
                    />
                  </div>
                )
              )}
            </div>
          )}
        </Panel>
      </section>

      {/* OPERATIONAL STATUS */}
      <section className="grid gap-6 xl:grid-cols-2">
        <Panel
          icon={AlertTriangle}
          title="Library Alerts"
          description="Items requiring attention"
        >
          <div className="space-y-3">
            {[
              {
                label: "Overdue Loans",
                value:
                  summary.overdueLoans,
                icon: Clock3,
                path:
                  `${BASE}/circulation`,
                ready:
                  available("loans"),
              },
              {
                label: "Pending Requests",
                value:
                  summary.pendingRequests,
                icon: ClipboardList,
                path:
                  `${BASE}/requests`,
                ready:
                  available("requests"),
              },
              {
                label: "Low Stock Titles",
                value:
                  summary.lowStockBooks,
                icon: BookMarked,
                path:
                  `${BASE}/books`,
                ready:
                  available("books") &&
                  available("loans"),
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F8F3] p-4 hover:bg-[#EAF2E8]"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold text-[#234E43]">
                    <Icon size={18} />
                    {item.label}
                  </span>

                  <strong className="text-lg text-[#234E43]">
                    {item.ready
                      ? item.value
                      : "—"}
                  </strong>
                </Link>
              );
            })}
          </div>
        </Panel>

        <Panel
          icon={Megaphone}
          title="Library Communications"
          description="Announcements and purchase planning"
        >
          <div className="space-y-3">
            <Link
              to={`${BASE}/announcements`}
              className="flex items-center justify-between rounded-xl bg-[#F6F8F3] p-4 hover:bg-[#EAF2E8]"
            >
              <span className="flex items-center gap-3 text-sm font-semibold text-[#234E43]">
                <Megaphone size={18} />
                Published Announcements
              </span>

              <strong className="text-lg">
                {available("announcements")
                  ? summary.publishedNotices
                  : "—"}
              </strong>
            </Link>

            <Link
              to={`${BASE}/stock`}
              className="flex items-center justify-between rounded-xl bg-[#F6F8F3] p-4 hover:bg-[#EAF2E8]"
            >
              <span className="flex items-center gap-3 text-sm font-semibold text-[#234E43]">
                <PackageSearch size={18} />
                Purchase Plans
              </span>

              <strong className="text-lg">
                {available("purchasePlans")
                  ? summary.purchasePlans
                  : "—"}
              </strong>
            </Link>
          </div>
        </Panel>
      </section>

      {/* QUICK ACTIONS */}
      <Panel
        icon={LibraryBig}
        title="Quick Actions"
        description="Open library management modules"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK_ACTIONS.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-start gap-3 rounded-xl border border-[#E2EADC] p-4 transition hover:bg-[#F6F8F3]"
              >
                <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                  <Icon size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#234E43]">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-xs text-[#718579]">
                    {item.description}
                  </p>
                </div>

                <ArrowUpRight
                  size={16}
                  className="text-[#8AA092]"
                />
              </Link>
            );
          })}
        </div>
      </Panel>

      {/* API CONNECTION STATUS */}
      <Panel
        icon={Database}
        title="MongoDB Data Sources"
        description="Status of Library API responses"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SOURCES.map((source) => {
            const ready = available(
              source.key
            );

            return (
              <div
                key={source.key}
                className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F8F3] p-4"
              >
                <div>
                  <p className="text-sm font-bold text-[#234E43]">
                    {source.label}
                  </p>

                  <p className="mt-1 text-xs text-[#718579]">
                    {loading
                      ? "Loading..."
                      : ready
                      ? `${data[source.key].length} records loaded`
                      : "Unavailable"}
                  </p>
                </div>

                {ready ? (
                  <CheckCircle2
                    size={19}
                    className="text-emerald-600"
                  />
                ) : (
                  <AlertCircle
                    size={19}
                    className="text-amber-600"
                  />
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* FOOTER */}
      <p className="text-center text-xs text-[#8AA092]">
        UniBee Librarian Portal · MongoDB
      </p>
    </div>
  );
}
