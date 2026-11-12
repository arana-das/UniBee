
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Building2,
  Users,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Search,
  Eye,
  X,
  CalendarDays,
  BarChart3,
  Database,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Info,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const KEYS = {
  departments: "unibee-admin-departments-v1",
  students: "unibee-admin-students-v1",
  courses: "unibee-admin-courses-v1",
  attendance: "unibee-admin-attendance-v1",
  selectedDepartment:
    "unibee-hod-selected-department-v1",
};

const PAGE_SIZE = 10;
const DEFAULT_THRESHOLD = 75;

// ========================================
// STORAGE HELPERS
// ========================================

function readRows(key) {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return { rows: [], status: "missing" };
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return { rows: [], status: "invalid" };
    }

    return { rows: parsed, status: "available" };
  } catch {
    return { rows: [], status: "invalid" };
  }
}

function loadData() {
  return {
    departments: readRows(KEYS.departments),
    students: readRows(KEYS.students),
    courses: readRows(KEYS.courses),
    attendance: readRows(KEYS.attendance),
  };
}

function loadDepartment() {
  try {
    return localStorage.getItem(
      KEYS.selectedDepartment
    ) || "";
  } catch {
    return "";
  }
}

// ========================================
// DATA HELPERS
// ========================================

function str(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return str(value).toLowerCase();
}

function first(...items) {
  for (const item of items) {
    if (
      item !== undefined &&
      item !== null &&
      str(item) !== ""
    ) {
      return item;
    }
  }

  return "";
}

function idOf(row) {
  if (!row || typeof row !== "object") return "";

  return str(
    first(row.id, row._id, row.code)
  );
}

function departmentInfo(row, index) {
  return {
    id: str(
      first(
        row.id,
        row._id,
        row.code,
        `department-${index}`
      )
    ),
    name: str(
      first(
        row.name,
        row.departmentName,
        row.title,
        row.code,
        "Unnamed Department"
      )
    ),
    code: str(row.code),
  };
}

function departmentMatches(row, department) {
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
    const values =
      field && typeof field === "object"
        ? [
            field.id,
            field._id,
            field.name,
            field.code,
          ]
        : [field];

    return values.some((value) =>
      expected.includes(norm(value))
    );
  });
}

function studentId(student) {
  return str(
    first(
      student.studentId,
      student.studentID,
      student.registrationNumber,
      student.roll,
      student.id,
      student._id
    )
  );
}

function studentName(student) {
  return str(
    first(
      student.name,
      student.fullName,
      student.studentName,
      "Unnamed Student"
    )
  );
}

function courseId(course) {
  return str(
    first(
      course.id,
      course._id,
      course.courseId,
      course.code
    )
  );
}

function courseCode(course) {
  return str(
    first(
      course.code,
      course.courseCode,
      course.id
    )
  );
}

function courseName(course) {
  return str(
    first(
      course.title,
      course.name,
      course.courseName,
      "Untitled Course"
    )
  );
}

function studentKeys(student) {
  return [
    studentId(student),
    student.id,
    student._id,
  ]
    .map(norm)
    .filter(Boolean);
}

function courseKeys(course) {
  return [
    courseId(course),
    courseCode(course),
    course.courseId,
  ]
    .map(norm)
    .filter(Boolean);
}

function attendanceStudentId(row) {
  return str(
    first(
      row.studentId,
      row.studentID,
      row.student?.studentId,
      row.student?.id,
      row.student
    )
  );
}

function attendanceCourseId(row) {
  return str(
    first(
      row.courseId,
      row.courseCode,
      row.course?.id,
      row.course?.code,
      row.course
    )
  );
}

function attendanceDate(row) {
  return str(
    first(
      row.date,
      row.attendanceDate,
      row.classDate,
      row.createdAt
    )
  );
}

function displayDate(value) {
  if (!value) return "—";

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(str(value))
      ? `${value}T12:00:00`
      : value
  );

  return Number.isNaN(date.getTime())
    ? str(value)
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

// ========================================
// ATTENDANCE INTERPRETATION
// ========================================

// Supported types:
// 1. Individual Present / Absent / Late records
// 2. Numeric attended/total class summaries
//
// Unknown formats are not counted as attendance.

