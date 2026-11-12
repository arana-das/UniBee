
import { useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  Plus,
  Search,
  RefreshCw,
  Download,
  Pencil,
  Trash2,
  Eye,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock3,
  CalendarDays,
  Users,
  BookOpen,
  Bell,
  FileText,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  Star,
  Database,
} from "lucide-react";

import {
  getLibraryAnnouncements,
  createLibraryAnnouncement,
  updateLibraryAnnouncement,
  deleteLibraryAnnouncement,
} from "../../services/libraryApi";

const STORAGE_KEY = "unibee-librarian-announcements-v1";
const PAGE_SIZE = 8;

const CATEGORIES = [
  "New Book Arrival",
  "Book Availability",
  "Library Notice",
  "Borrowing Rules",
  "Return Reminder",
  "Library Hours",
  "Library Event",
  "Other",
];

const AUDIENCES = [
  "All Students",
  "Students & Faculty",
  "Faculty Only",
  "Everyone",
];

const EMPTY_FORM = {
  title: "",
  category: "Library Notice",
  audience: "All Students",
  content: "",
  publishDate: "",
  expiryDate: "",
  priority: "Normal",
  status: "Draft",
  featured: false,
};

function localToday() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function readAnnouncements() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      return {
        rows: [],
        state: "missing",
      };
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return {
        rows: [],
        state: "invalid",
      };
    }

    return {
      rows: parsed,
      state: "available",
    };
  } catch {
    return {
      rows: [],
      state: "invalid",
    };
  }
}

function createId() {
  return typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `announcement-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? `${value}T12:00:00`
      : value
  );

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function isVisibleNow(announcement) {
  const today = localToday();

  return (
    announcement.status === "Published" &&
    (!announcement.publishDate ||
      announcement.publishDate <= today) &&
    (!announcement.expiryDate ||
      announcement.expiryDate >= today)
  );
}

function getEffectiveStatus(announcement) {
  if (announcement.status === "Draft") return "Draft";

  if (announcement.status !== "Published") {
    return announcement.status || "Unknown";
  }

  const today = localToday();

  if (
    announcement.expiryDate &&
    announcement.expiryDate < today
  ) {
    return "Expired";
  }

  if (
    announcement.publishDate &&
    announcement.publishDate > today
  ) {
    return "Scheduled";
  }

  return "Published";
}

function exportCSV(filename, headers, rows) {
  function safeCell(value) {
    let text = String(value ?? "");

    if (/^\s*[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  }

  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map(safeCell).join(","))
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StatusBadge({ status }) {
  const styles = {
    Published: "bg-emerald-50 text-emerald-700",
    Draft: "bg-slate-100 text-slate-600",
    Scheduled: "bg-sky-50 text-sky-700",
    Expired: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || styles.Draft
      }`}
    >
      {status}
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}) {
  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <p className="mt-3 text-3xl font-bold text-[#234E43]">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {subtitle}
      </p>
    </article>
  );
}

