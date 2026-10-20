
import { useMemo, useState } from "react";
import {
  Bell,
  Search,
  CalendarDays,
  Pin,
  AlertCircle,
  BookOpen,
  CalendarCheck,
  Megaphone,
  ArrowUpRight,
  X,
  CheckCheck,
  Paperclip,
  Inbox,
  ChevronDown,
} from "lucide-react";

// Demo data. Notices will come from MongoDB later.
const initialNotices = [
  {
    id: 1,
    title: "Midterm Examination Schedule Published",
    category: "Academic",
    date: "2026-10-09",
    priority: "High",
    pinned: true,
    read: false,
    author: "Office of the Controller of Examinations",
    description:
      "The midterm examination schedule has been published. Students are requested to check their course-wise examination dates and prepare accordingly.",
    attachment: "Midterm_Exam_Schedule.pdf",
  },
  {
    id: 2,
    title: "Course Registration Deadline Reminder",
    category: "Academic",
    date: "2026-10-08",
    priority: "High",
    pinned: true,
    read: false,
    author: "Academic Office",
    description:
      "Students who have not completed course registration are requested to finalize their registration within the announced deadline.",
    attachment: "",
  },
  {
    id: 3,
    title: "University Research & Innovation Workshop",
    category: "Event",
    date: "2026-10-07",
    priority: "Normal",
    pinned: false,
    read: false,
    author: "Research and Innovation Cell",
    description:
      "A research and innovation workshop will be organized for interested students. The session will introduce research methodologies and opportunities.",
    attachment: "",
  },
  {
    id: 4,
    title: "Digital Library Resources Updated",
    category: "Library",
    date: "2026-10-05",
    priority: "Normal",
    pinned: false,
    read: true,
    author: "University Library",
    description:
      "New academic books, journals, and learning resources have been added to the university digital library catalog.",
    attachment: "",
  },
  {
    id: 5,
    title: "Campus Career Development Seminar",
    category: "Career",
    date: "2026-10-03",
    priority: "Normal",
    pinned: false,
    read: true,
    author: "Career Development Center",
    description:
      "Students are invited to join the career development seminar covering CV preparation, internship opportunities, and professional skills.",
    attachment: "",
  },
  {
    id: 6,
    title: "Updated Class Routine for ICT Department",
    category: "Academic",
    date: "2026-10-01",
    priority: "Normal",
    pinned: false,
    read: false,
    author: "Department of ICT",
    description:
      "The updated class routine for ICT students is now available. Please review your scheduled classes and classroom information.",
    attachment: "ICT_Class_Routine.pdf",
  },
  {
    id: 7,
    title: "Interdepartmental Cultural Festival",
    category: "Event",
    date: "2026-09-28",
    priority: "Normal",
    pinned: false,
    read: true,
    author: "Student Affairs Office",
    description:
      "Registration is open for the upcoming interdepartmental cultural festival. Students may participate in different cultural activities.",
    attachment: "",
  },
];

const categories = ["All", "Academic", "Event", "Library", "Career"];

const categoryStyles = {
  Academic: "bg-[#EAF2E8] text-[#427A67]",
  Event: "bg-[#FFF4DC] text-[#A57921]",
  Library: "bg-[#EAF0F8] text-[#456A94]",
  Career: "bg-[#F3EAF5] text-[#875F93]",
};

const categoryIcons = {
  Academic: BookOpen,
  Event: CalendarCheck,
  Library: BookOpen,
  Career: Megaphone,
};

