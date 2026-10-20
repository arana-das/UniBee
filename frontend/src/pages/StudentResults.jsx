
import { useMemo, useState } from "react";
import {
  GraduationCap,
  TrendingUp,
  Award,
  BookOpen,
  Calculator,
  ChevronDown,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

// Demo academic records. MongoDB integration will be added later.
const semesterResults = [
  {
    semester: "Semester 1",
    gpa: 3.25,
    courses: [
      { code: "ICT 1101", name: "Introduction to ICT", credit: 3, grade: "A-" },
      { code: "ICT 1103", name: "Programming Fundamentals", credit: 3, grade: "B+" },
      { code: "MAT 1101", name: "Mathematics I", credit: 3, grade: "B+" },
    ],
  },
  {
    semester: "Semester 2",
    gpa: 3.48,
    courses: [
      { code: "ICT 1201", name: "Object Oriented Programming", credit: 3, grade: "A-" },
      { code: "ICT 1203", name: "Digital Logic Design", credit: 3, grade: "B+" },
      { code: "MAT 1201", name: "Discrete Mathematics", credit: 3, grade: "A-" },
    ],
  },
  {
    semester: "Semester 3",
    gpa: 3.65,
    courses: [
      { code: "ICT 2201", name: "Data Structures & Algorithms", credit: 3, grade: "A" },
      { code: "ICT 2203", name: "Database Fundamentals", credit: 3, grade: "A-" },
      { code: "ICT 2205", name: "Computer Architecture", credit: 3, grade: "B+" },
    ],
  },
  {
    semester: "Semester 4",
    gpa: 3.85,
    courses: [
      { code: "ICT 3201", name: "Web Technologies", credit: 3, grade: "A" },
      { code: "ICT 3203", name: "Database Management Systems", credit: 3, grade: "A-" },
      { code: "ICT 3205", name: "Computer Networks", credit: 3, grade: "A" },
    ],
  },
];

const gradePoints = {
  "A+": 4.0,
  A: 3.75,
  "A-": 3.5,
  "B+": 3.25,
  B: 3.0,
  "B-": 2.75,
  "C+": 2.5,
  C: 2.25,
  D: 2.0,
  F: 0,
};

const initialCalculatorCourses = [
  { id: 1, credit: 3, grade: "A" },
  { id: 2, credit: 3, grade: "A-" },
  { id: 3, credit: 3, grade: "B+" },
];

function StudentResults() {
  const [selectedSemester, setSelectedSemester] = useState("Semester 4");
  const [calculatorCourses, setCalculatorCourses] = useState(
    initialCalculatorCourses
  );

  const currentSemester = semesterResults.find(
    (item) => item.semester === selectedSemester
  );

  const performanceData = semesterResults.map((item) => ({
    semester: item.semester.replace("Semester ", "Sem "),
    gpa: item.gpa,
  }));

  const summary = [
    {
      title: "Latest Semester GPA",
      value: currentSemester.gpa.toFixed(2),
      icon: GraduationCap,
    },
    {
      title: "Semesters Recorded",
      value: semesterResults.length,
      icon: BookOpen,
    },
    {
      title: "Completed Courses",
      value: semesterResults.reduce(
        (total, item) => total + item.courses.length,
        0
      ),
      icon: CheckCircle2,
    },
    {
      title: "Highest Semester GPA",
      value: Math.max(...semesterResults.map((s) => s.gpa)).toFixed(2),
      icon: Award,
    },
  ];

  const calculatedGPA = useMemo(() => {
    const totalCredits = calculatorCourses.reduce(
      (sum, course) => sum + Number(course.credit),
      0
    );

    if (totalCredits === 0) return "0.00";

    const totalPoints = calculatorCourses.reduce(
      (sum, course) =>
        sum + Number(course.credit) * gradePoints[course.grade],
      0
    );

    return (totalPoints / totalCredits).toFixed(2);
  }, [calculatorCourses]);

  const updateCalculator = (id, field, value) => {
    setCalculatorCourses((previous) =>
      previous.map((course) =>
        course.id === id ? { ...course, [field]: value } : course
      )
    );
  };

  const addCalculatorCourse = () => {
    setCalculatorCourses((previous) => [
      ...previous,
      { id: Date.now(), credit: 3, grade: "A" },
    ]);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
          STUDENT ACADEMICS
        </p>

        <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
          Results & CGPA
        </h1>

        <p className="mt-3 text-[#718579]">
          Explore your academic performance, semester results,
          and calculate your expected GPA.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={24} />
              </div>

              <p className="text-sm text-[#718579]">{item.title}</p>

              <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
                {item.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Performance Chart */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <div className="mb-7 flex items-center gap-3">
          <TrendingUp size={23} className="text-[#477764]" />
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              Academic Performance
            </h2>
            <p className="text-sm text-[#718579]">
              Semester-wise GPA trend
            </p>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="resultGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A6C1A4" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#A6C1A4" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="#EDF1EB"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis dataKey="semester" />
              <YAxis domain={[0, 4]} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="gpa"
                stroke="#234E43"
                strokeWidth={3}
                fill="url(#resultGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Semester Result */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              Semester Results
            </h2>
            <p className="mt-1 text-sm text-[#718579]">
              View individual course grades
            </p>
          </div>

          <div className="relative">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="appearance-none rounded-xl border border-[#DCE8DA] bg-[#F9FBF8] py-3 pl-4 pr-10 font-semibold text-[#234E43] outline-none"
            >
              {semesterResults.map((item) => (
                <option key={item.semester}>{item.semester}</option>
              ))}
            </select>
            <ChevronDown
              size={17}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#718579]"
            />
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-[#EAF2E8] p-5">
          <p className="text-sm text-[#607B6C]">
            Selected Semester GPA
          </p>
          <h3 className="mt-2 text-3xl font-extrabold text-[#234E43]">
            {currentSemester.gpa.toFixed(2)}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
              <tr>
                <th className="rounded-l-xl px-5 py-4">Course Code</th>
                <th className="px-5 py-4">Course Title</th>
                <th className="px-5 py-4">Credits</th>
                <th className="rounded-r-xl px-5 py-4">Grade</th>
              </tr>
            </thead>

            <tbody>
              {currentSemester.courses.map((course) => (
                <tr
                  key={course.code}
                  className="border-b border-[#EDF1EB]"
                >
                  <td className="px-5 py-4 text-sm font-bold text-[#B18B37]">
                    {course.code}
                  </td>

                  <td className="px-5 py-4 font-semibold text-[#234E43]">
                    {course.name}
                  </td>

                  <td className="px-5 py-4 text-[#718579]">
                    {course.credit}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#EAF2E8] px-3 py-1.5 text-xs font-bold text-[#427A67]">
                      {course.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* GPA Calculator */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <div className="mb-7 flex items-center gap-3">
          <Calculator size={25} className="text-[#477764]" />
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              GPA Calculator
            </h2>
            <p className="text-sm text-[#718579]">
              Estimate your semester GPA
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {calculatorCourses.map((course, index) => (
            <div
              key={course.id}
              className="grid grid-cols-2 items-center gap-3 rounded-xl bg-[#F9FBF8] p-4 sm:grid-cols-[1fr_120px_130px_auto]"
            >
              <span className="font-semibold text-[#234E43]">
                Course {index + 1}
              </span>

              <input
                type="number"
                min="0.5"
                max="6"
                step="0.5"
                value={course.credit}
                onChange={(e) =>
                  updateCalculator(course.id, "credit", e.target.value)
                }
                aria-label={`Credits for course ${index + 1}`}
                className="w-full rounded-lg border border-[#DCE8DA] bg-white p-3 text-[#234E43]"
              />

              <select
                value={course.grade}
                onChange={(e) =>
                  updateCalculator(course.id, "grade", e.target.value)
                }
                aria-label={`Grade for course ${index + 1}`}
                className="rounded-lg border border-[#DCE8DA] bg-white p-3 text-[#234E43]"
              >
                {Object.keys(gradePoints).map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  setCalculatorCourses((previous) =>
                    previous.filter((item) => item.id !== course.id)
                  )
                }
                className="rounded-lg bg-red-50 px-3 py-3 text-sm font-bold text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={addCalculatorCourse}
            className="rounded-xl border border-[#DCE8DA] px-5 py-3 font-bold text-[#234E43] hover:bg-[#F1F7EF]"
          >
            + Add Course
          </button>

          <div className="rounded-xl bg-[#234E43] px-7 py-4 text-white">
            <p className="text-xs text-[#C9DDCF]">Estimated GPA</p>
            <h3 className="text-3xl font-extrabold">{calculatedGPA}</h3>
          </div>
        </div>

        <p className="mt-5 text-xs text-[#8A9F90]">
          Demo grading scale. Actual university grading policies
          should be verified before official use.
        </p>
      </section>

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Academic Results
      </div>
    </div>
  );
}

export default StudentResults;
