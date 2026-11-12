
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Filter,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ==========================================
// UNIBEE COURSE ASSESSMENT MARKS
// Exam Controller: Quiz / CT / Mid / Final
// ==========================================

const API = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const TYPES = [
  "Quiz",
  "Class Test",
  "Midterm",
  "Final",
  "Attendance",
  "Other",
];

const INPUT =
  "w-full rounded-xl border border-[#DCE6DC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43]";

const BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40";

const emptyForm = () => ({
  courseId: "",
  studentId: "",
  assessmentType: "Quiz",
  assessmentName: "Quiz 1",
  assessmentDate: "",
  obtainedMarks: "",
  maximumMarks: "",
  remarks: "",
});

const getId = (value) =>
  typeof value === "string"
    ? value
    : String(value?._id || value?.id || "");

const clean = (value) =>
  String(value ?? "").trim();

const number = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const display = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
};

function dateOnly(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
}

// ==========================================
// BACKEND REQUEST
// ==========================================

async function request(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please login with your Exam Controller account."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API}/api/course-assessment-marks${path}`,
      {
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
          ? {
              body: JSON.stringify(options.body),
            }
          : {}),
      }
    );
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Cannot connect to the UniBee backend."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.message ||
      `API request failed (${response.status}).`
    );
  }

  return result;
}

// ==========================================
// REUSABLE COMPONENTS
// ==========================================

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

