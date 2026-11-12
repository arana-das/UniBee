
import { useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  Building2,
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
  FileText,
  Send,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ========================================
// CONFIGURATION
// ========================================

const KEYS = {
  departments: "unibee-admin-departments-v1",
  notices: "unibee-hod-department-notices-v1",
  selectedDepartment:
    "unibee-hod-selected-department-v1",
};

const PAGE_SIZE = 8;

const AUDIENCES = [
  "All Department Members",
  "Department Students",
  "Department Faculty",
];

const CATEGORIES = [
  "Academic",
  "Examination",
  "Class Schedule",
  "Attendance",
  "Research",
  "Administrative",
  "General",
];

const PRIORITIES = ["Normal", "Important", "Urgent"];

const EMPTY_FORM = {
  title: "",
  content: "",
  category: "Academic",
  audience: "All Department Members",
  priority: "Normal",
  status: "Draft",
  publishDate: "",
  expiryDate: "",
  pinned: false,
};

// ========================================
// STORAGE HELPERS
// ========================================

function readArray(key) {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return { rows: [], status: "missing" };
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? { rows: parsed, status: "available" }
      : { rows: [], status: "invalid" };
  } catch {
    return { rows: [], status: "invalid" };
  }
}

function loadData() {
  return {
    departments: readArray(KEYS.departments),
    notices: readArray(KEYS.notices),
  };
}

function readDepartment() {
  try {
    return (
      localStorage.getItem(KEYS.selectedDepartment) ||
      ""
    );
  } catch {
    return "";
  }
}

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `hod-notice-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function text(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return text(value).toLowerCase();
}

function first(...values) {
  return (
    values.find(
      (item) =>
        item !== null &&
        item !== undefined &&
        text(item) !== ""
    ) ?? ""
  );
}

function departmentInfo(row, index) {
  return {
    id: text(
      first(row.id, row._id, row.code, `dept-${index}`)
    ),
    name: text(
      first(
        row.name,
        row.departmentName,
        row.title,
        row.code,
        "Unnamed Department"
      )
    ),
    code: text(row.code),
  };
}

function belongsToDepartment(row, department) {
  if (!department || !row) return false;

  const expected = [
    department.id,
    department.name,
    department.code,
  ]
    .map(norm)
    .filter(Boolean);

  return [
    row.departmentId,
    row.departmentName,
    row.departmentCode,
    row.department,
  ].some((field) => {
    const values =
      field && typeof field === "object"
        ? [
            field.id,
            field._id,
            field.name,
            field.code,
          ]
        : [field];

    return values.some((item) =>
      expected.includes(norm(item))
    );
  });
}

function today() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";

  const input = text(value);

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(input)
      ? `${input}T12:00:00`
      : input
  );

  return Number.isNaN(date.getTime())
    ? input
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function noticeStatus(row) {
  if (row.status !== "Published") {
    return "Draft";
  }

  const currentDate = today();

  if (
    row.publishDate &&
    row.publishDate > currentDate
  ) {
    return "Scheduled";
  }

  if (
    row.expiryDate &&
    row.expiryDate < currentDate
  ) {
    return "Expired";
  }

  return "Published";
}

function csvExport(filename, headers, rows) {
  function safeCell(value) {
    let content = String(value ?? "");

    if (/^\s*[=+\-@\t\r]/.test(content)) {
      content = "'" + content;
    }

    return `"${content.replace(/"/g, '""')}"`;
  }

  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) =>
        row.map(safeCell).join(",")
      )
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}

