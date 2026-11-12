
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock3,
  MapPin,
  Filter,
  RotateCcw,
  Database,
  BookOpen,
  Building2,
  FileText,
  CalendarClock,
  ShieldCheck,
  Users,
  List,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const SCHEDULE_KEY =
  "unibee-exam-controller-schedule-v1";

const EXAMS_KEY =
  "unibee-exam-controller-exams-v1";

const STATUSES = [
  "Scheduled",
  "Ongoing",
  "Completed",
  "Postponed",
  "Cancelled",
];

const EXAM_MODES = [
  "Written",
  "Practical",
  "Viva Voce",
  "Online",
  "Other",
];

const EMPTY_FORM = {
  examId: "",
  examName: "",
  examCode: "",
  courseCode: "",
  courseTitle: "",
  department: "",
  program: "",
  semester: "",
  section: "",
  examDate: "",
  startTime: "",
  endTime: "",
  venue: "",
  room: "",
  examMode: "Written",
  status: "Scheduled",
  instructions: "",
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return text(value).toLowerCase();
}

function todayLocal() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value) {
  if (!value) return "Not specified";

  const raw = text(value);
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

function formatTime(value) {
  if (!value) return "Not set";

  const raw = text(value);

  if (!/^\d{2}:\d{2}/.test(raw)) {
    return raw;
  }

  const [hour, minute] = raw.split(":").map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return raw;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute)
    .padStart(2, "0")} ${period}`;
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `schedule-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function readCollection(key) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            !Array.isArray(item)
        )
      : [];
  } catch {
    return [];
  }
}

function makeScheduleCode() {
  return `SCH-${Date.now()
    .toString(36)
    .toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;
}

function isActiveBooking(item) {
  return !["cancelled", "postponed"].includes(
    norm(item.status)
  );
}

function getConflict(existing, candidate, editingId) {
  if (!isActiveBooking(candidate)) return null;

  return (
    existing.find((item) => {
      if (
        item.id === editingId ||
        !isActiveBooking(item)
      ) {
        return false;
      }

      if (item.examDate !== candidate.examDate) {
        return false;
      }

      const sameVenue =
        norm(item.venue) === norm(candidate.venue);

      const sameRoom =
        norm(item.room) === norm(candidate.room);

      if (!sameVenue || !sameRoom) {
        return false;
      }

      return (
        candidate.startTime < item.endTime &&
        candidate.endTime > item.startTime
      );
    }) || null
  );
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function StatusBadge({ status }) {
  const colors = {
    Scheduled: "bg-blue-50 text-blue-700",
    Ongoing: "bg-amber-50 text-amber-800",
    Completed: "bg-emerald-50 text-emerald-700",
    Postponed: "bg-orange-50 text-orange-700",
    Cancelled: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        colors[status] ||
        "bg-slate-100 text-slate-700"
      }`}
    >
      {status || "Not specified"}
    </span>
  );
}

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
          <p className="text-sm text-[#718579]">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-[#718579]">
        {subtitle}
      </p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  min,
  max,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#234E43]">
        {label}
        {required && (
          <span className="ml-1 text-rose-600">
            *
          </span>
        )}
      </span>

      <input
        type={type}
        required={required}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43]"
      />
    </label>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-b border-[#E2EADC] py-3 text-sm last:border-0">
      <span className="text-[#718579]">
        {label}
      </span>

      <span className="max-w-[65%] break-words text-right font-semibold text-[#234E43]">
        {value || "—"}
      </span>
    </div>
  );
}

// ========================================
// MAIN SCHEDULE PAGE
// ========================================

