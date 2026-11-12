
import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  GraduationCap,
  LibraryBig,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
  AlertCircle,
  Database,
} from "lucide-react";

const KEYS = {
  students: "unibee-admin-students-v1",
  faculty: "unibee-admin-faculty-v1",
  courses: "unibee-admin-courses-v1",
  enrollment: "unibee-admin-enrollment-v1",
  attendance: "unibee-admin-attendance-v1",
  examinations: "unibee-admin-examinations-v1",
  results: "unibee-admin-results-v1",
  finance: "unibee-admin-finance-v1",
  books: "unibee-admin-library-books-v1",
  loans: "unibee-admin-library-loans-v1",
  events: "unibee-admin-events-v1",
  registrations: "unibee-admin-event-registrations-v1",
  notices: "unibee-admin-notices-v1",
};

const MODULE_NAMES = {
  students: "Students",
  faculty: "Faculty",
  courses: "Courses",
  enrollment: "Enrollment",
  attendance: "Attendance",
  examinations: "Examinations",
  results: "Results",
  finance: "Finance",
  books: "Library Books",
  loans: "Library Loans",
  events: "Events",
  registrations: "Event Registrations",
  notices: "Notices",
};

const COLORS = {
  green: "#234E43",
  sage: "#A6C1A4",
  gold: "#D9A536",
  slate: "#94A3B8",
  red: "#E78080",
  blue: "#7BA8C7",
};

const GRADE_SCALE = [
  { min: 80, grade: "A+", point: 4 },
  { min: 75, grade: "A", point: 3.75 },
  { min: 70, grade: "A-", point: 3.5 },
  { min: 65, grade: "B+", point: 3.25 },
  { min: 60, grade: "B", point: 3 },
  { min: 55, grade: "B-", point: 2.75 },
  { min: 50, grade: "C+", point: 2.5 },
  { min: 45, grade: "C", point: 2.25 },
  { min: 40, grade: "D", point: 2 },
  { min: 0, grade: "F", point: 0 },
];

function readData() {
  const records = {};
  const sources = {};

  for (const [name, key] of Object.entries(KEYS)) {
    try {
      const saved = localStorage.getItem(key);

      if (saved === null) {
        records[name] = [];
        sources[name] = "Missing";
        continue;
      }

      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        records[name] = [];
        sources[name] = "Invalid";
        continue;
      }

      records[name] = parsed;
      sources[name] = "Available";
    } catch {
      records[name] = [];
      sources[name] = "Invalid";
    }
  }

  return {
    records,
    sources,
    refreshedAt: new Date().toISOString(),
  };
}

function getGrade(marks) {
  const value = Number(marks);

  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return null;
  }

  return GRADE_SCALE.find((item) => value >= item.min)?.grade || "F";
}

