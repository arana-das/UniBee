
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { getAuthToken } from "../services/authApi";

// ==========================================
// UNIBEE STUDENT COURSE MARKS
// ==========================================

const API = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const formatMarks = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toFixed(2)
    : "—";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB");
};

// ==========================================
// FETCH STUDENT'S OWN COURSE MARKS
// ==========================================

async function fetchCourseMarks(courseId, signal) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to your Student account."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API}/api/student-course-marks/${encodeURIComponent(
        courseId
      )}`,
      {
        method: "GET",
        cache: "no-store",
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Cannot connect to UniBee Backend."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.message ||
      `Unable to load Course Marks (${response.status}).`
    );
  }

  return result;
}

// ==========================================
// SMALL REUSABLE CARD
// ==========================================

function SummaryCard({ icon: Icon, title, value }) {
  return (
    <div className="rounded-2xl border border-[#DCE6DC] bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#718579]">
            {title}
          </p>

          <p className="mt-2 text-2xl font-extrabold text-[#234E43]">
            {value}
          </p>
        </div>

        <Icon
          size={23}
          className="text-[#234E43]"
        />
      </div>
    </div>
  );
}

// ==========================================
// MARKS TABLE
// ==========================================

function MarksTable({ title, source, records }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#DCE6DC] bg-white">
      <div className="border-b border-[#E6EDE5] p-5">
        <h3 className="text-lg font-extrabold text-[#234E43]">
          {title}
        </h3>

        <p className="mt-1 text-xs text-[#718579]">
          Marks provided by {source}
        </p>
      </div>

      {records.length === 0 ? (
        <div className="p-8 text-center text-sm text-[#718579]">
          No marks are available for this section.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-[#F5F8F3] text-[#234E43]">
              <tr>
                <th className="p-4">
                  Assessment
                </th>

                <th className="p-4">
                  Type
                </th>

                <th className="p-4">
                  Obtained
                </th>

                <th className="p-4">
                  Maximum
                </th>

                <th className="p-4">
                  Percentage
                </th>

                <th className="p-4">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {records.map((record, index) => (
                <tr
                  key={record.id || index}
                  className="border-t border-[#E6EDE5]"
                >
                  <td className="p-4">
                    <p className="font-semibold text-[#234E43]">
                      {record.assessmentName}
                    </p>

                    <p className="text-xs text-[#718579]">
                      {record.semester || "—"}
                    </p>
                  </td>

                  <td className="p-4">
                    {record.assessmentType}
                  </td>

                  <td className="p-4 font-bold">
                    {formatMarks(
                      record.obtainedMarks
                    )}
                  </td>

                  <td className="p-4">
                    {formatMarks(
                      record.maximumMarks
                    )}
                  </td>

                  <td className="p-4">
                    {formatMarks(
                      record.percentage
                    )}%
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={13} />
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function StudentCourseMarks({
  courseId,
  onBack,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reload counter for manual Refresh
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(
    async (signal) => {
      if (!courseId) {
        setData(null);
        setLoading(false);
        setError("Course ID is missing.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await fetchCourseMarks(
          courseId,
          signal
        );

        if (!signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
          setData(null);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [courseId]
  );

  useEffect(() => {
    const controller = new AbortController();

    load(controller.signal);

    return () => controller.abort();
  }, [load, refreshKey]);

  const assignments = useMemo(
    () => data?.assignments || [],
    [data]
  );

  const assessments = useMemo(
    () => data?.assessments || [],
    [data]
  );

  const summary = data?.summary || {};

  const title =
    data?.course?.courseTitle ||
    "Course Marks";

  const code =
    data?.course?.courseCode ||
    "";

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <header className="rounded-2xl border border-[#DCE6DC] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {typeof onBack === "function" && (
              <button
                type="button"
                onClick={onBack}
                className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[#234E43]"
              >
                <ArrowLeft size={17} />
                Back to My Courses
              </button>
            )}

            <p className="text-xs font-bold uppercase tracking-widest text-[#B18B37]">
              STUDENT PORTAL
            </p>

            <h1 className="mt-2 text-2xl font-extrabold text-[#234E43]">
              {title}
            </h1>

            <p className="mt-2 text-sm text-[#718579]">
              {code
                ? `${code} · `
                : ""}
              Course-wise Assessment Marks
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setRefreshKey((value) => value + 1)
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6DC] px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Refresh Marks
          </button>
        </div>
      </header>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center gap-2 rounded-xl bg-white p-5 text-sm text-[#718579]">
          <Loader2
            size={19}
            className="animate-spin"
          />
          Loading your Course Marks...
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-rose-50 p-5 text-sm text-rose-700"
        >
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {/* CONTENT */}
      {!loading && data && (
        <>
          {/* COURSE DETAILS */}
          <section className="rounded-2xl bg-[#234E43] p-6 text-white">
            <div className="flex items-center gap-3">
              <GraduationCap size={28} />

              <div>
                <h2 className="text-xl font-extrabold">
                  {data.course?.courseCode} —{" "}
                  {data.course?.courseTitle}
                </h2>

                <p className="mt-1 text-sm text-[#D0E2D7]">
                  Student:{" "}
                  {data.student?.fullName || "—"}
                  {" · "}
                  {data.student?.studentId || "—"}
                </p>
              </div>
            </div>
          </section>

          {/* SUMMARY */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard
              icon={BookOpen}
              title="Graded Assignments"
              value={summary.assignmentCount || 0}
            />

            <SummaryCard
              icon={ClipboardList}
              title="Published Exam Assessments"
              value={summary.assessmentCount || 0}
            />

            <SummaryCard
              icon={CheckCircle2}
              title="Available Marks Records"
              value={summary.totalRecords || 0}
            />
          </section>

          {/* FACULTY ASSIGNMENTS */}
          <MarksTable
            title="Assignment Marks"
            source="Faculty"
            records={assignments}
          />

          {/* EXAM CONTROLLER MARKS */}
          <MarksTable
            title="Quiz, Class Test, Midterm & Final"
            source="Exam Controller"
            records={assessments}
          />

          {/* NOTICE */}
          <section className="rounded-xl border border-[#DCE6DC] bg-[#F5F8F3] p-5 text-sm text-[#547064]">
            Only released assessment marks are
            displayed. Draft examination marks are
            not visible. Final Course Grade or CGPA
            will be calculated separately according
            to the approved grading policy.
          </section>
        </>
      )}
    </div>
  );
}
