
import { useMemo, useState } from "react";
import {
  Search,
  BookOpen,
  GraduationCap,
  Clock3,
  ArrowUpRight,
  SlidersHorizontal,
  Layers3,
  CheckCircle2,
  PlayCircle,
  X,
} from "lucide-react";

// Temporary data for frontend development.
// MongoDB will provide course data after backend integration.

const courses = [
  {
    id: 1,
    code: "ICT 3201",
    title: "Web Technologies",
    instructor: "Dr. Sarah Ahmed",
    semester: "Semester 4",
    credits: 3,
    progress: 78,
    status: "In Progress",
    color: "#234E43",
    category: "Development",
  },
  {
    id: 2,
    code: "ICT 3203",
    title: "Database Management Systems",
    instructor: "Md. Rahim Hasan",
    semester: "Semester 4",
    credits: 3,
    progress: 65,
    status: "In Progress",
    color: "#B78B28",
    category: "Database",
  },
  {
    id: 3,
    code: "ICT 3205",
    title: "Computer Networks",
    instructor: "Dr. Nusrat Jahan",
    semester: "Semester 4",
    credits: 3,
    progress: 82,
    status: "In Progress",
    color: "#477764",
    category: "Networking",
  },
  {
    id: 4,
    code: "ICT 3207",
    title: "Software Engineering",
    instructor: "Dr. Farhan Kabir",
    semester: "Semester 4",
    credits: 3,
    progress: 55,
    status: "In Progress",
    color: "#64748B",
    category: "Engineering",
  },
  {
    id: 5,
    code: "ICT 2201",
    title: "Data Structures & Algorithms",
    instructor: "Dr. Ayesha Rahman",
    semester: "Semester 3",
    credits: 3,
    progress: 100,
    status: "Completed",
    color: "#6D8071",
    category: "Programming",
  },
  {
    id: 6,
    code: "ICT 2203",
    title: "Object Oriented Programming",
    instructor: "Md. Arif Hossain",
    semester: "Semester 3",
    credits: 3,
    progress: 100,
    status: "Completed",
    color: "#8C7959",
    category: "Programming",
  },
];

