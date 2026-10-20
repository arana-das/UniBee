
import { useState } from "react";
import {
  CalendarDays,
  Clock3,
  MapPin,
  UserRound,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CalendarCheck2,
  GraduationCap,
} from "lucide-react";

const days = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// Sample schedule. Real records will come from MongoDB.
const schedule = [
  {
    id: 1,
    day: "Sunday",
    course: "Web Technologies",
    code: "ICT 3201",
    instructor: "Dr. Sarah Ahmed",
    start: "09:00",
    end: "10:30",
    room: "Room 302",
    type: "Lecture",
  },
  {
    id: 2,
    day: "Sunday",
    course: "Database Management Systems",
    code: "ICT 3203",
    instructor: "Md. Rahim Hasan",
    start: "11:00",
    end: "12:30",
    room: "Lab 204",
    type: "Lab",
  },
  {
    id: 3,
    day: "Monday",
    course: "Computer Networks",
    code: "ICT 3205",
    instructor: "Dr. Nusrat Jahan",
    start: "09:00",
    end: "10:30",
    room: "Room 405",
    type: "Lecture",
  },
  {
    id: 4,
    day: "Monday",
    course: "Software Engineering",
    code: "ICT 3207",
    instructor: "Dr. Farhan Kabir",
    start: "11:00",
    end: "12:30",
    room: "Room 301",
    type: "Lecture",
  },
  {
    id: 5,
    day: "Tuesday",
    course: "Web Technologies",
    code: "ICT 3201",
    instructor: "Dr. Sarah Ahmed",
    start: "10:00",
    end: "12:00",
    room: "Computer Lab 2",
    type: "Lab",
  },
  {
    id: 6,
    day: "Tuesday",
    course: "Information Security",
    code: "ICT 3211",
    instructor: "Md. Arif Hossain",
    start: "13:00",
    end: "14:30",
    room: "Room 303",
    type: "Lecture",
  },
  {
    id: 7,
    day: "Wednesday",
    course: "Artificial Intelligence",
    code: "ICT 3209",
    instructor: "Dr. Ayesha Rahman",
    start: "09:00",
    end: "10:30",
    room: "Room 404",
    type: "Lecture",
  },
  {
    id: 8,
    day: "Wednesday",
    course: "Database Management Systems",
    code: "ICT 3203",
    instructor: "Md. Rahim Hasan",
    start: "11:00",
    end: "12:30",
    room: "Room 302",
    type: "Lecture",
  },
  {
    id: 9,
    day: "Thursday",
    course: "Computer Networks",
    code: "ICT 3205",
    instructor: "Dr. Nusrat Jahan",
    start: "09:00",
    end: "11:00",
    room: "Networking Lab",
    type: "Lab",
  },
  {
    id: 10,
    day: "Thursday",
    course: "Software Engineering",
    code: "ICT 3207",
    instructor: "Dr. Farhan Kabir",
    start: "12:00",
    end: "13:30",
    room: "Room 305",
    type: "Lecture",
  },
];

const formatTime = (time) => {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
};

