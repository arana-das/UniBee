
import { useEffect, useMemo, useState } from "react";
import {
  Megaphone, Plus, Search, Pencil, Trash2, Eye, X,
  Save, CalendarDays, Users, FileText, Send,
  AlertTriangle, CheckCircle2, Clock3, Filter,
  RotateCcw, Building2, RefreshCw, Info,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const STORAGE_KEY = "unibee-faculty-notices-v1";

const HOD_NOTICE_KEY =
  "unibee-hod-department-notices-v1";

const ADMIN_DEPARTMENT_KEY =
  "unibee-admin-departments-v1";

const FACULTY_DEPARTMENT_KEY =
  "unibee-faculty-selected-department-v1";

// ========================================
// DEFAULT DATA
// ========================================

const AUDIENCES = [
  "All Students",
  "CSE 321 - Database Management Systems",
  "CSE 331 - Software Engineering",
  "CSE 351 - Computer Networks",
  "CSE 221 - Data Structures and Algorithms",
  "CSE 411 - Artificial Intelligence",
];

const DEFAULT_NOTICES = [
  {
    id: "notice-1",
    title: "Database Lab Instructions",
    content:
      "Students of CSE 321 should review the SQL practice materials before the next lab session. Please bring your laptop and ensure your database environment is ready.",
    audience: AUDIENCES[1],
    priority: "Important",
    status: "Published",
    createdAt: "2026-10-20T09:00:00.000Z",
    publishedAt: "2026-10-20T09:00:00.000Z",
  },
  {
    id: "notice-2",
    title: "Software Engineering Project Meeting",
    content:
      "All project teams must prepare a short progress update for our upcoming class meeting.",
    audience: AUDIENCES[2],
    priority: "Normal",
    status: "Published",
    createdAt: "2026-10-22T10:00:00.000Z",
    publishedAt: "2026-10-22T10:00:00.000Z",
  },
  {
    id: "notice-3",
    title: "Assessment Deadline Reminder",
    content:
      "Please check your assignment deadlines and ensure that submissions are completed on time.",
    audience: "All Students",
    priority: "Urgent",
    status: "Draft",
    createdAt: "2026-10-24T08:00:00.000Z",
    publishedAt: null,
  },
];

const EMPTY_FORM = {
  title: "",
  content: "",
  audience: "All Students",
  priority: "Normal",
  status: "Draft",
};

// ========================================
// UTILITIES
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return text(value).toLowerCase();
}

function safeArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const value = JSON.parse(raw);

    return Array.isArray(value)
      ? value.filter(
          (row) =>
            row &&
            typeof row === "object" &&
            !Array.isArray(row)
        )
      : [];
  } catch {
    return [];
  }
}

function safeString(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function loadNotices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return DEFAULT_NOTICES;

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : DEFAULT_NOTICES;
  } catch {
    return DEFAULT_NOTICES;
  }
}

function todayLocal() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function datePart(value) {
  const match = text(value).match(
    /^\d{4}-\d{2}-\d{2}/
  );

  return match ? match[0] : "";
}

