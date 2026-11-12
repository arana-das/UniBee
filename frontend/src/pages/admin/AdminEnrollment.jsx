
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  UserPlus,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  Clock3,
  XCircle,
  Search,
  Filter,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
  Download,
  RotateCcw,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CalendarDays,
} from "lucide-react";

import {
  getAuthToken,
} from "../../services/authApi";

import {
  getStudents,
} from "../../services/studentApi";

// ========================================
// CONFIGURATION
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 8;

const STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
  "Dropped",
];

const clean = (value) =>
  String(value ?? "").trim();

const norm = (value) =>
  clean(value).toLowerCase();

const idOf = (record) =>
  clean(record?._id || record?.id);

const studentName = (student) =>
  clean(
    student?.name ||
    student?.fullName ||
    "Unknown Student"
  );

const courseCode = (course) =>
  clean(
    course?.courseCode ||
    course?.code
  );

const courseTitle = (course) =>
  clean(
    course?.courseTitle ||
    course?.title ||
    "Untitled Course"
  );

const today = () => {
  const date = new Date();

  const local = new Date(
    date.getTime() -
    date.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 10);
};

const dateInput = (value) => {
  if (!value) return today();
  return String(value).slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return clean(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function emptyForm() {
  return {
    student: "",
    course: "",
    status: "Pending",
    appliedAt: today(),
    notes: "",
  };
}

// ========================================
// BACKEND API
// ========================================

async function apiRequest(
  path,
  options = {}
) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Authentication required. Please log in."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}/api${path}`,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
          ...options.headers,
        },
      }
    );
  } catch {
    throw new Error(
      "Cannot connect to UniBee backend."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
      `API request failed (${response.status}).`
    );
  }

  return result.data ?? result;
}

async function fetchCourses() {
  return apiRequest("/academic/courses");
}

async function fetchEnrollments() {
  return apiRequest("/enrollments");
}

// ========================================
// UI COMPONENTS
// ========================================

function StatusBadge({ status }) {
  const styles = {
    Pending:
      "bg-amber-50 text-amber-800",
    Approved:
      "bg-emerald-50 text-emerald-700",
    Rejected:
      "bg-rose-50 text-rose-700",
    Dropped:
      "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
        styles[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}) {
  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold text-[#234E43]">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {detail}
      </p>
    </article>
  );
}

// ========================================
// CSV EXPORT
// ========================================

function exportCSV(rows) {
  const headers = [
    "Enrollment ID",
    "Student ID",
    "Student Name",
    "Course Code",
    "Course Title",
    "Semester",
    "Status",
    "Applied Date",
    "Reviewed Date",
    "Notes",
  ];

  const values = rows.map((item) => [
    item.id,
    item.studentId,
    item.studentName,
    item.courseCode,
    item.courseTitle,
    item.semester,
    item.status,
    formatDate(item.appliedAt),
    formatDate(item.reviewedAt),
    item.notes,
  ]);

  function safeCell(value) {
    let content = clean(value);

    if (/^\s*[=+\-@\t\r]/.test(content)) {
      content = "'" + content;
    }

    return `"${content.replace(/"/g, '""')}"`;
  }

  const csv =
    "\uFEFF" +
    [headers, ...values]
      .map((row) =>
        row.map(safeCell).join(",")
      )
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: "text/csv;charset=utf-8",
    })
  );

  const link = document.createElement("a");

  link.href = url;
  link.download =
    "UniBee_Admin_Enrollments.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}

// ========================================
// MAIN ADMIN ENROLLMENT
// ========================================