function interpretAttendance(row) {
  const status = norm(
    first(
      row.status,
      row.attendanceStatus,
      row.remark
    )
  );

  const present = [
    "present",
    "p",
    "attended",
  ].includes(status);

  const absent = [
    "absent",
    "a",
  ].includes(status);

  const late = [
    "late",
    "l",
  ].includes(status);

  if (present || absent || late) {
    return {
      kind: "session",
      present: present || late ? 1 : 0,
      total: 1,
      status: present
        ? "Present"
        : absent
        ? "Absent"
        : "Late",
    };
  }

  const hasPresent =
    row.attendedClasses !== undefined ||
    row.presentClasses !== undefined ||
    row.classesAttended !== undefined;

  const hasTotal =
    row.totalClasses !== undefined ||
    row.classesHeld !== undefined ||
    row.totalSessions !== undefined;

  if (hasPresent && hasTotal) {
    const attended = Number(
      first(
        row.attendedClasses,
        row.presentClasses,
        row.classesAttended
      )
    );

    const total = Number(
      first(
        row.totalClasses,
        row.classesHeld,
        row.totalSessions
      )
    );

    if (
      Number.isInteger(attended) &&
      Number.isInteger(total) &&
      attended >= 0 &&
      total > 0 &&
      attended <= total
    ) {
      return {
        kind: "summary",
        present: attended,
        total,
        status: "Summary",
      };
    }
  }

  return {
    kind: "unsupported",
    present: 0,
    total: 0,
    status: "Unknown",
  };
}

// ========================================
// CSV EXPORT
// ========================================

function exportCSV(filename, headers, rows) {
  function safe(value) {
    let content = String(value ?? "");

    if (/^\s*[=+\-@\t\r]/.test(content)) {
      content = "'" + content;
    }

    return `"${content.replace(/"/g, '""')}"`;
  }

  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map(safe).join(","))
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

// ========================================
// REUSABLE COMPONENTS
// ========================================

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
          <p className="text-sm text-[#718579]">
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

      <p className="mt-3 text-xs leading-5 text-[#718579]">
        {subtitle}
      </p>
    </div>
  );
}

function AttendanceBadge({
  percentage,
  threshold,
}) {
  const low = percentage < threshold;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
        low
          ? "bg-rose-50 text-rose-700"
          : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {low ? "Low Attendance" : "Meets Threshold"}
    </span>
  );
}