function formatDate(value) {
  if (!value) return "Not available";

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

// ========================================
// DEPARTMENT HELPERS
// ========================================

function buildDepartments(adminRows, hodRows) {
  const map = new Map();

  adminRows.forEach((row, index) => {
    const id = text(
      row.id ??
      row._id ??
      row.code ??
      `department-${index}`
    );

    map.set(id, {
      id,
      name: text(
        row.name ??
        row.departmentName ??
        row.title ??
        row.code ??
        "Unnamed Department"
      ),
      code: text(row.code),
    });
  });

  // Frontend fallback when departments only
  // exist inside saved HOD notices.
  hodRows.forEach((notice) => {
    const id = text(notice.departmentId);

    if (!id || map.has(id)) return;

    map.set(id, {
      id,
      name: text(
        notice.departmentName ||
        notice.departmentCode ||
        id
      ),
      code: text(notice.departmentCode),
    });
  });

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function matchesDepartment(notice, department) {
  if (!department) return false;

  const expected = [
    department.id,
    department.name,
    department.code,
  ]
    .map(norm)
    .filter(Boolean);

  const values = [
    notice.department,
    notice.departmentId,
    notice.departmentName,
    notice.departmentCode,
    notice.dept,
    notice.deptId,
  ];

  return values.some((value) => {
    if (value && typeof value === "object") {
      return [
        value.id,
        value._id,
        value.name,
        value.code,
      ].some((part) =>
        expected.includes(norm(part))
      );
    }

    return expected.includes(norm(value));
  });
}

function isFacultyNotice(notice, department, today) {
  if (!department) return false;

  if (norm(notice.status) !== "published") {
    return false;
  }

  const allowedAudiences = [
    "department faculty",
    "all department members",
  ];

  if (
    !allowedAudiences.includes(
      norm(notice.audience)
    )
  ) {
    return false;
  }

  const publishDate = datePart(notice.publishDate);
  const expiryDate = datePart(notice.expiryDate);

  if (publishDate && publishDate > today) {
    return false;
  }

  if (expiryDate && expiryDate < today) {
    return false;
  }

  return matchesDepartment(notice, department);
}

// ========================================
// REUSABLE UI
// ========================================

function PriorityBadge({ priority }) {
  const styles = {
    Normal: "bg-slate-100 text-slate-600",
    Important: "bg-amber-50 text-amber-700",
    Urgent: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[priority] || styles.Normal
      }`}
    >
      {priority || "Normal"}
    </span>
  );
}

function StatusBadge({ status }) {
  const published = norm(status) === "published";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        published
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {published ? (
        <CheckCircle2 size={13} />
      ) : (
        <Clock3 size={13} />
      )}

      {status}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-bold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

// ========================================
// MAIN FACULTY NOTICES
// ========================================

export default function FacultyNotices() {
  const [notices, setNotices] =
    useState(loadNotices);

  const [hodNotices, setHodNotices] =
    useState(() => safeArray(HOD_NOTICE_KEY));

  const [adminDepartments, setAdminDepartments] =
    useState(() => safeArray(ADMIN_DEPARTMENT_KEY));

  const [facultyDepartmentId, setFacultyDepartmentId] =
    useState(() => safeString(FACULTY_DEPARTMENT_KEY));

  const [hodSearch, setHodSearch] = useState("");
  const [hodPreview, setHodPreview] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [audienceFilter, setAudienceFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [viewingNotice, setViewingNotice] = useState(null);

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // ======================================
  // LOAD SHARED HOD DATA
  // ======================================

  function refreshHodData() {
    setHodNotices(safeArray(HOD_NOTICE_KEY));
    setAdminDepartments(
      safeArray(ADMIN_DEPARTMENT_KEY)
    );
  }

  useEffect(() => {
    function onStorage(event) {
      refreshHodData();

      if (
        event.key === FACULTY_DEPARTMENT_KEY ||
        event.key === null
      ) {
        setFacultyDepartmentId(
          safeString(FACULTY_DEPARTMENT_KEY)
        );
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        refreshHodData();
      }
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshHodData);

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.removeEventListener(
        "storage",
        onStorage
      );

      window.removeEventListener(
        "focus",
        refreshHodData
      );

      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  // ======================================
  // DEPARTMENT SELECTION
  // ======================================

  const departments = useMemo(
    () => buildDepartments(
      adminDepartments,
      hodNotices
    ),
    [adminDepartments, hodNotices]
  );

  const selectedDepartment = departments.find(
    (item) => item.id === facultyDepartmentId
  );

  function changeDepartment(value) {
    setFacultyDepartmentId(value);
    setHodPreview(null);
    setFeedback("");

    try {
      if (value) {
        localStorage.setItem(
          FACULTY_DEPARTMENT_KEY,
          value
        );
      } else {
        localStorage.removeItem(
          FACULTY_DEPARTMENT_KEY
        );
      }
    } catch {
      setError(
        "Could not save faculty department selection."
      );
    }
  }

  // ======================================
  // HOD NOTICE FEED
  // ======================================

  const visibleHodNotices = useMemo(() => {
    const today = todayLocal();
    const query = norm(hodSearch);

    return hodNotices
      .filter((notice) =>
        isFacultyNotice(
          notice,
          selectedDepartment,
          today
        )
      )
      .filter((notice) =>
        [
          notice.title,
          notice.subject,
          notice.content,
          notice.message,
          notice.description,
        ].some((value) =>
          norm(value).includes(query)
        )
      )
      .sort((a, b) => {
        if (
          Boolean(a.pinned) !==
          Boolean(b.pinned)
        ) {
          return a.pinned ? -1 : 1;
        }

        return text(
          b.updatedAt ||
          b.createdAt ||
          b.publishedAt
        ).localeCompare(
          text(
            a.updatedAt ||
            a.createdAt ||
            a.publishedAt
          )
        );
      });
  }, [
    hodNotices,
    selectedDepartment,
    hodSearch,
  ]);

  // ======================================
  // FACULTY NOTICE FILTERING
  // ======================================

  const filteredNotices = useMemo(() => {
    const query = norm(search);

    return [...notices]
      .filter((notice) => {
        const matchesSearch = [
          notice.title,
          notice.content,
          notice.audience,
        ].some((value) =>
          norm(value).includes(query)
        );

        const matchesStatus =
          statusFilter === "All" ||
          notice.status === statusFilter;

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
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
  }, [
    notices,
    search,
    statusFilter,
    priorityFilter,
    audienceFilter,
  ]);

  const publishedCount = notices.filter(
    (item) => item.status === "Published"
  ).length;

  const draftCount = notices.filter(
    (item) => item.status === "Draft"
  ).length;

  const urgentCount = notices.filter(
    (item) =>
      item.priority === "Urgent" &&
      item.status === "Published"
  ).length;

  // ======================================
  // SAVE FACULTY NOTICES
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
        "Unable to save changes. Check browser storage."
      );

      return false;
    }
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
      title: notice.title || "",
      content: notice.content || "",
      audience: notice.audience || "All Students",
      priority: notice.priority || "Normal",
      status: notice.status || "Draft",
    });

    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function handleSave(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
      setError(
        "Notice title and content are required."
      );
      return;
    }

    const now = new Date().toISOString();
    let next;

    if (editingId !== null) {
      next = notices.map((notice) => {
        if (notice.id !== editingId) {
          return notice;
        }

        return {
          ...notice,
          title: form.title.trim(),
          content: form.content.trim(),
          audience: form.audience,
          priority: form.priority,
          status: form.status,
          updatedAt: now,
          publishedAt:
            form.status === "Published"
              ? notice.publishedAt || now
              : null,
        };
      });
    } else {
      const id =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `notice-${Date.now()}`;

      next = [
        {
          id,
          title: form.title.trim(),
          content: form.content.trim(),
          audience: form.audience,
          priority: form.priority,
          status: form.status,
          createdAt: now,
          publishedAt:
            form.status === "Published"
              ? now
              : null,
        },
        ...notices,
      ];
    }

    if (persist(next)) {
      setModalOpen(false);
      setEditingId(null);
      setFeedback(
        editingId !== null
          ? "Notice updated successfully."
          : "Notice created successfully."
      );
    }
  }

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
      setFeedback("Notice deleted successfully.");
    }
  }

  function togglePublish(notice) {
    const nextStatus =
      notice.status === "Published"
        ? "Draft"
        : "Published";

    if (
      !window.confirm(
        nextStatus === "Published"
          ? "Publish this notice?"
          : "Move this notice back to Draft?"
      )
    ) {
      return;
    }

    const now = new Date().toISOString();

    const next = notices.map((item) =>
      item.id === notice.id
        ? {
            ...item,
            status: nextStatus,
            updatedAt: now,
            publishedAt:
              nextStatus === "Published"
                ? item.publishedAt || now
                : null,
          }
        : item
    );

    if (persist(next)) {
      setFeedback(
        nextStatus === "Published"
          ? "Notice published successfully."
          : "Notice moved to Draft."
      );
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setAudienceFilter("All");
  }

  // ======================================
  // PAGE RENDER
  // ======================================

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Faculty Communication
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Notices Management
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Create academic announcements and
            view notices published by your
            Head of Department.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33]"
        >
          <Plus size={18} />
          Create Notice
        </button>
      </section>

      {/* FACULTY NOTICE STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Faculty Notices"
          value={notices.length}
          description="All faculty-created announcements"
          icon={Megaphone}
        />

        <StatCard
          title="Published"
          value={publishedCount}
          description="Published faculty notices"
          icon={CheckCircle2}
        />

        <StatCard
          title="Draft Notices"
          value={draftCount}
          description="Saved for later"
          icon={FileText}
        />

        <StatCard
          title="Urgent Notices"
          value={urgentCount}
          description="Published urgent notices"
          icon={AlertTriangle}
        />
      </section>

      {/* ================================= */}
      {/* HOD NOTICE INTEGRATION            */}
      {/* ================================= */}

      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2
                size={22}
                className="text-[#234E43]"
              />

              <h2 className="text-xl font-bold text-[#234E43]">
                Department Notices from HOD
              </h2>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Published notices addressed to
              department faculty.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              refreshHodData();
              setFeedback("HOD notices refreshed.");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 px-4 py-2.5 text-sm font-semibold text-[#234E43] hover:bg-[#F6F8F3]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {/* DEPARTMENT SELECTOR */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F6F8F3] p-4">
          <div>
            <p className="text-sm font-bold text-[#234E43]">
              My Department
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Select your department for this
              frontend demo.
            </p>
          </div>

          <select
            value={
              selectedDepartment
                ? facultyDepartmentId
                : ""
            }
            onChange={(event) =>
              changeDepartment(event.target.value)
            }
            aria-label="Select faculty department"
            className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] sm:w-72"
          >
            <option value="">
              Select Department
            </option>

            {departments.map((department) => (
              <option
                key={department.id}
                value={department.id}
              >
                {department.name}
              </option>
            ))}
          </select>
        </div>

        {/* SEARCH HOD NOTICES */}
        <div className="relative mt-4">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={hodSearch}
            onChange={(event) =>
              setHodSearch(event.target.value)
            }
            placeholder="Search HOD notices..."
            className="w-full rounded-xl border border-[#E2EADC] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#234E43]"
          />
        </div>

        {/* HOD NOTICE CARDS */}
        <div className="mt-5 space-y-3">
          {!selectedDepartment ? (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              <Info
                size={18}
                className="mt-0.5 shrink-0"
              />

              Select your department to view
              published HOD notices.
            </div>
          ) : visibleHodNotices.length === 0 ? (
            <div className="rounded-xl bg-[#F6F8F3] px-5 py-10 text-center">
              <Megaphone
                size={28}
                className="mx-auto text-[#A6C1A4]"
              />

              <p className="mt-3 font-semibold text-[#234E43]">
                No HOD notices available
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Only active published notices
                for Department Faculty or
                All Department Members are shown.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleHodNotices.map((notice, index) => (
                <article
                  key={`${notice.id || "hod"}-${index}`}
                  className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#234E43] px-3 py-1 text-xs font-bold text-white">
                      HOD Notice
                    </span>

                    <StatusBadge status="Published" />

                    <PriorityBadge
                      priority={notice.priority}
                    />
                  </div>

                  <h3 className="mt-4 text-base font-bold text-[#234E43]">
                    {notice.title ||
                      notice.subject ||
                      "Department Notice"}
                  </h3>

                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {notice.content ||
                      notice.message ||
                      notice.description ||
                      "No details available."}
                  </p>

                  <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <CalendarDays size={15} />

                    {formatDate(
                      notice.publishDate ||
                      notice.publishedAt ||
                      notice.createdAt
                    )}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2EADC] pt-4">
                    <span className="text-xs text-slate-500">
                      {notice.audience}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setHodPreview(notice)
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Eye size={15} />
                      Read Notice
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================================= */}
      {/* FACULTY NOTICE SEARCH & FILTERS   */}
      {/* ================================= */}

      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={19}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Faculty Notices
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
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search notices..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Priorities</option>
            <option value="Normal">Normal</option>
            <option value="Important">Important</option>
            <option value="Urgent">Urgent</option>
          </select>

          <select
            value={audienceFilter}
            onChange={(event) =>
              setAudienceFilter(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
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

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/15 px-4 py-2 text-xs font-semibold text-[#234E43]"
          >
            <RotateCcw size={15} />
            Reset Filters
          </button>
        </div>
      </section>

      {/* FACULTY NOTICE COLLECTION */}
      <section>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-[#234E43]">
            Faculty Notice Collection
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Showing {filteredNotices.length} of{" "}
            {notices.length} faculty notices
          </p>
        </div>

        {filteredNotices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <Search
              size={34}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 font-bold text-[#234E43]">
              No notices found
            </h3>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-[#234E43] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredNotices.map((notice) => (
              <article
                key={notice.id}
                className="flex flex-col rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm hover:shadow-md"
              >
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={notice.status} />
                  <PriorityBadge priority={notice.priority} />
                </div>

                <h3 className="mt-5 text-lg font-bold text-[#234E43]">
                  {notice.title}
                </h3>

                <p className="mt-3 line-clamp-3 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {notice.content}
                </p>

                <div className="mt-5 space-y-3 rounded-xl bg-[#F6F8F3] p-4">
                  <p className="flex items-center gap-2 text-xs text-slate-600">
                    <Users size={16} />
                    {notice.audience}
                  </p>

                  <p className="flex items-center gap-2 text-xs text-slate-600">
                    <CalendarDays size={16} />
                    Created: {formatDate(notice.createdAt)}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setViewingNotice(notice)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-semibold text-white"
                  >
                    <Eye size={16} />
                    Preview
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(notice)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-[#234E43]"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      togglePublish(notice)
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2.5 text-xs font-semibold text-emerald-700"
                  >
                    <Send size={16} />

                    {notice.status === "Published"
                      ? "Unpublish"
                      : "Publish"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteNotice(notice.id)
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-600"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
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
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* ================================= */}
      {/* CREATE / EDIT MODAL               */}
      {/* ================================= */}

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
            aria-labelledby="faculty-notice-form-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2
                id="faculty-notice-form-title"
                className="text-xl font-bold text-[#234E43]"
              >
                {editingId !== null
                  ? "Edit Notice"
                  : "Create Notice"}
              </h2>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg bg-slate-100 p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Notice Title
                </label>

                <input
                  required
                  maxLength={150}
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#234E43]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Notice Content
                </label>

                <textarea
                  required
                  rows={6}
                  maxLength={5000}
                  value={form.content}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      content: event.target.value,
                    })
                  }
                  className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#234E43]"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {form.content.length}/5000
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Target Audience
                </label>

                <select
                  value={form.audience}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      audience: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Priority
                  </label>

                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        priority: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                  >
                    <option>Normal</option>
                    <option>Important</option>
                    <option>Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                  >
                    <option>Draft</option>
                    <option>Published</option>
                  </select>
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
              >
                <Save size={18} />

                {editingId !== null
                  ? "Save Changes"
                  : "Create Notice"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* ================================= */}
      {/* FACULTY NOTICE PREVIEW            */}
      {/* ================================= */}

      {viewingNotice && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setViewingNotice(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="faculty-preview-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="faculty-preview-title"
                className="text-xl font-bold text-[#234E43]"
              >
                {viewingNotice.title}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setViewingNotice(null)
                }
                aria-label="Close preview"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge
                status={viewingNotice.status}
              />

              <PriorityBadge
                priority={viewingNotice.priority}
              />
            </div>

            <div className="mt-6 rounded-xl bg-[#F6F8F3] p-4 text-sm">
              <p className="flex items-center gap-2">
                <Users size={17} />
                {viewingNotice.audience}
              </p>

              <p className="mt-3 flex items-center gap-2 text-slate-500">
                <CalendarDays size={16} />
                {formatDate(viewingNotice.createdAt)}
              </p>
            </div>

            <p className="mt-6 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
              {viewingNotice.content}
            </p>

            <p className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
              Faculty-created notices are saved
              locally and are not yet connected
              to the Student Notices feed.
            </p>

            <button
              type="button"
              onClick={() =>
                setViewingNotice(null)
              }
              className="mt-6 w-full rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
            >
              Close Preview
            </button>
          </section>
        </div>
      )}

      {/* ================================= */}
      {/* HOD NOTICE PREVIEW                */}
      {/* ================================= */}

      {hodPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setHodPreview(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="hod-preview-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18A28]">
                  Head of Department
                </p>

                <h2
                  id="hod-preview-title"
                  className="mt-2 text-xl font-bold text-[#234E43] md:text-2xl"
                >
                  {hodPreview.title ||
                    hodPreview.subject ||
                    "Department Notice"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setHodPreview(null)
                }
                aria-label="Close HOD notice"
                className="rounded-lg bg-slate-100 p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge status="Published" />

              <PriorityBadge
                priority={hodPreview.priority}
              />
            </div>

            <div className="mt-6 rounded-xl bg-[#F6F8F3] p-4">
              <p className="flex items-center gap-2 text-sm text-[#234E43]">
                <Users size={17} />
                {hodPreview.audience}
              </p>

              <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <CalendarDays size={16} />

                {formatDate(
                  hodPreview.publishDate ||
                  hodPreview.publishedAt ||
                  hodPreview.createdAt
                )}
              </p>
            </div>

            <p className="mt-6 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
              {hodPreview.content ||
                hodPreview.message ||
                hodPreview.description ||
                "No details available."}
            </p>

            <div className="mt-6 rounded-xl bg-[#EAF2E8] p-4 text-xs leading-6 text-[#234E43]">
              This notice was published by the
              Head of Department and is read-only
              in the Faculty Portal.
            </div>

            <button
              type="button"
              onClick={() => setHodPreview(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
            >
              Close Notice
            </button>
          </section>
        </div>
      )}

      {/* FOOTER */}
      <p className="text-center text-xs text-slate-400">
        UniBee Faculty Notices · Frontend Demo ·
        Changes are stored locally in this browser
      </p>
    </div>
  );
}
