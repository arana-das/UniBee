
import { useEffect, useMemo, useState } from "react";
import { getAuthToken } from "../../services/authApi";
import {
  getUsers as fetchUsers,
  createUser as createUserAPI,
  updateUser as updateUserAPI,
  deleteUser as deleteUserAPI,
  changeUserStatus as changeUserStatusAPI,
} from "../../services/userApi";
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  GraduationCap,
  UserRound,
  Pencil,
  Trash2,
  Eye,
  X,
  Save,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  LockKeyhole,
  UnlockKeyhole,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Mail,
  CalendarDays,
} from "lucide-react";

// ========================================
// CONFIGURATION
// ========================================

const STORAGE_KEY = "unibee-admin-users-v1";
const PAGE_SIZE = 8;

const ROLES = [
  "Student",
  "Faculty",
  "Admin",
  "HOD",
  "Librarian",
  "Accounts Officer",
  "Exam Controller",
];

const ROLE_TO_API = {
  Student: "student",
  Faculty: "faculty",
  Admin: "admin",
  HOD: "hod",
  Librarian: "librarian",
  "Accounts Officer": "accounts",
  "Exam Controller": "exam-controller",
};

const API_TO_ROLE = Object.fromEntries(
  Object.entries(ROLE_TO_API).map(
    ([label, value]) => [value, label]
  )
);

const STATUSES = ["Active", "Pending", "Suspended"];

// ========================================
// DATABASE TO FRONTEND MAPPING
// ========================================

function fromApiUser(user) {
  return {
    ...user,
    role: API_TO_ROLE[user.role] || user.role,
    userId: user.userId || "",
    status:
      user.status ||
      (user.isActive ? "Active" : "Suspended"),
    department: user.department || "",
    joinedAt: user.joinedAt || "",
  };
}

// ========================================
// ORIGINAL DEMO RECORDS
// ========================================

const SAMPLE_USERS = [
  {
    id: "USR-001",
    userId: "USR-001",
    name: "Ayesha Rahman",
    email: "ayesha@example.edu",
    role: "Student",
    status: "Active",
    department: "Computer Science & Engineering",
    joinedAt: "2026-01-12",
  },
  {
    id: "USR-002",
    userId: "USR-002",
    name: "Tanvir Ahmed",
    email: "tanvir@example.edu",
    role: "Student",
    status: "Active",
    department: "Computer Science & Engineering",
    joinedAt: "2026-01-15",
  },
  {
    id: "USR-003",
    userId: "USR-003",
    name: "Dr. Arif Rahman",
    email: "arif@example.edu",
    role: "Faculty",
    status: "Active",
    department: "Computer Science & Engineering",
    joinedAt: "2025-05-10",
  },
  {
    id: "USR-004",
    userId: "USR-004",
    name: "Dr. Nusrat Jahan",
    email: "nusrat@example.edu",
    role: "Faculty",
    status: "Active",
    department: "Computer Science & Engineering",
    joinedAt: "2025-06-20",
  },
  {
    id: "USR-005",
    userId: "USR-005",
    name: "System Administrator",
    email: "admin@example.edu",
    role: "Admin",
    status: "Active",
    department: "Administration",
    joinedAt: "2025-01-01",
  },
  {
    id: "USR-006",
    userId: "USR-006",
    name: "Sadia Islam",
    email: "sadia@example.edu",
    role: "Student",
    status: "Pending",
    department: "English",
    joinedAt: "2026-10-20",
  },
  {
    id: "USR-007",
    userId: "USR-007",
    name: "Mahmud Hasan",
    email: "mahmud@example.edu",
    role: "Student",
    status: "Suspended",
    department: "Business Administration",
    joinedAt: "2026-03-08",
  },
  {
    id: "USR-008",
    userId: "USR-008",
    name: "Farzana Islam",
    email: "farzana@example.edu",
    role: "Faculty",
    status: "Pending",
    department: "English",
    joinedAt: "2026-10-22",
  },
  {
    id: "USR-009",
    userId: "USR-009",
    name: "Rafiul Karim",
    email: "rafiul@example.edu",
    role: "Student",
    status: "Active",
    department: "Civil Engineering",
    joinedAt: "2026-02-16",
  },
];

