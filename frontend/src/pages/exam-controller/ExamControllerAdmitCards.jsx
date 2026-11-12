
import { useEffect, useMemo, useState } from "react";
import {
  IdCard,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Printer,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  CalendarDays,
  Clock3,
  MapPin,
  BookOpen,
  Database,
  FileText,
  RotateCcw,
  Send,
  Ban,
  Users,
  ClipboardCheck,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const CARD_KEY =
  "unibee-exam-controller-admit-cards-v1";

const EXAM_KEY =
  "unibee-exam-controller-exams-v1";

const SCHEDULE_KEY =
  "unibee-exam-controller-schedule-v1";

const REGISTRATION_KEY =
  "unibee-exam-controller-registration-v1";

const STATUSES = ["Draft", "Issued", "Revoked"];

const BASE_INPUT =
  "w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43]";

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

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item)
    );
  } catch {
    return [];
  }
}

function loadData() {
  return {
    cards: readCollection(CARD_KEY),
    exams: readCollection(EXAM_KEY),
    schedules: readCollection(SCHEDULE_KEY),
    registrations: readCollection(REGISTRATION_KEY),
  };
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `card-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createCardNumber() {
  return `UB-AC-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
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
  if (!value) return "Not specified";

  const raw = text(value);

  if (!/^\d{2}:\d{2}$/.test(raw)) return raw;

  const [hours, minutes] = raw.split(":").map(Number);

  return `${hours % 12 || 12}:${String(minutes).padStart(
    2,
    "0"
  )} ${hours >= 12 ? "PM" : "AM"}`;
}