function StatCard({ icon: Icon, title, value }) {
  return (
    <div className="rounded-2xl border border-[#DCE6DC] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[#718579]">
            {title}
          </p>

          <p className="mt-2 text-3xl font-extrabold text-[#234E43]">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const published = status === "Published";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        published
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {status || "Draft"}
    </span>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function CourseAssessmentMarks() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState([]);

  const [courseId, setCourseId] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] =
    useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // ======================================
  // LOAD COURSES AND MARKS
  // ======================================

  const loadData = useCallback(async (signal) => {
    setLoading(true);

    try {
      const [courseResult, marksResult] =
        await Promise.all([
          request("/courses", { signal }),
          request("/", { signal }),
        ]);

      if (signal?.aborted) return;

      setCourses(courseResult.data || []);
      setMarks(marksResult.data || []);
      setError("");
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadData(controller.signal);

    return () => controller.abort();
  }, [loadData]);

  // ======================================
  // LOAD ENROLLED STUDENTS
  // ======================================

  const loadStudents = useCallback(
    async (selectedCourse, signal) => {
      if (!selectedCourse) {
        setStudents([]);
        return;
      }

      setStudentsLoading(true);
      setStudents([]);

      try {
        const result = await request(
          `/students?courseId=${encodeURIComponent(
            selectedCourse
          )}`,
          { signal }
        );

        if (!signal?.aborted) {
          setStudents(result.data || []);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!signal?.aborted) {
          setStudentsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!courseId) {
      setStudents([]);
      setStudentsLoading(false);
      return;
    }

    const controller = new AbortController();

    loadStudents(courseId, controller.signal);

    return () => controller.abort();
  }, [courseId, loadStudents]);

  // ======================================
  // DERIVED DATA
  // ======================================

  const selectedCourse = courses.find(
    (item) => getId(item) === courseId
  );

  const filteredMarks = useMemo(() => {
    const query = clean(search).toLowerCase();

    return marks
      .filter((mark) => {
        const matchesCourse =
          !courseId ||
          getId(mark.course) === courseId;

        const matchesType =
          typeFilter === "All" ||
          mark.assessmentType === typeFilter;

        const matchesStatus =
          statusFilter === "All" ||
          mark.status === statusFilter;

        const matchesSearch = [
          mark.student?.studentId,
          mark.student?.fullName,
          mark.course?.courseCode,
          mark.assessmentName,
          mark.assessmentType,
        ].some((value) =>
          clean(value).toLowerCase().includes(query)
        );

        return (
          matchesCourse &&
          matchesType &&
          matchesStatus &&
          matchesSearch
        );
      })
      .sort((a, b) =>
        clean(b.createdAt).localeCompare(
          clean(a.createdAt)
        )
      );
  }, [
    marks,
    courseId,
    search,
    typeFilter,
    statusFilter,
  ]);

  const stats = useMemo(
    () => ({
      total: filteredMarks.length,

      draft: filteredMarks.filter(
        (item) => item.status === "Draft"
      ).length,

      published: filteredMarks.filter(
        (item) => item.status === "Published"
      ).length,

      students: new Set(
        filteredMarks.map((item) =>
          getId(item.student)
        )
      ).size,
    }),
    [filteredMarks]
  );

  const previewMaximum = Number(form.maximumMarks);
  const previewObtained = Number(form.obtainedMarks);

  const previewValid =
    form.maximumMarks !== "" &&
    form.obtainedMarks !== "" &&
    Number.isFinite(previewMaximum) &&
    Number.isFinite(previewObtained) &&
    previewMaximum > 0 &&
    previewObtained >= 0 &&
    previewObtained <= previewMaximum;

  const previewPercentage = previewValid
    ? (
        (previewObtained / previewMaximum) *
        100
      ).toFixed(2)
    : null;

  // ======================================
  // OPEN CREATE FORM
  // ======================================

  function createMarks() {
    if (!courseId) {
      setError("Select a Course first.");
      return;
    }

    setEditing(null);

    setForm({
      ...emptyForm(),
      courseId,
    });

    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  // ======================================
  // OPEN EDIT FORM
  // ======================================

  function editMarks(mark) {
    if (mark.status !== "Draft") {
      setError(
        "Published marks cannot be edited."
      );
      return;
    }

    setEditing(mark);

    setForm({
      courseId: getId(mark.course),
      studentId: getId(mark.student),
      assessmentType: mark.assessmentType,
      assessmentName: mark.assessmentName,
      assessmentDate: dateOnly(
        mark.assessmentDate
      ),
      obtainedMarks: String(mark.obtainedMarks),
      maximumMarks: String(mark.maximumMarks),
      remarks: mark.remarks || "",
    });

    setError("");
    setFormOpen(true);
  }

  // ======================================
  // SAVE DRAFT MARKS
  // ======================================

  async function saveMarks(event) {
    event.preventDefault();

    if (busy) return;

    if (!form.courseId || !form.studentId) {
      setError(
        "Course and Student are required."
      );
      return;
    }

    if (!clean(form.assessmentName)) {
      setError("Assessment Name is required.");
      return;
    }

    if (!previewValid) {
      setError(
        "Obtained marks must be between 0 and Maximum Marks."
      );
      return;
    }

    const body = {
      courseId: form.courseId,
      studentId: form.studentId,
      assessmentType: form.assessmentType,
      assessmentName: clean(form.assessmentName),
      assessmentDate:
        form.assessmentDate || null,
      obtainedMarks: previewObtained,
      maximumMarks: previewMaximum,
      remarks: clean(form.remarks),
    };

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await request(
        editing
          ? `/${getId(editing)}`
          : "/",
        {
          method: editing ? "PUT" : "POST",
          body,
        }
      );

      setFormOpen(false);
      setEditing(null);

      await loadData();

      setSuccess(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ======================================
  // PUBLISH MARKS
  // ======================================

  async function publishMarks(mark) {
    if (busy) return;

    const confirmed = window.confirm(
      `Publish ${mark.assessmentName} marks for ${
        mark.student?.studentId || "this student"
      }?\n\nStudent will be able to see these marks.`
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await request(
        `/${getId(mark)}/publish`,
        {
          method: "PATCH",
        }
      );

      await loadData();

      setSuccess(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ======================================
  // DELETE DRAFT MARKS
  // ======================================

  async function deleteMarks(mark) {
    if (busy) return;

    const confirmed = window.confirm(
      `Delete ${mark.assessmentName} marks for ${
        mark.student?.studentId || "this student"
      }?`
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await request(
        `/${getId(mark)}`,
        {
          method: "DELETE",
        }
      );

      await loadData();

      setSuccess(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <section className="rounded-2xl border border-[#DCE6DC] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#B18B37]">
              EXAM CONTROLLER
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-[#234E43]">
              Course Assessment Marks
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#718579]">
              Enter and publish Quiz, Class Test,
              Midterm, Final and Attendance marks
              for enrolled students.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || busy}
              onClick={() => loadData()}
              className={`${BTN} border border-[#DCE6DC] bg-white text-[#234E43]`}
            >
              <RefreshCw size={17} />
              Refresh
            </button>

            <button
              type="button"
              disabled={!courseId || loading || busy}
              onClick={createMarks}
              className={`${BTN} bg-[#234E43] text-white`}
            >
              <Plus size={17} />
              Enter Marks
            </button>
          </div>
        </div>

        <div className="mt-6">
          <Field label="Select Department Course">
            <select
              className={INPUT}
              value={courseId}
              onChange={(event) => {
                setCourseId(event.target.value);
                setError("");
              }}
            >
              <option value="">
                All Courses — Select to Enter Marks
              </option>

              {courses.map((course) => (
                <option
                  key={getId(course)}
                  value={getId(course)}
                >
                  {course.courseCode} —{" "}
                  {course.courseTitle}
                  {" "}
                  ({course.semester || "Semester N/A"})
                </option>
              ))}
            </select>
          </Field>

          {selectedCourse && (
            <p className="mt-3 rounded-xl bg-[#F5F8F3] p-3 text-sm text-[#234E43]">
              <strong>Selected Course:</strong>{" "}
              {selectedCourse.courseCode} —{" "}
              {selectedCourse.courseTitle}
              {" · "}
              {selectedCourse.semester}
              {" · "}
              {studentsLoading
                ? "Loading students..."
                : `${students.length} approved students`}
            </p>
          )}
        </div>
      </section>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="flex items-center gap-2 rounded-xl bg-white p-4 text-sm text-[#718579]">
          <Loader2
            size={18}
            className="animate-spin"
          />
          Loading MongoDB assessment records...
        </div>
      )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          title="Assessment Records"
          value={stats.total}
        />

        <StatCard
          icon={Edit3}
          title="Draft"
          value={stats.draft}
        />

        <StatCard
          icon={CheckCircle2}
          title="Published"
          value={stats.published}
        />

        <StatCard
          icon={GraduationCap}
          title="Students"
          value={stats.students}
        />
      </section>

      {/* SEARCH AND FILTER */}
      <section className="rounded-2xl border border-[#DCE6DC] bg-white p-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />

            <input
              className={`${INPUT} pl-11`}
              type="search"
              placeholder="Student, assessment, course..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            className={INPUT}
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
          >
            <option value="All">
              All Assessment Types
            </option>

            {TYPES.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
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

            <option value="Draft">
              Draft
            </option>

            <option value="Published">
              Published
            </option>
          </select>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-[#718579]">
          <Filter size={15} />
          Showing {filteredMarks.length} records
        </div>
      </section>

      {/* MARKS LIST */}
      <section className="rounded-2xl border border-[#DCE6DC] bg-white p-6">
        <div className="mb-5 flex items-center gap-2">
          <BookOpen size={20} />
          <h3 className="text-lg font-extrabold text-[#234E43]">
            Student Assessment Records
          </h3>
        </div>

        {!loading && filteredMarks.length === 0 && (
          <div className="rounded-xl bg-[#F5F8F3] p-8 text-center">
            <p className="font-bold text-[#234E43]">
              No Assessment Marks Found
            </p>

            <p className="mt-2 text-sm text-[#718579]">
              Select a Course and click Enter Marks
              to create the first record.
            </p>
          </div>
        )}

        {filteredMarks.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#F5F8F3] text-[#234E43]">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Course</th>
                  <th className="p-3">Assessment</th>
                  <th className="p-3">Marks</th>
                  <th className="p-3">Percentage</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredMarks.map((mark) => (
                  <tr
                    key={getId(mark)}
                    className="border-t border-[#E5EDE5]"
                  >
                    <td className="p-3">
                      <p className="font-semibold text-[#234E43]">
                        {mark.student?.fullName || "—"}
                      </p>

                      <p className="text-xs text-[#718579]">
                        {mark.student?.studentId || "—"}
                      </p>
                    </td>

                    <td className="p-3">
                      <p className="font-semibold">
                        {mark.course?.courseCode || "—"}
                      </p>

                      <p className="text-xs text-[#718579]">
                        {mark.semester}
                      </p>
                    </td>

                    <td className="p-3">
                      <p className="font-semibold">
                        {mark.assessmentName}
                      </p>

                      <p className="text-xs text-[#718579]">
                        {mark.assessmentType}
                      </p>
                    </td>

                    <td className="p-3 font-bold">
                      {display(mark.obtainedMarks)}
                      {" / "}
                      {display(mark.maximumMarks)}
                    </td>

                    <td className="p-3">
                      {display(mark.percentage)}%
                    </td>

                    <td className="p-3">
                      <StatusBadge status={mark.status} />
                    </td>

                    <td className="p-3">
                      {mark.status === "Draft" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              editMarks(mark)
                            }
                            className="rounded-lg bg-[#EAF2E8] p-2 text-[#234E43]"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              publishMarks(mark)
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                          >
                            <Send size={15} />
                            Publish
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              deleteMarks(mark)
                            }
                            className="rounded-lg bg-rose-50 p-2 text-rose-700"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-emerald-700">
                          Visible to Student
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ENTRY MODAL */}
      {formOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-3">
          <form
            onSubmit={saveMarks}
            className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#B18B37]">
                  COURSE ASSESSMENT
                </p>

                <h2 className="mt-2 text-xl font-extrabold text-[#234E43]">
                  {editing
                    ? "Edit Assessment Marks"
                    : "Enter Assessment Marks"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg bg-[#F5F8F3] p-2"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Course">
                <input
                  disabled
                  className={INPUT}
                  value={
                    selectedCourse
                      ? `${selectedCourse.courseCode} — ${selectedCourse.courseTitle}`
                      : form.courseId
                  }
                  readOnly
                />
              </Field>

              <Field label="Student *">
                <select
                  required
                  disabled={!!editing || studentsLoading}
                  className={INPUT}
                  value={form.studentId}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      studentId: event.target.value,
                    }))
                  }
                >
                  <option value="">
                    Select Student
                  </option>

                  {students.map((student) => (
                    <option
                      key={getId(student)}
                      value={getId(student)}
                    >
                      {student.studentId} —{" "}
                      {student.fullName}
                    </option>
                  ))}

                  {editing &&
                    !students.some(
                      (student) =>
                        getId(student) === form.studentId
                    ) && (
                      <option value={form.studentId}>
                        {editing.student?.studentId || "Current Student"}
                      </option>
                    )}
                </select>
              </Field>

              <Field label="Assessment Type *">
                <select
                  required
                  className={INPUT}
                  value={form.assessmentType}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      assessmentType:
                        event.target.value,
                      assessmentName:
                        event.target.value === "Midterm" ||
                        event.target.value === "Final" ||
                        event.target.value === "Attendance"
                          ? event.target.value
                          : `${event.target.value} 1`,
                    }))
                  }
                >
                  {TYPES.map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Assessment Name *">
                <input
                  required
                  maxLength={100}
                  className={INPUT}
                  value={form.assessmentName}
                  placeholder="Quiz 1 / Midterm"
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      assessmentName: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Assessment Date">
                <input
                  type="date"
                  className={INPUT}
                  value={form.assessmentDate}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      assessmentDate: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Maximum Marks *">
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className={INPUT}
                  value={form.maximumMarks}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      maximumMarks: event.target.value,
                    }))
                  }
                  placeholder="20"
                />
              </Field>

              <Field label="Obtained Marks *">
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  max={
                    form.maximumMarks ||
                    undefined
                  }
                  className={INPUT}
                  value={form.obtainedMarks}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      obtainedMarks: event.target.value,
                    }))
                  }
                  placeholder="15"
                />
              </Field>

              <div className="rounded-xl bg-[#EAF2E8] p-4">
                <p className="text-xs text-[#718579]">
                  Automatic Percentage
                </p>

                <p className="mt-2 text-2xl font-extrabold text-[#234E43]">
                  {previewPercentage === null
                    ? "—"
                    : `${previewPercentage}%`}
                </p>
              </div>
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

            {error && (
              <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !previewValid}
              className={`${BTN} mt-6 w-full bg-[#234E43] text-white`}
            >
              {busy ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Save size={18} />
              )}

              {editing
                ? "Update Draft Marks"
                : "Save Draft Marks"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
