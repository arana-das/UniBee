
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award, Plus, Search, Filter, Eye, Pencil, Trash2, X, Save,
  Download, RotateCcw, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, GraduationCap, BookOpen, Clock3, LockKeyhole,
  UnlockKeyhole, TrendingUp, FileCheck2, RefreshCw,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 8;
const STATUSES = ["Draft", "Published", "Withheld"];

const GRADE_SCALE = [
  { min: 80, grade: "A+", point: 4.0 },
  { min: 75, grade: "A", point: 3.75 },
  { min: 70, grade: "A-", point: 3.5 },
  { min: 65, grade: "B+", point: 3.25 },
  { min: 60, grade: "B", point: 3.0 },
  { min: 55, grade: "B-", point: 2.75 },
  { min: 50, grade: "C+", point: 2.5 },
  { min: 45, grade: "C", point: 2.25 },
  { min: 40, grade: "D", point: 2.0 },
  { min: 0, grade: "F", point: 0 },
];

const EMPTY_FORM = {
  studentId: "",
  examinationId: "",
  marks: "",
  status: "Draft",
  remarks: "",
};

function calculateGrade(marks) {
  const score = Number(marks);

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return { grade: "—", point: null };
  }

  const match = GRADE_SCALE.find((item) => score >= item.min);

  return {
    grade: match?.grade || "F",
    point: match?.point ?? 0,
  };
}

function getId(item) {
  return String(item?._id || item?.id || "");
}

