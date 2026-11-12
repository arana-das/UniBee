
import { useEffect, useMemo, useState } from "react";
import { getAuthToken } from "../../services/authApi";
import {
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice,
} from "../../services/noticeApi";
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock3,
  CalendarDays,
  Users,
  Send,
  Archive,
  FileText,
  Pin,
  Database,
  RefreshCw,
} from "lucide-react";

const STORAGE_KEY = "unibee-admin-notices-v1";
const PAGE_SIZE = 8;

const CATEGORIES = [
  "Academic",
  "Examination",
  "Admission",
  "General",
  "Event",
  "Finance",
  "Emergency",
];

const AUDIENCES = [
  "All",
  "Students",
  "Faculty",
  "Admin",
];

const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const STATUSES = ["Draft", "Published", "Archived"];

const DEMO_NOTICES = [
  {
    id: "NTC-001",
    title: "Fall 2026 Final Examination Schedule",
    category: "Examination",
    audience: "All",
    priority: "High",
    status: "Published",
    content:
      "The final examination schedule for Fall 2026 has been prepared. Students are requested to review their course examination dates and follow the instructions issued by the Examination Office.",
    createdAt: "2026-10-20",
    publishedAt: "2026-10-21",
    expiryDate: "2026-12-31",
    author: "Examination Office",
    pinned: true,
  },
  {
    id: "NTC-002",
    title: "Course Registration Reminder",
    category: "Academic",
    audience: "Students",
    priority: "Normal",
    status: "Published",
    content:
      "Students should complete their course registration within the announced registration period. Please contact your department for further assistance.",
    createdAt: "2026-10-18",
    publishedAt: "2026-10-19",
    expiryDate: "2026-11-15",
    author: "Academic Office",
    pinned: false,
  },
  {
    id: "NTC-003",
    title: "Faculty Coordination Meeting",
    category: "General",
    audience: "Faculty",
    priority: "Normal",
    status: "Published",
    content:
      "Faculty members are invited to attend the upcoming academic coordination meeting. Details regarding the meeting venue and agenda will be shared by the administration.",
    createdAt: "2026-10-22",
    publishedAt: "2026-10-22",
    expiryDate: "2026-11-10",
    author: "Administration",
    pinned: false,
  },
  {
    id: "NTC-004",
    title: "University Cultural Festival",
    category: "Event",
    audience: "All",
    priority: "Normal",
    status: "Draft",
    content:
      "The university is preparing a cultural festival featuring student performances, exhibitions, and campus activities. The finalized event schedule will be announced soon.",
    createdAt: "2026-10-25",
    publishedAt: "",
    expiryDate: "2026-12-15",
    author: "Student Affairs",
    pinned: false,
  },
  {
    id: "NTC-005",
    title: "Tuition Payment Deadline",
    category: "Finance",
    audience: "Students",
    priority: "High",
    status: "Published",
    content:
      "Students are advised to complete their tuition payment by the applicable deadline. For payment-related questions, please contact the Finance Office.",
    createdAt: "2026-10-23",
    publishedAt: "2026-10-24",
    expiryDate: "2026-11-30",
    author: "Finance Office",
    pinned: true,
  },
  {
    id: "NTC-006",
    title: "Campus Maintenance Announcement",
    category: "General",
    audience: "All",
    priority: "Low",
    status: "Archived",
    content:
      "Routine campus maintenance was scheduled for selected university facilities. The maintenance announcement has now been archived.",
    createdAt: "2026-09-05",
    publishedAt: "2026-09-06",
    expiryDate: "2026-09-30",
    author: "Campus Administration",
    pinned: false,
  },
];

