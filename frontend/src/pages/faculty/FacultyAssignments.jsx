
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FileText,
  Plus,
  Search,
  CalendarDays,
  BookOpen,
  Users,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
  Eye,
  ClipboardList,
  AlertCircle,
  Save,
  RefreshCw,
  Loader2,
  GraduationCap,
  MessageSquare,
  ExternalLink,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ========================================
// UNIBEE FACULTY ASSIGNMENTS
// MONGODB CONNECTED
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const BASE = `${API_BASE}/api/assignments`;

const EMPTY_FORM = {
  title: "",
  courseId: "",
  description: "",
  deadline: "",
  marks: "20",
  status: "Draft",
};

const STATUS_STYLES = {
  Published: "bg-emerald-50 text-emerald-700",
  Draft: "bg-amber-50 text-amber-700",
  Closed: "bg-slate-100 text-slate-600",
};

// ========================================
// API HELPER
// ========================================

async function request(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to your Faculty account."
    );
  }

  const {
    method = "GET",
    body,
    signal,
  } = options;

  let response;

  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      signal,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(body !== undefined
        ? { body: JSON.stringify(body) }
        : {}),
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Cannot connect to UniBee backend."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !result ||
    result.success === false
  ) {
    throw new Error(
      result?.message ||
      `Request failed (${response.status}).`
    );
  }

  return result;
}

// ========================================
// HELPERS
// ========================================

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value.id || value._id || "");
}

function formatDate(value) {
  if (!value) return "—";

  const parts = String(value)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isFinite(part))
  ) {
    return String(value);
  }

  const date = new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCourseCode(item) {
  return item.course?.code || "N/A";
}