function AnnouncementForm({
  form,
  setForm,
  editing,
  onSave,
  onClose,
}) {
  function update(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          editing
            ? "Edit library announcement"
            : "Create library announcement"
        }
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              {editing
                ? "Edit Announcement"
                : "Create Announcement"}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Prepare information for the university library.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close announcement form"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form
          id="librarian-announcement-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
          className="flex-1 space-y-5 overflow-y-auto p-5"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Announcement Title *
            </span>

            <input
              required
              maxLength={180}
              value={form.title}
              onChange={(event) =>
                update("title", event.target.value)
              }
              placeholder="Example: New Programming Books Available"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#234E43]"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Category *
              </span>

              <select
                value={form.category}
                onChange={(event) =>
                  update("category", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Target Audience *
              </span>

              <select
                value={form.audience}
                onChange={(event) =>
                  update("audience", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              >
                {AUDIENCES.map((audience) => (
                  <option key={audience} value={audience}>
                    {audience}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Publish Date
              </span>

              <input
                type="date"
                value={form.publishDate}
                onChange={(event) =>
                  update("publishDate", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Expiry Date
              </span>

              <input
                type="date"
                value={form.expiryDate}
                min={form.publishDate || undefined}
                onChange={(event) =>
                  update("expiryDate", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Priority
              </span>

              <select
                value={form.priority}
                onChange={(event) =>
                  update("priority", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              >
                <option value="Normal">Normal</option>
                <option value="Important">Important</option>
                <option value="Urgent">Urgent</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Publication Status
              </span>

              <select
                value={form.status}
                onChange={(event) =>
                  update("status", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              >
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Announcement Content *
            </span>

            <textarea
              required
              rows={8}
              maxLength={6000}
              value={form.content}
              onChange={(event) =>
                update("content", event.target.value)
              }
              placeholder="Write the announcement details..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-[#234E43]"
            />

            <span className="mt-1 block text-right text-xs text-slate-400">
              {form.content.length} / 6000
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-4">
            <input
              type="checkbox"
              checked={Boolean(form.featured)}
              onChange={(event) =>
                update("featured", event.target.checked)
              }
              className="mt-1 h-4 w-4 accent-[#234E43]"
            />

            <div>
              <p className="text-sm font-semibold text-[#234E43]">
                Featured Announcement
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Highlight this announcement in future
                Student Library integration.
              </p>
            </div>
          </label>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            Setting the status to Published saves the
            announcement as published data. It does not
            send an email, push notification, or message
            to other devices in this frontend demo.
          </div>
        </form>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="librarian-announcement-form"
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
          >
            <Save size={17} />
            Save Announcement
          </button>
        </div>
      </div>
    </div>
  );
}

function AnnouncementPreview({
  announcement,
  onClose,
  onEdit,
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Announcement preview"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl md:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            UniBee Library Announcement
          </p>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <h2 className="mt-4 text-2xl font-bold text-[#234E43]">
          {announcement.title}
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge
            status={getEffectiveStatus(announcement)}
          />

          <span className="rounded-full bg-[#F6F8F3] px-3 py-1 text-xs font-semibold text-[#234E43]">
            {announcement.category}
          </span>

          {announcement.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <Star size={12} />
              Featured
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-3 rounded-xl bg-[#F6F8F3] p-4 text-xs text-slate-600 sm:grid-cols-2">
          <p>
            <strong>Audience:</strong> {announcement.audience}
          </p>

          <p>
            <strong>Priority:</strong> {announcement.priority}
          </p>

          <p>
            <strong>Publish Date:</strong>{" "}
            {formatDate(announcement.publishDate)}
          </p>

          <p>
            <strong>Expiry Date:</strong>{" "}
            {formatDate(announcement.expiryDate)}
          </p>
        </div>

        <div className="mt-6 whitespace-pre-wrap break-words text-sm leading-8 text-slate-700">
          {announcement.content}
        </div>

        <div className="mt-7 border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-400">
            Created: {formatDate(announcement.createdAt)}
          </p>

          <button
            type="button"
            onClick={onEdit}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
          >
            <Pencil size={17} />
            Edit Announcement
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LibrarianAnnouncements() {
  const [source, setSource] = useState({
  rows: [],
  state: "loading",
});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [viewingId, setViewingId] = useState(null);

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  
  // ========================================
  // LOAD LIBRARY ANNOUNCEMENTS FROM MONGODB
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadAnnouncements() {
      try {
        const data = await getLibraryAnnouncements();

        if (!active) return;

        setSource({
  rows: (Array.isArray(data) ? data : []).map(
    (item) => ({
      ...item,
      id: String(item._id || item.id),
      priority:
        item.priority === "High"
          ? "Important"
          : item.priority,
    })
  ),
  state: "available",
});

        setError("");
      } catch (err) {
        if (!active) return;

        setSource({
          rows: [],
          state: "invalid",
        });

        setError(
          err.message ||
          "Could not load announcements from MongoDB."
        );
      }
    }

    loadAnnouncements();

    return () => {
      active = false;
    };
  }, []);


  const announcements = source.rows;

  const selectedAnnouncement = announcements.find(
    (item) => item.id === viewingId
  );

  const stats = useMemo(
    () => ({
      total: announcements.length,
      published: announcements.filter(isVisibleNow).length,
      drafts: announcements.filter(
        (item) => item.status === "Draft"
      ).length,
      scheduled: announcements.filter(
        (item) => getEffectiveStatus(item) === "Scheduled"
      ).length,
      expired: announcements.filter(
        (item) => getEffectiveStatus(item) === "Expired"
      ).length,
    }),
    [announcements]
  );

  const filteredAnnouncements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...announcements]
      .filter((item) => {
        const matchesSearch = [
          item.title,
          item.content,
          item.category,
          item.audience,
          item.id,
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

        const matchesStatus =
          statusFilter === "All" ||
          getEffectiveStatus(item) === statusFilter;

        const matchesCategory =
          categoryFilter === "All" ||
          item.category === categoryFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesCategory
        );
      })
      .sort((a, b) =>
        String(b.updatedAt || b.createdAt || "").localeCompare(
          String(a.updatedAt || a.createdAt || "")
        )
      );
  }, [
    announcements,
    search,
    statusFilter,
    categoryFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAnnouncements.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  
  async function refreshData() {
    try {
      setError("");

      const data = await getLibraryAnnouncements();

      setSource({
        rows: data.map((announcement) => ({
          ...announcement,
          id: String(announcement._id || announcement.id),
          priority:
            announcement.priority === "High"
              ? "Important"
              : announcement.priority,
        })),
        state: "available",
      });

      setFeedback("Announcements refreshed from MongoDB.");
    } catch (err) {
      setError(err.message || "Could not refresh announcements.");
    }
  }


  function persist(next, message) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      setSource({
        rows: next,
        state: "available",
      });

      setFeedback(message);
      setError("");
      return true;
    } catch {
      setError("Unable to save announcements.");
      setFeedback("");
      return false;
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      publishDate: localToday(),
    });
    setFormOpen(true);
    setError("");
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      ...EMPTY_FORM,
      ...item,
    });
    setViewingId(null);
    setFormOpen(true);
    setError("");
  }

  
  async function saveAnnouncement() {
    const title = String(form.title || "").trim();
    const content = String(form.content || "").trim();

    setError("");
    setFeedback("");

    if (!title || !content) {
      setError("Announcement title and content are required.");
      return;
    }

    if (
      !CATEGORIES.includes(form.category) ||
      !AUDIENCES.includes(form.audience) ||
      !["Normal", "Important", "Urgent"].includes(form.priority) ||
      !["Draft", "Published"].includes(form.status)
    ) {
      setError("Select valid announcement settings.");
      return;
    }

    if (
      form.publishDate &&
      form.expiryDate &&
      form.expiryDate < form.publishDate
    ) {
      setError(
        "Expiry date cannot be earlier than the publish date."
      );
      return;
    }

    const record = {
      title,
      content,
      category: form.category,
      audience: form.audience,
      publishDate: form.publishDate || "",
      expiryDate: form.expiryDate || "",
      priority:
        form.priority === "Important"
          ? "High"
          : form.priority,
      status: form.status,
      featured: Boolean(form.featured),
    };

    try {
      if (editingId) {
        await updateLibraryAnnouncement(editingId, record);
      } else {
        await createLibraryAnnouncement(record);
      }

      const data = await getLibraryAnnouncements();

      setSource({
        rows: (Array.isArray(data) ? data : []).map(
          (item) => ({
            ...item,
            id: String(item._id || item.id),
            priority:
              item.priority === "High"
                ? "Important"
                : item.priority,
          })
        ),
        state: "available",
      });

      setFeedback(
        editingId
          ? "Announcement updated in MongoDB."
          : "Announcement saved to MongoDB."
      );

      setFormOpen(false);
      setEditingId(null);
      setPage(1);
    } catch (err) {
      setError(
        err.message ||
        "Could not save announcement to MongoDB."
      );
      setFeedback("");
    }
  }


  
  async function changeStatus(item) {
    const nextStatus =
      item.status === "Published" ? "Draft" : "Published";

    if (
      !window.confirm(
        `${nextStatus === "Published" ? "Publish" : "Move to draft"} "${item.title}"?`
      )
    ) {
      return;
    }

    try {
      setError("");
      setFeedback("");

      await updateLibraryAnnouncement(item.id, {
        status: nextStatus,
        publishDate:
          nextStatus === "Published" && !item.publishDate
            ? localToday()
            : item.publishDate,
      });

      const data = await getLibraryAnnouncements();

      setSource({
        rows: data.map((announcement) => ({
          ...announcement,
          id: String(announcement._id || announcement.id),
          priority:
            announcement.priority === "High"
              ? "Important"
              : announcement.priority,
        })),
        state: "available",
      });

      setFeedback(
        `Announcement status changed to ${nextStatus} in MongoDB.`
      );
    } catch (err) {
      setError(
        err.message || "Could not update announcement status."
      );
    }
  }

  

  
  async function deleteAnnouncement(item) {
    if (
      !window.confirm(
        `Permanently delete "${item.title}"?`
      )
    ) {
      return;
    }

    try {
      setError("");
      setFeedback("");

      await deleteLibraryAnnouncement(item.id);

      const data = await getLibraryAnnouncements();

      setSource({
        rows: data.map((announcement) => ({
          ...announcement,
          id: String(announcement._id || announcement.id),
          priority:
            announcement.priority === "High"
              ? "Important"
              : announcement.priority,
        })),
        state: "available",
      });

      setViewingId(null);
      setFeedback("Announcement deleted from MongoDB.");
    } catch (err) {
      setError(
        err.message || "Could not delete announcement."
      );
    }
  }


  function downloadAnnouncements() {
    exportCSV(
      "UniBee_Library_Announcements.csv",
      [
        "ID",
        "Title",
        "Category",
        "Audience",
        "Priority",
        "Status",
        "Effective Status",
        "Featured",
        "Publish Date",
        "Expiry Date",
        "Content",
        "Created",
        "Updated",
      ],
      filteredAnnouncements.map((item) => [
        item.id,
        item.title,
        item.category,
        item.audience,
        item.priority,
        item.status,
        getEffectiveStatus(item),
        item.featured ? "Yes" : "No",
        item.publishDate,
        item.expiryDate,
        item.content,
        item.createdAt,
        item.updatedAt,
      ])
    );

    setFeedback("Announcements exported as CSV.");
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Library Communication
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Library Announcements
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage library updates, book arrival announcements,
            borrowing rules and student notices.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={downloadAnnouncements}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
          >
            <Plus size={18} />
            New Announcement
          </button>
        </div>
      </section>

      {/* DATA STATUS */}
      {source.state !== "available" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
          <Database size={19} className="mt-0.5 shrink-0" />

          <p>
            No valid saved announcement records are available.
            Create a new announcement to start the library
            communication system.
          </p>
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </p>
      )}

      {/* KPI CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Total Notices"
          value={stats.total}
          subtitle="All library announcements"
          icon={Megaphone}
        />

        <MetricCard
          title="Currently Visible"
          value={stats.published}
          subtitle="Published, within display dates"
          icon={CheckCircle2}
        />

        <MetricCard
          title="Drafts"
          value={stats.drafts}
          subtitle="Not yet published"
          icon={FileText}
        />

        <MetricCard
          title="Scheduled"
          value={stats.scheduled}
          subtitle="Published with future start dates"
          icon={CalendarDays}
        />

        <MetricCard
          title="Expired"
          value={stats.expired}
          subtitle="Past their expiry dates"
          icon={Clock3}
        />
      </section>

      {/* PUBLICATION EXPLANATION */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#234E43] p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 p-3 text-[#D9A536]">
            <Bell size={24} />
          </div>

          <div>
            <p className="text-sm font-bold">
              Student Library Communication
            </p>

            <p className="mt-1 max-w-xl text-xs leading-6 text-white/75">
              Published announcements will be shown in the
              Student Library interface after integration.
              Draft, expired and future-dated announcements
              will remain hidden until eligible.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="rounded-xl bg-[#D9A536] px-4 py-3 text-sm font-bold text-[#234E43]"
        >
          Create Announcement
        </button>
      </section>

      {/* ANNOUNCEMENT LIST */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#234E43]">
                Announcement Management
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Review, publish, edit and organize notices
              </p>
            </div>

            <span className="rounded-full bg-[#F6F8F3] px-3 py-1.5 text-xs font-semibold text-[#234E43]">
              {filteredAnnouncements.length} Records
            </span>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_190px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search announcements..."
                aria-label="Search announcements"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter publication status"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Expired">Expired</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter announcement category"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="All">All Categories</option>

              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Announcement",
                  "Category",
                  "Audience",
                  "Priority",
                  "Publish Date",
                  "Expiry",
                  "Status",
                  "Actions",
                ].map((label) => (
                  <th
                    key={label}
                    className="px-4 py-4 font-semibold"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleAnnouncements.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-[#A6C1A4]/20 p-3 text-[#234E43]">
                        <Megaphone size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-[240px] truncate text-sm font-bold text-[#234E43]">
                          {item.title}
                        </p>

                        <p className="mt-1 max-w-[240px] truncate text-xs text-slate-500">
                          {item.content}
                        </p>

                        {item.featured && (
                          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                            <Star size={12} />
                            Featured
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-600">
                    {item.category}
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-600">
                    {item.audience}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`text-xs font-semibold ${
                        item.priority === "Urgent"
                          ? "text-rose-700"
                          : item.priority === "Important"
                          ? "text-amber-700"
                          : "text-slate-600"
                      }`}
                    >
                      {item.priority}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-600">
                    {formatDate(item.publishDate)}
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-600">
                    {formatDate(item.expiryDate)}
                  </td>

                  <td className="px-4 py-4">
                    <StatusBadge
                      status={getEffectiveStatus(item)}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        title="Preview announcement"
                        aria-label={`View ${item.title}`}
                        onClick={() => setViewingId(item.id)}
                        className="rounded-lg bg-[#F6F8F3] p-2 text-[#234E43]"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        title="Edit announcement"
                        aria-label={`Edit ${item.title}`}
                        onClick={() => openEdit(item)}
                        className="rounded-lg bg-sky-50 p-2 text-sky-700"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        title={
                          item.status === "Published"
                            ? "Move to draft"
                            : "Publish announcement"
                        }
                        aria-label={`Change publication status of ${item.title}`}
                        onClick={() => changeStatus(item)}
                        className="rounded-lg bg-emerald-50 p-2 text-emerald-700"
                      >
                        {item.status === "Published" ? (
                          <RotateCcw size={16} />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>

                      <button
                        type="button"
                        title="Delete announcement"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => deleteAnnouncement(item)}
                        className="rounded-lg bg-rose-50 p-2 text-rose-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visibleAnnouncements.length === 0 && (
            <div className="flex flex-col items-center justify-center p-14 text-center">
              <Megaphone
                size={34}
                className="text-[#A6C1A4]"
              />

              <p className="mt-3 text-sm font-semibold text-[#234E43]">
                No announcements found
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Create an announcement or change your filters.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} ·{" "}
            {filteredAnnouncements.length} announcements
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

      {/* FRONTEND NOTICE */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> Announcements are stored
        only in this browser's LocalStorage. Student Library
        integration will read published records that match
        the current date and intended audience. No real
        email, SMS or push notification is sent.
      </div>

      {/* CREATE / EDIT */}
      {formOpen && (
        <AnnouncementForm
          form={form}
          setForm={setForm}
          editing={Boolean(editingId)}
          onSave={saveAnnouncement}
          onClose={() => {
            setFormOpen(false);
            setEditingId(null);
          }}
        />
      )}

      {/* PREVIEW */}
      {selectedAnnouncement && (
        <AnnouncementPreview
          announcement={selectedAnnouncement}
          onClose={() => setViewingId(null)}
          onEdit={() => openEdit(selectedAnnouncement)}
        />
      )}
    </div>
  );
}