// ========================================
// EMPTY FORM
// ========================================

const EMPTY_FORM = {
  userId: "",
  name: "",
  email: "",
  role: "Student",
  status: "Pending",
  department: "",
  joinedAt: "",
  password: "",
};

// ========================================
// DEMO STORAGE
// ========================================

function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return SAMPLE_USERS;
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : SAMPLE_USERS;
  } catch {
    return SAMPLE_USERS;
  }
}

function makeId() {
  return typeof crypto !== "undefined" &&
    crypto.randomUUID
    ? crypto.randomUUID()
    : `user-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
}

// ========================================
// UTILITY COMPONENTS
// ========================================

function getInitials(name) {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function RoleBadge({ role }) {
  const styles = {
    Student: "bg-sky-50 text-sky-700",
    Faculty: "bg-violet-50 text-violet-700",
    Admin: "bg-amber-50 text-amber-800",
    HOD: "bg-teal-50 text-teal-800",
    Librarian: "bg-emerald-50 text-emerald-800",
    "Accounts Officer":
      "bg-orange-50 text-orange-800",
    "Exam Controller":
      "bg-indigo-50 text-indigo-800",
  };

  const Icon =
    role === "Admin"
      ? ShieldCheck
      : role === "Faculty"
      ? UserRound
      : GraduationCap;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        styles[role] || styles.Student
      }`}
    >
      <Icon size={13} />
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-700",
    Pending: "bg-amber-50 text-amber-800",
    Suspended: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || styles.Pending
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  detail,
}) {
  return (
    <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {label}
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
        {detail}
      </p>
    </div>
  );
}

// ========================================
// CSV EXPORT
// ========================================

