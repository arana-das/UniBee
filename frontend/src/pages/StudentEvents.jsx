
import { useMemo, useState } from "react";
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
} from "lucide-react";

// Frontend demonstration data.
// Events and registrations will later come from MongoDB.

const events = [
  {
    id: 1,
    title: "University Tech Carnival 2026",
    category: "Technology",
    date: "2026-11-05",
    time: "10:00 AM",
    location: "University Auditorium",
    organizer: "ICT Club",
    capacity: 250,
    registered: 178,
    description:
      "Join an exciting technology carnival featuring project exhibitions, programming contests, robotics demonstrations, and innovation showcases.",
    highlights: [
      "Project exhibitions",
      "Programming contests",
      "Networking opportunities",
    ],
    icon: Code2,
    color: "#EAF2E8",
  },
  {
    id: 2,
    title: "Research & Innovation Workshop",
    category: "Academic",
    date: "2026-11-12",
    time: "11:00 AM",
    location: "Seminar Hall",
    organizer: "Research Society",
    capacity: 100,
    registered: 65,
    description:
      "An interactive workshop introducing research methodologies, academic writing, literature reviews, and innovative project development.",
    highlights: [
      "Research methodology",
      "Academic writing",
      "Faculty mentoring",
    ],
    icon: GraduationCap,
    color: "#EAF0F8",
  },
  {
    id: 3,
    title: "Campus Cultural Festival",
    category: "Cultural",
    date: "2026-11-18",
    time: "03:00 PM",
    location: "Central Field",
    organizer: "Cultural Club",
    capacity: 500,
    registered: 320,
    description:
      "Celebrate creativity and cultural diversity through music, dance, drama, art exhibitions, and student performances.",
    highlights: [
      "Live performances",
      "Art exhibitions",
      "Cultural activities",
    ],
    icon: Palette,
    color: "#FFF4DC",
  },
  {
    id: 4,
    title: "Interdepartmental Sports Meet",
    category: "Sports",
    date: "2026-11-25",
    time: "09:00 AM",
    location: "University Sports Ground",
    organizer: "Sports Club",
    capacity: 300,
    registered: 215,
    description:
      "Participate in friendly competitions and support your department in various sporting activities.",
    highlights: [
      "Team competitions",
      "Individual events",
      "Award ceremony",
    ],
    icon: Trophy,
    color: "#F3EAF5",
  },
  {
    id: 5,
    title: "Career Talks & Alumni Meetup",
    category: "Career",
    date: "2026-12-02",
    time: "02:00 PM",
    location: "Conference Room",
    organizer: "Career Development Club",
    capacity: 150,
    registered: 95,
    description:
      "Meet university alumni, explore industry insights, and learn how to prepare for internships and professional careers.",
    highlights: [
      "Alumni networking",
      "Career guidance",
      "Industry insights",
    ],
    icon: Mic2,
    color: "#E8F3EF",
  },
  {
    id: 6,
    title: "Community Volunteer Day",
    category: "Community",
    date: "2026-12-10",
    time: "08:30 AM",
    location: "University Main Gate",
    organizer: "Social Welfare Club",
    capacity: 80,
    registered: 42,
    description:
      "Collaborate with fellow students in community service and social development activities.",
    highlights: [
      "Volunteer activities",
      "Community engagement",
      "Team collaboration",
    ],
    icon: HeartHandshake,
    color: "#F6EDE8",
  },
];

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

const categories = [
  "All",
  "Technology",
  "Academic",
  "Cultural",
  "Sports",
  "Career",
  "Community",
];

