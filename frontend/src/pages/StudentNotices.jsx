
import { useEffect, useMemo, useState } from "react";
import { getAuthToken } from "../services/authApi";
import { getNotices } from "../services/noticeApi";
import {
  Bell,
  Search,
  CalendarDays,
  Pin,
  AlertCircle,
  BookOpen,
  CalendarCheck,
  Megaphone,
  ArrowUpRight,
  X,
  CheckCheck,
  Paperclip,
  Inbox,
  Building2,
  RefreshCw,
  Info,
  Database,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const KEYS = {
  departments: "unibee-admin-departments-v1",
  hodNotices: "unibee-hod-department-notices-v1",
  studentDepartment:
    "unibee-student-selected-department-v1",
  readNotices: "unibee-student-read-notices-v1",
};

// ========================================
// ORIGINAL STUDENT DEMO NOTICES
// ========================================

const initialNotices = [
  {
    id: 1,
    title: "Midterm Examination Schedule Published",
    category: "Academic",
    date: "2026-10-09",
    priority: "High",
    pinned: true,
    read: false,
    author: "Office of the Controller of Examinations",
    description:
      "The midterm examination schedule has been published. Students are requested to check their course-wise examination dates and prepare accordingly.",
    attachment: "Midterm_Exam_Schedule.pdf",
  },
  {
    id: 2,
    title: "Course Registration Deadline Reminder",
    category: "Academic",
    date: "2026-10-08",
    priority: "High",
    pinned: true,
    read: false,
    author: "Academic Office",
    description:
      "Students who have not completed course registration are requested to finalize their registration within the announced deadline.",
    attachment: "",
  },
  {
    id: 3,
    title: "University Research & Innovation Workshop",
    category: "Event",
    date: "2026-10-07",
    priority: "Normal",
    pinned: false,
    read: false,
    author: "Research and Innovation Cell",
    description:
      "A research and innovation workshop will be organized for interested students. The session will introduce research methodologies and opportunities.",
    attachment: "",
  },
  {
    id: 4,
    title: "Digital Library Resources Updated",
    category: "Library",
    date: "2026-10-05",
    priority: "Normal",
    pinned: false,
    read: true,
    author: "University Library",
    description:
      "New academic books, journals, and learning resources have been added to the university digital library catalog.",
    attachment: "",
  },
  {
    id: 5,
    title: "Campus Career Development Seminar",
    category: "Career",
    date: "2026-10-03",
    priority: "Normal",
    pinned: false,
    read: true,
    author: "Career Development Center",
    description:
      "Students are invited to join the career development seminar covering CV preparation, internship opportunities, and professional skills.",
    attachment: "",
  },
  {
    id: 6,
    title: "Updated Class Routine for ICT Department",
    category: "Academic",
    date: "2026-10-01",
    priority: "Normal",
    pinned: false,
    read: false,
    author: "Department of ICT",
    description:
      "The updated class routine for ICT students is now available. Please review your scheduled classes and classroom information.",
    attachment: "ICT_Class_Routine.pdf",
  },
  {
    id: 7,
    title: "Interdepartmental Cultural Festival",
    category: "Event",
    date: "2026-09-28",
    priority: "Normal",
    pinned: false,
    read: true,
    author: "Student Affairs Office",
    description:
      "Registration is open for the upcoming interdepartmental cultural festival. Students may participate in different cultural activities.",
    attachment: "",
  },
];

// ========================================
// GENERAL HELPERS
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return text(value).toLowerCase();
}

function readArray(key) {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return { rows: [], status: "missing" };
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return { rows: [], status: "invalid" };
    }

    return {
      rows: parsed.filter(
        (row) =>
          row &&
          typeof row === "object" &&
          !Array.isArray(row)
      ),
      status: "available",
    };
  } catch {
    return { rows: [], status: "invalid" };
  }
}

function readString(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function readReadIds() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(KEYS.readNotices) || "[]"
    );

    return Array.isArray(parsed)
      ? parsed.map(String)
      : [];
  } catch {
    return [];
  }
}

