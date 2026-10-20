
import { useMemo, useState } from "react";
import {
  ClipboardCheck,
  CalendarDays,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  TrendingUp,
  Clock3,
} from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

// Demo data. Real attendance records will come from MongoDB later.
const courses = [
  { code: "ICT 3201", name: "Web Technologies", present: 23, absent: 2 },
  { code: "ICT 3203", name: "Database Management Systems", present: 21, absent: 4 },
  { code: "ICT 3205", name: "Computer Networks", present: 24, absent: 1 },
  { code: "ICT 3207", name: "Software Engineering", present: 22, absent: 3 },
  { code: "ICT 3209", name: "Artificial Intelligence", present: 19, absent: 6 },
  { code: "ICT 3211", name: "Information Security", present: 24, absent: 1 },
];

const history = [
  { id: 1, date: "2026-10-08", code: "ICT 3201", status: "Present" },
  { id: 2, date: "2026-10-08", code: "ICT 3203", status: "Absent" },
  { id: 3, date: "2026-10-07", code: "ICT 3205", status: "Present" },
  { id: 4, date: "2026-10-07", code: "ICT 3207", status: "Present" },
  { id: 5, date: "2026-10-06", code: "ICT 3209", status: "Absent" },
  { id: 6, date: "2026-10-06", code: "ICT 3211", status: "Present" },
  { id: 7, date: "2026-10-05", code: "ICT 3201", status: "Present" },
  { id: 8, date: "2026-10-05", code: "ICT 3203", status: "Present" },
];

const percent = (present, total) =>
  total > 0 ? Math.round((present / total) * 100) : 0;

