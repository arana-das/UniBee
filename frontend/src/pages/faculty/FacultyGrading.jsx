
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  GraduationCap,
  Search,
  BookOpen,
  FileText,
  Users,
  Award,
  BarChart3,
  Save,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ClipboardCheck,
  Loader2,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ========================================
// UNIBEE FACULTY GRADING
// REAL MONGODB ASSIGNMENT SUBMISSIONS
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const BASE = `${API_BASE}/api/assignments`;

// ========================================
// API HELPER
// ========================================

async function apiRequest(path, options = {}) {
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
    result.success !== true
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

  if (typeof value === "string") {
    return value;
  }

  return String(value.id || value._id || "");
}

function getLetterGrade(percentage) {
  if (percentage >= 80) return "A+";
  if (percentage >= 75) return "A";
  if (percentage >= 70) return "A-";
  if (percentage >= 65) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 55) return "B-";
  if (percentage >= 50) return "C+";
  if (percentage >= 45) return "C";
  if (percentage >= 40) return "D";

  return "F";
}

function formatDate(value) {
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

// Protect spreadsheet users from
// CSV formula injection.

function csvCell(value) {
  let text = String(value ?? "");

  if (/^[\s]*[=+\-@\t\r]/.test(text)) {
    text = "'" + text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCSV(filename, rows) {
  const content =
    "\uFEFF" +
    rows
      .map((row) =>
        row.map(csvCell).join(",")
      )
      .join("\r\n");

  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

// ========================================
// REUSABLE STAT CARD
// ========================================

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {detail}
      </p>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function FacultyGrading() {
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] =
    useState([]);

  const [courseId, setCourseId] = useState("");
  const [assignmentId, setAssignmentId] =
    useState("");

  const [submissions, setSubmissions] =
    useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingGrades, setLoadingGrades] =
    useState(false);

  const [savingId, setSavingId] = useState("");
  const [refreshKey, setRefreshKey] =
    useState(0);

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  // Unsaved edits are local form values.
  // Persisted grades always come from API.
  const [drafts, setDrafts] = useState({});

  // ========================================
  // LOAD FACULTY COURSES AND ASSIGNMENTS
  // ========================================

  const refresh = useCallback(() => {
    setRefreshKey((previous) => previous + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [
          courseResult,
          assignmentResult,
        ] = await Promise.all([
          apiRequest("/faculty/courses", {
            signal: controller.signal,
          }),
          apiRequest("/faculty/my", {
            signal: controller.signal,
          }),
        ]);

        if (controller.signal.aborted) return;

        if (
          !Array.isArray(courseResult.data) ||
          !Array.isArray(assignmentResult.data)
        ) {
          throw new Error(
            "Invalid Faculty grading data received."
          );
        }

        setCourses(courseResult.data);
        setAssignments(assignmentResult.data);

        const currentCourseExists =
          courseResult.data.some(
            (item) =>
              getId(item) === courseId
          );

        if (
          !currentCourseExists &&
          courseResult.data.length
        ) {
          setCourseId(
            getId(courseResult.data[0])
          );
        }

        if (!courseResult.data.length) {
          setCourseId("");
          setAssignmentId("");
        }
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
  // SELECTED COURSE / ASSIGNMENT
  // ========================================

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (item) => getId(item) === courseId
      ) || null,
    [courses, courseId]
  );

  const courseAssignments = useMemo(
    () =>
      assignments.filter(
        (item) =>
          getId(item.course) === courseId
      ),
    [assignments, courseId]
  );

  useEffect(() => {
    const exists = courseAssignments.some(
      (item) =>
        getId(item) === assignmentId
    );

    if (!exists) {
      setAssignmentId(
        courseAssignments.length
          ? getId(courseAssignments[0])
          : ""
      );
    }
  }, [courseAssignments, assignmentId]);

  const assignment = useMemo(
    () =>
      courseAssignments.find(
        (item) =>
          getId(item) === assignmentId
      ) || null,
    [courseAssignments, assignmentId]
  );

  // ========================================
  // LOAD REAL STUDENT SUBMISSIONS
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setSubmissions([]);
      setDrafts({});
      setFeedback("");

      if (!assignmentId) {
        setLoadingGrades(false);
        return;
      }

      setLoadingGrades(true);
      setError("");

      try {
        const result = await apiRequest(
          `/faculty/${assignmentId}/submissions`,
          {
            signal: controller.signal,
          }
        );

        if (controller.signal.aborted) return;

        if (!Array.isArray(result.data)) {
          throw new Error(
            "Invalid submission list received."
          );
        }

        setSubmissions(result.data);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingGrades(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [assignmentId, refreshKey]);

  // ========================================
  // FORM STATE
  // ========================================

  function getDraft(submission) {
    return (
      drafts[getId(submission)] || {
        marks:
          submission.status === "Graded" &&
          submission.obtainedMarks !== null
            ? String(submission.obtainedMarks)
            : "",
        feedback:
          submission.feedback || "",
      }
    );
  }

  function changeDraft(
    submission,
    field,
    value
  ) {
    const id = getId(submission);

    setDrafts((previous) => ({
      ...previous,
      [id]: {
        ...(
          previous[id] || {
            marks:
              submission.obtainedMarks !== null &&
              submission.obtainedMarks !== undefined
                ? String(
                    submission.obtainedMarks
                  )
                : "",
            feedback:
              submission.feedback || "",
          }
        ),
        [field]: value,
      },
    }));

    setFeedback("");
  }

  function resetDraft(submission) {
    const id = getId(submission);

    setDrafts((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }

  // ========================================
  // SAVE GRADE TO MONGODB
  // ========================================

  async function saveGrade(submission) {
    if (!assignment || savingId) return;

    const id = getId(submission);
    const draft = getDraft(submission);

    if (String(draft.marks).trim() === "") {
      setError("Please enter obtained marks.");
      return;
    }

    const marks = Number(draft.marks);
    const maximum = Number(assignment.marks);

    if (
      !Number.isFinite(marks) ||
      marks < 0 ||
      marks > maximum
    ) {
      setError(
        `Marks must be between 0 and ${maximum}.`
      );
      return;
    }

    if (draft.feedback.length > 5000) {
      setError(
        "Feedback cannot exceed 5000 characters."
      );
      return;
    }

    setSavingId(id);
    setError("");
    setFeedback("");

    try {
      const result = await apiRequest(
        `/faculty/submissions/${id}/grade`,
        {
          method: "PATCH",
          body: {
            obtainedMarks: marks,
            feedback:
              draft.feedback.trim(),
          },
        }
      );

      const updated = result.data;

      setSubmissions((previous) =>
        previous.map((item) =>
          getId(item) === id
            ? updated
            : item
        )
      );

      resetDraft(submission);

      setFeedback(
        `Grade saved successfully for ${
          submission.student?.name ||
          "student"
        }.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId("");
    }
  }

  // ========================================
  // FILTERED SUBMISSIONS
  // ========================================

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return submissions.filter(
      (submission) => {
        const student =
          submission.student || {};

        return [
          student.name,
          student.studentId,
          student.email,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );
      }
    );
  }, [submissions, search]);

  // ========================================
  // REAL GRADE STATISTICS
  // ========================================

  const gradedRecords = submissions.filter(
    (item) =>
      item.status === "Graded" &&
      Number.isFinite(
        Number(item.obtainedMarks)
      ) &&
      item.obtainedMarks !== null
  );

  const gradedCount = gradedRecords.length;
  const submittedCount = submissions.length;

  const averageMarks =
    gradedCount > 0
      ? gradedRecords.reduce(
          (sum, item) =>
            sum + Number(item.obtainedMarks),
          0
        ) / gradedCount
      : null;

  const maxMarks =
    Number(assignment?.marks || 0);

  const averagePercentage =
    averageMarks !== null &&
    maxMarks > 0
      ? (averageMarks / maxMarks) * 100
      : null;

  const highestMarks =
    gradedCount > 0
      ? Math.max(
          ...gradedRecords.map(
            (item) =>
              Number(item.obtainedMarks)
          )
        )
      : null;

  const completion =
    submittedCount > 0
      ? Math.round(
          (gradedCount / submittedCount) * 100
        )
      : 0;

  // ========================================
  // CSV EXPORT
  // ========================================

  function exportGrades() {
    if (!assignment) return;

    const rows = [
      [
        "Student ID",
        "Student Name",
        "Course Code",
        "Assignment",
        "Total Marks",
        "Obtained Marks",
        "Percentage",
        "Letter Grade",
        "Submission Status",
        "Faculty Feedback",
      ],
      ...submissions.map((item) => {
        const graded =
          item.status === "Graded";

        const marks = graded
          ? Number(item.obtainedMarks)
          : null;

        const percentage =
          graded && maxMarks > 0
            ? (marks / maxMarks) * 100
            : null;

        return [
          item.student?.studentId || "",
          item.student?.name || "",
          selectedCourse?.code || "",
          assignment.title,
          maxMarks,
          graded ? marks : "",
          percentage === null
            ? ""
            : percentage.toFixed(2),
          percentage === null
            ? ""
            : getLetterGrade(percentage),
          item.status,
          item.feedback || "",
        ];
      }),
    ];

    const safeName = String(
      assignment.title || "Assignment"
    )
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);

    downloadCSV(
      `UniBee_Grades_${safeName}.csv`,
      rows
    );

    setFeedback(
      "Current assignment gradebook exported."
    );
  }

  // ========================================
  // UI
  // ========================================

  return (
    <div className="space-y-7">

      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Academic Assessment
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Grading & Assessment
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review real student submissions,
            award marks, provide feedback,
            and manage assignment grades.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading || Boolean(savingId)}
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

          <div className="flex items-center gap-2 rounded-xl bg-[#A6C1A4]/25 px-4 py-3 text-sm font-semibold text-[#234E43]">
            <GraduationCap size={20} />
            Faculty Grading
          </div>
        </div>
      </section>

      {/* FEEDBACK */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle
            size={18}
            className="shrink-0"
          />
          {error}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </div>
      )}

      {/* SELECTION */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <BookOpen
            size={19}
            className="text-[#234E43]"
          />

          <h2 className="font-bold text-[#234E43]">
            Assessment Selection
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="grading-course"
              className="mb-2 block text-sm font-semibold text-slate-600"
            >
              Select Course
            </label>

            <select
              id="grading-course"
              value={courseId}
              disabled={loading || Boolean(savingId)}
              onChange={(event) => {
                setCourseId(event.target.value);
                setAssignmentId("");
                setSearch("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:opacity-50"
            >
              {courses.length === 0 && (
                <option value="">
                  No assigned courses
                </option>
              )}

              {courses.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.code} — {item.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="grading-assignment"
              className="mb-2 block text-sm font-semibold text-slate-600"
            >
              Select Assignment
            </label>

            <select
              id="grading-assignment"
              value={assignmentId}
              disabled={
                loading ||
                !courseAssignments.length ||
                Boolean(savingId)
              }
              onChange={(event) => {
                setAssignmentId(event.target.value);
                setSearch("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:opacity-50"
            >
              {!courseAssignments.length && (
                <option value="">
                  No assignments available
                </option>
              )}

              {courseAssignments.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.title} ({item.marks} marks)
                </option>
              ))}
            </select>
          </div>
        </div>

        {assignment && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                assignment.status === "Published"
                  ? "bg-emerald-50 text-emerald-700"
                  : assignment.status === "Closed"
                  ? "bg-slate-100 text-slate-600"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {assignment.status}
            </span>

            <span className="text-xs text-slate-500">
              Maximum marks: {assignment.marks}
            </span>

            <span className="text-xs text-slate-500">
              Semester: {assignment.semester}
            </span>
          </div>
        )}
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Submissions Received"
          value={
            loading || loadingGrades
              ? "..."
              : submittedCount
          }
          detail="Actual student submissions"
          icon={Users}
        />

        <StatCard
          title="Graded"
          value={
            loading || loadingGrades
              ? "..."
              : `${gradedCount}/${submittedCount}`
          }
          detail={`${completion}% of received submissions graded`}
          icon={ClipboardCheck}
        />

        <StatCard
          title="Average Score"
          value={
            averagePercentage === null
              ? "—"
              : `${averagePercentage.toFixed(1)}%`
          }
          detail="Average of graded submissions"
          icon={BarChart3}
        />

        <StatCard
          title="Highest Marks"
          value={
            highestMarks === null
              ? "—"
              : `${highestMarks}/${maxMarks}`
          }
          detail="Highest recorded score"
          icon={Award}
        />
      </section>

      {/* PROGRESS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-[#234E43]">
              Grading Progress
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Based on received submissions,
              not the entire enrolled class.
            </p>
          </div>

          <span className="text-lg font-bold text-[#234E43]">
            {completion}%
          </span>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#D9A536] transition-all"
            style={{
              width: `${completion}%`,
            }}
          />
        </div>
      </section>

      {/* GRADEBOOK */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#234E43]">
                Student Gradebook
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {assignment?.title ||
                  "Select an assignment"}
              </p>
            </div>

            <button
              type="button"
              onClick={exportGrades}
              disabled={
                !assignment ||
                loadingGrades ||
                !submissions.length
              }
              className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-4 py-2.5 text-xs font-semibold text-[#234E43] disabled:opacity-40"
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>

          <div className="relative mt-5">
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
              placeholder="Search student name or ID..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm"
            />
          </div>
        </div>

        {loading || loadingGrades ? (
          <div className="flex items-center justify-center gap-3 p-14 text-sm text-slate-500">
            <Loader2
              size={20}
              className="animate-spin"
            />
            Loading real grading records...
          </div>
        ) : !assignment ? (
          <div className="p-12 text-center">
            <FileText
              size={36}
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 font-semibold text-[#234E43]">
              No Assignment Selected
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Create an assignment in
              Faculty Assignments first.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users
              size={36}
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 font-semibold text-[#234E43]">
              No Submissions Found
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Student submissions will appear
              here after students submit their work.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-[#F6F8F3]">
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4">
                    Student
                  </th>
                  <th className="px-5 py-4">
                    Submission
                  </th>
                  <th className="px-5 py-4">
                    Marks
                  </th>
                  <th className="px-5 py-4">
                    Percentage
                  </th>
                  <th className="px-5 py-4">
                    Grade
                  </th>
                  <th className="px-5 py-4">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((item) => {
                  const draft = getDraft(item);

                  const entered =
                    draft.marks.trim() !== "";

                  const numericMarks =
                    Number(draft.marks);

                  const validMarks =
                    entered &&
                    Number.isFinite(numericMarks) &&
                    numericMarks >= 0 &&
                    numericMarks <= maxMarks;

                  const percentage =
                    validMarks && maxMarks > 0
                      ? (numericMarks / maxMarks) * 100
                      : null;

                  const isSaving =
                    savingId === getId(item);

                  return (
                    <tr
                      key={item.id}
                      className="align-top hover:bg-slate-50"
                    >
                      {/* STUDENT */}
                      <td className="px-5 py-5">
                        <p className="font-semibold text-[#234E43]">
                          {item.student?.name ||
                            "Student"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.student?.studentId ||
                            "ID unavailable"}
                        </p>

                        <span
                          className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.status === "Graded"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* SUBMISSION */}
                      <td className="px-5 py-5">
                        <p className="text-xs text-slate-500">
                          {formatDate(item.submittedAt)}
                        </p>

                        {item.submissionText && (
                          <p className="mt-2 max-w-xs whitespace-pre-wrap break-words text-xs text-slate-600">
                            {item.submissionText.length > 160
                              ? `${item.submissionText.slice(0, 160)}...`
                              : item.submissionText}
                          </p>
                        )}

                        {item.submissionUrl && (
                          <a
                            href={item.submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#477764] underline"
                          >
                            <ExternalLink size={13} />
                            Open Document
                          </a>
                        )}
                      </td>

                      {/* MARKS + FEEDBACK */}
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={maxMarks}
                            step="any"
                            value={draft.marks}
                            disabled={Boolean(savingId)}
                            onChange={(event) =>
                              changeDraft(
                                item,
                                "marks",
                                event.target.value
                              )
                            }
                            className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          />

                          <span className="text-xs text-slate-500">
                            / {maxMarks}
                          </span>
                        </div>

                        <label className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                          <MessageSquare size={13} />
                          Faculty Feedback
                        </label>

                        <textarea
                          rows={2}
                          maxLength={5000}
                          value={draft.feedback}
                          disabled={Boolean(savingId)}
                          onChange={(event) =>
                            changeDraft(
                              item,
                              "feedback",
                              event.target.value
                            )
                          }
                          placeholder="Optional feedback..."
                          className="mt-1 w-48 rounded-lg border border-slate-200 p-2 text-xs"
                        />
                      </td>

                      {/* PERCENTAGE */}
                      <td className="px-5 py-5 text-sm text-slate-600">
                        {percentage === null
                          ? "—"
                          : `${percentage.toFixed(1)}%`}
                      </td>

                      {/* LETTER GRADE */}
                      <td className="px-5 py-5">
                        <span className="font-bold text-[#234E43]">
                          {percentage === null
                            ? "—"
                            : getLetterGrade(percentage)}
                        </span>
                      </td>

                      {/* SAVE */}
                      <td className="px-5 py-5">
                        <button
                          type="button"
                          disabled={
                            !validMarks ||
                            Boolean(savingId)
                          }
                          onClick={() =>
                            saveGrade(item)
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          {isSaving ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <Save size={15} />
                          )}

                          {isSaving
                            ? "Saving..."
                            : item.status === "Graded"
                            ? "Update Grade"
                            : "Save Grade"}
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(savingId)}
                          onClick={() =>
                            resetDraft(item)
                          }
                          className="mt-2 block text-xs font-medium text-slate-500 underline disabled:opacity-40"
                        >
                          Reset Changes
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 bg-[#FBFCFA] p-5">
          <p className="text-xs leading-6 text-slate-500">
            <strong>Important:</strong>{" "}
            Saving a grade updates the existing
            MongoDB Assignment Submission
            record. The student can then view
            marks and feedback in My Assignments.
            This does not publish an official
            examination result or calculate CGPA.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <p className="text-center text-xs text-slate-400">
        UniBee Faculty Grading · MongoDB Connected
      </p>
    </div>
  );
}