export default function AdminEnrollment() {
  const [students, setStudents] =
    useState([]);

  const [courses, setCourses] =
    useState([]);

  const [enrollments, setEnrollments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [feedback, setFeedback] =
    useState("");

  const [modalError, setModalError] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [semesterFilter, setSemesterFilter] =
    useState("All");

  const [page, setPage] =
    useState(1);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [viewing, setViewing] =
    useState(null);

  const [form, setForm] =
    useState(emptyForm);

  // ======================================
  // LOAD MONGODB RECORDS
  // ======================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error(
          "Please log in with your Admin account."
        );
      }

      const [
        studentData,
        courseData,
        enrollmentData,
      ] = await Promise.all([
        getStudents(token),
        fetchCourses(),
        fetchEnrollments(),
      ]);

      if (
        !Array.isArray(studentData) ||
        !Array.isArray(courseData) ||
        !Array.isArray(enrollmentData)
      ) {
        throw new Error(
          "Invalid MongoDB data returned by server."
        );
      }

      setStudents(studentData);
      setCourses(courseData);
      setEnrollments(enrollmentData);
    } catch (requestError) {
      setError(
        requestError?.message ||
        "Unable to load enrollment records."
      );

      // Do not display stale records.
      setStudents([]);
      setCourses([]);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ======================================
  // ACTIVE STUDENTS & COURSES
  // ======================================

  const activeStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          norm(student.status) === "active"
      ),
    [students]
  );

  const activeCourses = useMemo(
    () =>
      courses.filter(
        (course) =>
          norm(course.status) === "active"
      ),
    [courses]
  );

  const studentMap = useMemo(
    () =>
      new Map(
        students.map((student) => [
          idOf(student),
          student,
        ])
      ),
    [students]
  );

  const courseMap = useMemo(
    () =>
      new Map(
        courses.map((course) => [
          idOf(course),
          course,
        ])
      ),
    [courses]
  );

  // ======================================
  // NORMALIZED ENROLLMENT RECORDS
  // ======================================

  const enriched = useMemo(
    () =>
      enrollments.map((item) => {
        const studentRef =
          item.student &&
          typeof item.student === "object"
            ? item.student
            : null;

        const courseRef =
          item.course &&
          typeof item.course === "object"
            ? item.course
            : null;

        const studentId = studentRef
          ? idOf(studentRef)
          : clean(item.student);

        const courseId = courseRef
          ? idOf(courseRef)
          : clean(item.course);

        const student =
          studentMap.get(studentId) ||
          studentRef;

        const course =
          courseMap.get(courseId) ||
          courseRef;

        return {
          ...item,
          id: idOf(item),
          studentObjectId: studentId,
          courseObjectId: courseId,
          studentId:
            item.studentId ||
            student?.studentId ||
            "—",
          studentName:
            student
              ? studentName(student)
              : item.studentName ||
                "Unknown Student",
          courseCode:
            item.courseCode ||
            courseCode(course),
          courseTitle:
            course
              ? courseTitle(course)
              : item.courseTitle ||
                "Unknown Course",
          semester:
            item.semester ||
            course?.semester ||
            "",
        };
      }),
    [
      enrollments,
      studentMap,
      courseMap,
    ]
  );

  // ======================================
  // FILTERS
  // ======================================

  const semesters = useMemo(
    () =>
      [
        ...new Set(
          [
            ...courses.map(
              (course) => course.semester
            ),
            ...enriched.map(
              (item) => item.semester
            ),
          ]
            .map(clean)
            .filter(Boolean)
        ),
      ].sort(),
    [courses, enriched]
  );

  const filtered = useMemo(() => {
    const search = norm(query);

    return enriched.filter((item) => {
      const matchesSearch = [
        item.id,
        item.studentId,
        item.studentName,
        item.courseCode,
        item.courseTitle,
        item.semester,
      ].some((value) =>
        norm(value).includes(search)
      );

      return (
        matchesSearch &&
        (
          statusFilter === "All" ||
          item.status === statusFilter
        ) &&
        (
          semesterFilter === "All" ||
          item.semester === semesterFilter
        )
      );
    });
  }, [
    enriched,
    query,
    statusFilter,
    semesterFilter,
  ]);

  // ======================================
  // STATISTICS
  // ======================================

  const approvedCount =
    enrollments.filter(
      (item) =>
        item.status === "Approved"
    ).length;

  const pendingCount =
    enrollments.filter(
      (item) =>
        item.status === "Pending"
    ).length;

  const rejectedCount =
    enrollments.filter(
      (item) =>
        item.status === "Rejected"
    ).length;

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

  // ======================================
  // FORM ACTIONS
  // ======================================

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);

    setForm({
      student: item.studentObjectId,
      course: item.courseObjectId,
      status: item.status,
      appliedAt: dateInput(
        item.appliedAt
      ),
      notes: item.notes || "",
    });

    setModalError("");
    setFeedback("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setModalError("");
  }

  function updateForm(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setModalError("");
  }

  const selectedCourse =
    courseMap.get(form.course);

  const selectedStudent =
    studentMap.get(form.student);

  const studentOptions = useMemo(() => {
    if (!editingId || !form.student) {
      return activeStudents;
    }

    const current =
      studentMap.get(form.student);

    if (
      !current ||
      activeStudents.some(
        (student) =>
          idOf(student) === idOf(current)
      )
    ) {
      return activeStudents;
    }

    return [
      current,
      ...activeStudents,
    ];
  }, [
    activeStudents,
    editingId,
    form.student,
    studentMap,
  ]);

  const courseOptions = useMemo(() => {
    if (!editingId || !form.course) {
      return activeCourses;
    }

    const current =
      courseMap.get(form.course);

    if (
      !current ||
      activeCourses.some(
        (course) =>
          idOf(course) === idOf(current)
      )
    ) {
      return activeCourses;
    }

    return [
      current,
      ...activeCourses,
    ];
  }, [
    activeCourses,
    editingId,
    form.course,
    courseMap,
  ]);

  // ======================================
  // CREATE / UPDATE ENROLLMENT
  // ======================================

  async function handleSave(event) {
    event.preventDefault();

    if (saving) return;

    if (
      !form.student ||
      !form.course
    ) {
      setModalError(
        "Select a valid Student and Course."
      );
      return;
    }

    const course = courseMap.get(
      form.course
    );

    if (!course) {
      setModalError(
        "Selected Course was not found."
      );
      return;
    }

    const payload = {
      student: form.student,
      course: form.course,
      semester: clean(
        course.semester
      ),
      status: form.status,
      appliedAt: form.appliedAt,
      notes: clean(form.notes),
    };

    setSaving(true);
    setModalError("");

    try {
      if (editingId) {
        await apiRequest(
          `/enrollments/${encodeURIComponent(
            editingId
          )}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        await apiRequest(
          "/enrollments",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
      }

      const message = editingId
        ? "Enrollment updated successfully."
        : "Enrollment created successfully.";

      setModalOpen(false);
      setEditingId(null);

      await loadData();

      setFeedback(message);
      setPage(1);
    } catch (requestError) {
      setModalError(
        requestError?.message ||
        "Unable to save Enrollment."
      );
    } finally {
      setSaving(false);
    }
  }

  // ======================================
  // APPROVE / REJECT / DROP
  // ======================================

  async function changeStatus(
    item,
    status
  ) {
    if (saving) return;

    const confirmed = window.confirm(
      `Change enrollment for ${item.studentName} to ${status}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      await apiRequest(
        `/enrollments/${encodeURIComponent(
          item.id
        )}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
          }),
        }
      );

      await loadData();

      setFeedback(
        `Enrollment marked ${status.toLowerCase()} successfully.`
      );
    } catch (requestError) {
      setError(
        requestError?.message ||
        "Unable to update status."
      );
    } finally {
      setSaving(false);
    }
  }

  // ======================================
  // DELETE ENROLLMENT
  // ======================================

  async function handleDelete(item) {
    if (saving) return;

    const confirmed = window.confirm(
      `Permanently delete enrollment for ${item.studentName} (${item.courseCode})?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      await apiRequest(
        `/enrollments/${encodeURIComponent(
          item.id
        )}`,
        {
          method: "DELETE",
        }
      );

      await loadData();

      setFeedback(
        "Enrollment deleted successfully."
      );
    } catch (requestError) {
      setError(
        requestError?.message ||
        "Unable to delete Enrollment."
      );
    } finally {
      setSaving(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("All");
    setSemesterFilter("All");
    setPage(1);
  }

  const canCreate =
    !loading &&
    !error &&
    activeStudents.length > 0 &&
    activeCourses.length > 0;

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            ACADEMIC MANAGEMENT
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Enrollment Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage real MongoDB student course
            registrations and enrollment decisions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-40"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={!canCreate || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Plus size={18} />
            New Enrollment
          </button>
        </div>
      </section>

      {/* ALERTS */}
      {loading && (
        <p
          role="status"
          className="rounded-xl bg-[#F6F8F3] p-4 text-sm text-[#234E43]"
        >
          Loading enrollment records from MongoDB...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </p>
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

      {!loading &&
        !error &&
        !canCreate && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Create at least one Active Student
            and one Active Course before adding
            an enrollment.
          </p>
        )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Enrollment Records"
          value={
            loading || error
              ? "—"
              : enrollments.length
          }
          detail="Total MongoDB enrollment records"
          icon={ClipboardList}
        />

        <StatCard
          label="Approved"
          value={
            loading || error
              ? "—"
              : approvedCount
          }
          detail="Approved course registrations"
          icon={CheckCircle2}
        />

        <StatCard
          label="Pending"
          value={
            loading || error
              ? "—"
              : pendingCount
          }
          detail="Requests awaiting review"
          icon={Clock3}
        />

        <StatCard
          label="Rejected"
          value={
            loading || error
              ? "—"
              : rejectedCount
          }
          detail="Rejected enrollment requests"
          icon={XCircle}
        />
      </section>

      {/* FILTER PANEL */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={19}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Search & Filter Enrollments
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
              placeholder="Search student, course or enrollment ID..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm"
            />
          </div>

          <select
            value={semesterFilter}
            onChange={(event) => {
              setSemesterFilter(
                event.target.value
              );
              setPage(1);
            }}
            aria-label="Filter by semester"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">
              All Semesters
            </option>

            {semesters.map((semester) => (
              <option
                key={semester}
                value={semester}
              >
                {semester}
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
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
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
            {filtered.length} matching enrollment records
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
                exportCSV(filtered)
              }
              disabled={
                loading ||
                !!error ||
                !filtered.length
              }
              className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43] disabled:opacity-40"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* ENROLLMENT TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student",
                  "Course",
                  "Semester",
                  "Applied",
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
              {!loading &&
                !error &&
                visible.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#234E43]">
                        {item.studentName}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {item.studentId}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-[#B18A28]">
                        {item.courseCode}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {item.courseTitle}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.semester}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDate(
                        item.appliedAt
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={item.status}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          title="View enrollment"
                          onClick={() =>
                            setViewing(item)
                          }
                          className="rounded-lg bg-slate-100 p-2 text-[#234E43]"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          title="Edit enrollment"
                          disabled={saving}
                          onClick={() =>
                            openEdit(item)
                          }
                          className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43] disabled:opacity-40"
                        >
                          <Pencil size={17} />
                        </button>

                        {item.status ===
                          "Pending" && (
                          <>
                            <button
                              type="button"
                              title="Approve enrollment"
                              disabled={saving}
                              onClick={() =>
                                changeStatus(
                                  item,
                                  "Approved"
                                )
                              }
                              className="rounded-lg bg-emerald-50 p-2 text-emerald-700 disabled:opacity-40"
                            >
                              <CheckCircle2 size={17} />
                            </button>

                            <button
                              type="button"
                              title="Reject enrollment"
                              disabled={saving}
                              onClick={() =>
                                changeStatus(
                                  item,
                                  "Rejected"
                                )
                              }
                              className="rounded-lg bg-rose-50 p-2 text-rose-700 disabled:opacity-40"
                            >
                              <XCircle size={17} />
                            </button>
                          </>
                        )}

                        {item.status ===
                          "Approved" && (
                          <button
                            type="button"
                            title="Drop enrollment"
                            disabled={saving}
                            onClick={() =>
                              changeStatus(
                                item,
                                "Dropped"
                              )
                            }
                            className="rounded-lg bg-amber-50 p-2 text-amber-700 disabled:opacity-40"
                          >
                            <XCircle size={17} />
                          </button>
                        )}

                        <button
                          type="button"
                          title="Delete enrollment"
                          disabled={saving}
                          onClick={() =>
                            handleDelete(item)
                          }
                          className="rounded-lg bg-rose-50 p-2 text-rose-600 disabled:opacity-40"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {!loading &&
            !error &&
            !visible.length && (
              <div className="py-14 text-center text-sm text-slate-500">
                No matching enrollment records found.
              </div>
            )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of{" "}
            {totalPages} ·{" "}
            {filtered.length} records
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={
                currentPage === 1 ||
                loading
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
                currentPage === totalPages ||
                loading
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

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              closeModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="enrollment-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="enrollment-form-title"
                className="text-xl font-bold text-[#234E43]"
              >
                {editingId
                  ? "Edit Enrollment"
                  : "New Enrollment"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close enrollment form"
                className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40"
              >
                <X size={21} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="space-y-5"
            >
              {/* STUDENT */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Student *
                </span>

                <select
                  required
                  value={form.student}
                  disabled={saving}
                  onChange={(event) =>
                    updateForm(
                      "student",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="">
                    Select Student
                  </option>

                  {studentOptions.map(
                    (student) => (
                      <option
                        key={idOf(student)}
                        value={idOf(student)}
                      >
                        {studentName(student)}
                        {" ("}
                        {student.studentId}
                        {")"}
                      </option>
                    )
                  )}
                </select>
              </label>

              {/* COURSE */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Course *
                </span>

                <select
                  required
                  value={form.course}
                  disabled={saving}
                  onChange={(event) =>
                    updateForm(
                      "course",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="">
                    Select Course
                  </option>

                  {courseOptions.map(
                    (course) => (
                      <option
                        key={idOf(course)}
                        value={idOf(course)}
                      >
                        {courseCode(course)}
                        {" — "}
                        {courseTitle(course)}
                        {" ("}
                        {course.semester}
                        {")"}
                      </option>
                    )
                  )}
                </select>
              </label>

              {/* COURSE INFORMATION */}
              {selectedCourse && (
                <div className="grid gap-3 rounded-xl bg-[#F6F8F3] p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Semester
                    </p>

                    <p className="mt-1 text-sm font-bold text-[#234E43]">
                      {selectedCourse.semester}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Credits
                    </p>

                    <p className="mt-1 text-sm font-bold text-[#234E43]">
                      {selectedCourse.credits ??
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      MongoDB Enrolled
                    </p>

                    <p className="mt-1 text-sm font-bold text-[#234E43]">
                      {Array.isArray(
                        selectedCourse.enrolledStudents
                      )
                        ? selectedCourse.enrolledStudents.length
                        : "—"}
                    </p>
                  </div>
                </div>
              )}

              {selectedStudent && (
                <p className="rounded-xl bg-[#F6F8F3] p-3 text-xs text-[#45685B]">
                  Student Department:{" "}
                  <strong>
                    {selectedStudent.department ||
                      "Not provided"}
                  </strong>
                </p>
              )}

              {/* STATUS & DATE */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Enrollment Status
                  </span>

                  <select
                    value={form.status}
                    disabled={saving}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    {STATUSES.map(
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

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Applied Date
                  </span>

                  <input
                    type="date"
                    required
                    value={form.appliedAt}
                    disabled={saving}
                    onChange={(event) =>
                      updateForm(
                        "appliedAt",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </label>
              </div>

              {/* NOTES */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Notes
                </span>

                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.notes}
                  disabled={saving}
                  onChange={(event) =>
                    updateForm(
                      "notes",
                      event.target.value
                    )
                  }
                  placeholder="Optional enrollment notes..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
              </label>

              {modalError && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
                >
                  {modalError}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  saving ||
                  !form.student ||
                  !form.course
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving ? (
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={18} />
                )}

                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Enrollment"
                    : "Create Enrollment"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* DETAILS MODAL */}
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
            aria-labelledby="enrollment-details-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-[#B18A28]">
                  ENROLLMENT RECORD
                </p>

                <h2
                  id="enrollment-details-title"
                  className="mt-2 break-all text-lg font-bold text-[#234E43]"
                >
                  {viewing.id}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewing(null)
                }
                aria-label="Close details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-4">
              <StatusBadge
                status={viewing.status}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                [
                  "Student",
                  `${viewing.studentName} (${viewing.studentId})`,
                  GraduationCap,
                ],
                [
                  "Course",
                  `${viewing.courseCode} — ${viewing.courseTitle}`,
                  BookOpen,
                ],
                [
                  "Semester",
                  viewing.semester,
                  CalendarDays,
                ],
                [
                  "Applied On",
                  formatDate(
                    viewing.appliedAt
                  ),
                  Clock3,
                ],
                [
                  "Reviewed On",
                  formatDate(
                    viewing.reviewedAt
                  ),
                  CheckCircle2,
                ],
                [
                  "Notes",
                  viewing.notes ||
                    "No notes",
                  ClipboardList,
                ],
              ].map(
                ([label, value, Icon]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-[#F6F8F3] p-3"
                  >
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <Icon size={15} />
                      {label}
                    </p>

                    <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
                      {value}
                    </p>
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setViewing(null)
              }
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      {/* INTEGRATION NOTICE */}
      <div className="rounded-xl border border-[#E2EADC] bg-[#F6F8F3] p-4 text-xs leading-6 text-[#45685B]">
        <strong>MongoDB Enrollment:</strong>{" "}
        Student and Course options are loaded
        from existing Admin MongoDB records.
        Enrollment decisions are saved through
        authenticated backend APIs. Approved
        records are synchronized with the
        Course enrolledStudents field.
        Course capacity limits are not enforced
        until capacity is configured in the
        backend.
      </div>

      <p className="text-center text-xs text-slate-400">
        UniBee Admin Enrollment · MongoDB
      </p>
    </div>
  );
}