function StudentNotices() {
  const [notices, setNotices] = useState(initialNotices);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("latest");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);

  const unreadCount = notices.filter((notice) => !notice.read).length;
  const pinnedCount = notices.filter((notice) => notice.pinned).length;
  const highPriorityCount = notices.filter(
    (notice) => notice.priority === "High"
  ).length;

  const filteredNotices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notices
      .filter((notice) => {
        const matchesSearch =
          notice.title.toLowerCase().includes(query) ||
          notice.description.toLowerCase().includes(query) ||
          notice.author.toLowerCase().includes(query);

        const matchesCategory =
          category === "All" || notice.category === category;

        const matchesRead =
          !showUnreadOnly || !notice.read;

        return matchesSearch && matchesCategory && matchesRead;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const priorityDifference =
            Number(b.priority === "High") -
            Number(a.priority === "High");

          if (priorityDifference !== 0) return priorityDifference;
        }

        if (sortBy === "oldest") {
          return a.date.localeCompare(b.date);
        }

        // Pinned notices appear first for the default view.
        if (sortBy === "latest" && a.pinned !== b.pinned) {
          return Number(b.pinned) - Number(a.pinned);
        }

        return b.date.localeCompare(a.date);
      });
  }, [notices, search, category, sortBy, showUnreadOnly]);

  const markAsRead = (id) => {
    setNotices((previous) =>
      previous.map((notice) =>
        notice.id === id ? { ...notice, read: true } : notice
      )
    );
  };

  const markAllRead = () => {
    setNotices((previous) =>
      previous.map((notice) => ({ ...notice, read: true }))
    );

    if (selectedNotice) {
      setSelectedNotice((previous) => ({
        ...previous,
        read: true,
      }));
    }
  };

  const openNotice = (notice) => {
    setSelectedNotice({ ...notice, read: true });
    markAsRead(notice.id);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            CAMPUS COMMUNICATION
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            Notices & Announcements
          </h1>

          <p className="mt-3 text-[#718579]">
            Stay informed about academic updates, university events,
            and important campus announcements.
          </p>
        </div>

        <button
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-semibold text-white transition hover:bg-[#326657] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck size={18} />
          Mark All as Read
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Notices", value: notices.length, icon: Bell },
          { label: "Unread Notices", value: unreadCount, icon: Inbox },
          { label: "Pinned Notices", value: pinnedCount, icon: Pin },
          {
            label: "High Priority",
            value: highPriorityCount,
            icon: AlertCircle,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={23} />
              </div>

              <p className="text-sm text-[#718579]">{item.label}</p>

              <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
                {item.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
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
              placeholder="Search announcements..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Sort notices"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-medium text-[#45685B]"
          >
            <option value="latest">Latest & Pinned</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">High Priority First</option>
          </select>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  category === item
                    ? "bg-[#234E43] text-white"
                    : "bg-[#F1F7EF] text-[#607B6C] hover:bg-[#E3EEE1]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#607B6C]">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(event) =>
                setShowUnreadOnly(event.target.checked)
              }
              className="h-4 w-4 accent-[#234E43]"
            />
            Unread only
          </label>
        </div>

        <p className="mt-5 text-sm text-[#8A9F90]">
          Showing {filteredNotices.length} of {notices.length} notices
        </p>
      </section>

      {/* Notice Cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        {filteredNotices.map((notice) => {
          const Icon = categoryIcons[notice.category] || Bell;

          return (
            <article
              key={notice.id}
              className={`group relative rounded-3xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                !notice.read
                  ? "border-[#D9A536] bg-[#FFFEFA]"
                  : "border-[#E2EADC]"
              }`}
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                    <Icon size={23} />
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      categoryStyles[notice.category]
                    }`}
                  >
                    {notice.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {notice.pinned && (
                    <Pin size={17} className="text-[#B78B28]" />
                  )}

                  {!notice.read && (
                    <span className="rounded-full bg-[#D9A536] px-3 py-1 text-xs font-bold text-[#234E43]">
                      New
                    </span>
                  )}
                </div>
              </div>

              <h2 className="text-lg font-bold text-[#234E43]">
                {notice.title}
              </h2>

              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#718579]">
                {notice.description}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[#8A9F90]">
                <span className="flex items-center gap-2">
                  <CalendarDays size={15} />
                  {notice.date}
                </span>

                {notice.priority === "High" && (
                  <span className="flex items-center gap-1 font-bold text-[#A57921]">
                    <AlertCircle size={15} />
                    Important
                  </span>
                )}

                {notice.attachment && (
                  <span className="flex items-center gap-1">
                    <Paperclip size={15} />
                    Attachment
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-[#EDF1EB] pt-5">
                <p className="truncate pr-3 text-xs text-[#718579]">
                  {notice.author}
                </p>

                <button
                  onClick={() => openNotice(notice)}
                  className="flex shrink-0 items-center gap-2 text-sm font-bold text-[#234E43] hover:text-[#B78B28]"
                >
                  Read More
                  <ArrowUpRight size={17} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredNotices.length === 0 && (
        <div className="rounded-3xl border border-[#E2EADC] bg-white px-6 py-16 text-center">
          <Inbox size={42} className="mx-auto text-[#A6C1A4]" />
          <h3 className="mt-5 text-xl font-bold text-[#234E43]">
            No notices found
          </h3>
          <p className="mt-2 text-[#718579]">
            Try a different search or category.
          </p>

          <button
            onClick={() => {
              setSearch("");
              setCategory("All");
              setShowUnreadOnly(false);
              setSortBy("latest");
            }}
            className="mt-6 rounded-xl bg-[#234E43] px-6 py-3 font-semibold text-white"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Notice Details Modal */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-modal-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl md:p-9"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={`inline-block rounded-full px-3 py-1.5 text-xs font-bold ${
                    categoryStyles[selectedNotice.category]
                  }`}
                >
                  {selectedNotice.category}
                </span>

                <h2
                  id="notice-modal-title"
                  className="mt-4 text-2xl font-extrabold leading-snug text-[#234E43]"
                >
                  {selectedNotice.title}
                </h2>
              </div>

              <button
                onClick={() => setSelectedNotice(null)}
                aria-label="Close notice"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={23} />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-5 border-b border-[#E2EADC] pb-5 text-sm text-[#718579]">
              <span className="flex items-center gap-2">
                <CalendarDays size={17} />
                {selectedNotice.date}
              </span>

              <span className="flex items-center gap-2">
                <Megaphone size={17} />
                {selectedNotice.author}
              </span>
            </div>

            <div className="py-7">
              <h3 className="font-bold text-[#234E43]">
                Announcement Details
              </h3>

              <p className="mt-4 leading-8 text-[#607B6C]">
                {selectedNotice.description}
              </p>
            </div>

            {selectedNotice.attachment && (
              <div className="rounded-2xl border border-[#E2EADC] bg-[#F6F8F3] p-5">
                <div className="flex items-center gap-3">
                  <Paperclip size={22} className="text-[#477764]" />
                  <div>
                    <p className="font-semibold text-[#234E43]">
                      {selectedNotice.attachment}
                    </p>
                    <p className="mt-1 text-xs text-[#718579]">
                      Demo attachment — file download will be added later.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedNotice(null)}
              className="mt-7 w-full rounded-xl bg-[#234E43] px-6 py-3.5 font-bold text-white transition hover:bg-[#326657]"
            >
              Close Announcement
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Notices & Announcements
      </div>
    </div>
  );
}

export default StudentNotices;
