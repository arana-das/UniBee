
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen, Users, Building2, Search, Plus, Pencil,
  Trash2, X, Save, Download, RefreshCw, CheckCircle2,
  AlertCircle, ClipboardList, GraduationCap,
  ChevronLeft, ChevronRight,
} from "lucide-react";

import {
  getAuthToken,
  fetchCurrentUser,
  getStoredUser,
} from "../../services/authApi";

import { getFaculty } from "../../services/facultyApi";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 8;
const str = (value) => String(value ?? "").trim();
const norm = (value) => str(value).toLowerCase();
const idOf = (row) => str(row?._id || row?.id);
const courseCode = (row) => str(row?.courseCode || row?.code);
const courseTitle = (row) =>
  str(row?.courseTitle || row?.title || "Untitled Course");
const facultyName = (row) =>
  str(row?.name || row?.fullName || "Unknown Faculty");
const facultyDesignation = (row) =>
  str(row?.designation || "Faculty Member");

function assignedFacultyId(course) {
  const faculty = course?.faculty;
  if (!faculty) return "";
  return typeof faculty === "object" ? idOf(faculty) : str(faculty);
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please sign in with your UniBee account.");
  }

  let response;

  try {
    response = await fetch(`${API_BASE}/api${path}`, {
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
      result?.message || `API request failed (${response.status}).`
    );
  }

  return result.data ?? result;
}

function getDepartment(record, departments) {
  const assigned = norm(record);

  return departments.find((department) =>
    [
      department.name,
      department.code,
      department._id,
      department.id,
    ].some((value) => norm(value) === assigned)
  );
}

function departmentMatches(value, department) {
  if (!department) return false;

  const expected = [
    department.name,
    department.code,
    department._id,
    department.id,
  ].map(norm).filter(Boolean);

  const candidates =
    value && typeof value === "object"
      ? [value.name, value.code, value._id, value.id]
      : [value];

  return candidates.some((candidate) =>
    expected.includes(norm(candidate))
  );
}

function exportCSV(rows) {
  const headers = [
    "Course Code", "Course Title", "Department",
    "Semester", "Credits", "Faculty", "Status",
  ];

  const values = rows.map(({ course, person, assigned }) => [
    courseCode(course),
    courseTitle(course),
    course.department,
    course.semester,
    course.credits,
    person ? facultyName(person) : "",
    assigned ? "Allocated" : "Unassigned",
  ]);

  const safeCell = (value) => {
    let cell = str(value);
    if (/^[=+\-@\t\r]/.test(cell)) cell = "'" + cell;
    return `"${cell.replace(/"/g, '""')}"`;
  };

  const csv = "\uFEFF" + [headers, ...values]
    .map((row) => row.map(safeCell).join(","))
    .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = "UniBee_HOD_Course_Allocation.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#718579]">{label}</p>
          <h3 className="mt-3 text-3xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>
        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={23} />
        </div>
      </div>
      <p className="mt-3 text-xs text-[#718579]">{hint}</p>
    </article>
  );
}

