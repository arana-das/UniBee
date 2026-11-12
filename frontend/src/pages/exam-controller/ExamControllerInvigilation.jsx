
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  X,
  Save,
  Printer,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CalendarDays,
  Clock3,
  MapPin,
  Database,
  FileText,
  RotateCcw,
  UserRoundCheck,
  ClipboardCheck,
  Building2,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const DUTY_KEY =
  "unibee-exam-controller-invigilation-v1";

const SCHEDULE_KEY =
  "unibee-exam-controller-schedule-v1";

const EXAMS_KEY =
  "unibee-exam-controller-exams-v1";

const INPUT =
  "w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43]";

const DUTY_ROLES = [
  "Chief Invigilator",
  "Invigilator",
  "Assistant Invigilator",
  "Reserve Invigilator",
];

const STATUSES = [
  "Assigned",
  "Confirmed",
  "Completed",
  "Absent",
  "Cancelled",
];

const EMPTY_FORM = {
  scheduleId: "",
  facultyId: "",
  facultyName: "",
  facultyDepartment: "",
  facultyEmail: "",
  dutyRole: "Invigilator",
  status: "Assigned",
  reportingTime: "",
  notes: "",
};

// ========================================
// HELPERS
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return text(value).toLowerCase();
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

function loadData() {
  return {
    duties: readCollection(DUTY_KEY),
    schedules: readCollection(SCHEDULE_KEY),
    exams: readCollection(EXAMS_KEY),
  };
}

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `duty-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function formatDate(value) {
  if (!value) return "Not specified";

  const raw = text(value);
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T12:00:00`
      : raw
  );

  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "Not set";

  const raw = text(value);
  if (!/^\d{2}:\d{2}/.test(raw)) return raw;

  const [hour, minute] = raw.split(":").map(Number);

  return `${hour % 12 || 12}:${String(minute).padStart(
    2,
    "0"
  )} ${hour >= 12 ? "PM" : "AM"}`;
}

function overlaps(a, b) {
  return (
    a.examDate === b.examDate &&
    a.startTime < b.endTime &&
    a.endTime > b.startTime
  );
}

function activeDuty(duty) {
  return duty.status !== "Cancelled";
}

function availableSchedule(schedule) {
  return (
    schedule &&
    !["cancelled", "postponed"].includes(
      norm(schedule.status)
    )
  );
}

