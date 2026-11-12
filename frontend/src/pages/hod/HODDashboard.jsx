
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ChartNoAxesCombined,
  FileCheck2,
  FileBarChart2,
  Megaphone,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Activity,
  Database,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

import {
  getAuthToken,
  fetchCurrentUser,
  getStoredUser,
} from "../../services/authApi";

import {
  getFaculty,
} from "../../services/facultyApi";

import {
  getStudents,
} from "../../services/studentApi";

// ========================================
// CONFIGURATION
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const clean = (value) =>
  String(value ?? "").trim();

const norm = (value) =>
  clean(value).toLowerCase();

const idOf = (record) =>
  clean(record?._id || record?.id);

// ========================================
// AUTHENTICATED REQUESTS
// ========================================

async function apiGet(path, token) {
  if (!token) {
    throw new Error(
      "Authentication required. Please log in."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}/api${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch {
    throw new Error(
      "Cannot connect to UniBee backend."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
      `API request failed (${response.status}).`
    );
  }

  if (!Array.isArray(result.data)) {
    throw new Error(
      `Invalid API data returned for ${path}.`
    );
  }

  return result.data;
}

// ========================================
// DEPARTMENT MATCHING
// ========================================

function departmentValues(value) {
  if (value && typeof value === "object") {
    return [
      value.name,
      value.code,
      value._id,
      value.id,
    ]
      .map(norm)
      .filter(Boolean);
  }

  return [norm(value)].filter(Boolean);
}

function findDepartment(assigned, departments) {
  const assignedValues =
    departmentValues(assigned);

  return departments.find((department) =>
    departmentValues(department).some(
      (value) => assignedValues.includes(value)
    )
  );
}

function matchesDepartment(
  recordDepartment,
  assigned,
  departments
) {
  if (!assigned) return false;

  const department = findDepartment(
    assigned,
    departments
  );

  const allowed = new Set([
    ...departmentValues(assigned),
    ...(department
      ? departmentValues(department)
      : []),
  ]);

  return departmentValues(
    recordDepartment
  ).some((value) => allowed.has(value));
}

function assignedFacultyId(course) {
  const faculty = course?.faculty;

  if (!faculty) return "";

  return typeof faculty === "object"
    ? idOf(faculty)
    : clean(faculty);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return clean(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function localToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ========================================
// NOTICES
// ========================================

function isPublishedNotice(notice) {
  if (norm(notice.status) !== "published") {
    return false;
  }

  const today = localToday();

  const published = clean(
    notice.publishDate || notice.publishedAt
  ).slice(0, 10);

  const expires = clean(
    notice.expiryDate
  ).slice(0, 10);

  if (published && published > today) {
    return false;
  }

  if (expires && expires < today) {
    return false;
  }

  return true;
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#718579]">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#718579]">
        {subtitle}
      </p>
    </div>
  );
}

function QuickLink({
  to,
  title,
  description,
  icon: Icon,
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-[#E2EADC] bg-white p-4 transition hover:border-[#A6C1A4] hover:shadow-md"
    >
      <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
        <Icon size={21} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#234E43]">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-[#718579]">
          {description}
        </p>
      </div>

      <ArrowUpRight
        size={18}
        className="shrink-0 text-[#8AA092] transition group-hover:text-[#234E43]"
      />
    </Link>
  );
}

function EmptyInfo({ title, detail }) {
  return (
    <div className="rounded-xl bg-[#F6F8F3] p-5 text-center">
      <Database
        size={25}
        className="mx-auto text-[#A6C1A4]"
      />

      <p className="mt-3 text-sm font-semibold text-[#234E43]">
        {title}
      </p>

      <p className="mt-2 text-xs leading-6 text-[#718579]">
        {detail}
      </p>
    </div>
  );
}

// ========================================
// MAIN HOD DASHBOARD
// ========================================

export default function HODDashboard() {
  const [user, setUser] =
    useState(getStoredUser);

  const [departments, setDepartments] =
    useState([]);

  const [faculty, setFaculty] =
    useState([]);

  const [students, setStudents] =
    useState([]);

  const [courses, setCourses] =
    useState([]);

  const [approvals, setApprovals] =
    useState([]);

  const [notices, setNotices] =
    useState([]);

  const [adminDepartment, setAdminDepartment] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [feedback, setFeedback] =
    useState("");

  const [sourceErrors, setSourceErrors] =
    useState({});

  const [sourceReady, setSourceReady] =
    useState({});

  // ======================================
  // LOAD LIVE MONGODB DATA
  // ======================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setFeedback("");
    setSourceErrors({});
    setSourceReady({});

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error(
          "Please sign in to your UniBee account."
        );
      }

      const currentUser =
        await fetchCurrentUser();

      if (
        !["hod", "admin"].includes(
          currentUser?.role
        )
      ) {
        throw new Error(
          "Your account cannot access the HOD Dashboard."
        );
      }

      setUser(currentUser);

      const requests = {
        departments: () =>
          apiGet("/academic/departments", token),

        faculty: () =>
          getFaculty(),

        students: () =>
          getStudents(token),

        courses: () =>
          apiGet("/academic/courses", token),

        approvals: () =>
          apiGet("/academic-approvals", token),

        notices: () =>
          apiGet("/notices", token),
      };

      const keys = Object.keys(requests);

      const results = await Promise.allSettled(
        keys.map((key) => requests[key]())
      );

      const values = {};
      const errors = {};
      const ready = {};

      results.forEach((result, index) => {
        const key = keys[index];

        if (
          result.status === "fulfilled" &&
          Array.isArray(result.value)
        ) {
          values[key] = result.value;
          ready[key] = true;
        } else {
          values[key] = [];
          ready[key] = false;

          errors[key] =
            result.status === "rejected"
              ? result.reason?.message ||
                "Unable to load records."
              : "Invalid server response.";
        }
      });

      setDepartments(values.departments);
      setFaculty(values.faculty);
      setStudents(values.students);
      setCourses(values.courses);
      setApprovals(values.approvals);
      setNotices(values.notices);

      setSourceErrors(errors);
      setSourceReady(ready);
    } catch (requestError) {
      setError(
        requestError?.message ||
        "Unable to load the HOD Dashboard."
      );

      setDepartments([]);
      setFaculty([]);
      setStudents([]);
      setCourses([]);
      setApprovals([]);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ======================================
  // CURRENT DEPARTMENT
  // ======================================

  const isHOD = user?.role === "hod";

  const assignedDepartment = isHOD
    ? clean(user?.department)
    : adminDepartment;

  const department = useMemo(
    () =>
      findDepartment(
        assignedDepartment,
        departments
      ),
    [assignedDepartment, departments]
  );

  const hasDepartment = Boolean(
    department && sourceReady.departments
  );

  const displayDepartment =
    department?.name ||
    assignedDepartment;

  // ======================================
  // FILTER DEPARTMENT RECORDS
  // ======================================

  const departmentFaculty = useMemo(
    () =>
      hasDepartment
        ? faculty.filter((person) =>
            matchesDepartment(
              person.department,
              assignedDepartment,
              departments
            )
          )
        : [],
    [
      faculty,
      assignedDepartment,
      departments,
      hasDepartment,
    ]
  );

  const departmentStudents = useMemo(
    () =>
      hasDepartment
        ? students.filter((student) =>
            matchesDepartment(
              student.department,
              assignedDepartment,
              departments
            )
          )
        : [],
    [
      students,
      assignedDepartment,
      departments,
      hasDepartment,
    ]
  );

  const departmentCourses = useMemo(
    () =>
      hasDepartment
        ? courses.filter((course) =>
            matchesDepartment(
              course.department,
              assignedDepartment,
              departments
            )
          )
        : [],
    [
      courses,
      assignedDepartment,
      departments,
      hasDepartment,
    ]
  );

  const departmentApprovals = useMemo(
    () =>
      hasDepartment
        ? approvals.filter((request) =>
            matchesDepartment(
              request.department,
              assignedDepartment,
              departments
            )
          )
        : [],
    [
      approvals,
      assignedDepartment,
      departments,
      hasDepartment,
    ]
  );

  const pendingApprovals = useMemo(
    () =>
      departmentApprovals
        .filter(
          (request) =>
            norm(request.status) === "pending"
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
        ),
    [departmentApprovals]
  );

  // ======================================
  // COURSE ALLOCATIONS
  // ======================================

  const allocatedCourses = useMemo(
    () =>
      departmentCourses.filter(
        (course) => !!assignedFacultyId(course)
      ),
    [departmentCourses]
  );

  // ======================================
  // DEPARTMENT NOTICES
  // ======================================

  const publishedNotices = useMemo(() => {
    if (!hasDepartment) return [];

    return notices
      .filter((notice) => {
        if (!isPublishedNotice(notice)) {
          return false;
        }

        const noticeDepartment = clean(
          notice.department
        );

        if (!noticeDepartment) {
          return false;
        }

        return matchesDepartment(
          noticeDepartment,
          assignedDepartment,
          departments
        );
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return a.pinned ? -1 : 1;
        }

        return (
          new Date(b.publishedAt || b.createdAt || 0) -
          new Date(a.publishedAt || a.createdAt || 0)
        );
      });
  }, [
    notices,
    assignedDepartment,
    departments,
    hasDepartment,
  ]);

  // ======================================
  // DASHBOARD STATISTICS
  // ======================================

  function count(source, records) {
    if (
      loading ||
      error ||
      !hasDepartment ||
      !sourceReady[source]
    ) {
      return "—";
    }

    return records.length;
  }

  const stats = [
    {
      title: "Faculty Members",
      value: count("faculty", departmentFaculty),
      subtitle: "Faculty in your department",
      icon: Users,
    },
    {
      title: "Students",
      value: count("students", departmentStudents),
      subtitle: "Registered department students",
      icon: GraduationCap,
    },
    {
      title: "Courses",
      value: count("courses", departmentCourses),
      subtitle: "Department academic courses",
      icon: BookOpen,
    },
    {
      title: "Pending Approvals",
      value: count("approvals", pendingApprovals),
      subtitle: "Requests awaiting HOD review",
      icon: FileCheck2,
    },
    {
      title: "Allocated Courses",
      value: count("courses", allocatedCourses),
      subtitle: "Courses assigned to faculty",
      icon: CheckCircle2,
    },
    {
      title: "Unassigned Courses",
      value:
        loading ||
        error ||
        !hasDepartment ||
        !sourceReady.courses
          ? "—"
          : departmentCourses.length -
            allocatedCourses.length,
      subtitle: "Courses awaiting allocation",
      icon: ClipboardCheck,
    },
  ];

  // ======================================
  // QUICK LINKS
  // ======================================

  const quickLinks = [
    {
      to: "/hod/faculty",
      title: "Faculty Management",
      description:
        "Review department faculty and workload",
      icon: Users,
    },
    {
      to: "/hod/students",
      title: "Student Records",
      description:
        "View department students",
      icon: GraduationCap,
    },
    {
      to: "/hod/course-allocation",
      title: "Course Allocation",
      description:
        "Assign courses to faculty",
      icon: BookOpen,
    },
    {
      to: "/hod/schedule",
      title: "Class Schedule",
      description:
        "Manage department class planning",
      icon: CalendarDays,
    },
    {
      to: "/hod/attendance",
      title: "Attendance Overview",
      description:
        "Monitor student attendance",
      icon: ClipboardCheck,
    },
    {
      to: "/hod/performance",
      title: "Academic Performance",
      description:
        "Review student academic progress",
      icon: ChartNoAxesCombined,
    },
    {
      to: "/hod/approvals",
      title: "Academic Approvals",
      description:
        "Review pending requests",
      icon: FileCheck2,
    },
    {
      to: "/hod/notices",
      title: "Department Notices",
      description:
        "Manage department announcements",
      icon: Megaphone,
    },
    {
      to: "/hod/reports",
      title: "Department Reports",
      description:
        "Explore academic reports",
      icon: FileBarChart2,
    },
    {
      to: "/hod/profile",
      title: "My Profile",
      description:
        "Manage your HOD profile",
      icon: ShieldCheck,
    },
  ];

  function refreshDashboard() {
    loadData();
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            ACADEMIC LEADERSHIP
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Department Dashboard
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Monitor department faculty, students,
            courses, allocations and academic requests.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshDashboard}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
        >
          <RefreshCw
            size={18}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </section>

      {/* ACTIVE DEPARTMENT */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
              <Building2 size={23} />
            </div>

            <div>
              <h2 className="font-bold text-[#234E43]">
                Active Department
              </h2>

              <p className="mt-1 text-xs text-[#718579]">
                {isHOD
                  ? "Department assigned to your HOD account"
                  : "Select a department"}
              </p>
            </div>
          </div>

          {isHOD ? (
            <div className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72">
              {displayDepartment ||
                "No department assigned"}
            </div>
          ) : (
            <select
              aria-label="Select department"
              value={adminDepartment}
              disabled={loading}
              onChange={(event) =>
                setAdminDepartment(event.target.value)
              }
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72"
            >
              <option value="">
                Select Department
              </option>

              {departments.map((item) => (
                <option
                  key={idOf(item)}
                  value={item.name}
                >
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* LOADING AND ERRORS */}
      {loading && (
        <p
          role="status"
          className="rounded-xl bg-[#F6F8F3] p-4 text-sm text-[#234E43]"
        >
          Loading live MongoDB dashboard records...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle
            size={18}
            className="shrink-0"
          />
          {error}
        </p>
      )}

      {!loading && !error && !hasDepartment && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle
            size={18}
            className="shrink-0"
          />

          {assignedDepartment
            ? "Your assigned department could not be matched with Admin Departments."
            : "No department assigned. Contact Admin."}
        </p>
      )}

      {!loading &&
        !error &&
        Object.keys(sourceErrors).length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-bold">
              Some dashboard records could not be loaded:
            </p>

            <div className="mt-2 space-y-1">
              {Object.entries(sourceErrors).map(
                ([key, message]) => (
                  <p key={key}>
                    {key}: {message}
                  </p>
                )
              )}
            </div>
          </div>
        )}

      {feedback && (
        <p
          role="status"
          className="rounded-xl bg-[#EAF2E8] p-4 text-sm text-[#234E43]"
        >
          {feedback}
        </p>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[36px] border-white/5" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-[#D9A536]">
            <ShieldCheck size={16} />
            HEAD OF DEPARTMENT
          </div>

          <h2 className="mt-5 text-2xl font-extrabold md:text-3xl">
            {displayDepartment ||
              "Your Academic Department"}
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-7 text-[#D0E2D7]">
            Coordinate department activities,
            supervise academic resources and
            support students and faculty from
            one connected workspace.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/hod/course-allocation"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D9A536] px-5 py-3 text-sm font-bold text-[#234E43]"
            >
              Manage Courses
              <ArrowUpRight size={17} />
            </Link>

            <Link
              to="/hod/reports"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              View Reports
            </Link>
          </div>
        </div>
      </section>

      {/* LIVE STATISTICS */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Activity
            size={20}
            className="text-[#234E43]"
          />

          <h2 className="text-lg font-bold text-[#234E43]">
            Department Overview
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <StatCard
              key={stat.title}
              {...stat}
            />
          ))}
        </div>
      </section>

      {/* ACADEMIC OVERVIEW + APPROVALS */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* ACADEMIC OVERVIEW */}
        <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-2">
            <Activity
              size={20}
              className="text-[#234E43]"
            />

            <h2 className="text-lg font-bold text-[#234E43]">
              Academic Overview
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {[
              {
                title: "Attendance Monitoring",
                icon: ClipboardCheck,
                path: "/hod/attendance",
                detail: "Attendance integration pending",
              },
              {
                title: "Academic Performance",
                icon: ChartNoAxesCombined,
                path: "/hod/performance",
                detail: "Results integration pending",
              },
              {
                title: "Class Timetable",
                icon: CalendarDays,
                path: "/hod/schedule",
                detail: "Schedule integration pending",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  to={item.path}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F8F3] p-4 transition hover:bg-[#EAF2E8]"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={19}
                      className="text-[#234E43]"
                    />

                    <div>
                      <p className="text-sm font-bold text-[#234E43]">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs text-[#718579]">
                        {item.detail}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    size={17}
                    className="text-[#718579]"
                  />
                </Link>
              );
            })}
          </div>
        </section>

        {/* PENDING APPROVALS */}
        <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileCheck2
                size={20}
                className="text-[#234E43]"
              />

              <h2 className="text-lg font-bold text-[#234E43]">
                Pending Approvals
              </h2>
            </div>

            <Link
              to="/hod/approvals"
              className="text-xs font-bold text-[#234E43]"
            >
              View All
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {!loading &&
            hasDepartment &&
            sourceReady.approvals &&
            pendingApprovals.length > 0 ? (
              pendingApprovals
                .slice(0, 4)
                .map((request) => (
                  <div
                    key={idOf(request)}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F8F3] p-4"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-[#234E43]">
                        {request.title ||
                          request.type ||
                          "Academic Request"}
                      </p>

                      <p className="mt-1 text-xs text-[#718579]">
                        {formatDate(
                          request.createdAt
                        )}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                      Pending
                    </span>
                  </div>
                ))
            ) : (
              <EmptyInfo
                title={
                  loading
                    ? "Loading Approvals"
                    : !sourceReady.approvals
                      ? "Approvals Unavailable"
                      : "No Pending Approvals"
                }
                detail={
                  loading
                    ? "Loading MongoDB approval records."
                    : !sourceReady.approvals
                      ? "Approval records could not be verified."
                      : "No requests are awaiting review."
                }
              />
            )}
          </div>
        </section>
      </div>

      {/* DEPARTMENT NOTICES */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone
              size={20}
              className="text-[#234E43]"
            />

            <h2 className="text-lg font-bold text-[#234E43]">
              Recent Department Notices
            </h2>
          </div>

          <Link
            to="/hod/notices"
            className="text-xs font-bold text-[#234E43]"
          >
            Manage Notices
          </Link>
        </div>

        <p className="mt-2 text-xs leading-6 text-[#718579]">
          Published notices for this department,
          excluding expired notices.
        </p>

        <div className="mt-5">
          {!loading &&
          hasDepartment &&
          sourceReady.notices &&
          publishedNotices.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {publishedNotices
                .slice(0, 4)
                .map((notice) => (
                  <article
                    key={idOf(notice)}
                    className="rounded-xl bg-[#F6F8F3] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                        Published
                      </span>

                      {notice.pinned && (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
                          Pinned
                        </span>
                      )}
                    </div>

                    <p className="mt-3 break-words text-sm font-bold text-[#234E43]">
                      {notice.title ||
                        "Department Notice"}
                    </p>

                    <p className="mt-2 line-clamp-2 text-xs leading-6 text-[#718579]">
                      {notice.content ||
                        "No description available."}
                    </p>

                    <p className="mt-4 flex items-center gap-1 text-xs text-[#8AA092]">
                      <Clock3 size={13} />
                      {formatDate(
                        notice.publishedAt ||
                        notice.createdAt
                      )}
                    </p>
                  </article>
                ))}
            </div>
          ) : (
            <EmptyInfo
              title={
                loading
                  ? "Loading Notices"
                  : !sourceReady.notices
                    ? "Notices Unavailable"
                    : "No Published Department Notices"
              }
              detail={
                loading
                  ? "Loading notice records."
                  : !sourceReady.notices
                    ? "Notice records could not be verified."
                    : "No active department notices are currently available."
              }
            />
          )}
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Department Management
          </h2>

          <p className="mt-2 text-sm text-[#718579]">
            Quick access to academic management modules.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <QuickLink
              key={item.to}
              {...item}
            />
          ))}
        </div>
      </section>

      {/* INTEGRATION NOTICE */}
      <div className="flex items-start gap-3 rounded-xl border border-[#E2EADC] bg-[#F6F8F3] p-4 text-xs leading-6 text-[#45685B]">
        <AlertCircle
          size={18}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>MongoDB Dashboard:</strong>{" "}
          Faculty, Students, Courses,
          Allocations and Academic Approvals
          are loaded from authenticated backend
          APIs. Missing API data displays an
          unavailable indicator rather than
          an unverified zero. Attendance,
          Results and Schedule integration
          remain separate development tasks.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee HOD Portal · Department Dashboard · MongoDB
      </p>
    </div>
  );
}
