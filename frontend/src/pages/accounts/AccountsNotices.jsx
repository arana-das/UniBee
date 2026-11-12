
import { useEffect, useMemo, useState } from "react";
import {
  Megaphone,
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
  Filter,
  RotateCcw,
  Database,
  CalendarDays,
  Users,
  Building2,
  Send,
  FileText,
  Pin,
  Bell,
  BookOpen,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const STORAGE_KEY = "unibee-accounts-notices-v1";

const AUDIENCES = [
  "All Students",
  "All Faculty",
  "Students & Faculty",
  "Accounts Staff",
  "All University Members",
];

const PRIORITIES = [
  "Normal",
  "Important",
  "Urgent",
];

const CATEGORIES = [
  "Tuition & Fees",
  "Payment Deadline",
  "Outstanding Dues",
  "Scholarships & Waivers",
  "Refund Information",
  "Examination Fees",
  "Financial Policy",
  "General Announcement",
];

const DEPARTMENTS = [
  "All Departments",
  "ICT",
  "CSE",
  "EEE",
  "Business Administration",
  "English",
  "Law",
  "Other",
];

const EMPTY_FORM = {
  title: "",
  category: "General Announcement",
  audience: "All Students",
  department: "All Departments",
  priority: "Normal",
  content: "",
  publishDate: "",
  expiryDate: "",
  status: "Draft",
  pinned: false,
};

// ========================================
// GENERAL UTILITIES
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
  if (!value) return "Not set";

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

function generateId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `notice-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function loadNotices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

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

// ========================================
// NOTICE STATUS
// ========================================

function getNoticeStatus(notice, today = todayLocal()) {
  if (notice.status !== "Published") {
    return "Draft";
  }

  if (
    notice.publishDate &&
    notice.publishDate > today
  ) {
    return "Scheduled";
  }

  if (
    notice.expiryDate &&
    notice.expiryDate < today
  ) {
    return "Expired";
  }

  return "Published";
}

function StatusBadge({ status }) {
  const styles = {
    Published: "bg-emerald-50 text-emerald-700",
    Draft: "bg-slate-100 text-slate-700",
    Scheduled: "bg-blue-50 text-blue-700",
    Expired: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] || styles.Draft
      }`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const styles = {
    Normal: "bg-[#EAF2E8] text-[#234E43]",
    Important: "bg-amber-50 text-amber-800",
    Urgent: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[priority] || styles.Normal
      }`}
    >
      {priority || "Normal"}
    </span>
  );
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#718579]">
            {title}
          </p>

          <h3 className="mt-3 text-2xl font-extrabold text-[#234E43]">
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

export default function AccountsNotices() {
  const [notices, setNotices] = useState(loadNotices);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [audienceFilter, setAudienceFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    publishDate: todayLocal(),
  });

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const today = todayLocal();

  // ======================================
  // REFRESH
  // ======================================

  useEffect(() => {
    function refresh() {
      setNotices(loadNotices());
    }

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
  // SUMMARY
  // ======================================

  const summary = useMemo(() => {
    return notices.reduce(
      (result, notice) => {
        const status = getNoticeStatus(notice, today);

        result.total += 1;

        if (status === "Published") {
          result.published += 1;
        }

        if (status === "Draft") {
          result.drafts += 1;
        }

        if (status === "Scheduled") {
          result.scheduled += 1;
        }

        if (
          status === "Published" &&
          notice.priority === "Urgent"
        ) {
          result.urgent += 1;
        }

        return result;
      },
      {
        total: 0,
        published: 0,
        drafts: 0,
        scheduled: 0,
        urgent: 0,
      }
    );
  }, [notices, today]);

  const stats = [
    {
      title: "Total Notices",
      value: summary.total,
      subtitle: "All financial announcements",
      icon: Megaphone,
    },
    {
      title: "Published Notices",
      value: summary.published,
      subtitle: "Currently active notices",
      icon: CheckCircle2,
    },
    {
      title: "Draft Notices",
      value: summary.drafts,
      subtitle: "Unpublished announcements",
      icon: FileText,
    },
    {
      title: "Scheduled Notices",
      value: summary.scheduled,
      subtitle: "Future publication dates",
      icon: Clock3,
    },
  ];

  // ======================================
  // SEARCH AND FILTER
  // ======================================

  const filteredNotices = useMemo(() => {
    const query = norm(search);

    return [...notices]
      .filter((notice) => {
        const matchesSearch = [
          notice.title,
          notice.content,
          notice.category,
          notice.audience,
          notice.department,
        ].some((value) => norm(value).includes(query));

        const matchesStatus =
          statusFilter === "All" ||
          getNoticeStatus(notice, today) === statusFilter;

        const matchesPriority =
          priorityFilter === "All" ||
          notice.priority === priorityFilter;

        const matchesAudience =
          audienceFilter === "All" ||
          notice.audience === audienceFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesPriority &&
          matchesAudience
        );
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return a.pinned ? -1 : 1;
        }

        const priorityOrder = {
          Urgent: 3,
          Important: 2,
          Normal: 1,
        };

        const priorityDifference =
          (priorityOrder[b.priority] || 0) -
          (priorityOrder[a.priority] || 0);

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return text(
          b.updatedAt || b.createdAt || b.publishDate
        ).localeCompare(
          text(
            a.updatedAt || a.createdAt || a.publishDate
          )
        );
      });
  }, [
    notices,
    search,
    statusFilter,
    priorityFilter,
    audienceFilter,
    today,
  ]);

  // ======================================
  // STORAGE ACTIONS
  // ======================================

  function persist(next) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      setNotices(next);
      setError("");
      return true;
    } catch {
      setError(
        "Unable to save notices in browser storage."
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

  function openCreate() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      publishDate: todayLocal(),
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(notice) {
    setEditingId(notice.id);

    setForm({
      title: text(notice.title),
      category:
        notice.category || "General Announcement",
      audience:
        notice.audience || "All Students",
      department:
        notice.department || "All Departments",
      priority: notice.priority || "Normal",
      content: text(notice.content),
      publishDate:
        notice.publishDate || todayLocal(),
      expiryDate: notice.expiryDate || "",
      status: notice.status || "Draft",
      pinned: Boolean(notice.pinned),
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ======================================
  // CREATE / EDIT NOTICE
  // ======================================

  function handleSave(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Notice title is required.");
      return;
    }

    if (!form.content.trim()) {
      setError("Notice content is required.");
      return;
    }

    if (!form.publishDate) {
      setError("Publication date is required.");
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

    const now = new Date().toISOString();

    const values = {
      title: form.title.trim(),
      category: form.category,
      audience: form.audience,
      department: form.department,
      priority: form.priority,
      content: form.content.trim(),
      publishDate: form.publishDate,
      expiryDate: form.expiryDate,
      status: form.status,
      pinned: form.pinned,
      source: "Accounts Officer",
      updatedAt: now,
    };

    const next =
      editingId !== null
        ? notices.map((notice) =>
            notice.id === editingId
              ? { ...notice, ...values }
              : notice
          )
        : [
            {
              id: generateId(),
              ...values,
              createdAt: now,
            },
            ...notices,
          ];

    if (persist(next)) {
      setModalOpen(false);

      setFeedback(
        editingId !== null
          ? "Financial notice updated successfully."
          : "Financial notice created successfully."
      );

      setEditingId(null);
    }
  }

  // ======================================
  // PUBLISH / UNPUBLISH
  // ======================================

  function changePublication(notice, status) {
    if (
      !window.confirm(
        `${status === "Published" ? "Publish" : "Unpublish"} this financial notice?`
      )
    ) {
      return;
    }

    const now = new Date().toISOString();

    const next = notices.map((item) =>
      item.id === notice.id
        ? {
            ...item,
            status,
            publishDate:
              status === "Published" &&
              (!item.publishDate ||
                item.publishDate < today)
                ? today
                : item.publishDate,
            updatedAt: now,
          }
        : item
    );

    if (persist(next)) {
      setFeedback(
        status === "Published"
          ? "Notice marked for publication."
          : "Notice moved to drafts."
      );
    }
  }

  // ======================================
  // PIN / UNPIN
  // ======================================

  function togglePin(notice) {
    const next = notices.map((item) =>
      item.id === notice.id
        ? {
            ...item,
            pinned: !Boolean(item.pinned),
            updatedAt: new Date().toISOString(),
          }
        : item
    );

    if (persist(next)) {
      setFeedback(
        notice.pinned
          ? "Notice unpinned."
          : "Notice pinned."
      );
    }
  }

  // ======================================
  // DELETE
  // ======================================

  function deleteNotice(id) {
    if (
      !window.confirm(
        "Are you sure you want to delete this notice?"
      )
    ) {
      return;
    }

    const next = notices.filter(
      (notice) => notice.id !== id
    );

    if (persist(next)) {
      setFeedback(
        "Financial notice deleted successfully."
      );
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setAudienceFilter("All");
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            MANAGEMENT & REPORTS
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Financial Notices
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Create and organize financial
            announcements, payment reminders,
            scholarship updates, and university
            fee notices.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setNotices(loadNotices());
              setFeedback("Notice records refreshed.");
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
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
            <Bell size={16} />
            ACCOUNTS OFFICER
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            Financial Communication Center
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Manage important finance-related
            announcements for university students,
            faculty members, and administrative staff.
          </p>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border-[35px] border-white/5" />
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

      {/* SEARCH & FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={18}
            className="text-[#234E43]"
          />

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
              placeholder="Search title or content..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter publication status"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Expired">Expired</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value)
            }
            aria-label="Filter notice priority"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Priorities</option>

            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>

          <select
            value={audienceFilter}
            onChange={(event) =>
              setAudienceFilter(event.target.value)
            }
            aria-label="Filter target audience"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Audiences</option>

            {AUDIENCES.map((audience) => (
              <option key={audience} value={audience}>
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
            className="inline-flex items-center gap-2 text-sm font-bold text-[#234E43] hover:underline"
          >
            <RotateCcw size={15} />
            Reset Filters
          </button>
        </div>
      </section>

      {/* NOTICE COLLECTION */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Financial Announcements
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            Manage drafts, published notices,
            and scheduled financial updates.
          </p>
        </div>

        {filteredNotices.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white px-6 py-14 text-center">
            <Database
              size={36}
              className="mx-auto text-[#A6C1A4]"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No Notices Found
            </h3>

            <p className="mt-2 text-sm text-[#718579]">
              Create a notice or change the filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredNotices.map((notice) => {
              const status = getNoticeStatus(
                notice,
                today
              );

              return (
                <article
                  key={notice.id}
                  className="flex flex-col rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  {/* NOTICE HEADER */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="shrink-0 rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                        <Megaphone size={22} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words font-bold text-[#234E43]">
                          {notice.title}
                        </h3>

                        <p className="mt-1 text-xs text-[#718579]">
                          {notice.category}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={status} />
                  </div>

                  {/* PRIORITY & PIN */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <PriorityBadge
                      priority={notice.priority}
                    />

                    {notice.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF2E8] px-3 py-1 text-xs font-bold text-[#234E43]">
                        <Pin size={12} />
                        Pinned
                      </span>
                    )}
                  </div>

                  {/* CONTENT PREVIEW */}
                  <p className="mt-4 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#607B6C]">
                    {notice.content}
                  </p>

                  {/* NOTICE DETAILS */}
                  <div className="mt-5 grid gap-3 rounded-xl bg-[#F6F8F3] p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#718579]">
                        Audience
                      </p>

                      <p className="mt-1 flex items-start gap-2 text-sm font-semibold text-[#234E43]">
                        <Users
                          size={15}
                          className="mt-0.5 shrink-0"
                        />
                        {notice.audience}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Department
                      </p>

                      <p className="mt-1 flex items-start gap-2 text-sm font-semibold text-[#234E43]">
                        <Building2
                          size={15}
                          className="mt-0.5 shrink-0"
                        />
                        {notice.department}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Publication Date
                      </p>

                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#234E43]">
                        <CalendarDays size={15} />
                        {formatDate(notice.publishDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#718579]">
                        Expiry Date
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#234E43]">
                        {notice.expiryDate
                          ? formatDate(notice.expiryDate)
                          : "No expiry"}
                      </p>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-[#E2EADC] pt-4">
                    <button
                      type="button"
                      onClick={() => setViewing(notice)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-bold text-white"
                    >
                      <Eye size={15} />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(notice)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePin(notice)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                    >
                      <Pin size={15} />
                      {notice.pinned ? "Unpin" : "Pin"}
                    </button>

                    {notice.status === "Published" ? (
                      <button
                        type="button"
                        onClick={() =>
                          changePublication(notice, "Draft")
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2.5 text-xs font-bold text-amber-800"
                      >
                        <FileText size={15} />
                        Unpublish
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          changePublication(notice, "Published")
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700"
                      >
                        <Send size={15} />
                        Publish
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteNotice(notice.id)}
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
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  ACCOUNTS OFFICER
                </p>

                <h2
                  id="notice-form-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {editingId !== null
                    ? "Edit Financial Notice"
                    : "Create Financial Notice"}
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

            <form onSubmit={handleSave} className="space-y-5">
              {/* TITLE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Notice Title *
                </label>

                <input
                  required
                  maxLength={180}
                  value={form.title}
                  onChange={(event) =>
                    updateField("title", event.target.value)
                  }
                  placeholder="e.g. Fall Semester Tuition Payment Deadline"
                  className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm outline-none focus:border-[#234E43]"
                />
              </div>

              {/* CATEGORY AND PRIORITY */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Notice Category
                  </label>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Priority
                  </label>

                  <select
                    value={form.priority}
                    onChange={(event) =>
                      updateField("priority", event.target.value)
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* AUDIENCE TARGETING */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <Users size={19} />
                  Audience Targeting
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Target Audience
                    </label>

                    <select
                      value={form.audience}
                      onChange={(event) =>
                        updateField("audience", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      {AUDIENCES.map((audience) => (
                        <option key={audience} value={audience}>
                          {audience}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Department
                    </label>

                    <select
                      value={form.department}
                      onChange={(event) =>
                        updateField("department", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      {DEPARTMENTS.map((department) => (
                        <option
                          key={department}
                          value={department}
                        >
                          {department}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* CONTENT */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Notice Content *
                </label>

                <textarea
                  required
                  rows={7}
                  value={form.content}
                  onChange={(event) =>
                    updateField("content", event.target.value)
                  }
                  placeholder="Write the complete financial announcement..."
                  className="w-full resize-y rounded-xl border border-[#E2EADC] p-3 text-sm leading-7 outline-none focus:border-[#234E43]"
                />
              </div>

              {/* PUBLICATION */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
                  <CalendarDays size={19} />
                  Publication Settings
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Publication Date *
                    </label>

                    <input
                      required
                      type="date"
                      value={form.publishDate}
                      onChange={(event) =>
                        updateField("publishDate", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Expiry Date
                    </label>

                    <input
                      type="date"
                      min={form.publishDate || undefined}
                      value={form.expiryDate}
                      onChange={(event) =>
                        updateField("expiryDate", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Publication Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateField("status", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                    >
                      <option value="Draft">
                        Draft
                      </option>
                      <option value="Published">
                        Published
                      </option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#E2EADC] p-3">
                      <input
                        type="checkbox"
                        checked={form.pinned}
                        onChange={(event) =>
                          updateField("pinned", event.target.checked)
                        }
                        className="h-4 w-4 accent-[#234E43]"
                      />

                      <span className="text-sm font-semibold text-[#234E43]">
                        Pin this notice
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* STATUS PREVIEW */}
              <div className="rounded-xl bg-[#EAF2E8] p-4">
                <p className="text-xs font-semibold text-[#718579]">
                  Notice Preview Status
                </p>

                <div className="mt-2">
                  <StatusBadge
                    status={getNoticeStatus(form, today)}
                  />
                </div>

                <p className="mt-3 text-xs leading-5 text-[#718579]">
                  Future-dated published notices will be
                  marked Scheduled until their publication
                  date. Expired notices will no longer be
                  treated as active.
                </p>
              </div>

              {/* ERROR */}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
                >
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
                  ? "Save Changes"
                  : "Create Financial Notice"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* NOTICE DETAILS MODAL */}
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
            aria-labelledby="notice-view-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  FINANCIAL ANNOUNCEMENT
                </p>

                <h2
                  id="notice-view-title"
                  className="mt-2 text-xl font-extrabold text-[#234E43]"
                >
                  {viewing.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close details"
                className="rounded-lg bg-[#F6F8F3] p-2 text-[#234E43]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge
                status={getNoticeStatus(viewing, today)}
              />

              <PriorityBadge
                priority={viewing.priority}
              />
            </div>

            <div className="mt-6 rounded-xl bg-[#F6F8F3] px-5">
              <DetailRow
                label="Category"
                value={viewing.category}
              />

              <DetailRow
                label="Audience"
                value={viewing.audience}
              />

              <DetailRow
                label="Department"
                value={viewing.department}
              />

              <DetailRow
                label="Publication Date"
                value={formatDate(viewing.publishDate)}
              />

              <DetailRow
                label="Expiry Date"
                value={
                  viewing.expiryDate
                    ? formatDate(viewing.expiryDate)
                    : "No expiry"
                }
              />

              <DetailRow
                label="Pinned"
                value={viewing.pinned ? "Yes" : "No"}
              />

              <DetailRow
                label="Created By"
                value="Accounts Officer"
              />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-[#234E43]">
                Complete Notice
              </h3>

              <div className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-[#E2EADC] p-5 text-sm leading-7 text-[#607B6C]">
                {viewing.content}
              </div>
            </div>

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
        <AlertCircle
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Notices are saved
          in browser localStorage. Publication status,
          scheduled dates, department targeting, and
          audience targeting are currently managed
          inside the Accounts Portal. Notices are not
          yet automatically delivered to Student,
          Faculty, or other stakeholder portals.
          Cross-portal notice synchronization and
          notification delivery will be implemented
          during the integration phase.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Accounts Officer — Financial Notices
      </p>
    </div>
  );
}
