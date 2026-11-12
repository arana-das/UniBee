
import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Building2,
  BarChart3,
  Users,
  BookOpen,
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  Eye,
  X,
  CheckCircle2,
  Database,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
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
  results: "unibee-admin-results-v1",
  selectedDepartment:
    "unibee-hod-selected-department-v1",
};

const PAGE_SIZE = 10;
const DEFAULT_RISK_THRESHOLD = 2.5;

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
    results: readRows(KEYS.results),
  };
}

function loadDepartment() {
  try {
    return (
      localStorage.getItem(KEYS.selectedDepartment) ||
      ""
    );
  } catch {
    return "";
  }
}

// ========================================
// GENERAL DATA HELPERS
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return text(value).toLowerCase();
}

function first(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      text(value) !== ""
    ) {
      return value;
    }
  }

  return "";
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
    const values =
      field && typeof field === "object"
        ? [
            field.id,
            field._id,
            field.name,
            field.code,
          ]
        : [field];

    return values.some((part) =>
      expected.includes(norm(part))
    );
  });
}

function studentId(row) {
  return text(
    first(
      row.studentId,
      row.studentID,
      row.registrationNumber,
      row.registrationNo,
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

function studentSemester(row) {
  return text(
    first(
      row.semester,
      row.currentSemester,
      row.semesterName
    )
  );
}

function studentBatch(row) {
  return text(
    first(row.batch, row.batchName, row.intake, row.session)
  );
}

function courseId(row) {
  return text(
    first(row.id, row._id, row.courseId, row.code)
  );
}

function courseCode(row) {
  return text(first(row.code, row.courseCode, row.id));
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

function resultStudentKey(row) {
  return text(
    first(
      row.studentId,
      row.studentID,
      row.registrationNumber,
      row.student?.studentId,
      row.student?.id
    )
  );
}

function resultCourseKey(row) {
  return text(
    first(
      row.courseId,
      row.courseCode,
      row.course?.id,
      row.course?.code
    )
  );
}

function resultSemester(row) {
  return text(
    first(row.semester, row.term, row.semesterName)
  );
}

function resultSession(row) {
  return text(
    first(
      row.academicSession,
      row.session,
      row.academicYear
    )
  );
}

// Only explicitly stored numeric CGPA/GPA fields
// are accepted. Letter grades are not converted
// into grade points without a verified policy.

function numericGrade(value) {
  if (
    value === null ||
    value === undefined ||
    text(value) === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) &&
    number >= 0 &&
    number <= 4
    ? number
    : null;
}

function resultCGPA(row) {
  return numericGrade(
    first(
      row.cgpa,
      row.cumulativeGPA,
      row.cumulativeCgpa,
      row.cumulativeGradePointAverage
    )
  );
}

function resultGPA(row) {
  return numericGrade(
    first(
      row.gpa,
      row.sgpa,
      row.semesterGPA,
      row.gradePointAverage
    )
  );
}

function resultGrade(row) {
  return text(
    first(row.grade, row.letterGrade, row.finalGrade)
  );
}

function formatGPA(value) {
  return value === null ? "—" : value.toFixed(2);
}

function resultDate(row) {
  return text(
    first(
      row.publishedAt,
      row.updatedAt,
      row.createdAt,
      row.date
    )
  );
}

function latestResult(records) {
  return [...records].sort((a, b) =>
    resultDate(b).localeCompare(resultDate(a))
  )[0];
}

// ========================================
// CSV EXPORT
// ========================================

function exportCSV(filename, headers, rows) {
  function safeCell(value) {
    let content = String(value ?? "");

    if (/^\s*[=+\-@\t\r]/.test(content)) {
      content = "'" + content;
    }

    return `"${content.replace(/"/g, '""')}"`;
  }

  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map(safeCell).join(","))
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
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

      <p className="mt-3 text-xs leading-5 text-[#718579]">
        {subtitle}
      </p>
    </div>
  );
}

function RiskBadge({ cgpa, threshold }) {
  if (cgpa === null) {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
        Not Available
      </span>
    );
  }

  const atRisk = cgpa < threshold;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
        atRisk
          ? "bg-rose-50 text-rose-700"
          : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {atRisk ? "Needs Review" : "Meets Threshold"}
    </span>
  );
}

