
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileBarChart2,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  CalendarDays,
  FileCheck2,
  Megaphone,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Database,
  BarChart3,
  ArrowUpRight,
  Clock3,
  Filter,
  ShieldCheck,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const KEYS = {
  departments: "unibee-admin-departments-v1",
  students: "unibee-admin-students-v1",
  faculty: "unibee-admin-faculty-v1",
  courses: "unibee-admin-courses-v1",
  attendance: "unibee-admin-attendance-v1",
  results: "unibee-admin-results-v1",
  allocations: "unibee-hod-course-allocations-v1",
  schedules: "unibee-hod-schedules-v1",
  approvals: "unibee-hod-approvals-v1",
  notices: "unibee-hod-department-notices-v1",
  selectedDepartment:
    "unibee-hod-selected-department-v1",
};

const REPORT_TYPES = [
  {
    id: "faculty",
    name: "Faculty Directory",
    description: "Department faculty and designations",
    icon: Users,
  },
  {
    id: "students",
    name: "Student Directory",
    description: "Student enrollment and batch information",
    icon: GraduationCap,
  },
  {
    id: "courses",
    name: "Course Allocation",
    description: "Department courses and assigned faculty",
    icon: BookOpen,
  },
  {
    id: "schedules",
    name: "Class Schedule",
    description: "Weekly teaching timetable",
    icon: CalendarDays,
  },
  {
    id: "approvals",
    name: "Academic Approvals",
    description: "Request decisions and review history",
    icon: FileCheck2,
  },
  {
    id: "notices",
    name: "Department Notices",
    description: "Department announcements and publication",
    icon: Megaphone,
  },
];

// ========================================
// GENERAL HELPERS
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return text(value).toLowerCase();
}

function first(...values) {
  return (
    values.find(
      (item) =>
        item !== undefined &&
        item !== null &&
        text(item) !== ""
    ) ?? ""
  );
}

function readRows(key) {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return { rows: [], status: "missing" };
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? { rows: parsed, status: "available" }
      : { rows: [], status: "invalid" };
  } catch {
    return { rows: [], status: "invalid" };
  }
}

function loadData() {
  return Object.fromEntries(
    Object.entries(KEYS)
      .filter(([name]) => name !== "selectedDepartment")
      .map(([name, key]) => [name, readRows(key)])
  );
}

function readDepartmentSelection() {
  try {
    return localStorage.getItem(
      KEYS.selectedDepartment
    ) || "";
  } catch {
    return "";
  }
}

function departmentInfo(row, index) {
  return {
    id: text(
      first(row.id, row._id, row.code, `dept-${index}`)
    ),
    name: text(
      first(
        row.name,
        row.departmentName,
        row.title,
        row.code,
        "Unnamed Department"
      )
    ),
    code: text(row.code),
  };
}

function matchesDepartment(row, department) {
  if (!row || !department) return false;

  const expected = [
    department.id,
    department.name,
    department.code,
  ]
    .map(norm)
    .filter(Boolean);

  return [
    row.department,
    row.departmentId,
    row.departmentName,
    row.departmentCode,
    row.dept,
    row.deptId,
  ].some((field) => {
    const candidates =
      field && typeof field === "object"
        ? [
            field.id,
            field._id,
            field.name,
            field.code,
          ]
        : [field];

    return candidates.some((candidate) =>
      expected.includes(norm(candidate))
    );
  });
}

function facultyId(row) {
  return text(
    first(
      row.id,
      row._id,
      row.facultyId,
      row.employeeId,
      row.staffId
    )
  );
}

function facultyName(row) {
  return text(
    first(
      row.name,
      row.fullName,
      row.facultyName,
      "Unnamed Faculty"
    )
  );
}

function studentId(row) {
  return text(
    first(
      row.studentId,
      row.studentID,
      row.registrationNumber,
      row.roll,
      row.id,
      row._id
    )
  );
}

function studentName(row) {
  return text(
    first(
      row.name,
      row.fullName,
      row.studentName,
      "Unnamed Student"
    )
  );
}

function courseId(row) {
  return text(
    first(
      row.id,
      row._id,
      row.courseId,
      row.code
    )
  );
}

