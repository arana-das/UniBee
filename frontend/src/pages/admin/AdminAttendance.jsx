
import { useMemo, useState } from "react";
import {
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock3,
  Search,
  Filter,
  Eye,
  X,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  AlertCircle,
  Users,
  TrendingUp,
  RefreshCcw,
} from "lucide-react";

const STORAGE_KEY = "unibee-admin-attendance-v1";
const FACULTY_ATTENDANCE_KEY =
  "unibee-faculty-attendance-v1";

const PAGE_SIZE = 10;

const COURSES = [
  {
    code: "CSE 321",
    title: "Database Management Systems",
    faculty: "Dr. Arif Rahman",
  },
  {
    code: "CSE 331",
    title: "Software Engineering",
    faculty: "Dr. Nusrat Jahan",
  },
  {
    code: "CSE 351",
    title: "Computer Networks",
    faculty: "Dr. Arif Rahman",
  },
  {
    code: "BUS 201",
    title: "Principles of Management",
    faculty: "Dr. Mahmud Hasan",
  },
  {
    code: "EEE 301",
    title: "Electrical Machines",
    faculty: "Dr. Tanvir Ahmed",
  },
  {
    code: "ENG 205",
    title: "Introduction to Linguistics",
    faculty: "Farzana Islam",
  },
];

const STUDENTS = [
  ["UB-0001", "Ayesha Rahman"],
  ["UB-0002", "Tanvir Ahmed"],
  ["UB-0003", "Nusrat Jahan"],
  ["UB-0004", "Mahmud Hasan"],
  ["UB-0005", "Sadia Islam"],
  ["UB-0006", "Fahim Chowdhury"],
  ["UB-0007", "Maliha Akter"],
  ["UB-0008", "Rafiul Karim"],
  ["UB-0009", "Tania Sultana"],
  ["UB-0010", "Mehedi Hassan"],
  ["UB-0011", "Samira Ahmed"],
  ["UB-0012", "Rakib Hossain"],
];

const STATUSES = [
  "Present",
  "Absent",
  "Late",
  "Excused",
];

const SAMPLE_DATES = [
  "2026-10-20",
  "2026-10-22",
  "2026-10-25",
  "2026-10-27",
  "2026-10-29",
];

const DEMO_RECORDS = COURSES.flatMap(
  (course, courseIndex) =>
    SAMPLE_DATES.flatMap((date, dateIndex) =>
      STUDENTS.map(([studentId, studentName], studentIndex) => {
        const pattern =
          (courseIndex * 5 +
            dateIndex * 3 +
            studentIndex * 7) %
          20;

        const status =
          pattern < 15
            ? "Present"
            : pattern < 17
            ? "Late"
            : pattern < 19
            ? "Absent"
            : "Excused";

        return {
          id: `${course.code}-${date}-${studentId}`,
          courseCode: course.code,
          courseTitle: course.title,
          faculty: course.faculty,
          studentId,
          studentName,
          date,
          status,
          remarks: "",
          source: "Demo",
        };
      })
    )
);

function readRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEMO_RECORDS;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : DEMO_RECORDS;
  } catch {
    return DEMO_RECORDS;
  }
}

function StatusBadge({ status }) {
  const styles = {
    Present: "bg-emerald-50 text-emerald-700",
    Absent: "bg-rose-50 text-rose-700",
    Late: "bg-amber-50 text-amber-800",
    Excused: "bg-sky-50 text-sky-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function MetricCard({ title, value, detail, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-bold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {detail}
      </p>
    </article>
  );
}

function exportCSV(records) {
  const headers = [
    "Date",
    "Course Code",
    "Course Title",
    "Faculty",
    "Student ID",
    "Student Name",
    "Status",
    "Remarks",
    "Source",
  ];

  const rows = [
    headers,
    ...records.map((record) => [
      record.date,
      record.courseCode,
      record.courseTitle,
      record.faculty,
      record.studentId,
      record.studentName,
      record.status,
      record.remarks,
      record.source,
    ]),
  ];

  const escapeCell = (value) => {
    let text = String(value ?? "");

    if (/^\s*[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv =
    "\uFEFF" +
    rows
      .map((row) =>
        row.map(escapeCell).join(",")
      )
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "UniBee_Attendance.csv";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();

  if (value === "present") return "Present";
  if (value === "absent") return "Absent";
  if (value === "late") return "Late";
  if (value === "excused") return "Excused";

  return null;
}

function normalizeFacultyRecords(raw) {
  const output = [];

  if (!raw || typeof raw !== "object") {
    return output;
  }

  const addRecord = ({
    courseCode,
    date,
    studentId,
    studentName,
    status,
    remarks = "",
  }) => {
    const cleanStatus = normalizeStatus(status);

    if (
      !courseCode ||
      !date ||
      !studentId ||
      !cleanStatus
    ) {
      return;
    }

    const course = COURSES.find(
      (item) => item.code === courseCode
    );

    output.push({
      id: `faculty-${courseCode}-${date}-${studentId}`,
      courseCode,
      courseTitle: course?.title || courseCode,
      faculty: course?.faculty || "Faculty Member",
      studentId,
      studentName: studentName || studentId,
      date,
      status: cleanStatus,
      remarks,
      source: "Faculty",
    });
  };

  // Supports an array of explicit attendance records.
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (!item || typeof item !== "object") return;

      addRecord({
        courseCode:
          item.courseCode || item.course || "",
        date: item.date || "",
        studentId:
          item.studentId || item.student?.id || "",
        studentName:
          item.studentName || item.student?.name || "",
        status: item.status,
        remarks: item.remarks || "",
      });
    });

    return output;
  }

  // Supports nested course/date/student status objects.
  Object.entries(raw).forEach(([key, value]) => {
    if (!value || typeof value !== "object") return;

    const parts = key.split("::");
    if (parts.length !== 2) return;

    const [courseCode, date] = parts;

    Object.entries(value).forEach(
      ([studentId, status]) => {
        addRecord({
          courseCode,
          date,
          studentId,
          status:
            typeof status === "string"
              ? status
              : status?.status,
          studentName:
            STUDENTS.find(
              (student) => student[0] === studentId
            )?.[1] || studentId,
        });
      }
    );
  });

  return output;
}

