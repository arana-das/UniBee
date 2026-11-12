
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap, BookOpen, Calculator, ChevronDown,
  AlertCircle, RefreshCw, Plus, Trash2, TrendingUp,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid,
  XAxis, YAxis, Tooltip,
} from "recharts";
import { getAuthToken } from "../services/authApi";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const GRADE_POINTS = {
  "A+": 4,
  A: 3.75,
  "A-": 3.5,
  "B+": 3.25,
  B: 3,
  "B-": 2.75,
  "C+": 2.5,
  C: 2.25,
  D: 2,
  F: 0,
};

const GRADES = Object.keys(GRADE_POINTS);

const inputClass =
  "w-full rounded-xl border border-[#DCE8DA] bg-white px-3 py-2.5 text-sm text-[#234E43] outline-none focus:border-[#234E43]";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createCourse() {
  return { id: newId(), code: "", credits: "3", grade: "" };
}

function createSemester(number) {
  return {
    id: newId(),
    name: `Semester ${number}`,
    courses: [createCourse()],
  };
}

function getId(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return String(item._id || item.id || "");
}

function numberText(value) {
  return value === null || value === undefined
    ? "—"
    : Number(value).toFixed(2);
}

async function fetchMyResults() {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in again.");
  }

  let response;

  try {
    response = await fetch(`${API}/api/results/my`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot connect to UniBee backend.");
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.message || `Request failed (${response.status}).`
    );
  }

  if (!Array.isArray(payload.data)) {
    throw new Error("Invalid results response.");
  }

  return payload.data.filter(
    (item) => item.status === "Published"
  );
}

function normalizeExam(item) {
  const course = item.course || {};
  const exam = item.examination || {};

  const obtained = Number(item.obtainedMarks);
  const total = Number(item.totalMarks);

  const validMarks =
    Number.isFinite(obtained) &&
    Number.isFinite(total) &&
    total > 0;

  return {
    id: getId(item),
    courseId: getId(course),
    courseCode: course.courseCode || item.courseCode || "Unknown",
    courseTitle: course.courseTitle || "Unknown Course",
    semester: course.semester || "Unassigned Semester",
    examName: exam.title || "Examination",
    examType: exam.type || "Other",
    examDate: exam.date || "",
    obtained: validMarks ? obtained : null,
    total: validMarks ? total : null,
    percentage: validMarks ? obtained / total * 100 : null,
    remarks: item.remarks || "",
  };
}

function buildCourseGroups(results) {
  const groups = new Map();

  for (const result of results) {
    const key = `${result.semester}::${result.courseId || result.courseCode}`;

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        semester: result.semester,
        code: result.courseCode,
        title: result.courseTitle,
        exams: [],
      });
    }

    groups.get(key).exams.push(result);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      exams: group.exams.sort((a, b) =>
        a.examDate.localeCompare(b.examDate) ||
        a.examName.localeCompare(b.examName)
      ),
    }))
    .sort((a, b) =>
      a.semester.localeCompare(b.semester, undefined, { numeric: true }) ||
      a.code.localeCompare(b.code)
    );
}

function calculateSemester(semester) {
  const valid = semester.courses.filter((course) => {
    const credits = Number(course.credits);

    return (
      course.credits !== "" &&
      Number.isFinite(credits) &&
      credits > 0 &&
      Object.prototype.hasOwnProperty.call(
        GRADE_POINTS,
        course.grade
      )
    );
  });

  const credits = valid.reduce(
    (sum, course) => sum + Number(course.credits),
    0
  );

  const points = valid.reduce(
    (sum, course) =>
      sum + Number(course.credits) * GRADE_POINTS[course.grade],
    0
  );

  return {
    ...semester,
    credits,
    points,
    countedCourses: valid.length,
    gpa: credits ? points / credits : null,
  };
}

function SummaryCard({ title, value, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
        <Icon size={22} />
      </div>
      <p className="text-sm text-[#718579]">{title}</p>
      <h3 className="mt-2 text-2xl font-extrabold text-[#234E43]">
        {value}
      </h3>
    </article>
  );
}

