
import { useMemo, useState } from "react";
import {
  FileText,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Award,
  Search,
  CalendarDays,
  UploadCloud,
  X,
  BookOpen,
  ArrowUpRight,
  Paperclip,
  MessageSquare,
} from "lucide-react";

// Frontend demonstration data.
// Actual assignments and submissions will come from MongoDB.

const initialAssignments = [
  {
    id: 1,
    title: "React Component Design",
    course: "Web Technologies",
    code: "ICT 3201",
    instructor: "Dr. Sarah Ahmed",
    deadline: "2026-10-15",
    status: "Pending",
    marks: 20,
    obtained: null,
    description:
      "Create reusable React components for a responsive university dashboard. Include proper component structure and styling.",
    feedback: "",
  },
  {
    id: 2,
    title: "Database Schema Design",
    course: "Database Management Systems",
    code: "ICT 3203",
    instructor: "Md. Rahim Hasan",
    deadline: "2026-10-18",
    status: "Pending",
    marks: 25,
    obtained: null,
    description:
      "Design a database schema for a university management system. Explain the entities, relationships, and design decisions.",
    feedback: "",
  },
  {
    id: 3,
    title: "Network Topology Report",
    course: "Computer Networks",
    code: "ICT 3205",
    instructor: "Dr. Nusrat Jahan",
    deadline: "2026-10-20",
    status: "Pending",
    marks: 20,
    obtained: null,
    description:
      "Prepare a report describing common network topologies, their applications, advantages, and limitations.",
    feedback: "",
  },
  {
    id: 4,
    title: "Software Requirements Document",
    course: "Software Engineering",
    code: "ICT 3207",
    instructor: "Dr. Farhan Kabir",
    deadline: "2026-10-07",
    status: "Submitted",
    marks: 30,
    obtained: null,
    description:
      "Prepare a software requirements specification for a proposed information system.",
    feedback: "",
  },
  {
    id: 5,
    title: "HTML & CSS Portfolio",
    course: "Web Technologies",
    code: "ICT 3201",
    instructor: "Dr. Sarah Ahmed",
    deadline: "2026-09-30",
    status: "Graded",
    marks: 20,
    obtained: 18,
    description:
      "Develop a responsive personal portfolio using HTML5 and CSS3.",
    feedback:
      "Good visual hierarchy and responsive design. Improve accessibility in navigation.",
  },
  {
    id: 6,
    title: "Programming Fundamentals Quiz",
    course: "Software Engineering",
    code: "ICT 3207",
    instructor: "Dr. Farhan Kabir",
    deadline: "2026-09-25",
    status: "Graded",
    marks: 15,
    obtained: 14,
    description:
      "Complete the programming fundamentals assessment.",
    feedback: "Excellent work. Clear problem-solving approach.",
  },
];

const statusStyles = {
  Pending: "bg-[#FFF4DC] text-[#9F741E]",
  Submitted: "bg-[#E8EFF8] text-[#456A94]",
  Graded: "bg-[#EAF2E8] text-[#427A67]",
  Overdue: "bg-red-50 text-red-700",
};

