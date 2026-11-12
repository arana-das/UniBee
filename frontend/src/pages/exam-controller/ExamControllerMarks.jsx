import CourseAssessmentMarks from "./CourseAssessmentMarks";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { getAuthToken } from "../../services/authApi";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const INPUT =
  "w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43]";

const BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40";

const COMPONENTS = [
  { key: "attendance", label: "Attendance" },
  { key: "assignment", label: "Assignment" },
  { key: "midterm", label: "Midterm" },
  { key: "final", label: "Final Examination" },
];

const ZERO = {
  attendance: 0,
  assignment: 0,
  midterm: 0,
  final: 0,
};

const STATUSES = [
  "Draft",
  "Submitted",
  "Under Review",
  "Verified",
  "Approved",
  "Returned",
];

const TRANSITIONS = {
  Draft: ["Submitted"],
  Submitted: ["Under Review", "Returned"],
  "Under Review": ["Verified", "Returned"],
  Verified: ["Approved", "Returned"],
  Approved: [],
  Returned: ["Submitted"],
};

const GRADE_SCALE = [
  [80, "A+", 4],
  [75, "A", 3.75],
  [70, "A-", 3.5],
  [65, "B+", 3.25],
  [60, "B", 3],
  [55, "B-", 2.75],
  [50, "C+", 2.5],
  [45, "C", 2.25],
  [40, "D", 2],
  [0, "F", 0],
];

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || "");
}

function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "—";
}

function examTitle(exam) {
  return `${exam?.title || "Examination"} — ${
    exam?.course?.courseCode || exam?.courseCode || "—"
  }`;
}

function emptyForm() {
  return {
    examinationId: "",
    studentId: "",
    componentMarks: { ...ZERO },
    maximumMarks: { ...ZERO },
    remarks: "",
  };
}

function calculate(componentMarks, maximumMarks) {
  let obtained = 0;
  let maximum = 0;

  for (const { key } of COMPONENTS) {
    const rawMark = componentMarks?.[key];
    const rawMaximum = maximumMarks?.[key];

    if (
      rawMark === "" ||
      rawMark === null ||
      rawMark === undefined ||
      rawMaximum === "" ||
      rawMaximum === null ||
      rawMaximum === undefined
    ) {
      return null;
    }

    const mark = Number(rawMark);
    const max = Number(rawMaximum);

    if (
      !Number.isFinite(mark) ||
      !Number.isFinite(max) ||
      mark < 0 ||
      max < 0 ||
      mark > max
    ) {
      return null;
    }

    obtained += mark;
    maximum += max;
  }

  if (maximum <= 0) return null;

  const percentage = (obtained / maximum) * 100;
  const grade = GRADE_SCALE.find(
    ([minimum]) => percentage >= minimum
  );

  return {
    totalObtained: Number(obtained.toFixed(2)),
    totalMaximum: Number(maximum.toFixed(2)),
    percentage: Number(percentage.toFixed(2)),
    grade: grade[1],
    gradePoint: grade[2],
  };
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please sign in to the Exam Controller account.");
  }

  let response;

  try {
    response = await fetch(`${API}${path}`, {
      method: options.method || "GET",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Cannot connect to the UniBee backend.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.message || `API request failed (${response.status}).`
    );
  }

  return result;
}

function statusStyle(status) {
  return (
    {
      Draft: "bg-slate-100 text-slate-700",
      Submitted: "bg-blue-50 text-blue-700",
      "Under Review": "bg-violet-50 text-violet-700",
      Verified: "bg-cyan-50 text-cyan-700",
      Approved: "bg-emerald-50 text-emerald-700",
      Returned: "bg-rose-50 text-rose-700",
    }[status] || "bg-slate-100 text-slate-700"
  );
}

function Badge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyle(
        status
      )}`}
    >
      {status}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#234E43]">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#718579]">{title}</p>
          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>
        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function csvCell(value) {
  let content = text(value);

  if (/^[=+\-@\t\r]/.test(content)) {
    content = "'" + content;
  }

  return `"${content.replace(/"/g, '""')}"`;
}