const EMPTY_FORM = {
  title: "",
  category: "General",
  audience: "All",
  priority: "Normal",
  status: "Draft",
  content: "",
  expiryDate: "",
  author: "University Administration",
  pinned: false,
};

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `notice-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadNotices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEMO_NOTICES;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEMO_NOTICES;
  } catch {
    return DEMO_NOTICES;
  }
}

function isExpired(notice) {
  return Boolean(
    notice.expiryDate &&
    notice.expiryDate < today()
  );
}

function StatusBadge({ status, expired = false }) {
  const styles = {
    Published: "bg-emerald-50 text-emerald-700",
    Draft: "bg-amber-50 text-amber-800",
    Archived: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          styles[status] || styles.Draft
        }`}
      >
        {status}
      </span>

      {expired && status === "Published" && (
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
          Expired
        </span>
      )}
    </div>
  );
}

function PriorityBadge({ priority }) {
  const styles = {
    Low: "bg-slate-100 text-slate-600",
    Normal: "bg-sky-50 text-sky-700",
    High: "bg-amber-50 text-amber-800",
    Urgent: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
        styles[priority] || styles.Normal
      }`}
    >
      {priority}
    </span>
  );
}

function StatCard({ title, value, detail, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
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

function downloadCSV(notices) {
  const headers = [
    "Notice ID",
    "Title",
    "Category",
    "Audience",
    "Priority",
    "Status",
    "Author",
    "Created Date",
    "Published Date",
    "Expiry Date",
    "Pinned",
    "Content",
  ];

  const rows = [
    headers,
    ...notices.map((notice) => [
      notice.id,
      notice.title,
      notice.category,
      notice.audience,
      notice.priority,
      notice.status,
      notice.author,
      notice.createdAt,
      notice.publishedAt,
      notice.expiryDate,
      notice.pinned ? "Yes" : "No",
      notice.content,
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
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: "text/csv;charset=utf-8",
    })
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "UniBee_Notices.csv";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function FormSelect({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AdminNotices() {
  const [notices, setNotices] = useState([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [audienceFilter, setAudienceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const loadLiveNotices = async () => {
    const token = getAuthToken();
    if (!token) {
      setDemoMode(true);
      setNotices(loadNotices());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const records = await getNotices();
      setNotices(records);
      setDemoMode(false);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load live notices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveNotices();
  }, []);

  const filteredNotices = useMemo(() => {
    const search = query.trim().toLowerCase();

    return notices
      .filter((notice) => {
        const matchesSearch = [
          notice.title,
          notice.content,
          notice.author,
          notice.id,
        ].some((value) =>
          String(value || "").toLowerCase().includes(search)
        );

        return (
          matchesSearch &&
          (categoryFilter === "All" ||
            notice.category === categoryFilter) &&
          (audienceFilter === "All" ||
            notice.audience === audienceFilter) &&
          (statusFilter === "All" ||
            notice.status === statusFilter)
        );
      })
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          b.createdAt.localeCompare(a.createdAt)
      );
  }, [
    notices,
    query,
    categoryFilter,
    audienceFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotices.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleNotices = filteredNotices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const publishedCount = notices.filter(
    (notice) => notice.status === "Published"
  ).length;

  const draftCount = notices.filter(
    (notice) => notice.status === "Draft"
  ).length;

  const urgentCount = notices.filter(
    (notice) =>
      notice.priority === "Urgent" &&
      notice.status === "Published" &&
      !isExpired(notice)
  ).length;

  function persist(next, message) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      setNotices(next);
      setFeedback(message);
      setError("");
      return true;
    } catch {
      setError(
        "Unable to save notices in browser storage."
      );
      return false;
    }
  }

  function updateField(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
    setError("");
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(notice) {
    setEditingId(notice.id);

    setForm({
      title: notice.title,
      category: notice.category,
      audience: notice.audience,
      priority: notice.priority,
      status: notice.status,
      content: notice.content,
      expiryDate: notice.expiryDate || "",
      author: notice.author || "",
      pinned: Boolean(notice.pinned),
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();

    const clean = {
      ...form,
      title: form.title.trim(),
      content: form.content.trim(),
      author: form.author.trim(),
    };

    if (!clean.title || !clean.content || !clean.author) {
      setError(
        "Notice title, content, and author are required."
      );
      return;
    }

    if (clean.title.length < 5) {
      setError("Notice title must contain at least 5 characters.");
      return;
    }

    if (clean.content.length < 15) {
      setError("Notice content must contain at least 15 characters.");
      return;
    }

    if (demoMode) {
      const existing = notices.find(
        (notice) => notice.id === editingId
      );

      const record = {
        ...(existing || {
          id: makeId(),
          createdAt: today(),
        }),
        ...clean,
        publishedAt:
          clean.status === "Published"
            ? existing?.status === "Published"
              ? existing.publishedAt || today()
              : today()
            : "",
      };

      const next = editingId
        ? notices.map((notice) =>
            notice.id === editingId ? record : notice
          )
        : [record, ...notices];

      if (
        persist(
          next,
          editingId
            ? "Notice updated successfully."
            : "Notice created successfully."
        )
      ) {
        setModalOpen(false);
        setEditingId(null);
        setPage(1);
      }
      return;
    }

    // LIVE MONGODB MODE
    try {
      if (editingId) {
        const updated = await updateNotice(editingId, clean);
        setNotices((prev) =>
          prev.map((item) => (item.id === editingId ? updated : item))
        );
        setFeedback("Notice updated in MongoDB.");
      } else {
        const created = await createNotice(clean);
        setNotices((prev) => [created, ...prev]);
        setFeedback("Notice published and saved to MongoDB.");
      }
      setModalOpen(false);
      setEditingId(null);
      setError("");
      setPage(1);
    } catch (err) {
      setError(err.message || "Failed to save notice to MongoDB.");
    }
  }

  async function changeStatus(notice, nextStatus) {
    if (
      !window.confirm(
        `Change "${notice.title}" status to ${nextStatus}?`
      )
    ) {
      return;
    }

    if (demoMode) {
      const next = notices.map((item) =>
        item.id === notice.id
          ? {
              ...item,
              status: nextStatus,
              publishedAt:
                nextStatus === "Published"
                  ? item.publishedAt || today()
                  : "",
            }
          : item
      );

      persist(
        next,
        `Notice marked ${nextStatus.toLowerCase()}.`
      );
      return;
    }

    // LIVE MONGODB MODE
    try {
      const updated = await updateNotice(notice.id, { status: nextStatus });
      setNotices((prev) =>
        prev.map((item) => (item.id === notice.id ? updated : item))
      );
      setFeedback(`Notice status updated to ${nextStatus} in MongoDB.`);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to update notice status in MongoDB.");
    }
  }

  async function togglePin(notice) {
    if (demoMode) {
      const next = notices.map((item) =>
        item.id === notice.id
          ? { ...item, pinned: !item.pinned }
          : item
      );

      persist(
        next,
        notice.pinned
          ? "Notice unpinned."
          : "Notice pinned."
      );
      return;
    }

    // LIVE MONGODB MODE
    try {
      const updated = await updateNotice(notice.id, { pinned: !notice.pinned });
      setNotices((prev) =>
        prev.map((item) => (item.id === notice.id ? updated : item))
      );
      setFeedback(notice.pinned ? "Notice unpinned in MongoDB." : "Notice pinned in MongoDB.");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to update pin in MongoDB.");
    }
  }

  async function handleDelete(notice) {
    if (
      !window.confirm(
        `Delete "${notice.title}" permanently?`
      )
    ) {
      return;
    }

    if (demoMode) {
      persist(
        notices.filter((item) => item.id !== notice.id),
        "Notice deleted successfully."
      );
      return;
    }

    // LIVE MONGODB MODE
    try {
      await deleteNotice(notice.id);
      setNotices((prev) => prev.filter((item) => item.id !== notice.id));
      setFeedback("Notice deleted permanently from MongoDB.");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to delete notice from MongoDB.");
    }
  }

  function clearFilters() {
    setQuery("");
    setCategoryFilter("All");
    setAudienceFilter("All");
    setStatusFilter("All");
    setPage(1);
  }

  function resetDemo() {
    if (
      !window.confirm(
        "Restore default demo notices? This replaces all locally saved notice changes."
      )
    ) {
      return;
    }

    if (
      persist(
        DEMO_NOTICES,
        "Demo notices restored."
      )
    ) {
      clearFilters();
    }
  }

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Campus Operations
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[#234E43] md:text-3xl">
              University Notices
            </h1>

            {demoMode ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                <AlertCircle size={14} />
                Demo Mode
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Database size={14} />
                Live MongoDB
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Create, organize, and manage university announcements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!demoMode && (
            <button
              type="button"
              onClick={loadLiveNotices}
              title="Refresh from MongoDB"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          )}

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33]"
          >
            <Plus size={18} />
            Create Notice
          </button>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Notices"
          value={notices.length}
          detail="All announcement records"
          icon={Megaphone}
        />

        <StatCard
          title="Published"
          value={publishedCount}
          detail="Notices marked published"
          icon={CheckCircle2}
        />

        <StatCard
          title="Draft Notices"
          value={draftCount}
          detail="Unpublished announcements"
          icon={FileText}
        />

        <StatCard
          title="Urgent Notices"
          value={urgentCount}
          detail="Unexpired urgent published notices"
          icon={AlertCircle}
        />
      </section>

      {/* SEARCH & FILTER */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={19} className="text-[#234E43]" />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Notices
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              placeholder="Search notice, author or content..."
              aria-label="Search notices"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter notice category"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={audienceFilter}
            onChange={(event) => {
              setAudienceFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter audience"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Audiences</option>
            {AUDIENCES.filter((item) => item !== "All").map(
              (audience) => (
                <option key={audience} value={audience}>
                  {audience}
                </option>
              )
            )}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter notice status"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
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
          <p className="text-xs text-slate-500">
            {filteredNotices.length} matching notices
          </p>

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
              onClick={() => downloadCSV(filteredNotices)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43]"
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

      {/* NOTICES TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Notice",
                  "Category",
                  "Audience",
                  "Priority",
                  "Published / Created",
                  "Status",
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
              {visibleNotices.map((notice) => (
                <tr
                  key={notice.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-2">
                      {notice.pinned && (
                        <Pin
                          size={16}
                          className="mt-0.5 shrink-0 text-[#B18A28]"
                        />
                      )}

                      <div>
                        <p className="text-sm font-semibold text-[#234E43]">
                          {notice.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {notice.author} · {notice.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {notice.category}
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                      <Users size={15} />
                      {notice.audience}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <PriorityBadge priority={notice.priority} />
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-600">
                    {notice.publishedAt || notice.createdAt}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge
                      status={notice.status}
                      expired={isExpired(notice)}
                    />
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(notice)}
                        title="Preview notice"
                        aria-label={`Preview ${notice.title}`}
                        className="rounded-lg bg-slate-100 p-2 text-[#234E43]"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => openEdit(notice)}
                        title="Edit notice"
                        aria-label={`Edit ${notice.title}`}
                        className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43]"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => togglePin(notice)}
                        title={notice.pinned ? "Unpin notice" : "Pin notice"}
                        aria-label={`Toggle pin for ${notice.title}`}
                        className={`rounded-lg p-2 ${
                          notice.pinned
                            ? "bg-amber-100 text-amber-800"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        <Pin size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(
                            notice,
                            notice.status === "Published"
                              ? "Draft"
                              : "Published"
                          )
                        }
                        title={
                          notice.status === "Published"
                            ? "Unpublish"
                            : "Publish"
                        }
                        aria-label={`Change publication status for ${notice.title}`}
                        className="rounded-lg bg-emerald-50 p-2 text-emerald-700"
                      >
                        {notice.status === "Published" ? (
                          <Archive size={17} />
                        ) : (
                          <Send size={17} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(notice)}
                        title="Delete notice"
                        aria-label={`Delete ${notice.title}`}
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

          {visibleNotices.length === 0 && (
            <div className="py-14 text-center text-sm text-slate-500">
              No matching notices found.
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} ·{" "}
            {filteredNotices.length} notices
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

      {error && !modalOpen && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </p>
      )}

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
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2
                id="notice-form-title"
                className="text-xl font-bold text-[#234E43]"
              >
                {editingId ? "Edit Notice" : "Create Notice"}
              </h2>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close form"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Notice Title *
                </span>

                <input
                  type="text"
                  value={form.title}
                  required
                  minLength={5}
                  maxLength={180}
                  onChange={(event) =>
                    updateField("title", event.target.value)
                  }
                  placeholder="Enter notice title..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormSelect
                  label="Category"
                  value={form.category}
                  options={CATEGORIES}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                />

                <FormSelect
                  label="Target Audience"
                  value={form.audience}
                  options={AUDIENCES}
                  onChange={(event) =>
                    updateField("audience", event.target.value)
                  }
                />

                <FormSelect
                  label="Priority"
                  value={form.priority}
                  options={PRIORITIES}
                  onChange={(event) =>
                    updateField("priority", event.target.value)
                  }
                />

                <FormSelect
                  label="Publication Status"
                  value={form.status}
                  options={STATUSES}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                />

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Author / Office *
                  </span>

                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={form.author}
                    onChange={(event) =>
                      updateField("author", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Expiry Date
                  </span>

                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(event) =>
                      updateField("expiryDate", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Notice Content *
                </span>

                <textarea
                  rows={7}
                  required
                  minLength={15}
                  maxLength={5000}
                  value={form.content}
                  onChange={(event) =>
                    updateField("content", event.target.value)
                  }
                  placeholder="Write the full announcement..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#234E43]"
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl bg-[#F6F8F3] p-4">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(event) =>
                    updateField("pinned", event.target.checked)
                  }
                  className="h-4 w-4 accent-[#234E43]"
                />

                <span className="text-sm font-medium text-[#234E43]">
                  Pin this notice to the top
                </span>
              </label>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33]"
              >
                <Save size={18} />
                {editingId ? "Save Changes" : "Create Notice"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* NOTICE PREVIEW */}
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
            aria-labelledby="notice-preview-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B18A28]">
                  <Megaphone size={16} />
                  Official Notice Preview
                </p>

                <h2
                  id="notice-preview-title"
                  className="mt-3 text-2xl font-bold text-[#234E43]"
                >
                  {viewing.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close preview"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge
                status={viewing.status}
                expired={isExpired(viewing)}
              />
              <PriorityBadge priority={viewing.priority} />

              <span className="rounded-lg bg-[#F6F8F3] px-3 py-1 text-xs font-semibold text-[#234E43]">
                {viewing.category}
              </span>
            </div>

            <div className="mt-6 grid gap-3 border-y border-slate-100 py-5 text-sm text-slate-600 sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <Users size={16} />
                Audience: {viewing.audience}
              </p>

              <p className="flex items-center gap-2">
                <CalendarDays size={16} />
                Created: {viewing.createdAt}
              </p>

              <p className="flex items-center gap-2">
                <Clock3 size={16} />
                Expires: {viewing.expiryDate || "No expiry"}
              </p>

              <p className="flex items-center gap-2">
                <FileText size={16} />
                {viewing.author}
              </p>
            </div>

            <div className="mt-6 whitespace-pre-wrap break-words text-sm leading-8 text-slate-700">
              {viewing.content}
            </div>

            {viewing.pinned && (
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                <Pin size={16} />
                Pinned Notice
              </div>
            )}

            <button
              type="button"
              onClick={() => setViewing(null)}
              className="mt-7 w-full rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white"
            >
              Close Preview
            </button>
          </section>
        </div>
      )}

      {/* DEMO NOTICE */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> Notices are stored locally in this
        browser. Publishing a notice changes its demo status only;
        it is not distributed to Student or Faculty Portals yet.
        Audience selection and expiry dates are not enforced across
        different user accounts.
      </div>

      <p className="text-center text-xs text-slate-400">
        UniBee Admin Notices · Frontend Demo
      </p>
    </div>
  );
}