function AllocationModal({
  course, faculty, selectedId, setSelectedId,
  saving, error, onClose, onSave,
}) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, saving]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hod-allocation-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#B18B37]">
              ACADEMIC MANAGEMENT
            </p>
            <h2
              id="hod-allocation-title"
              className="mt-2 text-xl font-extrabold text-[#234E43]"
            >
              {assignedFacultyId(course)
                ? "Change Faculty Allocation"
                : "Assign Course to Faculty"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-xl p-2 hover:bg-slate-100 disabled:opacity-40"
          >
            <X size={21} />
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-[#F6F8F3] p-4">
          <p className="font-bold text-[#234E43]">{courseTitle(course)}</p>
          <p className="mt-1 text-xs text-[#718579]">
            {courseCode(course)} · {course.department}
          </p>
        </div>

        <form
          className="mt-5 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Select Faculty *
            </span>
            <select
              required
              value={selectedId}
              disabled={saving}
              onChange={(event) => setSelectedId(event.target.value)}
              className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
            >
              <option value="">Choose Faculty</option>
              {faculty.map((person) => (
                <option key={idOf(person)} value={idOf(person)}>
                  {facultyName(person)} — {facultyDesignation(person)}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#E2EADC] px-5 py-3 text-sm font-bold text-[#234E43]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedId}
              className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {saving
                ? <RefreshCw size={17} className="animate-spin" />
                : <Save size={17} />}
              {saving ? "Saving..." : "Save Allocation"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function HODCourseAllocation() {
  const [user, setUser] = useState(getStoredUser);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);

  const [adminDepartment, setAdminDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [facultyError, setFacultyError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [modalCourse, setModalCourse] = useState(null);
  const [selectedId, setSelectedId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setFacultyError("");

    try {
      const currentUser = await fetchCurrentUser();

      if (!["admin", "hod"].includes(currentUser?.role)) {
        throw new Error("You do not have access to Course Allocation.");
      }

      const [departmentData, courseData] = await Promise.all([
        apiRequest("/academic/departments"),
        apiRequest("/academic/courses"),
      ]);

      if (!Array.isArray(departmentData) || !Array.isArray(courseData)) {
        throw new Error("Invalid academic records returned by server.");
      }

      setUser(currentUser);
      setDepartments(departmentData);
      setCourses(courseData);

      setAdminDepartment((previous) =>
        departmentData.some((d) => d.name === previous)
          ? previous
          : ""
      );

      try {
        const facultyData = await getFaculty();

        if (!Array.isArray(facultyData)) {
          throw new Error("Invalid faculty records returned by server.");
        }

        setFaculty(facultyData);
      } catch (err) {
        setFaculty([]);
        setFacultyError(err.message);
      }
    } catch (err) {
      setError(err.message || "Unable to load academic records.");
      setCourses([]);
      setFaculty([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isHOD = user?.role === "hod";

  const assignedDepartment = isHOD
    ? str(user?.department)
    : adminDepartment;

  const department = useMemo(
    () => getDepartment(assignedDepartment, departments),
    [assignedDepartment, departments]
  );

  const displayDepartment = department?.name || assignedDepartment;

  const departmentCourses = useMemo(
    () =>
      department
        ? courses.filter((course) =>
            departmentMatches(course.department, department)
          )
        : [],
    [courses, department]
  );

  const departmentFaculty = useMemo(
    () =>
      department
        ? faculty.filter(
            (person) =>
              departmentMatches(person.department, department) &&
              norm(person.status || "Active") === "active"
          )
        : [],
    [faculty, department]
  );

  const facultyMap = useMemo(
    () => new Map(faculty.map((person) => [idOf(person), person])),
    [faculty]
  );

  const courseRows = useMemo(
    () =>
      departmentCourses.map((course) => {
        const facultyId = assignedFacultyId(course);
        const person =
          facultyMap.get(facultyId) ||
          (course.faculty && typeof course.faculty === "object"
            ? course.faculty
            : null);

        return {
          course,
          person,
          assigned: Boolean(facultyId),
        };
      }),
    [departmentCourses, facultyMap]
  );

  const filteredRows = useMemo(() => {
    const query = norm(search);

    return courseRows.filter(({ course, person, assigned }) => {
      const matchesSearch = [
        courseCode(course),
        courseTitle(course),
        course.semester,
        person ? facultyName(person) : "",
      ].some((value) => norm(value).includes(query));

      const matchesFilter =
        filter === "All" ||
        (filter === "Allocated" && assigned) ||
        (filter === "Unassigned" && !assigned);

      return matchesSearch && matchesFilter;
    });
  }, [courseRows, search, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const workload = useMemo(
    () =>
      departmentFaculty.map((person) => {
        const assigned = departmentCourses.filter(
          (course) => assignedFacultyId(course) === idOf(person)
        );

        return {
          person,
          count: assigned.length,
          credits: assigned.reduce(
            (sum, course) => sum + (Number(course.credits) || 0),
            0
          ),
        };
      }),
    [departmentFaculty, departmentCourses]
  );

  const assignedCount = courseRows.filter((row) => row.assigned).length;
  const ready = !loading && !error && !!department;

  const stats = [
    {
      label: "Department Courses",
      value: ready ? departmentCourses.length : "—",
      icon: BookOpen,
      hint: "Courses from MongoDB",
    },
    {
      label: "Allocated Courses",
      value: ready ? assignedCount : "—",
      icon: CheckCircle2,
      hint: "Courses with assigned faculty",
    },
    {
      label: "Unassigned Courses",
      value: ready ? departmentCourses.length - assignedCount : "—",
      icon: ClipboardList,
      hint: "Courses requiring faculty",
    },
    {
      label: "Allocated Faculty",
      value: ready
        ? new Set(
            departmentCourses.map(assignedFacultyId).filter(Boolean)
          ).size
        : "—",
      icon: Users,
      hint: "Distinct faculty assigned",
    },
  ];

  const resetFilters = () => {
    setSearch("");
    setFilter("All");
    setPage(1);
  };

  function openAllocation(course) {
    setModalCourse(course);
    setSelectedId(assignedFacultyId(course));
    setError("");
    setFeedback("");
  }

  function closeAllocation() {
    if (saving) return;
    setModalCourse(null);
    setSelectedId("");
    setError("");
  }

  async function saveAllocation() {
    if (!modalCourse || saving) return;

    const person = departmentFaculty.find(
      (item) => idOf(item) === selectedId
    );

    if (!person) {
      setError("Select an active faculty member from this department.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiRequest(
        `/academic/courses/${encodeURIComponent(idOf(modalCourse))}/faculty`,
        {
          method: "PATCH",
          body: JSON.stringify({ facultyId: idOf(person) }),
        }
      );

      const code = courseCode(modalCourse);

      setModalCourse(null);
      setSelectedId("");

      await loadData();

      setFeedback(
        `${code} assigned to ${facultyName(person)} successfully.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeAllocation(course) {
    if (saving || !assignedFacultyId(course)) return;

    const confirmed = window.confirm(
      `Remove faculty assignment from ${courseCode(course)}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      await apiRequest(
        `/academic/courses/${encodeURIComponent(idOf(course))}/faculty`,
        {
          method: "PATCH",
          body: JSON.stringify({ facultyId: null }),
        }
      );

      await loadData();

      setFeedback(
        `${courseCode(course)} allocation removed successfully.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            ACADEMIC MANAGEMENT
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Course Allocation
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Assign department courses to faculty using live MongoDB records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => exportCSV(filteredRows)}
            disabled={!ready || !filteredRows.length}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </section>

      {/* DEPARTMENT */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
            <Building2 size={22} />
          </div>
          <div>
            <p className="font-bold text-[#234E43]">
              Active Department
            </p>
            <p className="mt-1 text-xs text-[#718579]">
              {isHOD
                ? "Department assigned to your HOD account"
                : "Select a department"}
            </p>
          </div>
        </div>

        {isHOD ? (
          <div className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72">
            {displayDepartment || "No department assigned"}
          </div>
        ) : (
          <select
            aria-label="Select Department"
            value={adminDepartment}
            disabled={loading}
            onChange={(event) => {
              setAdminDepartment(event.target.value);
              resetFilters();
            }}
            className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72"
          >
            <option value="">Select Department</option>
            {departments.map((item) => (
              <option key={idOf(item)} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* ALERTS */}
      {loading && (
        <p className="rounded-xl bg-[#F6F8F3] p-4 text-sm text-[#234E43]">
          Loading MongoDB academic records...
        </p>
      )}

      {error && !modalCourse && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </p>
      )}

      {facultyError && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle size={18} />
          Faculty API: {facultyError}
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

      {!loading && !error && !department && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {assignedDepartment
            ? "The assigned department could not be found in Admin Departments."
            : "No department selected or assigned."}
        </p>
      )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      {/* COURSE DIRECTORY */}
      <section className="overflow-hidden rounded-2xl border border-[#E2EADC] bg-white shadow-sm">
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#234E43]">
                Department Course Assignments
              </h2>
              <p className="mt-1 text-xs text-[#718579]">
                Assign, change or remove faculty allocations.
              </p>
            </div>
            <span className="rounded-full bg-[#F6F8F3] px-3 py-2 text-xs font-bold text-[#234E43]">
              {ready ? filteredRows.length : 0} Courses
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA092]"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search course, code or faculty..."
                className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#A6C1A4]"
              />
            </div>
            <select
              aria-label="Filter allocation status"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
            >
              <option value="All">All Courses</option>
              <option value="Allocated">Allocated</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
              <tr>
                <th className="px-5 py-4">Course</th>
                <th className="px-5 py-4">Semester</th>
                <th className="px-5 py-4">Credits</th>
                <th className="px-5 py-4">Faculty</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EDF1EB]">
              {ready && visibleRows.map(({ course, person, assigned }) => (
                <tr key={idOf(course)} className="hover:bg-[#F9FBF8]">
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-[#234E43]">
                      {courseTitle(course)}
                    </p>
                    <p className="mt-1 text-xs text-[#718579]">
                      {courseCode(course)}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm text-[#607B6C]">
                    {course.semester || "—"}
                  </td>

                  <td className="px-5 py-4 text-sm text-[#607B6C]">
                    {course.credits ?? "—"}
                  </td>

                  <td className="px-5 py-4 text-sm text-[#234E43]">
                    {person
                      ? facultyName(person)
                      : assigned
                        ? "Assigned Faculty"
                        : "Not assigned"}
                  </td>

                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      assigned
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-800"
                    }`}>
                      {assigned ? "Allocated" : "Unassigned"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openAllocation(course)}
                        disabled={
                          loading || saving ||
                          !!facultyError ||
                          !departmentFaculty.length ||
                          norm(course.status) !== "active"
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-[#EAF2E8] px-3 py-2 text-xs font-bold text-[#234E43] disabled:opacity-40"
                      >
                        {assigned ? (
                          <>
                            <Pencil size={15} />
                            Change
                          </>
                        ) : (
                          <>
                            <Plus size={15} />
                            Assign
                          </>
                        )}
                      </button>

                      {assigned && (
                        <button
                          type="button"
                          title="Remove allocation"
                          onClick={() => removeAllocation(course)}
                          disabled={saving}
                          className="rounded-lg bg-rose-50 p-2 text-rose-700 disabled:opacity-40"
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && ready && !visibleRows.length && (
            <div className="py-14 text-center">
              <BookOpen
                size={36}
                className="mx-auto text-[#A6C1A4]"
              />
              <p className="mt-4 font-bold text-[#234E43]">
                No Course Records Found
              </p>
              <p className="mt-2 text-sm text-[#718579]">
                No courses match this department and filters.
              </p>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1EB] p-5">
          <p className="text-xs text-[#718579]">
            Page {currentPage} of {totalPages} ·{" "}
            {ready ? filteredRows.length : 0} courses
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous page"
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
              className="rounded-lg border border-[#E2EADC] p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* FACULTY WORKLOAD */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <Users size={21} className="text-[#234E43]" />
          <h2 className="text-lg font-bold text-[#234E43]">
            Faculty Workload Overview
          </h2>
        </div>

        {ready && workload.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {workload.map((item) => (
              <div
                key={idOf(item.person)}
                className="rounded-xl bg-[#F6F8F3] p-4"
              >
                <p className="text-sm font-bold text-[#234E43]">
                  {facultyName(item.person)}
                </p>
                <p className="mt-1 text-xs text-[#718579]">
                  {facultyDesignation(item.person)}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2 text-xs font-semibold text-[#607B6C]">
                  <span>{item.count} Courses</span>
                  <span className="inline-flex items-center gap-2">
                    <GraduationCap size={16} />
                    {item.credits} Credits
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-[#F6F8F3] p-5 text-sm text-[#718579]">
            {loading
              ? "Loading faculty workload..."
              : "No active faculty records available for this department."}
          </p>
        )}
      </section>

      {/* ASSIGNMENT MODAL */}
      {modalCourse && (
        <AllocationModal
          course={modalCourse}
          faculty={departmentFaculty}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          saving={saving}
          error={error}
          onClose={closeAllocation}
          onSave={saveAllocation}
        />
      )}
    </div>
  );
}