function statusColor(status) {
  switch (status) {
    case "Issued":
      return "bg-emerald-50 text-emerald-700";
    case "Revoked":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

// ========================================
// MATCH REGISTRATION TO SCHEDULE
// ========================================

function matchingSchedules(registration, schedules) {
  return schedules
    .filter(
      (schedule) =>
        schedule.examId === registration.examId &&
        norm(schedule.courseCode) ===
          norm(registration.courseCode) &&
        (
          !text(schedule.section) ||
          norm(schedule.section) ===
            norm(registration.section)
        ) &&
        !["cancelled", "postponed"].includes(
          norm(schedule.status)
        )
    )
    .sort(
      (a, b) =>
        text(a.examDate).localeCompare(text(b.examDate)) ||
        text(a.startTime).localeCompare(text(b.startTime))
    );
}

function getEligibility(registration, exams, schedules) {
  if (!registration) {
    return {
      valid: false,
      reason: "Select a student registration.",
      sessions: [],
    };
  }

  if (registration.status !== "Approved") {
    return {
      valid: false,
      reason: "The registration must be approved.",
      sessions: [],
    };
  }

  if (registration.eligibilityStatus !== "Eligible") {
    return {
      valid: false,
      reason: "Student eligibility must be marked Eligible.",
      sessions: [],
    };
  }

  const exam = exams.find(
    (item) => item.id === registration.examId
  );

  if (!exam || norm(exam.status) === "cancelled") {
    return {
      valid: false,
      reason: "The examination is missing or cancelled.",
      sessions: [],
    };
  }

  const sessions = matchingSchedules(
    registration,
    schedules
  );

  if (sessions.length === 0) {
    return {
      valid: false,
      reason:
        "No matching active examination schedule exists for this course and section.",
      sessions: [],
    };
  }

  return {
    valid: true,
    reason: "",
    sessions,
    exam,
  };
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusColor(
        status
      )}`}
    >
      {status || "Draft"}
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

function Detail({ label, value }) {
  return (
    <div className="border-b border-[#E2EADC] py-3 last:border-0">
      <p className="text-xs text-[#718579]">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-[#234E43]">
        {value || "—"}
      </p>
    </div>
  );
}

// ========================================
// PRINTABLE ADMIT CARD
// ========================================

function AdmitCardDocument({ card }) {
  return (
    <div className="print-document bg-white p-6 text-[#234E43] md:p-8">
      <div className="border-b-2 border-[#234E43] pb-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#234E43] text-xl font-black text-[#D9A536] print:border print:border-black print:bg-white print:text-black">
          UB
        </div>

        <h2 className="mt-3 text-2xl font-black">
          UniBee
        </h2>

        <p className="mt-1 text-sm font-bold">
          Examination Administration
        </p>

        <h3 className="mt-4 text-lg font-black uppercase tracking-wider">
          Examination Admit Card
        </h3>

        <p className="mt-2 text-xs">
          Card No: {card.cardNumber}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={card.status} />

        <span className="text-xs font-semibold">
          Generated: {formatDate(card.createdAt)}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-1">
        <Detail
          label="Student Name"
          value={card.studentName}
        />
        <Detail
          label="Student ID"
          value={card.studentId}
        />
        <Detail
          label="Department"
          value={card.department}
        />
        <Detail
          label="Program"
          value={card.program}
        />
        <Detail
          label="Semester"
          value={card.semester}
        />
        <Detail
          label="Academic Session"
          value={card.academicSession}
        />
      </div>

      <div className="mt-7 rounded-xl border border-[#E2EADC] p-5">
        <h4 className="border-b border-[#E2EADC] pb-3 text-base font-black">
          Examination Details
        </h4>

        <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1">
          <Detail
            label="Examination"
            value={card.examName}
          />
          <Detail
            label="Exam Code"
            value={card.examCode}
          />
          <Detail
            label="Course"
            value={card.courseTitle}
          />
          <Detail
            label="Course Code"
            value={card.courseCode}
          />
          <Detail
            label="Section"
            value={card.section || "All"}
          />
          <Detail
            label="Exam Date"
            value={formatDate(card.examDate)}
          />
          <Detail
            label="Start Time"
            value={formatTime(card.startTime)}
          />
          <Detail
            label="End Time"
            value={formatTime(card.endTime)}
          />
          <Detail
            label="Venue"
            value={card.venue}
          />
          <Detail
            label="Room"
            value={card.room}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-[#F6F8F3] p-4 text-xs leading-6 print:border print:border-gray-300 print:bg-white">
        <p className="font-black">
          Examination Instructions
        </p>

        <p className="mt-2">
          Bring an officially verified admit card and
          any identification required by the institution.
          Follow the examination rules and instructions
          communicated by the university.
        </p>

        {card.instructions && (
          <p className="mt-2 whitespace-pre-wrap">
            {card.instructions}
          </p>
        )}
      </div>

      <div className="mt-12 grid grid-cols-2 gap-10 text-center text-xs font-semibold">
        <div className="border-t border-[#234E43] pt-2">
          Student Signature
        </div>

        <div className="border-t border-[#234E43] pt-2">
          Authorized Signature
        </div>
      </div>

      <p className="mt-8 text-center text-[11px] leading-5 text-[#718579]">
        Prototype document generated by UniBee.
        Institutional verification and authorization
        are required before official use.
      </p>
    </div>
  );
}

// ========================================
// MAIN PAGE
// ========================================

export default function ExamControllerAdmitCards() {
  const [data, setData] = useState(loadData);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [createOpen, setCreateOpen] =
    useState(false);

  const [selectedRegistrationId, setSelectedRegistrationId] =
    useState("");

  const [selectedScheduleId, setSelectedScheduleId] =
    useState("");

  const [viewing, setViewing] =
    useState(null);

  const [error, setError] = useState("");
  const [feedback, setFeedback] =
    useState("");

  const {
    cards,
    exams,
    schedules,
    registrations,
  } = data;

  // ======================================
  // DATA REFRESH
  // ======================================

  function refresh() {
    setData(loadData());
  }

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);

      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  // ======================================
  // STATISTICS
  // ======================================

  const summary = useMemo(
    () => ({
      total: cards.length,
      issued: cards.filter(
        (item) => item.status === "Issued"
      ).length,
      draft: cards.filter(
        (item) => item.status === "Draft"
      ).length,
      revoked: cards.filter(
        (item) => item.status === "Revoked"
      ).length,
    }),
    [cards]
  );

  const stats = [
    {
      title: "Total Admit Cards",
      value: summary.total,
      subtitle: "All generated card records",
      icon: IdCard,
    },
    {
      title: "Issued Admit Cards",
      value: summary.issued,
      subtitle: "Cards marked as issued",
      icon: CheckCircle2,
    },
    {
      title: "Draft Cards",
      value: summary.draft,
      subtitle: "Awaiting issuance",
      icon: ClipboardCheck,
    },
    {
      title: "Revoked Cards",
      value: summary.revoked,
      subtitle: "Cards no longer valid",
      icon: Ban,
    },
  ];

  // ======================================
  // ELIGIBLE REGISTRATIONS
  // ======================================

  const approvedRegistrations = useMemo(
    () =>
      registrations.filter(
        (item) =>
          item.status === "Approved" &&
          item.eligibilityStatus === "Eligible"
      ),
    [registrations]
  );

  const selectedRegistration =
    approvedRegistrations.find(
      (item) => item.id === selectedRegistrationId
    ) || null;

  const eligibility = useMemo(
    () =>
      getEligibility(
        selectedRegistration,
        exams,
        schedules
      ),
    [selectedRegistration, exams, schedules]
  );

  const matchingSessions =
    eligibility.sessions || [];

  // ======================================
  // FILTER CARDS
  // ======================================

  const filteredCards = useMemo(() => {
    const query = norm(search);

    return [...cards]
      .filter((item) => {
        const matchesSearch = [
          item.cardNumber,
          item.studentId,
          item.studentName,
          item.examName,
          item.examCode,
          item.courseCode,
          item.courseTitle,
          item.department,
        ].some((value) =>
          norm(value).includes(query)
        );

        const matchesStatus =
          statusFilter === "All" ||
          item.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) =>
        text(b.createdAt).localeCompare(
          text(a.createdAt)
        )
      );
  }, [cards, search, statusFilter]);

  // ======================================
  // SAVE TO LOCAL STORAGE
  // ======================================

  function persist(next) {
    try {
      localStorage.setItem(
        CARD_KEY,
        JSON.stringify(next)
      );

      setData((previous) => ({
        ...previous,
        cards: next,
      }));

      setError("");
      return true;
    } catch {
      setError(
        "Unable to save admit cards in browser storage."
      );
      return false;
    }
  }

  // ======================================
  // CREATE ADMIT CARD
  // ======================================

  function openCreate() {
    refresh();

    setSelectedRegistrationId("");
    setSelectedScheduleId("");
    setError("");
    setFeedback("");
    setCreateOpen(true);
  }

  function handleCreate(event) {
    event.preventDefault();

    const registration = registrations.find(
      (item) => item.id === selectedRegistrationId
    );

    const result = getEligibility(
      registration,
      exams,
      schedules
    );

    if (!result.valid) {
      setError(result.reason);
      return;
    }

    const schedule = result.sessions.find(
      (item) => item.id === selectedScheduleId
    );

    if (!schedule) {
      setError(
        "Select a matching examination schedule."
      );
      return;
    }

    const duplicate = cards.some(
      (item) =>
        item.registrationId === registration.id &&
        item.scheduleId === schedule.id &&
        item.status !== "Revoked"
    );

    if (duplicate) {
      setError(
        "An active admit card already exists for this student registration and exam session."
      );
      return;
    }

    const now = new Date().toISOString();

    const record = {
      id: createId(),
      cardNumber: createCardNumber(),
      registrationId: registration.id,
      scheduleId: schedule.id,
      examId: registration.examId,
      examName: result.exam.examName || "",
      examCode: result.exam.examCode || "",
      studentId: registration.studentId,
      studentName: registration.studentName,
      department: registration.department || "",
      program: registration.program || "",
      semester: registration.semester || "",
      academicSession:
        registration.academicSession || "",
      courseCode: schedule.courseCode,
      courseTitle: schedule.courseTitle,
      section:
        registration.section ||
        schedule.section ||
        "",
      examDate: schedule.examDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      venue: schedule.venue,
      room: schedule.room,
      instructions: schedule.instructions || "",
      status: "Draft",
      createdAt: now,
      updatedAt: now,
      issuedAt: null,
      revokedAt: null,
    };

    if (persist([record, ...cards])) {
      setCreateOpen(false);
      setFeedback(
        "Admit card generated successfully as a draft."
      );
    }
  }

  // ======================================
  // CHANGE STATUS
  // ======================================

  function changeStatus(card, nextStatus) {
    if (
      !window.confirm(
        `Change admit card ${card.cardNumber} to "${nextStatus}"?`
      )
    ) {
      return;
    }

    if (nextStatus === "Issued") {
      const registration = registrations.find(
        (item) => item.id === card.registrationId
      );

      const result = getEligibility(
        registration,
        exams,
        schedules
      );

      if (!result.valid) {
        setError(
          `Cannot issue this card: ${result.reason}`
        );
        return;
      }

      if (
        !result.sessions.some(
          (session) => session.id === card.scheduleId
        )
      ) {
        setError(
          "Cannot issue this card because its examination session is no longer active."
        );
        return;
      }
    }

    const now = new Date().toISOString();

    const next = cards.map((item) =>
      item.id === card.id
        ? {
            ...item,
            status: nextStatus,
            updatedAt: now,
            ...(nextStatus === "Issued"
              ? {
                  issuedAt: now,
                  revokedAt: null,
                }
              : {
                  revokedAt: now,
                }),
          }
        : item
    );

    if (persist(next)) {
      setFeedback(
        `Admit card status changed to ${nextStatus}.`
      );
      setViewing(null);
    }
  }

  // ======================================
  // DELETE CARD
  // ======================================

  function deleteCard(card) {
    if (
      !window.confirm(
        `Delete admit card ${card.cardNumber}?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    const next = cards.filter(
      (item) => item.id !== card.id
    );

    if (persist(next)) {
      setFeedback("Admit card deleted successfully.");
      setViewing(null);
    }
  }

  // ======================================
  // PRINT CARD
  // ======================================

  function printCard(card) {
    if (card.status !== "Issued") {
      setError(
        "Only issued admit cards can be printed."
      );
      return;
    }

    setError("");
    setViewing(card);

    // The print layout is rendered through
    // React and isolated using print CSS.
    // This is a browser print preview.
    setTimeout(() => {
      window.print();
    }, 150);
  }

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
              size: A4;
              margin: 14mm;
            }

            body {
              background: white !important;
            }

            body * {
              visibility: hidden !important;
            }

            #unibee-admit-print,
            #unibee-admit-print * {
              visibility: visible !important;
            }

            #unibee-admit-print {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: none !important;
              height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              background: white !important;
              color: black !important;
            }

            #unibee-admit-print .print-document {
              padding: 0 !important;
            }

            #unibee-admit-print .print-document * {
              color: black !important;
              box-shadow: none !important;
            }

            .no-print {
              display: none !important;
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
            Admit Card Management
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Generate, review, issue, and print
            examination admit cards for approved
            student registrations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              refresh();
              setError("");
              setFeedback("Admit card records refreshed.");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43]"
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
            Generate Admit Card
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

      {error && !createOpen && (
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
            Examination Admit Card Center
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Prepare examination entry documents,
            verify registration and timetable
            records, and manage the issuance
            of student admit cards.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold">
              {approvedRegistrations.length} approved registrations
            </span>

            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold">
              {schedules.length} exam schedule records
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
            Search & Filter Admit Cards
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
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
              placeholder="Student, ID, card number, exam..."
              className={`${BASE_INPUT} pl-10`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className={BASE_INPUT}
            aria-label="Filter admit card status"
          >
            <option value="All">All Statuses</option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#718579]">
            Showing {filteredCards.length} of{" "}
            {cards.length} admit cards
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("All");
            }}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#234E43]"
          >
            <RotateCcw size={15} />
            Reset Filters
          </button>
        </div>
      </section>

      {/* CARD RECORDS */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-[#234E43]">
          Admit Card Records
        </h2>

        {filteredCards.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-6 py-14 text-center">
            <Database
              size={36}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Admit Cards Found
            </h3>

            <p className="mt-2 text-sm text-[#718579]">
              Generate an admit card or adjust your filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredCards.map((card) => (
              <article
                key={card.id}
                className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                      <IdCard size={22} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words font-extrabold text-[#234E43]">
                        {card.studentName}
                      </h3>

                      <p className="mt-1 text-xs text-[#718579]">
                        Student ID: {card.studentId}
                      </p>

                      <p className="mt-1 break-all text-xs font-bold text-[#B18B37]">
                        {card.cardNumber}
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={card.status} />
                </div>

                <div className="mt-5 rounded-xl bg-[#F6F8F3] p-4">
                  <p className="text-sm font-bold text-[#234E43]">
                    {card.examName}
                  </p>

                  <p className="mt-2 text-sm text-[#718579]">
                    {card.courseCode} — {card.courseTitle}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-xs text-[#234E43]">
                      <CalendarDays size={16} />
                      {formatDate(card.examDate)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#234E43]">
                      <Clock3 size={16} />
                      {formatTime(card.startTime)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#234E43]">
                      <MapPin size={16} />
                      {card.venue} / {card.room}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#234E43]">
                      <GraduationCap size={16} />
                      {card.department}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E2EADC] pt-4">
                  <button
                    type="button"
                    onClick={() => setViewing(card)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <Eye size={15} />
                    Preview
                  </button>

                  {card.status === "Draft" && (
                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(card, "Issued")
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700"
                    >
                      <Send size={15} />
                      Issue
                    </button>
                  )}

                  {card.status === "Issued" && (
                    <>
                      <button
                        type="button"
                        onClick={() => printCard(card)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                      >
                        <Printer size={15} />
                        Print
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(card, "Revoked")
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2.5 text-xs font-bold text-amber-800"
                      >
                        <Ban size={15} />
                        Revoke
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteCard(card)}
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

      {/* GENERATE MODAL */}
      {createOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCreateOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admit-create-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wider text-[#B18B37]">
                  EXAM CONTROLLER
                </p>

                <h2
                  id="admit-create-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  Generate Admit Card
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Close form"
                className="rounded-lg bg-[#F6F8F3] p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#234E43]">
                  Approved Student Registration *
                </span>

                <select
                  required
                  value={selectedRegistrationId}
                  onChange={(event) => {
                    setSelectedRegistrationId(
                      event.target.value
                    );
                    setSelectedScheduleId("");
                    setError("");
                  }}
                  className={BASE_INPUT}
                >
                  <option value="">
                    Choose a registration
                  </option>

                  {approvedRegistrations.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.studentName} ({reg.studentId})
                      {" — "}
                      {reg.courseCode}
                      {" — "}
                      {reg.examName}
                    </option>
                  ))}
                </select>
              </label>

              {approvedRegistrations.length === 0 && (
                <p className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                  No eligible, approved registrations
                  were found. Create and approve a
                  registration in Course Registration first.
                </p>
              )}

              {selectedRegistration && (
                <div className="rounded-xl bg-[#F6F8F3] p-4">
                  <p className="text-sm font-bold text-[#234E43]">
                    {selectedRegistration.studentName}
                  </p>

                  <p className="mt-2 text-xs text-[#718579]">
                    Student ID: {selectedRegistration.studentId}
                  </p>

                  <p className="mt-1 text-xs text-[#718579]">
                    Course: {selectedRegistration.courseCode}
                    {" — "}
                    {selectedRegistration.courseTitle}
                  </p>

                  <p className="mt-1 text-xs text-[#718579]">
                    Department: {selectedRegistration.department}
                  </p>
                </div>
              )}

              {selectedRegistration && !eligibility.valid && (
                <div className="flex gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                  <AlertCircle
                    size={18}
                    className="shrink-0"
                  />
                  {eligibility.reason}
                </div>
              )}

              {eligibility.valid && (
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#234E43]">
                    Examination Session *
                  </span>

                  <select
                    required
                    value={selectedScheduleId}
                    onChange={(event) =>
                      setSelectedScheduleId(
                        event.target.value
                      )
                    }
                    className={BASE_INPUT}
                  >
                    <option value="">
                      Choose an exam session
                    </option>

                    {matchingSessions.map((session) => (
                      <option
                        key={session.id}
                        value={session.id}
                      >
                        {formatDate(session.examDate)}
                        {" — "}
                        {formatTime(session.startTime)}
                        {" — "}
                        {session.room}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!eligibility.valid || !selectedScheduleId}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IdCard size={18} />
                Generate Draft Admit Card
              </button>
            </form>
          </section>
        </div>
      )}

      {/* PREVIEW / PRINT MODAL */}
      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 print:static print:block print:bg-white print:p-0">
          <section
            id="unibee-admit-print"
            role="dialog"
            aria-modal="true"
            aria-label="Admit card preview"
            className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:overflow-visible print:rounded-none"
          >
            <div className="no-print flex items-center justify-between gap-3 border-b border-[#E2EADC] p-4">
              <h3 className="font-bold text-[#234E43]">
                Admit Card Preview
              </h3>

              <div className="flex gap-2">
                {viewing.status === "Issued" && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-4 py-2 text-xs font-bold text-white"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                )}

                <button
                  type="button"
                  aria-label="Close preview"
                  onClick={() => setViewing(null)}
                  className="rounded-lg bg-[#F6F8F3] p-2"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <AdmitCardDocument card={viewing} />
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
          <strong>Frontend Prototype:</strong> Admit
          cards are generated from local registration
          and examination schedule records. Marking
          a card as Issued does not perform official
          university authorization, student identity
          verification, digital signing, or server-side
          validation. The printable document is a
          demonstration only. Future changes to the
          schedule or registration do not automatically
          update previously generated cards.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Exam Controller — Admit Card Management
      </p>
    </div>
  );
}
