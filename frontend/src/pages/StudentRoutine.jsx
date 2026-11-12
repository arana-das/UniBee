
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import {
  CalendarDays,
  Clock3,
  MapPin,
  UserRound,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CalendarCheck2,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Building2,
} from "lucide-react";

import { getAuthToken } from "../services/authApi";

// ========================================
// UNIBEE STUDENT CLASS ROUTINE
// REAL MONGODB INTEGRATION
// ========================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const API_URL =
  `${API_BASE}/api/class-schedules/student/my`;

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// University local timezone.
const UNIVERSITY_TIMEZONE = "Asia/Dhaka";

// ========================================
// HELPERS
// ========================================

function getToday() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: UNIVERSITY_TIMEZONE,
  }).format(new Date());
}

function formatTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value || "")) {
    return value || "—";
  }

  const [hours, minutes] = value
    .split(":")
    .map(Number);

  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${String(displayHour).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(2, "0")} ${period}`;
}

function minutes(time) {
  if (!/^\d{2}:\d{2}$/.test(time || "")) {
    return 0;
  }

  const [hours, mins] = time
    .split(":")
    .map(Number);

  return hours * 60 + mins;
}

function getWeeklyHours(records) {
  const totalMinutes = records.reduce(
    (total, item) =>
      total +
      Math.max(
        0,
        minutes(item.endTime) -
          minutes(item.startTime)
      ),
    0
  );

  return (totalMinutes / 60).toFixed(1);
}

// ========================================
// BACKEND REQUEST
// ========================================

async function fetchRoutine(signal) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to your Student account."
    );
  }

  let response;

  try {
    response = await fetch(API_URL, {
      method: "GET",
      signal,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Unable to connect to UniBee backend."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !result ||
    result.success !== true
  ) {
    throw new Error(
      result?.message ||
        `Unable to load routine (${response.status}).`
    );
  }

  if (!Array.isArray(result.data)) {
    throw new Error(
      "Invalid class routine data received."
    );
  }

  return result.data;
}

// ========================================
// SUMMARY CARD
// ========================================

function SummaryCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
        <Icon size={24} />
      </div>

      <p className="text-sm text-[#718579]">
        {label}
      </p>

      <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
        {value}
      </h2>
    </div>
  );
}

// ========================================
// CLASS CARD
// ========================================

function ClassCard({ item }) {
  return (
    <article className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-[#EAF2E8] px-3 py-1.5 text-xs font-bold text-[#477764]">
          {item.courseCode || "Course"}
        </span>

        <span className="rounded-full bg-[#FFF4DC] px-3 py-1.5 text-xs font-bold text-[#A57921]">
          Scheduled
        </span>
      </div>

      <h3 className="text-lg font-bold text-[#234E43]">
        {item.courseTitle || "Untitled Course"}
      </h3>

      {item.semester && (
        <p className="mt-2 text-xs text-[#718579]">
          {item.semester}
          {item.academicSession
            ? ` · ${item.academicSession}`
            : ""}
        </p>
      )}

      <div className="mt-5 space-y-3 text-sm text-[#607B6C]">
        <p className="flex items-center gap-3">
          <Clock3
            size={17}
            className="shrink-0 text-[#477764]"
          />
          {formatTime(item.startTime)}
          {" – "}
          {formatTime(item.endTime)}
        </p>

        <p className="flex items-center gap-3">
          <MapPin
            size={17}
            className="shrink-0 text-[#477764]"
          />
          {item.room || "Room not assigned"}
        </p>

        <p className="flex items-center gap-3">
          <UserRound
            size={17}
            className="shrink-0 text-[#477764]"
          />
          {item.facultyName ||
            "Faculty not assigned"}
        </p>

        {item.department && (
          <p className="flex items-center gap-3">
            <Building2
              size={17}
              className="shrink-0 text-[#477764]"
            />
            {item.department}
          </p>
        )}
      </div>

      {item.notes && (
        <p className="mt-4 whitespace-pre-wrap break-words border-t border-[#E2EADC] pt-3 text-xs leading-5 text-[#718579]">
          {item.notes}
        </p>
      )}
    </article>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function StudentRoutine() {
  const [schedule, setSchedule] = useState([]);
  const [today] = useState(getToday);

  const [selectedDay, setSelectedDay] =
    useState(getToday);

  const [view, setView] = useState("weekly");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  // ========================================
  // LOAD MONGODB CLASS ROUTINE
  // ========================================

  const refresh = useCallback(() => {
    setRefreshKey((previous) => previous + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoutine() {
      setLoading(true);
      setError("");

      try {
        const records = await fetchRoutine(
          controller.signal
        );

        if (controller.signal.aborted) {
          return;
        }

        setSchedule(
          records
            .filter(
              (item) =>
                item &&
                item.status === "Active" &&
                DAYS.includes(item.day)
            )
            .sort(
              (a, b) =>
                DAYS.indexOf(a.day) -
                  DAYS.indexOf(b.day) ||
                String(a.startTime).localeCompare(
                  String(b.startTime)
                )
            )
        );
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setSchedule([]);
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRoutine();

    return () => controller.abort();
  }, [refreshKey]);

  // ========================================
  // STATISTICS
  // ========================================

  const totalWeeklyClasses = schedule.length;

  const uniqueCourses = new Set(
    schedule.map((item) => item.courseId)
  ).size;

  const teachingDays = new Set(
    schedule.map((item) => item.day)
  ).size;

  const weeklyHours = useMemo(
    () => getWeeklyHours(schedule),
    [schedule]
  );

  const todayClasses = schedule.filter(
    (item) => item.day === today
  ).length;

  const dailyClasses = useMemo(
    () =>
      schedule
        .filter(
          (item) => item.day === selectedDay
        )
        .sort((a, b) =>
          String(a.startTime).localeCompare(
            String(b.startTime)
          )
        ),
    [schedule, selectedDay]
  );

  // ========================================
  // DAY NAVIGATION
  // ========================================

  function changeDay(direction) {
    const index = DAYS.indexOf(selectedDay);

    const nextIndex =
      (index + direction + DAYS.length) %
      DAYS.length;

    setSelectedDay(DAYS[nextIndex]);
  }

  // ========================================
  // UI
  // ========================================

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            STUDENT ACADEMICS
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            Class Routine
          </h1>

          <p className="mt-3 text-[#718579]">
            View your enrolled courses and
            official weekly class schedule.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-full border border-[#DCE8DA] bg-white px-4 py-2 text-sm font-semibold text-[#45685B] disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>

          <div className="flex items-center gap-2 rounded-full border border-[#DCE8DA] bg-white px-4 py-2 text-sm font-semibold text-[#45685B]">
            <CalendarCheck2
              size={18}
              className="text-[#B78B28]"
            />
            Academic Timetable
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertTriangle
            size={19}
            className="shrink-0"
          />
          {error}
        </div>
      )}

      {/* STATISTICS */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Weekly Classes"
          value={
            loading ? "..." : totalWeeklyClasses
          }
          icon={CalendarDays}
        />

        <SummaryCard
          label="Active Courses"
          value={
            loading ? "..." : uniqueCourses
          }
          icon={BookOpen}
        />

        <SummaryCard
          label="Teaching Days"
          value={
            loading ? "..." : teachingDays
          }
          icon={CalendarCheck2}
        />

        <SummaryCard
          label="Weekly Hours"
          value={
            loading ? "..." : weeklyHours
          }
          icon={Clock3}
        />
      </div>

      {/* MAIN SCHEDULE */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              Weekly Class Schedule
            </h2>

            <p className="mt-1 text-sm text-[#718579]">
              Switch between weekly and daily views.
              You have {todayClasses} classes
              scheduled for today.
            </p>
          </div>

          <div className="flex rounded-xl bg-[#F1F7EF] p-1">
            {["weekly", "daily"].map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setView(option)}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold capitalize transition ${
                    view === option
                      ? "bg-[#234E43] text-white shadow-sm"
                      : "text-[#607B6C] hover:bg-white"
                  }`}
                >
                  {option} View
                </button>
              )
            )}
          </div>
        </div>

        {/* DAY SELECTION */}
        <div className="mb-7 flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
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

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-[#718579]">
            <Loader2
              size={21}
              className="animate-spin"
            />
            Loading class routine from MongoDB...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-50 px-5 py-10 text-center text-sm text-rose-700">
            Class routine could not be loaded.
            Please retry using Refresh.
          </div>
        ) : view === "daily" ? (
          <div>
            {/* DAILY HEADER */}
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-[#F6F8F3] px-5 py-4">
              <button
                type="button"
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
                type="button"
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
                  <ClassCard
                    key={item.id}
                    item={item}
                  />
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
                  No classes are assigned for this day.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* WEEKLY VIEW */
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {DAYS.map((day) => {
              const classes = schedule.filter(
                (item) => item.day === day
              );

              return (
                <div
                  key={day}
                  className={`rounded-2xl border p-4 ${
                    day === today
                      ? "border-[#D9A536] bg-[#FFFDF5]"
                      : "border-[#E2EADC] bg-[#F9FBF8]"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-[#234E43]">
                      {day}
                    </h3>

                    {day === today && (
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
                            {item.courseCode || "Course"}
                          </p>

                          <h4 className="mt-2 text-sm font-bold text-[#234E43]">
                            {item.courseTitle}
                          </h4>

                          <p className="mt-3 flex items-center gap-2 text-xs text-[#718579]">
                            <Clock3 size={14} />
                            {formatTime(item.startTime)}
                            {" – "}
                            {formatTime(item.endTime)}
                          </p>

                          <p className="mt-2 flex items-center gap-2 text-xs text-[#718579]">
                            <MapPin size={14} />
                            {item.room || "Room unavailable"}
                          </p>

                          <p className="mt-2 flex items-center gap-2 text-xs text-[#718579]">
                            <UserRound size={14} />
                            {item.facultyName ||
                              "Faculty unavailable"}
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

      {/* INFORMATION BANNER */}
      <div className="rounded-2xl bg-[#234E43] p-6 text-white">
        <div className="flex items-start gap-4">
          <CalendarCheck2
            size={27}
            className="shrink-0 text-[#D9A536]"
          />

          <div>
            <h3 className="text-lg font-bold">
              Your Official Class Routine
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-[#C9DDCF]">
              This schedule is managed by your
              Head of Department and shows
              common classes for your approved
              course enrollments. For any missing
              or incorrect class, contact your
              department.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — MongoDB Class Routine
      </div>
    </div>
  );
}