function statusStyle(status) {
  const styles = {
    Assigned: "bg-blue-50 text-blue-700",
    Confirmed: "bg-emerald-50 text-emerald-700",
    Completed: "bg-teal-50 text-teal-700",
    Absent: "bg-rose-50 text-rose-700",
    Cancelled: "bg-slate-100 text-slate-600",
  };

  return (
    styles[status] || "bg-slate-100 text-slate-700"
  );
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyle(
        status
      )}`}
    >
      {status || "Assigned"}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }) {
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

function Field({
  label,
  children,
  required = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#234E43]">
        {label}
        {required && (
          <span className="ml-1 text-rose-600">*</span>
        )}
      </span>
      {children}
    </label>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2EADC] py-3 text-sm last:border-0">
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
// MAIN COMPONENT
// ========================================

export default function ExamControllerInvigilation() {
  const [data, setData] = useState(loadData);

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

  const [printOpen, setPrintOpen] =
    useState(false);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
  });

  const [error, setError] = useState("");
  const [feedback, setFeedback] =
    useState("");

  const { duties, schedules, exams } = data;

  // ======================================
  // REFRESH DATA
  // ======================================

  function refresh() {
    setData(loadData());
  }

  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);

    document.addEventListener(
      "visibilitychange",
      handleVisible
    );

    return () => {
      window.removeEventListener(
        "storage",
        refresh
      );

      window.removeEventListener(
        "focus",
        refresh
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisible
      );
    };
  }, []);

  // ======================================
  // SCHEDULE OPTIONS
  // ======================================

  const availableSchedules = useMemo(
    () =>
      schedules.filter((schedule) => {
        if (!availableSchedule(schedule)) {
          return false;
        }

        const exam = exams.find(
          (item) => item.id === schedule.examId
        );

        return (
          exam &&
          norm(exam.status) !== "cancelled"
        );
      }),
    [schedules, exams]
  );

  const selectedSchedule =
    availableSchedules.find(
      (item) => item.id === form.scheduleId
    ) || null;

  // ======================================
  // STATISTICS
  // ======================================

  const summary = useMemo(
    () => ({
      total: duties.length,
      assigned: duties.filter(
        (item) => item.status === "Assigned"
      ).length,
      confirmed: duties.filter(
        (item) => item.status === "Confirmed"
      ).length,
      completed: duties.filter(
        (item) => item.status === "Completed"
      ).length,
      uniqueFaculty: new Set(
        duties
          .filter(activeDuty)
          .map((item) => norm(item.facultyId))
      ).size,
    }),
    [duties]
  );

  const stats = [
    {
      title: "Total Duty Records",
      value: summary.total,
      subtitle: "All saved invigilation assignments",
      icon: ClipboardCheck,
    },
    {
      title: "Assigned Duties",
      value: summary.assigned,
      subtitle: "Awaiting faculty confirmation",
      icon: Clock3,
    },
    {
      title: "Confirmed Duties",
      value: summary.confirmed,
      subtitle: "Faculty assignments confirmed",
      icon: UserRoundCheck,
    },
    {
      title: "Completed Duties",
      value: summary.completed,
      subtitle: `${summary.uniqueFaculty} faculty members in active records`,
      icon: CheckCircle2,
    },
  ];

  // ======================================
  // FILTERED RECORDS
  // ======================================

  const filteredDuties = useMemo(() => {
    const query = norm(search);

    return [...duties]
      .filter((item) => {
        const matchesSearch = [
          item.facultyName,
          item.facultyId,
          item.facultyDepartment,
          item.examName,
          item.courseCode,
          item.courseTitle,
          item.venue,
          item.room,
          item.dutyRole,
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
      .sort(
        (a, b) =>
          text(a.examDate).localeCompare(
            text(b.examDate)
          ) ||
          text(a.startTime).localeCompare(
            text(b.startTime)
          ) ||
          text(a.facultyName).localeCompare(
            text(b.facultyName)
          )
      );
  }, [duties, search, statusFilter, dateFilter]);

  // ======================================
  // LOCAL STORAGE SAVE
  // ======================================

  function persist(next) {
    try {
      localStorage.setItem(
        DUTY_KEY,
        JSON.stringify(next)
      );

      setData((previous) => ({
        ...previous,
        duties: next,
      }));

      setError("");
      return true;
    } catch {
      setError(
        "Unable to save invigilation records in browser storage."
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
  // CREATE / EDIT
  // ======================================

  function openCreate() {
    refresh();
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(record) {
    refresh();
    setEditingId(record.id);

    setForm({
      scheduleId: record.scheduleId || "",
      facultyId: record.facultyId || "",
      facultyName: record.facultyName || "",
      facultyDepartment:
        record.facultyDepartment || "",
      facultyEmail: record.facultyEmail || "",
      dutyRole:
        record.dutyRole || "Invigilator",
      status: record.status || "Assigned",
      reportingTime: record.reportingTime || "",
      notes: record.notes || "",
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ======================================
  // VALIDATE AND SAVE
  // ======================================

  function handleSave(event) {
    event.preventDefault();

    const session = availableSchedules.find(
      (item) => item.id === form.scheduleId
    );

    if (!session) {
      setError(
        "Select an active examination session."
      );
      return;
    }

    if (
      !text(form.facultyId) ||
      !text(form.facultyName) ||
      !text(form.facultyDepartment)
    ) {
      setError(
        "Faculty ID, faculty name, and department are required."
      );
      return;
    }

    if (
      form.reportingTime &&
      form.reportingTime > session.startTime
    ) {
      setError(
        "Reporting time cannot be later than examination start time."
      );
      return;
    }

    const exam = exams.find(
      (item) => item.id === session.examId
    );

    const now = new Date().toISOString();

    const candidate = {
      scheduleId: session.id,
      examId: session.examId,
      examName: exam?.examName || session.examName || "",
      examCode: exam?.examCode || session.examCode || "",
      courseCode: session.courseCode || "",
      courseTitle: session.courseTitle || "",
      examDate: session.examDate,
      startTime: session.startTime,
      endTime: session.endTime,
      venue: session.venue || "",
      room: session.room || "",
      facultyId: text(form.facultyId),
      facultyName: text(form.facultyName),
      facultyDepartment:
        text(form.facultyDepartment),
      facultyEmail: text(form.facultyEmail),
      dutyRole: form.dutyRole,
      reportingTime: form.reportingTime,
      status: form.status,
      notes: text(form.notes),
      updatedAt: now,
    };

    if (candidate.status !== "Cancelled") {
      const otherDuties = duties.filter(
        (item) =>
          item.id !== editingId &&
          activeDuty(item)
      );

      const duplicate = otherDuties.some(
        (item) =>
          item.scheduleId === candidate.scheduleId &&
          norm(item.facultyId) ===
            norm(candidate.facultyId)
      );

      if (duplicate) {
        setError(
          "This faculty member is already assigned to the selected examination session."
        );
        return;
      }

      const conflict = otherDuties.find(
        (item) =>
          norm(item.facultyId) ===
            norm(candidate.facultyId) &&
          overlaps(item, candidate)
      );

      if (conflict) {
        setError(
          `Duty conflict: ${candidate.facultyName} is already assigned on ${formatDate(
            conflict.examDate
          )} from ${formatTime(
            conflict.startTime
          )} to ${formatTime(
            conflict.endTime
          )}, in ${conflict.venue} / ${conflict.room}.`
        );
        return;
      }
    }

    const wasEditing = editingId !== null;

    const next = wasEditing
      ? duties.map((item) =>
          item.id === editingId
            ? { ...item, ...candidate }
            : item
        )
      : [
          {
            id: makeId(),
            ...candidate,
            createdAt: now,
          },
          ...duties,
        ];

    if (persist(next)) {
      setModalOpen(false);
      setEditingId(null);

      setFeedback(
        wasEditing
          ? "Invigilation duty updated successfully."
          : "Invigilation duty assigned successfully."
      );
    }
  }

  // ======================================
  // STATUS MANAGEMENT
  // ======================================

  function changeStatus(record, status) {
    if (
      !window.confirm(
        `Change ${record.facultyName}'s duty status to "${status}"?`
      )
    ) {
      return;
    }

    if (status !== "Cancelled") {
      const session = availableSchedules.find(
        (item) => item.id === record.scheduleId
      );

      if (!session) {
        setError(
          "The related examination session is missing or inactive."
        );
        return;
      }

      const conflicting = duties.find(
        (item) =>
          item.id !== record.id &&
          activeDuty(item) &&
          norm(item.facultyId) ===
            norm(record.facultyId) &&
          overlaps(item, record)
      );

      if (conflicting) {
        setError(
          "Cannot activate this duty because the faculty member has an overlapping assignment."
        );
        return;
      }
    }

    const next = duties.map((item) =>
      item.id === record.id
        ? {
            ...item,
            status,
            updatedAt: new Date().toISOString(),
          }
        : item
    );

    if (persist(next)) {
      setFeedback(
        `Duty status changed to ${status}.`
      );
      setViewing(null);
    }
  }

  // ======================================
  // DELETE ASSIGNMENT
  // ======================================

  function deleteDuty(record) {
    if (
      !window.confirm(
        `Delete the invigilation assignment for ${record.facultyName}?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    const next = duties.filter(
      (item) => item.id !== record.id
    );

    if (persist(next)) {
      setViewing(null);
      setFeedback(
        "Invigilation assignment deleted successfully."
      );
    }
  }

  // ======================================
  // PRINT LIST
  // ======================================

  function printList() {
    setPrintOpen(true);
  }

  useEffect(() => {
    if (!printOpen) return;

    function closePrint() {
      setPrintOpen(false);
    }

    window.addEventListener(
      "afterprint",
      closePrint
    );

    const timer = setTimeout(() => {
      window.print();
    }, 200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(
        "afterprint",
        closePrint
      );
    };
  }, [printOpen]);

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7">
      {/* PRINT STYLES */}
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            body * {
              visibility: hidden !important;
            }

            #unibee-duty-print,
            #unibee-duty-print * {
              visibility: visible !important;
            }

            #unibee-duty-print {
              display: block !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              max-width: none !important;
              overflow: visible !important;
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
            }

            #unibee-duty-print * {
              color: black !important;
              box-shadow: none !important;
            }

            #unibee-duty-print table {
              width: 100%;
              border-collapse: collapse;
            }

            #unibee-duty-print th,
            #unibee-duty-print td {
              border: 1px solid #888;
              padding: 8px;
              text-align: left;
            }

            #unibee-duty-print tr {
              break-inside: avoid;
            }
          }
        `}
      </style>

      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            EXAMINATION OPERATIONS
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Invigilation Management
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Assign faculty examination duties,
            manage invigilators, and prevent
            overlapping duty schedules.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              refresh();
              setError("");
              setFeedback(
                "Invigilation records refreshed."
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={printList}
            disabled={filteredDuties.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
          >
            <Printer size={17} />
            Print Duty List
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white hover:bg-[#193B33]"
          >
            <Plus size={18} />
            Assign Invigilator
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
            Examination Invigilation Center
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Coordinate faculty examination duties,
            assign invigilators to scheduled
            sessions, and track assignment status.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold">
              {availableSchedules.length} available sessions
            </span>

            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold">
              {summary.uniqueFaculty} assigned faculty
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
          <Filter size={18} />
          <h2 className="font-bold text-[#234E43]">
            Search & Filter Invigilation
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
              placeholder="Faculty, course, room..."
              className={`${INPUT} pl-10`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter duty status"
            className={INPUT}
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
            aria-label="Filter examination date"
            className={INPUT}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#718579]">
            Showing {filteredDuties.length} of{" "}
            {duties.length} assignments
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("All");
              setDateFilter("");
            }}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#234E43]"
          >
            <RotateCcw size={15} />
            Reset Filters
          </button>
        </div>
      </section>

      {/* ASSIGNMENT LIST */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-[#234E43]">
          Faculty Duty Assignments
        </h2>

        {filteredDuties.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-6 py-14 text-center">
            <Database
              size={36}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Invigilation Records Found
            </h3>

            <p className="mt-2 text-sm text-[#718579]">
              Assign a faculty invigilator or
              adjust your filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredDuties.map((duty) => (
              <article
                key={duty.id}
                className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                      <Users size={22} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words font-extrabold text-[#234E43]">
                        {duty.facultyName}
                      </h3>

                      <p className="mt-1 text-xs text-[#718579]">
                        Faculty ID: {duty.facultyId}
                      </p>

                      <p className="mt-1 text-xs font-bold text-[#B18B37]">
                        {duty.dutyRole}
                      </p>
                    </div>
                  </div>

                  <StatusBadge
                    status={duty.status}
                  />
                </div>

                <div className="mt-5 rounded-xl bg-[#F6F8F3] p-4">
                  <p className="text-sm font-extrabold text-[#234E43]">
                    {duty.courseCode} — {duty.courseTitle}
                  </p>

                  <p className="mt-1 text-xs text-[#718579]">
                    {duty.examName}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-xs text-[#234E43]">
                      <CalendarDays size={16} />
                      {formatDate(duty.examDate)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#234E43]">
                      <Clock3 size={16} />
                      {formatTime(duty.startTime)}
                      {" – "}
                      {formatTime(duty.endTime)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#234E43]">
                      <MapPin size={16} />
                      {duty.venue}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#234E43]">
                      <Building2 size={16} />
                      Room {duty.room}
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-[#718579]">
                  Reporting Time:{" "}
                  <strong className="text-[#234E43]">
                    {formatTime(duty.reportingTime)}
                  </strong>
                </p>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E2EADC] pt-4">
                  <button
                    type="button"
                    onClick={() => setViewing(duty)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <Eye size={15} />
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(duty)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  {duty.status === "Assigned" && (
                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(duty, "Confirmed")
                      }
                      className="rounded-lg border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700"
                    >
                      Confirm
                    </button>
                  )}

                  {duty.status === "Confirmed" && (
                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(duty, "Completed")
                      }
                      className="rounded-lg border border-teal-200 px-3 py-2.5 text-xs font-bold text-teal-700"
                    >
                      Complete
                    </button>
                  )}

                  {["Assigned", "Confirmed"].includes(
                    duty.status
                  ) && (
                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(duty, "Cancelled")
                      }
                      className="rounded-lg border border-amber-200 px-3 py-2.5 text-xs font-bold text-amber-800"
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteDuty(duty)}
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
            aria-labelledby="duty-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wider text-[#B18B37]">
                  EXAM CONTROLLER
                </p>

                <h2
                  id="duty-form-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {editingId !== null
                    ? "Edit Invigilation Duty"
                    : "Assign Faculty Invigilator"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close form"
                className="rounded-lg bg-[#F6F8F3] p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="space-y-5"
            >
              {/* EXAM SESSION */}
              <Field
                label="Examination Session"
                required
              >
                <select
                  required
                  value={form.scheduleId}
                  onChange={(event) =>
                    updateField(
                      "scheduleId",
                      event.target.value
                    )
                  }
                  className={INPUT}
                >
                  <option value="">
                    Select examination session
                  </option>

                  {availableSchedules.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.courseCode}
                      {" — "}
                      {formatDate(item.examDate)}
                      {" — "}
                      {formatTime(item.startTime)}
                      {" — "}
                      {item.room}
                    </option>
                  ))}
                </select>
              </Field>

              {availableSchedules.length === 0 && (
                <p className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                  Create an active examination
                  schedule before assigning
                  faculty invigilators.
                </p>
              )}

              {selectedSchedule && (
                <div className="grid gap-3 rounded-xl bg-[#F6F8F3] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-[#718579]">
                      Course
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#234E43]">
                      {selectedSchedule.courseTitle}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Date
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#234E43]">
                      {formatDate(selectedSchedule.examDate)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Time
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#234E43]">
                      {formatTime(selectedSchedule.startTime)}
                      {" – "}
                      {formatTime(selectedSchedule.endTime)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Location
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#234E43]">
                      {selectedSchedule.venue}
                      {" / "}
                      {selectedSchedule.room}
                    </p>
                  </div>
                </div>
              )}

              {/* FACULTY INFORMATION */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Faculty ID" required>
                  <input
                    required
                    maxLength={60}
                    value={form.facultyId}
                    onChange={(event) =>
                      updateField(
                        "facultyId",
                        event.target.value
                      )
                    }
                    placeholder="e.g. FAC-102"
                    className={INPUT}
                  />
                </Field>

                <Field label="Faculty Name" required>
                  <input
                    required
                    value={form.facultyName}
                    onChange={(event) =>
                      updateField(
                        "facultyName",
                        event.target.value
                      )
                    }
                    placeholder="Full faculty name"
                    className={INPUT}
                  />
                </Field>

                <Field label="Faculty Department" required>
                  <input
                    required
                    value={form.facultyDepartment}
                    onChange={(event) =>
                      updateField(
                        "facultyDepartment",
                        event.target.value
                      )
                    }
                    placeholder="e.g. CSE"
                    className={INPUT}
                  />
                </Field>

                <Field label="Faculty Email">
                  <input
                    type="email"
                    value={form.facultyEmail}
                    onChange={(event) =>
                      updateField(
                        "facultyEmail",
                        event.target.value
                      )
                    }
                    placeholder="faculty@university.edu"
                    className={INPUT}
                  />
                </Field>
              </div>

              {/* DUTY SETTINGS */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Duty Role">
                  <select
                    value={form.dutyRole}
                    onChange={(event) =>
                      updateField(
                        "dutyRole",
                        event.target.value
                      )
                    }
                    className={INPUT}
                  >
                    {DUTY_ROLES.map((role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {role}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Duty Status">
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField(
                        "status",
                        event.target.value
                      )
                    }
                    className={INPUT}
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
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Reporting Time">
                    <input
                      type="time"
                      value={form.reportingTime}
                      onChange={(event) =>
                        updateField(
                          "reportingTime",
                          event.target.value
                        )
                      }
                      className={INPUT}
                    />
                  </Field>
                </div>
              </div>

              <Field label="Administrative Notes">
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) =>
                    updateField(
                      "notes",
                      event.target.value
                    )
                  }
                  placeholder="Enter additional duty instructions..."
                  className={`${INPUT} resize-y`}
                />
              </Field>

              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
                >
                  <AlertCircle
                    size={18}
                    className="shrink-0"
                  />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!selectedSchedule}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save size={18} />
                {editingId !== null
                  ? "Save Duty Changes"
                  : "Assign Invigilator"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
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
            aria-labelledby="duty-view-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wider text-[#B18B37]">
                  INVIGILATION DUTY RECORD
                </p>

                <h2
                  id="duty-view-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {viewing.facultyName}
                </h2>

                <p className="mt-1 text-xs text-[#718579]">
                  {viewing.facultyId}
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
              <StatusBadge status={viewing.status} />
            </div>

            <div className="mt-5 rounded-xl bg-[#F6F8F3] px-5">
              {[
                ["Faculty Name", viewing.facultyName],
                ["Faculty ID", viewing.facultyId],
                ["Department", viewing.facultyDepartment],
                ["Email", viewing.facultyEmail],
                ["Duty Role", viewing.dutyRole],
                ["Examination", viewing.examName],
                ["Course", viewing.courseTitle],
                ["Course Code", viewing.courseCode],
                ["Exam Date", formatDate(viewing.examDate)],
                ["Start Time", formatTime(viewing.startTime)],
                ["End Time", formatTime(viewing.endTime)],
                [
                  "Reporting Time",
                  formatTime(viewing.reportingTime),
                ],
                ["Venue", viewing.venue],
                ["Room", viewing.room],
                ["Status", viewing.status],
              ].map(([label, value]) => (
                <DetailRow
                  key={label}
                  label={label}
                  value={value}
                />
              ))}
            </div>

            {viewing.notes && (
              <p className="mt-5 whitespace-pre-wrap rounded-xl border border-[#E2EADC] p-4 text-sm leading-6 text-[#718579]">
                {viewing.notes}
              </p>
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

      {/* PRINT PREVIEW */}
      {printOpen && (
        <div
          id="unibee-duty-print"
          className="fixed inset-0 z-[110] overflow-y-auto bg-white p-6 text-[#234E43] print:static print:overflow-visible print:p-0"
        >
          <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
            <h2 className="font-extrabold">
              Invigilation Duty List Preview
            </h2>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-[#234E43] px-4 py-2 text-xs font-bold text-white"
              >
                Print
              </button>

              <button
                type="button"
                onClick={() => setPrintOpen(false)}
                aria-label="Close print preview"
                className="rounded-lg border border-[#E2EADC] p-2"
              >
                <X size={19} />
              </button>
            </div>
          </div>

          <div className="border-b-2 border-[#234E43] pb-5 text-center">
            <h1 className="text-2xl font-black">
              UniBee
            </h1>

            <p className="mt-1 text-sm font-semibold">
              Examination Administration
            </p>

            <h2 className="mt-4 text-lg font-black uppercase">
              Examination Invigilation Duty List
            </h2>

            <p className="mt-2 text-xs">
              Prototype — Not an Official University Document
            </p>
          </div>

          <div className="my-5 text-xs">
            Total Assignments: {filteredDuties.length}
          </div>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#F6F8F3]">
                {[
                  "SL",
                  "Faculty",
                  "Faculty ID",
                  "Course",
                  "Date",
                  "Time",
                  "Venue / Room",
                  "Duty Role",
                  "Status",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="border border-[#CBD9CD] p-2 text-left"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredDuties.map((duty, index) => (
                <tr key={duty.id}>
                  <td className="border border-[#CBD9CD] p-2">
                    {index + 1}
                  </td>

                  <td className="border border-[#CBD9CD] p-2">
                    {duty.facultyName}
                  </td>

                  <td className="border border-[#CBD9CD] p-2">
                    {duty.facultyId}
                  </td>

                  <td className="border border-[#CBD9CD] p-2">
                    {duty.courseCode}
                  </td>

                  <td className="border border-[#CBD9CD] p-2">
                    {formatDate(duty.examDate)}
                  </td>

                  <td className="border border-[#CBD9CD] p-2">
                    {formatTime(duty.startTime)}
                    {" – "}
                    {formatTime(duty.endTime)}
                  </td>

                  <td className="border border-[#CBD9CD] p-2">
                    {duty.venue} / {duty.room}
                  </td>

                  <td className="border border-[#CBD9CD] p-2">
                    {duty.dutyRole}
                  </td>

                  <td className="border border-[#CBD9CD] p-2">
                    {duty.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-14 grid grid-cols-2 gap-12 text-center text-xs">
            <div className="border-t border-[#234E43] pt-2">
              Duty Coordinator Signature
            </div>

            <div className="border-t border-[#234E43] pt-2">
              Exam Controller Signature
            </div>
          </div>
        </div>
      )}

      {/* INFORMATION */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <FileText
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Prototype:</strong> Invigilation
          assignments are stored in browser localStorage.
          Faculty information is entered manually.
          Assignment conflicts are checked against
          saved duties in this browser. The system
          does not yet verify faculty employment,
          institutional availability, minimum staffing
          requirements, or official authorization.
          Cross-portal synchronization will be added
          during backend integration.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Exam Controller — Invigilation Management
      </p>
    </div>
  );
}