function StudentRoutine() {
  const currentDay = new Date().toLocaleDateString("en-US", {
    weekday: "long",
  });

  const [selectedDay, setSelectedDay] = useState(currentDay);
  const [view, setView] = useState("weekly");

  const dailyClasses = schedule
    .filter((item) => item.day === selectedDay)
    .sort((a, b) => a.start.localeCompare(b.start));

  const totalWeeklyClasses = schedule.length;
  const uniqueCourses = new Set(schedule.map((item) => item.code)).size;
  const lectureCount = schedule.filter(
    (item) => item.type === "Lecture"
  ).length;
  const labCount = schedule.filter(
    (item) => item.type === "Lab"
  ).length;

  const changeDay = (direction) => {
    const currentIndex = days.indexOf(selectedDay);
    const nextIndex =
      (currentIndex + direction + days.length) % days.length;
    setSelectedDay(days[nextIndex]);
  };

  const ClassCard = ({ item }) => (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-[#EAF2E8] px-3 py-1.5 text-xs font-bold text-[#477764]">
          {item.code}
        </span>

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            item.type === "Lab"
              ? "bg-[#FFF4DC] text-[#A57921]"
              : "bg-[#EAF2E8] text-[#477764]"
          }`}
        >
          {item.type}
        </span>
      </div>

      <h3 className="text-lg font-bold text-[#234E43]">
        {item.course}
      </h3>

      <div className="mt-5 space-y-3 text-sm text-[#607B6C]">
        <p className="flex items-center gap-3">
          <Clock3 size={17} className="text-[#477764]" />
          {formatTime(item.start)} – {formatTime(item.end)}
        </p>

        <p className="flex items-center gap-3">
          <MapPin size={17} className="text-[#477764]" />
          {item.room}
        </p>

        <p className="flex items-center gap-3">
          <UserRound size={17} className="text-[#477764]" />
          {item.instructor}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            STUDENT ACADEMICS
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            Class Routine
          </h1>

          <p className="mt-3 text-[#718579]">
            Organize your week and stay updated with your academic schedule.
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full border border-[#DCE8DA] bg-white px-4 py-2 text-sm font-semibold text-[#45685B]">
          <CalendarCheck2 size={18} className="text-[#B78B28]" />
          Academic Timetable
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Weekly Classes",
            value: totalWeeklyClasses,
            icon: CalendarDays,
          },
          {
            label: "Active Courses",
            value: uniqueCourses,
            icon: BookOpen,
          },
          {
            label: "Lectures",
            value: lectureCount,
            icon: GraduationCap,
          },
          {
            label: "Lab Sessions",
            value: labCount,
            icon: CalendarCheck2,
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={24} />
              </div>

              <p className="text-sm text-[#718579]">{stat.label}</p>

              <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
                {stat.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Main Schedule */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              Weekly Class Schedule
            </h2>
            <p className="mt-1 text-sm text-[#718579]">
              Switch between weekly and daily views
            </p>
          </div>

          <div className="flex rounded-xl bg-[#F1F7EF] p-1">
            {["weekly", "daily"].map((option) => (
              <button
                key={option}
                onClick={() => setView(option)}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold capitalize transition ${
                  view === option
                    ? "bg-[#234E43] text-white shadow-sm"
                    : "text-[#607B6C] hover:bg-white"
                }`}
              >
                {option} View
              </button>
            ))}
          </div>
        </div>

        {/* Day Selection */}
        <div className="mb-7 flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => {
                setSelectedDay(day);
                setView("daily");
              }}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                selectedDay === day
                  ? "bg-[#234E43] text-white"
                  : "border border-[#E2EADC] bg-[#F9FBF8] text-[#607B6C] hover:border-[#A6C1A4]"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {view === "daily" ? (
          <div>
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-[#F6F8F3] px-5 py-4">
              <button
                onClick={() => changeDay(-1)}
                aria-label="Previous day"
                className="rounded-lg bg-white p-2 text-[#234E43]"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="text-center">
                <h3 className="text-lg font-bold text-[#234E43]">
                  {selectedDay}
                </h3>
                <p className="text-xs text-[#718579]">
                  {dailyClasses.length} scheduled classes
                </p>
              </div>

              <button
                onClick={() => changeDay(1)}
                aria-label="Next day"
                className="rounded-lg bg-white p-2 text-[#234E43]"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {dailyClasses.length ? (
              <div className="grid gap-5 md:grid-cols-2">
                {dailyClasses.map((item) => (
                  <ClassCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-[#F9FBF8] py-14 text-center">
                <CalendarDays
                  size={38}
                  className="mx-auto text-[#A6C1A4]"
                />
                <h3 className="mt-4 text-lg font-bold text-[#234E43]">
                  No Classes Scheduled
                </h3>
                <p className="mt-2 text-sm text-[#718579]">
                  Enjoy your free time and prepare for upcoming classes.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {days.map((day) => {
              const classes = schedule
                .filter((item) => item.day === day)
                .sort((a, b) => a.start.localeCompare(b.start));

              return (
                <div
                  key={day}
                  className={`rounded-2xl border p-4 ${
                    day === currentDay
                      ? "border-[#D9A536] bg-[#FFFDF5]"
                      : "border-[#E2EADC] bg-[#F9FBF8]"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-[#234E43]">{day}</h3>
                    {day === currentDay && (
                      <span className="rounded-full bg-[#FFF1D0] px-3 py-1 text-xs font-bold text-[#A57921]">
                        Today
                      </span>
                    )}
                  </div>

                  {classes.length ? (
                    <div className="space-y-3">
                      {classes.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-[#E2EADC] bg-white p-4"
                        >
                          <p className="text-xs font-bold text-[#B18B37]">
                            {item.code}
                          </p>
                          <h4 className="mt-2 text-sm font-bold text-[#234E43]">
                            {item.course}
                          </h4>
                          <p className="mt-3 flex items-center gap-2 text-xs text-[#718579]">
                            <Clock3 size={14} />
                            {formatTime(item.start)} – {formatTime(item.end)}
                          </p>
                          <p className="mt-2 flex items-center gap-2 text-xs text-[#718579]">
                            <MapPin size={14} />
                            {item.room}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-white p-4 text-sm text-[#8A9F90]">
                      No classes scheduled
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Information Banner */}
      <div className="rounded-2xl bg-[#234E43] p-6 text-white">
        <div className="flex items-start gap-4">
          <CalendarCheck2
            size={27}
            className="shrink-0 text-[#D9A536]"
          />
          <div>
            <h3 className="text-lg font-bold">
              Stay on top of your schedule.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#C9DDCF]">
              Class routines are currently displayed using demonstration
              data. Your department's official timetable will be available
              after academic management integration.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Class Routine
      </div>
    </div>
  );
}

export default StudentRoutine;
