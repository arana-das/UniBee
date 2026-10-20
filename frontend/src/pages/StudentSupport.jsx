
import { useMemo, useState } from "react";
import {
  Headphones,
  Plus,
  Search,
  Ticket,
  Clock3,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  MessageSquare,
  ChevronDown,
  CalendarDays,
  ArrowUpRight,
  HelpCircle,
  LifeBuoy,
  Mail,
  BookOpen,
} from "lucide-react";

// Demo tickets; actual records will later come from MongoDB.
const initialTickets = [
  {
    id: "UB-1001",
    subject: "Unable to access course materials",
    category: "Technical",
    priority: "High",
    status: "In Progress",
    date: "2026-10-08",
    description:
      "I am unable to open the course materials section for Web Technologies.",
    response:
      "Our technical team is investigating the issue. Please try again later.",
  },
  {
    id: "UB-1002",
    subject: "Attendance record correction",
    category: "Academic",
    priority: "Medium",
    status: "Open",
    date: "2026-10-07",
    description:
      "My attendance for the last database lecture appears to be incorrect.",
    response: "",
  },
  {
    id: "UB-1003",
    subject: "Library book availability",
    category: "Library",
    priority: "Low",
    status: "Resolved",
    date: "2026-10-02",
    description:
      "I wanted to confirm the availability of a database textbook.",
    response:
      "The requested title is available at the library circulation desk.",
  },
];

const faqs = [
  {
    question: "How can I check my attendance?",
    answer:
      "Open Student Portal → Attendance to review your course-wise attendance and class history.",
  },
  {
    question: "Where can I find assignments?",
    answer:
      "Go to Student Portal → Assignments. You can filter assignments by course and status.",
  },
  {
    question: "How can I review my semester results?",
    answer:
      "Open Results & CGPA from the Student Portal sidebar to view semester-wise grades.",
  },
  {
    question: "How can I contact university administration?",
    answer:
      "Use the Messages section or create a support ticket. Real communication will be available after backend integration.",
  },
  {
    question: "Can I pay university fees online?",
    answer:
      "Online payments are not enabled in the current prototype. The Fees & Payments page shows demonstration records only.",
  },
  {
    question: "How do I report a technical issue?",
    answer:
      "Select New Ticket, choose Technical as the category, describe the problem, and submit the demo form.",
  },
];

const categories = [
  "Technical",
  "Academic",
  "Finance",
  "Library",
  "Account",
  "Other",
];

const statusStyles = {
  Open: "bg-[#EAF0F8] text-[#456A94]",
  "In Progress": "bg-[#FFF4DC] text-[#A57921]",
  Resolved: "bg-[#EAF2E8] text-[#427A67]",
};

const priorityStyles = {
  High: "text-red-700",
  Medium: "text-[#A57921]",
  Low: "text-[#477764]",
};

const emptyForm = {
  subject: "",
  category: "Technical",
  priority: "Medium",
  description: "",
};

