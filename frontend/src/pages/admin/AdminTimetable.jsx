
import { useMemo, useState } from "react";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Eye,
  X,
  Save,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  UserRound,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  CalendarRange,
  LayoutGrid,
  List,
} from "lucide-react";

const STORAGE_KEY = "unibee-admin-timetable-v1";
const COURSE_KEY = "unibee-admin-courses-v1";
const PAGE_SIZE = 8;

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const CLASS_TYPES = ["Lecture", "Lab", "Tutorial", "Seminar"];
const STATUSES = ["Scheduled", "Cancelled"];

const SAMPLE_COURSES = [
  { code: "CSE 321", title: "Database Management Systems", semester: "Fall 2026", faculty: "Dr. Arif Rahman", status: "Active" },
  { code: "CSE 331", title: "Software Engineering", semester: "Fall 2026", faculty: "Dr. Nusrat Jahan", status: "Active" },
  { code: "CSE 351", title: "Computer Networks", semester: "Fall 2026", faculty: "Dr. Arif Rahman", status: "Active" },
  { code: "CSE 411", title: "Artificial Intelligence", semester: "Fall 2026", faculty: "Dr. Nusrat Jahan", status: "Active" },
  { code: "BUS 201", title: "Principles of Management", semester: "Fall 2026", faculty: "Dr. Mahmud Hasan", status: "Active" },
  { code: "EEE 301", title: "Electrical Machines", semester: "Fall 2026", faculty: "Dr. Tanvir Ahmed", status: "Active" },
  { code: "ENG 205", title: "Introduction to Linguistics", semester: "Fall 2026", faculty: "Farzana Islam", status: "Active" },
];

const SAMPLE_CLASSES = [
  ["CSE 321", "Fall 2026", "Saturday", "09:00", "10:30", "A-401", "Dr. Arif Rahman", "Lecture"],
  ["CSE 331", "Fall 2026", "Saturday", "11:00", "12:30", "A-402", "Dr. Nusrat Jahan", "Lecture"],
  ["BUS 201", "Fall 2026", "Sunday", "09:00", "10:30", "B-202", "Dr. Mahmud Hasan", "Lecture"],
  ["CSE 351", "Fall 2026", "Sunday", "11:00", "12:30", "A-401", "Dr. Arif Rahman", "Lecture"],
  ["EEE 301", "Fall 2026", "Monday", "09:00", "10:30", "E-302", "Dr. Tanvir Ahmed", "Lecture"],
  ["CSE 411", "Fall 2026", "Monday", "11:00", "12:30", "Lab-301", "Dr. Nusrat Jahan", "Lab"],
  ["ENG 205", "Fall 2026", "Tuesday", "10:00", "11:30", "ART-201", "Farzana Islam", "Lecture"],
  ["CSE 321", "Fall 2026", "Wednesday", "09:00", "10:30", "A-401", "Dr. Arif Rahman", "Lecture"],
  ["CSE 331", "Fall 2026", "Wednesday", "11:00", "12:30", "A-402", "Dr. Nusrat Jahan", "Tutorial"],
  ["BUS 201", "Fall 2026", "Thursday", "09:00", "10:30", "B-202", "Dr. Mahmud Hasan", "Lecture"],
].map(
  ([courseCode, semester, day, startTime, endTime, room, faculty, type], index) => ({
    id: `CLS-${String(index + 1).padStart(3, "0")}`,
    courseCode,
    semester,
    day,
    startTime,
    endTime,
    room,
    faculty,
    type,
    section: "A",
    status: "Scheduled",
  })
);

const EMPTY_FORM = {
  courseCode: "",
  semester: "",
  day: "Saturday",
  startTime: "09:00",
  endTime: "10:30",
  room: "",
  faculty: "",
  type: "Lecture",
  section: "A",
  status: "Scheduled",
};

function readArray(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `class-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        status === "Scheduled"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700"
      }`}
    >
      {status}
    </span>
  );
}

