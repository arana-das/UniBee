
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  LayoutDashboard,
  ClipboardList,
  Armchair,
  Users,
  ListChecks,
  GraduationCap,
  Megaphone,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database,
  ShieldCheck,
  Clock3,
  BookOpen,
  FileCheck2,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ==========================================
// UNIBEE EXAM CONTROLLER DASHBOARD
// MongoDB-Based Operational Overview
// ==========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const BASE = "/exam-controller";

const DATA_SOURCES = [
  {
    key: "exams",
    title: "Examinations",
    path: "/api/examinations",
  },
  {
    key: "seatPlans",
    title: "Seat Plans",
    path: "/api/seat-plans",
  },
  {
    key: "marks",
    title: "Assessment Marks",
    path: "/api/course-assessment-marks",
  },
  {
    key: "results",
    title: "Results",
    path: "/api/results",
  },
  {
    key: "notices",
    title: "Notices",
    path: "/api/notices",
  },
];

// ==========================================
// UTILITIES
// ==========================================

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
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

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(
    Number(value) || 0
  );
}

function sourceRecords(result) {
  // Different UniBee modules may use
  // different response envelope names.
  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.examinations)) {
    return result.examinations;
  }

  if (Array.isArray(result?.exams)) {
    return result.exams;
  }

  if (Array.isArray(result?.seatPlans)) {
    return result.seatPlans;
  }

  if (Array.isArray(result?.marks)) {
    return result.marks;
  }

  if (Array.isArray(result?.results)) {
    return result.results;
  }

  if (Array.isArray(result?.notices)) {
    return result.notices;
  }

  if (Array.isArray(result?.data?.records)) {
    return result.data.records;
  }

  if (Array.isArray(result?.data?.items)) {
    return result.data.items;
  }

  if (Array.isArray(result?.data?.results)) {
    return result.data.results;
  }

  throw new Error(
    "Unexpected response structure."
  );
}

async function apiGet(path, signal) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to your Exam Controller account."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}${path}`,
      {
        method: "GET",
        cache: "no-store",
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Cannot connect to UniBee Backend."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message ||
      `HTTP ${response.status}`
    );
  }

  if (result?.success === false) {
    throw new Error(
      result.message || "Request failed."
    );
  }

  return sourceRecords(result);
}

// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({ status }) {
  const value = lower(status);

  const green = [
    "published",
    "approved",
    "completed",
    "verified",
    "active",
    "released",
  ];

  const amber = [
    "draft",
    "pending",
    "submitted",
    "scheduled",
    "under review",
  ];

  let styles =
    "bg-slate-100 text-slate-700";

  if (green.includes(value)) {
    styles =
      "bg-emerald-50 text-emerald-700";
  } else if (amber.includes(value)) {
    styles =
      "bg-amber-50 text-amber-800";
  } else if (
    ["rejected", "cancelled"].includes(value)
  ) {
    styles =
      "bg-rose-50 text-rose-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles}`}
    >
      {clean(status) || "Unknown"}
    </span>
  );
}