function StudentCourses() {
  const [search, setSearch] = useState("");
  const [semester, setSemester] = useState("All Semesters");
  const [status, setStatus] = useState("All Courses");
  const [selectedCourse, setSelectedCourse] = useState(null);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        course.title.toLowerCase().includes(query) ||
        course.code.toLowerCase().includes(query) ||
        course.instructor.toLowerCase().includes(query);

      const matchesSemester =
        semester === "All Semesters" ||
        course.semester === semester;

      const matchesStatus =
        status === "All Courses" ||
        (status === "Ongoing" && course.status === "In Progress") ||
        (status === "Completed" && course.status === "Completed");

      return matchesSearch && matchesSemester && matchesStatus;
    });
  }, [search, semester, status]);

  const ongoingCount = courses.filter(
    (course) => course.status === "In Progress"
  ).length;

  const completedCount = courses.filter(
    (course) => course.status === "Completed"
  ).length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.15em] text-[#B18B37]">
            STUDENT ACADEMICS
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            My Courses
          </h1>

          <p className="mt-3 text-[#718579]">
            Explore your courses, monitor learning progress, and
            stay connected with your academic journey.
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full border border-[#DCE8DA] bg-white px-4 py-2 text-sm font-semibold text-[#45685B]">
          <GraduationCap size={18} className="text-[#B78B28]" />
          Academic Workspace
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Total Courses",
            value: courses.length,
            icon: Layers3,
          },
          {
            title: "Ongoing Courses",
            value: ongoingCount,
            icon: PlayCircle,
          },
          {
            title: "Completed Courses",
            value: completedCount,
            icon: CheckCircle2,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="flex items-center gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={23} />
              </div>

              <div>
                <p className="text-sm text-[#718579]">
                  {item.title}
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-[#234E43]">
                  {item.value}
                </h2>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by course, code, or instructor..."
              aria-label="Search courses"
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4] focus:ring-2 focus:ring-[#A6C1A4]/30"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
              aria-label="Filter by semester"
              className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3.5 text-sm font-medium text-[#45685B] outline-none"
            >
              <option>All Semesters</option>
              <option>Semester 4</option>
              <option>Semester 3</option>
            </select>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by status"
              className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3.5 text-sm font-medium text-[#45685B] outline-none"
            >
              <option>All Courses</option>
              <option>Ongoing</option>
              <option>Completed</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-sm text-[#718579]">
          <SlidersHorizontal size={16} />
          Showing {filteredCourses.length} of {courses.length} courses
        </div>
      </div>

      {/* Course Cards */}
      {filteredCourses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => (
            <article
              key={course.id}
              className="group overflow-hidden rounded-3xl border border-[#E2EADC] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#234E43]/10"
            >
              {/* Course Banner */}
              <div
                className="relative flex h-36 items-center justify-between overflow-hidden p-6"
                style={{ backgroundColor: course.color }}
              >
                <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full border-[28px] border-white/10" />

                <div className="relative z-10">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    {course.category}
                  </span>

                  <p className="mt-6 text-sm font-bold tracking-wide text-white/90">
                    {course.code}
                  </p>
                </div>

                <BookOpen
                  size={43}
                  strokeWidth={1.3}
                  className="relative z-10 text-white/75"
                />
              </div>

              {/* Course Information */}
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h3 className="min-h-[56px] text-xl font-bold leading-snug text-[#234E43]">
                    {course.title}
                  </h3>

                  <ArrowUpRight
                    size={20}
                    className="shrink-0 text-[#9BAFA1] transition group-hover:text-[#B78B28]"
                  />
                </div>

                <p className="text-sm text-[#718579]">
                  Instructor:{" "}
                  <span className="font-semibold text-[#45685B]">
                    {course.instructor}
                  </span>
                </p>

                <div className="mt-5 flex items-center justify-between text-xs text-[#718579]">
                  <span>{course.semester}</span>
                  <span>{course.credits} Credits</span>
                </div>

                {/* Progress */}
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#718579]">
                      Course Progress
                    </span>

                    <span className="font-bold text-[#234E43]">
                      {course.progress}%
                    </span>
                  </div>

                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-[#EAF0E8]"
                    role="progressbar"
                    aria-valuenow={course.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${course.title} progress`}
                  >
                    <div
                      className="h-full rounded-full bg-[#477764]"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="mt-5">
                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                      course.status === "Completed"
                        ? "bg-[#EAF2E8] text-[#477764]"
                        : "bg-[#FFF4DC] text-[#A57921]"
                    }`}
                  >
                    {course.status}
                  </span>
                </div>

                {/* Action */}
                <button
                  type="button"
                  onClick={() => setSelectedCourse(course)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 font-semibold text-white transition hover:bg-[#326657]"
                >
                  View Course Details
                  <ArrowUpRight size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-[#E2EADC] bg-white px-6 py-16 text-center">
          <Search size={40} className="mx-auto text-[#A6C1A4]" />
          <h3 className="mt-5 text-xl font-bold text-[#234E43]">
            No courses found
          </h3>
          <p className="mt-2 text-[#718579]">
            Try changing your search or filters.
          </p>

          <button
            onClick={() => {
              setSearch("");
              setSemester("All Semesters");
              setStatus("All Courses");
            }}
            className="mt-5 rounded-xl bg-[#234E43] px-5 py-3 font-semibold text-white"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Course Details Modal */}
      {selectedCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedCourse(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-dialog-title"
            className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#B18B37]">
                  {selectedCourse.code}
                </p>
                <h2
                  id="course-dialog-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {selectedCourse.title}
                </h2>
              </div>

              <button
                onClick={() => setSelectedCourse(null)}
                aria-label="Close course details"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm text-[#45685B]">
              <p>
                <strong>Instructor:</strong> {selectedCourse.instructor}
              </p>
              <p>
                <strong>Semester:</strong> {selectedCourse.semester}
              </p>
              <p>
                <strong>Credits:</strong> {selectedCourse.credits}
              </p>
              <p>
                <strong>Status:</strong> {selectedCourse.status}
              </p>
              <p>
                <strong>Progress:</strong> {selectedCourse.progress}%
              </p>
            </div>

            <div className="mt-8 rounded-xl bg-[#F1F7EF] p-4 text-sm text-[#607B6C]">
              Course materials, assignments, and academic resources
              will be connected here in the upcoming development steps.
            </div>

            <button
              onClick={() => setSelectedCourse(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 font-semibold text-white hover:bg-[#326657]"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentCourses;