function StudentSupport() {
  const [tickets, setTickets] = useState(initialTickets);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("tickets");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");

  const [faqSearch, setFaqSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState(null);

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        ticket.subject.toLowerCase().includes(query) ||
        ticket.id.toLowerCase().includes(query) ||
        ticket.category.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        ticket.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" ||
        ticket.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [tickets, search, statusFilter, categoryFilter]);

  const filteredFaqs = faqs.filter((faq) => {
    const query = faqSearch.trim().toLowerCase();

    return (
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query)
    );
  });

  const openCount = tickets.filter(
    (ticket) => ticket.status === "Open"
  ).length;

  const inProgressCount = tickets.filter(
    (ticket) => ticket.status === "In Progress"
  ).length;

  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === "Resolved"
  ).length;

  const summary = [
    {
      title: "Total Tickets",
      value: tickets.length,
      icon: Ticket,
    },
    {
      title: "Open Tickets",
      value: openCount,
      icon: AlertCircle,
    },
    {
      title: "In Progress",
      value: inProgressCount,
      icon: Clock3,
    },
    {
      title: "Resolved",
      value: resolvedCount,
      icon: CheckCircle2,
    },
  ];

  const createTicket = (event) => {
    event.preventDefault();

    const subject = form.subject.trim();
    const description = form.description.trim();

    if (!subject || !description) return;

    const newTicket = {
      id: `UB-DEMO-${Date.now()}`,
      subject,
      category: form.category,
      priority: form.priority,
      status: "Open",
      date: new Date().toLocaleDateString("en-CA"),
      description,
      response: "",
    };

    setTickets((previous) => [newTicket, ...previous]);
    setForm({ ...emptyForm });
    setShowCreateModal(false);

    setSearch("");
    setStatusFilter("All");
    setCategoryFilter("All");
    setActiveTab("tickets");

    setNotice(
      "Demo ticket created successfully. It exists only in this page and has not been sent to university staff."
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            STUDENT SERVICES
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            Help & Support
          </h1>

          <p className="mt-3 text-[#718579]">
            Find answers, report problems, and track your support requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm({ ...emptyForm });
            setShowCreateModal(true);
          }}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657]"
        >
          <Plus size={19} />
          New Ticket
        </button>
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

      {/* Support Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-8 text-white md:p-10">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#DCE9DE]">
            <LifeBuoy size={17} className="text-[#D9A536]" />
            STUDENT ASSISTANCE
          </span>

          <h2 className="mt-6 text-3xl font-extrabold md:text-4xl">
            Need a little help?
            <br />
            <span className="text-[#E8BE62]">
              We're here to guide you.
            </span>
          </h2>

          <p className="mt-5 leading-relaxed text-[#C9DDCF]">
            Explore frequently asked questions and keep
            your support requests organized in one place.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
        {[
          { id: "tickets", label: "My Support Tickets", icon: Ticket },
          { id: "faq", label: "Frequently Asked Questions", icon: HelpCircle },
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

      {activeTab === "tickets" ? (
        <>
          {notice && (
            <div
              role="status"
              className="flex items-start justify-between gap-4 rounded-2xl border border-[#DCE8DA] bg-[#F1F7EF] p-5 text-sm text-[#45685B]"
            >
              <p>{notice}</p>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Filters */}
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
                  placeholder="Search tickets by subject or ID..."
                  className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter support ticket status"
                className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
              >
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                aria-label="Filter support ticket category"
                className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
              >
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-4 text-sm text-[#718579]">
              Showing {filteredTickets.length} of {tickets.length} tickets
            </p>
          </section>

          {/* Ticket Cards */}
          {filteredTickets.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {filteredTickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="flex flex-col rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-bold text-[#B18B37]">
                      {ticket.id}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        statusStyles[ticket.status]
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-[#234E43]">
                    {ticket.subject}
                  </h3>

                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#718579]">
                    {ticket.description}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[#718579]">
                    <span className="flex items-center gap-2">
                      <CalendarDays size={15} />
                      {ticket.date}
                    </span>

                    <span className="rounded-full bg-[#F1F7EF] px-3 py-1 font-semibold text-[#477764]">
                      {ticket.category}
                    </span>

                    <span className={`font-semibold ${priorityStyles[ticket.priority]}`}>
                      {ticket.priority} Priority
                    </span>
                  </div>

                  <div className="mt-6 border-t border-[#EDF1EB] pt-5">
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(ticket)}
                      className="flex items-center gap-2 text-sm font-bold text-[#234E43] hover:text-[#B18B37]"
                    >
                      View Ticket Details
                      <ArrowUpRight size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-[#E2EADC] bg-white p-12 text-center">
              <Ticket size={42} className="mx-auto text-[#A6C1A4]" />
              <h3 className="mt-4 text-xl font-bold text-[#234E43]">
                No Tickets Found
              </h3>
              <p className="mt-2 text-[#718579]">
                Try changing your search or filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                  setCategoryFilter("All");
                }}
                className="mt-5 rounded-xl bg-[#234E43] px-6 py-3 font-bold text-white"
              >
                Clear Filters
              </button>
            </div>
          )}
        </>
      ) : (
        /* FAQ Section */
        <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-[#234E43]">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-[#718579]">
              Quick answers to common questions about UniBee.
            </p>
          </div>

          <div className="relative mb-7">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />
            <input
              type="search"
              value={faqSearch}
              onChange={(event) => setFaqSearch(event.target.value)}
              placeholder="Search frequently asked questions..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
            />
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const originalIndex = faqs.indexOf(faq);
              const expanded = expandedFaq === originalIndex;

              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-2xl border border-[#E2EADC]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedFaq(expanded ? null : originalIndex)
                    }
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="font-semibold text-[#234E43]">
                      {faq.question}
                    </span>

                    <ChevronDown
                      size={20}
                      className={`shrink-0 text-[#477764] transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expanded && (
                    <p className="border-t border-[#EDF1EB] bg-[#F9FBF8] px-5 py-5 text-sm leading-relaxed text-[#607B6C]">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {filteredFaqs.length === 0 && (
            <p className="py-10 text-center text-sm text-[#718579]">
              No matching questions found.
            </p>
          )}
        </section>
      )}

      {/* Help Information */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-[#E2EADC] bg-white p-6">
          <div className="flex items-center gap-3">
            <Headphones size={24} className="text-[#477764]" />
            <h3 className="font-bold text-[#234E43]">
              Technical Assistance
            </h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#718579]">
            Having difficulty with portal navigation or an academic
            feature? Create a technical support ticket describing
            the problem.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2EADC] bg-white p-6">
          <div className="flex items-center gap-3">
            <BookOpen size={24} className="text-[#477764]" />
            <h3 className="font-bold text-[#234E43]">
              Academic Assistance
            </h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#718579]">
            For attendance, course, result, or registration questions,
            use the relevant academic support category.
          </p>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-ticket-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  {selectedTicket.id}
                </p>

                <h2
                  id="support-ticket-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {selectedTicket.subject}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                aria-label="Close ticket details"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-[#F6F8F3] p-5 text-sm text-[#45685B] sm:grid-cols-2">
              <p><strong>Category:</strong> {selectedTicket.category}</p>
              <p><strong>Priority:</strong> {selectedTicket.priority}</p>
              <p><strong>Status:</strong> {selectedTicket.status}</p>
              <p><strong>Created:</strong> {selectedTicket.date}</p>
            </div>

            <h3 className="mt-7 font-bold text-[#234E43]">
              Problem Description
            </h3>

            <p className="mt-3 leading-relaxed text-[#718579]">
              {selectedTicket.description}
            </p>

            <div className="mt-7 rounded-2xl border border-[#DCE8DA] bg-[#F1F7EF] p-5">
              <h3 className="flex items-center gap-2 font-bold text-[#234E43]">
                <MessageSquare size={18} />
                Support Response
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-[#607B6C]">
                {selectedTicket.response ||
                  "No response yet. This is a demo ticket, and it is not monitored by support staff."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="mt-7 w-full rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-ticket-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  STUDENT ASSISTANCE
                </p>
                <h2
                  id="create-ticket-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  Create Support Ticket
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close ticket form"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={createTicket} className="mt-7 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={form.subject}
                  onChange={(event) =>
                    setForm({ ...form, subject: event.target.value })
                  }
                  placeholder="Briefly describe your issue"
                  className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm outline-none focus:border-[#A6C1A4]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({ ...form, priority: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Description
                </label>
                <textarea
                  rows={5}
                  required
                  maxLength={1500}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Explain your issue in detail..."
                  className="w-full resize-none rounded-xl border border-[#E2EADC] px-4 py-3 text-sm outline-none focus:border-[#A6C1A4]"
                />
              </div>

              <div className="rounded-xl bg-[#FFF9E9] p-4 text-xs leading-relaxed text-[#80651E]">
                This is a demonstration form. Tickets are not sent to
                administrators or university support staff.
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657]"
              >
                <Send size={18} />
                Create Demo Ticket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer Notice */}
      <div className="rounded-2xl border border-[#E9DCAE] bg-[#FFF9E9] p-5 text-sm leading-relaxed text-[#80651E]">
        UniBee Help & Support is currently a frontend demonstration.
        New tickets and changes are stored only in React state and
        will reset after refreshing the page.
      </div>

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Help & Support
      </div>
    </div>
  );
}

export default StudentSupport;