function courseCode(row) {
  return text(
    first(row.code, row.courseCode, row.id)
  );
}

function courseName(row) {
  return text(
    first(
      row.title,
      row.name,
      row.courseName,
      "Untitled Course"
    )
  );
}

function formatDate(value) {
  if (!value) return "—";

  const input = text(value);
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(input)
      ? `${input}T12:00:00`
      : input
  );

  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function effectiveNoticeStatus(row) {
  if (row.status !== "Published") {
    return "Draft";
  }

  const date = new Date();
  const today = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  if (row.publishDate && row.publishDate > today) {
    return "Scheduled";
  }

  if (row.expiryDate && row.expiryDate < today) {
    return "Expired";
  }

  return "Published";
}

// ========================================
// CSV EXPORT
// ========================================

function downloadCSV(filename, headers, rows) {
  const escapeCell = (input) => {
    let value = String(input ?? "");

    // Prevent spreadsheet formula execution.
    if (/^\s*[=+\-@\t\r]/.test(value)) {
      value = "'" + value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  };

  const content =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n");

  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ========================================
// UI COMPONENTS
// ========================================

function StatCard({
  title,
  value,
  description,
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
        {description}
      </p>
    </div>
  );
}

function SourceRow({ title, source, count }) {
  const available = source.status === "available";
  const missing = source.status === "missing";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF1EB] py-3 last:border-0">
      <div>
        <p className="text-sm font-semibold text-[#234E43]">
          {title}
        </p>

        <p className="mt-1 text-xs text-[#718579]">
          {available
            ? `${count} department records`
            : missing
            ? "Storage key not found"
            : "Storage format is invalid"}
        </p>
      </div>

      <span
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${
          available
            ? "bg-emerald-50 text-emerald-700"
            : missing
            ? "bg-slate-100 text-slate-600"
            : "bg-rose-50 text-rose-700"
        }`}
      >
        {available ? (
          <CheckCircle2 size={14} />
        ) : (
          <AlertTriangle size={14} />
        )}

        {available
          ? "Available"
          : missing
          ? "Missing"
          : "Invalid"}
      </span>
    </div>
  );
}

// ========================================
// MAIN PAGE
// ========================================

export default function HODReports() {
  const [data, setData] = useState(loadData);

  const [departmentId, setDepartmentId] = useState(
    readDepartmentSelection
  );

  const [reportType, setReportType] = useState("courses");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    function reload() {
      setData(loadData());
      setDepartmentId(readDepartmentSelection());
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        reload();
      }
    }

    window.addEventListener("storage", reload);

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.removeEventListener("storage", reload);
      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  // ======================================
  // DEPARTMENTS
  // ======================================

  const departments = useMemo(
    () =>
      data.departments.rows.map((row, index) =>
        departmentInfo(row, index)
      ),
    [data.departments.rows]
  );

  const department = departments.find(
    (item) => item.id === departmentId
  );

  // ======================================
  // DEPARTMENT DATA
  // ======================================

  const students = useMemo(
    () =>
      department
        ? data.students.rows.filter((row) =>
            matchesDepartment(row, department)
          )
        : [],
    [department, data.students.rows]
  );

  const faculty = useMemo(
    () =>
      department
        ? data.faculty.rows.filter((row) =>
            matchesDepartment(row, department)
          )
        : [],
    [department, data.faculty.rows]
  );

  const courses = useMemo(
    () =>
      department
        ? data.courses.rows.filter((row) =>
            matchesDepartment(row, department)
          )
        : [],
    [department, data.courses.rows]
  );

  const allocations = useMemo(
    () =>
      department
        ? data.allocations.rows.filter((row) =>
            matchesDepartment(row, department)
          )
        : [],
    [department, data.allocations.rows]
  );

  const schedules = useMemo(
    () =>
      department
        ? data.schedules.rows.filter((row) =>
            matchesDepartment(row, department)
          )
        : [],
    [department, data.schedules.rows]
  );

  const approvals = useMemo(
    () =>
      department
        ? data.approvals.rows.filter((row) =>
            matchesDepartment(row, department)
          )
        : [],
    [department, data.approvals.rows]
  );

  const notices = useMemo(
    () =>
      department
        ? data.notices.rows.filter((row) =>
            matchesDepartment(row, department)
          )
        : [],
    [department, data.notices.rows]
  );

  const facultyMap = useMemo(
    () =>
      new Map(
        faculty.map((row) => [
          facultyId(row),
          row,
        ])
      ),
    [faculty]
  );

  const allocationMap = useMemo(
    () =>
      new Map(
        allocations.map((row) => [
          text(row.courseId),
          row,
        ])
      ),
    [allocations]
  );

  const courseMap = useMemo(
    () =>
      new Map(
        courses.map((row) => [
          courseId(row),
          row,
        ])
      ),
    [courses]
  );

  // ======================================
  // DERIVED STATISTICS
  // ======================================

  const allocationReady =
    data.courses.status === "available" &&
    data.faculty.status === "available" &&
    data.allocations.status !== "invalid";

  const validAllocations = allocations.filter(
    (row) =>
      courseMap.has(text(row.courseId)) &&
      facultyMap.has(text(row.facultyId))
  );

  const allocatedCourseIds = new Set(
    validAllocations.map((row) => text(row.courseId))
  );

  const unassignedCourses = courses.filter(
    (course) =>
      !allocatedCourseIds.has(courseId(course))
  );

  const activeFaculty = faculty.filter(
    (row) =>
      norm(first(row.status, "Active")) === "active"
  );

  const pendingApprovals = approvals.filter(
    (row) => norm(row.status) === "pending"
  );

  const publishedNotices = notices.filter(
    (row) =>
      effectiveNoticeStatus(row) === "Published"
  );

  const stats = [
    {
      title: "Department Students",
      value:
        department &&
        data.students.status === "available"
          ? students.length
          : "—",
      description: "Matched Admin student records",
      icon: GraduationCap,
    },
    {
      title: "Active Faculty",
      value:
        department &&
        data.faculty.status === "available"
          ? activeFaculty.length
          : "—",
      description: "Faculty with Active status",
      icon: Users,
    },
    {
      title: "Department Courses",
      value:
        department &&
        data.courses.status === "available"
          ? courses.length
          : "—",
      description: "Matched Admin course records",
      icon: BookOpen,
    },
    {
      title: "Unassigned Courses",
      value:
        department && allocationReady
          ? unassignedCourses.length
          : "—",
      description: "Courses without valid HOD allocations",
      icon: ClipboardCheck,
    },
    {
      title: "Scheduled Classes",
      value:
        department &&
        data.schedules.status !== "invalid"
          ? schedules.length
          : "—",
      description: "HOD-created weekly schedule entries",
      icon: CalendarDays,
    },
    {
      title: "Pending Approvals",
      value:
        department &&
        data.approvals.status !== "invalid"
          ? pendingApprovals.length
          : "—",
      description: "Academic requests awaiting review",
      icon: FileCheck2,
    },
    {
      title: "Published Notices",
      value:
        department &&
        data.notices.status !== "invalid"
          ? publishedNotices.length
          : "—",
      description: "Currently effective department notices",
      icon: Megaphone,
    },
    {
      title: "Allocated Faculty",
      value:
        department && allocationReady
          ? new Set(
              validAllocations.map((row) =>
                text(row.facultyId)
              )
            ).size
          : "—",
      description: "Faculty with matched course allocations",
      icon: BarChart3,
    },
  ];

  // ======================================
  // FACULTY WORKLOAD
  // ======================================

  const workload = useMemo(
    () =>
      faculty
        .map((person) => {
          const assigned = validAllocations.filter(
            (row) =>
              text(row.facultyId) === facultyId(person)
          );

          return {
            facultyId: facultyId(person),
            name: facultyName(person),
            designation: text(
              first(
                person.designation,
                person.position,
                person.rank
              )
            ),
            count: new Set(
              assigned.map((row) => text(row.courseId))
            ).size,
            credits: assigned.reduce((sum, row) => {
              const course = courseMap.get(
                text(row.courseId)
              );

              const number = Number(
                first(
                  course?.credits,
                  course?.credit,
                  0
                )
              );

              return (
                sum +
                (Number.isFinite(number) && number >= 0
                  ? number
                  : 0)
              );
            }, 0),
          };
        })
        .sort(
          (a, b) =>
            b.count - a.count ||
            a.name.localeCompare(b.name)
        ),
    [faculty, validAllocations, courseMap]
  );

  const maxWorkload = Math.max(
    1,
    ...workload.map((row) => row.count)
  );

  // ======================================
  // REPORT DATASETS
  // ======================================

  const reports = useMemo(
    () => ({
      faculty: {
        headers: [
          "Faculty ID",
          "Faculty Name",
          "Designation",
          "Email",
          "Status",
          "Department",
        ],
        rows: faculty.map((row) => [
          facultyId(row),
          facultyName(row),
          first(row.designation, row.position, row.rank),
          row.email,
          row.status,
          department?.name,
        ]),
      },

      students: {
        headers: [
          "Student ID",
          "Student Name",
          "Batch",
          "Semester",
          "Program",
          "Status",
        ],
        rows: students.map((row) => [
          studentId(row),
          studentName(row),
          first(row.batch, row.batchName, row.intake),
          first(row.semester, row.currentSemester),
          first(row.program, row.programName, row.degree),
          row.status,
        ]),
      },

      courses: {
        headers: [
          "Course Code",
          "Course Title",
          "Credits",
          "Semester",
          "Faculty ID",
          "Faculty Name",
          "Allocation Status",
        ],
        rows: courses.map((row) => {
          const allocation = allocationMap.get(
            courseId(row)
          );

          const person = allocation
            ? facultyMap.get(text(allocation.facultyId))
            : null;

          return [
            courseCode(row),
            courseName(row),
            first(row.credits, row.credit),
            first(row.semester, row.term),
            person ? facultyId(person) : "",
            person ? facultyName(person) : "",
            person ? "Allocated" : "Unassigned",
          ];
        }),
      },

      schedules: {
        headers: [
          "Day",
          "Start Time",
          "End Time",
          "Course Code",
          "Course Title",
          "Faculty",
          "Room",
          "Section",
          "Semester",
          "Academic Session",
        ],
        rows: schedules.map((row) => [
          row.day,
          row.startTime,
          row.endTime,
          row.courseCode,
          row.courseTitle,
          row.facultyName,
          row.room,
          row.section,
          row.semester,
          row.academicSession,
        ]),
      },

      approvals: {
        headers: [
          "Title",
          "Request Type",
          "Requester",
          "Requester ID",
          "Status",
          "Submitted Date",
          "Reviewed Date",
          "Review Note",
        ],
        rows: approvals.map((row) => [
          row.title,
          row.type,
          row.requesterName,
          row.requesterId,
          row.status,
          formatDate(row.createdAt || row.requestedAt),
          formatDate(row.reviewedAt),
          row.reviewNote,
        ]),
      },

      notices: {
        headers: [
          "Title",
          "Category",
          "Audience",
          "Priority",
          "Status",
          "Publish Date",
          "Expiry Date",
          "Content",
        ],
        rows: notices.map((row) => [
          row.title,
          row.category,
          row.audience,
          row.priority,
          effectiveNoticeStatus(row),
          formatDate(row.publishDate),
          formatDate(row.expiryDate),
          row.content,
        ]),
      },
    }),
    [
      department,
      faculty,
      students,
      courses,
      allocationMap,
      facultyMap,
      schedules,
      approvals,
      notices,
    ]
  );

  const sourceForReport = {
    faculty: ["faculty"],
    students: ["students"],
    courses: ["courses", "faculty", "allocations"],
    schedules: ["schedules"],
    approvals: ["approvals"],
    notices: ["notices"],
  };

  const currentReport = reports[reportType];

  const canExport =
    Boolean(department) &&
    sourceForReport[reportType].every((key) => {
      if (
        ["allocations", "schedules", "approvals", "notices"].includes(key)
      ) {
        return data[key].status !== "invalid";
      }

      return data[key].status === "available";
    });

  // ======================================
  // ACTIONS
  // ======================================

  function changeDepartment(id) {
    setDepartmentId(id);
    setFeedback("");

    try {
      if (id) {
        localStorage.setItem(
          KEYS.selectedDepartment,
          id
        );
      } else {
        localStorage.removeItem(
          KEYS.selectedDepartment
        );
      }
    } catch {
      setFeedback(
        "Department selection could not be saved."
      );
    }
  }

  function refreshData() {
    setData(loadData());
    setDepartmentId(readDepartmentSelection());

    setFeedback("Department reports refreshed.");
  }

  function exportCurrentReport() {
    if (!canExport) return;

    downloadCSV(
      `UniBee_HOD_${reportType}_Report.csv`,
      currentReport.headers,
      currentReport.rows
    );

    setFeedback(
      `${REPORT_TYPES.find(
        (item) => item.id === reportType
      )?.name} exported successfully.`
    );
  }

  function exportSummary() {
    if (!department) return;

    downloadCSV(
      "UniBee_HOD_Department_Summary.csv",
      ["Metric", "Value", "Description"],
      stats.map((item) => [
        item.title,
        item.value === "—" ? "" : item.value,
        item.description,
      ])
    );

    setFeedback("Department summary exported.");
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            MANAGEMENT & REPORTS
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Department Reports
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Review academic operations, teaching
            workload, and department management data
            in one reporting workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportSummary}
            disabled={!department}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            <Download size={17} />
            Export Summary
          </button>
        </div>
      </section>

      {/* DEPARTMENT SELECTOR */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
            <Building2 size={23} />
          </div>

          <div>
            <h2 className="font-bold text-[#234E43]">
              Department Reporting
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Choose the department whose reports you
              want to generate.
            </p>
          </div>
        </div>

        <select
          aria-label="Select department"
          value={department ? departmentId : ""}
          onChange={(event) =>
            changeDepartment(event.target.value)
          }
          disabled={
            data.departments.status !== "available"
          }
          className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72"
        >
          <option value="">
            Select Department
          </option>

          {departments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </section>

      {feedback && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-[#EAF2E8] p-4 text-sm text-[#234E43]"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </p>
      )}

      {!department && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0"
          />
          Select an existing Admin department to
          view its statistics and reports.
        </div>
      )}

      {/* SUMMARY STATISTICS */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Department Overview
          </h2>

          <p className="mt-2 text-sm text-[#718579]">
            Statistics calculated from matching saved records.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <StatCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      {/* FACULTY WORKLOAD */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              Faculty Workload Analysis
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Assigned course counts and credit loads
            </p>
          </div>

          <Link
            to="/hod/course-allocation"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#234E43]"
          >
            Manage Allocations
            <ArrowUpRight size={16} />
          </Link>
        </div>

        {department &&
        allocationReady &&
        workload.length > 0 ? (
          <div className="mt-6 space-y-5">
            {workload.map((item) => (
              <div key={item.facultyId}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#234E43]">
                      {item.name}
                    </p>

                    <p className="mt-1 text-xs text-[#718579]">
                      {item.designation || "Faculty Member"}
                    </p>
                  </div>

                  <p className="text-xs font-semibold text-[#607B6C]">
                    {item.count} Courses ·{" "}
                    {item.credits} Credits
                  </p>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#EAF2E8]">
                  <div
                    className="h-full rounded-full bg-[#234E43]"
                    style={{
                      width: `${
                        (item.count / maxWorkload) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-[#F6F8F3] p-5 text-sm text-[#718579]">
            No verifiable faculty workload records
            are available for the selected department.
          </p>
        )}

        <p className="mt-5 text-xs leading-5 text-[#718579]">
          Workload bars compare allocated course counts,
          not teaching hours. Credit values are taken
          from course records and do not automatically
          represent contact hours.
        </p>
      </section>

      {/* REPORT GENERATOR */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <FileBarChart2
            size={22}
            className="text-[#234E43]"
          />

          <h2 className="text-lg font-bold text-[#234E43]">
            Report Generator
          </h2>
        </div>

        <p className="mt-2 text-sm text-[#718579]">
          Select a report to preview its records and
          download a CSV file.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {REPORT_TYPES.map((type) => {
            const Icon = type.icon;
            const selected = reportType === type.id;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() =>
                  setReportType(type.id)
                }
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-[#234E43] bg-[#EAF2E8]"
                    : "border-[#E2EADC] bg-white hover:bg-[#F6F8F3]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={21}
                    className="text-[#234E43]"
                  />

                  <p className="text-sm font-bold text-[#234E43]">
                    {type.name}
                  </p>
                </div>

                <p className="mt-3 text-xs leading-5 text-[#718579]">
                  {type.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* SELECTED REPORT */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#E2EADC]">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F6F8F3] p-4">
            <div>
              <p className="text-sm font-bold text-[#234E43]">
                {
                  REPORT_TYPES.find(
                    (item) => item.id === reportType
                  )?.name
                }
              </p>

              <p className="mt-1 text-xs text-[#718579]">
                {canExport
                  ? `${currentReport.rows.length} records available`
                  : "Required source data is unavailable"}
              </p>
            </div>

            <button
              type="button"
              onClick={exportCurrentReport}
              disabled={!canExport}
              className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
            >
              <Download size={16} />
              Download CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead className="bg-white text-xs uppercase text-[#718579]">
                <tr>
                  {currentReport.headers.map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap border-b border-[#E2EADC] px-4 py-3"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#EDF1EB]">
                {canExport &&
                  currentReport.rows
                    .slice(0, 8)
                    .map((row, index) => (
                      <tr
                        key={index}
                        className="hover:bg-[#F9FBF8]"
                      >
                        {row.map((item, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="max-w-[260px] whitespace-normal break-words px-4 py-3 text-xs text-[#607B6C]"
                          >
                            {text(item) || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>

            {(!canExport ||
              currentReport.rows.length === 0) && (
              <div className="py-12 text-center">
                <Database
                  size={32}
                  className="mx-auto text-[#A6C1A4]"
                />

                <p className="mt-3 text-sm font-bold text-[#234E43]">
                  No Report Records Available
                </p>

                <p className="mt-2 text-xs text-[#718579]">
                  Select a department and verify the
                  required source records.
                </p>
              </div>
            )}
          </div>

          {canExport &&
            currentReport.rows.length > 8 && (
              <p className="border-t border-[#E2EADC] p-4 text-xs text-[#718579]">
                Showing the first 8 records.
                Download CSV for the full report.
              </p>
            )}
        </div>
      </section>

      {/* SOURCE HEALTH */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <Database
            size={21}
            className="text-[#234E43]"
          />

          <h2 className="text-lg font-bold text-[#234E43]">
            Data Source Status
          </h2>
        </div>

        <p className="mt-2 text-xs leading-6 text-[#718579]">
          Checks whether expected browser storage
          records exist and can be read.
          Availability does not guarantee that every
          record matches the expected schema.
        </p>

        <div className="mt-5 grid gap-x-6 md:grid-cols-2">
          {[
            ["Admin Students", "students", students.length],
            ["Admin Faculty", "faculty", faculty.length],
            ["Admin Courses", "courses", courses.length],
            ["Admin Attendance", "attendance", "—"],
            ["Admin Results", "results", "—"],
            [
              "HOD Course Allocations",
              "allocations",
              allocations.length,
            ],
            [
              "HOD Class Schedules",
              "schedules",
              schedules.length,
            ],
            [
              "HOD Academic Approvals",
              "approvals",
              approvals.length,
            ],
            [
              "HOD Department Notices",
              "notices",
              notices.length,
            ],
          ].map(([title, key, count]) => (
            <SourceRow
              key={key}
              title={title}
              source={data[key]}
              count={count}
            />
          ))}
        </div>
      </section>

      {/* INTEGRATION NOTES */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <AlertTriangle
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Reports are
          generated from locally saved Admin and HOD
          records. Attendance and CGPA are not included
          in summary calculations until their actual
          Admin data structures have been verified.
          A missing HOD storage key is treated as an
          empty record collection, while missing core
          Admin sources block dependent reports.
          CSV exports are snapshots of the selected
          department's currently available data.
          Department selection is not secure access
          control.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Head of Department Portal —
        Department Reporting
      </p>
    </div>
  );
}