function StatusBadge({ status }) {
  const styles = {
    Draft: "bg-amber-50 text-amber-800",
    Published: "bg-emerald-50 text-emerald-700",
    Withheld: "bg-rose-50 text-rose-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
      styles[status] || styles.Draft
    }`}>
      {status}
    </span>
  );
}

function StatCard({ title, value, detail, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-3 text-3xl font-bold text-[#234E43]">
            {value}
          </h3>
        </div>
        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Login session unavailable. Please log in again.");
  }

  let response;

  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot connect to UniBee backend.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

function downloadCSV(rows) {
  const headers = [
    "Result ID", "Student ID", "Student Name",
    "Course Code", "Course Title", "Semester",
    "Credits", "Marks (%)", "Letter Grade",
    "Grade Point", "Status", "Updated At",
    "Published At", "Remarks",
  ];

  const escapeCell = (value) => {
    let text = String(value ?? "");
    if (/^\s*[=+\-@\t\r]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const data = [
    headers,
    ...rows.map((item) => [
      item.id,
      item.studentId,
      item.studentName,
      item.courseCode,
      item.courseTitle,
      item.semester,
      item.credit,
      item.marks,
      item.grade,
      item.point,
      item.status,
      item.updatedAt,
      item.publishedAt,
      item.remarks,
    ]),
  ];

  const csv = "\uFEFF" +
    data.map((row) => row.map(escapeCell).join(",")).join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "UniBee_Academic_Results.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminResults() {
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [examinations, setExaminations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // ========================================
  // LOAD DATABASE RECORDS
  // ========================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [studentResponse, courseResponse, examResponse, resultResponse] =
        await Promise.all([
          apiRequest("/api/students"),
          apiRequest("/api/academic/courses"),
          apiRequest("/api/examinations"),
          apiRequest("/api/results"),
        ]);

      setStudents(
        (studentResponse.data || []).map((item) => ({
          ...item,
          id: getId(item),
          name: item.fullName || item.name || "Unnamed Student",
        }))
      );

      setCourses(
        (courseResponse.data || []).map((item) => ({
          ...item,
          id: getId(item),
          code: item.courseCode || item.code || "",
          title: item.courseTitle || item.title || "",
          credit: Number(item.credits ?? item.credit ?? 0),
        }))
      );

      setExaminations(
        (examResponse.data || []).map((item) => ({
          ...item,
          id: getId(item),
          courseId: getId(item.course) || item.courseId || "",
          courseCode: item.course?.courseCode || item.courseCode || "",
          courseTitle: item.course?.courseTitle || "",
          semester: item.course?.semester || item.semester || "",
        }))
      );

      setResults(
        (resultResponse.data || []).map((item) => {
          const student = item.student || {};
          const exam = item.examination || {};
          const course = item.course || {};

          const totalMarks = Number(item.totalMarks || 100);
          const obtainedMarks = Number(item.obtainedMarks || 0);

          const percentage = totalMarks > 0
            ? (obtainedMarks / totalMarks) * 100
            : 0;

          const calculated = calculateGrade(percentage);

          return {
            ...item,
            id: getId(item),
            studentMongoId: getId(student) || String(item.student),
            studentId: student.studentId || item.studentId || "",
            studentName: student.fullName || "Unknown student",
            examinationId: getId(exam) || String(item.examination),
            examinationTitle: exam.title || "Unknown examination",
            examinationType: exam.type || "",
            examinationDate: exam.date || "",
            courseCode: course.courseCode || item.courseCode || "",
            courseTitle: course.courseTitle || "",
            semester: course.semester || exam.semester || "",
            credit: Number(course.credits ?? course.credit ?? 0),
            totalMarks,
            obtainedMarks,
            marks: Number(percentage.toFixed(2)),
            grade: item.grade || calculated.grade,
            point: item.gradePoint ?? calculated.point,
            remarks: item.remarks || "",
            updatedAt: item.updatedAt
              ? new Date(item.updatedAt).toLocaleDateString()
              : "",
            publishedAt: item.publishedAt
              ? new Date(item.publishedAt).toLocaleDateString()
              : "",
          };
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================
  // FILTER DATA
  // ========================================

  const semesters = useMemo(
    () => [...new Set([
      ...courses.map((item) => item.semester),
      ...results.map((item) => item.semester),
    ].filter(Boolean))].sort(),
    [courses, results]
  );

  const courseOptions = useMemo(
    () => [...new Set(results.map((item) => item.courseCode).filter(Boolean))].sort(),
    [results]
  );

  const enriched = results;

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return enriched.filter((item) => {
      const matchesSearch = [
        item.id,
        item.studentId,
        item.studentName,
        item.courseCode,
        item.courseTitle,
        item.examinationTitle,
      ].some((value) =>
        String(value || "").toLowerCase().includes(search)
      );

      return (
        matchesSearch &&
        (courseFilter === "All" || item.courseCode === courseFilter) &&
        (semesterFilter === "All" || item.semester === semesterFilter) &&
        (statusFilter === "All" || item.status === statusFilter)
      );
    });
  }, [enriched, query, courseFilter, semesterFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const publishedCount = results.filter(
    (item) => item.status === "Published"
  ).length;

  const draftCount = results.filter(
    (item) => item.status === "Draft"
  ).length;

  const withheldCount = results.filter(
    (item) => item.status === "Withheld"
  ).length;

  const publishedResults = enriched.filter(
    (item) =>
      item.status === "Published" &&
      item.point !== null &&
      item.credit > 0
  );

  const weightedPoints = publishedResults.reduce(
    (sum, item) => sum + item.point * item.credit,
    0
  );

  const totalCredits = publishedResults.reduce(
    (sum, item) => sum + item.credit,
    0
  );

  const overallGPA = totalCredits > 0
    ? (weightedPoints / totalCredits).toFixed(2)
    : "—";

  // ========================================
  // FORM HELPERS
  // ========================================

  function updateField(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
    setError("");
  }

  const selectedStudent = students.find(
    (item) => item.studentId === form.studentId
  );

  const selectedExam = examinations.find(
    (item) => item.id === form.examinationId
  );

  const selectedCourse = selectedExam
    ? courses.find((item) => item.id === selectedExam.courseId)
    : null;

  const selectedGrade = calculateGrade(form.marks);

  const selectableExams = examinations.filter(
    (exam) =>
      !["Cancelled", "Postponed"].includes(exam.status) &&
      (
        exam.status === "Completed" ||
        exam.id === form.examinationId
      )
  );

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      studentId: students.find((item) => item.status === "Active")?.studentId || "",
      examinationId: selectableExams[0]?.id || "",
    });
    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      studentId: item.studentId,
      examinationId: item.examinationId,
      marks: String(item.marks),
      status: item.status,
      remarks: item.remarks || "",
    });
    setError("");
    setFeedback("");
    setModalOpen(true);
  }

  // ========================================
  // CREATE / UPDATE RESULT
  // ========================================

  async function handleSave(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      const student = students.find(
        (item) => item.studentId === form.studentId
      );

      const exam = examinations.find(
        (item) => item.id === form.examinationId
      );

      if (!student || !exam) {
        throw new Error("Select a valid student and examination.");
      }

      if (form.marks === "") {
        throw new Error("Enter obtained marks.");
      }

      const percentage = Number(form.marks);

      if (
        !Number.isFinite(percentage) ||
        percentage < 0 ||
        percentage > 100
      ) {
        throw new Error("Marks percentage must be between 0 and 100.");
      }

      const obtainedMarks = Number(
        ((percentage / 100) * Number(exam.marks)).toFixed(2)
      );

      const calculated = calculateGrade(percentage);

      if (
        form.status === "Published" &&
        exam.status !== "Completed"
      ) {
        throw new Error("Complete the examination before publishing its results.");
      }

      const payload = {
        studentMongoId: student.id,
        examinationId: exam.id,
        obtainedMarks,
        grade: calculated.grade,
        gradePoint: calculated.point,
        status: form.status,
        remarks: form.remarks.trim(),
      };

      if (editingId) {
        await apiRequest(`/api/results/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            obtainedMarks,
            grade: calculated.grade,
            gradePoint: calculated.point,
            status: form.status,
            remarks: form.remarks.trim(),
          }),
        });

        setFeedback("Result updated successfully in MongoDB.");
      } else {
        await apiRequest("/api/results", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setFeedback("Result created successfully in MongoDB.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setPage(1);

      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // CHANGE STATUS
  // ========================================

  async function changeStatus(item, nextStatus) {
    if (!window.confirm(
      `Change ${item.studentName}'s ${item.courseCode} result to ${nextStatus}?`
    )) {
      return;
    }

    setError("");
    setFeedback("");

    try {
      await apiRequest(`/api/results/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      setFeedback(`Result marked ${nextStatus.toLowerCase()}.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  // ========================================
  // DELETE
  // ========================================

  async function handleDelete(item) {
    if (!window.confirm(
      `Delete result for ${item.studentName} (${item.studentId})?`
    )) {
      return;
    }

    setError("");
    setFeedback("");

    try {
      await apiRequest(`/api/results/${item.id}`, {
        method: "DELETE",
      });

      setFeedback("Result deleted from MongoDB.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function clearFilters() {
    setQuery("");
    setCourseFilter("All");
    setSemesterFilter("All");
    setStatusFilter("All");
    setPage(1);
  }

  // ========================================
  // RENDER
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
            Academic Results Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage student grades, review academic performance,
            and publish examination results.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={loading || !students.length || !selectableExams.length}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Plus size={18} />
            Add Result
          </button>
        </div>
      </section>

      {loading && (
        <div className="rounded-xl bg-[#F1F7EF] p-4 text-sm text-[#234E43]">
          Loading students, courses, examinations and results from MongoDB...
        </div>
      )}

      {error && !modalOpen && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} />
          {error}
        </p>
      )}

      {feedback && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={18} />
          {feedback}
        </p>
      )}

      {!loading && !students.length && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          No students found. Add students through Admin Student Management first.
        </div>
      )}

      {!loading && !selectableExams.length && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          No completed examinations available. Complete an examination before entering results.
        </div>
      )}

      {/* STATISTICS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Results"
          value={results.length}
          detail="All student examination records"
          icon={FileCheck2}
        />

        <StatCard
          title="Published Results"
          value={publishedCount}
          detail="Results marked published"
          icon={CheckCircle2}
        />

        <StatCard
          title="Draft Results"
          value={draftCount}
          detail="Results awaiting publication"
          icon={Clock3}
        />

        <StatCard
          title="Withheld Results"
          value={withheldCount}
          detail="Results temporarily withheld"
          icon={LockKeyhole}
        />
      </section>

      {/* GPA SUMMARY */}

      <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-[#234E43] p-6 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#D9A536]">
            Academic Performance
          </p>

          <h2 className="mt-2 text-xl font-bold">
            Published Results Summary
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Credit-weighted average grade point across published
            results. This is not an individual student's CGPA.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white/10 p-4">
            <TrendingUp size={27} className="text-[#D9A536]" />
          </div>

          <div>
            <p className="text-xs text-white/70">
              Overall Grade Point Average
            </p>
            <p className="mt-1 text-3xl font-bold">
              {overallGPA}
              <span className="ml-2 text-sm font-medium text-white/60">
                / 4.00
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* SEARCH & FILTER */}

      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={19} className="text-[#234E43]" />
          <h2 className="font-bold text-[#234E43]">
            Search & Filter Results
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
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search student, ID or course..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(event) => {
              setCourseFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Courses</option>
            {courseOptions.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={(event) => {
              setSemesterFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Semesters</option>
            {semesters.map((semester) => (
              <option key={semester} value={semester}>{semester}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {filtered.length} matching result records
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
              onClick={() => downloadCSV(filtered)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* RESULTS TABLE */}

      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Student", "Course", "Examination", "Marks",
                  "Grade", "Grade Point", "Status", "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-4 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visible.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
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

                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[#234E43]">
                      {item.examinationTitle}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.examinationType}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm font-bold text-[#234E43]">
                    {item.obtainedMarks}/{item.totalMarks}
                    <p className="text-xs font-normal text-slate-400">
                      {item.marks}%
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-[#A6C1A4]/25 px-3 py-1.5 text-sm font-bold text-[#234E43]">
                      {item.grade}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                    {item.point?.toFixed(2) ?? "—"}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={item.status} />
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        title="View result"
                        onClick={() => setViewing(item)}
                        className="rounded-lg bg-slate-100 p-2 text-[#234E43]"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        title="Edit result"
                        onClick={() => openEdit(item)}
                        className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43]"
                      >
                        <Pencil size={17} />
                      </button>

                      {item.status !== "Published" ? (
                        <button
                          type="button"
                          title="Publish result"
                          onClick={() => changeStatus(item, "Published")}
                          className="rounded-lg bg-emerald-50 p-2 text-emerald-700"
                        >
                          <UnlockKeyhole size={17} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Unpublish result"
                          onClick={() => changeStatus(item, "Draft")}
                          className="rounded-lg bg-amber-50 p-2 text-amber-700"
                        >
                          <LockKeyhole size={17} />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Delete result"
                        onClick={() => handleDelete(item)}
                        className="rounded-lg bg-rose-50 p-2 text-rose-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && visible.length === 0 && (
            <div className="py-14 text-center text-sm text-slate-500">
              No matching results found.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} · {filtered.length} results
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ADD / EDIT MODAL */}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#234E43]">
                {editingId ? "Edit Result" : "Add Student Result"}
              </h2>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Student *
                </span>

                <select
                  value={form.studentId}
                  required
                  disabled={!!editingId}
                  onChange={(event) => updateField("studentId", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
                >
                  <option value="">Select Student</option>

                  {students.map((student) => (
                    <option key={student.id} value={student.studentId}>
                      {student.name} ({student.studentId})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Examination *
                </span>

                <select
                  value={form.examinationId}
                  required
                  disabled={!!editingId}
                  onChange={(event) => updateField("examinationId", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
                >
                  <option value="">Select Examination</option>

                  {selectableExams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} — {exam.courseCode} ({exam.type})
                    </option>
                  ))}
                </select>
              </label>

              {selectedExam && (
                <div className="rounded-xl bg-[#F6F8F3] p-4 text-xs leading-6 text-slate-600">
                  <p>
                    <strong>Course:</strong> {selectedExam.courseCode} — {selectedExam.courseTitle}
                  </p>
                  <p>
                    <strong>Semester:</strong> {selectedExam.semester}
                  </p>
                  <p>
                    <strong>Exam Date:</strong> {selectedExam.date}
                  </p>
                  <p>
                    <strong>Total Marks:</strong> {selectedExam.marks}
                  </p>
                  <p>
                    <strong>Credits:</strong> {selectedCourse?.credit ?? "—"}
                  </p>
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Obtained Marks (%) *
                </span>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.marks}
                  required
                  onChange={(event) => updateField("marks", event.target.value)}
                  placeholder="Enter percentage"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#A6C1A4]/20 p-4">
                  <p className="text-xs text-slate-500">Letter Grade</p>
                  <p className="mt-2 text-xl font-bold text-[#234E43]">
                    {form.marks === "" ? "—" : selectedGrade.grade}
                  </p>
                </div>

                <div className="rounded-xl bg-[#A6C1A4]/20 p-4">
                  <p className="text-xs text-slate-500">Grade Point</p>
                  <p className="mt-2 text-xl font-bold text-[#234E43]">
                    {form.marks === "" || selectedGrade.point === null
                      ? "—"
                      : selectedGrade.point.toFixed(2)}
                  </p>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Result Status
                </span>

                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  {STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Remarks
                </span>

                <textarea
                  rows={3}
                  maxLength={500}
                  value={form.remarks}
                  onChange={(event) => updateField("remarks", event.target.value)}
                  placeholder="Optional academic remarks..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </label>

              {error && (
                <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Result"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* DETAILS MODAL */}

      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18A28]">
                  ACADEMIC RESULT
                </p>
                <h2 className="mt-2 text-xl font-bold text-[#234E43]">
                  {viewing.studentName}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {viewing.studentId}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-4">
              <StatusBadge status={viewing.status} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Course", `${viewing.courseCode} — ${viewing.courseTitle}`, BookOpen],
                ["Semester", viewing.semester, GraduationCap],
                ["Examination", viewing.examinationTitle, FileCheck2],
                ["Marks", `${viewing.obtainedMarks}/${viewing.totalMarks}`, FileCheck2],
                ["Percentage", `${viewing.marks}%`, Award],
                ["Letter Grade", viewing.grade, Award],
                ["Grade Point", viewing.point?.toFixed(2) ?? "—", TrendingUp],
                ["Credits", viewing.credit, BookOpen],
                ["Updated", viewing.updatedAt || "—", Clock3],
                ["Published", viewing.publishedAt || "Not published", CheckCircle2],
                ["Remarks", viewing.remarks || "None", FileCheck2],
              ].map(([label, value, Icon]) => (
                <div key={label} className="rounded-xl bg-[#F6F8F3] p-3">
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Icon size={15} /> {label}
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setViewing(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-emerald-900">
        <strong>MongoDB Integration:</strong> Students, Courses,
        Examinations and Results are loaded from the UniBee backend.
        Published results are available through the Student Results API.
      </div>

      <p className="text-center text-xs text-slate-400">
        UniBee Admin Results · MongoDB Integrated
      </p>
    </div>
  );
}