function downloadCSV(users) {
  const headers = [
    "User ID",
    "Full Name",
    "Email",
    "Role",
    "Status",
    "Department",
    "Joined Date",
  ];

  const rows = [
    headers,
    ...users.map((user) => [
      user.userId,
      user.name,
      user.email,
      user.role,
      user.status,
      user.department,
      user.joinedAt,
    ]),
  ];

  const safeCell = (value) => {
    let text = String(value ?? "");

    if (/^\s*[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv =
    "\uFEFF" +
    rows
      .map((row) =>
        row.map(safeCell).join(",")
      )
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "UniBee_Users.csv";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}

// ========================================
// INPUT FIELD
// ========================================

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
      />
    </label>
  );
}

// ========================================
// SELECT FIELD
// ========================================

function SelectField({
  label,
  value,
  options,
  onChange,
}) {
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
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

// ========================================
// MAIN ADMIN USER MANAGEMENT
// ========================================

export default function AdminUsers() {
  const [demoMode, setDemoMode] = useState(
    () => !getAuthToken()
  );

  const [users, setUsers] = useState(
    () =>
      getAuthToken()
        ? []
        : loadUsers()
  );

  const [loading, setLoading] = useState(
    () => Boolean(getAuthToken())
  );

  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [viewing, setViewing] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [feedback, setFeedback] =
    useState("");

  const [error, setError] =
    useState("");

  // ======================================
  // LOAD MONGODB USER ACCOUNTS
  // ======================================

  useEffect(() => {
    if (demoMode) {
      setLoading(false);
      return;
    }

    if (!getAuthToken()) {
      setError(
        "Please sign in as Admin to view live accounts."
      );

      setDemoMode(true);
      setUsers(loadUsers());
      return;
    }

    let cancelled = false;

    setLoading(true);

    fetchUsers()
      .then((data) => {
        if (!cancelled) {
          setUsers(
            data.map(fromApiUser)
          );

          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load users."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  // ======================================
  // SEARCH AND FILTER
  // ======================================

  const filteredUsers = useMemo(() => {
    const search = query
      .trim()
      .toLowerCase();

    return users.filter((user) => {
      const matchesSearch = [
        user.userId,
        user.name,
        user.email,
        user.department,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search)
      );

      return (
        matchesSearch &&
        (
          roleFilter === "All" ||
          user.role === roleFilter
        ) &&
        (
          statusFilter === "All" ||
          user.status === statusFilter
        )
      );
    });
  }, [
    users,
    query,
    roleFilter,
    statusFilter,
  ]);

  // ======================================
  // PAGINATION
  // ======================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredUsers.length / PAGE_SIZE
    )
  );

  const currentPage = Math.min(
    page,
    totalPages
  );

  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ======================================
  // STATISTICS
  // ======================================

  const activeCount = users.filter(
    (user) =>
      user.status === "Active"
  ).length;

  const pendingCount = users.filter(
    (user) =>
      user.status === "Pending"
  ).length;

  const adminCount = users.filter(
    (user) =>
      user.role === "Admin"
  ).length;

  // ======================================
  // DEMO PERSISTENCE
  // ======================================

  function persist(next, message) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      setUsers(next);
      setFeedback(message);
      setError("");

      return true;
    } catch {
      setError(
        "Unable to save user records in this browser."
      );

      return false;
    }
  }

  // ======================================
  // OPEN CREATE MODAL
  // ======================================

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });

    setModalOpen(true);
    setFeedback("");
    setError("");
  }

  // ======================================
  // OPEN EDIT MODAL
  // ======================================

  function openEdit(user) {
    setEditingId(user.id);

    setForm({
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department,
      joinedAt: user.joinedAt,
      password: "",
    });

    setModalOpen(true);
    setError("");
    setFeedback("");
  }

  // ======================================
  // UPDATE FORM FIELD
  // ======================================

  function updateField(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setError("");
  }

  // ======================================
  // CREATE OR EDIT USER
  // ======================================

  async function handleSave(event) {
    event.preventDefault();

    if (busy) return;

    setError("");

    const clean = {
      userId: form.userId
        .trim()
        .toUpperCase(),

      name: form.name.trim(),

      email: form.email
        .trim()
        .toLowerCase(),

      role: form.role,

      status: form.status,

      department:
        form.department.trim(),

      joinedAt: form.joinedAt,
    };

    if (
      !clean.name ||
      !clean.email ||
      (!editingId && !clean.userId)
    ) {
      setError(
        "User ID, name and email are required."
      );

      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        clean.email
      )
    ) {
      setError(
        "Enter a valid email address."
      );

      return;
    }

    if (
      !editingId &&
      !demoMode &&
      form.password.length < 12
    ) {
      setError(
        "A password of at least 12 characters is required."
      );

      return;
    }

    const duplicate = users.some(
      (user) =>
        user.id !== editingId &&
        (
          (
            clean.userId &&
            user.userId?.toLowerCase() ===
              clean.userId.toLowerCase()
          ) ||
          user.email?.toLowerCase() ===
            clean.email
        )
    );

    if (duplicate) {
      setError(
        "User ID or email is already registered."
      );

      return;
    }

    setBusy(true);

    try {
      if (demoMode) {
        // Local preview only.
        const next = editingId
          ? users.map((user) =>
              user.id === editingId
                ? {
                    ...user,
                    ...clean,
                  }
                : user
            )
          : [
              {
                id: makeId(),
                ...clean,
                joinedAt:
                  clean.joinedAt ||
                  new Date()
                    .toISOString()
                    .slice(0, 10),
              },
              ...users,
            ];

        // Never store passwords in demo data.
        next.forEach((user) => {
          delete user.password;
        });

        const saved = persist(
          next,
          editingId
            ? "Demo user updated."
            : "Demo user created."
        );

        if (!saved) return;
      } else {
        // Real MongoDB user account.
        const apiData = {
          ...clean,
          role: ROLE_TO_API[clean.role],
        };

        if (
          editingId &&
          !apiData.userId
        ) {
          // Bootstrap Admin may not have userId.
          delete apiData.userId;
        }

        if (!editingId) {
          apiData.password =
            form.password;
        }

        const saved = editingId
          ? await updateUserAPI(
              editingId,
              apiData
            )
          : await createUserAPI(
              apiData
            );

        const formatted =
          fromApiUser(saved);

        setUsers((previous) =>
          editingId
            ? previous.map((user) =>
                user.id === editingId
                  ? formatted
                  : user
              )
            : [
                formatted,
                ...previous,
              ]
        );

        setFeedback(
          editingId
            ? "User record updated successfully."
            : "User login account created successfully."
        );
      }

      setModalOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      setPage(1);
    } catch (err) {
      setError(
        err.message ||
          "Unable to save user account."
      );
    } finally {
      setBusy(false);
    }
  }

  // ======================================
  // DELETE USER
  // ======================================

  async function handleDelete(user) {
    const confirmed = window.confirm(
      `Delete ${user.name} (${user.userId || user.email})?`
    );

    if (!confirmed || busy) return;

    setBusy(true);
    setError("");

    try {
      if (demoMode) {
        persist(
          users.filter(
            (item) =>
              item.id !== user.id
          ),
          "Demo user deleted."
        );
      } else {
        await deleteUserAPI(user.id);

        setUsers((previous) =>
          previous.filter(
            (item) =>
              item.id !== user.id
          )
        );

        setFeedback(
          "User deleted successfully."
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to delete user."
      );
    } finally {
      setBusy(false);
    }
  }

  // ======================================
  // ACTIVATE OR SUSPEND USER
  // ======================================

  async function changeStatus(user) {
    const nextStatus =
      user.status === "Active"
        ? "Suspended"
        : "Active";

    const confirmed = window.confirm(
      `Change ${user.name}'s status to ${nextStatus}?`
    );

    if (!confirmed || busy) return;

    setBusy(true);
    setError("");

    try {
      if (demoMode) {
        persist(
          users.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  status: nextStatus,
                }
              : item
          ),
          `User status changed to ${nextStatus}.`
        );
      } else {
        const saved =
          await changeUserStatusAPI(
            user.id,
            nextStatus
          );

        const formatted =
          fromApiUser(saved);

        setUsers((previous) =>
          previous.map((item) =>
            item.id === user.id
              ? formatted
              : item
          )
        );

        setFeedback(
          `User status changed to ${nextStatus}.`
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to change account status."
      );
    } finally {
      setBusy(false);
    }
  }

  // ======================================
  // CLEAR FILTERS
  // ======================================

  function clearFilters() {
    setQuery("");
    setRoleFilter("All");
    setStatusFilter("All");
    setPage(1);
  }

  // ======================================
  // RESET DEMO ONLY
  // ======================================

  function resetDemo() {
    const confirmed = window.confirm(
      "Restore demo users? This replaces locally saved demo records only. MongoDB accounts will not be changed."
    );

    if (!confirmed) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(SAMPLE_USERS)
      );

      setDemoMode(true);
      setUsers(SAMPLE_USERS);

      setFeedback(
        "Demo users restored. MongoDB accounts remain unchanged."
      );

      setError("");
      clearFilters();
    } catch {
      setError(
        "Unable to restore demo users."
      );
    }
  }

  // ======================================
  // RETURN TO LIVE DATABASE
  // ======================================

  function returnToLive() {
    if (!getAuthToken()) {
      setError(
        "Please sign in as Admin to access live accounts."
      );

      return;
    }

    setUsers([]);
    setFeedback("");
    setDemoMode(false);
    setPage(1);
  }

  // ======================================
  // PAGE UI
  // ======================================

  return (
    <div className="space-y-7">

      {/* PAGE HEADER */}

      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            People Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            User Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Organize user records, roles, and account statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33]"
        >
          <UserPlus size={18} />
          Add User
        </button>
      </section>

      {/* STATISTICS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          label="Total Users"
          value={users.length}
          icon={Users}
          detail={
            demoMode
              ? "All demo user records"
              : "Real MongoDB accounts"
          }
        />

        <StatCard
          label="Active Accounts"
          value={activeCount}
          icon={CheckCircle2}
          detail="Currently marked active"
        />

        <StatCard
          label="Pending Accounts"
          value={pendingCount}
          icon={AlertCircle}
          detail="Awaiting approval"
        />

        <StatCard
          label="Admin Accounts"
          value={adminCount}
          icon={ShieldCheck}
          detail={
            demoMode
              ? "Users with demo Admin role"
              : "Users with Admin role"
          }
        />

      </section>

      {/* SEARCH & FILTER */}

      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">

        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={19}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Users
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">

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
              placeholder="Search user name, ID or email..."
              aria-label="Search users"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />

          </div>

          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="All">
              All Roles
            </option>

            {ROLES.map((role) => (
              <option
                key={role}
                value={role}
              >
                {role}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value
              );

              setPage(1);
            }}
            aria-label="Filter by status"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
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

        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">

          <p className="text-xs text-slate-500">
            {filteredUsers.length} matching users
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
              onClick={() =>
                downloadCSV(filteredUsers)
              }
              className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              <Download size={15} />
              Export CSV
            </button>

            <button
              type="button"
              onClick={
                demoMode && getAuthToken()
                  ? returnToLive
                  : resetDemo
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
            >
              {demoMode && getAuthToken()
                ? "Return to Live"
                : "Reset Demo"}
            </button>

          </div>
        </div>
      </section>

      {/* LOADING INDICATOR */}

      {loading && (
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-[#234E43]"
        >
          Loading user accounts...
        </p>
      )}

      {/* USERS TABLE */}

      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[980px] text-left">

            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "User",
                  "User ID",
                  "Role",
                  "Department",
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

              {visibleUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50"
                >

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A6C1A4]/30 text-xs font-bold text-[#234E43]">
                        {getInitials(user.name)}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[#234E43]">
                          {user.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {user.email}
                        </p>
                      </div>

                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {user.userId}
                  </td>

                  <td className="px-5 py-4">
                    <RoleBadge
                      role={user.role}
                    />
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-600">
                    {user.department ||
                      "Not assigned"}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge
                      status={user.status}
                    />
                  </td>

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          setViewing(user)
                        }
                        title="View user"
                        aria-label={`View ${user.name}`}
                        className="rounded-lg bg-slate-100 p-2 text-[#234E43] hover:bg-slate-200"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openEdit(user)
                        }
                        title="Edit user"
                        aria-label={`Edit ${user.name}`}
                        className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43] hover:bg-[#A6C1A4]/40"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(user)
                        }
                        title={
                          user.status === "Active"
                            ? "Suspend user"
                            : "Activate user"
                        }
                        aria-label={`Change status for ${user.name}`}
                        className={`rounded-lg p-2 ${
                          user.status === "Active"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {user.status === "Active" ? (
                          <LockKeyhole size={17} />
                        ) : (
                          <UnlockKeyhole size={17} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(user)
                        }
                        title="Delete user"
                        aria-label={`Delete ${user.name}`}
                        className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>
                  </td>

                </tr>
              ))}

            </tbody>
          </table>

          {visibleUsers.length === 0 &&
            !loading && (
              <div className="py-14 text-center text-sm text-slate-500">
                No matching users found.
              </div>
            )}

        </div>

        {/* PAGINATION */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">

          <p className="text-xs text-slate-500">
            Page {currentPage} of{" "}
            {totalPages} ·{" "}
            {filteredUsers.length} users
          </p>

          <div className="flex gap-2">

            <button
              type="button"
              disabled={
                currentPage === 1
              }
              onClick={() =>
                setPage(currentPage - 1)
              }
              aria-label="Previous page"
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={
                currentPage ===
                totalPages
              }
              onClick={() =>
                setPage(currentPage + 1)
              }
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
            if (
              event.target ===
              event.currentTarget
            ) {
              setModalOpen(false);
            }
          }}
        >

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >

            <div className="mb-5 flex items-center justify-between gap-4">

              <h2
                id="user-form-title"
                className="text-xl font-bold text-[#234E43]"
              >
                {editingId
                  ? "Edit User"
                  : "Add User"}
              </h2>

              <button
                type="button"
                onClick={() =>
                  setModalOpen(false)
                }
                aria-label="Close form"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={21} />
              </button>

            </div>

            <form
              onSubmit={handleSave}
              className="space-y-4"
            >

              <InputField
                label="User ID *"
                value={form.userId}
                required={
                  !editingId ||
                  Boolean(form.userId)
                }
                placeholder={
                  editingId &&
                  !form.userId
                    ? "Optional for initial Admin"
                    : "USR-010"
                }
                onChange={(event) =>
                  updateField(
                    "userId",
                    event.target.value
                  )
                }
              />

              <InputField
                label="Full Name *"
                value={form.name}
                required
                placeholder="Full name"
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value
                  )
                }
              />

              <InputField
                label="Email Address *"
                type="email"
                value={form.email}
                required
                placeholder="user@example.edu"
                onChange={(event) =>
                  updateField(
                    "email",
                    event.target.value
                  )
                }
              />

              <InputField
                label="Department"
                value={form.department}
                placeholder="Department or office"
                onChange={(event) =>
                  updateField(
                    "department",
                    event.target.value
                  )
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">

                <SelectField
                  label="Account Role"
                  value={form.role}
                  options={ROLES}
                  onChange={(event) =>
                    updateField(
                      "role",
                      event.target.value
                    )
                  }
                />

                <SelectField
                  label="Account Status"
                  value={form.status}
                  options={STATUSES}
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value
                    )
                  }
                />

              </div>

              {!editingId &&
                !demoMode && (
                  <InputField
                    label="Initial Password *"
                    type="password"
                    value={form.password}
                    required
                    placeholder="At least 12 characters"
                    onChange={(event) =>
                      updateField(
                        "password",
                        event.target.value
                      )
                    }
                  />
                )}

              <InputField
                label="Joined Date"
                type="date"
                value={form.joinedAt}
                onChange={(event) =>
                  updateField(
                    "joinedAt",
                    event.target.value
                  )
                }
              />

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
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33] disabled:opacity-60"
              >
                <Save size={18} />

                {busy
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : demoMode
                      ? "Add Demo User"
                      : "Create User Account"}
              </button>

            </form>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              {demoMode
                ? "Demo users are local-only and cannot sign in."
                : editingId
                  ? "Account changes affect real login permissions. Passwords are not changed by editing this form."
                  : "A real login account will be created. Only Active accounts can sign in. Share initial passwords securely."}
            </p>

          </section>

        </div>
      )}

      {/* USER DETAILS MODAL */}

      {viewing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setViewing(null);
            }
          }}
        >

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18A28]">
                  User Record
                </p>

                <h2
                  id="user-details-title"
                  className="mt-2 text-xl font-bold text-[#234E43]"
                >
                  {viewing.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewing(null)
                }
                aria-label="Close details"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={21} />
              </button>

            </div>

            <div className="mt-4 flex flex-wrap gap-2">

              <RoleBadge
                role={viewing.role}
              />

              <StatusBadge
                status={viewing.status}
              />

            </div>

            <div className="mt-6 space-y-3">

              {[
                [
                  "User ID",
                  viewing.userId,
                  Users,
                ],
                [
                  "Email",
                  viewing.email,
                  Mail,
                ],
                [
                  "Department",
                  viewing.department ||
                    "Not assigned",
                  GraduationCap,
                ],
                [
                  "Joined Date",
                  viewing.joinedAt ||
                    "Not provided",
                  CalendarDays,
                ],
              ].map(
                ([label, value, Icon]) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-4"
                  >
                    <Icon
                      size={18}
                      className="mt-0.5 text-[#234E43]"
                    />

                    <div>
                      <p className="text-xs text-slate-500">
                        {label}
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
                        {value}
                      </p>
                    </div>
                  </div>
                )
              )}

            </div>

            <button
              type="button"
              onClick={() =>
                setViewing(null)
              }
              className="mt-6 w-full rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
            >
              Close Details
            </button>

          </section>

        </div>
      )}

      {/* DEMO / LIVE INFORMATION */}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>
          {demoMode
            ? "Frontend Demo:"
            : "Live User Management:"}
        </strong>{" "}

        {demoMode
          ? "This page is showing local demo users. Changes here do not create login accounts or affect MongoDB."
          : "You are managing real MongoDB accounts. Role and status changes affect access to protected APIs. Use the Demo Reset button only to switch to local preview records."}
      </div>

      <p className="text-center text-xs text-slate-400">
        UniBee Admin Users ·{" "}
        {demoMode
          ? "Frontend Demo"
          : "Live MongoDB Accounts"}
      </p>

    </div>
  );
}