function getCourseTitle(item) {
  return (
    item.course?.title ||
    "Course unavailable"
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  note,
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
        {note}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function FacultyAssignments() {
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [faculty, setFaculty] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [viewing, setViewing] = useState(null);

  const [submissionAssignment, setSubmissionAssignment] =
    useState(null);

  const [submissions, setSubmissions] = useState([]);

  const [loadingSubmissions, setLoadingSubmissions] =
    useState(false);

  const [selectedSubmission, setSelectedSubmission] =
    useState(null);

  const [gradeMarks, setGradeMarks] = useState("");
  const [gradeFeedback, setGradeFeedback] =
    useState("");

  const [grading, setGrading] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  // ========================================
  // FETCH COURSES AND ASSIGNMENTS
  // ========================================

  const refresh = useCallback(() => {
    setRefreshKey((previous) => previous + 1);
  }, []);

  const loadAssignments = useCallback(async () => {
    const result = await request("/faculty/my");

    if (!Array.isArray(result.data)) {
      throw new Error(
        "Invalid assignment response."
      );
    }

    setAssignments(result.data);

    return result.data;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [courseResult, assignmentResult] =
          await Promise.all([
            request("/faculty/courses", {
              signal: controller.signal,
            }),
            request("/faculty/my", {
              signal: controller.signal,
            }),
          ]);

        if (controller.signal.aborted) return;

        setCourses(
          Array.isArray(courseResult.data)
            ? courseResult.data
            : []
        );

        setFaculty(courseResult.faculty || null);

        setAssignments(
          Array.isArray(assignmentResult.data)
            ? assignmentResult.data
            : []
        );
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [refreshKey]);

  // ========================================
  // ASSIGNMENT FORM
  // ========================================

  function openCreate() {
    if (!courses.length) {
      setError(
        "No assigned courses found. Contact your Admin or HOD."
      );
      return;
    }

    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      courseId: getId(courses[0]),
    });

    setFeedback("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(getId(item));

    setForm({
      title: item.title || "",
      courseId: getId(item.course),
      description: item.description || "",
      deadline: item.deadline || "",
      marks: String(item.marks ?? 20),
      status: item.status || "Draft",
    });

    setFeedback("");
    setError("");
    setModalOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (saving) return;

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.deadline ||
      !form.courseId
    ) {
      setError("Please complete all required fields.");
      return;
    }

    const marks = Number(form.marks);

    if (
      !Number.isFinite(marks) ||
      marks < 1 ||
      marks > 1000
    ) {
      setError("Marks must be between 1 and 1000.");
      return;
    }

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        deadline: form.deadline,
        marks,
        status: form.status,
      };

      const result = editingId
        ? await request(
            `/faculty/${editingId}`,
            {
              method: "PUT",
              body,
            }
          )
        : await request("/faculty", {
            method: "POST",
            body: {
              ...body,
              courseId: form.courseId,
            },
          });

      await loadAssignments();

      setModalOpen(false);
      setEditingId(null);

      setFeedback(
        result.message ||
        "Assignment saved successfully."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // DELETE
  // ========================================

  async function deleteAssignment(item) {
    if (
      !window.confirm(
        `Delete "${item.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      const result = await request(
        `/faculty/${getId(item)}`,
        { method: "DELETE" }
      );

      await loadAssignments();

      setFeedback(
        result.message ||
        "Assignment deleted."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // SUBMISSIONS
  // ========================================

  async function loadSubmissions(assignment) {
    setLoadingSubmissions(true);
    setError("");

    try {
      const result = await request(
        `/faculty/${getId(assignment)}/submissions`
      );

      if (!Array.isArray(result.data)) {
        throw new Error(
          "Invalid submission response."
        );
      }

      setSubmissions(result.data);
    } catch (err) {
      setError(err.message);
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }

  async function openSubmissions(item) {
    setSubmissionAssignment(item);
    setSelectedSubmission(null);
    setSubmissions([]);

    await loadSubmissions(item);
  }

  function openGrade(submission) {
    setSelectedSubmission(submission);

    setGradeMarks(
      submission.obtainedMarks !== null &&
      submission.obtainedMarks !== undefined
        ? String(submission.obtainedMarks)
        : ""
    );

    setGradeFeedback(submission.feedback || "");
    setError("");
  }

  async function submitGrade(event) {
    event.preventDefault();

    if (
      !selectedSubmission ||
      !submissionAssignment ||
      grading
    ) {
      return;
    }

    if (gradeMarks.trim() === "") {
      setError("Enter obtained marks.");
      return;
    }

    const marks = Number(gradeMarks);

    if (
      !Number.isFinite(marks) ||
      marks < 0 ||
      marks > Number(submissionAssignment.marks)
    ) {
      setError(
        `Marks must be between 0 and ${submissionAssignment.marks}.`
      );
      return;
    }

    setGrading(true);
    setError("");

    try {
      await request(
        `/faculty/submissions/${getId(
          selectedSubmission
        )}/grade`,
        {
          method: "PATCH",
          body: {
            obtainedMarks: marks,
            feedback: gradeFeedback.trim(),
          },
        }
      );

      await Promise.all([
        loadSubmissions(submissionAssignment),
        loadAssignments(),
      ]);

      setSelectedSubmission(null);
      setFeedback("Submission graded successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setGrading(false);
    }
  }

  // ========================================
  // FILTERS AND STATISTICS
  // ========================================

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assignments.filter((item) => {
      const matchesSearch = [
        item.title,
        item.description,
        getCourseCode(item),
        getCourseTitle(item),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      const matchesCourse =
        courseFilter === "All" ||
        getId(item.course) === courseFilter;

      const matchesStatus =
        statusFilter === "All" ||
        item.status === statusFilter;

      return (
        matchesSearch &&
        matchesCourse &&
        matchesStatus
      );
    });
  }, [
    assignments,
    search,
    courseFilter,
    statusFilter,
  ]);

  const published = assignments.filter(
    (item) => item.status === "Published"
  ).length;

  const drafts = assignments.filter(
    (item) => item.status === "Draft"
  ).length;

  const submissionsCount = assignments.reduce(
    (sum, item) =>
      sum + Number(item.submissions || 0),
    0
  );

  // ========================================
  // UI
  // ========================================

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Academic Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Assignments Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create assignments, manage deadlines,
            review submissions, and grade student work.
          </p>

          {faculty && (
            <p className="mt-2 text-sm font-medium text-[#477764]">
              {faculty.name}
              {faculty.facultyId
                ? ` · ${faculty.facultyId}`
                : ""}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={
              loading ||
              saving ||
              courses.length === 0
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33] disabled:opacity-50"
          >
            <Plus size={18} />
            Create Assignment
          </button>
        </div>
      </section>

      {/* FEEDBACK */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle
            size={19}
            className="shrink-0"
          />
          {error}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={19} />
          {feedback}
        </div>
      )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Assignments"
          value={loading ? "..." : assignments.length}
          icon={ClipboardList}
          note="Your MongoDB assignments"
        />

        <StatCard
          title="Published"
          value={loading ? "..." : published}
          icon={CheckCircle2}
          note="Visible to approved students"
        />

        <StatCard
          title="Drafts"
          value={loading ? "..." : drafts}
          icon={FileText}
          note="Not yet published"
        />

        <StatCard
          title="Student Submissions"
          value={loading ? "..." : submissionsCount}
          icon={Users}
          note="Submitted through Student Portal"
        />
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
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
              placeholder="Search assignments..."
              aria-label="Search assignments"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(event) =>
              setCourseFilter(event.target.value)
            }
            aria-label="Filter by course"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
          >
            <option value="All">All Courses</option>

            {courses.map((course) => (
              <option
                key={course.id}
                value={course.id}
              >
                {course.code} — {course.title}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter by status"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </section>

      {/* ASSIGNMENTS */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#234E43]">
            Assignment Collection
          </h2>

          <span className="text-sm text-slate-500">
            {filtered.length} results
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-14 text-sm text-slate-500">
            <Loader2
              size={21}
              className="animate-spin"
            />
            Loading assignments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Search
              size={32}
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-sm text-slate-500">
              {assignments.length === 0
                ? "No assignments created yet."
                : "No assignments match your filters."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-lg bg-[#A6C1A4]/25 px-3 py-1.5 text-xs font-bold text-[#234E43]">
                    {getCourseCode(item)}
                  </span>

                  <StatusBadge status={item.status} />
                </div>

                <h3 className="mt-5 text-lg font-bold text-[#234E43]">
                  {item.title}
                </h3>

                <p className="mt-2 min-h-12 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500">
                  {item.description}
                </p>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CalendarDays size={17} />
                    Due: {formatDate(item.deadline)}
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <BookOpen size={17} />
                    {item.marks} Marks
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-[#F6F8F3] p-4">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-600">
                      Student Submissions
                    </span>

                    <span className="font-semibold text-[#234E43]">
                      {item.submissions || 0}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Graded: {item.graded || 0}
                    </span>

                    <span>
                      To review:{" "}
                      {Math.max(
                        0,
                        Number(item.submissions || 0) -
                        Number(item.graded || 0)
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setViewing(item)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#193B33]"
                  >
                    <Eye size={16} />
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => openSubmissions(item)}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    <Users size={16} />
                    Submissions
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    disabled={
                      saving || item.status === "Closed"
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-[#234E43] hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      deleteAssignment(item)
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
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

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-form-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="assignment-form-title"
                className="text-xl font-bold text-[#234E43]"
              >
                {editingId
                  ? "Edit Assignment"
                  : "Create Assignment"}
              </h2>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg bg-slate-100 p-2 disabled:opacity-40"
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
                  Assignment Title
                </label>

                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                  placeholder="Enter assignment title"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Assigned Course
                </label>

                <select
                  required
                  disabled={Boolean(editingId)}
                  value={form.courseId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      courseId: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm disabled:bg-slate-50"
                >
                  {courses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.code} — {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Description
                </label>

                <textarea
                  required
                  maxLength={10000}
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                  placeholder="Assignment instructions..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Deadline
                  </label>

                  <input
                    required
                    type="date"
                    value={form.deadline}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        deadline: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Total Marks
                  </label>

                  <input
                    required
                    type="number"
                    min="1"
                    max="1000"
                    step="any"
                    value={form.marks}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        marks: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                  />
                </div>
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
                  {(!editingId ||
                    form.status === "Draft") && (
                    <option value="Draft">
                      Draft
                    </option>
                  )}

                  <option value="Published">
                    Published
                  </option>

                  {editingId && (
                    <option value="Closed">
                      Closed
                    </option>
                  )}
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={18} />
                )}

                {saving
                  ? "Saving..."
                  : editingId
                  ? "Save Changes"
                  : "Create Assignment"}
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
            if (event.target === event.currentTarget) {
              setViewing(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-details-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="assignment-details-title"
                className="text-xl font-bold text-[#234E43]"
              >
                {viewing.title}
              </h2>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close details"
                className="rounded-lg bg-slate-100 p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4">
              <StatusBadge
                status={viewing.status}
              />
            </div>

            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
              {viewing.description}
            </p>

            <div className="mt-5 space-y-3 rounded-xl bg-[#F6F8F3] p-4 text-sm text-[#234E43]">
              <p>
                Course: {getCourseCode(viewing)}
                {" — "}
                {getCourseTitle(viewing)}
              </p>

              <p>
                Semester: {viewing.semester}
              </p>

              <p>
                Deadline: {formatDate(viewing.deadline)}
              </p>

              <p>
                Total Marks: {viewing.marks}
              </p>

              <p>
                Submissions: {viewing.submissions || 0}
              </p>

              <p>
                Graded: {viewing.graded || 0}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const item = viewing;
                setViewing(null);
                openSubmissions(item);
              }}
              className="mt-5 w-full rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
            >
              View Student Submissions
            </button>
          </section>
        </div>
      )}

      {/* SUBMISSIONS MODAL */}
      {submissionAssignment && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="submissions-dialog-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="submissions-dialog-title"
                  className="text-xl font-bold text-[#234E43]"
                >
                  Student Submissions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {submissionAssignment.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (grading) return;
                  setSubmissionAssignment(null);
                  setSelectedSubmission(null);
                }}
                disabled={grading}
                className="rounded-lg bg-slate-100 p-2"
                aria-label="Close submissions"
              >
                <X size={20} />
              </button>
            </div>

            {loadingSubmissions ? (
              <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
                <Loader2
                  size={20}
                  className="animate-spin"
                />
                Loading submissions...
              </div>
            ) : submissions.length === 0 ? (
              <div className="py-14 text-center">
                <Users
                  size={36}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm text-slate-500">
                  No student submissions yet.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-[#234E43]">
                          {submission.student?.name ||
                            "Student"}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {submission.student?.studentId ||
                            "Student ID unavailable"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          submission.status === "Graded"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {submission.status}
                      </span>
                    </div>

                    {submission.submissionText && (
                      <p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-[#F6F8F3] p-3 text-sm text-slate-600">
                        {submission.submissionText}
                      </p>
                    )}

                    {submission.submissionUrl && (
                      <a
                        href={submission.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 break-all text-sm font-semibold text-[#477764] underline"
                      >
                        <ExternalLink size={15} />
                        Open Submitted Document
                      </a>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">
                        {submission.status === "Graded"
                          ? `Marks: ${submission.obtainedMarks}/${submissionAssignment.marks}`
                          : "Awaiting grading"}
                      </p>

                      <button
                        type="button"
                        onClick={() => openGrade(submission)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-4 py-2.5 text-xs font-semibold text-white"
                      >
                        <GraduationCap size={16} />
                        {submission.status === "Graded"
                          ? "Update Grade"
                          : "Grade Submission"}
                      </button>
                    </div>

                    {submission.feedback && (
                      <p className="mt-3 flex items-start gap-2 whitespace-pre-wrap text-xs text-slate-600">
                        <MessageSquare size={15} />
                        {submission.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* GRADING FORM */}
            {selectedSubmission && (
              <form
                onSubmit={submitGrade}
                className="mt-6 space-y-4 rounded-xl border border-[#A6C1A4] bg-[#F6F8F3] p-5"
              >
                <h3 className="font-bold text-[#234E43]">
                  Grade:{" "}
                  {selectedSubmission.student?.name ||
                    "Student"}
                </h3>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">
                    Obtained Marks (Maximum{" "}
                    {submissionAssignment.marks})
                  </label>

                  <input
                    type="number"
                    required
                    min="0"
                    max={submissionAssignment.marks}
                    step="any"
                    value={gradeMarks}
                    onChange={(event) =>
                      setGradeMarks(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">
                    Faculty Feedback
                  </label>

                  <textarea
                    rows={3}
                    maxLength={5000}
                    value={gradeFeedback}
                    onChange={(event) =>
                      setGradeFeedback(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                    placeholder="Write your feedback..."
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={grading}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {grading ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={17} />
                    )}

                    Save Grade
                  </button>

                  <button
                    type="button"
                    disabled={grading}
                    onClick={() =>
                      setSelectedSubmission(null)
                    }
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        UniBee Faculty Assignments · MongoDB Connected
      </p>
    </div>
  );
}
