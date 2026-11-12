
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  Plus,
  Search,
  Filter,
  RotateCcw,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
  CheckCircle2,
  XCircle,
  Clock3,
  Users,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  ClipboardList,
  CalendarDays,
  FileText,
  Database,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const STORAGE_KEY =
  "unibee-exam-controller-registration-v1";

const EXAMS_KEY =
  "unibee-exam-controller-exams-v1";

const REGISTRATION_STATUSES = [
  "Pending",
  "Under Review",
  "Approved",
  "Rejected",
  "Cancelled",
];

const ELIGIBILITY_STATUSES = [
  "Eligible",
  "Not Eligible",
  "Pending Verification",
];

const EMPTY_FORM = {
  examId: "",
  studentId: "",
  studentName: "",
  department: "",
  program: "",
  semester: "",
  academicSession: "",
  courseCode: "",
  courseTitle: "",
  section: "",
  registrationDate: "",
  eligibilityStatus: "Pending Verification",
  eligibilityReason: "",
  status: "Pending",
  notes: "",
};

// ========================================
// GENERAL HELPERS
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function normalize(value) {
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

  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `reg-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function readCollection(key) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return [];

    const data = JSON.parse(raw);

    return Array.isArray(data)
      ? data.filter(
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

function getExamName(record, exams) {
  const exam = exams.find(
    (item) => item.id === record.examId
  );

  return (
    exam?.examName ||
    record.examName ||
    "Unknown Examination"
  );
}

function getEligibilityColor(status) {
  switch (status) {
    case "Eligible":
      return "bg-emerald-50 text-emerald-700";

    case "Not Eligible":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-amber-50 text-amber-800";
  }
}

function getStatusColor(status) {
  switch (status) {
    case "Approved":
      return "bg-emerald-50 text-emerald-700";

    case "Rejected":
      return "bg-rose-50 text-rose-700";

    case "Cancelled":
      return "bg-slate-100 text-slate-700";

    case "Under Review":
      return "bg-blue-50 text-blue-700";

    default:
      return "bg-amber-50 text-amber-800";
  }
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function StatusBadge({ status, eligibility = false }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        eligibility
          ? getEligibilityColor(status)
          : getStatusColor(status)
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
          <p className="text-sm font-medium text-[#718579]">
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

function InputField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder = "",
  readOnly = false,
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
        value={value}
        required={required}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(event) =>
          onChange?.(event.target.value)
        }
        className={`w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43] ${
          readOnly ? "bg-[#F6F8F3]" : "bg-white"
        }`}
      />
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
// MAIN REGISTRATION PAGE
// ========================================

export default function ExamControllerRegistration() {
  const [registrations, setRegistrations] =
    useState(() => readCollection(STORAGE_KEY));

  const [exams, setExams] = useState(
    () => readCollection(EXAMS_KEY)
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [eligibilityFilter, setEligibilityFilter] =
    useState("All");

  const [examFilter, setExamFilter] =
    useState("All");

  const [page, setPage] = useState(1);

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

  const PAGE_SIZE = 8;

  // ======================================
  // REFRESH DATA
  // ======================================

  function refreshRecords() {
    setRegistrations(readCollection(STORAGE_KEY));
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
  // STATISTICS
  // ======================================

  const summary = useMemo(() => {
    return {
      total: registrations.length,

      pending: registrations.filter(
        (item) =>
          item.status === "Pending" ||
          item.status === "Under Review"
      ).length,

      approved: registrations.filter(
        (item) => item.status === "Approved"
      ).length,

      rejected: registrations.filter(
        (item) => item.status === "Rejected"
      ).length,

      eligible: registrations.filter(
        (item) =>
          item.eligibilityStatus === "Eligible"
      ).length,

      notEligible: registrations.filter(
        (item) =>
          item.eligibilityStatus === "Not Eligible"
      ).length,
    };
  }, [registrations]);

  const stats = [
    {
      title: "Total Registrations",
      value: summary.total,
      subtitle: "Saved student examination records",
      icon: Users,
    },
    {
      title: "Pending Review",
      value: summary.pending,
      subtitle: "Waiting for administrative review",
      icon: Clock3,
    },
    {
      title: "Approved Registrations",
      value: summary.approved,
      subtitle: `${summary.eligible} records marked eligible`,
      icon: CheckCircle2,
    },
    {
      title: "Rejected Registrations",
      value: summary.rejected,
      subtitle: `${summary.notEligible} records marked ineligible`,
      icon: XCircle,
    },
  ];

  // ======================================
  // FILTERING
  // ======================================

  const filtered = useMemo(() => {
    const query = normalize(search);

    return registrations
      .filter((item) => {
        const matchesSearch = [
          item.studentId,
          item.studentName,
          item.examName,
          item.examCode,
          item.courseCode,
          item.courseTitle,
          item.department,
          item.program,
          item.semester,
          item.section,
        ].some((value) =>
          normalize(value).includes(query)
        );

        const matchesStatus =
          statusFilter === "All" ||
          item.status === statusFilter;

        const matchesEligibility =
          eligibilityFilter === "All" ||
          item.eligibilityStatus ===
            eligibilityFilter;

        const matchesExam =
          examFilter === "All" ||
          item.examId === examFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesEligibility &&
          matchesExam
        );
      })
      .sort((a, b) =>
        text(b.createdAt).localeCompare(
          text(a.createdAt)
        )
      );
  }, [
    registrations,
    search,
    statusFilter,
    eligibilityFilter,
    examFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleRecords = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ======================================
  // STORAGE SAVE
  // ======================================

  function persist(next) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      setRegistrations(next);
      setError("");

      return true;
    } catch {
      setError(
        "Unable to save registration records. Check browser storage permissions."
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
  // SELECT PARENT EXAM
  // ======================================

  function selectExam(examId) {
    const selected = exams.find(
      (item) => item.id === examId
    );

    if (!selected) {
      setForm((previous) => ({
        ...previous,
        examId: "",
        department: "",
        program: "",
        semester: "",
        academicSession: "",
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      examId: selected.id,
      department: selected.department || "",
      program: selected.program || "",
      semester: selected.semester || "",
      academicSession:
        selected.academicSession || "",
    }));
  }

  // ======================================
  // OPEN CREATE FORM
  // ======================================

  function openCreate() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      registrationDate: todayLocal(),
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ======================================
  // OPEN EDIT FORM
  // ======================================

  function openEdit(record) {
    setEditingId(record.id);

    setForm({
      examId: record.examId || "",
      studentId: record.studentId || "",
      studentName: record.studentName || "",
      department: record.department || "",
      program: record.program || "",
      semester: record.semester || "",
      academicSession:
        record.academicSession || "",
      courseCode: record.courseCode || "",
      courseTitle: record.courseTitle || "",
      section: record.section || "",
      registrationDate:
        record.registrationDate || "",
      eligibilityStatus:
        record.eligibilityStatus ||
        "Pending Verification",
      eligibilityReason:
        record.eligibilityReason || "",
      status: record.status || "Pending",
      notes: record.notes || "",
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ======================================
  // SAVE REGISTRATION
  // ======================================

  function handleSave(event) {
    event.preventDefault();

    const selectedExam = exams.find(
      (item) => item.id === form.examId
    );

    if (!selectedExam) {
      setError(
        "Please select an examination from Exam Management."
      );
      return;
    }

    if (
      !form.studentId.trim() ||
      !form.studentName.trim() ||
      !form.courseCode.trim() ||
      !form.courseTitle.trim() ||
      !form.registrationDate
    ) {
      setError(
        "Student ID, student name, course code, course title, and registration date are required."
      );
      return;
    }

    if (
      normalize(selectedExam.status) ===
      "cancelled"
    ) {
      setError(
        "Registrations cannot be saved for cancelled examinations."
      );
      return;
    }

    if (
      selectedExam.registrationDeadline &&
      form.registrationDate >
        selectedExam.registrationDeadline
    ) {
      setError(
        "Registration date exceeds this examination's registration deadline."
      );
      return;
    }

    if (
      form.status === "Approved" &&
      form.eligibilityStatus !== "Eligible"
    ) {
      setError(
        "Only students marked Eligible can have an Approved registration."
      );
      return;
    }

    if (
      form.eligibilityStatus === "Not Eligible" &&
      !form.eligibilityReason.trim()
    ) {
      setError(
        "Please provide a reason why the student is not eligible."
      );
      return;
    }

    if (
      form.status === "Rejected" &&
      !(
        form.eligibilityReason.trim() ||
        form.notes.trim()
      )
    ) {
      setError(
        "Please provide a rejection reason in Eligibility Reason or Notes."
      );
      return;
    }

    // Each student can register once per course
    // within the same examination.
    const duplicate = registrations.some(
      (record) =>
        record.id !== editingId &&
        record.examId === selectedExam.id &&
        normalize(record.studentId) ===
          normalize(form.studentId) &&
        normalize(record.courseCode) ===
          normalize(form.courseCode) &&
        record.status !== "Cancelled"
    );

    if (duplicate && form.status !== "Cancelled") {
      setError(
        "This student already has an active registration for the same course and examination."
      );
      return;
    }

    const now = new Date().toISOString();

    const values = {
      examId: selectedExam.id,
      examName: selectedExam.examName || "",
      examCode: selectedExam.examCode || "",
      studentId: form.studentId.trim(),
      studentName: form.studentName.trim(),
      department:
        selectedExam.department || "",
      program: selectedExam.program || "",
      semester: selectedExam.semester || "",
      academicSession:
        selectedExam.academicSession || "",
      courseCode: form.courseCode.trim(),
      courseTitle: form.courseTitle.trim(),
      section: form.section.trim(),
      registrationDate:
        form.registrationDate,
      eligibilityStatus:
        form.eligibilityStatus,
      eligibilityReason:
        form.eligibilityReason.trim(),
      status: form.status,
      notes: form.notes.trim(),
      updatedAt: now,
    };

    const wasEditing = editingId !== null;

    const next = wasEditing
      ? registrations.map((record) =>
          record.id === editingId
            ? {
                ...record,
                ...values,
              }
            : record
        )
      : [
          {
            id: makeId(),
            ...values,
            createdAt: now,
          },
          ...registrations,
        ];

    if (persist(next)) {
      setModalOpen(false);
      setEditingId(null);

      setFeedback(
        wasEditing
          ? "Student registration updated successfully."
          : "Student registration created successfully."
      );
    }
  }

  // ======================================
  // APPROVE REGISTRATION
  // ======================================

  function approveRegistration(record) {
    if (
      record.eligibilityStatus !== "Eligible"
    ) {
      setError(
        "This student is not marked Eligible. Verify eligibility before approving."
      );
      return;
    }

    const parentExam = exams.find(
      (exam) => exam.id === record.examId
    );

    if (
      !parentExam ||
      normalize(parentExam.status) ===
        "cancelled"
    ) {
      setError(
        "The related examination is missing or cancelled."
      );
      return;
    }

    if (
      !window.confirm(
        `Approve examination registration for ${record.studentName}?`
      )
    ) {
      return;
    }

    const now = new Date().toISOString();

    const next = registrations.map((item) =>
      item.id === record.id
        ? {
            ...item,
            status: "Approved",
            approvedAt: now,
            updatedAt: now,
          }
        : item
    );

    if (persist(next)) {
      setFeedback(
        "Examination registration approved."
      );
    }
  }

  // ======================================
  // REJECT REGISTRATION
  // ======================================

  function rejectRegistration(record) {
    const reason = window.prompt(
      `Enter the rejection reason for ${record.studentName}:`,
      record.eligibilityReason || ""
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setError(
        "A rejection reason is required."
      );
      return;
    }

    const now = new Date().toISOString();

    const next = registrations.map((item) =>
      item.id === record.id
        ? {
            ...item,
            status: "Rejected",
            eligibilityReason: reason.trim(),
            rejectedAt: now,
            updatedAt: now,
          }
        : item
    );

    if (persist(next)) {
      setFeedback(
        "Examination registration rejected."
      );
    }
  }

  // ======================================
  // DELETE REGISTRATION
  // ======================================

  function deleteRegistration(record) {
    if (
      !window.confirm(
        `Delete the registration for ${record.studentName} (${record.studentId})?\n\nThis will not automatically delete related admit cards, seat allocations, or other saved records.`
      )
    ) {
      return;
    }

    const next = registrations.filter(
      (item) => item.id !== record.id
    );

    if (persist(next)) {
      setFeedback(
        "Registration deleted successfully."
      );
    }
  }

  // ======================================
  // RESET FILTERS
  // ======================================

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setEligibilityFilter("All");
    setExamFilter("All");
    setPage(1);
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
            Course Registration
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Review student examination registrations,
            verify eligibility, and manage approval
            decisions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              refreshRecords();
              setError("");
              setFeedback(
                "Registration records refreshed."
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
            Add Registration
          </button>
        </div>
      </section>

      {/* SUCCESS FEEDBACK */}
      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </div>
      )}

      {/* ERROR FEEDBACK */}
      {error && !modalOpen && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border-[35px] border-white/5" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
            <ShieldCheck size={16} />
            EXAM CONTROLLER
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            Examination Registration Center
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Manage examination registration records,
            review student eligibility, and track
            pending, approved, and rejected
            applications from one workspace.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold">
              {exams.length} examination records
            </span>

            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold">
              {summary.total} registrations
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

      {/* FILTER SECTION */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={18}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Registrations
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

          {/* SEARCH */}
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
              placeholder="Student, ID, course..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          {/* EXAM FILTER */}
          <select
            value={examFilter}
            onChange={(event) => {
              setExamFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter examination"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Examinations
            </option>

            {exams.map((exam) => (
              <option
                key={exam.id}
                value={exam.id}
              >
                {exam.examName}
              </option>
            ))}
          </select>

          {/* STATUS FILTER */}
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter registration status"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Statuses
            </option>

            {REGISTRATION_STATUSES.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>

          {/* ELIGIBILITY FILTER */}
          <select
            value={eligibilityFilter}
            onChange={(event) => {
              setEligibilityFilter(
                event.target.value
              );
              setPage(1);
            }}
            aria-label="Filter eligibility"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Eligibility Statuses
            </option>

            {ELIGIBILITY_STATUSES.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#718579]">
            Showing {filtered.length} of{" "}
            {registrations.length} registrations
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

      {/* REGISTRATION RECORDS */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Student Registration Records
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            Review individual student registrations
            and examination eligibility
          </p>
        </div>

        {visibleRecords.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-6 py-14 text-center">
            <Database
              size={36}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Registration Records Found
            </h3>

            <p className="mt-2 text-sm text-[#718579]">
              Add a registration or adjust your filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleRecords.map((record) => (
              <article
                key={record.id}
                className="flex flex-col rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                {/* STUDENT HEADER */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                      <GraduationCap size={22} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words font-extrabold text-[#234E43]">
                        {record.studentName}
                      </h3>

                      <p className="mt-1 text-xs text-[#718579]">
                        Student ID: {record.studentId}
                      </p>
                    </div>
                  </div>

                  <StatusBadge
                    status={record.status}
                  />
                </div>

                {/* DETAILS */}
                <div className="mt-5 rounded-xl bg-[#F6F8F3] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#B18B37]">
                    Examination
                  </p>

                  <p className="mt-2 text-sm font-extrabold text-[#234E43]">
                    {getExamName(record, exams)}
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#718579]">
                        Course Code
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#234E43]">
                        {record.courseCode}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Course Title
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#234E43]">
                        {record.courseTitle}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Department
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#234E43]">
                        {record.department || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Semester
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#234E43]">
                        {record.semester || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ELIGIBILITY */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2EADC] p-4">
                  <div>
                    <p className="text-xs font-semibold text-[#718579]">
                      Eligibility Verification
                    </p>

                    <div className="mt-2">
                      <StatusBadge
                        status={
                          record.eligibilityStatus
                        }
                        eligibility
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-[#718579]">
                      Registered On
                    </p>

                    <p className="mt-2 text-sm font-bold text-[#234E43]">
                      {formatDate(
                        record.registrationDate
                      )}
                    </p>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="mt-auto flex flex-wrap gap-2 border-t border-[#E2EADC] pt-5">
                  <button
                    type="button"
                    onClick={() =>
                      setViewing(record)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <Eye size={15} />
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openEdit(record)
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  {![
                    "Approved",
                    "Rejected",
                    "Cancelled",
                  ].includes(record.status) && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          approveRegistration(record)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700"
                      >
                        <CheckCircle2 size={15} />
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          rejectRegistration(record)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2.5 text-xs font-bold text-amber-800"
                      >
                        <XCircle size={15} />
                        Reject
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      deleteRegistration(record)
                    }
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

        {/* PAGINATION */}
        {filtered.length > PAGE_SIZE && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2EADC] bg-white p-4">
            <p className="text-sm text-[#718579]">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() =>
                  setPage((old) =>
                    Math.max(1, old - 1)
                  )
                }
                className="rounded-lg border border-[#E2EADC] p-2 text-[#234E43] disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={19} />
              </button>

              <button
                type="button"
                disabled={
                  currentPage >= totalPages
                }
                onClick={() =>
                  setPage((old) =>
                    Math.min(totalPages, old + 1)
                  )
                }
                className="rounded-lg border border-[#E2EADC] p-2 text-[#234E43] disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={19} />
              </button>
            </div>
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
            aria-labelledby="registration-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            {/* MODAL HEADER */}
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#B18B37]">
                  EXAM CONTROLLER
                </p>

                <h2
                  id="registration-form-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {editingId !== null
                    ? "Edit Registration"
                    : "Add Student Registration"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModalOpen(false)
                }
                aria-label="Close form"
                className="rounded-lg bg-[#F6F8F3] p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="space-y-6"
            >
              {/* EXAM SELECTION */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <ClipboardList size={19} />
                  Examination
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
                      Choose Examination
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

                {exams.length === 0 && (
                  <p className="mt-3 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                    Please create an examination
                    in Exam Management before
                    adding registrations.
                  </p>
                )}
              </div>

              {/* STUDENT INFORMATION */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <GraduationCap size={19} />
                  Student Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Student ID"
                    required
                    value={form.studentId}
                    onChange={(value) =>
                      updateField("studentId", value)
                    }
                    placeholder="e.g. 202600123"
                  />

                  <InputField
                    label="Student Name"
                    required
                    value={form.studentName}
                    onChange={(value) =>
                      updateField(
                        "studentName",
                        value
                      )
                    }
                    placeholder="Full student name"
                  />

                  <InputField
                    label="Department"
                    readOnly
                    value={form.department}
                  />

                  <InputField
                    label="Program"
                    readOnly
                    value={form.program}
                  />

                  <InputField
                    label="Semester"
                    readOnly
                    value={form.semester}
                  />

                  <InputField
                    label="Academic Session"
                    readOnly
                    value={
                      form.academicSession
                    }
                  />
                </div>
              </div>

              {/* COURSE INFORMATION */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <BookOpen size={19} />
                  Course Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Course Code"
                    required
                    value={form.courseCode}
                    onChange={(value) =>
                      updateField(
                        "courseCode",
                        value
                      )
                    }
                    placeholder="e.g. CSE-301"
                  />

                  <InputField
                    label="Course Title"
                    required
                    value={form.courseTitle}
                    onChange={(value) =>
                      updateField(
                        "courseTitle",
                        value
                      )
                    }
                    placeholder="Course title"
                  />

                  <InputField
                    label="Section"
                    value={form.section}
                    onChange={(value) =>
                      updateField("section", value)
                    }
                    placeholder="e.g. Section A"
                  />

                  <InputField
                    label="Registration Date"
                    type="date"
                    required
                    value={form.registrationDate}
                    onChange={(value) =>
                      updateField(
                        "registrationDate",
                        value
                      )
                    }
                  />
                </div>
              </div>

              {/* ELIGIBILITY */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <ShieldCheck size={19} />
                  Eligibility Verification
                </h3>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Eligibility Status
                  </span>

                  <select
                    value={
                      form.eligibilityStatus
                    }
                    onChange={(event) =>
                      updateField(
                        "eligibilityStatus",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
                  >
                    {ELIGIBILITY_STATUSES.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Eligibility / Rejection Reason
                  </span>

                  <textarea
                    rows={3}
                    value={
                      form.eligibilityReason
                    }
                    onChange={(event) =>
                      updateField(
                        "eligibilityReason",
                        event.target.value
                      )
                    }
                    placeholder="Explain the eligibility decision..."
                    className="w-full resize-y rounded-xl border border-[#E2EADC] p-4 text-sm leading-6 outline-none focus:border-[#234E43]"
                  />
                </label>
              </div>

              {/* REGISTRATION STATUS */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Registration Status
                </label>

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
                  {REGISTRATION_STATUSES.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* NOTES */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Administrative Notes
                </label>

                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    updateField(
                      "notes",
                      event.target.value
                    )
                  }
                  placeholder="Additional registration information..."
                  className="w-full resize-y rounded-xl border border-[#E2EADC] p-4 text-sm leading-6 outline-none focus:border-[#234E43]"
                />
              </div>

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

                {editingId !== null
                  ? "Save Registration Changes"
                  : "Create Registration"}
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
            aria-labelledby="registration-view-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  STUDENT REGISTRATION
                </p>

                <h2
                  id="registration-view-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {viewing.studentName}
                </h2>

                <p className="mt-2 text-xs text-[#718579]">
                  Student ID: {viewing.studentId}
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

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge
                status={viewing.status}
              />

              <StatusBadge
                status={
                  viewing.eligibilityStatus
                }
                eligibility
              />
            </div>

            <div className="mt-6 rounded-xl bg-[#F6F8F3] px-5">
              {[
                [
                  "Exam Name",
                  getExamName(viewing, exams),
                ],
                ["Exam Code", viewing.examCode],
                ["Student ID", viewing.studentId],
                [
                  "Student Name",
                  viewing.studentName,
                ],
                [
                  "Department",
                  viewing.department,
                ],
                ["Program", viewing.program],
                ["Semester", viewing.semester],
                [
                  "Academic Session",
                  viewing.academicSession,
                ],
                ["Course Code", viewing.courseCode],
                [
                  "Course Title",
                  viewing.courseTitle,
                ],
                ["Section", viewing.section],
                [
                  "Registration Date",
                  formatDate(
                    viewing.registrationDate
                  ),
                ],
                [
                  "Eligibility",
                  viewing.eligibilityStatus,
                ],
                ["Status", viewing.status],
              ].map(([label, value]) => (
                <DetailRow
                  key={label}
                  label={label}
                  value={value}
                />
              ))}
            </div>

            {viewing.eligibilityReason && (
              <div className="mt-5 rounded-xl border border-[#E2EADC] p-4">
                <h3 className="text-sm font-bold text-[#234E43]">
                  Eligibility / Rejection Reason
                </h3>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#718579]">
                  {viewing.eligibilityReason}
                </p>
              </div>
            )}

            {viewing.notes && (
              <div className="mt-4 rounded-xl border border-[#E2EADC] p-4">
                <h3 className="text-sm font-bold text-[#234E43]">
                  Administrative Notes
                </h3>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#718579]">
                  {viewing.notes}
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

      {/* INFORMATION NOTICE */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <FileText
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Registration
          records and eligibility decisions are
          currently entered manually and stored
          in browser localStorage. Student enrollment,
          academic attendance, course prerequisites,
          fee clearance, and institutional eligibility
          are not verified automatically. An approval
          here is a prototype record, not an official
          university authorization. These validations
          will be implemented during backend and
          cross-stakeholder integration.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Exam Controller — Course Registration
      </p>
    </div>
  );
}
