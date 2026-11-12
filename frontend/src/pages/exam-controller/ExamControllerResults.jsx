
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  X,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Database,
  Clock3,
  BookOpen,
  Send,
  Ban,
  Loader2,
  Calculator,
  TrendingUp,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// =====================================================
// UNIBEE EXAM CONTROLLER
// RESULTS & PUBLISHING
// Real MongoDB Integration + Automatic Grading
// =====================================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const INPUT =
  "w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43]";

const STATUSES = [
  "Draft",
  "Published",
  "Withheld",
];

// Default university 4.00 grading scale.
// Adjust only if your university has an
// approved different grading policy.
const GRADE_SCALE = [
  { minimum: 80, grade: "A+", point: 4.0 },
  { minimum: 75, grade: "A", point: 3.75 },
  { minimum: 70, grade: "A-", point: 3.5 },
  { minimum: 65, grade: "B+", point: 3.25 },
  { minimum: 60, grade: "B", point: 3.0 },
  { minimum: 55, grade: "B-", point: 2.75 },
  { minimum: 50, grade: "C+", point: 2.5 },
  { minimum: 45, grade: "C", point: 2.25 },
  { minimum: 40, grade: "D", point: 2.0 },
  { minimum: 0, grade: "F", point: 0.0 },
];

const EMPTY_FORM = {
  examinationId: "",
  studentId: "",
  obtainedMarks: "",
  remarks: "",
};

// =====================================================
// HELPERS
// =====================================================

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return String(value.id || value._id || "");
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value, decimals = 2) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toFixed(decimals)
    : "—";
}

function courseCode(exam) {
  return (
    exam?.course?.courseCode ||
    exam?.courseCode ||
    "—"
  );
}

function courseTitle(exam) {
  return (
    exam?.course?.courseTitle ||
    "Course"
  );
}

function examName(exam) {
  return `${
    exam?.title || "Examination"
  } — ${courseCode(exam)}`;
}

function getExamId(result) {
  return getId(result?.examination);
}

function studentName(result) {
  return (
    result?.student?.fullName ||
    result?.studentId ||
    "Student"
  );
}

// =====================================================
// AUTOMATIC GRADE CALCULATOR
// Percentage-based 4.00 scale
// =====================================================

function calculateGrade(obtainedMarks, totalMarks) {
  if (
    obtainedMarks === "" ||
    obtainedMarks === null ||
    obtainedMarks === undefined ||
    totalMarks === "" ||
    totalMarks === null ||
    totalMarks === undefined
  ) {
    return null;
  }

  const obtained = Number(obtainedMarks);
  const total = Number(totalMarks);

  if (
    !Number.isFinite(obtained) ||
    !Number.isFinite(total) ||
    total <= 0 ||
    obtained < 0 ||
    obtained > total
  ) {
    return null;
  }

  const percentage = (obtained / total) * 100;

  const matched = GRADE_SCALE.find(
    (item) => percentage >= item.minimum
  );

  if (!matched) return null;

  return {
    obtainedMarks: obtained,
    totalMarks: total,
    percentage: Number(percentage.toFixed(2)),
    grade: matched.grade,
    gradePoint: matched.point,
  };
}

// =====================================================
// CSV EXPORT
// =====================================================

function csvCell(value) {
  let content = String(value ?? "");

  if (/^\s*[=+\-@\t\r]/.test(content)) {
    content = `'${content}`;
  }

  return `"${content.replace(/"/g, '""')}"`;
}

function downloadCSV(filename, rows) {
  const content =
    "\uFEFF" +
    rows
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// =====================================================
// API REQUEST
// =====================================================

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please sign in to your Exam Controller account."
    );
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options.body !== undefined
          ? {
              "Content-Type": "application/json",
            }
          : {}),
      },
      ...(options.body !== undefined
        ? {
            body: JSON.stringify(options.body),
          }
        : {}),
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Unable to connect to UniBee backend."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    result?.success !== true
  ) {
    throw new Error(
      result?.message ||
        `Request failed (${response.status}).`
    );
  }

  return result;
}

// =====================================================
// REUSABLE COMPONENTS
// =====================================================

function StatusBadge({ status }) {
  const styles = {
    Draft: "bg-amber-50 text-amber-800",
    Published: "bg-emerald-50 text-emerald-700",
    Withheld: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] ||
        "bg-slate-100 text-slate-700"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#718579]">
            {label}
          </p>

          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-[#718579]">
        {note}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#234E43]">
        {label}
      </span>

      {children}
    </label>
  );
}