export default function ExamControllerSchedule() {
  const [schedules, setSchedules] = useState(
    () => readCollection(SCHEDULE_KEY)
  );

  const [exams, setExams] = useState(
    () => readCollection(EXAMS_KEY)
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");
  const [dateFilter, setDateFilter] =
    useState("");

  const [modalOpen, setModalOpen] =
    useState(false);
  const [editingId, setEditingId] =
    useState(null);

  const [viewing, setViewing] =
    useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
  });

  const [error, setError] = useState("");
  const [feedback, setFeedback] =
    useState("");

  const today = todayLocal();

  // ======================================
  // SYNCHRONIZE LOCAL DATA
  // ======================================

  function refreshRecords() {
    setSchedules(readCollection(SCHEDULE_KEY));
    setExams(readCollection(EXAMS_KEY));
  }

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        refreshRecords();
      }
    }

    window.addEventListener(
      "storage",
      refreshRecords
    );

    window.addEventListener(
      "focus",
      refreshRecords
    );

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.removeEventListener(
        "storage",
        refreshRecords
      );

      window.removeEventListener(
        "focus",
        refreshRecords
      );

      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  // ======================================
  // SUMMARY
  // ======================================

  const summary = useMemo(() => {
    return {
      total: schedules.length,

      upcoming: schedules.filter(
        (item) =>
          item.examDate >= today &&
          !["Cancelled", "Postponed"].includes(
            item.status
          )
      ).length,

      today: schedules.filter(
        (item) =>
          item.examDate === today &&
          isActiveBooking(item)
      ).length,

      completed: schedules.filter(
        (item) => item.status === "Completed"
      ).length,
    };
  }, [schedules, today]);

  const stats = [
    {
      title: "Total Exam Sessions",
      value: summary.total,
      subtitle: "All saved timetable records",
      icon: CalendarDays,
    },
    {
      title: "Upcoming Sessions",
      value: summary.upcoming,
      subtitle: "Today and future sessions",
      icon: CalendarClock,
    },
    {
      title: "Today's Sessions",
      value: summary.today,
      subtitle: "Non-cancelled sessions today",
      icon: Clock3,
    },
    {
      title: "Completed Sessions",
      value: summary.completed,
      subtitle: "Sessions marked completed",
      icon: CheckCircle2,
    },
  ];

  // ======================================
  // FILTER RECORDS
  // ======================================

  const filteredSchedules = useMemo(() => {
    const query = norm(search);

    return [...schedules]
      .filter((item) => {
        const matchesSearch = [
          item.examName,
          item.examCode,
          item.courseCode,
          item.courseTitle,
          item.department,
          item.program,
          item.semester,
          item.section,
          item.venue,
          item.room,
        ].some((value) =>
          norm(value).includes(query)
        );

        const matchesStatus =
          statusFilter === "All" ||
          item.status === statusFilter;

        const matchesDate =
          !dateFilter ||
          item.examDate === dateFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesDate
        );
      })
      .sort((a, b) => {
        const dateCompare = text(
          a.examDate
        ).localeCompare(text(b.examDate));

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return text(a.startTime).localeCompare(
          text(b.startTime)
        );
      });
  }, [
    schedules,
    search,
    statusFilter,
    dateFilter,
  ]);

  // ======================================
  // SAVE RECORDS
  // ======================================

  function persist(next) {
    try {
      localStorage.setItem(
        SCHEDULE_KEY,
        JSON.stringify(next)
      );

      setSchedules(next);
      setError("");

      return true;
    } catch {
      setError(
        "Unable to save the examination schedule in browser storage."
      );

      return false;
    }
  }

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // ======================================
  // LINK EXAMINATION
  // ======================================

  function selectExam(examId) {
    const selected = exams.find(
      (item) => item.id === examId
    );

    if (!selected) {
      setForm((previous) => ({
        ...previous,
        examId: "",
        examName: "",
        examCode: "",
        department: "",
        program: "",
        semester: "",
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      examId: selected.id,
      examName: selected.examName || "",
      examCode: selected.examCode || "",
      department: selected.department || "",
      program: selected.program || "",
      semester: selected.semester || "",
    }));
  }

  // ======================================
  // CREATE
  // ======================================

  function openCreate() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ======================================
  // EDIT
  // ======================================

  function openEdit(schedule) {
    setEditingId(schedule.id);

    setForm({
      examId: schedule.examId || "",
      examName: schedule.examName || "",
      examCode: schedule.examCode || "",
      courseCode: schedule.courseCode || "",
      courseTitle: schedule.courseTitle || "",
      department: schedule.department || "",
      program: schedule.program || "",
      semester: schedule.semester || "",
      section: schedule.section || "",
      examDate: schedule.examDate || "",
      startTime: schedule.startTime || "",
      endTime: schedule.endTime || "",
      venue: schedule.venue || "",
      room: schedule.room || "",
      examMode: schedule.examMode || "Written",
      status: schedule.status || "Scheduled",
      instructions: schedule.instructions || "",
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ======================================
  // SAVE EXAM SCHEDULE
  // ======================================

  function handleSave(event) {
    event.preventDefault();

    const selectedExam = exams.find(
      (item) => item.id === form.examId
    );

    if (!selectedExam) {
      setError(
        "Select an existing examination from Exam Management."
      );
      return;
    }

    if (
      !form.courseCode.trim() ||
      !form.courseTitle.trim() ||
      !form.examDate ||
      !form.startTime ||
      !form.endTime ||
      !form.venue.trim() ||
      !form.room.trim()
    ) {
      setError(
        "Course code, course title, date, start time, end time, venue, and room are required."
      );

      return;
    }

    if (form.endTime <= form.startTime) {
      setError(
        "Exam end time must be later than start time."
      );

      return;
    }

    if (
      selectedExam.startDate &&
      form.examDate < selectedExam.startDate
    ) {
      setError(
        "Exam session date cannot be earlier than the parent examination start date."
      );
      return;
    }

    if (
      selectedExam.endDate &&
      form.examDate > selectedExam.endDate
    ) {
      setError(
        "Exam session date cannot be later than the parent examination end date."
      );
      return;
    }

    if (
      norm(selectedExam.status) === "cancelled"
    ) {
      setError(
        "Cannot schedule a session for a cancelled examination."
      );
      return;
    }

    const values = {
      examId: selectedExam.id,
      examName: selectedExam.examName || "",
      examCode: selectedExam.examCode || "",
      courseCode: form.courseCode.trim(),
      courseTitle: form.courseTitle.trim(),
      department: selectedExam.department || "",
      program: selectedExam.program || "",
      semester: selectedExam.semester || "",
      section: form.section.trim(),
      examDate: form.examDate,
      startTime: form.startTime,
      endTime: form.endTime,
      venue: form.venue.trim(),
      room: form.room.trim(),
      examMode: form.examMode,
      status: form.status,
      instructions: form.instructions.trim(),
      updatedAt: new Date().toISOString(),
    };

    const conflict = getConflict(
      schedules,
      values,
      editingId
    );

    if (conflict) {
      setError(
        `Room conflict: ${conflict.courseCode || "Another course"} is already booked in ${conflict.venue}, room ${conflict.room}, on ${formatDate(conflict.examDate)} from ${formatTime(conflict.startTime)} to ${formatTime(conflict.endTime)}.`
      );

      return;
    }

    const duplicate = schedules.some(
      (item) =>
        item.id !== editingId &&
        item.examId === values.examId &&
        norm(item.courseCode) ===
          norm(values.courseCode) &&
        norm(item.section) ===
          norm(values.section) &&
        item.examDate === values.examDate &&
        item.startTime === values.startTime
    );

    if (duplicate) {
      setError(
        "A schedule record for this exam, course, section, date, and start time already exists."
      );
      return;
    }

    const wasEditing = editingId !== null;

    const next = wasEditing
      ? schedules.map((item) =>
          item.id === editingId
            ? { ...item, ...values }
            : item
        )
      : [
          {
            id: createId(),
            scheduleCode: makeScheduleCode(),
            ...values,
            createdAt: new Date().toISOString(),
          },
          ...schedules,
        ];

    if (persist(next)) {
      setModalOpen(false);
      setEditingId(null);

      setFeedback(
        wasEditing
          ? "Examination schedule updated successfully."
          : "Examination schedule created successfully."
      );
    }
  }

  // ======================================
  // DELETE RECORD
  // ======================================

  function deleteSchedule(schedule) {
    const confirmed = window.confirm(
      `Delete the schedule for "${schedule.courseTitle}"?\n\nThis will not automatically update admit cards, seat plans, or invigilation records.`
    );

    if (!confirmed) return;

    const next = schedules.filter(
      (item) => item.id !== schedule.id
    );

    if (persist(next)) {
      setFeedback(
        "Examination schedule deleted successfully."
      );
    }
  }

  // ======================================
  // CHANGE STATUS
  // ======================================

  function changeStatus(schedule, status) {
    if (
      !window.confirm(
        `Change this schedule status to "${status}"?`
      )
    ) {
      return;
    }

    const updated = {
      ...schedule,
      status,
      updatedAt: new Date().toISOString(),
    };

    const conflict = getConflict(
      schedules,
      updated,
      schedule.id
    );

    if (conflict) {
      setError(
        "This schedule cannot be activated because the room is already booked for an overlapping time."
      );
      return;
    }

    const next = schedules.map((item) =>
      item.id === schedule.id ? updated : item
    );

    if (persist(next)) {
      setFeedback(
        `Schedule status changed to ${status}.`
      );
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setDateFilter("");
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
            EXAMINATION OPERATIONS
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Exam Schedule
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Manage course-wise examination
            dates, time slots, venues, rooms,
            and timetable records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              refreshRecords();
              setError("");
              setFeedback(
                "Schedule records refreshed."
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] hover:bg-[#F1F7EF]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white hover:bg-[#193B33]"
          >
            <Plus size={18} />
            Add Exam Schedule
          </button>
        </div>
      </section>

      {/* FEEDBACK */}
      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </div>
      )}

      {error && !modalOpen && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border-[35px] border-white/5" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
            <ShieldCheck size={16} />
            EXAM CONTROLLER
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            Examination Timetable Management
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Coordinate examination sessions,
            organize course-wise schedules,
            and prevent overlapping bookings
            of examination venues and rooms.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white">
              {exams.length} registered examinations
            </span>

            <span className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white">
              {schedules.length} timetable records
            </span>
          </div>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
          />
        ))}
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={18}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Timetable
          </h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Course, exam, room, department..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter schedule status"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Statuses
            </option>

            {STATUSES.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(event.target.value)
            }
            aria-label="Filter schedule date"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#718579]">
            Showing {filteredSchedules.length} of{" "}
            {schedules.length} schedule records
          </p>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#234E43] hover:underline"
          >
            <RotateCcw size={15} />
            Reset Filters
          </button>
        </div>
      </section>

      {/* EXAMINATION SCHEDULE LIST */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Examination Timetable
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            Course-wise sessions arranged
            by examination date and start time
          </p>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-6 py-14 text-center">
            <Database
              size={36}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Exam Schedule Found
            </h3>

            <p className="mt-2 text-sm text-[#718579]">
              Create a schedule or adjust
              your search filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredSchedules.map((schedule) => (
              <article
                key={schedule.id}
                className="flex flex-col rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                {/* HEADER */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                      <BookOpen size={22} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#B18B37]">
                        {schedule.courseCode}
                      </p>

                      <h3 className="mt-1 break-words font-extrabold text-[#234E43]">
                        {schedule.courseTitle}
                      </h3>

                      <p className="mt-1 text-xs text-[#718579]">
                        {schedule.examName}
                      </p>
                    </div>
                  </div>

                  <StatusBadge
                    status={schedule.status}
                  />
                </div>

                {/* DATE / TIME */}
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#F6F8F3] p-4">
                    <p className="flex items-center gap-2 text-xs text-[#718579]">
                      <CalendarDays size={15} />
                      Exam Date
                    </p>

                    <p className="mt-2 text-sm font-extrabold text-[#234E43]">
                      {formatDate(schedule.examDate)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F6F8F3] p-4">
                    <p className="flex items-center gap-2 text-xs text-[#718579]">
                      <Clock3 size={15} />
                      Time Slot
                    </p>

                    <p className="mt-2 text-sm font-extrabold text-[#234E43]">
                      {formatTime(schedule.startTime)}
                      {" – "}
                      {formatTime(schedule.endTime)}
                    </p>
                  </div>
                </div>

                {/* ACADEMIC DETAILS */}
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Building2
                      size={17}
                      className="mt-0.5 shrink-0 text-[#8AA092]"
                    />

                    <div>
                      <p className="font-semibold text-[#234E43]">
                        {schedule.department || "Department not specified"}
                      </p>

                      <p className="text-xs text-[#718579]">
                        {schedule.program || "Program not specified"}
                        {" • "}
                        {schedule.semester || "Semester not specified"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin
                      size={17}
                      className="mt-0.5 shrink-0 text-[#8AA092]"
                    />

                    <div>
                      <p className="font-semibold text-[#234E43]">
                        {schedule.venue}
                      </p>

                      <p className="text-xs text-[#718579]">
                        Room: {schedule.room}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <List
                      size={17}
                      className="mt-0.5 shrink-0 text-[#8AA092]"
                    />

                    <div>
                      <p className="font-semibold text-[#234E43]">
                        {schedule.examMode || "Written"}
                      </p>

                      <p className="text-xs text-[#718579]">
                        Section: {schedule.section || "All"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="mt-auto flex flex-wrap gap-2 border-t border-[#E2EADC] pt-5">
                  <button
                    type="button"
                    onClick={() => setViewing(schedule)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <Eye size={15} />
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(schedule)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  {schedule.status === "Scheduled" && (
                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(schedule, "Ongoing")
                      }
                      className="rounded-lg border border-amber-200 px-3 py-2.5 text-xs font-bold text-amber-800"
                    >
                      Start
                    </button>
                  )}

                  {schedule.status === "Ongoing" && (
                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(schedule, "Completed")
                      }
                      className="rounded-lg border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700"
                    >
                      Complete
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteSchedule(schedule)}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-600"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  EXAM CONTROLLER
                </p>

                <h2
                  id="schedule-form-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {editingId
                    ? "Edit Exam Schedule"
                    : "Create Exam Schedule"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close form"
                className="rounded-lg bg-[#F6F8F3] p-2 text-[#234E43]"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="space-y-6"
            >
              {/* EXAMINATION */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <CalendarDays size={19} />
                  Examination Information
                </h3>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Select Examination
                    <span className="ml-1 text-rose-600">
                      *
                    </span>
                  </span>

                  <select
                    required
                    value={form.examId}
                    onChange={(event) =>
                      selectExam(event.target.value)
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
                  >
                    <option value="">
                      Choose an examination
                    </option>

                    {exams.map((exam) => (
                      <option
                        key={exam.id}
                        value={exam.id}
                      >
                        {exam.examName} — {exam.examCode}
                      </option>
                    ))}
                  </select>
                </label>

                {form.examId && (
                  <div className="mt-4 rounded-xl bg-[#F6F8F3] p-4 text-xs leading-6 text-[#718579]">
                    <p>
                      <strong>Department:</strong>{" "}
                      {form.department || "—"}
                    </p>

                    <p>
                      <strong>Program:</strong>{" "}
                      {form.program || "—"}
                    </p>

                    <p>
                      <strong>Semester:</strong>{" "}
                      {form.semester || "—"}
                    </p>
                  </div>
                )}

                {exams.length === 0 && (
                  <p className="mt-3 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                    Create an examination in Exam
                    Management before adding a
                    timetable entry.
                  </p>
                )}
              </div>

              {/* COURSE */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <BookOpen size={19} />
                  Course Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Course Code"
                    required
                    value={form.courseCode}
                    onChange={(value) =>
                      updateField("courseCode", value)
                    }
                    placeholder="e.g. CSE-301"
                  />

                  <FormField
                    label="Course Title"
                    required
                    value={form.courseTitle}
                    onChange={(value) =>
                      updateField("courseTitle", value)
                    }
                    placeholder="e.g. Database Management"
                  />

                  <div className="sm:col-span-2">
                    <FormField
                      label="Section"
                      value={form.section}
                      onChange={(value) =>
                        updateField("section", value)
                      }
                      placeholder="e.g. Section A"
                    />
                  </div>
                </div>
              </div>

              {/* SCHEDULE */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <Clock3 size={19} />
                  Date & Time
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FormField
                      label="Exam Date"
                      type="date"
                      required
                      value={form.examDate}
                      onChange={(value) =>
                        updateField("examDate", value)
                      }
                      min={
                        exams.find(
                          (exam) =>
                            exam.id === form.examId
                        )?.startDate || undefined
                      }
                      max={
                        exams.find(
                          (exam) =>
                            exam.id === form.examId
                        )?.endDate || undefined
                      }
                    />
                  </div>

                  <FormField
                    label="Start Time"
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(value) =>
                      updateField("startTime", value)
                    }
                  />

                  <FormField
                    label="End Time"
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(value) =>
                      updateField("endTime", value)
                    }
                  />
                </div>
              </div>

              {/* VENUE */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <MapPin size={19} />
                  Examination Venue
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Venue / Building"
                    required
                    value={form.venue}
                    onChange={(value) =>
                      updateField("venue", value)
                    }
                    placeholder="e.g. Academic Building"
                  />

                  <FormField
                    label="Room / Hall"
                    required
                    value={form.room}
                    onChange={(value) =>
                      updateField("room", value)
                    }
                    placeholder="e.g. Room 301"
                  />
                </div>
              </div>

              {/* MODE & STATUS */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Exam Mode
                  </span>

                  <select
                    value={form.examMode}
                    onChange={(event) =>
                      updateField(
                        "examMode",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
                  >
                    {EXAM_MODES.map((mode) => (
                      <option
                        key={mode}
                        value={mode}
                      >
                        {mode}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Schedule Status
                  </span>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField(
                        "status",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
                  >
                    {STATUSES.map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* INSTRUCTIONS */}
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Additional Instructions
                </span>

                <textarea
                  rows={4}
                  value={form.instructions}
                  onChange={(event) =>
                    updateField(
                      "instructions",
                      event.target.value
                    )
                  }
                  placeholder="Enter examination instructions..."
                  className="w-full resize-y rounded-xl border border-[#E2EADC] p-4 text-sm leading-6 outline-none focus:border-[#234E43]"
                />
              </label>

              {/* ERROR */}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-700"
                >
                  <AlertCircle
                    size={17}
                    className="mr-2 inline"
                  />
                  {error}
                </p>
              )}

              {/* SAVE */}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white hover:bg-[#193B33]"
              >
                <Save size={18} />

                {editingId
                  ? "Save Schedule Changes"
                  : "Create Exam Schedule"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setViewing(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-view-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  EXAMINATION TIMETABLE
                </p>

                <h2
                  id="schedule-view-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {viewing.courseTitle}
                </h2>

                <p className="mt-2 text-xs text-[#718579]">
                  {viewing.courseCode}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close details"
                className="rounded-lg bg-[#F6F8F3] p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5">
              <StatusBadge
                status={viewing.status}
              />
            </div>

            <div className="mt-6 rounded-xl bg-[#F6F8F3] px-5">
              {[
                ["Schedule Code", viewing.scheduleCode],
                ["Exam Name", viewing.examName],
                ["Exam Code", viewing.examCode],
                ["Course Code", viewing.courseCode],
                ["Course Title", viewing.courseTitle],
                ["Department", viewing.department],
                ["Program", viewing.program],
                ["Semester", viewing.semester],
                ["Section", viewing.section || "All"],
                ["Exam Date", formatDate(viewing.examDate)],
                ["Start Time", formatTime(viewing.startTime)],
                ["End Time", formatTime(viewing.endTime)],
                ["Venue", viewing.venue],
                ["Room", viewing.room],
                ["Mode", viewing.examMode],
                ["Status", viewing.status],
              ].map(([label, value]) => (
                <DetailRow
                  key={label}
                  label={label}
                  value={value}
                />
              ))}
            </div>

            {viewing.instructions && (
              <div className="mt-5 rounded-xl border border-[#E2EADC] p-4">
                <h3 className="text-sm font-bold text-[#234E43]">
                  Additional Instructions
                </h3>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#718579]">
                  {viewing.instructions}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setViewing(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 font-bold text-white"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      {/* INFORMATION */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <FileText
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Exam schedules
          are saved in browser localStorage. Room conflict
          detection checks matching venue, room, date,
          and overlapping time slots within this browser's
          saved schedule records. It does not yet verify
          student timetable clashes, invigilator availability,
          room capacity, or central university scheduling.
          Those checks will be added during system integration.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Exam Controller — Exam Schedule Management
      </p>
    </div>
  );
}
