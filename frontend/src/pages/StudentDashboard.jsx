
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  ArrowUpRight,
  ArrowRight,
  Clock3,
  Bell,
  TrendingUp,
  Sparkles,
  MapPin,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { Link } from "react-router-dom";

// Temporary demonstration data.
// Real academic information will come from MongoDB later.

const academicPerformance = [
  { semester: "Sem 1", cgpa: 3.25 },
  { semester: "Sem 2", cgpa: 3.48 },
  { semester: "Sem 3", cgpa: 3.65 },
  { semester: "Sem 4", cgpa: 3.85 },
];

const stats = [
  {
    title: "Current CGPA",
    value: "3.85",
    subtitle: "Out of 4.00",
    icon: GraduationCap,
    accent: "#234E43",
    bg: "#EAF2E8",
  },
  {
    title: "Attendance",
    value: "92%",
    subtitle: "Overall attendance",
    icon: ClipboardCheck,
    accent: "#B88A22",
    bg: "#FFF5DF",
  },
  {
    title: "Enrolled Courses",
    value: "06",
    subtitle: "Current semester",
    icon: BookOpen,
    accent: "#427A67",
    bg: "#EAF3ED",
  },
  {
    title: "Pending Assignments",
    value: "03",
    subtitle: "Needs your attention",
    icon: FileText,
    accent: "#8F7352",
    bg: "#F7F0E7",
  },
];

const todayClasses = [
  {
    course: "Web Technologies",
    code: "ICT 3201",
    time: "09:00 AM - 10:30 AM",
    room: "Room 302",
    status: "Scheduled",
  },
  {
    course: "Database Management Systems",
    code: "ICT 3203",
    time: "11:00 AM - 12:30 PM",
    room: "Lab 204",
    status: "Scheduled",
  },
  {
    course: "Computer Networks",
    code: "ICT 3205",
    time: "02:00 PM - 03:30 PM",
    room: "Room 405",
    status: "Scheduled",
  },
];

const assignments = [
  {
    title: "React Component Design",
    course: "Web Technologies",
    deadline: "12 Oct 2026",
    daysLeft: "3 days left",
    urgent: true,
  },
  {
    title: "Database Schema Design",
    course: "Database Management Systems",
    deadline: "15 Oct 2026",
    daysLeft: "6 days left",
    urgent: false,
  },
  {
    title: "Network Topology Report",
    course: "Computer Networks",
    deadline: "18 Oct 2026",
    daysLeft: "9 days left",
    urgent: false,
  },
];

const notices = [
  {
    title: "Midterm Examination Schedule",
    category: "Academic",
    date: "08 Oct 2026",
  },
  {
    title: "University Research Workshop",
    category: "Event",
    date: "07 Oct 2026",
  },
  {
    title: "Course Registration Reminder",
    category: "Notice",
    date: "05 Oct 2026",
  },
];

