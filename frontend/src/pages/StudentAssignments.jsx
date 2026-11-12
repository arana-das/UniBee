
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FileText,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Award,
  Search,
  CalendarDays,
  X,
  BookOpen,
  ArrowUpRight,
  MessageSquare,
  Link2,
  Send,
  RefreshCw,
  Loader2,
  ExternalLink,
  ClipboardCheck,
} from "lucide-react";

import { getAuthToken } from "../services/authApi";

// ========================================
// UNIBEE STUDENT ASSIGNMENTS
// MONGODB CONNECTED
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const BASE = `${API_BASE}/api/assignments`;

const STATUS_STYLES = {
  Pending: "bg-[#FFF4DC] text-[#9F741E]",
  Submitted: "bg-[#E8EFF8] text-[#456A94]",
  Graded: "bg-[#EAF2E8] text-[#427A67]",
  Overdue: "bg-red-50 text-red-700",
  Closed: "bg-slate-100 text-slate-600",
};

// ========================================
// API HELPER
// ========================================

async function request(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to your Student account."
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
    result.success !== true
  ) {
    throw new Error(
      result?.message ||
      `Assignment request failed (${response.status}).`
    );
  }

  return result;
}

// ========================================
// HELPERS
// ========================================

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

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

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeAssignment(item) {
  const course = item.course || {};

  return {
    ...item,
    id: getId(item),
    courseId: getId(course),
    courseCode:
      course.code || "N/A",
    courseTitle:
      course.title || "Course unavailable",
    semester: item.semester || "",
    mySubmission:
      item.mySubmission || null,
    canSubmit:
      item.canSubmit === true,
    isOverdue:
      item.isOverdue === true,
  };
}