const formatDate = (date) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function StudentEvents() {
  const [activeTab, setActiveTab] = useState("explore");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [savedIds, setSavedIds] = useState([]);
  const [registeredIds, setRegisteredIds] = useState([]);
  const [joinedClubs, setJoinedClubs] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [message, setMessage] = useState("");

  const today = new Date().toLocaleDateString("en-CA");

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events
      .filter((event) => {
        const matchesSearch =
          event.title.toLowerCase().includes(query) ||
          event.organizer.toLowerCase().includes(query) ||
          event.location.toLowerCase().includes(query);

        const matchesCategory =
          category === "All" || event.category === category;

        const matchesTab =
          activeTab === "explore" ||
          (activeTab === "saved" && savedIds.includes(event.id)) ||
          (activeTab === "registered" &&
            registeredIds.includes(event.id));

        return matchesSearch && matchesCategory && matchesTab;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [search, category, activeTab, savedIds, registeredIds]);

  const upcomingCount = events.filter(
    (event) => event.date >= today
  ).length;

  const toggleSave = (id) => {
    setSavedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const registerEvent = () => {
    if (!selectedEvent) return;

    if (selectedEvent.date < today) {
      setMessage("Registration is closed because this event has passed.");
      return;
    }

    if (selectedEvent.registered >= selectedEvent.capacity) {
      setMessage("This event is fully booked.");
      return;
    }

    if (registeredIds.includes(selectedEvent.id)) {
      setMessage("You have already registered for this demo event.");
      return;
    }

    setRegisteredIds((previous) => [...previous, selectedEvent.id]);

    setMessage(
      "Demo registration recorded in this page only. No real event registration has been submitted."
    );
  };

  const cancelRegistration = () => {
    if (!selectedEvent) return;

    setRegisteredIds((previous) =>
      previous.filter((id) => id !== selectedEvent.id)
    );

    setMessage("Demo registration cancelled.");
  };

  const toggleClub = (id) => {
    setJoinedClubs((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const summary = [
    {
      title: "Upcoming Events",
      value: upcomingCount,
      icon: CalendarDays,
    },
    {
      title: "My Registrations",
      value: registeredIds.length,
      icon: Ticket,
    },
    {
      title: "Saved Events",
      value: savedIds.length,
      icon: BookmarkCheck,
    },
    {
      title: "Joined Clubs",
      value: joinedClubs.length,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
          CAMPUS LIFE
        </p>

        <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
          Clubs & Events
        </h1>

        <p className="mt-3 text-[#718579]">
          Discover campus activities, connect with communities,
          and make the most of university life.
        </p>
      </div>

      {/* Summary Cards */}
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

              <p className="text-sm text-[#718579]">
                {item.title}
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
                {item.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-8 text-white md:p-10">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#DCE9DE]">
            <Sparkles size={17} className="text-[#D9A536]" />
            EXPLORE CAMPUS LIFE
          </span>

          <h2 className="mt-6 text-3xl font-extrabold md:text-4xl">
            Learn together.
            <br />
            <span className="text-[#E8BE62]">
              Connect beyond classrooms.
            </span>
          </h2>

          <p className="mt-5 leading-relaxed text-[#C9DDCF]">
            From technical workshops to cultural festivals,
            UniBee brings your campus community together.
          </p>
        </div>
      </section>

      {/* Main Tabs */}
      <div className="flex flex-wrap gap-3">
        {[
          { id: "explore", label: "Explore Events", icon: CalendarDays },
          { id: "registered", label: "My Events", icon: Ticket },
          { id: "saved", label: "Saved", icon: Bookmark },
          { id: "clubs", label: "Student Clubs", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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

      {activeTab === "clubs" ? (
        /* Student Clubs */
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {clubs.map((club) => {
            const Icon = club.icon;
            const joined = joinedClubs.includes(club.id);

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

                <div className="mt-6 flex items-center gap-2 border-t border-[#EDF1EB] pt-4 text-sm text-[#607B6C]">
                  <Users size={17} />
                  {club.members.toLocaleString()}{joined ? " + you (demo)" : ""} members
                </div>

                <button
                  type="button"
                  onClick={() => toggleClub(club.id)}
                  className={`mt-5 w-full rounded-xl px-5 py-3.5 font-bold transition ${
                    joined
                      ? "border border-[#DCE8DA] bg-[#EAF2E8] text-[#234E43]"
                      : "bg-[#234E43] text-white hover:bg-[#326657]"
                  }`}
                >
                  {joined ? "Leave Club (Demo)" : "Join Club (Demo)"}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <>
          {/* Event Search and Filters */}
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
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search events, organizers, or locations..."
                  className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
                />
              </div>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter events by category"
                className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item === "All" ? "All Categories" : item}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-4 text-sm text-[#718579]">
              Showing {filteredEvents.length} events
            </p>
          </section>

          {/* Event Cards */}
          {filteredEvents.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event) => {
                const Icon = event.icon;
                const isSaved = savedIds.includes(event.id);
                const isRegistered = registeredIds.includes(event.id);
                const isPast = event.date < today;
                const isFull = event.registered >= event.capacity;

                return (
                  <article
                    key={event.id}
                    className="flex flex-col overflow-hidden rounded-3xl border border-[#E2EADC] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#234E43]/10"
                  >
                    {/* Event Cover */}
                    <div
                      className="relative flex h-44 items-center justify-center overflow-hidden"
                      style={{ backgroundColor: event.color }}
                    >
                      <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full border-[30px] border-white/40" />

                      <Icon
                        size={62}
                        strokeWidth={1.4}
                        className="relative z-10 text-[#234E43]"
                      />

                      <button
                        type="button"
                        onClick={() => toggleSave(event.id)}
                        aria-label={isSaved ? "Remove saved event" : "Save event"}
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

                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-[#EAF2E8] px-3 py-1.5 text-xs font-bold text-[#477764]">
                          {event.category}
                        </span>

                        {isRegistered ? (
                          <span className="text-xs font-bold text-[#427A67]">
                            Registered (Demo)
                          </span>
                        ) : isPast ? (
                          <span className="text-xs font-bold text-[#8A9F90]">
                            Past Event
                          </span>
                        ) : isFull ? (
                          <span className="text-xs font-bold text-red-700">
                            Fully Booked
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
                          {event.time}
                        </p>

                        <p className="flex items-center gap-2">
                          <MapPin size={17} />
                          {event.location}
                        </p>

                        <p className="flex items-center gap-2">
                          <Users size={17} />
                          {event.registered + Number(isRegistered)}/{event.capacity} registered
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event);
                          setMessage("");
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
                No Events Found
              </h3>

              <p className="mt-2 text-[#718579]">
                Try another category or search.
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
                Clear Filters
              </button>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  {selectedEvent.category.toUpperCase()} EVENT
                </p>

                <h2
                  id="event-modal-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {selectedEvent.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                aria-label="Close event details"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-[#F6F8F3] p-5 text-sm text-[#45685B] sm:grid-cols-2">
              <p>
                <strong>Date:</strong> {formatDate(selectedEvent.date)}
              </p>

              <p>
                <strong>Time:</strong> {selectedEvent.time}
              </p>

              <p>
                <strong>Location:</strong> {selectedEvent.location}
              </p>

              <p>
                <strong>Organizer:</strong> {selectedEvent.organizer}
              </p>
            </div>

            <h3 className="mt-7 font-bold text-[#234E43]">
              About This Event
            </h3>

            <p className="mt-3 leading-relaxed text-[#718579]">
              {selectedEvent.description}
            </p>

            <h3 className="mt-7 font-bold text-[#234E43]">
              Event Highlights
            </h3>

            <div className="mt-4 space-y-3">
              {selectedEvent.highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2
                    size={18}
                    className="text-[#477764]"
                  />

                  <span className="text-sm text-[#607B6C]">
                    {highlight}
                  </span>
                </div>
              ))}
            </div>

            {message && (
              <p
                role="status"
                className="mt-6 rounded-xl border border-[#DCE8DA] bg-[#F1F7EF] p-4 text-sm text-[#45685B]"
              >
                {message}
              </p>
            )}

            {registeredIds.includes(selectedEvent.id) ? (
              <button
                type="button"
                onClick={cancelRegistration}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCE8DA] bg-[#F1F7EF] px-5 py-3.5 font-bold text-[#234E43]"
              >
                <X size={18} />
                Cancel Demo Registration
              </button>
            ) : (
              <button
                type="button"
                onClick={registerEvent}
                disabled={
                  selectedEvent.date < today ||
                  selectedEvent.registered >= selectedEvent.capacity
                }
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Ticket size={18} />
                {selectedEvent.date < today
                  ? "Event Ended"
                  : selectedEvent.registered >= selectedEvent.capacity
                  ? "Fully Booked"
                  : "Register for Event (Demo)"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Note */}
      <div className="rounded-2xl border border-[#E9DCAE] bg-[#FFF9E9] p-5 text-sm leading-relaxed text-[#80651E]">
        All campus events, clubs, registrations, and membership information
        shown here are sample data. Registration and club joining are
        frontend demonstrations only and will reset after refreshing the page.
      </div>

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Clubs & Events
      </div>
    </div>
  );
}

export default StudentEvents;