function DetailModal({
  entry,
  threshold,
  onClose,
}) {
  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hod-attendance-detail-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#B18B37]">
              ATTENDANCE DETAILS
            </p>

            <h2
              id="hod-attendance-detail-title"
              className="mt-2 text-xl font-extrabold text-[#234E43]"
            >
              {entry.studentName}
            </h2>

            <p className="mt-1 text-sm text-[#718579]">
              {entry.studentId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-xl p-2 hover:bg-[#F6F8F3]"
          >
            <X size={21} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl bg-[#F6F8F3] p-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#718579]">
              Course
            </p>
            <p className="mt-1 font-bold text-[#234E43]">
              {entry.courseName}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#718579]">
              Course Code
            </p>
            <p className="mt-1 font-bold text-[#234E43]">
              {entry.courseCode}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#718579]">
              Classes Attended
            </p>
            <p className="mt-1 font-bold text-[#234E43]">
              {entry.present}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#718579]">
              Total Classes
            </p>
            <p className="mt-1 font-bold text-[#234E43]">
              {entry.total}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#E2EADC] p-5">
          <div className="flex items-center justify-between">
            <p className="font-bold text-[#234E43]">
              Attendance Rate
            </p>

            <p className="text-2xl font-extrabold text-[#234E43]">
              {entry.percentage.toFixed(1)}%
            </p>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#EAF2E8]">
            <div
              className={`h-full rounded-full ${
                entry.percentage < threshold
                  ? "bg-rose-500"
                  : "bg-[#234E43]"
              }`}
              style={{
                width: `${Math.min(
                  entry.percentage,
                  100
                )}%`,
              }}
            />
          </div>

          <div className="mt-4">
            <AttendanceBadge
              percentage={entry.percentage}
              threshold={threshold}
            />
          </div>
        </div>

        <h3 className="mt-6 font-bold text-[#234E43]">
          Source Records
        </h3>

        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {entry.records.map((record, index) => (
            <div
              key={`${record.id || "record"}-${index}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F6F8F3] p-4"
            >
              <span className="text-xs text-[#607B6C]">
                {displayDate(attendanceDate(record))}
              </span>

              <span className="text-xs font-bold text-[#234E43]">
                {interpretAttendance(record).status}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs leading-5 text-[#718579]">
          This is a read-only view of matching Admin
          attendance records. It does not change
          student or faculty attendance.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white"
        >
          Close Details
        </button>
      </div>
    </div>
  );
}

// ========================================
// MAIN PAGE
// ========================================

export default function HODAttendance() {
  const [data, setData] = useState(loadData);

  const [departmentId, setDepartmentId] =
    useState(loadDepartment);

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [threshold, setThreshold] =
    useState(DEFAULT_THRESHOLD);

  const [page, setPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState(null);

  const [feedback, setFeedback] = useState("");

  // ======================================
  // STORAGE REFRESH
  // ======================================

  useEffect(() => {
    function refresh() {
      setData(loadData());
      setDepartmentId(loadDepartment());
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("storage", refresh);

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.removeEventListener("storage", refresh);
      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  // ======================================
  // SELECTED DEPARTMENT
  // ======================================

  const departments = useMemo(
    () =>
      data.departments.rows.map(
        (row, index) => departmentInfo(row, index)
      ),
    [data.departments.rows]
  );

  const department = departments.find(
    (item) => item.id === departmentId
  );

  // ======================================
  // STUDENTS AND COURSES
  // ======================================

  const students = useMemo(
    () =>
      department
        ? data.students.rows.filter((row) =>
            departmentMatches(row, department)
          )
        : [],
    [data.students.rows, department]
  );

  const courses = useMemo(
    () =>
      department
        ? data.courses.rows.filter((row) =>
            departmentMatches(row, department)
          )
        : [],
    [data.courses.rows, department]
  );

  const studentLookup = useMemo(() => {
    const map = new Map();

    students.forEach((student) => {
      studentKeys(student).forEach((key) => {
        map.set(key, student);
      });
    });

    return map;
  }, [students]);

  const courseLookup = useMemo(() => {
    const map = new Map();

    courses.forEach((course) => {
      courseKeys(course).forEach((key) => {
        map.set(key, course);
      });
    });

    return map;
  }, [courses]);

  // ======================================
  // MATCH ATTENDANCE RECORDS
  // ======================================

  const attendanceResult = useMemo(() => {
    const groups = new Map();

    let unsupported = 0;
    let unmatched = 0;

    const seenKinds = new Map();

    data.attendance.rows.forEach((record) => {
      const student = studentLookup.get(
        norm(attendanceStudentId(record))
      );

      const course = courseLookup.get(
        norm(attendanceCourseId(record))
      );

      // Do not infer department from missing
      // student or course relationships.
      if (!student || !course) {
        unmatched += 1;
        return;
      }

      const interpreted = interpretAttendance(record);

      if (interpreted.kind === "unsupported") {
        unsupported += 1;
        return;
      }

      const key = [
        studentId(student),
        courseId(course),
      ].join("::");

      // Avoid combining daily session records and
      // already-aggregated summaries for the same pair.
      const previousKind = seenKinds.get(key);

      if (
        previousKind &&
        previousKind !== interpreted.kind
      ) {
        unsupported += 1;
        return;
      }

      seenKinds.set(key, interpreted.kind);

      const existing = groups.get(key) || {
        key,
        studentId: studentId(student),
        studentName: studentName(student),
        courseId: courseId(course),
        courseCode: courseCode(course),
        courseName: courseName(course),
        present: 0,
        total: 0,
        records: [],
      };

      existing.present += interpreted.present;
      existing.total += interpreted.total;
      existing.records.push(record);

      groups.set(key, existing);
    });

    const rows = [...groups.values()].map((row) => ({
      ...row,
      percentage:
        row.total > 0
          ? (row.present / row.total) * 100
          : 0,
    }));

    return {
      rows,
      unsupported,
      unmatched,
    };
  }, [
    data.attendance.rows,
    studentLookup,
    courseLookup,
  ]);

  const rows = attendanceResult.rows;

  // ======================================
  // DATA READINESS
  // ======================================

  const ready =
    Boolean(department) &&
    data.students.status === "available" &&
    data.courses.status === "available" &&
    data.attendance.status === "available";

  // ======================================
  // FILTER OPTIONS
  // ======================================

  const courseOptions = useMemo(
    () => [
      "All",
      ...new Set(
        rows.map((row) => row.courseId)
      ),
    ],
    [rows]
  );

  const filtered = useMemo(() => {
    const query = norm(search);

    return rows.filter((row) => {
      const matchesSearch = [
        row.studentName,
        row.studentId,
        row.courseName,
        row.courseCode,
      ].some((value) =>
        norm(value).includes(query)
      );

      const matchesCourse =
        courseFilter === "All" ||
        row.courseId === courseFilter;

      const isLow =
        row.percentage < threshold;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Low" && isLow) ||
        (statusFilter === "Meets" && !isLow);

      return (
        matchesSearch &&
        matchesCourse &&
        matchesStatus
      );
    });
  }, [
    rows,
    search,
    courseFilter,
    statusFilter,
    threshold,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ======================================
  // STATISTICS
  // ======================================

  const lowRows = rows.filter(
    (row) => row.percentage < threshold
  );

  const average =
    rows.length > 0
      ? rows.reduce(
          (sum, row) => sum + row.percentage,
          0
        ) / rows.length
      : null;

  const studentsWithRecords = new Set(
    rows.map((row) => row.studentId)
  ).size;

  const stats = [
    {
      label: "Students With Records",
      value: ready ? studentsWithRecords : "—",
      subtitle: "Distinct matched students",
      icon: Users,
    },
    {
      label: "Attendance Records",
      value: ready ? rows.length : "—",
      subtitle: "Student-course summaries",
      icon: ClipboardCheck,
    },
    {
      label: "Average Attendance",
      value:
        ready && average !== null
          ? `${average.toFixed(1)}%`
          : "—",
      subtitle: "Average of matched student-course rates",
      icon: BarChart3,
    },
    {
      label: "Below Threshold",
      value: ready ? lowRows.length : "—",
      subtitle: "Student-course records needing review",
      icon: AlertTriangle,
    },
  ];

  const selectedEntry = rows.find(
    (row) => row.key === selectedKey
  );

  // ======================================
  // ACTIONS
  // ======================================

  function changeDepartment(id) {
    setDepartmentId(id);
    setSearch("");
    setCourseFilter("All");
    setStatusFilter("All");
    setPage(1);
    setSelectedKey(null);
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
    setDepartmentId(loadDepartment());
    setFeedback("Attendance data refreshed.");
  }

  function downloadReport() {
    if (!ready) return;

    exportCSV(
      "UniBee_HOD_Attendance_Report.csv",
      [
        "Student ID",
        "Student Name",
        "Course Code",
        "Course Name",
        "Classes Attended",
        "Total Classes",
        "Attendance %",
        "Attendance Status",
      ],
      filtered.map((row) => [
        row.studentId,
        row.studentName,
        row.courseCode,
        row.courseName,
        row.present,
        row.total,
        row.percentage.toFixed(2),
        row.percentage < threshold
          ? "Low Attendance"
          : "Meets Threshold",
      ])
    );

    setFeedback(
      "Attendance report exported successfully."
    );
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
            ACADEMIC MANAGEMENT
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Attendance Overview
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Monitor department attendance, review
            course-wise records and identify students
            requiring attendance support.
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
            onClick={downloadReport}
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
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
            <h2 className="font-bold text-[#234E43]">
              Active Department
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Select a department to view its attendance.
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
            <option
              key={item.id}
              value={item.id}
            >
              {item.name}
            </option>
          ))}
        </select>
      </section>

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </div>
      )}

      {!ready && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Database
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>
            Attendance statistics require a selected
            department and valid Admin Student, Course,
            and Attendance records. Missing data will
            not be replaced with demo statistics.
          </p>
        </div>
      )}

      {ready &&
        (attendanceResult.unsupported > 0 ||
          attendanceResult.unmatched > 0) && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Info
              size={19}
              className="mt-0.5 shrink-0"
            />

            <p>
              {attendanceResult.unsupported} matched
              attendance records use unsupported or
              conflicting formats.{" "}
              {attendanceResult.unmatched} records
              could not be associated with both a
              student and course in this department.
              These records are excluded from the
              displayed percentages.
            </p>
          </div>
        )}

      {/* SUMMARY CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            size={19}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Attendance Filters
          </h2>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_190px_180px_130px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search student, ID or course..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#A6C1A4]"
            />
          </div>

          <select
            aria-label="Filter by course"
            value={courseFilter}
            onChange={(event) => {
              setCourseFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm text-[#45685B]"
          >
            <option value="All">
              All Courses
            </option>

            {courseOptions
              .filter((id) => id !== "All")
              .map((id) => {
                const entry = rows.find(
                  (row) => row.courseId === id
                );

                return (
                  <option key={id} value={id}>
                    {entry?.courseCode || id}
                  </option>
                );
              })}
          </select>

          <select
            aria-label="Filter by attendance status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm text-[#45685B]"
          >
            <option value="All">
              All Attendance
            </option>

            <option value="Low">
              Low Attendance
            </option>

            <option value="Meets">
              Meets Threshold
            </option>
          </select>

          <label className="block">
            <span className="mb-1 block text-xs text-[#718579]">
              Minimum %
            </span>

            <input
              type="number"
              min="0"
              max="100"
              value={threshold}
              onChange={(event) => {
                const number = Number(
                  event.target.value
                );

                setThreshold(
                  Math.max(
                    0,
                    Math.min(
                      100,
                      Number.isFinite(number)
                        ? number
                        : 0
                    )
                  )
                );

                setPage(1);
              }}
              className="w-full rounded-xl border border-[#E2EADC] px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <p className="mt-4 text-xs text-[#718579]">
          Low attendance is defined here as below{" "}
          <strong>{threshold}%</strong>. This is an
          adjustable monitoring threshold, not a
          confirmed university attendance policy.
        </p>
      </section>

      {/* ATTENDANCE TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#E2EADC] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              Student Attendance Records
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Course-wise attendance summaries
            </p>
          </div>

          <span className="rounded-full bg-[#F6F8F3] px-3 py-2 text-xs font-bold text-[#234E43]">
            {ready ? filtered.length : 0} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
              <tr>
                {[
                  "Student",
                  "Course",
                  "Attended",
                  "Total",
                  "Attendance",
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
                pageRows.map((row) => (
                  <tr
                    key={row.key}
                    className="hover:bg-[#F9FBF8]"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-[#234E43]">
                        {row.studentName}
                      </p>

                      <p className="mt-1 text-xs text-[#718579]">
                        {row.studentId}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#234E43]">
                        {row.courseName}
                      </p>

                      <p className="mt-1 text-xs text-[#718579]">
                        {row.courseCode}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {row.present}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {row.total}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-bold text-[#234E43]">
                        {row.percentage.toFixed(1)}%
                      </p>

                      <div className="mt-2 h-2 w-28 overflow-hidden rounded-full bg-[#EAF2E8]">
                        <div
                          className={`h-full rounded-full ${
                            row.percentage < threshold
                              ? "bg-rose-500"
                              : "bg-[#234E43]"
                          }`}
                          style={{
                            width: `${row.percentage}%`,
                          }}
                        />
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <AttendanceBadge
                        percentage={row.percentage}
                        threshold={threshold}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedKey(row.key)
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

          {(!ready || pageRows.length === 0) && (
            <div className="py-14 text-center">
              <ClipboardCheck
                size={38}
                className="mx-auto text-[#A6C1A4]"
              />

              <p className="mt-4 font-bold text-[#234E43]">
                No Attendance Records Found
              </p>

              <p className="mt-2 text-sm text-[#718579]">
                No matching, supported attendance
                records are available for this selection.
              </p>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between gap-3 border-t border-[#EDF1EB] p-5">
          <p className="text-xs text-[#718579]">
            Page {currentPage} of {totalPages}
            {" · "}
            {filtered.length} records
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
              disabled={currentPage === totalPages}
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

      {/* LOW ATTENDANCE REVIEW */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={21}
            className="text-amber-700"
          />

          <h2 className="text-lg font-bold text-[#234E43]">
            Low Attendance Monitoring
          </h2>
        </div>

        <p className="mt-2 text-xs leading-6 text-[#718579]">
          Students whose matching course attendance
          falls below the selected threshold.
        </p>

        {ready && lowRows.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[...lowRows]
              .sort(
                (a, b) =>
                  a.percentage - b.percentage
              )
              .slice(0, 8)
              .map((row) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFF8EB] p-4"
                >
                  <div>
                    <p className="text-sm font-bold text-[#234E43]">
                      {row.studentName}
                    </p>

                    <p className="mt-1 text-xs text-[#718579]">
                      {row.courseCode} · {row.studentId}
                    </p>
                  </div>

                  <span className="text-lg font-extrabold text-rose-700">
                    {row.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-[#F6F8F3] p-5 text-sm text-[#718579]">
            {ready && rows.length
              ? "No matched attendance records are below the selected threshold."
              : "No verified attendance records are available for review."}
          </p>
        )}
      </section>

      {/* DATA NOTE */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> This page reads
        Admin Attendance data without editing it.
        Attendance must match a valid department
        student and course. Supported record formats
        include Present/Absent/Late session entries
        or numeric attended/total summaries.
        Late is currently counted as attended.
        The university's actual late-attendance
        policy and source data schema must be
        verified before production use. Mixing
        summary and session records may require
        additional reconciliation.
      </div>

      {/* DETAILS MODAL */}
      {selectedEntry && (
        <DetailModal
          entry={selectedEntry}
          threshold={threshold}
          onClose={() =>
            setSelectedKey(null)
          }
        />
      )}

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Head of Department Portal —
        Attendance Management
      </p>
    </div>
  );
}
