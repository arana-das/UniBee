
import { useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
  Printer,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CalendarDays,
  Clock3,
  Database,
  FileText,
  RotateCcw,
  Send,
  Archive,
  Users,
  Bell,
  Pin,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const NOTICE_KEY =
  "unibee-exam-controller-notices-v1";

const EXAMS_KEY =
  "unibee-exam-controller-exams-v1";

const INPUT =
  "w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43]";

const CATEGORIES = [
  "Exam Schedule",
  "Registration",
  "Admit Card",
  "Seat Plan",
  "Invigilation",
  "Marks Submission",
  "Result Publication",
  "Examination Rules",
  "General Announcement",
];

const AUDIENCES = [
  "All",
  "Students",
  "Faculty",
  "HOD",
  "Exam Controller",
  "Administrative Staff",
];

const PRIORITIES = ["Normal", "Important", "Urgent"];

const STATUSES = [
  "Draft",
  "Scheduled",
  "Published",
  "Archived",
];

const EMPTY_FORM = {
  title: "",
  examId: "",
  category: "General Announcement",
  audience: ["Students"],
  priority: "Normal",
  publishDate: "",
  expiryDate: "",
  content: "",
  status: "Draft",
  pinned: false,
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

function localToday() {
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

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `notice-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
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

function loadData() {
  return {
    notices: readCollection(NOTICE_KEY),
    exams: readCollection(EXAMS_KEY),
  };
}

function getExamName(notice, exams) {
  if (!notice.examId) return "All Examinations";

  const exam = exams.find(
    (item) => item.id === notice.examId
  );

  return exam?.examName ||
    notice.examName ||
    "Examination Unavailable";
}

function isExpired(notice, today) {
  return Boolean(
    notice.expiryDate &&
    notice.expiryDate < today
  );
}

function isCurrentlyVisible(notice, today) {
  return (
    notice.status === "Published" &&
    (!notice.publishDate ||
      notice.publishDate <= today) &&
    !isExpired(notice, today)
  );
}

function displayStatus(notice, today) {
  if (
    notice.status === "Published" &&
    isExpired(notice, today)
  ) {
    return "Expired";
  }

  return notice.status || "Draft";
}

function statusStyle(status) {
  const styles = {
    Draft: "bg-slate-100 text-slate-700",
    Scheduled: "bg-blue-50 text-blue-700",
    Published: "bg-emerald-50 text-emerald-700",
    Archived: "bg-gray-100 text-gray-600",
    Expired: "bg-rose-50 text-rose-700",
  };

  return styles[status] ||
    "bg-slate-100 text-slate-700";
}

function priorityStyle(priority) {
  const styles = {
    Normal: "bg-[#EAF2E8] text-[#234E43]",
    Important: "bg-amber-50 text-amber-800",
    Urgent: "bg-rose-50 text-rose-700",
  };

  return styles[priority] || styles.Normal;
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
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${priorityStyle(
        priority
      )}`}
    >
      {priority || "Normal"}
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

// ========================================
// PRINTABLE NOTICE
// ========================================

function NoticeDocument({ notice, exams }) {
  const audiences = Array.isArray(notice.audience)
    ? notice.audience
    : [];

  return (
    <div className="bg-white p-6 text-[#234E43] md:p-9 print:p-0">
      <div className="border-b-2 border-[#234E43] pb-5 text-center">
        <h2 className="text-2xl font-black">
          UniBee
        </h2>

        <p className="mt-1 text-sm font-semibold">
          Examination Administration
        </p>

        <h3 className="mt-4 text-xl font-black uppercase tracking-wide">
          Examination Notice
        </h3>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-semibold">
          Reference: {notice.noticeCode}
        </span>

        <span>
          Publication Date:{" "}
          {formatDate(notice.publishDate)}
        </span>
      </div>

      <h4 className="mt-8 text-xl font-extrabold">
        {notice.title}
      </h4>

      <div className="mt-5 grid gap-3 rounded-xl bg-[#F6F8F3] p-4 text-sm print:border print:bg-white sm:grid-cols-2">
        <p>
          <strong>Category:</strong>{" "}
          {notice.category}
        </p>

        <p>
          <strong>Priority:</strong>{" "}
          {notice.priority}
        </p>

        <p>
          <strong>Examination:</strong>{" "}
          {getExamName(notice, exams)}
        </p>

        <p>
          <strong>Audience:</strong>{" "}
          {audiences.join(", ") || "Not specified"}
        </p>

        <p>
          <strong>Expiry Date:</strong>{" "}
          {formatDate(notice.expiryDate)}
        </p>

        <p>
          <strong>Status:</strong>{" "}
          {notice.status}
        </p>
      </div>

      <div className="mt-8 whitespace-pre-wrap break-words text-sm leading-8">
        {notice.content}
      </div>

      <div className="mt-16 max-w-xs border-t border-[#234E43] pt-2 text-center text-xs">
        Examination Administration
      </div>

      <p className="mt-10 text-center text-[11px] leading-5 text-[#718579]">
        UniBee Frontend Prototype — Not an Official University Notice
      </p>
    </div>
  );
}

// ========================================
// MAIN NOTICE MANAGEMENT PAGE
// ========================================

export default function ExamControllerNotices() {
  const [data, setData] = useState(loadData);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [audienceFilter, setAudienceFilter] =
    useState("All");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [viewingId, setViewingId] =
    useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    audience: [...EMPTY_FORM.audience],
  });

  const [error, setError] = useState("");
  const [feedback, setFeedback] =
    useState("");

  const today = localToday();

  const { notices, exams } = data;

  const viewing =
    notices.find((item) => item.id === viewingId) ||
    null;

  // ======================================
  // REFRESH DATA
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

  const summary = useMemo(() => {
    return {
      total: notices.length,

      published: notices.filter((item) =>
        isCurrentlyVisible(item, today)
      ).length,

      drafts: notices.filter(
        (item) => item.status === "Draft"
      ).length,

      scheduled: notices.filter(
        (item) => item.status === "Scheduled"
      ).length,

      archived: notices.filter(
        (item) => item.status === "Archived"
      ).length,

      expired: notices.filter(
        (item) =>
          item.status === "Published" &&
          isExpired(item, today)
      ).length,
    };
  }, [notices, today]);

  const stats = [
    {
      title: "Total Notices",
      value: summary.total,
      subtitle: "All examination notices",
      icon: Megaphone,
    },
    {
      title: "Active Notices",
      value: summary.published,
      subtitle: "Currently published and visible",
      icon: Bell,
    },
    {
      title: "Draft Notices",
      value: summary.drafts,
      subtitle: "Not yet published",
      icon: FileText,
    },
    {
      title: "Scheduled Notices",
      value: summary.scheduled,
      subtitle: `${summary.expired} expired, ${summary.archived} archived`,
      icon: CalendarDays,
    },
  ];

  // ======================================
  // FILTER NOTICES
  // ======================================

  const filteredNotices = useMemo(() => {
    const query = norm(search);

    return [...notices]
      .filter((notice) => {
        const matchesSearch = [
          notice.title,
          notice.noticeCode,
          notice.category,
          notice.examName,
          notice.content,
        ].some((value) =>
          norm(value).includes(query)
        );

        const matchesStatus =
          statusFilter === "All" ||
          displayStatus(notice, today) ===
            statusFilter;

        const matchesCategory =
          categoryFilter === "All" ||
          notice.category === categoryFilter;

        const audiences = Array.isArray(
          notice.audience
        )
          ? notice.audience
          : [];

        const matchesAudience =
          audienceFilter === "All" ||
          audiences.includes("All") ||
          audiences.includes(audienceFilter);

        return (
          matchesSearch &&
          matchesStatus &&
          matchesCategory &&
          matchesAudience
        );
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return a.pinned ? -1 : 1;
        }

        return text(
          b.updatedAt || b.createdAt
        ).localeCompare(
          text(a.updatedAt || a.createdAt)
        );
      });
  }, [
    notices,
    search,
    statusFilter,
    categoryFilter,
    audienceFilter,
    today,
  ]);

  // ======================================
  // SAVE TO LOCAL STORAGE
  // ======================================

  function persist(next) {
    try {
      localStorage.setItem(
        NOTICE_KEY,
        JSON.stringify(next)
      );

      setData((previous) => ({
        ...previous,
        notices: next,
      }));

      setError("");
      return true;
    } catch {
      setError(
        "Unable to save examination notices in browser storage."
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

  function toggleAudience(audience) {
    setForm((previous) => {
      if (audience === "All") {
        return {
          ...previous,
          audience: previous.audience.includes("All")
            ? []
            : ["All"],
        };
      }

      const current = previous.audience.filter(
        (item) => item !== "All"
      );

      const next = current.includes(audience)
        ? current.filter((item) => item !== audience)
        : [...current, audience];

      return {
        ...previous,
        audience: next,
      };
    });
  }

  // ======================================
  // CREATE NOTICE
  // ======================================

  function openCreate() {
    refresh();

    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      audience: ["Students"],
      publishDate: today,
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ======================================
  // EDIT NOTICE
  // ======================================

  function openEdit(notice) {
    refresh();

    setEditingId(notice.id);

    setForm({
      title: notice.title || "",
      examId: notice.examId || "",
      category:
        notice.category || "General Announcement",
      audience: Array.isArray(notice.audience)
        ? [...notice.audience]
        : ["Students"],
      priority: notice.priority || "Normal",
      publishDate: notice.publishDate || "",
      expiryDate: notice.expiryDate || "",
      content: notice.content || "",
      status: notice.status || "Draft",
      pinned: Boolean(notice.pinned),
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ======================================
  // VALIDATE & SAVE
  // ======================================

  function handleSave(event) {
    event.preventDefault();

    if (!text(form.title)) {
      setError("Notice title is required.");
      return;
    }

    if (!text(form.content)) {
      setError("Notice content is required.");
      return;
    }

    if (form.audience.length === 0) {
      setError(
        "Select at least one target audience."
      );
      return;
    }

    if (!form.publishDate) {
      setError(
        "Publication date is required."
      );
      return;
    }

    if (
      form.expiryDate &&
      form.expiryDate < form.publishDate
    ) {
      setError(
        "Expiry date cannot be earlier than publication date."
      );
      return;
    }

    if (
      form.status === "Published" &&
      form.publishDate > today
    ) {
      setError(
        "A future-dated notice cannot be published yet. Choose Scheduled instead."
      );
      return;
    }

    if (
      form.status === "Published" &&
      form.expiryDate &&
      form.expiryDate < today
    ) {
      setError(
        "Cannot publish a notice that has already expired."
      );
      return;
    }

    const exam = exams.find(
      (item) => item.id === form.examId
    );

    if (form.examId && !exam) {
      setError(
        "The selected examination no longer exists."
      );
      return;
    }

    const now = new Date().toISOString();

    const previous = notices.find(
      (item) => item.id === editingId
    );

    const values = {
      title: text(form.title),
      examId: form.examId,
      examName: exam?.examName || "",
      category: form.category,
      audience: [...form.audience],
      priority: form.priority,
      publishDate: form.publishDate,
      expiryDate: form.expiryDate,
      content: text(form.content),
      status: form.status,
      pinned: Boolean(form.pinned),
      publishedAt:
        form.status === "Published"
          ? previous?.publishedAt || now
          : null,
      updatedAt: now,
    };

    const wasEditing = editingId !== null;

    const next = wasEditing
      ? notices.map((item) =>
          item.id === editingId
            ? { ...item, ...values }
            : item
        )
      : [
          {
            id: makeId(),
            noticeCode: `NTC-${Date.now()
              .toString(36)
              .toUpperCase()}-${Math.random()
              .toString(36)
              .slice(2, 5)
              .toUpperCase()}`,
            ...values,
            createdAt: now,
          },
          ...notices,
        ];

    if (persist(next)) {
      setModalOpen(false);
      setEditingId(null);

      setFeedback(
        wasEditing
          ? "Examination notice updated successfully."
          : "Examination notice created successfully."
      );
    }
  }

  // ======================================
  // PUBLISH NOTICE
  // ======================================

  function publishNotice(notice) {
    if (
      !["Draft", "Scheduled"].includes(
        notice.status
      )
    ) {
      setError(
        "Only draft or scheduled notices can be published."
      );
      return;
    }

    if (
      notice.publishDate &&
      notice.publishDate > today
    ) {
      setError(
        `This notice is scheduled for ${formatDate(
          notice.publishDate
        )}. Update the publication date before publishing.`
      );
      return;
    }

    if (isExpired(notice, today)) {
      setError(
        "This notice has expired. Update its expiry date before publishing."
      );
      return;
    }

    if (
      !window.confirm(
        `Publish "${notice.title}"?\n\nThis will mark the notice as published in the frontend prototype.`
      )
    ) {
      return;
    }

    const now = new Date().toISOString();

    const next = notices.map((item) =>
      item.id === notice.id
        ? {
            ...item,
            status: "Published",
            publishedAt: now,
            updatedAt: now,
          }
        : item
    );

    if (persist(next)) {
      setFeedback(
        "Examination notice published successfully."
      );
    }
  }

  // ======================================
  // ARCHIVE NOTICE
  // ======================================

  function archiveNotice(notice) {
    if (
      !window.confirm(
        `Archive "${notice.title}"?`
      )
    ) {
      return;
    }

    const next = notices.map((item) =>
      item.id === notice.id
        ? {
            ...item,
            status: "Archived",
            updatedAt: new Date().toISOString(),
          }
        : item
    );

    if (persist(next)) {
      setFeedback(
        "Examination notice archived successfully."
      );
    }
  }

  // ======================================
  // DELETE NOTICE
  // ======================================

  function deleteNotice(notice) {
    if (
      !window.confirm(
        `Delete "${notice.title}"?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    const next = notices.filter(
      (item) => item.id !== notice.id
    );

    if (persist(next)) {
      setViewingId(null);
      setFeedback(
        "Examination notice deleted successfully."
      );
    }
  }

  // ======================================
  // RESET FILTERS
  // ======================================

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setCategoryFilter("All");
    setAudienceFilter("All");
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7">
      {/* PRINT CSS */}
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 15mm;
            }

            body * {
              visibility: hidden !important;
            }

            #unibee-notice-print,
            #unibee-notice-print * {
              visibility: visible !important;
            }

            #unibee-notice-print {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              max-width: none !important;
              max-height: none !important;
              overflow: visible !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
            }

            #unibee-notice-print * {
              color: black !important;
              box-shadow: none !important;
            }

            .unibee-notice-no-print {
              display: none !important;
            }
          }
        `}
      </style>

      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            RESULTS & COMMUNICATION
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Examination Notices
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Create examination announcements,
            schedule publication dates, target
            audiences, and manage notice visibility.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              refresh();
              setError("");
              setFeedback("Notices refreshed.");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
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
            Create Notice
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
          className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle
            size={18}
            className="shrink-0"
          />
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
            Examination Communication Center
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Organize examination notices,
            announcements, deadlines, and
            important academic communications
            in one centralized workspace.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold">
              {summary.published} active notices
            </span>

            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold">
              {summary.scheduled} scheduled notices
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
            Search & Filter Notices
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              placeholder="Search notices..."
              className={`${INPUT} pl-10`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className={INPUT}
            aria-label="Filter notice status"
          >
            <option value="All">
              All Statuses
            </option>

            {[...STATUSES, "Expired"].map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
            className={INPUT}
            aria-label="Filter notice category"
          >
            <option value="All">
              All Categories
            </option>

            {CATEGORIES.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>

          <select
            value={audienceFilter}
            onChange={(event) =>
              setAudienceFilter(event.target.value)
            }
            className={INPUT}
            aria-label="Filter target audience"
          >
            <option value="All">
              All Audiences
            </option>

            {AUDIENCES.filter(
              (audience) => audience !== "All"
            ).map((audience) => (
              <option
                key={audience}
                value={audience}
              >
                {audience}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#718579]">
            Showing {filteredNotices.length} of{" "}
            {notices.length} notices
          </p>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#234E43]"
          >
            <RotateCcw size={15} />
            Reset Filters
          </button>
        </div>
      </section>

      {/* NOTICE RECORDS */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-[#234E43]">
          Examination Notice Records
        </h2>

        {filteredNotices.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-6 py-14 text-center">
            <Database
              size={36}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Examination Notices Found
            </h3>

            <p className="mt-2 text-sm text-[#718579]">
              Create a new notice or adjust your filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredNotices.map((notice) => {
              const audiences = Array.isArray(
                notice.audience
              )
                ? notice.audience
                : [];

              return (
                <article
                  key={notice.id}
                  className="flex flex-col rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm"
                >
                  {/* NOTICE HEADER */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                        <Megaphone size={22} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="break-words font-extrabold text-[#234E43]">
                            {notice.title}
                          </h3>

                          {notice.pinned && (
                            <Pin
                              size={15}
                              className="shrink-0 text-[#B18B37]"
                            />
                          )}
                        </div>

                        <p className="mt-1 text-xs text-[#718579]">
                          {notice.noticeCode}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[#B18B37]">
                          {notice.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        status={displayStatus(notice, today)}
                      />

                      <PriorityBadge
                        priority={notice.priority}
                      />
                    </div>
                  </div>

                  {/* NOTICE CONTENT */}
                  <div className="mt-5 rounded-xl bg-[#F6F8F3] p-4">
                    <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#53695C]">
                      {notice.content}
                    </p>
                  </div>

                  {/* DETAILS */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-2 text-xs text-[#718579]">
                      <CalendarDays
                        size={16}
                        className="shrink-0"
                      />

                      <div>
                        <p>Publication Date</p>

                        <p className="mt-1 font-bold text-[#234E43]">
                          {formatDate(notice.publishDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-[#718579]">
                      <Clock3
                        size={16}
                        className="shrink-0"
                      />

                      <div>
                        <p>Expiry Date</p>

                        <p className="mt-1 font-bold text-[#234E43]">
                          {notice.expiryDate
                            ? formatDate(notice.expiryDate)
                            : "No expiry"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-[#718579] sm:col-span-2">
                      <Users
                        size={16}
                        className="shrink-0"
                      />

                      <div>
                        <p>Target Audience</p>

                        <p className="mt-1 font-bold text-[#234E43]">
                          {audiences.join(", ") || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-[#718579]">
                    Examination:{" "}
                    <span className="font-semibold text-[#234E43]">
                      {getExamName(notice, exams)}
                    </span>
                  </p>

                  {/* ACTIONS */}
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-[#E2EADC] pt-5">
                    <button
                      type="button"
                      onClick={() =>
                        setViewingId(notice.id)
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-bold text-white"
                    >
                      <Eye size={15} />
                      Preview
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(notice)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    {["Draft", "Scheduled"].includes(
                      notice.status
                    ) && (
                      <button
                        type="button"
                        onClick={() =>
                          publishNotice(notice)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700"
                      >
                        <Send size={15} />
                        Publish
                      </button>
                    )}

                    {notice.status !== "Archived" && (
                      <button
                        type="button"
                        onClick={() =>
                          archiveNotice(notice)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2.5 text-xs font-bold text-amber-800"
                      >
                        <Archive size={15} />
                        Archive
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setViewingId(notice.id)
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                    >
                      <Printer size={15} />
                      Print
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteNotice(notice)
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-600"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wide text-[#B18B37]">
                  EXAM CONTROLLER
                </p>

                <h2
                  id="notice-form-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {editingId !== null
                    ? "Edit Examination Notice"
                    : "Create Examination Notice"}
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
              className="space-y-5"
            >
              {/* TITLE */}
              <Field label="Notice Title" required>
                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) =>
                    updateField(
                      "title",
                      event.target.value
                    )
                  }
                  placeholder="Enter examination notice title"
                  className={INPUT}
                />
              </Field>

              {/* EXAMINATION */}
              <Field label="Related Examination">
                <select
                  value={form.examId}
                  onChange={(event) =>
                    updateField(
                      "examId",
                      event.target.value
                    )
                  }
                  className={INPUT}
                >
                  <option value="">
                    All Examinations / General Notice
                  </option>

                  {exams.map((exam) => (
                    <option
                      key={exam.id}
                      value={exam.id}
                    >
                      {exam.examName}
                      {" — "}
                      {exam.examCode}
                    </option>
                  ))}
                </select>
              </Field>

              {/* CATEGORY & PRIORITY */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Notice Category">
                  <select
                    value={form.category}
                    onChange={(event) =>
                      updateField(
                        "category",
                        event.target.value
                      )
                    }
                    className={INPUT}
                  >
                    {CATEGORIES.map((category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Priority Level">
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      updateField(
                        "priority",
                        event.target.value
                      )
                    }
                    className={INPUT}
                  >
                    {PRIORITIES.map((priority) => (
                      <option
                        key={priority}
                        value={priority}
                      >
                        {priority}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* TARGET AUDIENCES */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#234E43]">
                  <Users size={18} />
                  Target Audience *
                </h3>

                <div className="grid gap-3 rounded-xl border border-[#E2EADC] p-4 sm:grid-cols-2">
                  {AUDIENCES.map((audience) => (
                    <label
                      key={audience}
                      className="flex cursor-pointer items-center gap-3 text-sm text-[#234E43]"
                    >
                      <input
                        type="checkbox"
                        checked={form.audience.includes(
                          audience
                        )}
                        onChange={() =>
                          toggleAudience(audience)
                        }
                        className="h-4 w-4 accent-[#234E43]"
                      />

                      {audience === "All"
                        ? "All Stakeholders"
                        : audience}
                    </label>
                  ))}
                </div>
              </div>

              {/* DATE SETTINGS */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Publication Date" required>
                  <input
                    type="date"
                    required
                    value={form.publishDate}
                    onChange={(event) =>
                      updateField(
                        "publishDate",
                        event.target.value
                      )
                    }
                    className={INPUT}
                  />
                </Field>

                <Field label="Expiry Date">
                  <input
                    type="date"
                    value={form.expiryDate}
                    min={form.publishDate || undefined}
                    onChange={(event) =>
                      updateField(
                        "expiryDate",
                        event.target.value
                      )
                    }
                    className={INPUT}
                  />
                </Field>
              </div>

              {/* NOTICE BODY */}
              <Field label="Notice Content" required>
                <textarea
                  required
                  rows={8}
                  value={form.content}
                  onChange={(event) =>
                    updateField(
                      "content",
                      event.target.value
                    )
                  }
                  placeholder="Write the examination announcement, important dates, instructions, and other relevant details..."
                  className={`${INPUT} resize-y leading-7`}
                />
              </Field>

              {/* STATUS */}
              <Field label="Publication Status">
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

              {form.status === "Scheduled" && (
                <p className="rounded-xl bg-blue-50 p-4 text-xs leading-6 text-blue-800">
                  Scheduled notices remain unpublished until
                  you manually publish them. Automatic
                  server-side publishing will be added
                  during backend integration.
                </p>
              )}

              {/* PIN NOTICE */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#F6F8F3] p-4">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(event) =>
                    updateField(
                      "pinned",
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 accent-[#234E43]"
                />

                <span className="flex items-center gap-2 text-sm font-semibold text-[#234E43]">
                  <Pin size={17} />
                  Pin this notice to the top
                </span>
              </label>

              {/* ERROR */}
              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-700"
                >
                  <AlertCircle
                    size={18}
                    className="shrink-0"
                  />
                  {error}
                </p>
              )}

              {/* SAVE BUTTON */}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white hover:bg-[#193B33]"
              >
                <Save size={18} />

                {editingId !== null
                  ? "Save Notice Changes"
                  : "Create Examination Notice"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* PREVIEW & PRINT MODAL */}
      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 print:static print:block print:bg-white print:p-0">
          <section
            id="unibee-notice-print"
            role="dialog"
            aria-modal="true"
            aria-label="Examination notice preview"
            className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:overflow-visible print:rounded-none"
          >
            <div className="unibee-notice-no-print flex items-center justify-between gap-3 border-b border-[#E2EADC] p-4">
              <h3 className="font-extrabold text-[#234E43]">
                Examination Notice Preview
              </h3>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-4 py-2 text-xs font-bold text-white"
                >
                  <Printer size={15} />
                  Print
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewingId(null)
                  }
                  aria-label="Close preview"
                  className="rounded-lg bg-[#F6F8F3] p-2 text-[#234E43]"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <NoticeDocument
              notice={viewing}
              exams={exams}
            />
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
          <strong>Frontend Prototype:</strong> Notices
          are saved in browser localStorage.
          Publishing, scheduling, and archiving
          update local records only. Automatic
          publishing, cross-portal delivery,
          notification permissions, recipient
          filtering, and university authorization
          will be implemented during backend
          integration. The Exam Controller Dashboard
          reads currently published notices that
          fall within their publication and expiry
          dates.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Exam Controller — Examination Notices
      </p>
    </div>
  );
}