function localToday() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value) {
  const raw = text(value);

  if (!raw) return "—";

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T12:00:00`
      : raw
  );

  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function departmentInfo(row, index) {
  return {
    id: text(
      row.id ??
        row._id ??
        row.code ??
        `department-${index}`
    ),
    name: text(
      row.name ??
        row.departmentName ??
        row.title ??
        row.code ??
        "Unnamed Department"
    ),
    code: text(row.code),
  };
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
    notice.departmentId,
    notice.departmentName,
    notice.departmentCode,
    notice.department,
  ];

  return values.some((value) => {
    if (value && typeof value === "object") {
      return [
        value.id,
        value._id,
        value.name,
        value.code,
      ].some((part) => expected.includes(norm(part)));
    }

    return expected.includes(norm(value));
  });
}

function isStudentAudience(notice) {
  return [
    "all department members",
    "department students",
  ].includes(norm(notice.audience));
}

function isPublishedNow(notice, today) {
  if (norm(notice.status) !== "published") {
    return false;
  }

  const published = text(notice.publishDate);
  const expires = text(notice.expiryDate);

  if (published && published > today) return false;
  if (expires && expires < today) return false;

  return true;
}

// ========================================
// DISPLAY CONFIGURATION
// ========================================

const categoryStyles = {
  Academic: "bg-[#EAF2E8] text-[#427A67]",
  Event: "bg-[#FFF4DC] text-[#A57921]",
  Library: "bg-[#EAF0F8] text-[#456A94]",
  Career: "bg-[#F3EAF5] text-[#875F93]",
  Examination: "bg-[#EAF0F8] text-[#456A94]",
  "Class Schedule": "bg-[#EAF2E8] text-[#427A67]",
  Attendance: "bg-[#FFF4DC] text-[#A57921]",
  Research: "bg-[#F3EAF5] text-[#875F93]",
  Administrative: "bg-[#EAF0F8] text-[#456A94]",
  General: "bg-[#F1F7EF] text-[#45685B]",
};

const categoryIcons = {
  Academic: BookOpen,
  Event: CalendarCheck,
  Library: BookOpen,
  Career: Megaphone,
  Examination: CalendarCheck,
  "Class Schedule": CalendarDays,
  Attendance: CalendarCheck,
  Research: BookOpen,
  Administrative: Megaphone,
  General: Bell,
};

// ========================================
// MAIN COMPONENT
// ========================================

export default function StudentNotices() {
  const [liveNotices, setLiveNotices] = useState([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const [hodData, setHodData] = useState(() =>
    readArray(KEYS.hodNotices)
  );

  const [departmentData, setDepartmentData] = useState(
    () => readArray(KEYS.departments)
  );

  const [departmentId, setDepartmentId] = useState(
    () => readString(KEYS.studentDepartment)
  );

  const [readIds, setReadIds] = useState(readReadIds);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("latest");
  const [showUnreadOnly, setShowUnreadOnly] =
    useState(false);

  const [selectedNoticeId, setSelectedNoticeId] =
    useState(null);

  const [feedback, setFeedback] = useState("");

  const loadLiveNotices = async () => {
    const token = getAuthToken();
    if (!token) {
      setDemoMode(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const records = await getNotices();
      setLiveNotices(
        records.map((notice) => ({
          id: notice.id,
          title: notice.title,
          category: notice.category || "General",
          date: notice.publishedAt || notice.createdAt,
          priority:
            notice.priority === "Urgent" || notice.priority === "High"
              ? "High"
              : "Normal",
          priorityLabel: notice.priority,
          pinned: Boolean(notice.pinned),
          read: readIds.includes(notice.id),
          author: notice.author || "University Administration",
          description: notice.content,
          attachment: "",
          source: "Administration",
          departmentName: notice.department || "",
          audience: notice.audience,
        }))
      );
      setDemoMode(false);
    } catch {
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveNotices();
  }, []);

  // ======================================
  // REFRESH LOCAL STORAGE
  // ======================================

  function refreshNotices() {
    setHodData(readArray(KEYS.hodNotices));
    setDepartmentData(readArray(KEYS.departments));
    setReadIds(readReadIds());
  }

  useEffect(() => {
    function onStorage() {
      refreshNotices();
      setDepartmentId(
        readString(KEYS.studentDepartment)
      );
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        refreshNotices();
      }
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshNotices);

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "focus",
        refreshNotices
      );
      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  // ======================================
  // DEPARTMENT OPTIONS
  // ======================================

  const departments = useMemo(() => {
    const map = new Map();

    departmentData.rows.forEach((row, index) => {
      const department = departmentInfo(row, index);

      map.set(department.id, department);
    });

    // Fallback for frontend testing when Admin
    // departments have not been initialized.
    hodData.rows.forEach((notice) => {
      const id = text(notice.departmentId);
      const name = text(notice.departmentName);
      const code = text(notice.departmentCode);

      if (!id) return;

      if (!map.has(id)) {
        map.set(id, {
          id,
          name: name || code || id,
          code,
        });
      }
    });

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [departmentData.rows, hodData.rows]);

  const selectedDepartment = departments.find(
    (item) => item.id === departmentId
  );

  // ======================================
  // NORMALIZE DEMO NOTICES
  // ======================================

  const demoNotices = useMemo(
    () =>
      initialNotices.map((notice) => ({
        ...notice,
        id: `demo:${notice.id}`,
        source: "University Demo",
        departmentName: "",
        read:
          readIds.includes(`demo:${notice.id}`) ||
          Boolean(notice.read),
      })),
    [readIds]
  );

  // ======================================
  // NORMALIZE HOD NOTICES
  // ======================================

  const departmentNotices = useMemo(() => {
    if (!selectedDepartment) return [];

    const today = localToday();

    return hodData.rows
      .filter(
        (notice) =>
          matchesDepartment(
            notice,
            selectedDepartment
          ) &&
          isStudentAudience(notice) &&
          isPublishedNow(notice, today)
      )
      .filter((notice) => text(notice.id))
      .map((notice) => {
        const id = `hod:${notice.id}`;

        return {
          id,
          title: text(notice.title) || "Department Notice",
          category: text(notice.category) || "General",
          date: text(
            notice.publishDate || notice.createdAt
          ),
          priority:
            norm(notice.priority) === "urgent" ||
            norm(notice.priority) === "important"
              ? "High"
              : "Normal",
          priorityLabel:
            text(notice.priority) || "Normal",
          pinned: Boolean(notice.pinned),
          read: readIds.includes(id),
          author:
            `Head of Department — ${selectedDepartment.name}`,
          description:
            text(notice.content) ||
            "No notice details available.",
          attachment: "",
          source: "HOD",
          departmentName: selectedDepartment.name,
          audience: notice.audience,
        };
      });
  }, [
    hodData.rows,
    selectedDepartment,
    readIds,
  ]);

  // ======================================
  // COMBINED NOTICE FEED
  // ======================================

  const notices = useMemo(() => {
    if (!demoMode && liveNotices.length > 0) {
      return [...liveNotices, ...departmentNotices];
    }
    return [...departmentNotices, ...demoNotices];
  }, [demoMode, liveNotices, departmentNotices, demoNotices]);

  const unreadCount = notices.filter(
    (notice) => !notice.read
  ).length;

  const pinnedCount = notices.filter(
    (notice) => notice.pinned
  ).length;

  const highPriorityCount = notices.filter(
    (notice) => notice.priority === "High"
  ).length;

  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        notices.map((notice) => notice.category)
      ),
    ],
    [notices]
  );

  // ======================================
  // SEARCH AND FILTERING
  // ======================================

  const filteredNotices = useMemo(() => {
    const query = norm(search);

    return notices
      .filter((notice) => {
        const matchesSearch = [
          notice.title,
          notice.description,
          notice.author,
          notice.departmentName,
        ].some((value) =>
          norm(value).includes(query)
        );

        const matchesCategory =
          category === "All" ||
          notice.category === category;

        const matchesRead =
          !showUnreadOnly || !notice.read;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesRead
        );
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const difference =
            Number(b.priority === "High") -
            Number(a.priority === "High");

          if (difference !== 0) {
            return difference;
          }
        }

        if (sortBy === "oldest") {
          return a.date.localeCompare(b.date);
        }

        if (
          sortBy === "latest" &&
          a.pinned !== b.pinned
        ) {
          return Number(b.pinned) -
            Number(a.pinned);
        }

        return b.date.localeCompare(a.date);
      });
  }, [
    notices,
    search,
    category,
    sortBy,
    showUnreadOnly,
  ]);

  const selectedNotice = notices.find(
    (notice) => notice.id === selectedNoticeId
  );

  // ======================================
  // ACTIONS
  // ======================================

  function changeDepartment(value) {
    setDepartmentId(value);
    setCategory("All");
    setSearch("");
    setShowUnreadOnly(false);
    setSelectedNoticeId(null);
    setFeedback("");

    try {
      if (value) {
        localStorage.setItem(
          KEYS.studentDepartment,
          value
        );
      } else {
        localStorage.removeItem(
          KEYS.studentDepartment
        );
      }
    } catch {
      setFeedback(
        "Department preference could not be saved."
      );
    }
  }

  function markIdsAsRead(ids) {
    const next = [
      ...new Set([
        ...readIds,
        ...ids.map(String),
      ]),
    ];

    setReadIds(next);

    try {
      localStorage.setItem(
        KEYS.readNotices,
        JSON.stringify(next)
      );
    } catch {
      setFeedback(
        "Read status updated for this session but could not be saved."
      );
    }
  }

  function markAsRead(id) {
    markIdsAsRead([id]);
  }

  function markAllRead() {
    markIdsAsRead(
      notices.map((notice) => notice.id)
    );
  }

  function openNotice(notice) {
    setSelectedNoticeId(notice.id);
    markAsRead(notice.id);
  }

  function handleRefresh() {
    refreshNotices();
    loadLiveNotices();
    setFeedback("Notices refreshed.");
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-8">

      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            CAMPUS COMMUNICATION
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
              Notices & Announcements
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

          <p className="mt-3 text-[#718579]">
            Stay informed about academic updates,
            university events, and important
            department announcements.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 font-semibold text-[#234E43]"
          >
            <RefreshCw size={18} />
            Refresh
          </button>

          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-semibold text-white transition hover:bg-[#326657] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={18} />
            Mark All as Read
          </button>
        </div>
      </div>

      {/* STUDENT DEPARTMENT */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
            <Building2 size={22} />
          </div>

          <div>
            <h2 className="font-bold text-[#234E43]">
              My Department
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Select your department to see HOD notices.
            </p>
          </div>
        </div>

        <select
          aria-label="Select student department"
          value={
            selectedDepartment ? departmentId : ""
          }
          onChange={(event) =>
            changeDepartment(event.target.value)
          }
          className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72"
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
      </section>

      {!selectedDepartment && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Info
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>
            University demo announcements are
            visible below. Select your department
            to also view published HOD notices
            intended for students.
          </p>
        </div>
      )}

      {hodData.status === "invalid" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Department notice storage contains invalid
          data and cannot be displayed.
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className="rounded-xl bg-[#EAF2E8] p-4 text-sm text-[#234E43]"
        >
          {feedback}
        </p>
      )}

      {/* OVERVIEW CARDS */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Notices",
            value: notices.length,
            icon: Bell,
          },
          {
            label: "Unread Notices",
            value: unreadCount,
            icon: Inbox,
          },
          {
            label: "Pinned Notices",
            value: pinnedCount,
            icon: Pin,
          },
          {
            label: "High Priority",
            value: highPriorityCount,
            icon: AlertCircle,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={23} />
              </div>

              <p className="text-sm text-[#718579]">
                {item.label}
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
                {item.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* SEARCH AND FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search announcements..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value)
            }
            aria-label="Sort notices"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-medium text-[#45685B]"
          >
            <option value="latest">
              Latest & Pinned
            </option>

            <option value="oldest">
              Oldest First
            </option>

            <option value="priority">
              High Priority First
            </option>
          </select>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  category === item
                    ? "bg-[#234E43] text-white"
                    : "bg-[#F1F7EF] text-[#607B6C] hover:bg-[#E3EEE1]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#607B6C]">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(event) =>
                setShowUnreadOnly(
                  event.target.checked
                )
              }
              className="h-4 w-4 accent-[#234E43]"
            />

            Unread only
          </label>
        </div>

        <p className="mt-5 text-sm text-[#8A9F90]">
          Showing {filteredNotices.length} of{" "}
          {notices.length} notices
          {selectedDepartment
            ? ` · ${departmentNotices.length} department notices`
            : ""}
        </p>
      </section>

      {/* NOTICE CARDS */}
      <div className="grid gap-5 lg:grid-cols-2">
        {filteredNotices.map((notice) => {
          const Icon =
            categoryIcons[notice.category] || Bell;

          return (
            <article
              key={notice.id}
              className={`group relative rounded-3xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                !notice.read
                  ? "border-[#D9A536] bg-[#FFFEFA]"
                  : "border-[#E2EADC] bg-white"
              }`}
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                    <Icon size={23} />
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      categoryStyles[notice.category] ||
                      categoryStyles.General
                    }`}
                  >
                    {notice.category}
                  </span>

                  {notice.source === "HOD" && (
                    <span className="rounded-full bg-[#234E43] px-3 py-1.5 text-xs font-bold text-white">
                      Department Notice
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {notice.pinned && (
                    <Pin
                      size={17}
                      className="text-[#B78B28]"
                    />
                  )}

                  {!notice.read && (
                    <span className="rounded-full bg-[#D9A536] px-3 py-1 text-xs font-bold text-[#234E43]">
                      New
                    </span>
                  )}
                </div>
              </div>

              <h2 className="text-lg font-bold text-[#234E43]">
                {notice.title}
              </h2>

              <p className="mt-3 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-[#718579]">
                {notice.description}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[#8A9F90]">
                <span className="flex items-center gap-2">
                  <CalendarDays size={15} />
                  {formatDate(notice.date)}
                </span>

                {notice.priority === "High" && (
                  <span className="flex items-center gap-1 font-bold text-[#A57921]">
                    <AlertCircle size={15} />
                    Important
                  </span>
                )}

                {notice.attachment && (
                  <span className="flex items-center gap-1">
                    <Paperclip size={15} />
                    Attachment
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-[#EDF1EB] pt-5">
                <p className="truncate pr-3 text-xs text-[#718579]">
                  {notice.author}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    openNotice(notice)
                  }
                  className="flex shrink-0 items-center gap-2 text-sm font-bold text-[#234E43] hover:text-[#B78B28]"
                >
                  Read More
                  <ArrowUpRight size={17} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* EMPTY STATE */}
      {filteredNotices.length === 0 && (
        <div className="rounded-3xl border border-[#E2EADC] bg-white px-6 py-16 text-center">
          <Inbox
            size={42}
            className="mx-auto text-[#A6C1A4]"
          />

          <h3 className="mt-5 text-xl font-bold text-[#234E43]">
            No notices found
          </h3>

          <p className="mt-2 text-[#718579]">
            Try a different search or category.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("All");
              setShowUnreadOnly(false);
              setSortBy("latest");
            }}
            className="mt-6 rounded-xl bg-[#234E43] px-6 py-3 font-semibold text-white"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* NOTICE DETAILS MODAL */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setSelectedNoticeId(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-modal-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl md:p-9"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={`inline-block rounded-full px-3 py-1.5 text-xs font-bold ${
                    categoryStyles[
                      selectedNotice.category
                    ] || categoryStyles.General
                  }`}
                >
                  {selectedNotice.category}
                </span>

                <h2
                  id="notice-modal-title"
                  className="mt-4 text-2xl font-extrabold leading-snug text-[#234E43]"
                >
                  {selectedNotice.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedNoticeId(null)
                }
                aria-label="Close notice"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={23} />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-5 border-b border-[#E2EADC] pb-5 text-sm text-[#718579]">
              <span className="flex items-center gap-2">
                <CalendarDays size={17} />
                {formatDate(selectedNotice.date)}
              </span>

              <span className="flex items-center gap-2">
                <Megaphone size={17} />
                {selectedNotice.author}
              </span>
            </div>

            <div className="py-7">
              <h3 className="font-bold text-[#234E43]">
                Announcement Details
              </h3>

              <p className="mt-4 whitespace-pre-wrap break-words leading-8 text-[#607B6C]">
                {selectedNotice.description}
              </p>
            </div>

            {selectedNotice.attachment && (
              <div className="rounded-2xl border border-[#E2EADC] bg-[#F6F8F3] p-5">
                <div className="flex items-center gap-3">
                  <Paperclip
                    size={22}
                    className="text-[#477764]"
                  />

                  <div>
                    <p className="font-semibold text-[#234E43]">
                      {selectedNotice.attachment}
                    </p>

                    <p className="mt-1 text-xs text-[#718579]">
                      Demo attachment — file download
                      will be added later.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setSelectedNoticeId(null)
              }
              className="mt-7 w-full rounded-xl bg-[#234E43] px-6 py-3.5 font-bold text-white transition hover:bg-[#326657]"
            >
              Close Announcement
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Notices & Announcements
      </div>
    </div>
  );
}
