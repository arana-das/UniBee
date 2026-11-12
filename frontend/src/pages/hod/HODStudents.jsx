
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FilterX,
  GraduationCap,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  fetchCurrentUser,
  getAuthToken,
  getStoredUser,
} from "../../services/authApi";

import {
  getStudents,
} from "../../services/studentApi";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 10;

const clean = (value) =>
  String(value ?? "").trim();

const norm = (value) =>
  clean(value).toLowerCase();

const recordId = (row) =>
  clean(
    row?._id ||
    row?.id ||
    row?.studentId
  );

// Department may be stored as code, name or object.
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

function matchesDepartment(
  student,
  assigned,
  departments
) {
  if (!assigned) return false;

  const assignedValues =
    departmentValues(assigned);

  const department = departments.find(
    (row) =>
      [
        row.name,
        row.code,
        row._id,
        row.id,
      ].some((part) =>
        assignedValues.includes(norm(part))
      )
  );

  const allowed = new Set([
    ...assignedValues,
    ...(department
      ? departmentValues(department)
      : []),
  ]);

  return departmentValues(
    student.department
  ).some((part) => allowed.has(part));
}

// Fetch Admin department records.
async function fetchDepartments(token) {
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
    throw new Error(
      "Cannot connect to UniBee backend."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !result?.success ||
    !Array.isArray(result.data)
  ) {
    throw new Error(
      result?.message ||
      "Unable to load departments."
    );
  }

  return result.data;
}

// CSV EXPORT
function csvExport(rows) {
  const headers = [
    "Student ID",
    "Name",
    "Department",
    "Program",
    "Batch",
    "Semester",
    "Section",
    "Academic Session",
    "Email",
    "Phone",
    "Status",
    "Enrollment Date",
  ];

  const values = rows.map((s) => [
    s.studentId,
    s.name,
    s.department,
    s.program,
    s.batch,
    s.semester,
    s.section,
    s.academicSession,
    s.email,
    s.phone,
    s.status,
    s.enrolledAt,
  ]);

  const safe = (value) => {
    let cell = clean(value);

    if (/^[=+\-@\t\r]/.test(cell)) {
      cell = "'" + cell;
    }

    return `"${cell.replace(/"/g, '""')}"`;
  };

  const csv =
    "\uFEFF" +
    [headers, ...values]
      .map((row) =>
        row.map(safe).join(",")
      )
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: "text/csv;charset=utf-8",
    })
  );

  const link = document.createElement("a");

  link.href = url;
  link.download =
    "UniBee_HOD_Department_Students.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}

// STATISTICS CARD
function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#718579]">
            {label}
          </p>

          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </h3>
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