function number(value) {
  return Number(value || 0).toLocaleString("en-BD");
}

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function percent(numerator, denominator) {
  return denominator > 0
    ? (numerator / denominator) * 100
    : 0;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function sum(rows, key) {
  return rows.reduce(
    (total, item) => total + (Number(item[key]) || 0),
    0
  );
}

function countStatus(rows, status) {
  return rows.filter(
    (item) =>
      String(item.status || "").toLowerCase() ===
      status.toLowerCase()
  ).length;
}

function uniqueCount(rows, key) {
  return new Set(
    rows.map((item) => item[key]).filter(Boolean)
  ).size;
}

function groupBy(rows, key) {
  const result = new Map();

  rows.forEach((item) => {
    const name = String(item[key] || "Not Specified");
    result.set(name, (result.get(name) || 0) + 1);
  });

  return [...result.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function getAnalytics(snapshot, semester) {
  const data = snapshot.records;

  const filteredBySemester = (rows) =>
    semester === "All"
      ? rows
      : rows.filter((item) => item.semester === semester);

  const courses = filteredBySemester(data.courses);
  const enrollments = filteredBySemester(data.enrollment);
  const results = filteredBySemester(data.results);
  const finance = filteredBySemester(data.finance);
  const examinations = filteredBySemester(data.examinations);

  // Students and faculty directories represent the whole institution.
  // Attendance has no semester field in the current demo structure.
  // Library and events also remain institution-wide.
  const students = data.students;
  const faculty = data.faculty;
  const attendance = data.attendance;
  const books = data.books;
  const loans = data.loans;
  const events = data.events;
  const registrations = data.registrations;

  const attendancePresent = countStatus(attendance, "Present");
  const attendanceLate = countStatus(attendance, "Late");
  const attendanceAbsent = countStatus(attendance, "Absent");
  const attendanceExcused = countStatus(attendance, "Excused");

  const attendanceCount =
    attendancePresent +
    attendanceLate +
    attendanceAbsent +
    attendanceExcused;

  const attendanceRate = percent(
    attendancePresent + attendanceLate,
    attendanceCount
  );

  const billed = sum(finance, "amount");
  const collected = sum(finance, "paid");
  const outstanding = Math.max(0, billed - collected);

  const resultGrades = results.reduce((groups, result) => {
    if (result.status !== "Published") return groups;

    const grade = getGrade(result.marks);
    if (!grade) return groups;

    groups[grade] = (groups[grade] || 0) + 1;
    return groups;
  }, {});

  const gradeDistribution = GRADE_SCALE.map((item) => ({
    label: item.grade,
    value: resultGrades[item.grade] || 0,
  }));

  const activeLoans = loans.filter(
    (loan) => !loan.returnDate
  );

  const bookCopies = sum(books, "copies");

  const eventRegistrations = registrations.filter((registration) =>
    events.some((event) => event.id === registration.eventId)
  );

  const enrollmentDistribution = [
    { label: "Approved", value: countStatus(enrollments, "Approved") },
    { label: "Pending", value: countStatus(enrollments, "Pending") },
    { label: "Rejected", value: countStatus(enrollments, "Rejected") },
    { label: "Dropped", value: countStatus(enrollments, "Dropped") },
  ];

  const attendanceDistribution = [
    { label: "Present", value: attendancePresent },
    { label: "Late", value: attendanceLate },
    { label: "Absent", value: attendanceAbsent },
    { label: "Excused", value: attendanceExcused },
  ];

  const courseStatusDistribution = [
    { label: "Active", value: countStatus(courses, "Active") },
    { label: "Draft", value: countStatus(courses, "Draft") },
    { label: "Archived", value: countStatus(courses, "Archived") },
  ];

  const financeDistribution = [
    {
      label: "Collected",
      value: collected,
    },
    {
      label: "Outstanding",
      value: outstanding,
    },
  ];

  const eventCategories = groupBy(events, "category");

  const departmentDistribution = groupBy(
    courses,
    "department"
  );

  return {
    students,
    faculty,
    courses,
    enrollments,
    attendance,
    examinations,
    results,
    finance,
    books,
    loans,
    events,
    registrations,

    attendanceRate,
    attendanceDistribution,

    billed,
    collected,
    outstanding,
    collectionRate: percent(collected, billed),

    enrollmentDistribution,
    gradeDistribution,
    courseStatusDistribution,
    financeDistribution,
    eventCategories,
    departmentDistribution,

    activeLoans: activeLoans.length,
    overdueLoans: activeLoans.filter(
      (loan) => loan.dueDate && loan.dueDate < today()
    ).length,
    bookCopies,
    availableCopies: Math.max(
      0,
      bookCopies - activeLoans.length
    ),

    registeredParticipants: eventRegistrations.length,

    activeStudents: countStatus(students, "Active"),
    activeFaculty: countStatus(faculty, "Active"),
    activeCourses: countStatus(courses, "Active"),
    publishedResults: countStatus(results, "Published"),
    publishedNotices: countStatus(data.notices, "Published"),

    uniqueDepartments: uniqueCount(courses, "department"),
  };
}

function today() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  missing = false,
}) {
  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>

          <p className="mt-3 break-words text-2xl font-bold text-[#234E43] md:text-3xl">
            {missing ? "—" : value}
          </p>
        </div>

        <div className="shrink-0 rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {missing ? "Saved data unavailable" : subtitle}
      </p>
    </article>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-[#234E43]">
        {title}
      </h2>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-xl bg-[#F6F8F3] p-5 text-center">
      <Database size={26} className="text-slate-400" />

      <p className="max-w-xs text-xs leading-5 text-slate-500">
        {message}
      </p>
    </div>
  );
}

function HorizontalBarChart({
  data,
  colors = [COLORS.green, COLORS.sage, COLORS.gold],
  suffix = "",
  valueFormatter = number,
  emptyText = "No chart data available.",
}) {
  const valid = data.filter((item) => item.value > 0);
  const maximum = Math.max(
    1,
    ...valid.map((item) => item.value)
  );

  if (valid.length === 0) {
    return <EmptyChart message={emptyText} />;
  }

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-600">
              {item.label}
            </span>

            <span className="text-xs font-bold text-[#234E43]">
              {valueFormatter(item.value)}{suffix}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-[#F0F3EE]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${percent(item.value, maximum)}%`,
                backgroundColor: colors[index % colors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  data,
  colors = [
    COLORS.green,
    COLORS.gold,
    COLORS.blue,
    COLORS.red,
    COLORS.sage,
  ],
  centerLabel = "Total",
  emptyText = "No distribution data available.",
}) {
  const total = data.reduce(
    (sum, item) => sum + Math.max(0, item.value),
    0
  );

  if (total <= 0) {
    return <EmptyChart message={emptyText} />;
  }

  let position = 0;

  const segments = data.map((item, index) => {
    const start = position;
    position += percent(item.value, total);

    return {
      ...item,
      color: colors[index % colors.length],
      start,
      end: position,
    };
  });

  const gradient = `conic-gradient(${segments
    .map(
      (item) =>
        `${item.color} ${item.start}% ${item.end}%`
    )
    .join(", ")})`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div
        className="relative h-44 w-44 shrink-0 rounded-full"
        style={{ background: gradient }}
        role="img"
        aria-label={data.map((item) =>
          `${item.label}: ${item.value}`
        ).join(", ")}
      >
        <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white">
          <p className="text-xs text-slate-500">
            {centerLabel}
          </p>

          <p className="mt-1 text-2xl font-bold text-[#234E43]">
            {number(total)}
          </p>
        </div>
      </div>

      <div className="min-w-[160px] flex-1 space-y-3">
        {segments.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />

              {item.label}
            </span>

            <span className="font-bold text-[#234E43]">
              {formatPercent(percent(item.value, total))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartPanel({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <SectionHeader title={title} subtitle={subtitle} />

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function formatTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function exportCSV(filename, headers, rows) {
  const safeCell = (value) => {
    let text = String(value ?? "");

    if (/^\s*[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) =>
        row.map(safeCell).join(",")
      )
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: "text/csv;charset=utf-8",
    })
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminAnalytics() {
  const [snapshot, setSnapshot] = useState(readData);

  const [semester, setSemester] = useState("All");

  const [selectedChart, setSelectedChart] = useState("Overview");

  const [message, setMessage] = useState("");

  const semesters = useMemo(() => {
    const values = [
      ...snapshot.records.courses,
      ...snapshot.records.enrollment,
      ...snapshot.records.examinations,
      ...snapshot.records.results,
      ...snapshot.records.finance,
    ]
      .map((item) => item.semester)
      .filter(Boolean);

    return [...new Set(values)].sort();
  }, [snapshot]);

  const analytics = useMemo(
    () => getAnalytics(snapshot, semester),
    [snapshot, semester]
  );

  const missingModules = Object.entries(snapshot.sources)
    .filter(([, state]) => state !== "Available")
    .map(([key]) => MODULE_NAMES[key]);

  const availableModuleCount = Object.values(
    snapshot.sources
  ).filter((value) => value === "Available").length;

  function refreshData() {
    setSnapshot(readData());
    setMessage("Analytics refreshed from saved browser data.");
  }

  function downloadSummary() {
    const metrics = [
      ["Total Students", analytics.students.length, "students"],
      ["Active Students", analytics.activeStudents, "students"],
      ["Total Faculty", analytics.faculty.length, "faculty"],
      ["Active Faculty", analytics.activeFaculty, "faculty"],
      ["Total Courses", analytics.courses.length, "courses"],
      ["Active Courses", analytics.activeCourses, "courses"],
      ["Enrollment Requests", analytics.enrollments.length, "enrollment"],
      ["Attendance Rate (%)", analytics.attendanceRate.toFixed(2), "attendance"],
      ["Published Results", analytics.publishedResults, "results"],
      ["Total Billed (BDT)", analytics.billed, "finance"],
      ["Total Collected (BDT)", analytics.collected, "finance"],
      ["Outstanding (BDT)", analytics.outstanding, "finance"],
      ["Library Books", analytics.books.length, "books"],
      ["Borrowed Copies", analytics.activeLoans, "loans"],
      ["Overdue Loans", analytics.overdueLoans, "loans"],
      ["Events", analytics.events.length, "events"],
      ["Event Registrations", analytics.registeredParticipants, "registrations"],
      ["Published Notices", analytics.publishedNotices, "notices"],
    ];

    exportCSV(
      "UniBee_Analytics_Summary.csv",
      ["Metric", "Value", "Semester", "Data Source"],
      metrics.map(([name, value, source]) => [
        name,
        snapshot.sources[source] === "Available" ? value : "",
        semester,
        snapshot.sources[source],
      ])
    );

    setMessage("Analytics summary exported as CSV.");
  }

  const cards = [
    {
      label: "Total Students",
      value: number(analytics.students.length),
      subtitle: `${number(analytics.activeStudents)} active students`,
      icon: GraduationCap,
      source: "students",
    },
    {
      label: "Faculty Members",
      value: number(analytics.faculty.length),
      subtitle: `${number(analytics.activeFaculty)} active faculty`,
      icon: Users,
      source: "faculty",
    },
    {
      label: "Academic Courses",
      value: number(analytics.courses.length),
      subtitle: `${number(analytics.activeCourses)} active courses`,
      icon: BookOpen,
      source: "courses",
    },
    {
      label: "Enrollment Requests",
      value: number(analytics.enrollments.length),
      subtitle: "Records for selected semester",
      icon: ClipboardCheck,
      source: "enrollment",
    },
    {
      label: "Attendance Rate",
      value: formatPercent(analytics.attendanceRate),
      subtitle: "Present + Late attendance entries",
      icon: Activity,
      source: "attendance",
    },
    {
      label: "Published Results",
      value: number(analytics.publishedResults),
      subtitle: "Published grade records",
      icon: CheckCircle2,
      source: "results",
    },
    {
      label: "Fee Collection",
      value: money(analytics.collected),
      subtitle: `${formatPercent(analytics.collectionRate)} collection rate`,
      icon: Wallet,
      source: "finance",
    },
    {
      label: "Outstanding Fees",
      value: money(analytics.outstanding),
      subtitle: "Unpaid recorded balances",
      icon: CircleDollarSign,
      source: "finance",
    },
  ];

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            University Intelligence
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Analytics Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Explore academic performance, student activity,
            finances and campus operations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/20 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <RefreshCw size={17} />
            Refresh Data
          </button>

          <button
            type="button"
            onClick={downloadSummary}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
          >
            <Download size={17} />
            Export Summary
          </button>
        </div>
      </section>

      {/* DATA STATUS */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
            <Database size={21} />
          </div>

          <div>
            <p className="text-sm font-bold text-[#234E43]">
              Data Sources
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {availableModuleCount} of {Object.keys(KEYS).length} modules
              have saved browser records
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Last Refreshed: {formatTime(snapshot.refreshedAt)}
        </p>
      </section>

      {missingModules.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-bold">
              Some data sources are not available
            </p>

            <p className="mt-1">
              {missingModules.join(", ")}
            </p>

            <p className="mt-1">
              Missing sources are excluded from their metrics.
              Open the corresponding Admin module and save its data
              before refreshing analytics.
            </p>
          </div>
        </div>
      )}

      {message && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {message}
        </p>
      )}

      {/* FILTER CONTROLS */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-[#234E43]">
            Analytics Filters
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Semester filters apply only to modules with semester records.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="relative">
            <span className="sr-only">Select semester</span>

            <select
              value={semester}
              onChange={(event) =>
                setSemester(event.target.value)
              }
              className="appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-[#234E43] outline-none"
            >
              <option value="All">All Semesters</option>

              {semesters.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#234E43]"
            />
          </label>

          <select
            value={selectedChart}
            onChange={(event) =>
              setSelectedChart(event.target.value)
            }
            aria-label="Select analytics section"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <option value="Overview">All Analytics</option>
            <option value="Academic">Academic</option>
            <option value="Finance">Finance</option>
            <option value="Campus">Campus Operations</option>
          </select>
        </div>
      </section>

      {/* KPI CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            missing={snapshot.sources[card.source] !== "Available"}
          />
        ))}
      </section>

      {/* ACADEMIC ANALYTICS */}
      {["Overview", "Academic"].includes(selectedChart) && (
        <>
          <section>
            <SectionHeader
              title="Academic Analytics"
              subtitle="Course enrollment, attendance, departments and academic outcomes"
            />

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <ChartPanel
                title="Enrollment Status"
                subtitle="Distribution of course enrollment requests"
              >
                <DonutChart
                  data={analytics.enrollmentDistribution}
                  emptyText="No saved enrollment data available."
                />
              </ChartPanel>

              <ChartPanel
                title="Attendance Performance"
                subtitle="Attendance entries including Present, Late, Absent and Excused"
              >
                <DonutChart
                  data={analytics.attendanceDistribution}
                  colors={[
                    COLORS.green,
                    COLORS.gold,
                    COLORS.red,
                    COLORS.blue,
                  ]}
                  emptyText="No saved attendance records available."
                />
              </ChartPanel>

              <ChartPanel
                title="Academic Grade Distribution"
                subtitle="Published results grouped by letter grade"
              >
                <HorizontalBarChart
                  data={analytics.gradeDistribution}
                  colors={[COLORS.green, COLORS.sage, COLORS.gold]}
                  emptyText="No published results found in saved records."
                />
              </ChartPanel>

              <ChartPanel
                title="Course Status"
                subtitle="Active, Draft and Archived course records"
              >
                <HorizontalBarChart
                  data={analytics.courseStatusDistribution}
                  colors={[
                    COLORS.green,
                    COLORS.gold,
                    COLORS.slate,
                  ]}
                  emptyText="No saved course records available."
                />
              </ChartPanel>
            </div>
          </section>

          <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
            <SectionHeader
              title="Courses by Department"
              subtitle="Distribution based on saved course records"
            />

            <div className="mt-6">
              <HorizontalBarChart
                data={analytics.departmentDistribution}
                emptyText="No department distribution can be calculated."
              />
            </div>
          </section>
        </>
      )}

      {/* FINANCE ANALYTICS */}
      {["Overview", "Finance"].includes(selectedChart) && (
        <section>
          <SectionHeader
            title="Financial Analytics"
            subtitle="Recorded fee collection and outstanding balances"
          />

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartPanel
              title="Fee Collection Breakdown"
              subtitle="Collected versus outstanding fees"
            >
              <DonutChart
                data={analytics.financeDistribution}
                colors={[COLORS.green, COLORS.gold]}
                centerLabel="BDT"
                emptyText="No saved financial records available."
              />
            </ChartPanel>

            <ChartPanel
              title="Finance Performance"
              subtitle="Summary of billed and collected fee amounts"
            >
              {snapshot.sources.finance === "Available" ? (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-[#F6F8F3] p-4">
                      <p className="text-xs text-slate-500">
                        Total Billed
                      </p>

                      <p className="mt-2 break-words text-xl font-bold text-[#234E43]">
                        {money(analytics.billed)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F6F8F3] p-4">
                      <p className="text-xs text-slate-500">
                        Outstanding Balance
                      </p>

                      <p className="mt-2 break-words text-xl font-bold text-[#234E43]">
                        {money(analytics.outstanding)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-500">
                        Collection Rate
                      </span>

                      <span className="font-bold text-[#234E43]">
                        {formatPercent(analytics.collectionRate)}
                      </span>
                    </div>

                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#D9A536]"
                        style={{
                          width: `${Math.min(100, analytics.collectionRate)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-xs leading-6 text-slate-500">
                    Figures are calculated from the current Finance
                    Management demo records, not verified transactions.
                  </p>
                </div>
              ) : (
                <EmptyChart message="Finance data has not been saved." />
              )}
            </ChartPanel>
          </div>
        </section>
      )}

      {/* CAMPUS ANALYTICS */}
      {["Overview", "Campus"].includes(selectedChart) && (
        <section>
          <SectionHeader
            title="Campus Operations Analytics"
            subtitle="Library usage, events and other campus activity"
          />

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartPanel
              title="Library Inventory"
              subtitle="Book copies currently available or borrowed"
            >
              <DonutChart
                data={[
                  {
                    label: "Available",
                    value: analytics.availableCopies,
                  },
                  {
                    label: "Borrowed",
                    value: analytics.activeLoans,
                  },
                ]}
                colors={[COLORS.green, COLORS.gold]}
                centerLabel="Copies"
                emptyText="No saved library inventory available."
              />

              <div className="mt-5 rounded-xl bg-[#F6F8F3] p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">
                    Overdue Loans
                  </span>

                  <span className="font-bold text-rose-600">
                    {snapshot.sources.loans === "Available"
                      ? number(analytics.overdueLoans)
                      : "—"}
                  </span>
                </div>
              </div>
            </ChartPanel>

            <ChartPanel
              title="Events by Category"
              subtitle="Campus events grouped by their type"
            >
              <HorizontalBarChart
                data={analytics.eventCategories}
                colors={[
                  COLORS.green,
                  COLORS.gold,
                  COLORS.blue,
                  COLORS.sage,
                ]}
                emptyText="No saved event records available."
              />
            </ChartPanel>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Book Titles"
              value={number(analytics.books.length)}
              subtitle="Library inventory records"
              icon={LibraryBig}
              missing={snapshot.sources.books !== "Available"}
            />

            <KpiCard
              label="Active Loans"
              value={number(analytics.activeLoans)}
              subtitle="Borrowed books not returned"
              icon={BookOpen}
              missing={snapshot.sources.loans !== "Available"}
            />

            <KpiCard
              label="Campus Events"
              value={number(analytics.events.length)}
              subtitle="All event records"
              icon={CalendarDays}
              missing={snapshot.sources.events !== "Available"}
            />

            <KpiCard
              label="Event Registrations"
              value={number(analytics.registeredParticipants)}
              subtitle="Registrations attached to existing events"
              icon={Users}
              missing={
                snapshot.sources.registrations !== "Available" ||
                snapshot.sources.events !== "Available"
              }
            />
          </div>
        </section>
      )}

      {/* DATA SOURCE LIST */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <SectionHeader
          title="Data Source Health"
          subtitle="Saved browser storage used by the analytics dashboard"
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(snapshot.sources).map(([key, state]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F8F3] p-3"
            >
              <span className="text-xs font-semibold text-[#234E43]">
                {MODULE_NAMES[key]}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                  state === "Available"
                    ? "bg-emerald-100 text-emerald-700"
                    : state === "Invalid"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {state}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO NOTE */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> Analytics uses only saved
        browser data. Semester filtering applies to Courses,
        Enrollments, Examinations, Results and Finance. Attendance
        and institution-wide records are not semester-filtered.
        Faculty Attendance synchronization and full historical
        analytics are not yet implemented. Statistics are
        illustrative and are not verified university reports.
      </div>

      <p className="text-center text-xs text-slate-400">
        UniBee Admin Analytics · Frontend Demo
      </p>
    </div>
  );
}