// ========================================
// STUDENT PERFORMANCE MODAL
// ========================================

function PerformanceDetails({
  entry,
  threshold,
  courseLookup,
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
        aria-labelledby="hod-performance-detail-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#B18B37]">
              STUDENT ACADEMIC PROFILE
            </p>

            <h2
              id="hod-performance-detail-title"
              className="mt-2 text-xl font-extrabold text-[#234E43]"
            >
              {entry.name}
            </h2>

            <p className="mt-1 text-sm text-[#718579]">
              {entry.id} · {entry.batch || "Batch not specified"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close performance details"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={21} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-[#F6F8F3] p-4">
            <p className="text-xs text-[#718579]">
              Latest Reported CGPA
            </p>
            <p className="mt-2 text-2xl font-extrabold text-[#234E43]">
              {formatGPA(entry.cgpa)}
            </p>
          </div>

          <div className="rounded-xl bg-[#F6F8F3] p-4">
            <p className="text-xs text-[#718579]">
              Result Records
            </p>
            <p className="mt-2 text-2xl font-extrabold text-[#234E43]">
              {entry.results.length}
            </p>
          </div>

          <div className="rounded-xl bg-[#F6F8F3] p-4">
            <p className="text-xs text-[#718579]">
              Monitoring Status
            </p>
            <div className="mt-3">
              <RiskBadge
                cgpa={entry.cgpa}
                threshold={threshold}
              />
            </div>
          </div>
        </div>

        <div className="mt-7">
          <h3 className="text-lg font-bold text-[#234E43]">
            Available Result Records
          </h3>

          <p className="mt-2 text-xs leading-6 text-[#718579]">
            Results shown below are read directly from
            saved Admin records. Missing values are not
            calculated or estimated.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-[#E2EADC]">
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-[#F6F8F3] text-xs text-[#718579]">
                <tr>
                  <th className="px-4 py-3">Course / Semester</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">GPA</th>
                  <th className="px-4 py-3">CGPA</th>
                  <th className="px-4 py-3">Grade</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#EDF1EB]">
                {entry.results.map((result, index) => {
                  const key = norm(resultCourseKey(result));
                  const course = courseLookup.get(key);

                  return (
                    <tr key={`${result.id ?? "r"}-${index}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-[#234E43]">
                          {course
                            ? courseName(course)
                            : resultCourseKey(result) ||
                              "General Result"}
                        </p>

                        <p className="mt-1 text-xs text-[#718579]">
                          {resultSemester(result) ||
                            "Semester not specified"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-sm text-[#607B6C]">
                        {resultSession(result) || "—"}
                      </td>

                      <td className="px-4 py-3 text-sm text-[#607B6C]">
                        {formatGPA(resultGPA(result))}
                      </td>

                      <td className="px-4 py-3 text-sm text-[#607B6C]">
                        {formatGPA(resultCGPA(result))}
                      </td>

                      <td className="px-4 py-3 text-sm text-[#607B6C]">
                        {resultGrade(result) || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 w-full rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white"
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

export default function HODPerformance() {
  const [data, setData] = useState(loadData);

  const [departmentId, setDepartmentId] =
    useState(loadDepartment);

  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] =
    useState("All");
  const [riskFilter, setRiskFilter] = useState("All");

  const [riskThreshold, setRiskThreshold] =
    useState(DEFAULT_RISK_THRESHOLD);

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
  // DEPARTMENT
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

  const students = useMemo(
    () =>
      department
        ? data.students.rows.filter((row) =>
            matchesDepartment(row, department)
          )
        : [],
    [data.students.rows, department]
  );

  const courses = useMemo(
    () =>
      department
        ? data.courses.rows.filter((row) =>
            matchesDepartment(row, department)
          )
        : [],
    [data.courses.rows, department]
  );

  // ======================================
  // STUDENT & COURSE LOOKUPS
  // ======================================

  const studentLookup = useMemo(() => {
    const lookup = new Map();

    students.forEach((student) => {
      [
        studentId(student),
        student.id,
        student._id,
      ]
        .map(norm)
        .filter(Boolean)
        .forEach((key) => lookup.set(key, student));
    });

    return lookup;
  }, [students]);

  const courseLookup = useMemo(() => {
    const lookup = new Map();

    courses.forEach((course) => {
      [
        courseId(course),
        courseCode(course),
        course.courseId,
      ]
        .map(norm)
        .filter(Boolean)
        .forEach((key) => lookup.set(key, course));
    });

    return lookup;
  }, [courses]);

  // ======================================
  // RESULT GROUPING
  // ======================================

  const resultAnalysis = useMemo(() => {
    const groups = new Map();
    let unmatched = 0;
    let unsupported = 0;

    data.results.rows.forEach((result) => {
      const key = norm(resultStudentKey(result));
      const student = studentLookup.get(key);

      if (!student) {
        unmatched += 1;
        return;
      }

      const courseKey = norm(resultCourseKey(result));

      // If a result references a course, verify that
      // it belongs to the selected department.
      if (
        courseKey &&
        courses.length &&
        !courseLookup.has(courseKey)
      ) {
        unmatched += 1;
        return;
      }

      const hasAcademicValue =
        resultCGPA(result) !== null ||
        resultGPA(result) !== null ||
        Boolean(resultGrade(result));

      if (!hasAcademicValue) {
        unsupported += 1;
        return;
      }

      const id = studentId(student);

      const existing = groups.get(id) || {
        key: id,
        id,
        name: studentName(student),
        semester: studentSemester(student),
        batch: studentBatch(student),
        results: [],
      };

      existing.results.push(result);
      groups.set(id, existing);
    });

    const rows = [...groups.values()].map((entry) => {
      // Choose the most recently dated record that
      // explicitly contains cumulative GPA.
      // Undated entries cannot establish chronology.
      const dated = entry.results
        .filter(
          (row) =>
            resultCGPA(row) !== null &&
            resultDate(row)
        )
        .sort((a, b) =>
          resultDate(b).localeCompare(resultDate(a))
        );

      const cgpa =
        dated.length > 0
          ? resultCGPA(dated[0])
          : null;

      return {
        ...entry,
        cgpa,
        latestRecord: latestResult(entry.results),
      };
    });

    return {
      rows,
      unmatched,
      unsupported,
    };
  }, [
    data.results.rows,
    studentLookup,
    courseLookup,
    courses.length,
  ]);

  const entries = resultAnalysis.rows;

  const ready =
    Boolean(department) &&
    data.students.status === "available" &&
    data.results.status === "available";

  // ======================================
  // FILTERS
  // ======================================

  const semesters = useMemo(
    () => [
      "All",
      ...new Set(
        entries.map((entry) => entry.semester).filter(Boolean)
      ),
    ],
    [entries]
  );

  const filtered = useMemo(() => {
    const query = norm(search);

    return entries.filter((entry) => {
      const matchesSearch = [
        entry.name,
        entry.id,
        entry.batch,
        entry.semester,
      ].some((value) => norm(value).includes(query));

      const matchesSemester =
        semesterFilter === "All" ||
        entry.semester === semesterFilter;

      const matchesRisk =
        riskFilter === "All" ||
        (riskFilter === "Risk" &&
          entry.cgpa !== null &&
          entry.cgpa < riskThreshold) ||
        (riskFilter === "Meets" &&
          entry.cgpa !== null &&
          entry.cgpa >= riskThreshold) ||
        (riskFilter === "Missing" &&
          entry.cgpa === null);

      return (
        matchesSearch &&
        matchesSemester &&
        matchesRisk
      );
    });
  }, [
    entries,
    search,
    semesterFilter,
    riskFilter,
    riskThreshold,
  ]);

  // ======================================
  // PAGINATION
  // ======================================

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ======================================
  // STATISTICS
  // ======================================

  const withCGPA = entries.filter(
    (entry) => entry.cgpa !== null
  );

  const atRisk = withCGPA.filter(
    (entry) => entry.cgpa < riskThreshold
  );

  const averageCGPA =
    withCGPA.length > 0
      ? withCGPA.reduce(
          (sum, entry) => sum + entry.cgpa,
          0
        ) / withCGPA.length
      : null;

  const stats = [
    {
      label: "Students With Results",
      value: ready ? entries.length : "—",
      subtitle: "Matched student result profiles",
      icon: Users,
    },
    {
      label: "CGPA Available",
      value: ready ? withCGPA.length : "—",
      subtitle: "Students with dated cumulative GPA",
      icon: GraduationCap,
    },
    {
      label: "Average CGPA",
      value: ready ? formatGPA(averageCGPA) : "—",
      subtitle: "Average of available latest CGPAs",
      icon: BarChart3,
    },
    {
      label: "Needs Academic Review",
      value: ready ? atRisk.length : "—",
      subtitle: `Students below ${riskThreshold.toFixed(2)}`,
      icon: AlertTriangle,
    },
  ];

  const selectedEntry = entries.find(
    (entry) => entry.key === selectedKey
  );

  // ======================================
  // ACTIONS
  // ======================================

  function changeDepartment(value) {
    setDepartmentId(value);
    setSearch("");
    setSemesterFilter("All");
    setRiskFilter("All");
    setSelectedKey(null);
    setPage(1);
    setFeedback("");

    try {
      if (value) {
        localStorage.setItem(
          KEYS.selectedDepartment,
          value
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
    setFeedback("Academic results refreshed.");
  }

  function downloadReport() {
    if (!ready) return;

    exportCSV(
      "UniBee_HOD_Academic_Performance.csv",
      [
        "Student ID",
        "Student Name",
        "Batch",
        "Semester",
        "Reported CGPA",
        "Result Records",
        "Academic Review Status",
      ],
      filtered.map((entry) => [
        entry.id,
        entry.name,
        entry.batch,
        entry.semester,
        entry.cgpa === null
          ? ""
          : entry.cgpa.toFixed(2),
        entry.results.length,
        entry.cgpa === null
          ? "CGPA Unavailable"
          : entry.cgpa < riskThreshold
          ? "Needs Review"
          : "Meets Threshold",
      ])
    );

    setFeedback(
      "Academic performance report exported."
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
            Academic Performance
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Review student results, reported CGPA,
            and department academic performance.
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
              Academic performance for the selected department.
            </p>
          </div>
        </div>

        <select
          aria-label="Select HOD department"
          value={department ? departmentId : ""}
          onChange={(event) =>
            changeDepartment(event.target.value)
          }
          disabled={
            data.departments.status !== "available"
          }
          className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72"
        >
          <option value="">Select Department</option>

          {departments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </section>

      {/* FEEDBACK */}
      {feedback && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </p>
      )}

      {!ready && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Database size={19} className="shrink-0" />

          <p>
            Select a department and ensure Admin Student
            and Result records are available. Missing
            results will not be replaced with demo values.
          </p>
        </div>
      )}

      {ready &&
        (resultAnalysis.unmatched > 0 ||
          resultAnalysis.unsupported > 0) && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Info size={19} className="shrink-0" />

            <p>
              {resultAnalysis.unmatched} result records
              could not be matched to this department.
              {resultAnalysis.unsupported} matched
              records do not contain supported GPA,
              CGPA or grade information. These records
              are excluded from the statistics.
            </p>
          </div>
        )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
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
            Performance Filters
          </h2>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_190px_135px]">
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
              placeholder="Search student name, ID or batch..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#A6C1A4]"
            />
          </div>

          <select
            aria-label="Filter by semester"
            value={semesterFilter}
            onChange={(event) => {
              setSemesterFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm"
          >
            <option value="All">All Semesters</option>

            {semesters
              .filter((item) => item !== "All")
              .map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
          </select>

          <select
            aria-label="Filter academic performance"
            value={riskFilter}
            onChange={(event) => {
              setRiskFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm"
          >
            <option value="All">All Performance</option>
            <option value="Risk">Needs Review</option>
            <option value="Meets">Meets Threshold</option>
            <option value="Missing">CGPA Unavailable</option>
          </select>

          <label>
            <span className="mb-1 block text-xs text-[#718579]">
              CGPA Threshold
            </span>

            <input
              type="number"
              min="0"
              max="4"
              step="0.1"
              value={riskThreshold}
              onChange={(event) => {
                const number = Number(event.target.value);

                setRiskThreshold(
                  Math.max(
                    0,
                    Math.min(
                      4,
                      Number.isFinite(number) ? number : 0
                    )
                  )
                );

                setPage(1);
              }}
              className="w-full rounded-xl border border-[#E2EADC] px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <p className="mt-4 text-xs leading-6 text-[#718579]">
          The default monitoring threshold is{" "}
          <strong>2.50 CGPA</strong> on an assumed
          4.00 scale. This is only a configurable
          demonstration setting, not a confirmed
          UniBee university grading policy.
        </p>
      </section>

      {/* PERFORMANCE TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#E2EADC] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              Department Academic Records
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Matched student results from Admin records
            </p>
          </div>

          <span className="rounded-full bg-[#F6F8F3] px-3 py-2 text-xs font-bold text-[#234E43]">
            {ready ? filtered.length : 0} Students
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
              <tr>
                {[
                  "Student",
                  "Batch",
                  "Semester",
                  "Latest CGPA",
                  "Results",
                  "Status",
                  "Action",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-4">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EDF1EB]">
              {ready &&
                visibleRows.map((entry) => (
                  <tr
                    key={entry.key}
                    className="hover:bg-[#F9FBF8]"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-[#234E43]">
                        {entry.name}
                      </p>

                      <p className="mt-1 text-xs text-[#718579]">
                        {entry.id}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {entry.batch || "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {entry.semester || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-lg font-extrabold text-[#234E43]">
                        {formatGPA(entry.cgpa)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {entry.results.length}
                    </td>

                    <td className="px-5 py-4">
                      <RiskBadge
                        cgpa={entry.cgpa}
                        threshold={riskThreshold}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedKey(entry.key)
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

          {(!ready || visibleRows.length === 0) && (
            <div className="py-14 text-center">
              <GraduationCap
                size={38}
                className="mx-auto text-[#A6C1A4]"
              />

              <p className="mt-4 font-bold text-[#234E43]">
                No Academic Results Found
              </p>

              <p className="mt-2 text-sm text-[#718579]">
                No matching academic records are
                available for the selected department
                and filters.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#EDF1EB] p-5">
          <p className="text-xs text-[#718579]">
            Page {currentPage} of {totalPages}
            {" · "}
            {filtered.length} students
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

      {/* ACADEMIC REVIEW */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={21}
            className="text-amber-700"
          />

          <h2 className="text-lg font-bold text-[#234E43]">
            Students Requiring Academic Review
          </h2>
        </div>

        <p className="mt-2 text-xs leading-6 text-[#718579]">
          Students with a dated, reported CGPA below
          the selected monitoring threshold.
        </p>

        {ready && atRisk.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[...atRisk]
              .sort((a, b) => a.cgpa - b.cgpa)
              .slice(0, 8)
              .map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#FFF8EB] p-4"
                >
                  <div>
                    <p className="text-sm font-bold text-[#234E43]">
                      {entry.name}
                    </p>

                    <p className="mt-1 text-xs text-[#718579]">
                      {entry.id} · {entry.batch || "No batch"}
                    </p>
                  </div>

                  <span className="text-xl font-extrabold text-rose-700">
                    {entry.cgpa.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-[#F6F8F3] p-5 text-sm text-[#718579]">
            {ready && withCGPA.length > 0
              ? "No students with available CGPA fall below the selected threshold."
              : "No verified CGPA records are available for academic-risk assessment."}
          </p>
        )}
      </section>

      {/* DATA LIMITATIONS */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <Info
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Academic
          statistics come from existing Admin Result
          records. A student must match the selected
          department. CGPA values are read only from
          explicit cumulative-GPA fields; grade
          letters are not converted automatically.
          A dated record is required to identify the
          latest CGPA. This module assumes a 4.00
          GPA scale, so the university grading
          system must be verified before deployment.
          Published-result status and the original
          Admin data structure also require
          verification during integration.
        </p>
      </div>

      {/* DETAILS MODAL */}
      {selectedEntry && (
        <PerformanceDetails
          entry={selectedEntry}
          threshold={riskThreshold}
          courseLookup={courseLookup}
          onClose={() =>
            setSelectedKey(null)
          }
        />
      )}

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Head of Department Portal —
        Academic Performance
      </p>
    </div>
  );
}