// STUDENT STATUS
function StudentStatus({ status }) {
  const colors = {
    active:
      "bg-emerald-50 text-emerald-700",
    inactive:
      "bg-slate-100 text-slate-600",
    graduated:
      "bg-sky-50 text-sky-700",
    suspended:
      "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
        colors[norm(status)] ||
        colors.inactive
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

// STUDENT PROFILE
function StudentDetails({
  student,
  onClose,
}) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKey
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKey
      );
  }, [onClose]);

  const details = [
    ["Student ID", student.studentId],
    ["Full Name", student.name],
    ["Department", student.department],
    ["Program", student.program],
    ["Batch", student.batch],
    ["Semester", student.semester],
    ["Section", student.section],
    [
      "Academic Session",
      student.academicSession,
    ],
    ["Email", student.email],
    ["Phone", student.phone],
    ["Enrollment Date", student.enrolledAt],
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hod-student-profile-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-[#EAF2E8] p-4 text-[#234E43]">
              <UserRound size={30} />
            </div>

            <div>
              <p className="text-xs font-bold tracking-wider text-[#B18B37]">
                STUDENT PROFILE
              </p>

              <h2
                id="hod-student-profile-title"
                className="mt-2 text-xl font-extrabold text-[#234E43]"
              >
                {student.name}
              </h2>

              <p className="mt-1 text-sm text-[#718579]">
                {student.studentId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close student details"
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X size={21} />
          </button>
        </div>

        <div className="mt-6">
          <StudentStatus
            status={student.status}
          />
        </div>

        <div className="mt-5 grid gap-4 rounded-2xl bg-[#F6F8F3] p-5 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-[#718579]">
                {label}
              </p>

              <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
                {clean(value) || "—"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-[#E2EADC] p-5">
          <div className="flex items-center gap-2 font-bold text-[#234E43]">
            <BookOpen size={19} />
            Academic Information
          </div>

          <p className="mt-3 text-sm leading-6 text-[#718579]">
            This profile displays the existing
            Admin Student record. Results,
            CGPA and attendance will be
            connected through their
            respective modules.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 w-full rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white"
        >
          Close Profile
        </button>
      </section>
    </div>
  );
}

// MAIN HOD STUDENTS
export default function HODStudents() {
  const [students, setStudents] =
    useState([]);

  const [departments, setDepartments] =
    useState([]);

  const [user, setUser] =
    useState(getStoredUser);

  const [adminDepartment, setAdminDepartment] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [feedback, setFeedback] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [batchFilter, setBatchFilter] =
    useState("All");

  const [semesterFilter, setSemesterFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [page, setPage] =
    useState(1);

  const [selectedStudent, setSelectedStudent] =
    useState(null);

  // LOAD LIVE MONGODB DATA
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setFeedback("");

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error(
          "Authentication required. Please log in."
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
          "Your account cannot access HOD Students."
        );
      }

      const [
        studentData,
        departmentData,
      ] = await Promise.all([
        getStudents(token),
        fetchDepartments(token),
      ]);

      if (!Array.isArray(studentData)) {
        throw new Error(
          "Invalid student records returned by server."
        );
      }

      setUser(currentUser);
      setStudents(studentData);
      setDepartments(departmentData);

      setAdminDepartment((previous) =>
        departmentData.some(
          (d) => d.name === previous
        )
          ? previous
          : ""
      );

      setSelectedStudent(null);
      setPage(1);
    } catch (requestError) {
      setError(
        requestError?.message ||
        "Unable to load department students."
      );

      setStudents([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isHOD = user?.role === "hod";

  const assignedDepartment = isHOD
    ? clean(user?.department)
    : adminDepartment;

  const officialDepartment =
    departments.find((row) =>
      [
        row.name,
        row.code,
        row._id,
        row.id,
      ].some(
        (field) =>
          norm(field) ===
          norm(assignedDepartment)
      )
    );

  const displayDepartment =
    officialDepartment?.name ||
    assignedDepartment;

  // Match CSE with Computer Science & Engineering.
  const departmentStudents = useMemo(() => {
    if (!assignedDepartment) return [];

    return students.filter((student) =>
      matchesDepartment(
        student,
        assignedDepartment,
        departments
      )
    );
  }, [
    students,
    assignedDepartment,
    departments,
  ]);

  const batches = useMemo(
    () =>
      [
        ...new Set(
          departmentStudents
            .map((s) => clean(s.batch))
            .filter(Boolean)
        ),
      ].sort(),
    [departmentStudents]
  );

  const semesters = useMemo(
    () =>
      [
        ...new Set(
          departmentStudents
            .map((s) => clean(s.semester))
            .filter(Boolean)
        ),
      ].sort(),
    [departmentStudents]
  );

  const statuses = useMemo(
    () =>
      [
        ...new Set(
          departmentStudents
            .map((s) => clean(s.status))
            .filter(Boolean)
        ),
      ].sort(),
    [departmentStudents]
  );

  // SEARCH AND FILTER
  const filteredStudents = useMemo(
    () =>
      departmentStudents.filter(
        (student) => {
          const searchable = [
            student.studentId,
            student.name,
            student.email,
            student.phone,
            student.program,
            student.batch,
            student.semester,
            student.section,
          ];

          return (
            searchable.some((value) =>
              norm(value).includes(norm(search))
            ) &&
            (
              batchFilter === "All" ||
              student.batch === batchFilter
            ) &&
            (
              semesterFilter === "All" ||
              student.semester === semesterFilter
            ) &&
            (
              statusFilter === "All" ||
              student.status === statusFilter
            )
          );
        }
      ),
    [
      departmentStudents,
      search,
      batchFilter,
      semesterFilter,
      statusFilter,
    ]
  );

  // PAGINATION
  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredStudents.length / PAGE_SIZE
    )
  );

  const currentPage = Math.min(
    page,
    totalPages
  );

  const visibleStudents =
    filteredStudents.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );

  const ready =
    !loading &&
    !error &&
    !!assignedDepartment;

  function resetFilters() {
    setSearch("");
    setBatchFilter("All");
    setSemesterFilter("All");
    setStatusFilter("All");
    setPage(1);
  }

  const stats = [
    {
      label: "Department Students",
      value: ready
        ? departmentStudents.length
        : "—",
      subtitle: "Registered department students",
      icon: Users,
    },
    {
      label: "Active Students",
      value: ready
        ? departmentStudents.filter(
            (s) =>
              norm(s.status) === "active"
          ).length
        : "—",
      subtitle: "Students with Active status",
      icon: CheckCircle2,
    },
    {
      label: "Batches",
      value: ready
        ? batches.length
        : "—",
      subtitle: "Distinct student batches",
      icon: GraduationCap,
    },
    {
      label: "Semesters",
      value: ready
        ? semesters.length
        : "—",
      subtitle: "Distinct semester values",
      icon: BookOpen,
    },
  ];

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            DEPARTMENT MANAGEMENT
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Department Students
          </h1>

          <p className="mt-2 text-sm text-[#718579]">
            Review live MongoDB student records,
            batches, semesters and academic programs.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
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
            disabled={
              !ready ||
              !filteredStudents.length
            }
            onClick={() => {
              csvExport(filteredStudents);
              setFeedback(
                "Student CSV exported successfully."
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </section>

      {/* DEPARTMENT */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
            <Building2 size={22} />
          </div>

          <div>
            <h2 className="font-bold text-[#234E43]">
              Active Department
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              {isHOD
                ? "Department assigned to your HOD account"
                : "Select an Admin department"}
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
            onChange={(event) => {
              setAdminDepartment(
                event.target.value
              );
              setSelectedStudent(null);
              resetFilters();
            }}
            disabled={loading || !!error}
            className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72"
          >
            <option value="">
              Select Department
            </option>

            {departments.map((d) => (
              <option
                key={recordId(d)}
                value={d.name}
              >
                {d.name}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* MESSAGES */}
      {loading && (
        <p
          role="status"
          className="rounded-xl bg-[#F6F8F3] p-4 text-sm text-[#234E43]"
        >
          Loading students from MongoDB...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
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

      {!loading &&
        !error &&
        !assignedDepartment && (
          <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle size={18} />
            {isHOD
              ? "Your HOD account has no assigned department. Contact Admin."
              : "Select a department to view students."}
          </p>
        )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard
            key={item.label}
            {...item}
          />
        ))}
      </section>

      {/* STUDENT DIRECTORY */}
      <section className="overflow-hidden rounded-2xl border border-[#E2EADC] bg-white shadow-sm">
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#234E43]">
                Department Student Directory
              </h2>

              <p className="mt-1 text-xs text-[#718579]">
                Student information from Admin
                MongoDB records
              </p>
            </div>

            <span className="rounded-full bg-[#F6F8F3] px-3 py-2 text-xs font-bold text-[#234E43]">
              {ready
                ? filteredStudents.length
                : 0}{" "}
              Records
            </span>
          </div>

          {/* FILTERS */}
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA092]"
              />

              <input
                type="search"
                aria-label="Search students"
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search Student ID, name, batch..."
                className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#A6C1A4]"
              />
            </div>

            <select
              aria-label="Filter by batch"
              value={batchFilter}
              onChange={(event) => {
                setBatchFilter(
                  event.target.value
                );
                setPage(1);
              }}
              className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm text-[#45685B]"
            >
              <option value="All">
                All Batches
              </option>

              {batches.map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by semester"
              value={semesterFilter}
              onChange={(event) => {
                setSemesterFilter(
                  event.target.value
                );
                setPage(1);
              }}
              className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm text-[#45685B]"
            >
              <option value="All">
                All Semesters
              </option>

              {semesters.map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by status"
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

              {statuses.map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#234E43] hover:underline"
            >
              <FilterX size={15} />
              Clear Filters
            </button>
          </div>
        </div>

        {/* STUDENT TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-[#718579]">
              <tr>
                {[
                  "Student",
                  "Student ID",
                  "Program",
                  "Batch",
                  "Semester",
                  "Contact",
                  "Status",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EDF1EB]">
              {ready &&
                visibleStudents.map(
                  (student, index) => (
                    <tr
                      key={
                        recordId(student) ||
                        index
                      }
                      className="hover:bg-[#F9FBF8]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                            <UserRound size={21} />
                          </div>

                          <div>
                            <p className="text-sm font-bold text-[#234E43]">
                              {student.name ||
                                "Unnamed Student"}
                            </p>

                            <p className="mt-1 text-xs text-[#718579]">
                              Department Student
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-[#45685B]">
                        {student.studentId ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-[#607B6C]">
                        {student.program ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-[#607B6C]">
                        {student.batch ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-[#607B6C]">
                        {student.semester ||
                          "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs text-[#607B6C]">
                          <p className="flex items-center gap-2">
                            <Mail size={13} />
                            {student.email ||
                              "—"}
                          </p>

                          <p className="flex items-center gap-2">
                            <Phone size={13} />
                            {student.phone ||
                              "—"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <StudentStatus
                          status={
                            student.status
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStudent(
                              student
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-[#EAF2E8] px-3 py-2 text-xs font-bold text-[#234E43]"
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  )
                )}
            </tbody>
          </table>

          {!loading &&
            !error &&
            ready &&
            !visibleStudents.length && (
              <div className="py-14 text-center">
                <GraduationCap
                  size={38}
                  className="mx-auto text-[#A6C1A4]"
                />

                <p className="mt-4 font-bold text-[#234E43]">
                  No Students Found
                </p>

                <p className="mt-2 text-sm text-[#718579]">
                  No student records match
                  the selected department
                  and filters.
                </p>
              </div>
            )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1EB] p-5">
          <p className="text-xs text-[#718579]">
            Page {currentPage} of{" "}
            {totalPages} ·{" "}
            {ready
              ? filteredStudents.length
              : 0}{" "}
            records
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() =>
                setPage(currentPage - 1)
              }
              aria-label="Previous page"
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={
                currentPage === totalPages
              }
              onClick={() =>
                setPage(currentPage + 1)
              }
              aria-label="Next page"
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* PERMISSION NOTICE */}
      <div className="flex items-start gap-3 rounded-xl border border-[#E2EADC] bg-[#F6F8F3] p-4 text-xs leading-6 text-[#45685B]">
        <AlertCircle
          size={18}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>MongoDB Integration:</strong>{" "}
          HOD can view assigned department
          students. Admin retains student
          create, edit and delete permissions.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee HOD Portal · Live MongoDB Students
      </p>

      {selectedStudent && (
        <StudentDetails
          student={selectedStudent}
          onClose={() =>
            setSelectedStudent(null)
          }
        />
      )}
    </div>
  );
}