export default function StudentResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSemester, setSelectedSemester] = useState("All");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [calculatorSemesters, setCalculatorSemesters] = useState([
    createSemester(1),
  ]);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchMyResults();
      setResults(data.map(normalizeExam));
    } catch (err) {
      setResults([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // ========================================
  // COURSE-WISE EXAM RESULTS
  // ========================================

  const courseGroups = useMemo(
    () => buildCourseGroups(results),
    [results]
  );

  const semesters = useMemo(
    () => [...new Set(courseGroups.map((c) => c.semester))],
    [courseGroups]
  );

  const selectableCourses = useMemo(
    () => courseGroups.filter(
      (course) =>
        selectedSemester === "All" ||
        course.semester === selectedSemester
    ),
    [courseGroups, selectedSemester]
  );

  useEffect(() => {
    if (!selectableCourses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId(selectableCourses[0]?.id || "");
    }
  }, [selectableCourses, selectedCourseId]);

  const selectedCourse = selectableCourses.find(
    (course) => course.id === selectedCourseId
  );

  // Marks summary is separate from GPA.
  const publishedExamCount = results.length;
  const courseCount = courseGroups.length;

  const obtainedTotal = selectedCourse?.exams.reduce(
    (sum, exam) => sum + (exam.obtained ?? 0),
    0
  ) ?? 0;

  const examMarkTotal = selectedCourse?.exams.reduce(
    (sum, exam) => sum + (exam.total ?? 0),
    0
  ) ?? 0;

  // ========================================
  // GPA / CGPA CALCULATOR
  // ========================================

  const calculatedSemesters = useMemo(
    () => calculatorSemesters.map(calculateSemester),
    [calculatorSemesters]
  );

  const totalCredits = calculatedSemesters.reduce(
    (sum, semester) => sum + semester.credits,
    0
  );

  const totalPoints = calculatedSemesters.reduce(
    (sum, semester) => sum + semester.points,
    0
  );

  const cgpa = totalCredits
    ? totalPoints / totalCredits
    : null;

  const chartData = calculatedSemesters
    .filter((semester) => semester.gpa !== null)
    .map((semester) => ({
      semester: semester.name,
      gpa: Number(semester.gpa.toFixed(2)),
    }));

  function updateCourse(semesterId, courseId, field, value) {
    setCalculatorSemesters((previous) =>
      previous.map((semester) =>
        semester.id === semesterId
          ? {
              ...semester,
              courses: semester.courses.map((course) =>
                course.id === courseId
                  ? { ...course, [field]: value }
                  : course
              ),
            }
          : semester
      )
    );
  }

  function addCourse(semesterId) {
    setCalculatorSemesters((previous) =>
      previous.map((semester) =>
        semester.id === semesterId
          ? {
              ...semester,
              courses: [...semester.courses, createCourse()],
            }
          : semester
      )
    );
  }

  function removeCourse(semesterId, courseId) {
    setCalculatorSemesters((previous) =>
      previous.map((semester) =>
        semester.id === semesterId
          ? {
              ...semester,
              courses: semester.courses.filter(
                (course) => course.id !== courseId
              ),
            }
          : semester
      )
    );
  }

  function addSemester() {
    setCalculatorSemesters((previous) => [
      ...previous,
      createSemester(previous.length + 1),
    ]);
  }

  function removeSemester(id) {
    setCalculatorSemesters((previous) =>
      previous.filter((semester) => semester.id !== id)
    );
  }

  // ========================================
  // UI
  // ========================================

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            STUDENT ACADEMICS
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            Results & CGPA
          </h1>

          <p className="mt-3 text-[#718579]">
            View individual examination marks by course and calculate
            semester GPA and CGPA.
          </p>
        </div>

        <button
          type="button"
          onClick={loadResults}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#DCE8DA] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-50"
        >
          <RefreshCw size={17} />
          Refresh Results
        </button>
      </header>

      {loading && (
        <p className="rounded-xl bg-[#EAF2E8] p-4 text-sm text-[#234E43]">
          Loading published results...
        </p>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* EXAM STATISTICS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Published Examinations"
          value={publishedExamCount}
          icon={CheckCircle2}
        />
        <SummaryCard
          title="Courses With Published Results"
          value={courseCount}
          icon={BookOpen}
        />
        <SummaryCard
          title="Semesters With Results"
          value={semesters.length}
          icon={GraduationCap}
        />
      </div>

      {/* COURSE-WISE MARKS SHEET */}
      <section className="overflow-hidden rounded-3xl border border-[#E2EADC] bg-white shadow-sm">
        <div className="border-b border-[#E2EADC] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#234E43]">
                Course-wise Marks Sheet
              </h2>
              <p className="mt-1 text-sm text-[#718579]">
                Select a semester and course to view published exam marks.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
              <div className="relative">
                <select
                  value={selectedSemester}
                  onChange={(event) => {
                    setSelectedSemester(event.target.value);
                    setSelectedCourseId("");
                  }}
                  className={`${inputClass} appearance-none pr-9`}
                >
                  <option value="All">All Semesters</option>
                  {semesters.map((semester) => (
                    <option key={semester} value={semester}>
                      {semester}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718579]"
                />
              </div>

              <div className="relative">
                <select
                  value={selectedCourse?.id || ""}
                  onChange={(event) =>
                    setSelectedCourseId(event.target.value)
                  }
                  disabled={!selectableCourses.length}
                  className={`${inputClass} appearance-none pr-9`}
                >
                  {!selectableCourses.length && (
                    <option value="">No Courses</option>
                  )}
                  {selectableCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.title}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718579]"
                />
              </div>
            </div>
          </div>
        </div>

        {selectedCourse ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#F9FBF8] px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                  {selectedCourse.semester}
                </p>
                <h3 className="mt-1 text-lg font-bold text-[#234E43]">
                  {selectedCourse.code} — {selectedCourse.title}
                </h3>
              </div>

              <div className="text-sm text-[#718579]">
                {selectedCourse.exams.length} published exams
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="bg-[#F5F7F9] text-xs font-bold uppercase tracking-wide text-[#234E43]">
                  <tr>
                    <th className="w-16 px-5 py-4">#</th>
                    <th className="px-5 py-4">Exam Name</th>
                    <th className="px-5 py-4">Exam Type</th>
                    <th className="px-5 py-4 text-center">Exam Mark</th>
                    <th className="px-5 py-4 text-center">Obtained Mark</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EDF1EB]">
                  {selectedCourse.exams.map((exam, index) => (
                    <tr key={exam.id} className="hover:bg-[#F9FBF8]">
                      <td className="px-5 py-5">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 text-sm font-bold text-white">
                          {index + 1}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-sm font-medium text-[#234E43]">
                        {exam.examName}
                      </td>

                      <td className="px-5 py-5 text-sm text-[#718579]">
                        {exam.examType}
                      </td>

                      <td className="px-5 py-5 text-center">
                        <span className="inline-flex rounded-full bg-sky-50 px-4 py-1.5 text-sm font-bold text-sky-600">
                          {numberText(exam.total)}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-center">
                        <span className="inline-flex rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-600">
                          {numberText(exam.obtained)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-6 border-t border-[#E2EADC] bg-[#F9FBF8] px-6 py-4 text-sm">
              <span className="text-[#718579]">
                Published Exam Marks:
                <strong className="ml-2 text-[#234E43]">
                  {numberText(examMarkTotal)}
                </strong>
              </span>

              <span className="text-[#718579]">
                Obtained:
                <strong className="ml-2 text-emerald-700">
                  {numberText(obtainedTotal)}
                </strong>
              </span>
            </div>

            <p className="px-6 py-3 text-xs text-[#8A9F90]">
              Totals include published exams only. They are not
              a final course grade or CGPA.
            </p>
          </>
        ) : (
          <div className="py-14 text-center text-sm text-[#718579]">
            {loading
              ? "Loading..."
              : error
                ? "Unable to display results."
                : "No published examination marks available."}
          </div>
        )}
      </section>

      {/* GPA CALCULATOR */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Calculator size={25} className="text-[#477764]" />
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              GPA & CGPA Calculator
            </h2>
            <p className="text-sm text-[#718579]">
              Calculate GPA using final course grades and credit hours.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {calculatedSemesters.map((semester, index) => (
            <div
              key={semester.id}
              className="overflow-hidden rounded-2xl border border-[#E2EADC]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F6F8F3] p-4">
                <input
                  type="text"
                  value={semester.name}
                  aria-label={`Semester ${index + 1} name`}
                  onChange={(event) =>
                    setCalculatorSemesters((previous) =>
                      previous.map((item) =>
                        item.id === semester.id
                          ? { ...item, name: event.target.value }
                          : item
                      )
                    )
                  }
                  className="max-w-[190px] rounded-lg border border-[#DCE8DA] bg-white px-3 py-2 font-bold text-[#234E43]"
                />

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#234E43]">
                    GPA: {numberText(semester.gpa)}
                  </span>

                  {calculatedSemesters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSemester(semester.id)}
                      title="Remove semester"
                      className="rounded-lg bg-red-50 p-2 text-red-700"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-4">
                {semester.courses.map((course, courseIndex) => (
                  <div
                    key={course.id}
                    className="grid grid-cols-2 items-center gap-3 rounded-xl bg-[#F9FBF8] p-3 sm:grid-cols-[1fr_110px_150px_40px]"
                  >
                    <input
                      type="text"
                      value={course.code}
                      placeholder={`Course ${courseIndex + 1}`}
                      onChange={(event) =>
                        updateCourse(
                          semester.id, course.id,
                          "code", event.target.value
                        )
                      }
                      aria-label="Course name or code"
                      className={`${inputClass} col-span-2 sm:col-span-1`}
                    />

                    <input
                      type="number"
                      min="0.5"
                      max="30"
                      step="0.5"
                      value={course.credits}
                      onChange={(event) =>
                        updateCourse(
                          semester.id, course.id,
                          "credits", event.target.value
                        )
                      }
                      aria-label="Course credits"
                      className={inputClass}
                    />

                    <select
                      value={course.grade}
                      onChange={(event) =>
                        updateCourse(
                          semester.id, course.id,
                          "grade", event.target.value
                        )
                      }
                      aria-label="Final course grade"
                      className={inputClass}
                    >
                      <option value="">Select Grade</option>
                      {GRADES.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade} ({GRADE_POINTS[grade].toFixed(2)})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => removeCourse(semester.id, course.id)}
                      title="Remove course"
                      className="col-span-2 justify-self-end rounded-lg bg-red-50 p-2 text-red-700 sm:col-span-1"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addCourse(semester.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#DCE8DA] px-4 py-2.5 text-sm font-semibold text-[#234E43]"
                >
                  <Plus size={17} />
                  Add Course
                </button>
              </div>

              <div className="flex flex-wrap justify-between gap-3 border-t border-[#E2EADC] bg-[#F9FBF8] px-5 py-4 text-sm text-[#718579]">
                <span>Courses included: {semester.countedCourses}</span>
                <span>Credits: {semester.credits}</span>
                <strong className="text-[#234E43]">
                  GPA: {numberText(semester.gpa)}
                </strong>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addSemester}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#EAF2E8] px-5 py-3 text-sm font-bold text-[#234E43]"
        >
          <Plus size={18} />
          Add Another Semester
        </button>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-[#234E43] p-6 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#D9A536]">
              Cumulative Academic Performance
            </p>
            <h3 className="mt-2 text-xl font-bold">
              Estimated CGPA
            </h3>
            <p className="mt-2 text-sm text-white/70">
              {totalCredits} total credits included
            </p>
          </div>

          <div>
            <p className="text-4xl font-extrabold">
              {numberText(cgpa)}
              <span className="ml-2 text-sm font-normal text-white/60">
                / 4.00
              </span>
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-6 text-[#8A9F90]">
          Calculator results are estimates based on final course grades
          and credit hours, not individual examination marks.
          Entries are not saved to MongoDB. Official grade scale
          and retake rules may differ.
        </p>
      </section>

      {/* CALCULATOR PERFORMANCE CHART */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <TrendingUp size={23} className="text-[#477764]" />
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              Semester GPA Performance
            </h2>
            <p className="text-sm text-[#718579]">
              Based on your calculator entries
            </p>
          </div>
        </div>

        {chartData.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="studentCourseGpa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A6C1A4" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#A6C1A4" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EDF1EB" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="semester" />
                <YAxis domain={[0, 4]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="gpa"
                  stroke="#234E43"
                  strokeWidth={3}
                  fill="url(#studentCourseGpa)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-[#718579]">
            Enter final course grades to see your semester GPA trend.
          </div>
        )}
      </section>

      <p className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Course-wise Examination Results & CGPA Calculator
      </p>
    </div>
  );
}
