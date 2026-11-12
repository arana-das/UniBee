
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";
import { getFaculty as fetchFacultyAPI } from "../../services/facultyApi";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const DEPARTMENT_KEY = "unibee-hod-selected-department-v1";
const PAGE_SIZE = 8;

const clean = (value) => String(value ?? "").trim();
const norm = (value) => clean(value).toLowerCase();

const recordId = (record) =>
  clean(record?._id || record?.id || record?.facultyId);

async function fetchDepartments() {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in to access department records.");
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}/api/academic/departments`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch {
    throw new Error("Cannot connect to the UniBee backend.");
  }

  const result = await response.json().catch(() => null);

  if (
    !response.ok ||
    !result?.success ||
    !Array.isArray(result.data)
  ) {
    throw new Error(
      result?.message ||
        `Unable to load departments (${response.status}).`
    );
  }

  return result.data;
}

function loadRememberedDepartment() {
  try {
    return localStorage.getItem(DEPARTMENT_KEY) || "";
  } catch {
    return "";
  }
}

function storeDepartment(value) {
  try {
    if (value) {
      localStorage.setItem(DEPARTMENT_KEY, value);
    } else {
      localStorage.removeItem(DEPARTMENT_KEY);
    }
  } catch {
    // Preference storage may be disabled.
  }
}

function matchDepartment(member, department) {
  if (!department) return false;

  // Admin Faculty stores a department name.
  const identifiers = [
    department.name,
    department.code,
    department._id,
    department.id,
  ]
    .map(norm)
    .filter(Boolean);

  const assigned = member?.department;

  const candidates =
    typeof assigned === "object" && assigned !== null
      ? [
          assigned.name,
          assigned.code,
          assigned._id,
          assigned.id,
        ]
      : [
          assigned,
          member?.departmentName,
          member?.departmentId,
        ];

  return candidates.some((candidate) =>
    identifiers.includes(norm(candidate))
  );
}

function downloadCSV(rows) {
  const escape = (value) => {
    let cell = clean(value);

    if (/^[=+\-@\t\r]/.test(cell)) {
      cell = `'${cell}`;
    }

    return `"${cell.replace(/"/g, '""')}"`;
  };

  const content = [
    [
      "Faculty ID",
      "Name",
      "Department",
      "Designation",
      "Email",
      "Phone",
      "Qualification",
      "Specialization",
      "Experience",
      "Office",
      "Joining Date",
      "Status",
    ],
    ...rows.map((f) => [
      f.facultyId,
      f.name,
      f.department,
      f.designation,
      f.email,
      f.phone,
      f.qualification,
      f.specialization,
      f.experience,
      f.office,
      f.joiningDate,
      f.status,
    ]),
  ]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");

  const url = URL.createObjectURL(
    new Blob(["\uFEFF", content], {
      type: "text/csv;charset=utf-8",
    })
  );

  const a = document.createElement("a");

  a.href = url;
  a.download = "UniBee_HOD_Faculty.csv";

  document.body.appendChild(a);
  a.click();
  a.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#718579]">{title}</p>

          <p className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-3 text-xs text-[#718579]">
        {subtitle}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    "on leave": "bg-amber-50 text-amber-700",
    inactive: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
        styles[norm(status)] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function FacultyDetails({ faculty, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fields = [
    ["Faculty ID", faculty.facultyId],
    ["Department", faculty.department],
    ["Designation", faculty.designation],
    ["Email", faculty.email],
    ["Phone", faculty.phone],
    ["Qualification", faculty.qualification],
    ["Specialization", faculty.specialization],
    ["Experience", `${faculty.experience ?? 0} Years`],
    ["Office", faculty.office],
    [
      "Joining Date",
      faculty.joiningDate
        ? String(faculty.joiningDate).slice(0, 10)
        : "",
    ],
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hod-faculty-profile-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-[#EAF2E8] p-4 text-[#234E43]">
              <UserRound size={30} />
            </div>

            <div>
              <p className="text-xs font-bold tracking-wider text-[#B18B37]">
                FACULTY PROFILE
              </p>

              <h2
                id="hod-faculty-profile-title"
                className="mt-2 text-xl font-extrabold text-[#234E43]"
              >
                {faculty.name}
              </h2>

              <p className="mt-1 text-sm text-[#718579]">
                {faculty.designation || "Not specified"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close faculty details"
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X size={21} />
          </button>
        </div>

        <div className="mt-6">
          <StatusBadge status={faculty.status} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl bg-[#F6F8F3] p-4"
            >
              <p className="text-xs text-[#718579]">
                {label}
              </p>

              <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
                {clean(value) || "Not provided"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-[#E2EADC] bg-[#F9FBF8] p-4">
          <div className="flex items-center gap-2 font-bold text-[#234E43]">
            <BookOpen size={18} />
            Assigned Courses
          </div>

          <p className="mt-2 text-xs leading-6 text-[#718579]">
            Course assignments will appear after the HOD
            Course Allocation API is integrated. No
            unverified allocation counts are shown.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white"
        >
          Close Details
        </button>
      </section>
    </div>
  );
}

export default function HODFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [departmentId, setDepartmentId] = useState(
    loadRememberedDepartment
  );

  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] =
    useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [page, setPage] = useState(1);
  const [selectedFaculty, setSelectedFaculty] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");
    setFeedback("");

    try {
      const [facultyResult, departmentResult] =
        await Promise.all([
          fetchFacultyAPI(),
          fetchDepartments(),
        ]);

      if (!Array.isArray(facultyResult)) {
        throw new Error(
          "Invalid faculty list returned by server."
        );
      }

      setFaculty(facultyResult);
      setDepartments(departmentResult);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load MongoDB faculty records."
      );

      setFaculty([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const sortedDepartments = useMemo(
    () =>
      [...departments].sort((a, b) =>
        clean(a.name).localeCompare(clean(b.name))
      ),
    [departments]
  );

  const department = sortedDepartments.find((d) =>
    [d._id, d.id, d.name, d.code].some(
      (value) =>
        norm(value) &&
        norm(value) === norm(departmentId)
    )
  );

  const scopedFaculty = useMemo(
    () =>
      department
        ? faculty.filter((member) =>
            matchDepartment(member, department)
          )
        : [],
    [faculty, department]
  );

  const designations = useMemo(
    () =>
      [
        ...new Set(
          scopedFaculty
            .map((f) => clean(f.designation))
            .filter(Boolean)
        ),
      ].sort(),
    [scopedFaculty]
  );

  const statuses = useMemo(
    () =>
      [
        ...new Set(
          scopedFaculty
            .map((f) => clean(f.status))
            .filter(Boolean)
        ),
      ].sort(),
    [scopedFaculty]
  );

  const filteredFaculty = useMemo(
    () =>
      scopedFaculty.filter((f) => {
        const searchable = [
          f.name,
          f.facultyId,
          f.email,
          f.phone,
          f.designation,
          f.specialization,
        ];

        return (
          searchable.some((value) =>
            norm(value).includes(norm(search))
          ) &&
          (designationFilter === "All" ||
            f.designation === designationFilter) &&
          (statusFilter === "All" ||
            f.status === statusFilter)
        );
      }),
    [
      scopedFaculty,
      search,
      designationFilter,
      statusFilter,
    ]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFaculty.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleFaculty = filteredFaculty.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const resetFilters = () => {
    setSearch("");
    setDesignationFilter("All");
    setStatusFilter("All");
    setPage(1);
  };

  const changeDepartment = (value) => {
    setDepartmentId(value);
    storeDepartment(value);
    resetFilters();
    setSelectedFaculty(null);
  };

  const showValues = !loading && !error && !!department;

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            DEPARTMENT MANAGEMENT
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Faculty Members
          </h1>

          <p className="mt-2 text-sm text-[#718579]">
            View department faculty and academic roles
            from live MongoDB records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
          >
            <RefreshCw
              size={17}
              className={
                loading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              downloadCSV(filteredFaculty);
              setFeedback(
                "Faculty report exported successfully."
              );
            }}
            disabled={
              !showValues || !filteredFaculty.length
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </section>

      {/* DEPARTMENT SELECTOR */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
            <Building2 size={22} />
          </div>

          <div>
            <p className="font-bold text-[#234E43]">
              Selected Department
            </p>

            <p className="mt-1 text-xs text-[#718579]">
              Faculty records are filtered by department.
            </p>
          </div>
        </div>

        <select
          aria-label="Select department"
          value={
            department
              ? clean(
                  department._id ||
                    department.id ||
                    department.name
                )
              : ""
          }
          onChange={(event) =>
            changeDepartment(event.target.value)
          }
          disabled={
            loading ||
            !!error ||
            !sortedDepartments.length
          }
          className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72"
        >
          <option value="">
            Select Department
          </option>

          {sortedDepartments.map((d) => (
            <option
              key={recordId(d)}
              value={clean(
                d._id || d.id || d.name
              )}
            >
              {d.name}
            </option>
          ))}
        </select>
      </section>

      {/* MESSAGES */}
      {loading && (
        <p
          role="status"
          className="rounded-xl bg-[#F6F8F3] p-4 text-sm text-[#234E43]"
        >
          Loading department faculty from MongoDB...
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

      {feedback && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </p>
      )}

      {!loading && !error && !department && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle size={18} />
          Select a department to view its faculty.
        </p>
      )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Department Faculty"
          value={
            showValues ? scopedFaculty.length : "—"
          }
          subtitle="Faculty in selected department"
          icon={Users}
        />

        <StatCard
          title="Active Faculty"
          value={
            showValues
              ? scopedFaculty.filter(
                  (f) =>
                    norm(f.status) === "active"
                ).length
              : "—"
          }
          subtitle="Active faculty records"
          icon={CheckCircle2}
        />

        <StatCard
          title="Designations"
          value={
            showValues ? designations.length : "—"
          }
          subtitle="Distinct designation types"
          icon={BriefcaseBusiness}
        />

        <StatCard
          title="Faculty With Allocated Courses"
          value="—"
          subtitle="Requires course allocation API integration"
          icon={BookOpen}
        />
      </section>

      {/* FACULTY DIRECTORY */}
      <section className="overflow-hidden rounded-2xl border border-[#E2EADC] bg-white shadow-sm">
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#234E43]">
                Department Faculty Directory
              </h2>

              <p className="mt-1 text-xs text-[#718579]">
                Read-only view of Admin MongoDB
                faculty records
              </p>
            </div>

            <span className="rounded-full bg-[#F6F8F3] px-3 py-2 text-xs font-bold text-[#234E43]">
              {showValues
                ? filteredFaculty.length
                : 0}{" "}
              Records
            </span>
          </div>

          {/* FILTERS */}
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_170px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA092]"
              />

              <input
                type="search"
                aria-label="Search faculty"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, ID or email..."
                className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#A6C1A4]"
              />
            </div>

            <select
              aria-label="Filter designation"
              value={designationFilter}
              onChange={(event) => {
                setDesignationFilter(
                  event.target.value
                );
                setPage(1);
              }}
              className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm text-[#45685B]"
            >
              <option value="All">
                All Designations
              </option>

              {designations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value
                );
                setPage(1);
              }}
              className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm text-[#45685B]"
            >
              <option value="All">
                All Statuses
              </option>

              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FACULTY TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
              <tr>
                {[
                  "Faculty Member",
                  "Faculty ID",
                  "Designation",
                  "Contact",
                  "Allocated Courses",
                  "Status",
                  "Action",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-5 py-4"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EDF1EB]">
              {showValues &&
                visibleFaculty.map((f, i) => (
                  <tr
                    key={recordId(f) || i}
                    className="hover:bg-[#F9FBF8]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                          <UserRound size={21} />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-[#234E43]">
                            {f.name ||
                              "Unnamed Faculty"}
                          </p>

                          <p className="mt-1 text-xs text-[#718579]">
                            Department Faculty
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {f.facultyId || "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {f.designation || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1 text-xs text-[#607B6C]">
                        <p className="flex items-center gap-2">
                          <Mail size={13} />
                          {f.email || "—"}
                        </p>

                        <p className="flex items-center gap-2">
                          <Phone size={13} />
                          {f.phone || "—"}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-amber-700">
                      Not linked yet
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={f.status}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFaculty(f)
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-[#EAF2E8] px-3 py-2 text-xs font-bold text-[#234E43]"
                      >
                        <Eye size={15} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {!loading &&
            !error &&
            showValues &&
            !visibleFaculty.length && (
              <div className="py-14 text-center">
                <Users
                  size={35}
                  className="mx-auto text-[#A6C1A4]"
                />

                <p className="mt-4 font-bold text-[#234E43]">
                  No Faculty Records Found
                </p>

                <p className="mt-2 text-sm text-[#718579]">
                  No faculty records match this
                  department and the selected filters.
                </p>
              </div>
            )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1EB] p-5">
          <p className="text-xs text-[#718579]">
            Page {currentPage} of {totalPages} ·{" "}
            {showValues
              ? filteredFaculty.length
              : 0}{" "}
            records
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() =>
                setPage(currentPage - 1)
              }
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              aria-label="Next page"
              disabled={
                currentPage === totalPages
              }
              onClick={() =>
                setPage(currentPage + 1)
              }
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* COURSE ALLOCATION LINK */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#234E43] p-5 text-white">
        <div>
          <p className="font-bold">
            Faculty Workload Planning
          </p>

          <p className="mt-2 text-xs leading-6 text-[#D0E2D7]">
            Manage department course assignments
            from the Course Allocation module.
          </p>
        </div>

        <Link
          to="/hod/course-allocation"
          className="inline-flex items-center gap-2 rounded-xl bg-[#D9A536] px-5 py-3 text-sm font-bold text-[#234E43]"
        >
          Course Allocation
          <ArrowUpRight size={17} />
        </Link>
      </div>

      <p className="text-center text-xs text-[#718579]">
        UniBee HOD Faculty · Live MongoDB Records ·
        Read-only
      </p>

      {/* FACULTY DETAILS MODAL */}
      {selectedFaculty && (
        <FacultyDetails
          faculty={selectedFaculty}
          onClose={() =>
            setSelectedFaculty(null)
          }
        />
      )}
    </div>
  );
}