function loadFacultyRecords() {
  try {
    const saved = localStorage.getItem(
      FACULTY_ATTENDANCE_KEY
    );

    if (!saved) return [];

    return normalizeFacultyRecords(
      JSON.parse(saved)
    );
  } catch {
    return [];
  }
}

export default function AdminAttendance() {
  const [demoRecords, setDemoRecords] =
    useState(readRecords);

  const [facultyRecords, setFacultyRecords] =
    useState(loadFacultyRecords);

  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] =
    useState("All");
  const [statusFilter, setStatusFilter] =
    useState("All");
  const [sourceFilter, setSourceFilter] =
    useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const [viewing, setViewing] = useState(null);
  const [feedback, setFeedback] = useState("");

  const records = useMemo(() => {
    const combined = new Map();

    demoRecords.forEach((record) => {
      combined.set(record.id, record);
    });

    facultyRecords.forEach((record) => {
      const matchedDemo = [...combined.values()].find(
        (item) =>
          item.courseCode === record.courseCode &&
          item.date === record.date &&
          item.studentId === record.studentId
      );

      if (matchedDemo) {
        combined.delete(matchedDemo.id);
      }

      combined.set(record.id, record);
    });

    return [...combined.values()].sort(
      (a, b) => b.date.localeCompare(a.date)
    );
  }, [demoRecords, facultyRecords]);

  const courseOptions = useMemo(
    () =>
      [...new Set(
        records.map((record) => record.courseCode)
      )].sort(),
    [records]
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch = [
        record.studentId,
        record.studentName,
        record.courseCode,
        record.courseTitle,
        record.faculty,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search)
      );

      return (
        matchesSearch &&
        (courseFilter === "All" ||
          record.courseCode === courseFilter) &&
        (statusFilter === "All" ||
          record.status === statusFilter) &&
        (sourceFilter === "All" ||
          record.source === sourceFilter) &&
        (!startDate || record.date >= startDate) &&
        (!endDate || record.date <= endDate)
      );
    });
  }, [
    records,
    query,
    courseFilter,
    statusFilter,
    sourceFilter,
    startDate,
    endDate,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const present = filtered.filter(
    (record) => record.status === "Present"
  ).length;

  const absent = filtered.filter(
    (record) => record.status === "Absent"
  ).length;

  const late = filtered.filter(
    (record) => record.status === "Late"
  ).length;

  const excused = filtered.filter(
    (record) => record.status === "Excused"
  ).length;

  const attendanceRate = filtered.length
    ? Math.round(
        ((present + late) / filtered.length) * 100
      )
    : 0;

  const courseSummary = useMemo(() => {
    const groups = new Map();

    filtered.forEach((record) => {
      const key = record.courseCode;

      if (!groups.has(key)) {
        groups.set(key, {
          code: key,
          title: record.courseTitle,
          total: 0,
          attended: 0,
        });
      }

      const item = groups.get(key);
      item.total++;

      if (
        record.status === "Present" ||
        record.status === "Late"
      ) {
        item.attended++;
      }
    });

    return [...groups.values()].sort(
      (a, b) => a.code.localeCompare(b.code)
    );
  }, [filtered]);

  function clearFilters() {
    setQuery("");
    setCourseFilter("All");
    setStatusFilter("All");
    setSourceFilter("All");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  function refreshFacultyData() {
    const fresh = loadFacultyRecords();
    setFacultyRecords(fresh);

    setFeedback(
      `Faculty attendance refreshed. ${fresh.length} compatible records loaded.`
    );
  }

  function resetDemo() {
    if (
      !window.confirm(
        "Restore default demo attendance records?"
      )
    ) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(DEMO_RECORDS)
      );
      setDemoRecords(DEMO_RECORDS);
      setFeedback("Demo attendance restored.");
    } catch {
      setFeedback(
        "Browser storage unavailable; demo reset was not saved."
      );
    }
  }

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Academic Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Attendance Monitoring
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View course attendance, student participation,
            and faculty-submitted records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshFacultyData}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] hover:bg-[#F6F8F3]"
          >
            <RefreshCcw size={17} />
            Refresh Faculty Data
          </button>

          <button
            type="button"
            onClick={() => exportCSV(filtered)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white hover:bg-[#193B33]"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </section>

      {/* STATS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Attendance Records"
          value={filtered.length}
          detail="Records matching current filters"
          icon={ClipboardCheck}
        />

        <MetricCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          detail="Present and Late combined"
          icon={TrendingUp}
        />

        <MetricCard
          title="Present"
          value={present}
          detail="Present attendance entries"
          icon={CheckCircle2}
        />

        <MetricCard
          title="Absent"
          value={absent}
          detail="Absent attendance entries"
          icon={XCircle}
        />
      </section>

      {/* ADDITIONAL METRICS */}
      <div className="flex flex-wrap gap-3">
        <span className="rounded-xl bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
          Late: {late}
        </span>

        <span className="rounded-xl bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700">
          Excused: {excused}
        </span>

        <span className="rounded-xl bg-[#A6C1A4]/20 px-4 py-2 text-xs font-semibold text-[#234E43]">
          Faculty Records: {facultyRecords.length}
        </span>
      </div>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={19} className="text-[#234E43]" />
          <h2 className="font-bold text-[#234E43]">
            Search & Filter Attendance
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search student, ID, course..."
              aria-label="Search attendance"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(event) => {
              setCourseFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter course"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Courses</option>

            {courseOptions.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter status"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Statuses</option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(event) => {
              setSourceFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter record source"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Sources</option>
            <option value="Demo">Demo</option>
            <option value="Faculty">Faculty</option>
          </select>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              From Date
            </span>

            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              To Date
            </span>

            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {filtered.length} matching attendance records
          </span>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              <RotateCcw size={15} />
              Clear Filters
            </button>

            <button
              type="button"
              onClick={resetDemo}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
            >
              Reset Demo
            </button>
          </div>
        </div>
      </section>

      {/* COURSE ATTENDANCE SUMMARY */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#234E43]">
          Course Attendance Summary
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Based on currently filtered attendance records
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courseSummary.map((course) => {
            const rate = course.total
              ? Math.round(
                  (course.attended / course.total) * 100
                )
              : 0;

            return (
              <div
                key={course.code}
                className="rounded-xl border border-slate-100 bg-[#F6F8F3] p-4"
              >
                <p className="text-xs font-bold text-[#B18A28]">
                  {course.code}
                </p>

                <p className="mt-1 text-sm font-semibold text-[#234E43]">
                  {course.title}
                </p>

                <div className="mt-4 flex justify-between text-xs">
                  <span className="text-slate-500">
                    Attendance Rate
                  </span>

                  <span className="font-bold text-[#234E43]">
                    {rate}%
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[#D9A536]"
                    style={{ width: `${rate}%` }}
                  />
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  {course.attended} attended / {course.total} records
                </p>
              </div>
            );
          })}
        </div>

        {courseSummary.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No attendance summary available.
          </p>
        )}
      </section>

      {/* ATTENDANCE TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student",
                  "Course",
                  "Date",
                  "Faculty",
                  "Status",
                  "Source",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4 font-semibold"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visible.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[#234E43]">
                      {record.studentName}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {record.studentId}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-xs font-bold text-[#B18A28]">
                      {record.courseCode}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {record.courseTitle}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {record.date}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {record.faculty}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={record.status} />
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-500">
                    {record.source}
                  </td>

                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setViewing(record)}
                      aria-label={`View ${record.studentName} attendance`}
                      title="View Attendance Details"
                      className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43] hover:bg-[#A6C1A4]/40"
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visible.length === 0 && (
            <div className="py-14 text-center text-sm text-slate-500">
              No matching attendance records found.
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
            {" · "}
            {filtered.length} records
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous page"
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {feedback && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {feedback}
        </p>
      )}

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
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-details-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18A28]">
                  ATTENDANCE RECORD
                </p>

                <h2
                  id="attendance-details-title"
                  className="mt-2 text-xl font-bold text-[#234E43]"
                >
                  {viewing.studentName}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close details"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-4">
              <StatusBadge status={viewing.status} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Student ID", viewing.studentId, GraduationCap],
                ["Course", `${viewing.courseCode} — ${viewing.courseTitle}`, BookOpen],
                ["Date", viewing.date, CalendarDays],
                ["Faculty", viewing.faculty, Users],
                ["Source", viewing.source, ClipboardCheck],
                ["Remarks", viewing.remarks || "No remarks", AlertCircle],
              ].map(([label, value, Icon]) => (
                <div
                  key={label}
                  className="rounded-xl bg-[#F6F8F3] p-3"
                >
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Icon size={15} />
                    {label}
                  </p>

                  <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setViewing(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      {/* FRONTEND NOTICE */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> Attendance statistics
        include sample records. Faculty attendance is imported
        only when its saved format matches one of the supported
        structures. This page does not modify faculty attendance,
        and the information is not synchronized through a database.
      </div>

      <p className="text-center text-xs text-slate-400">
        UniBee Admin Attendance · Frontend Demo
      </p>
    </div>
  );
}