function StudentAssignments() {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [success, setSuccess] = useState("");

  const today = new Date().toLocaleDateString("en-CA");

  const getStatus = (assignment) => {
    if (
      assignment.status === "Pending" &&
      assignment.deadline < today
    ) {
      return "Overdue";
    }
    return assignment.status;
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const matchesSearch =
        assignment.title.toLowerCase().includes(query) ||
        assignment.course.toLowerCase().includes(query) ||
        assignment.code.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        getStatus(assignment) === statusFilter;

      const matchesCourse =
        courseFilter === "All" ||
        assignment.course === courseFilter;

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [assignments, search, statusFilter, courseFilter, today]);

  const total = assignments.length;
  const pending = assignments.filter(
    (a) => getStatus(a) === "Pending"
  ).length;
  const submitted = assignments.filter(
    (a) => a.status === "Submitted"
  ).length;
  const graded = assignments.filter(
    (a) => a.status === "Graded"
  ).length;

  const courseOptions = [...new Set(assignments.map((a) => a.course))];

  const handleSubmission = (event) => {
    event.preventDefault();

    if (!selectedFile || !selected) return;

    const allowedExtensions = [".pdf", ".doc", ".docx", ".zip"];
    const filename = selectedFile.name.toLowerCase();

    if (!allowedExtensions.some((ext) => filename.endsWith(ext))) {
      setSuccess("Please select a PDF, DOC, DOCX, or ZIP file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setSuccess("Maximum file size is 10 MB.");
      return;
    }

    if (getStatus(selected) !== "Pending") {
      setSuccess("This assignment is no longer open for submission.");
      return;
    }

    // Local UI demo: this does not upload or store the file.
    setAssignments((previous) =>
      previous.map((assignment) =>
        assignment.id === selected.id
          ? { ...assignment, status: "Submitted" }
          : assignment
      )
    );

    setSelected(null);
    setSelectedFile(null);
    setSuccess(
      "Demo submission recorded in this page only. No file has been uploaded."
    );
  };

  const summaryCards = [
    { title: "Total Assignments", value: total, icon: FileText },
    { title: "Pending", value: pending, icon: Clock3 },
    { title: "Submitted", value: submitted, icon: CheckCircle2 },
    { title: "Graded", value: graded, icon: Award },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
          STUDENT ACADEMICS
        </p>

        <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
          My Assignments
        </h1>

        <p className="mt-3 text-[#718579]">
          Stay organized, monitor deadlines, review feedback,
          and manage your academic tasks.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={24} />
              </div>

              <p className="text-sm text-[#718579]">{card.title}</p>

              <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
                {card.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assignments..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            aria-label="Filter by course"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
          >
            <option value="All">All Courses</option>
            {courseOptions.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by assignment status"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
          >
            {["All", "Pending", "Submitted", "Graded", "Overdue"].map(
              (status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All Status" : status}
                </option>
              )
            )}
          </select>
        </div>

        <p className="mt-4 text-sm text-[#718579]">
          Showing {filtered.length} of {total} assignments
        </p>
      </div>

      {/* Assignment Cards */}
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
                  <FileText size={24} className="text-[#234E43]" />
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    statusStyles[status]
                  }`}
                >
                  {status}
                </span>
              </div>

              <p className="text-xs font-bold text-[#B18B37]">
                {assignment.code}
              </p>

              <h3 className="mt-2 text-xl font-bold text-[#234E43]">
                {assignment.title}
              </h3>

              <p className="mt-2 text-sm text-[#718579]">
                {assignment.course}
              </p>

              <div className="mt-6 space-y-3 text-sm text-[#607B6C]">
                <div className="flex items-center gap-2">
                  <CalendarDays size={17} />
                  Due: {assignment.deadline}
                </div>

                <div className="flex items-center gap-2">
                  <Award size={17} />
                  Total Marks: {assignment.marks}
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen size={17} />
                  {assignment.instructor}
                </div>
              </div>

              {status === "Graded" && (
                <div className="mt-5 rounded-xl bg-[#EAF2E8] p-4">
                  <p className="text-sm font-semibold text-[#234E43]">
                    Your Grade: {assignment.obtained}/{assignment.marks}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelected(assignment);
                  setSelectedFile(null);
                  setSuccess("");
                }}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-4 py-3.5 font-semibold text-white transition hover:bg-[#326657] pt-4"
              >
                View Details
                <ArrowUpRight size={18} />
              </button>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-[#E2EADC] bg-white p-12 text-center">
          <Search size={35} className="mx-auto text-[#A6C1A4]" />
          <p className="mt-4 font-semibold text-[#234E43]">
            No matching assignments found.
          </p>
        </div>
      )}

      {/* Feedback Message */}
      {success && !selected && (
        <div
          role="status"
          className="rounded-xl border border-[#DCE8DA] bg-[#F1F7EF] p-4 text-sm text-[#234E43]"
        >
          {success}
        </div>
      )}

      {/* Assignment Details Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  {selected.code}
                </p>

                <h2
                  id="assignment-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {selected.title}
                </h2>
              </div>

              <button
                onClick={() => setSelected(null)}
                aria-label="Close assignment details"
                className="rounded-lg p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 rounded-xl bg-[#F6F8F3] p-5 text-sm text-[#45685B] sm:grid-cols-2">
              <p><strong>Course:</strong> {selected.course}</p>
              <p><strong>Instructor:</strong> {selected.instructor}</p>
              <p><strong>Deadline:</strong> {selected.deadline}</p>
              <p><strong>Total Marks:</strong> {selected.marks}</p>
            </div>

            <h3 className="mt-7 font-bold text-[#234E43]">
              Assignment Instructions
            </h3>

            <p className="mt-3 leading-relaxed text-[#718579]">
              {selected.description}
            </p>

            {selected.status === "Graded" && (
              <div className="mt-6 rounded-xl bg-[#EAF2E8] p-5">
                <h3 className="flex items-center gap-2 font-bold text-[#234E43]">
                  <MessageSquare size={18} />
                  Faculty Feedback
                </h3>

                <p className="mt-3 text-sm text-[#45685B]">
                  {selected.feedback}
                </p>

                <p className="mt-3 font-bold text-[#234E43]">
                  Marks: {selected.obtained}/{selected.marks}
                </p>
              </div>
            )}

            {getStatus(selected) === "Pending" && (
              <form onSubmit={handleSubmission} className="mt-7">
                <h3 className="mb-4 font-bold text-[#234E43]">
                  Submit Your Assignment
                </h3>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#A6C1A4] bg-[#F9FBF8] px-6 py-9 text-center">
                  <UploadCloud size={32} className="text-[#477764]" />

                  <span className="mt-3 font-semibold text-[#234E43]">
                    Choose assignment file
                  </span>

                  <span className="mt-2 text-xs text-[#718579]">
                    PDF, DOC, DOCX or ZIP — Max 10 MB
                  </span>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.zip"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] || null)
                    }
                    className="sr-only"
                  />
                </label>

                {selectedFile && (
                  <p className="mt-4 flex items-center gap-2 text-sm text-[#45685B]">
                    <Paperclip size={17} />
                    {selectedFile.name}
                  </p>
                )}

                {success && (
                  <p className="mt-4 text-sm text-red-700">{success}</p>
                )}

                <button
                  type="submit"
                  disabled={!selectedFile}
                  className="mt-5 w-full rounded-xl bg-[#D9A536] px-5 py-3.5 font-bold text-[#234E43] transition hover:bg-[#E7B84E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex items-center justify-center gap-2">
                    <UploadCloud size={19} />
                    Simulate Submission
                  </span>
                </button>
              </form>
            )}

            {selected.status === "Submitted" && (
              <div className="mt-7 rounded-xl bg-[#E8EFF8] p-5 text-sm text-[#456A94]">
                <CheckCircle2 size={20} className="mb-2" />
                Demo submission recorded. Awaiting faculty review.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentAssignments;