function getStatus(item) {
  if (
    item.mySubmission?.status === "Graded"
  ) {
    return "Graded";
  }

  if (item.mySubmission) {
    return "Submitted";
  }

  if (item.status === "Closed") {
    return "Closed";
  }

  if (item.isOverdue) {
    return "Overdue";
  }

  return "Pending";
}

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
        STATUS_STYLES[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

// ========================================
// SUMMARY CARD
// ========================================

function SummaryCard({
  title,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
        <Icon size={24} />
      </div>

      <p className="text-sm text-[#718579]">
        {title}
      </p>

      <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
        {value}
      </h2>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function StudentAssignments() {
  const [assignments, setAssignments] =
    useState([]);

  const [student, setStudent] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalError, setModalError] =
    useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [courseFilter, setCourseFilter] =
    useState("All");

  const [selectedId, setSelectedId] =
    useState("");

  const [submissionText, setSubmissionText] =
    useState("");

  const [submissionUrl, setSubmissionUrl] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  // ========================================
  // LOAD ASSIGNMENTS FROM MONGODB
  // ========================================

  const refresh = useCallback(() => {
    setRefreshKey(
      (previous) => previous + 1
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await request(
          "/student/my",
          { signal: controller.signal }
        );

        if (controller.signal.aborted) {
          return;
        }

        if (!Array.isArray(result.data)) {
          throw new Error(
            "Invalid assignment list received."
          );
        }

        const normalized = result.data.map(
          normalizeAssignment
        );

        setAssignments(normalized);
        setStudent(result.student || null);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setAssignments([]);
        setStudent(null);
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
  // SELECTED ASSIGNMENT
  // ========================================

  const selected = useMemo(
    () =>
      assignments.find(
        (item) => item.id === selectedId
      ) || null,
    [assignments, selectedId]
  );

  function openDetails(item) {
    setSelectedId(item.id);

    setSubmissionText(
      item.mySubmission?.submissionText || ""
    );

    setSubmissionUrl(
      item.mySubmission?.submissionUrl || ""
    );

    setModalError("");
    setSuccess("");
  }

  function closeDetails() {
    if (submitting) return;

    setSelectedId("");
    setModalError("");
  }

  // ========================================
  // FILTERS
  // ========================================

  const courseOptions = useMemo(() => {
    const map = new Map();

    assignments.forEach((item) => {
      if (!map.has(item.courseId)) {
        map.set(item.courseId, {
          id: item.courseId,
          code: item.courseCode,
          title: item.courseTitle,
        });
      }
    });

    return [...map.values()].sort((a, b) =>
      a.code.localeCompare(b.code)
    );
  }, [assignments]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assignments.filter((item) => {
      const matchesSearch = [
        item.title,
        item.description,
        item.courseCode,
        item.courseTitle,
        item.semester,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      const matchesCourse =
        courseFilter === "All" ||
        item.courseId === courseFilter;

      const matchesStatus =
        statusFilter === "All" ||
        getStatus(item) === statusFilter;

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

  // ========================================
  // STATISTICS
  // ========================================

  const total = assignments.length;

  const pending = assignments.filter(
    (item) =>
      getStatus(item) === "Pending" &&
      item.canSubmit
  ).length;

  const submitted = assignments.filter(
    (item) =>
      getStatus(item) === "Submitted"
  ).length;

  const graded = assignments.filter(
    (item) =>
      getStatus(item) === "Graded"
  ).length;

  const summaryCards = [
    {
      title: "Total Assignments",
      value: loading || error ? "—" : total,
      icon: FileText,
    },
    {
      title: "Pending",
      value: loading || error ? "—" : pending,
      icon: Clock3,
    },
    {
      title: "Submitted",
      value: loading || error ? "—" : submitted,
      icon: CheckCircle2,
    },
    {
      title: "Graded",
      value: loading || error ? "—" : graded,
      icon: Award,
    },
  ];

  // ========================================
  // SUBMIT / RESUBMIT
  // ========================================

  async function handleSubmission(event) {
    event.preventDefault();

    if (
      !selected ||
      !selected.canSubmit ||
      submitting
    ) {
      return;
    }

    const text = submissionText.trim();
    const url = submissionUrl.trim();

    if (!text && !url) {
      setModalError(
        "Provide submission text or a document link."
      );
      return;
    }

    if (
      text.length > 20000 ||
      url.length > 2048
    ) {
      setModalError(
        "Submission content exceeds the allowed length."
      );
      return;
    }

    if (url) {
      try {
        const parsed = new URL(url);

        if (
          !["http:", "https:"].includes(
            parsed.protocol
          )
        ) {
          throw new Error("Invalid URL.");
        }
      } catch {
        setModalError(
          "Enter a valid HTTP or HTTPS document URL."
        );
        return;
      }
    }

    setSubmitting(true);
    setModalError("");

    try {
      const result = await request(
        `/student/${encodeURIComponent(
          selected.id
        )}/submit`,
        {
          method: "POST",
          body: {
            submissionText: text,
            submissionUrl: url,
          },
        }
      );

      // Reload the authoritative
      // assignment and submission state.
      const refreshed = await request(
        "/student/my"
      );

      if (!Array.isArray(refreshed.data)) {
        throw new Error(
          "Submission succeeded, but the refreshed assignment list was invalid."
        );
      }

      setAssignments(
        refreshed.data.map(
          normalizeAssignment
        )
      );

      setStudent(refreshed.student || null);

      setSelectedId("");
      setSubmissionText("");
      setSubmissionUrl("");

      setSuccess(
        result.message ||
        "Assignment submitted successfully."
      );

      setError("");
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-8">

      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            STUDENT ACADEMICS
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            My Assignments
          </h1>

          <p className="mt-3 text-[#718579]">
            Stay organized, monitor deadlines,
            submit your work, and review faculty feedback.
          </p>

          {student && (
            <p className="mt-2 text-sm font-medium text-[#45685B]">
              {student.name || "Student"}
              {student.studentId
                ? ` · ${student.studentId}`
                : ""}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading || submitting}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              loading ? "animate-spin" : ""
            }
          />
          Refresh
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl bg-[#F1F7EF] p-5 text-sm text-[#234E43]"
        >
          <Loader2
            size={20}
            className="animate-spin"
          />
          Loading assignments from MongoDB...
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
        >
          <AlertCircle
            size={20}
            className="shrink-0"
          />
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700"
        >
          <CheckCircle2
            size={20}
            className="shrink-0"
          />
          {success}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard
            key={card.title}
            {...card}
          />
        ))}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="rounded-2xl border border-[#E2EADC] bg-white p-5">
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
              placeholder="Search assignments..."
              aria-label="Search assignments"
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(event) =>
              setCourseFilter(event.target.value)
            }
            aria-label="Filter by course"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
          >
            <option value="All">
              All Courses
            </option>

            {courseOptions.map((course) => (
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
            aria-label="Filter assignment status"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
          >
            {[
              "All",
              "Pending",
              "Submitted",
              "Graded",
              "Overdue",
              "Closed",
            ].map((status) => (
              <option
                key={status}
                value={status}
              >
                {status === "All"
                  ? "All Status"
                  : status}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-4 text-sm text-[#718579]">
          Showing {filtered.length} of{" "}
          {total} assignments
        </p>
      </div>

      {/* ASSIGNMENT CARDS */}
      {!loading && !error && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((assignment) => {
            const status = getStatus(assignment);

            return (
              <article
                key={assignment.id}
                className="flex flex-col rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#234E43]/10"
              >
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8]">
                    <FileText
                      size={24}
                      className="text-[#234E43]"
                    />
                  </div>

                  <StatusBadge status={status} />
                </div>

                <p className="text-xs font-bold text-[#B18B37]">
                  {assignment.courseCode}
                </p>

                <h3 className="mt-2 text-xl font-bold text-[#234E43]">
                  {assignment.title}
                </h3>

                <p className="mt-2 text-sm text-[#718579]">
                  {assignment.courseTitle}
                </p>

                <div className="mt-6 space-y-3 text-sm text-[#607B6C]">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={17} />
                    Due: {formatDate(
                      assignment.deadline
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Award size={17} />
                    Total Marks: {assignment.marks}
                  </div>

                  <div className="flex items-center gap-2">
                    <BookOpen size={17} />
                    {assignment.semester}
                  </div>
                </div>

                {status === "Graded" && (
                  <div className="mt-5 rounded-xl bg-[#EAF2E8] p-4">
                    <p className="text-sm font-semibold text-[#234E43]">
                      Your Grade:{" "}
                      {assignment.mySubmission.obtainedMarks}
                      /{assignment.marks}
                    </p>
                  </div>
                )}

                {status === "Submitted" && (
                  <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#E8EFF8] p-4 text-sm text-[#456A94]">
                    <CheckCircle2 size={18} />
                    Submitted — Awaiting Faculty Review
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    openDetails(assignment)
                  }
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-4 py-3.5 font-semibold text-white transition hover:bg-[#326657]"
                >
                  View Details
                  <ArrowUpRight size={18} />
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading &&
        !error &&
        filtered.length === 0 && (
          <div className="rounded-2xl border border-[#E2EADC] bg-white p-12 text-center">
            <Search
              size={35}
              className="mx-auto text-[#A6C1A4]"
            />

            <p className="mt-4 font-semibold text-[#234E43]">
              {assignments.length === 0
                ? "No published assignments found for your approved courses."
                : "No assignments match your filters."}
            </p>

            <p className="mt-2 text-sm text-[#718579]">
              Faculty-published assignments
              will appear here automatically
              when you refresh.
            </p>
          </div>
        )}

      {/* ASSIGNMENT DETAILS MODAL */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  {selected.courseCode}
                </p>

                <h2
                  id="assignment-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {selected.title}
                </h2>

                <div className="mt-3">
                  <StatusBadge
                    status={getStatus(selected)}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                disabled={submitting}
                aria-label="Close assignment details"
                className="rounded-lg p-2 text-[#718579] hover:bg-[#F1F7EF] disabled:opacity-50"
              >
                <X size={22} />
              </button>
            </div>

            {/* DETAILS */}
            <div className="mt-6 grid gap-4 rounded-xl bg-[#F6F8F3] p-5 text-sm text-[#45685B] sm:grid-cols-2">
              <p>
                <strong>Course:</strong>{" "}
                {selected.courseTitle}
              </p>

              <p>
                <strong>Semester:</strong>{" "}
                {selected.semester}
              </p>

              <p>
                <strong>Deadline:</strong>{" "}
                {formatDate(selected.deadline)}
              </p>

              <p>
                <strong>Total Marks:</strong>{" "}
                {selected.marks}
              </p>
            </div>

            {/* INSTRUCTIONS */}
            <h3 className="mt-7 font-bold text-[#234E43]">
              Assignment Instructions
            </h3>

            <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed text-[#718579]">
              {selected.description}
            </p>

            {/* SAVED SUBMISSION */}
            {selected.mySubmission && (
              <div className="mt-7 rounded-xl border border-[#DCE8DA] bg-[#F9FBF8] p-5">
                <h3 className="flex items-center gap-2 font-bold text-[#234E43]">
                  <ClipboardCheck size={19} />
                  Your Submission
                </h3>

                <p className="mt-2 text-xs text-[#718579]">
                  Submitted:{" "}
                  {formatDateTime(
                    selected.mySubmission.submittedAt
                  )}
                </p>

                {selected.mySubmission.submissionText && (
                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#45685B]">
                    {selected.mySubmission.submissionText}
                  </p>
                )}

                {selected.mySubmission.submissionUrl && (
                  <a
                    href={
                      selected.mySubmission.submissionUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 break-all text-sm font-semibold text-[#477764] underline"
                  >
                    <ExternalLink size={16} />
                    Open Submitted Document
                  </a>
                )}
              </div>
            )}

            {/* GRADE AND FEEDBACK */}
            {selected.mySubmission?.status ===
              "Graded" && (
              <div className="mt-6 rounded-xl bg-[#EAF2E8] p-5">
                <h3 className="flex items-center gap-2 font-bold text-[#234E43]">
                  <Award size={19} />
                  Faculty Grade
                </h3>

                <p className="mt-4 text-xl font-extrabold text-[#234E43]">
                  {
                    selected.mySubmission
                      .obtainedMarks
                  }
                  /{selected.marks}
                </p>

                <h4 className="mt-5 flex items-center gap-2 text-sm font-bold text-[#234E43]">
                  <MessageSquare size={17} />
                  Faculty Feedback
                </h4>

                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[#45685B]">
                  {selected.mySubmission.feedback ||
                    "No written feedback provided."}
                </p>

                <p className="mt-3 text-xs text-[#718579]">
                  Graded:{" "}
                  {formatDateTime(
                    selected.mySubmission.gradedAt
                  )}
                </p>
              </div>
            )}

            {/* SUBMISSION FORM */}
            {selected.canSubmit && (
              <form
                onSubmit={handleSubmission}
                className="mt-7 space-y-4 border-t border-[#E2EADC] pt-6"
              >
                <h3 className="font-bold text-[#234E43]">
                  {selected.mySubmission
                    ? "Update Your Submission"
                    : "Submit Your Assignment"}
                </h3>

                <p className="text-sm text-[#718579]">
                  Provide submission text, a document
                  link, or both. The deadline is based
                  on Bangladesh local date.
                </p>

                <div>
                  <label
                    htmlFor="submission-text"
                    className="mb-2 block text-sm font-semibold text-[#45685B]"
                  >
                    Submission Text
                  </label>

                  <textarea
                    id="submission-text"
                    rows={5}
                    maxLength={20000}
                    value={submissionText}
                    onChange={(event) =>
                      setSubmissionText(
                        event.target.value
                      )
                    }
                    placeholder="Write your assignment response..."
                    className="w-full resize-y rounded-xl border border-[#E2EADC] bg-[#F9FBF8] p-4 text-sm outline-none focus:border-[#A6C1A4]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="submission-url"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#45685B]"
                  >
                    <Link2 size={16} />
                    Document Link (Optional)
                  </label>

                  <input
                    id="submission-url"
                    type="url"
                    maxLength={2048}
                    value={submissionUrl}
                    onChange={(event) =>
                      setSubmissionUrl(
                        event.target.value
                      )
                    }
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] p-4 text-sm outline-none focus:border-[#A6C1A4]"
                  />

                  <p className="mt-2 text-xs text-[#718579]">
                    Upload your document to a service
                    you trust and paste its sharing link.
                    Check that your Faculty can access it.
                  </p>
                </div>

                {modalError && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                  >
                    <AlertCircle
                      size={18}
                      className="shrink-0"
                    />
                    {modalError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    (!submissionText.trim() &&
                      !submissionUrl.trim())
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9A536] px-5 py-3.5 font-bold text-[#234E43] transition hover:bg-[#E7B84E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={19} />
                  )}

                  {submitting
                    ? "Submitting..."
                    : selected.mySubmission
                    ? "Update Submission"
                    : "Submit Assignment"}
                </button>
              </form>
            )}

            {/* SUBMITTED / OVERDUE / CLOSED */}
            {!selected.canSubmit &&
              selected.mySubmission?.status ===
                "Submitted" && (
                <div className="mt-7 rounded-xl bg-[#E8EFF8] p-5 text-sm text-[#456A94]">
                  <CheckCircle2
                    size={20}
                    className="mb-2"
                  />
                  Your submission is saved in MongoDB.
                  It is awaiting Faculty review or
                  can no longer be edited.
                </div>
              )}

            {!selected.canSubmit &&
              !selected.mySubmission && (
                <div className="mt-7 flex items-start gap-3 rounded-xl bg-amber-50 p-5 text-sm text-amber-800">
                  <AlertCircle
                    size={20}
                    className="shrink-0"
                  />

                  <span>
                    This assignment is no longer
                    open for submission.
                    {selected.isOverdue
                      ? " The deadline has passed."
                      : ""}
                  </span>
                </div>
              )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <p className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — MongoDB Assignments
      </p>
    </div>
  );
}