function EmptyState({
  title,
  message,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E2EADC] bg-white p-12 text-center">
      <Database
        size={34}
        className="mx-auto text-[#A6C1A4]"
      />

      <h3 className="mt-4 font-bold text-[#234E43]">
        {title}
      </h3>

      <p className="mt-2 text-sm text-[#718579]">
        {message}
      </p>
    </div>
  );
}

// =====================================================
// AUTO GRADE PREVIEW
// =====================================================

function GradePreview({
  obtainedMarks,
  totalMarks,
}) {
  const calculation = calculateGrade(
    obtainedMarks,
    totalMarks
  );

  return (
    <div className="rounded-2xl border border-[#D5E5D3] bg-[#F6F8F3] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Calculator
          size={20}
          className="text-[#234E43]"
        />

        <h3 className="font-bold text-[#234E43]">
          Automatic Grade Calculation
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white p-3 text-center">
          <p className="text-xs text-[#718579]">
            Percentage
          </p>

          <p className="mt-2 text-xl font-extrabold text-[#234E43]">
            {calculation
              ? `${formatNumber(
                  calculation.percentage
                )}%`
              : "—"}
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 text-center">
          <p className="text-xs text-[#718579]">
            Grade
          </p>

          <p className="mt-2 text-xl font-extrabold text-[#234E43]">
            {calculation?.grade || "—"}
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 text-center">
          <p className="text-xs text-[#718579]">
            Grade Point
          </p>

          <p className="mt-2 text-xl font-extrabold text-[#234E43]">
            {calculation
              ? calculation.gradePoint.toFixed(2)
              : "—"}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-[#718579]">
        Grade and Grade Point are calculated
        automatically from Obtained Marks and
        the selected Examination's Total Marks.
      </p>
    </div>
  );
}

// =====================================================
// MAIN PAGE
// =====================================================

export default function ExamControllerResults() {
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);

  const [loaded, setLoaded] = useState({
    exams: false,
    results: false,
  });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");
  const [examFilter, setExamFilter] =
    useState("All");

  const [prepareOpen, setPrepareOpen] =
    useState(false);

  const [formOpen, setFormOpen] =
    useState(false);

  const [editing, setEditing] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [viewingExamId, setViewingExamId] =
    useState("");

  // =========================================
  // FETCH MONGODB DATA
  // =========================================

  const loadData = useCallback(async (signal) => {
    setLoading(true);

    const outcomes = await Promise.allSettled([
      apiRequest("/api/examinations", {
        signal,
      }),
      apiRequest("/api/results", {
        signal,
      }),
    ]);

    if (signal?.aborted) return;

    const warnings = [];

    if (
      outcomes[0].status === "fulfilled" &&
      Array.isArray(outcomes[0].value.data)
    ) {
      setExams(outcomes[0].value.data);

      setLoaded((previous) => ({
        ...previous,
        exams: true,
      }));
    } else {
      setExams([]);

      setLoaded((previous) => ({
        ...previous,
        exams: false,
      }));

      warnings.push(
        `Examinations: ${
          outcomes[0].reason?.message ||
          "Invalid API response"
        }`
      );
    }

    if (
      outcomes[1].status === "fulfilled" &&
      Array.isArray(outcomes[1].value.data)
    ) {
      setResults(outcomes[1].value.data);

      setLoaded((previous) => ({
        ...previous,
        results: true,
      }));
    } else {
      setResults([]);

      setLoaded((previous) => ({
        ...previous,
        results: false,
      }));

      warnings.push(
        `Results: ${
          outcomes[1].reason?.message ||
          "Invalid API response"
        }`
      );
    }

    setError(warnings.join(" | "));
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadData(controller.signal);

    return () => controller.abort();
  }, [loadData]);

  async function refresh() {
    setSuccess("");
    await loadData();
  }

  // =========================================
  // EXAMINATION LOOKUP
  // =========================================

  const examMap = useMemo(
    () =>
      new Map(
        exams.map((exam) => [
          getId(exam),
          exam,
        ])
      ),
    [exams]
  );

  const selectedExam =
    examMap.get(form.examinationId);

  const selectedCalculation = calculateGrade(
    form.obtainedMarks,
    selectedExam?.marks
  );

  const completedExams = exams.filter(
    (exam) => exam.status === "Completed"
  );

  // =========================================
  // GROUP RESULTS BY EXAMINATION
  // =========================================

  const groups = useMemo(() => {
    const map = new Map();

    exams.forEach((exam) => {
      map.set(getId(exam), {
        exam,
        records: [],
      });
    });

    results.forEach((result) => {
      const examId = getExamId(result);

      if (!map.has(examId)) {
        map.set(examId, {
          exam: result.examination
            ? {
                ...result.examination,
                _id: examId,
                course: result.course,
                courseCode: result.courseCode,
              }
            : {
                _id: examId,
                title: "Examination unavailable",
                course: result.course,
                courseCode: result.courseCode,
              },
          records: [],
        });
      }

      map.get(examId).records.push(result);
    });

    return [...map.values()].filter(
      (group) => group.records.length > 0
    );
  }, [exams, results]);

  const filteredGroups = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return groups.filter((group) => {
      const examId = getId(group.exam);

      const matchesExam =
        examFilter === "All" ||
        examId === examFilter;

      const matchesSearch = [
        group.exam.title,
        courseCode(group.exam),
        courseTitle(group.exam),
        ...group.records.flatMap((record) => [
          record.studentId,
          studentName(record),
        ]),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      const matchesStatus =
        statusFilter === "All" ||
        group.records.some(
          (record) =>
            record.status === statusFilter
        );

      return (
        matchesExam &&
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    groups,
    search,
    examFilter,
    statusFilter,
  ]);

  const viewingGroup = groups.find(
    (group) =>
      getId(group.exam) === viewingExamId
  );

  // =========================================
  // SUMMARY
  // =========================================

  const summary = {
    total: results.length,

    draft: results.filter(
      (item) => item.status === "Draft"
    ).length,

    published: results.filter(
      (item) => item.status === "Published"
    ).length,

    withheld: results.filter(
      (item) => item.status === "Withheld"
    ).length,
  };

  // =========================================
  // FORM ACTIONS
  // =========================================

  function updateField(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openCreate(examId = "") {
    setEditing(null);

    setForm({
      ...EMPTY_FORM,
      examinationId: examId,
    });

    setError("");
    setSuccess("");
    setPrepareOpen(false);
    setFormOpen(true);
  }

  function openEdit(record) {
    setEditing(record);

    setForm({
      examinationId: getExamId(record),
      studentId: record.studentId || "",
      obtainedMarks: String(
        record.obtainedMarks ?? ""
      ),
      remarks: record.remarks || "",
    });

    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  // =========================================
  // SAVE RESULT WITH AUTO GRADE
  // =========================================

  async function saveResult(event) {
    event.preventDefault();

    if (busy) return;

    const exam = examMap.get(
      form.examinationId
    );

    if (!exam) {
      setError(
        "Select an existing examination."
      );
      return;
    }

    if (
      !editing &&
      !form.studentId.trim()
    ) {
      setError(
        "Student ID is required."
      );
      return;
    }

    // Always recalculate immediately before saving.
    // Never trust previously displayed grade values.
    const calculated = calculateGrade(
      form.obtainedMarks,
      exam.marks
    );

    if (!calculated) {
      setError(
        `Obtained Marks must be between 0 and ${exam.marks}.`
      );
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        obtainedMarks:
          calculated.obtainedMarks,

        grade:
          calculated.grade,

        gradePoint:
          calculated.gradePoint,

        remarks:
          form.remarks.trim(),
      };

      if (editing) {
        await apiRequest(
          `/api/results/${getId(editing)}`,
          {
            method: "PUT",
            body: payload,
          }
        );
      } else {
        await apiRequest(
          "/api/results",
          {
            method: "POST",
            body: {
              ...payload,
              studentId:
                form.studentId
                  .trim()
                  .toUpperCase(),

              examinationId:
                form.examinationId,

              status: "Draft",
            },
          }
        );
      }

      setFormOpen(false);
      setEditing(null);

      setSuccess(
        editing
          ? "Result, Grade and Grade Point updated successfully in MongoDB."
          : "Draft Result, Grade and Grade Point saved successfully in MongoDB."
      );

      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  // =========================================
  // CHANGE PUBLICATION STATUS
  // =========================================

  async function changeStatus(
    record,
    nextStatus
  ) {
    if (busy) return;

    const exam = examMap.get(
      getExamId(record)
    );

    if (
      nextStatus === "Published" &&
      exam?.status !== "Completed"
    ) {
      setError(
        "Only Completed examinations can have published results."
      );
      return;
    }

    const message =
      nextStatus === "Published"
        ? `Publish ${record.studentId}'s result? The student will be able to view it.`
        : `Change ${record.studentId}'s result to ${nextStatus}?`;

    if (!window.confirm(message)) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      // Recalculate the grade before publishing
      // using the examination total marks.
      const calculation = calculateGrade(
        record.obtainedMarks,
        exam?.marks ?? record.totalMarks
      );

      if (!calculation) {
        throw new Error(
          "Invalid marks. Update the result before publication."
        );
      }

      await apiRequest(
        `/api/results/${getId(record)}`,
        {
          method: "PUT",
          body: {
            grade: calculation.grade,
            gradePoint:
              calculation.gradePoint,
            status: nextStatus,
          },
        }
      );

      setSuccess(
        `Result changed to ${nextStatus} successfully.`
      );

      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  // =========================================
  // BULK PUBLISH / WITHHOLD
  // =========================================

  async function changeAllStatus(
    group,
    nextStatus
  ) {
    if (busy) return;

    const records = group.records.filter(
      (record) =>
        record.status !== nextStatus
    );

    if (!records.length) return;

    if (
      nextStatus === "Published" &&
      group.exam.status !== "Completed"
    ) {
      setError(
        "Complete the examination before publishing its results."
      );
      return;
    }

    const action =
      nextStatus === "Published"
        ? "Publish"
        : "Withhold";

    if (
      !window.confirm(
        `${action} ${records.length} result entries for "${group.exam.title}"?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    let processed = 0;

    try {
      for (const record of records) {
        const calculated = calculateGrade(
          record.obtainedMarks,
          group.exam.marks ??
            record.totalMarks
        );

        if (!calculated) {
          throw new Error(
            `Invalid marks for student ${record.studentId}.`
          );
        }

        await apiRequest(
          `/api/results/${getId(record)}`,
          {
            method: "PUT",
            body: {
              grade: calculated.grade,
              gradePoint:
                calculated.gradePoint,
              status: nextStatus,
            },
          }
        );

        processed++;
      }

      setSuccess(
        `${processed} result entries changed to ${nextStatus}.`
      );
    } catch (error) {
      setError(
        `${processed} record(s) updated before an error: ${error.message}`
      );
    } finally {
      await loadData();
      setBusy(false);
    }
  }

  // =========================================
  // DELETE RESULT
  // =========================================

  async function deleteResult(record) {
    if (busy) return;

    if (record.status === "Published") {
      setError(
        "Withhold the published result before deleting it."
      );
      return;
    }

    if (
      !window.confirm(
        `Permanently delete ${record.studentId}'s result? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest(
        `/api/results/${getId(record)}`,
        {
          method: "DELETE",
        }
      );

      setSuccess(
        "Result deleted successfully."
      );

      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  // =========================================
  // EXPORT RESULT SHEET
  // =========================================

  function exportGroup(group) {
    const rows = [
      [
        "Examination",
        "Course Code",
        "Student ID",
        "Student Name",
        "Obtained Marks",
        "Total Marks",
        "Percentage",
        "Grade",
        "Grade Point",
        "Status",
      ],
    ];

    group.records.forEach((record) => {
      const calculated = calculateGrade(
        record.obtainedMarks,
        record.totalMarks
      );

      rows.push([
        group.exam.title,
        record.courseCode ||
          courseCode(group.exam),
        record.studentId,
        studentName(record),
        record.obtainedMarks,
        record.totalMarks,
        calculated?.percentage ?? "",
        record.grade,
        record.gradePoint,
        record.status,
      ]);
    });

    downloadCSV(
      `UniBee_Results_${getId(group.exam)}.csv`,
      rows
    );
  }

  // =========================================
  // PAGE UI
  // =========================================

  return (
    <div className="space-y-7">

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          body * {
            visibility: hidden !important;
          }

          #result-print-area,
          #result-print-area * {
            visibility: visible !important;
          }

          #result-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            box-shadow: none !important;
          }

          .result-no-print,
          .result-no-print * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18B37]">
            EXAMINATION ADMINISTRATION
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Results & Publishing
          </h1>

          <p className="mt-2 text-sm text-[#718579]">
            MongoDB-connected results with
            automatic grade and grade point calculation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || busy}
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            disabled={
              !loaded.exams ||
              loading ||
              busy
            }
            onClick={() => {
              setError("");
              setForm({ ...EMPTY_FORM });
              setPrepareOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <Plus size={18} />
            Prepare Result Sheet
          </button>
        </div>
      </section>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center gap-3 rounded-xl bg-white p-4 text-sm text-[#718579]">
          <Loader2
            size={19}
            className="animate-spin"
          />
          Loading examination results from MongoDB...
        </div>
      )}

      {/* ERRORS */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle
            size={18}
            className="shrink-0"
          />
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* HERO */}
      <section className="rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
          <ShieldCheck size={17} />
          EXAM CONTROLLER
        </div>

        <h2 className="mt-4 text-2xl font-extrabold">
          Examination Results Control Center
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
          Create, review and publish examination
          results with automatic percentage,
          grade and grade point calculations.
        </p>

        <div className="mt-5 flex flex-wrap gap-3 text-xs">
          <span className="rounded-xl bg-white/10 px-4 py-2">
            {exams.length} Examinations
          </span>

          <span className="rounded-xl bg-white/10 px-4 py-2">
            {completedExams.length} Completed
          </span>

          <span className="rounded-xl bg-white/10 px-4 py-2">
            {summary.published} Published Results
          </span>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Result Entries"
          value={
            loaded.results
              ? summary.total
              : "—"
          }
          note="All student examination results"
          icon={GraduationCap}
        />

        <StatCard
          label="Draft Results"
          value={
            loaded.results
              ? summary.draft
              : "—"
          }
          note="Not visible to students"
          icon={Clock3}
        />

        <StatCard
          label="Published Results"
          value={
            loaded.results
              ? summary.published
              : "—"
          }
          note="Visible in Student Portal"
          icon={CheckCircle2}
        />

        <StatCard
          label="Withheld Results"
          value={
            loaded.results
              ? summary.withheld
              : "—"
          }
          note="Publication withheld"
          icon={Ban}
        />
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5">
        <h2 className="mb-4 font-bold text-[#234E43]">
          Search & Filter Results
        </h2>

        <div className="grid gap-3 lg:grid-cols-3">
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
              placeholder="Exam, course or student..."
              className={`${INPUT} pl-10`}
            />
          </div>

          <select
            value={examFilter}
            onChange={(event) =>
              setExamFilter(event.target.value)
            }
            className={INPUT}
          >
            <option value="All">
              All Examinations
            </option>

            {exams.map((exam) => (
              <option
                key={getId(exam)}
                value={getId(exam)}
              >
                {examName(exam)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className={INPUT}
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
      </section>

      {/* RESULT SHEETS */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-[#234E43]">
            Examination Result Sheets
          </h2>

          <span className="text-xs text-[#718579]">
            {filteredGroups.length} Examination(s)
          </span>
        </div>

        {!loading &&
          loaded.results &&
          filteredGroups.length === 0 && (
            <EmptyState
              title="No Result Sheets Found"
              message="Choose Prepare Result Sheet to enter marks for an existing examination."
            />
          )}

        <div className="grid gap-5 xl:grid-cols-2">
          {filteredGroups.map((group) => {
            const published =
              group.records.filter(
                (item) =>
                  item.status === "Published"
              ).length;

            const draft =
              group.records.filter(
                (item) =>
                  item.status === "Draft"
              ).length;

            const withheld =
              group.records.filter(
                (item) =>
                  item.status === "Withheld"
              ).length;

            return (
              <article
                key={getId(group.exam)}
                className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                    <GraduationCap size={23} />
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-[#234E43]">
                      {group.exam.title}
                    </h3>

                    <p className="mt-1 text-sm text-[#718579]">
                      {courseCode(group.exam)}
                      {" — "}
                      {courseTitle(group.exam)}
                    </p>

                    <p className="mt-1 text-xs text-[#718579]">
                      {group.exam.type}
                      {" · "}
                      {group.exam.semester || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-4 gap-2">
                  {[
                    [
                      "Entries",
                      group.records.length,
                    ],
                    ["Draft", draft],
                    ["Published", published],
                    ["Withheld", withheld],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-[#F6F8F3] p-3 text-center"
                    >
                      <p className="text-lg font-extrabold text-[#234E43]">
                        {value}
                      </p>

                      <p className="mt-1 text-[11px] text-[#718579]">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setViewingExamId(
                        getId(group.exam)
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2.5 text-xs font-bold text-white"
                  >
                    <Eye size={15} />
                    View Sheet
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      exportGroup(group)
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43]"
                  >
                    <Download size={15} />
                    CSV
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openCreate(
                        getId(group.exam)
                      )
                    }
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2.5 text-xs font-bold text-[#234E43] disabled:opacity-40"
                  >
                    <Plus size={15} />
                    Add Student
                  </button>

                  {draft + withheld > 0 && (
                    <button
                      type="button"
                      disabled={
                        busy ||
                        group.exam.status !==
                          "Completed"
                      }
                      onClick={() =>
                        changeAllStatus(
                          group,
                          "Published"
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700 disabled:opacity-40"
                    >
                      <Send size={15} />
                      Publish All
                    </button>
                  )}

                  {published > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        changeAllStatus(
                          group,
                          "Withheld"
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700 disabled:opacity-40"
                    >
                      <Ban size={15} />
                      Withhold All
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-6">
        <h2 className="text-lg font-extrabold text-[#234E43]">
          Result Publication Workflow
        </h2>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: "01 · Select Examination",
              note: "Choose a MongoDB examination.",
            },
            {
              icon: Calculator,
              title: "02 · Enter Marks",
              note: "Grade and GP calculate automatically.",
            },
            {
              icon: Send,
              title: "03 · Publish Results",
              note: "Publish after completing the examination.",
            },
          ].map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="rounded-xl bg-[#F6F8F3] p-5"
              >
                <Icon
                  size={21}
                  className="text-[#234E43]"
                />

                <h3 className="mt-3 font-bold text-[#234E43]">
                  {step.title}
                </h3>

                <p className="mt-2 text-xs leading-6 text-[#718579]">
                  {step.note}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PREPARE SHEET MODAL */}
      {prepareOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  EXAM CONTROLLER
                </p>

                <h2 className="mt-2 text-xl font-extrabold text-[#234E43]">
                  Prepare Result Sheet
                </h2>

                <p className="mt-2 text-sm text-[#718579]">
                  Select an Examination from MongoDB.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPrepareOpen(false)
                }
                aria-label="Close"
                className="h-fit rounded-lg bg-[#F6F8F3] p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6">
              <Field label="Select Examination">
                <select
                  value={form.examinationId}
                  onChange={(event) =>
                    updateField(
                      "examinationId",
                      event.target.value
                    )
                  }
                  className={INPUT}
                >
                  <option value="">
                    Choose examination
                  </option>

                  {exams
                    .filter(
                      (exam) =>
                        ![
                          "Cancelled",
                          "Postponed",
                        ].includes(exam.status)
                    )
                    .map((exam) => (
                      <option
                        key={getId(exam)}
                        value={getId(exam)}
                      >
                        {examName(exam)}
                        {" ("}
                        {exam.status}
                        {")"}
                      </option>
                    ))}
                </select>
              </Field>
            </div>

            {!exams.length && (
              <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                No examinations were returned
                by the API.
              </p>
            )}

            {selectedExam && (
              <div className="mt-5 space-y-2 rounded-xl bg-[#F6F8F3] p-4 text-sm">
                <p className="font-bold text-[#234E43]">
                  {selectedExam.title}
                </p>

                <p>
                  Course:{" "}
                  {courseCode(selectedExam)}
                </p>

                <p>
                  Maximum Marks:{" "}
                  {selectedExam.marks}
                </p>

                <p>
                  Status:{" "}
                  {selectedExam.status}
                </p>

                <p className="text-xs text-[#718579]">
                  Existing result entries:{" "}
                  {
                    results.filter(
                      (item) =>
                        getExamId(item) ===
                        getId(selectedExam)
                    ).length
                  }
                </p>
              </div>
            )}

            <button
              type="button"
              disabled={!selectedExam}
              onClick={() =>
                openCreate(
                  form.examinationId
                )
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white disabled:opacity-40"
            >
              <Plus size={18} />
              Enter Student Result
            </button>
          </section>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {formOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-3">
          <form
            onSubmit={saveResult}
            className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  EXAM CONTROLLER
                </p>

                <h2 className="mt-2 text-xl font-extrabold text-[#234E43]">
                  {editing
                    ? "Edit Student Result"
                    : "Enter Student Result"}
                </h2>

                <p className="mt-2 text-sm text-[#718579]">
                  Marks determine the Grade
                  and Grade Point automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFormOpen(false)
                }
                aria-label="Close"
                className="rounded-lg bg-[#F6F8F3] p-2"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Examination *">
                <select
                  required
                  disabled={!!editing}
                  value={form.examinationId}
                  onChange={(event) =>
                    updateField(
                      "examinationId",
                      event.target.value
                    )
                  }
                  className={INPUT}
                >
                  <option value="">
                    Select Examination
                  </option>

                  {exams
                    .filter(
                      (exam) =>
                        ![
                          "Cancelled",
                          "Postponed",
                        ].includes(exam.status)
                    )
                    .map((exam) => (
                      <option
                        key={getId(exam)}
                        value={getId(exam)}
                      >
                        {examName(exam)}
                      </option>
                    ))}

                  {editing &&
                    selectedExam &&
                    [
                      "Cancelled",
                      "Postponed",
                    ].includes(
                      selectedExam.status
                    ) && (
                      <option
                        value={getId(
                          selectedExam
                        )}
                      >
                        {examName(
                          selectedExam
                        )}
                      </option>
                    )}
                </select>
              </Field>

              <Field label="Student ID *">
                <input
                  required
                  disabled={!!editing}
                  value={form.studentId}
                  onChange={(event) =>
                    updateField(
                      "studentId",
                      event.target.value
                    )
                  }
                  placeholder="e.g. STU1"
                  className={INPUT}
                />
              </Field>

              {selectedExam && (
                <div className="rounded-xl bg-[#EAF2E8] p-4">
                  <p className="text-xs text-[#718579]">
                    Examination Total Marks
                  </p>

                  <p className="mt-1 text-2xl font-extrabold text-[#234E43]">
                    {selectedExam.marks}
                  </p>
                </div>
              )}

              <Field label="Obtained Marks *">
                <input
                  required
                  type="number"
                  min="0"
                  max={
                    selectedExam?.marks
                  }
                  step="0.01"
                  value={
                    form.obtainedMarks
                  }
                  onChange={(event) =>
                    updateField(
                      "obtainedMarks",
                      event.target.value
                    )
                  }
                  placeholder="Enter obtained marks"
                  className={INPUT}
                />
              </Field>

              {/* LIVE AUTO GRADE */}
              <GradePreview
                obtainedMarks={
                  form.obtainedMarks
                }
                totalMarks={
                  selectedExam?.marks
                }
              />

              {/* READ ONLY GRADE FIELDS */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Auto Grade">
                  <input
                    readOnly
                    value={
                      selectedCalculation?.grade ||
                      ""
                    }
                    placeholder="Calculated automatically"
                    className={`${INPUT} bg-[#F6F8F3] font-bold`}
                  />
                </Field>

                <Field label="Auto Grade Point">
                  <input
                    readOnly
                    value={
                      selectedCalculation
                        ? selectedCalculation.gradePoint.toFixed(
                            2
                          )
                        : ""
                    }
                    placeholder="Calculated automatically"
                    className={`${INPUT} bg-[#F6F8F3] font-bold`}
                  />
                </Field>
              </div>

              <Field label="Remarks">
                <textarea
                  rows={3}
                  maxLength={500}
                  value={
                    form.remarks
                  }
                  onChange={(event) =>
                    updateField(
                      "remarks",
                      event.target.value
                    )
                  }
                  placeholder="Optional remarks"
                  className={INPUT}
                />
              </Field>

              {editing && (
                <p className="rounded-xl bg-[#F6F8F3] p-3 text-xs text-[#718579]">
                  Current Status:{" "}
                  <strong>
                    {editing.status}
                  </strong>
                  . Publication status is
                  controlled separately.
                </p>
              )}

              {!editing && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                  New results are saved
                  as Draft first. Publish
                  only after verifying
                  the marks and grades.
                </p>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={
                busy ||
                !selectedCalculation
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white disabled:opacity-40"
            >
              {busy ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2
                  size={18}
                />
              )}

              {editing
                ? "Update Result in MongoDB"
                : "Save Draft Result in MongoDB"}
            </button>
          </form>
        </div>
      )}

      {/* RESULT SHEET PREVIEW */}
      {viewingGroup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3 print:static print:block print:bg-white print:p-0">
          <section
            id="result-print-area"
            className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl print:max-h-none print:overflow-visible"
          >
            <div className="result-no-print mb-5 flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-[#234E43]">
                  Result Sheet
                </h2>

                <p className="mt-1 text-sm text-[#718579]">
                  {examName(
                    viewingGroup.exam
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    exportGroup(
                      viewingGroup
                    )
                  }
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <Download size={16} />
                  CSV
                </button>

                <button
                  type="button"
                  onClick={() =>
                    window.print()
                  }
                  className="flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2 text-sm text-white"
                >
                  <Printer size={16} />
                  Print
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewingExamId("")
                  }
                  aria-label="Close result sheet"
                  className="rounded-lg bg-[#F6F8F3] p-2"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="border-b-2 border-[#234E43] pb-5 text-center">
              <h2 className="text-2xl font-black text-[#234E43]">
                UniBee
              </h2>

              <p className="mt-1 text-sm">
                Examination Administration
              </p>

              <h3 className="mt-4 text-lg font-extrabold">
                Examination Result Sheet
              </h3>

              <p className="mt-2 text-sm">
                {examName(
                  viewingGroup.exam
                )}
              </p>

              <p className="mt-1 text-xs">
                Internal Review Copy —
                includes Draft and
                Withheld records
              </p>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-xs">
                <thead className="bg-[#F6F8F3]">
                  <tr>
                    {[
                      "Student ID",
                      "Name",
                      "Marks",
                      "Percentage",
                      "Grade",
                      "Grade Point",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="border p-3"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {viewingGroup.records.map(
                    (record) => {
                      const calculated =
                        calculateGrade(
                          record.obtainedMarks,
                          record.totalMarks
                        );

                      return (
                        <tr
                          key={getId(
                            record
                          )}
                        >
                          <td className="border p-3 font-semibold">
                            {record.studentId}
                          </td>

                          <td className="border p-3">
                            {studentName(
                              record
                            )}
                          </td>

                          <td className="border p-3">
                            {formatNumber(
                              record.obtainedMarks
                            )}
                            {" / "}
                            {formatNumber(
                              record.totalMarks
                            )}
                          </td>

                          <td className="border p-3">
                            {calculated
                              ? `${calculated.percentage.toFixed(
                                  2
                                )}%`
                              : "—"}
                          </td>

                          <td className="border p-3 font-bold">
                            {record.grade ||
                              "—"}
                          </td>

                          <td className="border p-3">
                            {formatNumber(
                              record.gradePoint
                            )}
                          </td>

                          <td className="border p-3">
                            <StatusBadge
                              status={
                                record.status
                              }
                            />
                          </td>

                          <td className="result-no-print border p-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                title="Edit"
                                onClick={() =>
                                  openEdit(
                                    record
                                  )
                                }
                                className="rounded-lg bg-amber-50 p-2 text-amber-700"
                              >
                                <Pencil
                                  size={16}
                                />
                              </button>

                              {record.status !==
                              "Published" ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  title="Publish"
                                  onClick={() =>
                                    changeStatus(
                                      record,
                                      "Published"
                                    )
                                  }
                                  className="rounded-lg bg-emerald-50 p-2 text-emerald-700"
                                >
                                  <Send
                                    size={16}
                                  />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busy}
                                  title="Withhold"
                                  onClick={() =>
                                    changeStatus(
                                      record,
                                      "Withheld"
                                    )
                                  }
                                  className="rounded-lg bg-rose-50 p-2 text-rose-700"
                                >
                                  <Ban
                                    size={16}
                                  />
                                </button>
                              )}

                              {record.status !==
                                "Published" && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  title="Delete"
                                  onClick={() =>
                                    deleteResult(
                                      record
                                    )
                                  }
                                  className="rounded-lg bg-rose-50 p-2 text-rose-700"
                                >
                                  <Trash2
                                    size={16}
                                  />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-5 text-xs text-[#718579]">
              Total Assessment Entries:{" "}
              {
                viewingGroup.records
                  .length
              }
            </p>

            <div className="mt-14 grid grid-cols-2 gap-12 text-center text-xs">
              <div className="border-t pt-2">
                Prepared By
              </div>

              <div className="border-t pt-2">
                Exam Controller Signature
              </div>
            </div>
          </section>
        </div>
      )}

      {/* FOOTER */}
      <p className="text-center text-xs text-[#8AA092]">
        UniBee Exam Controller · MongoDB
        Results & Automatic Grading
      </p>
    </div>
  );
}
