
import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Search,
  MapPin,
  CalendarDays,
  Building2,
  Bookmark,
  BookmarkCheck,
  Send,
  CheckCircle2,
  Clock3,
  GraduationCap,
  ArrowUpRight,
  X,
  BookOpen,
  FileText,
  Target,
  Sparkles,
} from "lucide-react";

// Demo opportunities. Later these will come from MongoDB.
const opportunities = [
  {
    id: 1,
    title: "Frontend Developer Intern",
    company: "TechNova Solutions",
    location: "Dhaka, Bangladesh",
    type: "Internship",
    workMode: "Hybrid",
    category: "Web Development",
    deadline: "2026-11-15",
    duration: "3 Months",
    description:
      "Work with a development team to build responsive web interfaces using modern frontend technologies.",
    requirements: ["HTML, CSS & JavaScript", "Basic React", "Git fundamentals"],
  },
  {
    id: 2,
    title: "Software Engineering Intern",
    company: "NextGen Technologies",
    location: "Dhaka, Bangladesh",
    type: "Internship",
    workMode: "On-site",
    category: "Software Engineering",
    deadline: "2026-11-20",
    duration: "4 Months",
    description:
      "Assist in software development, testing, documentation, and collaborative engineering projects.",
    requirements: ["Programming fundamentals", "OOP", "Problem-solving"],
  },
  {
    id: 3,
    title: "Junior Data Analyst",
    company: "DataBridge Analytics",
    location: "Remote",
    type: "Job",
    workMode: "Remote",
    category: "Data Analytics",
    deadline: "2026-12-01",
    duration: "Full-time",
    description:
      "Support data analysis, reporting, dashboard creation, and business insights.",
    requirements: ["Excel", "SQL basics", "Data visualization"],
  },
  {
    id: 4,
    title: "Cybersecurity Intern",
    company: "SecureNet Labs",
    location: "Dhaka, Bangladesh",
    type: "Internship",
    workMode: "On-site",
    category: "Cybersecurity",
    deadline: "2026-11-25",
    duration: "3 Months",
    description:
      "Learn practical security monitoring, network analysis, and vulnerability assessment.",
    requirements: ["Networking basics", "Linux fundamentals", "Security concepts"],
  },
  {
    id: 5,
    title: "UI/UX Design Intern",
    company: "PixelCraft Studio",
    location: "Remote",
    type: "Internship",
    workMode: "Remote",
    category: "UI/UX Design",
    deadline: "2026-12-10",
    duration: "3 Months",
    description:
      "Create wireframes, user flows, prototypes, and interface designs for digital products.",
    requirements: ["Figma basics", "Design principles", "User research"],
  },
  {
    id: 6,
    title: "Research Assistant",
    company: "University Research Cell",
    location: "Dhaka, Bangladesh",
    type: "Research",
    workMode: "Hybrid",
    category: "Research",
    deadline: "2026-12-15",
    duration: "6 Months",
    description:
      "Assist faculty researchers with literature review, data collection, and project documentation.",
    requirements: ["Research interest", "Academic writing", "Analytical thinking"],
  },
];

const resources = [
  {
    title: "Build a Professional CV",
    description: "Learn how to structure an effective internship-ready CV.",
    icon: FileText,
  },
  {
    title: "Interview Preparation",
    description: "Practice common technical and behavioral questions.",
    icon: Target,
  },
  {
    title: "Develop Your Skills",
    description: "Explore learning paths for your desired career.",
    icon: BookOpen,
  },
];