function StudentAttendance() {
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const totalPresent = courses.reduce((sum, c) => sum + c.present, 0);
  const totalAbsent = courses.reduce((sum, c) => sum + c.absent, 0);
  const totalClasses = totalPresent + totalAbsent;
  const overallAttendance = percent(totalPresent, totalClasses);

  const pieData = [
    { name: "Present", value: totalPresent, color: "#234E43" },
    { name: "Absent", value: totalAbsent, color: "#D9A536" },
  ];

  const chartData = courses.map((c) => ({
    name: c.code.replace("ICT ", ""),
    attendance: percent(c.present, c.present + c.absent),
  }));

  const filteredCourses = useMemo(() => {
    const query = search.toLowerCase().trim();
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query)
    );
  }, [search]);

  const filteredHistory = useMemo(() => {
    return history.filter((record) => {
      const matchesCourse =
        selectedCourse === "all" || record.code === selectedCourse;
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;
      return matchesCourse && matchesStatus;
    });
  }, [selectedCourse, statusFilter]);

  const summary = [
    {
      title: "Overall Attendance",
      value: `${overallAttendance}%`,
      icon: TrendingUp,
      background: "#EAF2E8",
      color: "#234E43",
    },
    {
      title: "Total Classes",
      value: totalClasses,
      icon: BookOpen,
      background: "#EEF2F7",
      color: "#52677F",
    },
    {
      title: "Classes Attended",
      value: totalPresent,
      icon: CheckCircle2,
      background: "#EAF2E8",
      color: "#427A67",
    },
    {
      title: "Classes Missed",
      value: totalAbsent,
      icon: XCircle,
      background: "#FFF4DC",
      color: "#B78B28",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
          STUDENT ACADEMICS
        </p>
        <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
          My Attendance
        </h1>
        <p className="mt-3 text-[#718579]">
          Monitor your class participation and track attendance
          across your enrolled courses.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: item.background, color: item.color }}
              >
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

      {/* Analytics */}
      <div className="grid gap-6 xl:grid-cols-5">
        {/* Donut Chart */}
        <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-xl font-bold text-[#234E43]">
            Attendance Overview
          </h2>
          <p className="mt-1 text-sm text-[#718579]">
            Overall participation distribution
          </p>

          <div className="relative mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={77}
                  outerRadius={102}
                  paddingAngle={3}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-[#234E43]">
                {overallAttendance}%
              </span>
              <span className="text-xs text-[#718579]">Overall</span>
            </div>
          </div>

          <div className="flex justify-center gap-7 text-sm">
            <span className="flex items-center gap-2 text-[#607B6C]">
              <span className="h-3 w-3 rounded-full bg-[#234E43]" />
              Present ({totalPresent})
            </span>
            <span className="flex items-center gap-2 text-[#607B6C]">
              <span className="h-3 w-3 rounded-full bg-[#D9A536]" />
              Absent ({totalAbsent})
            </span>
          </div>
        </section>

        {/* Bar Chart */}
        <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm xl:col-span-3">
          <h2 className="text-xl font-bold text-[#234E43]">
            Course-wise Attendance
          </h2>
          <p className="mt-1 text-sm text-[#718579]">
            Percentage comparison across courses
          </p>

          <div className="mt-7 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#EDF1EB"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#718579", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: "#718579", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value) => [`${value}%`, "Attendance"]} />
                <Bar
                  dataKey="attendance"
                  fill="#477764"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Course-wise Records */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              Course Attendance Details
            </h2>
            <p className="mt-1 text-sm text-[#718579]">
              Review individual course attendance
            </p>
          </div>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-11 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4] sm:w-64"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredCourses.map((course) => {
            const total = course.present + course.absent;
            const attendance = percent(course.present, total);
            const lowAttendance = attendance < 75;

            return (
              <div
                key={course.code}
                className="rounded-2xl border border-[#E5ECE2] bg-[#FBFCFA] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#B18B37]">
                      {course.code}
                    </span>
                    <h3 className="mt-1 font-bold text-[#234E43]">
                      {course.name}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      lowAttendance
                        ? "bg-red-50 text-red-700"
                        : "bg-[#EAF2E8] text-[#427A67]"
                    }`}
                  >
                    {attendance}%
                  </span>
                </div>

                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#E7EEE4]">
                  <div
                    className={`h-full rounded-full ${
                      lowAttendance ? "bg-red-500" : "bg-[#477764]"
                    }`}
                    style={{ width: `${attendance}%` }}
                  />
                </div>

                <div className="mt-4 flex justify-between text-xs text-[#718579]">
                  <span>Present: {course.present}</span>
                  <span>Absent: {course.absent}</span>
                  <span>Total: {total}</span>
                </div>

                {lowAttendance && (
                  <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-red-700">
                    <AlertTriangle size={15} />
                    Attendance below 75%
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {filteredCourses.length === 0 && (
          <p className="py-10 text-center text-[#718579]">
            No matching courses found.
          </p>
        )}
      </section>

      {/* Attendance History */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              Attendance History
            </h2>
            <p className="mt-1 text-sm text-[#718579]">
              Your recent class attendance records
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              aria-label="Filter attendance by course"
              className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm text-[#45685B]"
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.code} value={course.code}>
                  {course.code}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter attendance by status"
              className="rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm text-[#45685B]"
            >
              <option value="all">All Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead className="bg-[#F6F8F3]">
              <tr className="text-xs uppercase tracking-wide text-[#718579]">
                <th className="rounded-l-xl px-5 py-4">Date</th>
                <th className="px-5 py-4">Course</th>
                <th className="rounded-r-xl px-5 py-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredHistory.map((record) => {
                const course = courses.find((c) => c.code === record.code);
                const present = record.status === "Present";

                return (
                  <tr
                    key={record.id}
                    className="border-b border-[#EDF1EB] text-sm"
                  >
                    <td className="px-5 py-4 text-[#607B6C]">
                      <span className="flex items-center gap-2">
                        <CalendarDays size={16} />
                        {record.date}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#234E43]">
                        {course?.name}
                      </p>
                      <p className="mt-1 text-xs text-[#8A9F90]">
                        {record.code}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                          present
                            ? "bg-[#EAF2E8] text-[#427A67]"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {present ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        {record.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredHistory.length === 0 && (
            <p className="py-10 text-center text-[#718579]">
              No attendance records match your filters.
            </p>
          )}
        </div>
      </section>

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Attendance Management
      </div>
    </div>
  );
}

export default StudentAttendance;