// ==========================================
// STATISTICS CARD
// ==========================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
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
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {available
              ? formatNumber(value)
              : "—"}
          </h3>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs leading-5 text-[#718579]">
          {available
            ? subtitle
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

// ==========================================
// DASHBOARD PANEL
// ==========================================

function Panel({
  icon: Icon,
  title,
  description,
  link,
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

            <p className="mt-1 text-xs leading-5 text-[#718579]">
              {description}
            </p>
          </div>
        </div>

        {link && (
          <Link
            to={link}
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

function EmptyState({ message }) {
  return (
    <div className="rounded-xl bg-[#F6F8F3] px-5 py-9 text-center text-sm text-[#718579]">
      {message}
    </div>
  );
}

// ==========================================
// QUICK ACTIONS
// ==========================================

const QUICK_ACTIONS = [
  {
    title: "Exam Management",
    description:
      "Create and manage examinations",
    icon: ClipboardList,
    path: `${BASE}/exams`,
  },
  {
    title: "Seat Plans",
    description:
      "Manage rooms, batches and seat capacity",
    icon: Armchair,
    path: `${BASE}/seat-plans`,
  },
  {
    title: "Marks Management",
    description:
      "Enter and publish assessment marks",
    icon: ListChecks,
    path: `${BASE}/marks`,
  },
  {
    title: "Results & Publishing",
    description:
      "Manage examination results",
    icon: GraduationCap,
    path: `${BASE}/results`,
  },
  {
    title: "Exam Notices",
    description:
      "View examination announcements",
    icon: Megaphone,
    path: `${BASE}/notices`,
  },
];

// ==========================================
// MAIN DASHBOARD
// ==========================================

export default function ExamControllerDashboard() {
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] =
    useState(true);
  const [refreshKey, setRefreshKey] =
    useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  // ======================================
  // LOAD MONGODB DASHBOARD DATA
  // ======================================

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);

      const results = await Promise.allSettled(
        DATA_SOURCES.map((source) =>
          apiGet(
            source.path,
            controller.signal
          )
        )
      );

      if (controller.signal.aborted) {
        return;
      }

      const nextData = {};
      const nextErrors = {};

      results.forEach((result, index) => {
        const key = DATA_SOURCES[index].key;

        if (result.status === "fulfilled") {
          nextData[key] = result.value;
        } else {
          nextData[key] = null;

          nextErrors[key] =
            result.reason?.message ||
            "Unable to load records.";
        }
      });

      setData(nextData);
      setErrors(nextErrors);
      setLoading(false);
    }

    load();

    return () => controller.abort();
  }, [refreshKey]);

  // Refresh on tab focus.
  useEffect(() => {
    const onFocus = () => refresh();

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

  // ======================================
  // SAFE SOURCE ACCESS
  // ======================================

  const exams = data.exams || [];
  const seatPlans = data.seatPlans || [];
  const marks = data.marks || [];
  const results = data.results || [];
  const notices = data.notices || [];

  const available = (key) =>
    Array.isArray(data[key]);

  // ======================================
  // DASHBOARD SUMMARY
  // ======================================

  const summary = useMemo(() => {
    const activeExams = exams.filter(
      (item) =>
        [
          "active",
          "scheduled",
          "ongoing",
          "upcoming",
        ].includes(lower(item.status))
    ).length;

    const totalAllocated = seatPlans.reduce(
      (sum, plan) =>
        sum + (
          Number.isFinite(Number(plan.total))
            ? Number(plan.total)
            : Array.isArray(plan.batches)
            ? plan.batches.reduce(
                (batchSum, batch) =>
                  batchSum +
                  (Number(batch.students) || 0),
                0
              )
            : 0
        ),
      0
    );

    const totalCapacity = seatPlans.reduce(
      (sum, plan) =>
        sum + (Number(plan.capacity) || 0),
      0
    );

    const uniqueRooms = new Set(
      seatPlans.map(
        (plan) =>
          `${lower(plan.building)}:${lower(plan.room)}`
      )
    ).size;

    const draftMarks = marks.filter(
      (mark) =>
        lower(mark.status) === "draft"
    ).length;

    const publishedMarks = marks.filter(
      (mark) =>
        lower(mark.status) === "published"
    ).length;

    const publishedResults = results.filter(
      (result) =>
        ["published", "released"].includes(
          lower(result.status)
        )
    ).length;

    const pendingResults = results.filter(
      (result) =>
        ![
          "published",
          "released",
          "cancelled",
          "rejected",
        ].includes(lower(result.status))
    ).length;

    const publishedNotices = notices.filter(
      (notice) =>
        ["published", "active"].includes(
          lower(notice.status)
        )
    ).length;

    return {
      totalExams: exams.length,
      activeExams,

      seatPlans: seatPlans.length,
      uniqueRooms,
      totalAllocated,
      totalCapacity,

      draftMarks,
      publishedMarks,
      totalMarks: marks.length,

      publishedResults,
      pendingResults,

      publishedNotices,
    };
  }, [
    exams,
    seatPlans,
    marks,
    results,
    notices,
  ]);

  const stats = [
    {
      title: "Total Examinations",
      value: summary.totalExams,
      subtitle:
        `${summary.activeExams} active or scheduled`,
      icon: ClipboardList,
      path: `${BASE}/exams`,
      available: available("exams"),
    },
    {
      title: "Seat Plan Records",
      value: summary.seatPlans,
      subtitle:
        `${summary.uniqueRooms} unique rooms`,
      icon: Armchair,
      path: `${BASE}/seat-plans`,
      available: available("seatPlans"),
    },
    {
      title: "Allocated Students",
      value: summary.totalAllocated,
      subtitle:
        `${formatNumber(summary.totalCapacity)} total planned seats`,
      icon: Users,
      path: `${BASE}/seat-plans`,
      available: available("seatPlans"),
    },
    {
      title: "Draft Assessment Marks",
      value: summary.draftMarks,
      subtitle:
        "Awaiting publication",
      icon: Clock3,
      path: `${BASE}/marks`,
      available: available("marks"),
    },
    {
      title: "Published Assessment Marks",
      value: summary.publishedMarks,
      subtitle:
        "Visible to enrolled students",
      icon: FileCheck2,
      path: `${BASE}/marks`,
      available: available("marks"),
    },
    {
      title: "Total Assessment Records",
      value: summary.totalMarks,
      subtitle:
        "Exam Controller marks records",
      icon: ListChecks,
      path: `${BASE}/marks`,
      available: available("marks"),
    },
    {
      title: "Published Results",
      value: summary.publishedResults,
      subtitle:
        `${summary.pendingResults} records not published`,
      icon: GraduationCap,
      path: `${BASE}/results`,
      available: available("results"),
    },
    {
      title: "Published Exam Notices",
      value: summary.publishedNotices,
      subtitle:
        "Published or active notices",
      icon: Megaphone,
      path: `${BASE}/notices`,
      available: available("notices"),
    },
  ];

  // ======================================
  // RECENT ASSESSMENT RECORDS
  // ======================================

  const recentMarks = useMemo(
    () =>
      [...marks]
        .sort((a, b) =>
          clean(
            b.updatedAt || b.createdAt
          ).localeCompare(
            clean(
              a.updatedAt || a.createdAt
            )
          )
        )
        .slice(0, 5),
    [marks]
  );

  // ======================================
  // RECENT SEAT PLANS
  // ======================================

  const recentSeatPlans = useMemo(
    () =>
      [...seatPlans]
        .sort((a, b) =>
          clean(b.examDate).localeCompare(
            clean(a.examDate)
          )
        )
        .slice(0, 5),
    [seatPlans]
  );

  const recentResults = useMemo(
    () =>
      [...results]
        .sort((a, b) =>
          clean(
            b.updatedAt || b.createdAt
          ).localeCompare(
            clean(
              a.updatedAt || a.createdAt
            )
          )
        )
        .slice(0, 4),
    [results]
  );

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7 pb-10">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            EXAMINATION ADMINISTRATION
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-[#234E43]">
            Examination Dashboard
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Monitor examinations, seat allocation,
            assessment marks and results.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-50"
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
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#E6C36B]">
            <ShieldCheck size={16} />
            EXAM CONTROLLER PORTAL
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            Examination Control Center
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Manage university examinations,
            assign students to rooms,
            review assessment records,
            and monitor result publication.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-xs text-[#D0E2D7]">
                Today's Date
              </p>

              <p className="mt-1 text-sm font-bold">
                {formatDate(new Date())}
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-xs text-[#D0E2D7]">
                Data Sources Available
              </p>

              <p className="mt-1 text-sm font-bold">
                {
                  DATA_SOURCES.filter(
                    (source) =>
                      available(source.key)
                  ).length
                }
                {" / "}
                {DATA_SOURCES.length}
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-xs text-[#D0E2D7]">
                Data Status
              </p>

              <p className="mt-1 text-sm font-bold">
                {loading
                  ? "Loading..."
                  : Object.keys(errors).length
                  ? "Some sources unavailable"
                  : "Connected"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DATA FETCH STATUS */}
      {loading && (
        <div className="flex items-center gap-2 rounded-xl bg-[#EAF2E8] p-4 text-sm text-[#234E43]">
          <RefreshCw
            size={17}
            className="animate-spin"
          />
          Loading dashboard data...
        </div>
      )}

      {!loading &&
        Object.keys(errors).length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <AlertCircle size={18} />
              Some Dashboard Sources Are
              Unavailable
            </div>

            <div className="mt-3 space-y-1 text-xs text-amber-800">
              {DATA_SOURCES.filter(
                (source) =>
                  errors[source.key]
              ).map((source) => (
                <p key={source.key}>
                  <strong>
                    {source.title}:
                  </strong>{" "}
                  {errors[source.key]}
                </p>
              ))}
            </div>
          </div>
        )}

      {/* STATISTICS */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Examination Overview
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            Statistics from available backend
            examination APIs
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.title}
              {...stat}
              available={
                !loading && stat.available
              }
            />
          ))}
        </div>
      </section>

      {/* SEAT PLANS AND ASSESSMENT MARKS */}
      <section className="grid gap-6 xl:grid-cols-2">
        <Panel
          icon={Armchair}
          title="Recent Seat Plans"
          description="Room-wise batch seat allocation"
          link={`${BASE}/seat-plans`}
        >
          {!available("seatPlans") ? (
            <EmptyState
              message="Seat Plan data is unavailable."
            />
          ) : recentSeatPlans.length === 0 ? (
            <EmptyState
              message="No Seat Plans have been saved yet."
            />
          ) : (
            <div className="space-y-3">
              {recentSeatPlans.map(
                (plan, index) => (
                  <div
                    key={
                      plan._id ||
                      plan.id ||
                      index
                    }
                    className="rounded-xl border border-[#E2EADC] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-[#234E43]">
                          Room {plan.room}
                        </h3>

                        <p className="mt-1 text-xs text-[#718579]">
                          {plan.building ||
                            "Campus"}
                          {" · "}
                          {plan.session ||
                            "Session"}
                        </p>
                      </div>

                      <span className="text-xs font-semibold text-[#234E43]">
                        {formatDate(
                          plan.examDate
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#718579]">
                      <span>
                        Students:{" "}
                        <strong>
                          {formatNumber(
                            plan.total ??
                              (plan.batches || [])
                                .reduce(
                                  (sum, b) =>
                                    sum +
                                    (Number(b.students) || 0),
                                  0
                                )
                          )}
                        </strong>
                      </span>

                      <span>
                        Capacity:{" "}
                        <strong>
                          {formatNumber(
                            plan.capacity
                          )}
                        </strong>
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </Panel>

        <Panel
          icon={ListChecks}
          title="Recent Assessment Marks"
          description="Quiz, Class Test, Midterm and Final"
          link={`${BASE}/marks`}
        >
          {!available("marks") ? (
            <EmptyState
              message="Assessment Marks data is unavailable."
            />
          ) : recentMarks.length === 0 ? (
            <EmptyState
              message="No assessment marks have been entered yet."
            />
          ) : (
            <div className="space-y-3">
              {recentMarks.map(
                (mark, index) => (
                  <div
                    key={
                      mark._id ||
                      mark.id ||
                      index
                    }
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2EADC] p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#234E43]">
                        {mark.assessmentName ||
                          "Assessment"}
                      </p>

                      <p className="mt-1 text-xs text-[#718579]">
                        {mark.course
                          ?.courseCode ||
                          "Course"}
                        {" · "}
                        {mark.student
                          ?.studentId ||
                          "Student"}
                      </p>

                      <p className="mt-1 text-xs text-[#718579]">
                        {mark.obtainedMarks}
                        {" / "}
                        {mark.maximumMarks}
                      </p>
                    </div>

                    <StatusBadge
                      status={mark.status}
                    />
                  </div>
                )
              )}
            </div>
          )}
        </Panel>
      </section>

      {/* RESULTS AND WORKFLOW */}
      <section className="grid gap-6 xl:grid-cols-2">
        <Panel
          icon={GraduationCap}
          title="Results & Publishing"
          description="Recent result publication records"
          link={`${BASE}/results`}
        >
          {!available("results") ? (
            <EmptyState
              message="Results data is unavailable. Check the Results API response."
            />
          ) : recentResults.length === 0 ? (
            <EmptyState
              message="No result records are available."
            />
          ) : (
            <div className="space-y-3">
              {recentResults.map(
                (result, index) => (
                  <div
                    key={
                      result._id ||
                      result.id ||
                      index
                    }
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F8F3] p-4"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#234E43]">
                        {result.examName ||
                          result.title ||
                          result.courseName ||
                          "Result Record"}
                      </p>

                      <p className="mt-1 text-xs text-[#718579]">
                        {result.department ||
                          result.semester ||
                          "Examination"}
                      </p>
                    </div>

                    <StatusBadge
                      status={result.status}
                    />
                  </div>
                )
              )}
            </div>
          )}
        </Panel>

        <Panel
          icon={BookOpen}
          title="Marks Publishing Workflow"
          description="Exam Controller assessment records"
          link={`${BASE}/marks`}
        >
          {!available("marks") ? (
            <EmptyState
              message="Marks workflow data is unavailable."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[#F6F8F3] p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-[#234E43]">
                  <Clock3 size={18} />
                  Draft Marks
                </span>

                <strong className="text-xl text-[#234E43]">
                  {summary.draftMarks}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#F6F8F3] p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-[#234E43]">
                  <CheckCircle2 size={18} />
                  Published Marks
                </span>

                <strong className="text-xl text-[#234E43]">
                  {summary.publishedMarks}
                </strong>
              </div>

              <p className="text-xs leading-6 text-[#718579]">
                These counts include Exam
                Controller assessment records
                only. Faculty Assignment
                Grading is managed separately.
              </p>
            </div>
          )}
        </Panel>
      </section>

      {/* QUICK ACTIONS */}
      <Panel
        icon={LayoutDashboard}
        title="Quick Actions"
        description="Open Exam Controller modules"
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

                  <p className="mt-1 text-xs leading-5 text-[#718579]">
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

      {/* DATA SOURCE STATUS */}
      <Panel
        icon={Database}
        title="Data Source Status"
        description="Backend API connection status"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DATA_SOURCES.map((source) => {
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
                    {source.title}
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
        UniBee Exam Controller — MongoDB
        Dashboard
      </p>
    </div>
  );
}
