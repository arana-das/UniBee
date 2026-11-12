
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  MapPin,
  Clock3,
  Users,
  Search,
  Bookmark,
  BookmarkCheck,
  ArrowUpRight,
  X,
  CheckCircle2,
  Ticket,
  Sparkles,
  CalendarCheck,
  GraduationCap,
  Code2,
  Palette,
  Mic2,
  Trophy,
  HeartHandshake,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { getAuthToken } from "../services/authApi";

// ========================================
// API CONFIGURATION
// ========================================

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

// Events and registrations come from MongoDB.
// Saved events and club demo actions remain
// browser-local.

const SAVED_KEY = "unibee-student-saved-events-v2";

// ========================================
// EVENT CATEGORY STYLES
// ========================================

const EVENT_STYLES = {
  Academic: {
    icon: GraduationCap,
    color: "#EAF0F8",
  },
  Workshop: {
    icon: Code2,
    color: "#EAF2E8",
  },
  Seminar: {
    icon: Mic2,
    color: "#E8F3EF",
  },
  Cultural: {
    icon: Palette,
    color: "#FFF4DC",
  },
  Sports: {
    icon: Trophy,
    color: "#F3EAF5",
  },
  Career: {
    icon: Mic2,
    color: "#E8F3EF",
  },
  Competition: {
    icon: Trophy,
    color: "#F3EAF5",
  },
  Other: {
    icon: CalendarDays,
    color: "#F6EDE8",
  },
};

// ========================================
// CLUB DEMO
// Existing club cards are preserved.
// Club membership is NOT MongoDB-connected.
// ========================================

const clubs = [
  {
    id: 1,
    name: "ICT Club",
    category: "Technology",
    description:
      "Programming, technology projects, workshops, and competitions.",
    members: 320,
    icon: Code2,
  },
  {
    id: 2,
    name: "Research Society",
    category: "Academic",
    description:
      "Research discussions, academic publications, and innovation.",
    members: 145,
    icon: GraduationCap,
  },
  {
    id: 3,
    name: "Cultural Club",
    category: "Arts & Culture",
    description:
      "Music, art, drama, and cultural celebrations.",
    members: 270,
    icon: Palette,
  },
  {
    id: 4,
    name: "Sports Club",
    category: "Sports",
    description:
      "Sports training, tournaments, and recreational activities.",
    members: 225,
    icon: Trophy,
  },
  {
    id: 5,
    name: "Career Development Club",
    category: "Career",
    description:
      "Professional networking, career sessions, and skill building.",
    members: 180,
    icon: Mic2,
  },
  {
    id: 6,
    name: "Social Welfare Club",
    category: "Community",
    description:
      "Volunteer work, leadership, and community initiatives.",
    members: 125,
    icon: HeartHandshake,
  },
];

// ========================================
// HELPERS
// ========================================

function getId(item) {
  if (!item) return "";

  if (typeof item === "string") {
    return item;
  }

  return String(item._id || item.id || "");
}