function exportCSV(classes, courses) {
  const rows = [
    [
      "Course Code", "Course Title", "Semester",
      "Day", "Start Time", "End Time", "Room",
      "Faculty", "Class Type", "Section", "Status",
    ],
    ...classes.map((item) => {
      const course = courses.find(
        (c) => c.code === item.courseCode && c.semester === item.semester
      );
      return [
        item.courseCode,
        course?.title || "",
        item.semester,
        item.day,
        item.startTime,
        item.endTime,
        item.room,
        item.faculty,
        item.type,
        item.section,
        item.status,
      ];
    }),
  ];

  const quote = (value) => {
    let text = String(value ?? "");
    if (/^\s*[=+\-@\t\r]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = "\uFEFF" + rows.map(
    (row) => row.map(quote).join(",")
  ).join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "UniBee_Timetable.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminTimetable() {
  const [classes, setClasses] = useState(() =>
    readArray(STORAGE_KEY, SAMPLE_CLASSES)
  );

  const [courses] = useState(() =>
    readArray(COURSE_KEY, SAMPLE_COURSES)
  );

  const [viewMode, setViewMode] = useState("Week");
  const [selectedDay, setSelectedDay] = useState("Saturday");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const semesters = useMemo(
    () => [...new Set([
      ...courses.map((c) => c.semester),
      ...classes.map((c) => c.semester),
    ].filter(Boolean))].sort(),
    [courses, classes]
  );

  const activeCourses = useMemo(
    () => courses.filter((c) => c.status === "Active"),
    [courses]
  );

  const courseOptions = activeCourses.some(
    (c) => c.code === form.courseCode && c.semester === form.semester
  )
    ? activeCourses
    : [
        ...courses.filter(
          (c) => c.code === form.courseCode && c.semester === form.semester
        ),
        ...activeCourses,
      ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return classes.filter((item) => {
      const course = courses.find(
        (c) => c.code === item.courseCode && c.semester === item.semester
      );

      const matchesSearch = [
        item.courseCode,
        course?.title,
        item.room,
        item.faculty,
        item.section,
      ].some((value) =>
        String(value || "").toLowerCase().includes(q)
      );

      return (
        matchesSearch &&
        (semesterFilter === "All" || item.semester === semesterFilter) &&
        (statusFilter === "All" || item.status === statusFilter) &&
        (viewMode !== "Day" || item.day === selectedDay)
      );
    });
  }, [
    classes,
    courses,
    query,
    semesterFilter,
    statusFilter,
    viewMode,
    selectedDay,
  ]);

  const ordered = useMemo(
    () => [...filtered].sort(
      (a, b) =>
        DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
        a.startTime.localeCompare(b.startTime)
    ),
    [filtered]
  );

  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = ordered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const scheduledCount = classes.filter(
    (item) => item.status === "Scheduled"
  ).length;

  const uniqueRooms = new Set(classes.map((item) => item.room)).size;
  const uniqueFaculty = new Set(classes.map((item) => item.faculty)).size;

  function persist(next, message) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setClasses(next);
      setFeedback(message);
      setError("");
      return true;
    } catch {
      setError("Unable to save timetable in browser storage.");
      return false;
    }
  }

  function openCreate() {
    const first = activeCourses[0];
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      courseCode: first?.code || "",
      semester: first?.semester || "",
      faculty: first?.faculty || "",
    });
    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      courseCode: item.courseCode,
      semester: item.semester,
      day: item.day,
      startTime: item.startTime,
      endTime: item.endTime,
      room: item.room,
      faculty: item.faculty,
      type: item.type,
      section: item.section,
      status: item.status,
    });
    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function changeCourse(value) {
    const course = courseOptions.find(
      (c) => `${c.code}::${c.semester}` === value
    );
    if (!course) return;
    setForm((prev) => ({
      ...prev,
      courseCode: course.code,
      semester: course.semester,
      faculty: course.faculty || prev.faculty,
    }));
    setError("");
  }

  function handleSave(event) {
    event.preventDefault();

    const clean = {
      ...form,
      room: form.room.trim().toUpperCase(),
      faculty: form.faculty.trim(),
      section: form.section.trim().toUpperCase(),
    };

    if (
      !clean.courseCode || !clean.semester || !clean.day ||
      !clean.startTime || !clean.endTime || !clean.room ||
      !clean.faculty || !clean.section
    ) {
      setError("Complete all required timetable fields.");
      return;
    }

    if (clean.startTime >= clean.endTime) {
      setError("End time must be later than start time.");
      return;
    }

    const validCourse = courses.some(
      (c) => c.code === clean.courseCode && c.semester === clean.semester
    );

    if (!validCourse) {
      setError("Select a valid course and semester.");
      return;
    }

    const conflict = classes.find((item) => {
      if (
        item.id === editingId ||
        item.semester !== clean.semester ||
        item.day !== clean.day ||
        item.status !== "Scheduled" ||
        clean.status !== "Scheduled" ||
        !overlap(
          clean.startTime, clean.endTime,
          item.startTime, item.endTime
        )
      ) return false;

      return (
        item.room.trim().toUpperCase() === clean.room ||
        item.faculty.trim().toLowerCase() === clean.faculty.toLowerCase() ||
        (
          item.courseCode === clean.courseCode &&
          item.section.trim().toUpperCase() === clean.section
        )
      );
    });

    if (conflict) {
      setError(
        `Schedule conflict: ${conflict.courseCode} on ${conflict.day}, ` +
        `${conflict.startTime}–${conflict.endTime}, room ${conflict.room}.`
      );
      return;
    }

    const next = editingId
      ? classes.map((item) =>
          item.id === editingId ? { ...item, ...clean } : item
        )
      : [{ id: makeId(), ...clean }, ...classes];

    if (persist(next, editingId
      ? "Class schedule updated."
      : "Class added to timetable."
    )) {
      setModalOpen(false);
      setEditingId(null);
      setPage(1);
    }
  }

  function deleteClass(item) {
    if (!window.confirm(
      `Delete ${item.courseCode} class on ${item.day}?`
    )) return;

    persist(
      classes.filter((entry) => entry.id !== item.id),
      "Class removed from timetable."
    );
  }

  function resetDemo() {
    if (!window.confirm(
      "Restore demo timetable? This replaces locally saved classes."
    )) return;

    if (persist(SAMPLE_CLASSES, "Demo timetable restored.")) {
      clearFilters();
    }
  }

  function clearFilters() {
    setQuery("");
    setSemesterFilter("All");
    setStatusFilter("All");
    setViewMode("Week");
    setSelectedDay("Saturday");
    setPage(1);
  }

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]";

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Academic Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            University Timetable
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Organize weekly classes, faculty schedules, and room allocations.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={!activeCourses.length}
          className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33] disabled:opacity-40"
        >
          <Plus size={18} />
          Add Class
        </button>
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Total Classes",
            value: classes.length,
            icon: CalendarDays,
          },
          {
            title: "Scheduled",
            value: scheduledCount,
            icon: CheckCircle2,
          },
          {
            title: "Rooms Assigned",
            value: uniqueRooms,
            icon: MapPin,
          },
          {
            title: "Faculty Assigned",
            value: uniqueFaculty,
            icon: UserRound,
          },
        ].map(({ title, value, icon: Icon }) => (
          <div
            key={title}
            className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{title}</p>
                <p className="mt-3 text-3xl font-bold text-[#234E43]">
                  {value}
                </p>
              </div>
              <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
                <Icon size={21} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* VIEW CONTROLS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              Schedule Overview
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Switch between weekly and daily schedules
            </p>
          </div>

          <div className="flex rounded-xl bg-[#F6F8F3] p-1">
            {[
              { value: "Week", icon: LayoutGrid },
              { value: "Day", icon: List },
            ].map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setViewMode(value);
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                  viewMode === value
                    ? "bg-[#234E43] text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <Icon size={16} />
                {value}
              </button>
            ))}
          </div>
        </div>

        {viewMode === "Day" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setSelectedDay(day);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  selectedDay === day
                    ? "bg-[#D9A536] text-[#234E43]"
                    : "bg-[#F6F8F3] text-slate-600"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search course, room, faculty..."
              aria-label="Search timetable"
              className={`${fieldClass} pl-10`}
            />
          </div>

          <select
            value={semesterFilter}
            onChange={(e) => {
              setSemesterFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter semester"
            className={fieldClass}
          >
            <option value="All">All Semesters</option>
            {semesters.map((semester) => (
              <option key={semester}>{semester}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter status"
            className={fieldClass}
          >
            <option value="All">All Statuses</option>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {filtered.length} matching classes
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              <RotateCcw size={15} />
              Clear Filters
            </button>

            <button
              type="button"
              onClick={() => exportCSV(ordered, courses)}
              className="flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              <Download size={15} />
              Export CSV
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

      {/* WEEKLY GRID */}
      {viewMode === "Week" && (
        <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#234E43]">
            Weekly Schedule
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {DAYS.map((day) => {
              const dayClasses = ordered.filter(
                (item) => item.day === day
              );

              return (
                <div
                  key={day}
                  className="min-h-36 rounded-xl border border-slate-100 bg-[#F6F8F3] p-3"
                >
                  <h3 className="border-b border-slate-200 pb-3 text-sm font-bold text-[#234E43]">
                    {day}
                  </h3>

                  <div className="mt-3 space-y-2">
                    {dayClasses.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setViewing(item)}
                        className={`w-full rounded-lg border-l-4 bg-white p-3 text-left shadow-sm ${
                          item.status === "Cancelled"
                            ? "border-rose-300 opacity-60"
                            : "border-[#D9A536]"
                        }`}
                      >
                        <p className="text-xs font-bold text-[#234E43]">
                          {item.courseCode}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {item.startTime}–{item.endTime}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {item.room} · Section {item.section}
                        </p>
                      </button>
                    ))}

                    {dayClasses.length === 0 && (
                      <p className="py-4 text-center text-xs text-slate-400">
                        No classes
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SCHEDULE TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-[#234E43]">
            {viewMode === "Day" ? `${selectedDay} Classes` : "Class Schedule"}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Course",
                  "Day",
                  "Time",
                  "Room",
                  "Faculty",
                  "Section",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-4 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visible.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="text-xs font-bold text-[#B18A28]">
                      {item.courseCode}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.type} · {item.semester}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {item.day}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {item.startTime} – {item.endTime}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {item.room}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {item.faculty}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {item.section}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        title="View class"
                        onClick={() => setViewing(item)}
                        className="rounded-lg bg-slate-100 p-2 text-[#234E43]"
                      >
                        <Eye size={17} />
                      </button>
                      <button
                        type="button"
                        title="Edit class"
                        onClick={() => openEdit(item)}
                        className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43]"
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        type="button"
                        title="Delete class"
                        onClick={() => deleteClass(item)}
                        className="rounded-lg bg-rose-50 p-2 text-rose-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visible.length === 0 && (
            <p className="py-14 text-center text-sm text-slate-500">
              No matching classes found.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {feedback && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          {feedback}
        </p>
      )}

      {error && !modalOpen && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </p>
      )}

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="timetable-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="timetable-form-title" className="text-xl font-bold text-[#234E43]">
                {editingId ? "Edit Class" : "Add Class"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  Course *
                </span>
                <select
                  value={`${form.courseCode}::${form.semester}`}
                  onChange={(e) => changeCourse(e.target.value)}
                  className={fieldClass}
                  required
                >
                  {courseOptions.map((course) => (
                    <option
                      key={`${course.code}::${course.semester}`}
                      value={`${course.code}::${course.semester}`}
                    >
                      {course.code} — {course.title} ({course.semester})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Day *</span>
                  <select
                    value={form.day}
                    onChange={(e) => setForm((prev) => ({ ...prev, day: e.target.value }))}
                    className={fieldClass}
                  >
                    {DAYS.map((day) => <option key={day}>{day}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Class Type</span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                    className={fieldClass}
                  >
                    {CLASS_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>

                {[
                  ["Start Time", "startTime", "time"],
                  ["End Time", "endTime", "time"],
                  ["Room", "room", "text"],
                  ["Faculty", "faculty", "text"],
                  ["Section", "section", "text"],
                ].map(([label, key, type]) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      {label} *
                    </span>
                    <input
                      type={type}
                      required
                      value={form[key]}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </label>
                ))}

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Status</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                    className={fieldClass}
                  >
                    {STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
              </div>

              {error && (
                <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
              >
                <Save size={18} />
                {editingId ? "Save Changes" : "Add Class"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* DETAILS MODAL */}
      {viewing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewing(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-details-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-[#B18A28]">CLASS DETAILS</p>
                <h2 id="class-details-title" className="mt-2 text-xl font-bold text-[#234E43]">
                  {viewing.courseCode}
                </h2>
              </div>
              <button type="button" onClick={() => setViewing(null)} aria-label="Close">
                <X size={21} />
              </button>
            </div>

            <div className="mt-4"><StatusBadge status={viewing.status} /></div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Semester", viewing.semester, CalendarRange],
                ["Day", viewing.day, CalendarDays],
                ["Time", `${viewing.startTime} – ${viewing.endTime}`, Clock3],
                ["Room", viewing.room, MapPin],
                ["Faculty", viewing.faculty, UserRound],
                ["Class Type", viewing.type, BookOpen],
                ["Section", viewing.section, LayoutGrid],
              ].map(([label, value, Icon]) => (
                <div key={label} className="rounded-xl bg-[#F6F8F3] p-3">
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Icon size={15} /> {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#234E43]">{value}</p>
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

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> Timetable records are stored locally
        in this browser. Room, instructor and same-course-section conflicts
        are checked within the same semester and day. Faculty schedules
        and examination rooms are not yet synchronized.
      </div>
    </div>
  );
}