function downloadCSV(filename, rows) {
  const csv =
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

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

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function ExamControllerMarks() {
  const [exams, setExams] = useState([]);
  const [marks, setMarks] = useState([]);
  const [facultyGrades, setFacultyGrades] = useState([]);
  const [facultySummaries, setFacultySummaries] = useState([]);

  const [loaded, setLoaded] = useState({
    exams: false,
    marks: false,
    faculty: false,
  });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [viewing, setViewing] = useState(null);
  const [returning, setReturning] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const [assignmentLinks, setAssignmentLinks] = useState({});
  const [importingKey, setImportingKey] = useState("");

  // ====================================================
  // DATA LOADING
  // ====================================================

  const loadData = useCallback(async (signal) => {
    setLoading(true);

    const requests = await Promise.allSettled([
      apiRequest("/api/examinations", { signal }),
      apiRequest("/api/exam-marks", { signal }),
      apiRequest("/api/assignments/exam-controller/grades", {
        signal,
      }),
    ]);

    if (signal?.aborted) return;

    const names = ["exams", "marks", "faculty"];
    const nextLoaded = {
      exams: false,
      marks: false,
      faculty: false,
    };

    const problems = [];

    requests.forEach((result, index) => {
      const name = names[index];

      if (
        result.status === "fulfilled" &&
        Array.isArray(result.value?.data)
      ) {
        nextLoaded[name] = true;

        if (name === "exams") {
          setExams(result.value.data);
        }

        if (name === "marks") {
          setMarks(result.value.data);
        }

        if (name === "faculty") {
          setFacultyGrades(result.value.data);
          setFacultySummaries(
            Array.isArray(result.value.summary)
              ? result.value.summary
              : []
          );
        }
      } else {
        if (name === "exams") setExams([]);
        if (name === "marks") setMarks([]);

        if (name === "faculty") {
          setFacultyGrades([]);
          setFacultySummaries([]);
        }

        const message =
          result.status === "rejected"
            ? result.reason?.message
            : "Invalid API response.";

        problems.push(`${name}: ${message}`);
      }
    });

    setLoaded(nextLoaded);
    setError(problems.join(" | "));
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadData(controller.signal);

    return () => controller.abort();
  }, [loadData]);

  async function refresh() {
    setFeedback("");
    await loadData();
  }

  // ====================================================
  // DERIVED DATA
  // ====================================================

  const examMap = useMemo(() => {
    return new Map(
      exams.map((exam) => [getId(exam), exam])
    );
  }, [exams]);

  const selectedExam = examMap.get(form.examinationId);

  const calculation = useMemo(
    () =>
      calculate(
        form.componentMarks,
        form.maximumMarks
      ),
    [form.componentMarks, form.maximumMarks]
  );

  const summary = useMemo(() => {
    const result = { total: marks.length };

    STATUSES.forEach((status) => {
      result[status] = marks.filter(
        (mark) => mark.status === status
      ).length;
    });

    return result;
  }, [marks]);

  const filteredMarks = useMemo(() => {
    const query = text(search).toLowerCase();

    return marks.filter((mark) => {
      const matchesSearch = [
        mark.studentId,
        mark.student?.fullName,
        mark.courseCode,
        mark.course?.courseTitle,
        mark.examination?.title,
      ].some((value) =>
        text(value).toLowerCase().includes(query)
      );

      const matchesExam =
        examFilter === "All" ||
        getId(mark.examination) === examFilter;

      const matchesStatus =
        statusFilter === "All" ||
        mark.status === statusFilter;

      return (
        matchesSearch &&
        matchesExam &&
        matchesStatus
      );
    });
  }, [marks, search, examFilter, statusFilter]);

  // ====================================================
  // CREATE / EDIT MARKS
  // ====================================================

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError("");
    setFormOpen(true);
  }

  function openEdit(mark) {
    if (!["Draft", "Returned"].includes(mark.status)) {
      setError("Only Draft or Returned marks can be edited.");
      return;
    }

    setEditing(mark);

    setForm({
      examinationId: getId(mark.examination),
      studentId: mark.studentId || "",
      componentMarks: {
        ...ZERO,
        ...(mark.componentMarks || {}),
      },
      maximumMarks: {
        ...ZERO,
        ...(mark.maximumMarks || {}),
      },
      remarks: mark.remarks || "",
    });

    setError("");
    setFormOpen(true);
  }

  function selectExam(value) {
    const exam = examMap.get(value);

    setForm((previous) => ({
      ...previous,
      examinationId: value,
      componentMarks: { ...ZERO },
      maximumMarks: {
        ...ZERO,
        final: exam ? number(exam.marks) : 0,
      },
    }));
  }

  function changeComponent(group, key, value) {
    setForm((previous) => ({
      ...previous,
      [group]: {
        ...previous[group],
        [key]: value,
      },
    }));
  }

  async function saveMarks(event) {
    event.preventDefault();

    if (busy) return;

    const exam = examMap.get(form.examinationId);

    if (!exam) {
      setError("Select a valid examination.");
      return;
    }

    if (!editing && !text(form.studentId)) {
      setError("Student ID is required.");
      return;
    }

    if (
      !calculation ||
      Math.abs(
        calculation.totalMaximum - number(exam.marks)
      ) > 0.001
    ) {
      setError(
        `Maximum total must equal ${exam.marks}.`
      );
      return;
    }

    const componentMarks = {};
    const maximumMarks = {};

    COMPONENTS.forEach(({ key }) => {
      componentMarks[key] = number(
        form.componentMarks[key]
      );
      maximumMarks[key] = number(
        form.maximumMarks[key]
      );
    });

    setBusy(true);
    setError("");
    setFeedback("");

    try {
      const body = {
        componentMarks,
        maximumMarks,
        remarks: text(form.remarks),
      };

      if (editing) {
        await apiRequest(
          `/api/exam-marks/${getId(editing)}`,
          { method: "PUT", body }
        );
      } else {
        await apiRequest("/api/exam-marks", {
          method: "POST",
          body: {
            ...body,
            examinationId: form.examinationId,
            studentId: text(form.studentId).toUpperCase(),
          },
        });
      }

      setFormOpen(false);
      setEditing(null);
      await loadData();

      setFeedback(
        editing
          ? "Marks updated successfully."
          : "Draft marks saved successfully."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ====================================================
  // STATUS MANAGEMENT
  // ====================================================

  async function changeStatus(mark, nextStatus, notes = "") {
    if (busy) return;

    if (
      !TRANSITIONS[mark.status]?.includes(nextStatus)
    ) {
      setError("Invalid status transition.");
      return;
    }

    if (nextStatus === "Approved") {
      const exam = examMap.get(
        getId(mark.examination)
      );

      if (exam?.status !== "Completed") {
        setError(
          "Complete the examination before approving marks."
        );
        return;
      }
    }

    if (
      nextStatus === "Returned" &&
      !text(notes)
    ) {
      setError("Review notes are required.");
      return;
    }

    if (
      !window.confirm(
        `Change ${mark.studentId}'s status to ${nextStatus}?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setFeedback("");

    try {
      await apiRequest(
        `/api/exam-marks/${getId(mark)}/status`,
        {
          method: "PATCH",
          body: {
            status: nextStatus,
            ...(nextStatus === "Returned"
              ? { reviewNotes: text(notes) }
              : {}),
          },
        }
      );

      setReturning(null);
      setReviewNotes("");
      setViewing(null);

      await loadData();

      setFeedback(
        `Marks status changed to ${nextStatus}.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteMark(mark) {
    if (busy) return;

    if (
      !["Draft", "Returned"].includes(mark.status)
    ) {
      setError(
        "Only Draft or Returned marks can be deleted."
      );
      return;
    }

    if (
      !window.confirm(
        `Permanently delete marks for ${mark.studentId}?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await apiRequest(
        `/api/exam-marks/${getId(mark)}`,
        { method: "DELETE" }
      );

      await loadData();
      setFeedback("Marks deleted successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function workflowButtons(mark) {
    const actions = TRANSITIONS[mark.status] || [];

    return (
      <div className="flex flex-wrap gap-2">
        {actions
          .filter((status) => status !== "Returned")
          .map((status) => (
            <button
              type="button"
              key={status}
              disabled={busy}
              onClick={() =>
                changeStatus(mark, status)
              }
              className={`${BUTTON} bg-emerald-50 text-emerald-800`}
            >
              {status}
            </button>
          ))}

        {actions.includes("Returned") && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setReturning(mark);
              setReviewNotes("");
            }}
            className={`${BUTTON} bg-rose-50 text-rose-700`}
          >
            <RotateCcw size={15} />
            Return
          </button>
        )}
      </div>
    );
  }

  // ====================================================
  // FACULTY ASSIGNMENT MARKS INTEGRATION
  // ====================================================

  function assignmentKey(item) {
    return [
      item.courseId,
      item.studentMongoId,
      item.semester || "",
    ].join(":");
  }

  function getLink(item) {
    return (
      assignmentLinks[assignmentKey(item)] || {
        examinationId: "",
        allocatedMaximum: "",
      }
    );
  }

  function updateLink(item, update) {
    const key = assignmentKey(item);

    setAssignmentLinks((previous) => ({
      ...previous,
      [key]: {
        examinationId: "",
        allocatedMaximum: "",
        ...(previous[key] || {}),
        ...update,
      },
    }));
  }

  function matchingExams(item) {
    return exams.filter(
      (exam) =>
        getId(exam.course) === item.courseId &&
        !["Cancelled", "Postponed"].includes(
          exam.status
        ) &&
        (
          !item.semester ||
          !exam.semester ||
          text(exam.semester) === text(item.semester)
        )
    );
  }

  function existingMarkFor(item, examId) {
    return marks.find(
      (mark) =>
        getId(mark.examination) === examId &&
        (
          getId(mark.student) === item.studentMongoId ||
          text(mark.studentId).toUpperCase() ===
            text(item.studentId).toUpperCase()
        )
    );
  }

  async function importFacultyMarks(item) {
    if (
      busy ||
      !loaded.exams ||
      !loaded.marks
    ) {
      return;
    }

    const key = assignmentKey(item);
    const link = getLink(item);
    const exam = examMap.get(link.examinationId);

    if (
      !exam ||
      !matchingExams(item).some(
        (candidate) =>
          getId(candidate) === getId(exam)
      )
    ) {
      setError(
        "Choose an examination matching the faculty course."
      );
      return;
    }

    const allocated = Number(
      link.allocatedMaximum
    );

    const examTotal = Number(exam.marks);

    const facultyObtained = Number(
      item.obtainedMarks
    );

    const facultyMaximum = Number(
      item.maximumMarks
    );

    if (
      link.allocatedMaximum === "" ||
      !Number.isFinite(allocated) ||
      !Number.isFinite(examTotal) ||
      allocated <= 0 ||
      allocated > examTotal
    ) {
      setError(
        "Enter a valid assignment marks allocation."
      );
      return;
    }

    if (
      !Number.isFinite(facultyObtained) ||
      !Number.isFinite(facultyMaximum) ||
      facultyMaximum <= 0 ||
      facultyObtained < 0 ||
      facultyObtained > facultyMaximum
    ) {
      setError("Invalid faculty assignment marks.");
      return;
    }

    const normalized = Number(
      (
        (facultyObtained / facultyMaximum) *
        allocated
      ).toFixed(2)
    );

    const existing = existingMarkFor(
      item,
      getId(exam)
    );

    if (
      existing &&
      !["Draft", "Returned"].includes(
        existing.status
      )
    ) {
      setError(
        `Marks are ${existing.status} and cannot be overwritten.`
      );
      return;
    }

    const componentMarks = existing
      ? {
          attendance: number(
            existing.componentMarks?.attendance
          ),
          assignment: normalized,
          midterm: number(
            existing.componentMarks?.midterm
          ),
          final: number(
            existing.componentMarks?.final
          ),
        }
      : {
          ...ZERO,
          assignment: normalized,
        };

    const attendanceMaximum = existing
      ? number(
          existing.maximumMarks?.attendance
        )
      : 0;

    const midtermMaximum = existing
      ? number(
          existing.maximumMarks?.midterm
        )
      : 0;

    const remainingFinal = Number(
      (
        examTotal -
        attendanceMaximum -
        midtermMaximum -
        allocated
      ).toFixed(2)
    );

    if (
      remainingFinal < 0 ||
      componentMarks.final > remainingFinal
    ) {
      setError(
        "Assignment allocation conflicts with existing marks."
      );
      return;
    }

    const maximumMarks = {
      attendance: attendanceMaximum,
      assignment: allocated,
      midterm: midtermMaximum,
      final: remainingFinal,
    };

    const computed = calculate(
      componentMarks,
      maximumMarks
    );

    if (
      !computed ||
      Math.abs(
        computed.totalMaximum - examTotal
      ) > 0.001
    ) {
      setError("Imported marks failed validation.");
      return;
    }

    if (
      !window.confirm(
        `Import ${normalized}/${allocated} assignment marks for ${item.studentId}?`
      )
    ) {
      return;
    }

    setBusy(true);
    setImportingKey(key);
    setError("");

    try {
      const body = {
        componentMarks,
        maximumMarks,
        remarks:
          `Faculty assignment source ` +
          `${facultyObtained}/${facultyMaximum}; ` +
          `allocated ${normalized}/${allocated}.`,
      };

      if (existing) {
        await apiRequest(
          `/api/exam-marks/${getId(existing)}`,
          { method: "PUT", body }
        );
      } else {
        await apiRequest("/api/exam-marks", {
          method: "POST",
          body: {
            ...body,
            examinationId: getId(exam),
            studentId: text(
              item.studentId
            ).toUpperCase(),
          },
        });
      }

      await loadData();

      setFeedback(
        `Faculty assignment marks linked for ${item.studentId}.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setImportingKey("");
    }
  }

  // ====================================================
  // CSV EXPORT
  // ====================================================

  function exportMarks() {
    const rows = [
      [
        "Student ID",
        "Student Name",
        "Examination",
        "Course Code",
        "Attendance",
        "Assignment",
        "Midterm",
        "Final",
        "Total Obtained",
        "Total Maximum",
        "Percentage",
        "Grade",
        "Grade Point",
        "Status",
        "Remarks",
      ],
    ];

    filteredMarks.forEach((mark) => {
      rows.push([
        mark.studentId,
        mark.student?.fullName || "",
        mark.examination?.title || "",
        mark.courseCode || "",
        mark.componentMarks?.attendance ?? 0,
        mark.componentMarks?.assignment ?? 0,
        mark.componentMarks?.midterm ?? 0,
        mark.componentMarks?.final ?? 0,
        mark.totalObtained,
        mark.totalMaximum,
        mark.percentage,
        mark.grade,
        mark.gradePoint,
        mark.status,
        mark.remarks,
      ]);
    });

    downloadCSV(
      "UniBee_Exam_Marks.csv",
      rows
    );
  }

  // ====================================================
  // PAGE
  // ====================================================

  return (
    <div className="space-y-7 pb-12">
      {/* ==========================================
    QUIZ / CLASS TEST / MIDTERM / FINAL MARKS
========================================== */}

<CourseAssessmentMarks />
      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18B37]">
            EXAMINATION ADMINISTRATION
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-[#234E43]">
            Marks Management
          </h1>

          <p className="mt-2 text-sm text-[#718579]">
            Manage student marks, faculty assignments,
            verification and approval.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading || busy}
            className={`${BUTTON} border border-[#E2EADC] bg-white text-[#234E43]`}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportMarks}
            disabled={!loaded.marks || busy}
            className={`${BUTTON} border border-[#E2EADC] bg-white text-[#234E43]`}
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={
              !loaded.exams ||
              !loaded.marks ||
              busy
            }
            className={`${BUTTON} bg-[#234E43] text-white`}
          >
            <Plus size={17} />
            Enter Marks
          </button>
        </div>
      </section>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center gap-3 rounded-xl bg-white p-4 text-sm text-[#718579]">
          <Loader2
            size={18}
            className="animate-spin"
          />
          Loading examination and marks data...
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

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

      {/* HERO */}
      <section className="rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#E8C26A]">
          <ShieldCheck size={17} />
          EXAM CONTROLLER
        </div>

        <h2 className="mt-4 text-2xl font-extrabold">
          Examination Marks Control Center
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
          Centralized examination marks, faculty
          assignment integration, automatic grade
          calculation and approval workflow.
        </p>

        <div className="mt-5 flex flex-wrap gap-3 text-xs">
          <span className="rounded-xl bg-white/10 px-4 py-2">
            {exams.length} Examinations
          </span>

          <span className="rounded-xl bg-white/10 px-4 py-2">
            {summary.Approved} Approved Marks
          </span>

          <span className="rounded-xl bg-white/10 px-4 py-2">
            {facultyGrades.length} Faculty Grades
          </span>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Marks Records"
          value={loaded.marks ? summary.total : "—"}
          icon={FileSpreadsheet}
        />

        <StatCard
          title="Draft"
          value={loaded.marks ? summary.Draft : "—"}
          icon={Pencil}
        />

        <StatCard
          title="Review / Verified"
          value={
            loaded.marks
              ? summary["Under Review"] +
                summary.Verified
              : "—"
          }
          icon={ClipboardCheck}
        />

        <StatCard
          title="Approved"
          value={loaded.marks ? summary.Approved : "—"}
          icon={Award}
        />
      </section>

      {/* SEARCH & FILTER */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Search size={18} />
          <h2 className="font-bold text-[#234E43]">
            Search & Filter Marks
          </h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <input
            className={INPUT}
            type="search"
            placeholder="Student, exam, course..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          <select
            className={INPUT}
            value={examFilter}
            onChange={(event) =>
              setExamFilter(event.target.value)
            }
          >
            <option value="All">
              All Examinations
            </option>

            {exams.map((exam) => (
              <option
                key={getId(exam)}
                value={getId(exam)}
              >
                {examTitle(exam)}
              </option>
            ))}
          </select>

          <select
            className={INPUT}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="All">
              All Statuses
            </option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-[#718579]">
            Showing {filteredMarks.length} of{" "}
            {marks.length} records
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setExamFilter("All");
              setStatusFilter("All");
            }}
            className="flex items-center gap-2 text-sm font-bold text-[#234E43]"
          >
            <RotateCcw size={15} />
            Reset
          </button>
        </div>
      </section>

      {/* FACULTY ASSIGNMENT MARKS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#B18B37]">
              FACULTY INTEGRATION
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-[#234E43]">
              Faculty Assignment Marks
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#718579]">
              Review faculty-graded assignments and
              link them to examination marks records.
            </p>
          </div>

          <span className="rounded-full bg-[#EAF2E8] px-4 py-2 text-xs font-bold text-[#234E43]">
            {facultyGrades.length} Graded Submissions
          </span>
        </div>

        {!loading &&
          loaded.faculty &&
          facultySummaries.length === 0 && (
            <div className="mt-5 rounded-xl bg-[#F6F8F3] p-6 text-center">
              <p className="font-bold text-[#234E43]">
                No Faculty Assignment Grades Yet
              </p>

              <p className="mt-2 text-sm text-[#718579]">
                Faculty-graded submissions will appear
                here after refreshing.
              </p>
            </div>
          )}

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {facultySummaries.map((item) => {
            const key = assignmentKey(item);
            const link = getLink(item);
            const candidates = matchingExams(item);

            const linkedExam = examMap.get(
              link.examinationId
            );

            const allocation = Number(
              link.allocatedMaximum
            );

            const validPreview =
              linkedExam &&
              link.allocatedMaximum !== "" &&
              Number.isFinite(allocation) &&
              allocation > 0 &&
              Number(item.maximumMarks) > 0;

            const preview = validPreview
              ? (
                  (
                    Number(item.obtainedMarks) /
                    Number(item.maximumMarks)
                  ) * allocation
                ).toFixed(2)
              : null;

            const existing = existingMarkFor(
              item,
              link.examinationId
            );

            return (
              <article
                key={key}
                className="rounded-2xl border border-[#E2EADC] p-5"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-[#234E43]">
                      {item.studentName ||
                        item.studentId}
                    </h3>

                    <p className="mt-1 text-xs text-[#718579]">
                      {item.studentId}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#234E43]">
                      {item.courseCode}
                    </p>

                    <p className="mt-1 text-xs text-[#718579]">
                      Semester: {item.semester || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <p className="text-xs text-emerald-700">
                      Faculty Marks
                    </p>

                    <p className="mt-1 text-lg font-extrabold text-emerald-800">
                      {item.obtainedMarks}/
                      {item.maximumMarks}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#F6F8F3] p-4">
                  <div>
                    <p className="text-xs text-[#718579]">
                      Graded Assignments
                    </p>

                    <p className="mt-1 font-bold text-[#234E43]">
                      {item.assignments}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Assignment Percentage
                    </p>

                    <p className="mt-1 font-bold text-[#234E43]">
                      {formatNumber(item.percentage)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <Field label="Link to Examination">
                    <select
                      className={INPUT}
                      value={link.examinationId}
                      onChange={(event) =>
                        updateLink(item, {
                          examinationId:
                            event.target.value,
                          allocatedMaximum: "",
                        })
                      }
                    >
                      <option value="">
                        Choose examination
                      </option>

                      {candidates.map((exam) => (
                        <option
                          key={getId(exam)}
                          value={getId(exam)}
                        >
                          {examTitle(exam)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Assignment Allocated Marks">
                    <input
                      className={INPUT}
                      type="number"
                      min="0.01"
                      max={linkedExam?.marks}
                      step="0.01"
                      disabled={!linkedExam}
                      placeholder="e.g. 10"
                      value={link.allocatedMaximum}
                      onChange={(event) =>
                        updateLink(item, {
                          allocatedMaximum:
                            event.target.value,
                        })
                      }
                    />
                  </Field>

                  {preview !== null && (
                    <div className="rounded-xl bg-[#EAF2E8] p-4">
                      <p className="text-xs text-[#718579]">
                        Normalized Assignment Score
                      </p>

                      <p className="mt-2 text-xl font-extrabold text-[#234E43]">
                        {preview}/
                        {link.allocatedMaximum}
                      </p>
                    </div>
                  )}

                  {existing && (
                    <p className="text-xs text-[#718579]">
                      Existing Status:{" "}
                      <strong>
                        {existing.status}
                      </strong>
                    </p>
                  )}

                  {candidates.length === 0 && (
                    <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                      No matching examination found.
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={
                      busy ||
                      !loaded.marks ||
                      !loaded.exams ||
                      !linkedExam ||
                      preview === null ||
                      !Number.isFinite(allocation) ||
                      allocation <= 0 ||
                      allocation >
                        Number(linkedExam.marks) ||
                      (
                        existing &&
                        !["Draft", "Returned"].includes(
                          existing.status
                        )
                      )
                    }
                    onClick={() =>
                      importFacultyMarks(item)
                    }
                    className={`${BUTTON} w-full bg-[#234E43] py-3 text-white`}
                  >
                    {importingKey === key ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Link2 size={17} />
                    )}

                    {existing
                      ? "Update Draft Marks"
                      : "Add to Marks Management"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* MARKS RECORDS */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-[#234E43]">
          Examination Marks Records
        </h2>

        {!loading &&
          loaded.marks &&
          filteredMarks.length === 0 && (
            <div className="rounded-2xl border border-[#E2EADC] bg-white p-12 text-center">
              <GraduationCap
                size={32}
                className="mx-auto text-[#A6C1A4]"
              />

              <h3 className="mt-4 font-bold text-[#234E43]">
                No Marks Records Found
              </h3>
            </div>
          )}

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredMarks.map((mark) => (
            <article
              key={getId(mark)}
              className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                    <GraduationCap size={21} />
                  </div>

                  <div>
                    <h3 className="font-extrabold text-[#234E43]">
                      {mark.student?.fullName ||
                        mark.studentId}
                    </h3>

                    <p className="mt-1 text-xs text-[#718579]">
                      {mark.studentId}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-[#B18B37]">
                      {mark.courseCode}
                    </p>
                  </div>
                </div>

                <Badge status={mark.status} />
              </div>

              <div className="mt-4 rounded-xl bg-[#F6F8F3] p-4">
                <p className="font-bold text-[#234E43]">
                  {mark.examination?.title ||
                    "Examination"}
                </p>

                <p className="mt-1 text-xs text-[#718579]">
                  {mark.course?.courseTitle || "—"}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  [
                    "Marks",
                    `${mark.totalObtained}/${mark.totalMaximum}`,
                  ],
                  [
                    "Percent",
                    `${formatNumber(mark.percentage)}%`,
                  ],
                  ["Grade", mark.grade || "—"],
                  [
                    "GP",
                    formatNumber(mark.gradePoint),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[#E2EADC] p-3 text-center"
                  >
                    <p className="text-[11px] text-[#718579]">
                      {label}
                    </p>

                    <p className="mt-2 break-words text-sm font-extrabold text-[#234E43]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {mark.reviewNotes && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                  <strong>Review Notes: </strong>
                  {mark.reviewNotes}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E2EADC] pt-5">
                <button
                  type="button"
                  onClick={() => setViewing(mark)}
                  className={`${BUTTON} bg-[#234E43] text-white`}
                >
                  <Eye size={15} />
                  View
                </button>

                {["Draft", "Returned"].includes(
                  mark.status
                ) && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openEdit(mark)}
                      className={`${BUTTON} border border-[#E2EADC] text-[#234E43]`}
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteMark(mark)}
                      className={`${BUTTON} border border-rose-200 text-rose-700`}
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </>
                )}
              </div>

              {(TRANSITIONS[mark.status] || [])
                .length > 0 && (
                <div className="mt-3 border-t pt-3">
                  {workflowButtons(mark)}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* APPROVAL WORKFLOW */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#234E43]">
          <ClipboardCheck size={21} />
          Marks Approval Workflow
        </h2>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {[
            "Draft",
            "Submitted",
            "Under Review",
            "Verified",
            "Approved",
          ].map((status, index) => (
            <div
              key={status}
              className="flex items-center gap-2"
            >
              {index > 0 && (
                <span className="text-[#9AAC9F]">
                  →
                </span>
              )}

              <Badge status={status} />
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-[#718579]">
          Returned marks may be corrected and
          resubmitted. Approved marks are locked.
        </p>
      </section>

      {/* CREATE / EDIT MODAL */}
      {formOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3">
          <form
            onSubmit={saveMarks}
            className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  EXAM CONTROLLER
                </p>

                <h2 className="mt-2 text-xl font-extrabold text-[#234E43]">
                  {editing
                    ? "Edit Marks Record"
                    : "Enter Student Marks"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg bg-[#F6F8F3] p-2"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Examination *">
                <select
                  required
                  disabled={!!editing}
                  className={INPUT}
                  value={form.examinationId}
                  onChange={(event) =>
                    selectExam(event.target.value)
                  }
                >
                  <option value="">
                    Select examination
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
                        {examTitle(exam)}
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Student ID *">
                <input
                  required
                  disabled={!!editing}
                  className={INPUT}
                  value={form.studentId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      studentId: event.target.value,
                    }))
                  }
                  placeholder="Existing Student ID"
                />
              </Field>
            </div>

            {selectedExam && (
              <div className="mt-5 rounded-xl bg-[#EAF2E8] p-4 text-sm">
                <p className="font-bold text-[#234E43]">
                  {examTitle(selectedExam)}
                </p>

                <p className="mt-1 text-[#234E43]">
                  Total Marks: {selectedExam.marks}
                </p>
              </div>
            )}

            <div className="mt-6 overflow-x-auto rounded-xl border border-[#E2EADC]">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-[#F6F8F3] text-left">
                  <tr>
                    <th className="p-3">Component</th>
                    <th className="p-3">
                      Maximum Marks
                    </th>
                    <th className="p-3">
                      Obtained Marks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {COMPONENTS.map(
                    ({ key, label }) => (
                      <tr
                        key={key}
                        className="border-t"
                      >
                        <td className="p-3 font-semibold">
                          {label}
                        </td>

                        <td className="p-3">
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            className={INPUT}
                            value={
                              form.maximumMarks[key]
                            }
                            onChange={(event) =>
                              changeComponent(
                                "maximumMarks",
                                key,
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td className="p-3">
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            max={
                              form.maximumMarks[key]
                            }
                            className={INPUT}
                            value={
                              form.componentMarks[key]
                            }
                            onChange={(event) =>
                              changeComponent(
                                "componentMarks",
                                key,
                                event.target.value
                              )
                            }
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-[#718579]">
              Maximum total must match the selected
              examination's total marks.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [
                  "Total",
                  calculation
                    ? `${formatNumber(
                        calculation.totalObtained
                      )}/${formatNumber(
                        calculation.totalMaximum
                      )}`
                    : "—",
                ],
                [
                  "Percentage",
                  calculation
                    ? `${formatNumber(
                        calculation.percentage
                      )}%`
                    : "—",
                ],
                [
                  "Grade",
                  calculation?.grade || "—",
                ],
                [
                  "Grade Point",
                  calculation
                    ? formatNumber(
                        calculation.gradePoint
                      )
                    : "—",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-[#F6F8F3] p-3 text-center"
                >
                  <p className="text-xs text-[#718579]">
                    {label}
                  </p>

                  <p className="mt-2 break-words font-extrabold text-[#234E43]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <Field label="Remarks">
                <textarea
                  rows={3}
                  maxLength={500}
                  className={INPUT}
                  value={form.remarks}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      remarks: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={
                busy ||
                !calculation ||
                !selectedExam ||
                Math.abs(
                  calculation.totalMaximum -
                    Number(selectedExam?.marks)
                ) > 0.001
              }
              className={`${BUTTON} mt-6 w-full bg-[#234E43] py-3 text-white`}
            >
              {busy ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2 size={18} />
              )}

              {editing
                ? "Update Marks"
                : "Save Draft Marks"}
            </button>
          </form>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-3">
          <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-[#234E43]">
                  {viewing.student?.fullName ||
                    viewing.studentId}
                </h2>

                <p className="mt-1 text-sm text-[#718579]">
                  {viewing.studentId} ·{" "}
                  {viewing.courseCode}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg bg-[#F6F8F3] p-2"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5">
              <Badge status={viewing.status} />
            </div>

            <div className="mt-5 rounded-xl bg-[#F6F8F3] p-4">
              <p className="font-bold text-[#234E43]">
                {viewing.examination?.title ||
                  "Examination"}
              </p>

              <p className="mt-1 text-sm text-[#718579]">
                {viewing.course?.courseTitle ||
                  "—"}
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F6F8F3] text-left">
                  <tr>
                    <th className="p-3">Component</th>
                    <th className="p-3">Obtained</th>
                    <th className="p-3">Maximum</th>
                  </tr>
                </thead>

                <tbody>
                  {COMPONENTS.map(
                    ({ key, label }) => (
                      <tr
                        key={key}
                        className="border-t"
                      >
                        <td className="p-3">
                          {label}
                        </td>

                        <td className="p-3">
                          {formatNumber(
                            viewing.componentMarks?.[key]
                          )}
                        </td>

                        <td className="p-3">
                          {formatNumber(
                            viewing.maximumMarks?.[key]
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  <tr className="border-t bg-[#F6F8F3] font-bold">
                    <td className="p-3">Total</td>
                    <td className="p-3">
                      {formatNumber(
                        viewing.totalObtained
                      )}
                    </td>
                    <td className="p-3">
                      {formatNumber(
                        viewing.totalMaximum
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                [
                  "Percentage",
                  `${formatNumber(
                    viewing.percentage
                  )}%`,
                ],
                [
                  "Grade",
                  viewing.grade || "—",
                ],
                [
                  "Grade Point",
                  formatNumber(
                    viewing.gradePoint
                  ),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-[#F6F8F3] p-4 text-center"
                >
                  <p className="text-xs text-[#718579]">
                    {label}
                  </p>

                  <p className="mt-2 text-xl font-extrabold text-[#234E43]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {viewing.remarks && (
              <p className="mt-4 rounded-xl bg-[#F6F8F3] p-4 text-sm">
                <strong>Remarks: </strong>
                {viewing.remarks}
              </p>
            )}

            {viewing.reviewNotes && (
              <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm">
                <strong>Review Notes: </strong>
                {viewing.reviewNotes}
              </p>
            )}

            <div className="mt-5 border-t pt-4">
              {workflowButtons(viewing)}
            </div>
          </section>
        </div>
      )}

      {/* RETURN MODAL */}
      {returning && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
          <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-extrabold text-[#234E43]">
                Return Marks for Correction
              </h2>

              <button
                type="button"
                onClick={() => setReturning(null)}
                className="rounded-lg bg-[#F6F8F3] p-2"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-3 text-sm text-[#718579]">
              Explain what needs correction.
            </p>

            <textarea
              rows={4}
              maxLength={1000}
              className={`${INPUT} mt-4`}
              value={reviewNotes}
              onChange={(event) =>
                setReviewNotes(event.target.value)
              }
              placeholder="Required review notes"
            />

            <button
              type="button"
              disabled={busy || !text(reviewNotes)}
              onClick={() =>
                changeStatus(
                  returning,
                  "Returned",
                  reviewNotes
                )
              }
              className={`${BUTTON} mt-5 w-full bg-[#234E43] py-3 text-white`}
            >
              <RotateCcw size={17} />
              Confirm Return
            </button>
          </section>
        </div>
      )}

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Exam Controller · MongoDB Marks Management
      </p>
    </div>
  );
}