function StudentCareer() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("explore");
  const [savedIds, setSavedIds] = useState([]);
  const [appliedIds, setAppliedIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return opportunities.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.company.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      const matchesType =
        typeFilter === "All" || item.type === typeFilter;

      const matchesMode =
        modeFilter === "All" || item.workMode === modeFilter;

      const matchesTab =
        activeTab === "explore" ||
        (activeTab === "saved" && savedIds.includes(item.id)) ||
        (activeTab === "applied" && appliedIds.includes(item.id));

      return matchesSearch && matchesType && matchesMode && matchesTab;
    });
  }, [search, typeFilter, modeFilter, activeTab, savedIds, appliedIds]);

  const toggleSave = (id) => {
    setSavedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const applyDemo = () => {
    if (!selected) return;

    if (!appliedIds.includes(selected.id)) {
      setAppliedIds((previous) => [...previous, selected.id]);
    }

    setMessage(
      "Demo application recorded in this browser session only. No application was sent to an organization."
    );
  };

  const openDetails = (item) => {
    setSelected(item);
    setMessage("");
  };

  const summary = [
    {
      label: "Opportunities",
      value: opportunities.length,
      icon: BriefcaseBusiness,
    },
    {
      label: "Internships",
      value: opportunities.filter((item) => item.type === "Internship").length,
      icon: GraduationCap,
    },
    {
      label: "Saved",
      value: savedIds.length,
      icon: BookmarkCheck,
    },
    {
      label: "Demo Applications",
      value: appliedIds.length,
      icon: Send,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
          CAREER DEVELOPMENT
        </p>

        <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
          Career & Internships
        </h1>

        <p className="mt-3 text-[#718579]">
          Explore opportunities, develop professional skills,
          and prepare for your future career.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
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

      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-8 text-white md:p-10">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#DCE9DE]">
            <Sparkles size={16} className="text-[#D9A536]" />
            YOUR FUTURE STARTS HERE
          </span>

          <h2 className="mt-6 text-3xl font-extrabold md:text-4xl">
            Discover opportunities.
            <br />
            <span className="text-[#E8BE62]">Bloom professionally.</span>
          </h2>

          <p className="mt-5 leading-relaxed text-[#C9DDCF]">
            Connect your academic journey with real-world
            career preparation and professional development.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
        {[
          { id: "explore", label: "Explore Opportunities", icon: Search },
          { id: "saved", label: "Saved", icon: Bookmark },
          { id: "applied", label: "My Applications", icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
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

      {/* Search and Filters */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5">
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
              placeholder="Search roles, organizations, or skills..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter opportunity type"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
          >
            <option value="All">All Types</option>
            <option value="Internship">Internship</option>
            <option value="Job">Job</option>
            <option value="Research">Research</option>
          </select>

          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value)}
            aria-label="Filter work mode"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
          >
            <option value="All">All Work Modes</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
        </div>

        <p className="mt-4 text-sm text-[#718579]">
          Showing {filtered.length} opportunities
        </p>
      </section>

      {/* Opportunity Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => {
          const isSaved = savedIds.includes(item.id);
          const isApplied = appliedIds.includes(item.id);

          return (
            <article
              key={item.id}
              className="flex flex-col rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#234E43]/10"
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF2E8] text-[#234E43]">
                  <Building2 size={26} />
                </div>

                <button
                  type="button"
                  onClick={() => toggleSave(item.id)}
                  aria-label={isSaved ? "Remove saved opportunity" : "Save opportunity"}
                  aria-pressed={isSaved}
                  className="rounded-xl border border-[#E2EADC] p-2.5 text-[#477764] hover:bg-[#F1F7EF]"
                >
                  {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                </button>
              </div>

              <span className="text-xs font-bold text-[#B18B37]">
                {item.category}
              </span>

              <h3 className="mt-2 text-xl font-bold text-[#234E43]">
                {item.title}
              </h3>

              <p className="mt-2 font-medium text-[#607B6C]">
                {item.company}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#EAF2E8] px-3 py-1.5 text-xs font-bold text-[#477764]">
                  {item.type}
                </span>

                <span className="rounded-full bg-[#FFF4DC] px-3 py-1.5 text-xs font-bold text-[#A57921]">
                  {item.workMode}
                </span>

                {isApplied && (
                  <span className="rounded-full bg-[#EAF0F8] px-3 py-1.5 text-xs font-bold text-[#456A94]">
                    Demo Applied
                  </span>
                )}
              </div>

              <div className="mt-6 space-y-3 text-sm text-[#718579]">
                <p className="flex items-center gap-2">
                  <MapPin size={17} />
                  {item.location}
                </p>

                <p className="flex items-center gap-2">
                  <CalendarDays size={17} />
                  Deadline: {item.deadline}
                </p>

                <p className="flex items-center gap-2">
                  <Clock3 size={17} />
                  {item.duration}
                </p>
              </div>

              <button
                onClick={() => openDetails(item)}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657]"
              >
                View Details
                <ArrowUpRight size={18} />
              </button>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-3xl border border-[#E2EADC] bg-white p-12 text-center">
          <BriefcaseBusiness
            size={40}
            className="mx-auto text-[#A6C1A4]"
          />
          <h3 className="mt-4 text-xl font-bold text-[#234E43]">
            No Opportunities Found
          </h3>
          <p className="mt-2 text-[#718579]">
            Try changing your search or filters.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("All");
              setModeFilter("All");
              setActiveTab("explore");
            }}
            className="mt-5 rounded-xl bg-[#234E43] px-6 py-3 font-bold text-white"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Career Development Resources */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 md:p-8">
        <div className="mb-7">
          <h2 className="text-2xl font-bold text-[#234E43]">
            Career Development Resources
          </h2>
          <p className="mt-2 text-sm text-[#718579]">
            Essential areas to prepare for your professional journey
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {resources.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-2xl border border-[#E2EADC] bg-[#F9FBF8] p-6"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                  <Icon size={23} />
                </div>

                <h3 className="font-bold text-[#234E43]">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#718579]">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Details Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="career-details-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  {selected.company}
                </p>
                <h2
                  id="career-details-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {selected.title}
                </h2>
              </div>

              <button
                onClick={() => setSelected(null)}
                aria-label="Close opportunity details"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl bg-[#F6F8F3] p-5 text-sm text-[#45685B] sm:grid-cols-2">
              <p><strong>Type:</strong> {selected.type}</p>
              <p><strong>Mode:</strong> {selected.workMode}</p>
              <p><strong>Location:</strong> {selected.location}</p>
              <p><strong>Deadline:</strong> {selected.deadline}</p>
            </div>

            <h3 className="mt-7 font-bold text-[#234E43]">
              Opportunity Description
            </h3>
            <p className="mt-3 leading-relaxed text-[#718579]">
              {selected.description}
            </p>

            <h3 className="mt-7 font-bold text-[#234E43]">
              Requirements
            </h3>
            <div className="mt-4 space-y-3">
              {selected.requirements.map((requirement) => (
                <div key={requirement} className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-[#477764]" />
                  <span className="text-sm text-[#607B6C]">
                    {requirement}
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

            <button
              onClick={applyDemo}
              disabled={appliedIds.includes(selected.id)}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={18} />
              {appliedIds.includes(selected.id)
                ? "Demo Application Recorded"
                : "Simulate Application"}
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Career & Internships
      </div>
    </div>
  );
}

export default StudentCareer;