function readSavedEvents() {
  try {
    const data = JSON.parse(
      localStorage.getItem(SAVED_KEY) || "[]"
    );

    return Array.isArray(data)
      ? data.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function formatDate(value) {
  if (!value) return "Not scheduled";

  const date = new Date(
    `${String(value).slice(0, 10)}T12:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "—";

  const [hours, minutes] = String(value)
    .split(":")
    .map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return value;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatDeadline(value) {
  if (!value) return "Until event starts";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getEventStart(event) {
  // Must match backend eventRoutes.js campus
  // timezone: Bangladesh UTC+06:00.
  return new Date(
    `${event.date}T${event.startTime}:00+06:00`
  );
}

function isUpcoming(event) {
  return getEventStart(event).getTime() > Date.now();
}

// ========================================
// AUTHENTICATED API REQUEST
// ========================================

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Your login session is unavailable. Please log in again."
    );
  }

  let response;

  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Cannot connect to the UniBee backend."
    );
  }

  const payload = await response
    .json()
    .catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.message ||
        `Request failed (${response.status}).`
    );
  }

  return payload;
}

// ========================================
// NORMALIZE EVENTS
// ========================================

function normalizeEvent(event) {
  const capacity = Number(event.capacity) || 0;
  const registered =
    Number(event.registrationCount) || 0;

  return {
    ...event,
    id: getId(event),
    date: String(event.date || "").slice(0, 10),
    location: event.venue || "Not specified",
    startTime: event.startTime || "00:00",
    endTime: event.endTime || "00:00",
    capacity,
    registered,
    availableSeats: Math.max(
      0,
      capacity - registered
    ),
    category: event.category || "Other",
    description: event.description || "",
    organizer: event.organizer || "University",
    registrationOpen:
      event.registrationOpen === true,
  };
}

// ========================================
// SUMMARY CARD
// ========================================

function SummaryCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
        <Icon size={24} />
      </div>

      <p className="text-sm text-[#718579]">
        {title}
      </p>

      <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
        {value}
      </h2>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function StudentEvents() {
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [busyEventId, setBusyEventId] =
    useState("");

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [activeTab, setActiveTab] =
    useState("explore");

  const [search, setSearch] = useState("");
  const [category, setCategory] =
    useState("All");

  const [savedIds, setSavedIds] =
    useState(readSavedEvents);

  const [joinedClubs, setJoinedClubs] =
    useState([]);

  const [selectedEventId, setSelectedEventId] =
    useState("");

  // ========================================
  // LOAD EVENTS AND MY REGISTRATIONS
  // ========================================

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      setError("");

      try {
        const [eventResponse, registrationResponse] =
          await Promise.all([
            apiRequest("/api/events"),
            apiRequest("/api/events/my-registrations"),
          ]);

        if (!Array.isArray(eventResponse.data)) {
          throw new Error(
            "Invalid events API response."
          );
        }

        if (
          !Array.isArray(registrationResponse.data)
        ) {
          throw new Error(
            "Invalid registrations API response."
          );
        }

        setEvents(
          eventResponse.data.map(normalizeEvent)
        );

        setRegistrations(
          registrationResponse.data
        );
      } catch (err) {
        setError(err.message);

        if (!silent) {
          setEvents([]);
          setRegistrations([]);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================
  // REGISTRATION STATE
  // ========================================

  const activeRegistrations = useMemo(
    () =>
      registrations.filter(
        (registration) =>
          registration.status === "Registered"
      ),
    [registrations]
  );

  const registeredIds = useMemo(
    () =>
      new Set(
        activeRegistrations.map(
          (registration) =>
            getId(registration.event)
        )
      ),
    [activeRegistrations]
  );

  const selectedEvent = events.find(
    (event) => event.id === selectedEventId
  ) || null;

  const selectedRegistration = selectedEvent
    ? activeRegistrations.find(
        (registration) =>
          getId(registration.event) ===
          selectedEvent.id
      )
    : null;

  // ========================================
  // EVENT FILTERING
  // ========================================

  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        events.map((event) => event.category)
      ),
    ],
    [events]
  );

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events
      .filter((event) => {
        const matchesSearch = [
          event.title,
          event.organizer,
          event.location,
          event.description,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

        const matchesCategory =
          category === "All" ||
          event.category === category;

        const matchesTab =
          activeTab === "explore" ||
          (activeTab === "saved" &&
            savedIds.includes(event.id)) ||
          (activeTab === "registered" &&
            registeredIds.has(event.id));

        return (
          matchesSearch &&
          matchesCategory &&
          matchesTab
        );
      })
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.startTime.localeCompare(b.startTime)
      );
  }, [
    events,
    activeTab,
    category,
    search,
    savedIds,
    registeredIds,
  ]);

  const upcomingCount = events.filter(
    (event) => isUpcoming(event)
  ).length;

  const summary = [
    {
      title: "Upcoming Events",
      value: upcomingCount,
      icon: CalendarDays,
    },
    {
      title: "My Registrations",
      value: activeRegistrations.length,
      icon: Ticket,
    },
    {
      title: "Saved Events",
      value: savedIds.length,
      icon: BookmarkCheck,
    },
    {
      title: "Student Clubs",
      value: clubs.length,
      icon: Users,
    },
  ];

  // ========================================
  // SAVE / UNSAVE EVENTS
  // ========================================

  function toggleSave(id) {
    setSavedIds((previous) => {
      const updated = previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id];

      try {
        localStorage.setItem(
          SAVED_KEY,
          JSON.stringify(updated)
        );
      } catch {
        // Saving is optional and browser-local.
      }

      return updated;
    });
  }

  // ========================================
  // REAL EVENT REGISTRATION
  // ========================================

  async function registerEvent(eventId) {
    if (!eventId || busyEventId) return;

    setBusyEventId(eventId);
    setError("");
    setFeedback("");

    try {
      const response = await apiRequest(
        `/api/events/${eventId}/register`,
        {
          method: "POST",
        }
      );

      setFeedback(
        response.message ||
          "Successfully registered for this event."
      );

      await loadData({ silent: true });
    } catch (err) {
      setError(err.message);
      await loadData({ silent: true });
    } finally {
      setBusyEventId("");
    }
  }

  // ========================================
  // CANCEL MY REGISTRATION
  // ========================================

  async function cancelRegistration(eventId) {
    if (!eventId || busyEventId) return;

    if (
      !window.confirm(
        "Are you sure you want to cancel your event registration?"
      )
    ) {
      return;
    }

    setBusyEventId(eventId);
    setError("");
    setFeedback("");

    try {
      const response = await apiRequest(
        `/api/events/${eventId}/register`,
        {
          method: "DELETE",
        }
      );

      setFeedback(
        response.message ||
          "Registration cancelled successfully."
      );

      await loadData({ silent: true });
    } catch (err) {
      setError(err.message);
      await loadData({ silent: true });
    } finally {
      setBusyEventId("");
    }
  }

  // ========================================
  // CLUB DEMO (PRESERVED)
  // ========================================

  function toggleClub(id) {
    setJoinedClubs((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id]
    );
  }

  // ========================================
  // REGISTER BUTTON STATUS
  // ========================================

  function getRegistrationLabel(event) {
    if (registeredIds.has(event.id)) {
      return "Registered";
    }

    if (!isUpcoming(event)) {
      return "Event Started / Ended";
    }

    if (
      event.availableSeats <= 0
    ) {
      return "Fully Booked";
    }

    if (!event.registrationOpen) {
      return "Registration Closed";
    }

    return "Register for Event";
  }

  // ========================================
  // UI
  // ========================================

  return (
    <div className="space-y-8">

      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            CAMPUS LIFE
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            Clubs & Events
          </h1>

          <p className="mt-3 text-[#718579]">
            Discover campus activities, register
            for university events and connect
            with your community.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          disabled={loading || !!busyEventId}
          className="inline-flex items-center gap-2 rounded-xl border border-[#DCE8DA] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-50"
        >
          <RefreshCw size={17} />
          Refresh Events
        </button>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 size={19} />
          {feedback}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle
            size={20}
            className="shrink-0"
          />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 rounded-xl bg-[#EAF2E8] p-4 text-sm text-[#234E43]">
          <Loader2
            size={18}
            className="animate-spin"
          />
          Loading university events...
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <SummaryCard
            key={item.title}
            {...item}
          />
        ))}
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-8 text-white md:p-10">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#DCE9DE]">
            <Sparkles
              size={17}
              className="text-[#D9A536]"
            />
            EXPLORE CAMPUS LIFE
          </span>

          <h2 className="mt-6 text-3xl font-extrabold md:text-4xl">
            Learn together.
            <span className="mt-1 block text-[#E8BE62]">
              Connect beyond classrooms.
            </span>
          </h2>

          <p className="mt-5 leading-relaxed text-[#C9DDCF]">
            From technical workshops to cultural
            festivals, UniBee brings your campus
            community together.
          </p>
        </div>
      </section>

      {/* MAIN TABS */}
      <div className="flex flex-wrap gap-3">
        {[
          {
            id: "explore",
            label: "Explore Events",
            icon: CalendarDays,
          },
          {
            id: "registered",
            label: "My Events",
            icon: Ticket,
          },
          {
            id: "saved",
            label: "Saved",
            icon: Bookmark,
          },
          {
            id: "clubs",
            label: "Student Clubs",
            icon: Users,
          },
        ].map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setError("");
              }}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-[#234E43] text-white"
                  : "border border-[#E2EADC] bg-white text-[#607B6C] hover:bg-[#F1F7EF]"
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* STUDENT CLUBS */}
      {activeTab === "clubs" ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Student Clubs are currently a frontend
            demonstration. Club joining is not yet
            connected to MongoDB.
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {clubs.map((club) => {
              const Icon = club.icon;
              const joined =
                joinedClubs.includes(club.id);

              return (
                <article
                  key={club.id}
                  className="flex flex-col rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF2E8] text-[#234E43]">
                    <Icon size={27} />
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider text-[#B18B37]">
                    {club.category}
                  </span>

                  <h3 className="mt-2 text-xl font-bold text-[#234E43]">
                    {club.name}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[#718579]">
                    {club.description}
                  </p>

                  <p className="mt-6 flex items-center gap-2 border-t border-[#EDF1EB] pt-4 text-sm text-[#607B6C]">
                    <Users size={17} />
                    {club.members} example members
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      toggleClub(club.id)
                    }
                    className={`mt-5 w-full rounded-xl px-5 py-3.5 font-bold ${
                      joined
                        ? "border border-[#DCE8DA] bg-[#EAF2E8] text-[#234E43]"
                        : "bg-[#234E43] text-white"
                    }`}
                  >
                    {joined
                      ? "Leave Club (Demo)"
                      : "Join Club (Demo)"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* SEARCH & FILTERS */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search events, organizers or locations..."
                  className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
                />
              </div>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                aria-label="Filter event category"
                className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
              >
                {categories.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item === "All"
                      ? "All Categories"
                      : item}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-4 text-sm text-[#718579]">
              Showing {filteredEvents.length} events
            </p>
          </section>

          {/* EVENT CARDS */}
          {filteredEvents.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event) => {
                const style =
                  EVENT_STYLES[event.category] ||
                  EVENT_STYLES.Other;

                const Icon = style.icon;
                const isSaved =
                  savedIds.includes(event.id);

                const isRegistered =
                  registeredIds.has(event.id);

                return (
                  <article
                    key={event.id}
                    className="flex flex-col overflow-hidden rounded-3xl border border-[#E2EADC] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    {/* COVER */}
                    <div
                      className="relative flex h-44 items-center justify-center overflow-hidden"
                      style={{
                        backgroundColor: style.color,
                      }}
                    >
                      <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full border-[30px] border-white/40" />

                      <Icon
                        size={62}
                        strokeWidth={1.4}
                        className="relative z-10 text-[#234E43]"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          toggleSave(event.id)
                        }
                        aria-label={
                          isSaved
                            ? "Remove saved event"
                            : "Save event"
                        }
                        aria-pressed={isSaved}
                        className="absolute right-4 top-4 rounded-xl bg-white p-2.5 text-[#234E43] shadow-sm"
                      >
                        {isSaved ? (
                          <BookmarkCheck size={19} />
                        ) : (
                          <Bookmark size={19} />
                        )}
                      </button>
                    </div>

                    {/* CARD CONTENT */}
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-[#EAF2E8] px-3 py-1.5 text-xs font-bold text-[#477764]">
                          {event.category}
                        </span>

                        {isRegistered ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#427A67]">
                            <CheckCircle2 size={15} />
                            Registered
                          </span>
                        ) : !isUpcoming(event) ? (
                          <span className="text-xs font-bold text-[#8A9F90]">
                            Past Event
                          </span>
                        ) : event.availableSeats <= 0 ? (
                          <span className="text-xs font-bold text-red-700">
                            Fully Booked
                          </span>
                        ) : !event.registrationOpen ? (
                          <span className="text-xs font-bold text-amber-700">
                            Registration Closed
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-5 text-xl font-bold text-[#234E43]">
                        {event.title}
                      </h3>

                      <p className="mt-2 text-sm text-[#718579]">
                        Organized by {event.organizer}
                      </p>

                      <div className="mt-6 space-y-3 text-sm text-[#607B6C]">
                        <p className="flex items-center gap-2">
                          <CalendarDays size={17} />
                          {formatDate(event.date)}
                        </p>

                        <p className="flex items-center gap-2">
                          <Clock3 size={17} />
                          {formatTime(event.startTime)}
                          {" – "}
                          {formatTime(event.endTime)}
                        </p>

                        <p className="flex items-center gap-2">
                          <MapPin size={17} />
                          {event.location}
                        </p>

                        <p className="flex items-center gap-2">
                          <Users size={17} />
                          {event.registered}/{event.capacity}
                          {" "}registered
                        </p>

                        <p className="flex items-center gap-2">
                          <Ticket size={17} />
                          {event.availableSeats} seats available
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEventId(event.id);
                          setFeedback("");
                          setError("");
                        }}
                        className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657]"
                      >
                        View Event Details
                        <ArrowUpRight size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-[#E2EADC] bg-white p-12 text-center">
              <CalendarDays
                size={42}
                className="mx-auto text-[#A6C1A4]"
              />

              <h3 className="mt-4 text-xl font-bold text-[#234E43]">
                {activeTab === "registered"
                  ? "No Registered Events"
                  : activeTab === "saved"
                    ? "No Saved Events"
                    : "No Events Found"}
              </h3>

              <p className="mt-2 text-[#718579]">
                {activeTab === "registered"
                  ? "Events you register for will appear here."
                  : "Try another category or search."}
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                  setActiveTab("explore");
                }}
                className="mt-5 rounded-xl bg-[#234E43] px-6 py-3 font-bold text-white"
              >
                Explore Events
              </button>
            </div>
          )}
        </>
      )}

      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedEventId("");
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-event-modal-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
          >
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  {selectedEvent.category.toUpperCase()}
                  {" "}EVENT
                </p>

                <h2
                  id="student-event-modal-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {selectedEvent.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedEventId("")
                }
                aria-label="Close event details"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            {/* EVENT DETAILS */}
            <div className="mt-6 grid gap-4 rounded-2xl bg-[#F6F8F3] p-5 text-sm text-[#45685B] sm:grid-cols-2">
              <p>
                <strong>Date:</strong>{" "}
                {formatDate(selectedEvent.date)}
              </p>

              <p>
                <strong>Time:</strong>{" "}
                {formatTime(selectedEvent.startTime)}
                {" – "}
                {formatTime(selectedEvent.endTime)}
              </p>

              <p>
                <strong>Venue:</strong>{" "}
                {selectedEvent.location}
              </p>

              <p>
                <strong>Organizer:</strong>{" "}
                {selectedEvent.organizer}
              </p>

              <p>
                <strong>Available Seats:</strong>{" "}
                {selectedEvent.availableSeats}
              </p>

              <p>
                <strong>Capacity:</strong>{" "}
                {selectedEvent.capacity}
              </p>

              <p className="sm:col-span-2">
                <strong>Registration Deadline:</strong>{" "}
                {formatDeadline(
                  selectedEvent.registrationDeadline
                )}
              </p>
            </div>

            {/* DESCRIPTION */}
            <h3 className="mt-7 font-bold text-[#234E43]">
              About This Event
            </h3>

            <p className="mt-3 whitespace-pre-line leading-relaxed text-[#718579]">
              {selectedEvent.description ||
                "No event description was provided."}
            </p>

            {/* REGISTRATION STATUS */}
            {selectedRegistration && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="flex items-center gap-2 font-bold text-emerald-700">
                  <CheckCircle2 size={19} />
                  Registration Confirmed
                </p>

                <p className="mt-2 text-sm text-emerald-800">
                  You are registered for this event.
                </p>
              </div>
            )}

            {/* MODAL FEEDBACK */}
            {feedback && (
              <p
                role="status"
                className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
              >
                {feedback}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
              >
                {error}
              </p>
            )}

            {/* REGISTRATION ACTION */}
            {selectedRegistration ? (
              <button
                type="button"
                disabled={
                  !!busyEventId ||
                  !isUpcoming(selectedEvent)
                }
                onClick={() =>
                  cancelRegistration(
                    selectedEvent.id
                  )
                }
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3.5 font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyEventId === selectedEvent.id ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <X size={18} />
                )}

                {!isUpcoming(selectedEvent)
                  ? "Event Already Started"
                  : "Cancel My Registration"}
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  !!busyEventId ||
                  !selectedEvent.registrationOpen
                }
                onClick={() =>
                  registerEvent(
                    selectedEvent.id
                  )
                }
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyEventId === selectedEvent.id ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Ticket size={18} />
                )}

                {busyEventId === selectedEvent.id
                  ? "Processing..."
                  : getRegistrationLabel(selectedEvent)}
              </button>
            )}
          </section>
        </div>
      )}

      {/* FOOTER */}
      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Clubs & Events
      </div>
    </div>
  );
}