// ========================================
// COMPONENTS
// ========================================

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

          <p className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-3 text-xs text-[#718579]">
        {subtitle}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Published:
      "bg-emerald-50 text-emerald-700",
    Draft:
      "bg-slate-100 text-slate-600",
    Scheduled:
      "bg-sky-50 text-sky-700",
    Expired:
      "bg-amber-50 text-amber-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
        styles[status] || styles.Draft
      }`}
    >
      {status}
    </span>
  );
}

function NoticeFormModal({
  form,
  setForm,
  editing,
  error,
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
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hod-notice-form-title"
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E2EADC] p-5">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#B18B37]">
              DEPARTMENT COMMUNICATION
            </p>

            <h2
              id="hod-notice-form-title"
              className="mt-2 text-xl font-extrabold text-[#234E43]"
            >
              {editing
                ? "Edit Department Notice"
                : "Create Department Notice"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close notice form"
            className="rounded-xl p-2 hover:bg-[#F6F8F3]"
          >
            <X size={21} />
          </button>
        </div>

        <form
          id="hod-notice-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
          className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2"
        >
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Notice Title *
            </span>

            <input
              required
              maxLength={180}
              value={form.title}
              onChange={(event) =>
                update("title", event.target.value)
              }
              placeholder="Example: Midterm Examination Schedule"
              className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm outline-none focus:border-[#A6C1A4]"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Notice Content *
            </span>

            <textarea
              required
              rows={6}
              maxLength={5000}
              value={form.content}
              onChange={(event) =>
                update("content", event.target.value)
              }
              placeholder="Write the notice details..."
              className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm leading-6 outline-none focus:border-[#A6C1A4]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Category
            </span>

            <select
              value={form.category}
              onChange={(event) =>
                update("category", event.target.value)
              }
              className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
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
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Audience
            </span>

            <select
              value={form.audience}
              onChange={(event) =>
                update("audience", event.target.value)
              }
              className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
            >
              {AUDIENCES.map((audience) => (
                <option
                  key={audience}
                  value={audience}
                >
                  {audience}
                </option>
              ))}
            </select>
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
              className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
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
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Status
            </span>

            <select
              value={form.status}
              onChange={(event) =>
                update("status", event.target.value)
              }
              className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
            >
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
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
              className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Expiry Date (Optional)
            </span>

            <input
              type="date"
              value={form.expiryDate}
              onChange={(event) =>
                update("expiryDate", event.target.value)
              }
              className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl bg-[#F6F8F3] p-4 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(event) =>
                update("pinned", event.target.checked)
              }
              className="h-4 w-4 accent-[#234E43]"
            />

            <span className="text-sm font-semibold text-[#234E43]">
              Pin this notice to the top
            </span>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 sm:col-span-2"
            >
              {error}
            </p>
          )}
        </form>

        <div className="flex shrink-0 justify-end gap-3 border-t border-[#E2EADC] p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E2EADC] px-5 py-3 text-sm font-bold text-[#234E43]"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="hod-notice-form"
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white"
          >
            <Save size={17} />
            Save Notice
          </button>
        </div>
      </section>
    </div>
  );
}

function NoticeDetailsModal({ notice, onClose }) {
  if (!notice) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hod-notice-details-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#B18B37]">
              DEPARTMENT ANNOUNCEMENT
            </p>

            <h2
              id="hod-notice-details-title"
              className="mt-2 text-xl font-extrabold text-[#234E43]"
            >
              {notice.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close notice details"
            className="rounded-xl p-2 hover:bg-[#F6F8F3]"
          >
            <X size={21} />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <StatusBadge
            status={noticeStatus(notice)}
          />

          <span className="rounded-full bg-[#EAF2E8] px-3 py-1.5 text-xs font-bold text-[#234E43]">
            {notice.category}
          </span>

          <span className="rounded-full bg-[#F6F8F3] px-3 py-1.5 text-xs font-semibold text-[#607B6C]">
            {notice.priority}
          </span>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl bg-[#F6F8F3] p-5 text-sm sm:grid-cols-2">
          {[
            ["Department", notice.departmentName],
            ["Audience", notice.audience],
            ["Publish Date", formatDate(notice.publishDate)],
            ["Expiry Date", formatDate(notice.expiryDate)],
            ["Created", formatDate(notice.createdAt)],
            ["Updated", formatDate(notice.updatedAt)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-[#718579]">
                {label}
              </p>

              <p className="mt-1 font-semibold text-[#234E43]">
                {value || "—"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h3 className="font-bold text-[#234E43]">
            Notice Content
          </h3>

          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#607B6C]">
            {notice.content}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 w-full rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white"
        >
          Close
        </button>
      </section>
    </div>
  );
}

// ========================================
// MAIN PAGE
// ========================================

export default function HODNotices() {
  const [data, setData] = useState(loadData);
  const [departmentId, setDepartmentId] =
    useState(readDepartment);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");
  const [audienceFilter, setAudienceFilter] =
    useState("All");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
  });

  const [viewId, setViewId] = useState(null);

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  // ======================================
  // REFRESH
  // ======================================

  useEffect(() => {
    function refresh() {
      setData(loadData());
      setDepartmentId(readDepartment());
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("storage", refresh);
    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.removeEventListener("storage", refresh);
      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  // ======================================
  // DEPARTMENT DATA
  // ======================================

  const departments = useMemo(
    () =>
      data.departments.rows.map((row, index) =>
        departmentInfo(row, index)
      ),
    [data.departments.rows]
  );

  const department = departments.find(
    (item) => item.id === departmentId
  );

  const allNotices = data.notices.rows;

  const departmentNotices = useMemo(
    () =>
      allNotices.filter((notice) =>
        belongsToDepartment(notice, department)
      ),
    [allNotices, department]
  );

  const ready =
    Boolean(department) &&
    data.notices.status !== "invalid";

  // ======================================
  // STATISTICS
  // ======================================

  const published = departmentNotices.filter(
    (item) =>
      noticeStatus(item) === "Published"
  ).length;

  const drafts = departmentNotices.filter(
    (item) => noticeStatus(item) === "Draft"
  ).length;

  const scheduled = departmentNotices.filter(
    (item) => noticeStatus(item) === "Scheduled"
  ).length;

  const stats = [
    {
      title: "Total Notices",
      value: ready
        ? departmentNotices.length
        : "—",
      icon: Megaphone,
      subtitle: "All department notices",
    },
    {
      title: "Published",
      value: ready ? published : "—",
      icon: Send,
      subtitle: "Currently effective notices",
    },
    {
      title: "Drafts",
      value: ready ? drafts : "—",
      icon: FileText,
      subtitle: "Not yet published",
    },
    {
      title: "Scheduled",
      value: ready ? scheduled : "—",
      icon: CalendarDays,
      subtitle: "Future publication dates",
    },
  ];

  // ======================================
  // SEARCH AND FILTERS
  // ======================================

  const filtered = useMemo(() => {
    const query = norm(search);

    return departmentNotices
      .filter((notice) => {
        const matchesSearch = [
          notice.title,
          notice.content,
          notice.category,
          notice.audience,
        ].some((item) =>
          norm(item).includes(query)
        );

        const matchesStatus =
          statusFilter === "All" ||
          noticeStatus(notice) === statusFilter;

        const matchesAudience =
          audienceFilter === "All" ||
          notice.audience === audienceFilter;

        return (
          matchesSearch &&
          matchesStatus &&
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
    departmentNotices,
    search,
    statusFilter,
    audienceFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(
    page,
    totalPages
  );

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const selectedNotice = departmentNotices.find(
    (item) => text(item.id) === viewId
  );

  // ======================================
  // SAVE HELPERS
  // ======================================

  function persist(next, message) {
    try {
      localStorage.setItem(
        KEYS.notices,
        JSON.stringify(next)
      );

      setData((previous) => ({
        ...previous,
        notices: {
          rows: next,
          status: "available",
        },
      }));

      setError("");
      setFeedback(message);

      return true;
    } catch {
      setError(
        "Unable to save department notices. Check browser storage."
      );

      return false;
    }
  }

  // ======================================
  // ACTIONS
  // ======================================

  function changeDepartment(id) {
    setDepartmentId(id);
    setSearch("");
    setStatusFilter("All");
    setAudienceFilter("All");
    setPage(1);
    setFormOpen(false);
    setViewId(null);
    setEditingId(null);
    setError("");
    setFeedback("");

    try {
      if (id) {
        localStorage.setItem(
          KEYS.selectedDepartment,
          id
        );
      } else {
        localStorage.removeItem(
          KEYS.selectedDepartment
        );
      }
    } catch {
      setError(
        "Could not save department selection."
      );
    }
  }

  function refreshData() {
    setData(loadData());
    setDepartmentId(readDepartment());
    setFeedback("Department notices refreshed.");
    setError("");
  }

  function openAdd() {
    if (!ready) return;

    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      publishDate: today(),
    });
    setError("");
    setFormOpen(true);
  }

  function openEdit(notice) {
    if (!ready) return;

    setEditingId(text(notice.id));

    setForm({
      title: text(notice.title),
      content: text(notice.content),
      category: notice.category || "Academic",
      audience:
        notice.audience ||
        "All Department Members",
      priority: notice.priority || "Normal",
      status:
        notice.status === "Published"
          ? "Published"
          : "Draft",
      publishDate: notice.publishDate || "",
      expiryDate: notice.expiryDate || "",
      pinned: Boolean(notice.pinned),
    });

    setError("");
    setFormOpen(true);
  }

  function saveNotice() {
    if (!ready) {
      setError("Select a valid department first.");
      return;
    }

    const title = text(form.title);
    const content = text(form.content);

    if (!title || !content) {
      setError("Notice title and content are required.");
      return;
    }

    if (
      form.publishDate &&
      form.expiryDate &&
      form.expiryDate < form.publishDate
    ) {
      setError(
        "Expiry date cannot be before the publish date."
      );
      return;
    }

    if (
      !AUDIENCES.includes(form.audience) ||
      !CATEGORIES.includes(form.category) ||
      !PRIORITIES.includes(form.priority) ||
      !["Draft", "Published"].includes(form.status)
    ) {
      setError("Please choose valid notice settings.");
      return;
    }

    const latest = readArray(KEYS.notices);

    if (latest.status === "invalid") {
      setError("Stored notice data is invalid.");
      return;
    }

    const previous = editingId
      ? latest.rows.find(
          (row) =>
            text(row.id) === editingId &&
            belongsToDepartment(row, department)
        )
      : null;

    if (editingId && !previous) {
      setError(
        "This notice is no longer available. Refresh the page."
      );
      return;
    }

    const now = new Date().toISOString();

    const record = {
      ...previous,
      id: editingId || makeId(),
      departmentId: department.id,
      departmentName: department.name,
      departmentCode: department.code,
      title,
      content,
      category: form.category,
      audience: form.audience,
      priority: form.priority,
      status: form.status,
      publishDate:
        form.publishDate ||
        (form.status === "Published" ? today() : ""),
      expiryDate: form.expiryDate,
      pinned: Boolean(form.pinned),
      createdAt: previous?.createdAt || now,
      updatedAt: now,
      source: "HOD",
    };

    const next = editingId
      ? latest.rows.map((row) =>
          text(row.id) === editingId
            ? record
            : row
        )
      : [record, ...latest.rows];

    if (
      persist(
        next,
        editingId
          ? "Department notice updated."
          : "Department notice created."
      )
    ) {
      setFormOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
    }
  }

  function togglePublish(notice) {
    if (!ready) return;

    const latest = readArray(KEYS.notices);

    if (latest.status === "invalid") {
      setError("Stored notice data is invalid.");
      return;
    }

    const current = latest.rows.find(
      (row) =>
        text(row.id) === text(notice.id) &&
        belongsToDepartment(row, department)
    );

    if (!current) {
      setError("Notice not found. Refresh the page.");
      return;
    }

    const publishing =
      current.status !== "Published";

    const now = new Date().toISOString();

    const next = latest.rows.map((row) =>
      text(row.id) === text(current.id)
        ? {
            ...row,
            status: publishing
              ? "Published"
              : "Draft",
            publishDate:
              publishing &&
              (!row.publishDate ||
                row.publishDate < today() ||
                (row.expiryDate &&
                  row.expiryDate < today()))
                ? today()
                : row.publishDate,
            expiryDate:
              publishing &&
              row.expiryDate &&
              row.expiryDate < today()
                ? ""
                : row.expiryDate,
            updatedAt: now,
          }
        : row
    );

    persist(
      next,
      publishing
        ? "Notice published."
        : "Notice moved to drafts."
    );
  }

  function deleteNotice(notice) {
    if (!ready) return;

    if (
      !window.confirm(
        `Delete the notice "${notice.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    const latest = readArray(KEYS.notices);

    if (latest.status === "invalid") {
      setError("Stored notice data is invalid.");
      return;
    }

    const exists = latest.rows.some(
      (row) =>
        text(row.id) === text(notice.id) &&
        belongsToDepartment(row, department)
    );

    if (!exists) {
      setError("Notice not found. Refresh the page.");
      return;
    }

    persist(
      latest.rows.filter(
        (row) =>
          text(row.id) !== text(notice.id)
      ),
      "Department notice deleted."
    );
  }

  function exportNotices() {
    if (!ready) return;

    csvExport(
      "UniBee_HOD_Department_Notices.csv",
      [
        "Title",
        "Department",
        "Category",
        "Audience",
        "Priority",
        "Status",
        "Publish Date",
        "Expiry Date",
        "Pinned",
        "Content",
      ],
      filtered.map((notice) => [
        notice.title,
        notice.departmentName,
        notice.category,
        notice.audience,
        notice.priority,
        noticeStatus(notice),
        notice.publishDate,
        notice.expiryDate,
        notice.pinned ? "Yes" : "No",
        notice.content,
      ])
    );

    setFeedback("Notice report exported.");
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
            DEPARTMENT COMMUNICATION
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Department Notices
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Create announcements, manage publication,
            and communicate with department members.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportNotices}
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={openAdd}
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            <Plus size={18} />
            Create Notice
          </button>
        </div>
      </section>

      {/* DEPARTMENT SELECTOR */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
            <Building2 size={22} />
          </div>

          <div>
            <h2 className="font-bold text-[#234E43]">
              Active Department
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Notices are managed within this department.
            </p>
          </div>
        </div>

        <select
          aria-label="Select HOD department"
          value={department ? departmentId : ""}
          onChange={(event) =>
            changeDepartment(event.target.value)
          }
          disabled={
            data.departments.status !== "available"
          }
          className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72"
        >
          <option value="">
            Select Department
          </option>

          {departments.map((item) => (
            <option
              key={item.id}
              value={item.id}
            >
              {item.name}
            </option>
          ))}
        </select>
      </section>

      {/* MESSAGES */}
      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </div>
      )}

      {error && !formOpen && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {!ready && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle
            size={18}
            className="mr-2 inline"
          />
          Select a valid Admin department to manage
          notices. Existing notice storage must also
          be readable.
        </div>
      )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard
            key={item.title}
            {...item}
          />
        ))}
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <h2 className="font-bold text-[#234E43]">
          Search & Filter Notices
        </h2>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_230px]">
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
              placeholder="Search title, content, category..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-4 text-sm"
            />
          </div>

          <select
            aria-label="Filter notice status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Expired">Expired</option>
          </select>

          <select
            aria-label="Filter notice audience"
            value={audienceFilter}
            onChange={(event) => {
              setAudienceFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-[#E2EADC] bg-white px-3 py-3 text-sm"
          >
            <option value="All">All Audiences</option>

            {AUDIENCES.map((audience) => (
              <option
                key={audience}
                value={audience}
              >
                {audience}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* NOTICE LIST */}
      <section className="overflow-hidden rounded-2xl border border-[#E2EADC] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              Department Notice Directory
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Draft, scheduled and published announcements
            </p>
          </div>

          <span className="rounded-full bg-[#F6F8F3] px-3 py-2 text-xs font-bold text-[#234E43]">
            {ready ? filtered.length : 0} Notices
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
              <tr>
                {[
                  "Notice",
                  "Audience",
                  "Priority",
                  "Publish Date",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EDF1EB]">
              {ready &&
                visible.map((notice) => (
                  <tr
                    key={notice.id}
                    className="hover:bg-[#F9FBF8]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                          <Megaphone size={19} />
                        </div>

                        <div className="max-w-sm">
                          <p className="text-sm font-bold text-[#234E43]">
                            {notice.title}
                          </p>

                          <p className="mt-1 text-xs text-[#718579]">
                            {notice.category}
                            {notice.pinned
                              ? " · Pinned"
                              : ""}
                          </p>

                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#8AA092]">
                            {notice.content}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {notice.audience}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          notice.priority === "Urgent"
                            ? "bg-rose-50 text-rose-700"
                            : notice.priority === "Important"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-[#F6F8F3] text-[#607B6C]"
                        }`}
                      >
                        {notice.priority}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#607B6C]">
                      {formatDate(notice.publishDate)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={noticeStatus(notice)}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          title="View Notice"
                          aria-label={`View ${notice.title}`}
                          onClick={() =>
                            setViewId(text(notice.id))
                          }
                          className="rounded-lg bg-[#EAF2E8] p-2 text-[#234E43]"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          title="Edit Notice"
                          aria-label={`Edit ${notice.title}`}
                          onClick={() =>
                            openEdit(notice)
                          }
                          className="rounded-lg bg-sky-50 p-2 text-sky-700"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          title={
                            notice.status === "Published"
                              ? "Move to Draft"
                              : "Publish"
                          }
                          aria-label={`Change publication status for ${notice.title}`}
                          onClick={() =>
                            togglePublish(notice)
                          }
                          className="rounded-lg bg-amber-50 p-2 text-amber-800"
                        >
                          {notice.status === "Published" ? (
                            <FileText size={17} />
                          ) : (
                            <Send size={17} />
                          )}
                        </button>

                        <button
                          type="button"
                          title="Delete Notice"
                          aria-label={`Delete ${notice.title}`}
                          onClick={() =>
                            deleteNotice(notice)
                          }
                          className="rounded-lg bg-rose-50 p-2 text-rose-700"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {(!ready || visible.length === 0) && (
            <div className="py-14 text-center">
              <Megaphone
                size={38}
                className="mx-auto text-[#A6C1A4]"
              />

              <p className="mt-4 font-bold text-[#234E43]">
                No Department Notices Found
              </p>

              <p className="mt-2 text-sm text-[#718579]">
                Create a notice or change the selected filters.
              </p>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between gap-3 border-t border-[#EDF1EB] p-5">
          <p className="text-xs text-[#718579]">
            Page {currentPage} of {totalPages}
            {" · "}
            {filtered.length} notices
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() =>
                setPage(currentPage - 1)
              }
              aria-label="Previous page"
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={
                currentPage === totalPages
              }
              onClick={() =>
                setPage(currentPage + 1)
              }
              aria-label="Next page"
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* PUBLISHING SUMMARY */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Users
            size={20}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Department Communication
          </h2>
        </div>

        <p className="mt-3 text-sm leading-7 text-[#718579]">
          Department notices can target all department
          members, students only, or faculty only.
          Published notices will become visible in
          their respective portals once the shared
          notice feeds are integrated.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {AUDIENCES.map((audience) => (
            <div
              key={audience}
              className="rounded-xl bg-[#F6F8F3] p-4"
            >
              <p className="text-xs font-semibold text-[#718579]">
                {audience}
              </p>

              <p className="mt-3 text-2xl font-extrabold text-[#234E43]">
                {ready
                  ? departmentNotices.filter(
                      (item) =>
                        item.audience === audience &&
                        noticeStatus(item) ===
                          "Published"
                    ).length
                  : "—"}
              </p>

              <p className="mt-1 text-xs text-[#718579]">
                Currently published
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* INTEGRATION NOTE */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <AlertCircle
          size={18}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Department
          notices are saved under{" "}
          <code>unibee-hod-department-notices-v1</code>.
          They are separate from university-wide Admin
          notices. Student and Faculty Portal notice
          feeds are not yet connected. Publication
          visibility must later enforce department,
          audience, date and status restrictions.
          LocalStorage alone does not provide secure
          access control or cross-device synchronization.
        </p>
      </div>

      {/* MODALS */}
      {formOpen && (
        <NoticeFormModal
          form={form}
          setForm={setForm}
          editing={Boolean(editingId)}
          error={error}
          onSave={saveNotice}
          onClose={() => {
            setFormOpen(false);
            setEditingId(null);
            setError("");
          }}
        />
      )}

      {selectedNotice && (
        <NoticeDetailsModal
          notice={selectedNotice}
          onClose={() => setViewId(null)}
        />
      )}

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Head of Department Portal —
        Department Notices
      </p>
    </div>
  );
}