function SectionHeading({ title, subtitle, link }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-[#234E43]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-[#7D9183]">
            {subtitle}
          </p>
        )}
      </div>

      {link && (
        <Link
          to={link}
          className="flex items-center gap-1 text-sm font-semibold text-[#477764] transition hover:text-[#B88A22]"
        >
          View All <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}

function StudentDashboard() {
  return (
    <div className="space-y-8">

      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] px-7 py-9 text-white md:px-10 md:py-10">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[45px] border-white/5" />
        <div className="absolute bottom-0 right-1/3 h-40 w-40 rounded-full bg-[#D9A536]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-7 md:flex-row md:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-[#D9E8DC]">
              <Sparkles size={15} className="text-[#D9A536]" />
              YOUR ACADEMIC WORKSPACE
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Welcome back, Student!
            </h1>

            <p className="mt-3 max-w-xl leading-relaxed text-[#C9DDCF]">
              Keep learning, stay connected, and make every step
              of your academic journey count.
            </p>
          </div>

          <Link
            to="/student/courses"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#D9A536] px-6 py-3.5 font-bold text-[#234E43] transition hover:bg-[#E7B84E]"
          >
            My Courses <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-6 flex items-start justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: stat.bg }}
                >
                  <Icon size={24} style={{ color: stat.accent }} />
                </div>

                <TrendingUp size={18} className="text-[#9AAD9D]" />
              </div>

              <p className="text-sm font-medium text-[#718579]">
                {stat.title}
              </p>

              <h3 className="mt-2 text-3xl font-extrabold text-[#234E43]">
                {stat.value}
              </h3>

              <p className="mt-2 text-xs text-[#8A9F90]">
                {stat.subtitle}
              </p>
            </div>
          );
        })}
      </section>

      {/* Analytics Row */}
      <section className="grid gap-6 xl:grid-cols-3">

        {/* CGPA Chart */}
        <div className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm xl:col-span-2">
          <SectionHeading
            title="Academic Performance"
            subtitle="Semester-wise CGPA overview"
            link="/student/results"
          />

          <div className="h-[285px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={academicPerformance}
                margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="cgpaGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#A6C1A4"
                      stopOpacity={0.65}
                    />
                    <stop
                      offset="95%"
                      stopColor="#A6C1A4"
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#EDF1EB"
                  strokeDasharray="4 4"
                  vertical={false}
                />

                <XAxis
                  dataKey="semester"
                  tick={{ fill: "#84998A", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, 4]}
                  tick={{ fill: "#84998A", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(value) => [Number(value).toFixed(2), "CGPA"]}
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid #E2EADC",
                    boxShadow: "0 8px 25px rgba(35,78,67,0.08)",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="cgpa"
                  stroke="#234E43"
                  strokeWidth={3}
                  fill="url(#cgpaGradient)"
                  activeDot={{
                    r: 6,
                    stroke: "#D9A536",
                    strokeWidth: 3,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Overview */}
        <div className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
          <SectionHeading
            title="Attendance Overview"
            subtitle="Your participation this semester"
            link="/student/attendance"
          />

          <div className="flex flex-col items-center justify-center py-6">
            <div
              className="relative flex h-44 w-44 items-center justify-center rounded-full"
              style={{
                background:
                  "conic-gradient(#234E43 0% 92%, #E7EEE4 92% 100%)",
              }}
            >
              <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-4xl font-extrabold text-[#234E43]">
                  92%
                </span>
                <span className="mt-1 text-xs text-[#84998A]">
                  Attendance
                </span>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-5 text-sm">
              <span className="flex items-center gap-2 text-[#607B6C]">
                <span className="h-3 w-3 rounded-full bg-[#234E43]" />
                Present
              </span>

              <span className="flex items-center gap-2 text-[#607B6C]">
                <span className="h-3 w-3 rounded-full bg-[#E7EEE4]" />
                Absent
              </span>
            </div>

            <p className="mt-5 text-center text-sm text-[#718579]">
              Keep up your consistent attendance!
            </p>
          </div>
        </div>
      </section>

      {/* Classes and Assignments */}
      <section className="grid gap-6 xl:grid-cols-2">

        {/* Today's Classes */}
        <div className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
          <SectionHeading
            title="Today's Classes"
            subtitle="Your scheduled learning sessions"
            link="/student/routine"
          />

          <div className="space-y-4">
            {todayClasses.map((item, index) => (
              <div
                key={item.code}
                className="flex gap-4 rounded-2xl border border-[#EDF1EB] bg-[#FBFCFA] p-4 transition hover:border-[#A6C1A4]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EAF2E8] font-bold text-[#234E43]">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[#234E43]">
                    {item.course}
                  </h3>

                  <p className="mt-1 text-xs text-[#8A9F90]">
                    {item.code}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#718579]">
                    <span className="flex items-center gap-1.5">
                      <Clock3 size={14} />
                      {item.time}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} />
                      {item.room}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Assignments */}
        <div className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
          <SectionHeading
            title="Upcoming Assignments"
            subtitle="Stay ahead of your deadlines"
            link="/student/assignments"
          />

          <div className="space-y-4">
            {assignments.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#EDF1EB] bg-[#FBFCFA] p-4 transition hover:border-[#A6C1A4]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF4DC]">
                      <FileText size={21} className="text-[#B88A22]" />
                    </div>

                    <div>
                      <h3 className="font-bold text-[#234E43]">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-xs text-[#84998A]">
                        {item.course}
                      </p>
                    </div>
                  </div>

                  <ArrowUpRight
                    size={18}
                    className="shrink-0 text-[#9AAD9D]"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF1EB] pt-3">
                  <span className="flex items-center gap-2 text-xs text-[#718579]">
                    <CalendarDays size={14} />
                    {item.deadline}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.urgent
                        ? "bg-[#FFF0DB] text-[#A36D1F]"
                        : "bg-[#EAF2E8] text-[#477764]"
                    }`}
                  >
                    {item.daysLeft}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notices */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <SectionHeading
          title="Recent Notices"
          subtitle="Latest university announcements"
          link="/student/notices"
        />

        <div className="grid gap-4 md:grid-cols-3">
          {notices.map((notice) => (
            <div
              key={notice.title}
              className="rounded-2xl border border-[#EDF1EB] bg-[#FBFCFA] p-5 transition hover:border-[#A6C1A4] hover:shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2E8]">
                  <Bell size={19} className="text-[#234E43]" />
                </div>

                <span className="rounded-full bg-[#F1F7EF] px-3 py-1 text-xs font-semibold text-[#477764]">
                  {notice.category}
                </span>
              </div>

              <h3 className="font-bold text-[#234E43]">
                {notice.title}
              </h3>

              <p className="mt-3 text-xs text-[#8A9F90]">
                {notice.date}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Footer */}
      <div className="flex flex-col justify-between gap-2 border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90] sm:flex-row">
        <p>UniBee Student Portal</p>
        <p>Learn. Connect. Bloom.</p>
      </div>
    </div>
  );
}

export default StudentDashboard;
