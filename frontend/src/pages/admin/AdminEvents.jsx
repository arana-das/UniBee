
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, CalendarPlus, MapPin, Users, Clock3, Search, Filter,
  Eye, Pencil, Trash2, X, Save, Download, RotateCcw, ChevronLeft,
  ChevronRight, CheckCircle2, AlertCircle, Ticket, UserPlus, UserMinus,
  CalendarCheck, Building2, Tag, RefreshCw,
} from "lucide-react";
import { getAuthToken } from "../../services/authApi";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const PAGE_SIZE = 8;
const CATEGORIES = ["Academic", "Workshop", "Seminar", "Cultural", "Sports", "Career", "Competition", "Other"];
const STATUSES = ["Draft", "Published", "Cancelled", "Completed"];
const AUDIENCES = ["All", "Students", "Faculty", "Staff"];
const FIELD = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#234E43]";
const EMPTY = {
  title: "", category: "Academic", description: "", date: "",
  startTime: "10:00", endTime: "12:00", venue: "", organizer: "",
  audience: "All", capacity: "100", status: "Draft", registrationDeadline: "",
};

function idOf(value) { return String(value?._id || value?.id || ""); }
function dateOnly(value) { return value ? String(value).slice(0, 10) : ""; }

function localDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function showDate(value) {
  if (!value) return "Not scheduled";
  const [y, m, d] = dateOnly(value).split("-");
  return `${d}/${m}/${y}`;
}

function eventPeriod(event) {
  if (["Cancelled", "Completed"].includes(event.status)) return event.status;
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  if (event.date < localToday) return "Past";
  if (event.date === localToday) return "Today";
  return "Upcoming";
}

async function request(path, options = {}) {
  const token = getAuthToken();
  if (!token) throw new Error("Login session expired. Please sign in again.");

  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot connect to UniBee backend. Is it running?");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${response.status}).`);
  }
  return data;
}

function exportCSV(filename, headers, rows) {
  const cell = value => {
    let s = String(value ?? "");
    if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };

  const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Badge({ status }) {
  const styles = {
    Draft: "bg-amber-50 text-amber-800",
    Published: "bg-emerald-50 text-emerald-700",
    Cancelled: "bg-rose-50 text-rose-700",
    Completed: "bg-sky-50 text-sky-700",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

function Stat({ label, value, detail, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold text-[#234E43]">{value}</p>
        </div>
        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={21}/>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [eventModal, setEventModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [viewId, setViewId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsBusy, setParticipantsBusy] = useState(false);
  const [registerId, setRegisterId] = useState(null);
  const [studentId, setStudentId] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await request("/api/events");
      if (!Array.isArray(data.data)) {
        throw new Error("Unexpected events API response.");
      }

      setEvents(data.data.map(e => ({
        ...e,
        id: idOf(e),
        date: dateOnly(e.date),
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const viewing = events.find(e => e.id === viewId) || null;
  const registering = events.find(e => e.id === registerId) || null;

  const loadParticipants = useCallback(async (eventId) => {
    setParticipantsBusy(true);
    try {
      const data = await request(`/api/events/${eventId}/registrations`);
      setParticipants(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message);
      setParticipants([]);
    } finally {
      setParticipantsBusy(false);
    }
  }, []);

  const filtered = useMemo(() => events.filter(e => {
    const q = search.trim().toLowerCase();

    return [
      e.title, e.category, e.venue, e.organizer, e.description, e.id,
    ].some(v => String(v || "").toLowerCase().includes(q)) &&
      (categoryFilter === "All" || e.category === categoryFilter) &&
      (statusFilter === "All" || e.status === statusFilter) &&
      (periodFilter === "All" || eventPeriod(e) === periodFilter);
  }).sort((a, b) =>
    a.date.localeCompare(b.date) ||
    a.startTime.localeCompare(b.startTime)
  ), [events, search, categoryFilter, statusFilter, periodFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const totalRegistrations = events.reduce(
    (n, e) => n + Number(e.registrationCount || 0), 0
  );

  const upcoming = events.filter(
    e => e.status === "Published" &&
      ["Today", "Upcoming"].includes(eventPeriod(e))
  ).length;

  const published = events.filter(
    e => e.status === "Published"
  ).length;

  function clearFilters() {
    setSearch("");
    setCategoryFilter("All");
    setStatusFilter("All");
    setPeriodFilter("All");
    setPage(1);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY });
    setError("");
    setFeedback("");
    setEventModal(true);
  }

  function openEdit(e) {
    setEditingId(e.id);
    setError("");
    setFeedback("");

    setForm({
      title: e.title || "",
      category: e.category || "Academic",
      description: e.description || "",
      date: dateOnly(e.date),
      startTime: e.startTime || "10:00",
      endTime: e.endTime || "12:00",
      venue: e.venue || "",
      organizer: e.organizer || "",
      audience: e.audience || "All",
      capacity: String(e.capacity ?? 100),
      status: e.status || "Draft",
      registrationDeadline: localDateTime(e.registrationDeadline),
    });

    setEventModal(true);
  }

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    setError("");
  }

  async function saveEvent(ev) {
    ev.preventDefault();
    setError("");
    setFeedback("");

    if (
      !form.title.trim() ||
      !form.venue.trim() ||
      !form.organizer.trim() ||
      !form.date
    ) {
      setError("Complete all required fields.");
      return;
    }

    if (form.startTime >= form.endTime) {
      setError("End time must be later than start time.");
      return;
    }

    const capacity = Number(form.capacity);

    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) {
      setError("Capacity must be a whole number between 1 and 100000.");
      return;
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      venue: form.venue.trim(),
      organizer: form.organizer.trim(),
      capacity,
      registrationDeadline: form.registrationDeadline
        ? new Date(form.registrationDeadline).toISOString()
        : null,
    };

    setBusy(true);

    try {
      const endpoint = editingId
        ? `/api/events/${editingId}`
        : "/api/events";

      const result = await request(endpoint, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setEventModal(false);
      setEditingId(null);
      setFeedback(result.message || "Event saved successfully.");
      setPage(1);
      await loadEvents();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent(e) {
    if (!window.confirm(
      `Delete "${e.title}"? Events with active registrations cannot be deleted.`
    )) return;

    setBusy(true);
    setError("");
    setFeedback("");

    try {
      const result = await request(`/api/events/${e.id}`, {
        method: "DELETE",
      });

      if (viewId === e.id) setViewId(null);

      setFeedback(result.message || "Event deleted.");
      await loadEvents();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openDetails(e) {
    setViewId(e.id);
    setParticipants([]);
    setError("");
    await loadParticipants(e.id);
  }

  async function registerStudent(ev) {
    ev.preventDefault();

    if (!registering || !studentId.trim()) return;

    setBusy(true);
    setError("");
    setFeedback("");

    try {
      const result = await request(
        `/api/events/${registering.id}/registrations`,
        {
          method: "POST",
          body: JSON.stringify({ studentId: studentId.trim() }),
        }
      );

      setRegisterId(null);
      setStudentId("");
      setFeedback(result.message || "Student registered.");

      await loadEvents();

      if (viewId === registering.id) {
        await loadParticipants(registering.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeParticipant(p) {
    if (!viewing || !window.confirm("Remove this student's registration?")) return;

    setBusy(true);
    setError("");
    setFeedback("");

    try {
      const result = await request(
        `/api/events/${viewing.id}/registrations/${idOf(p)}`,
        { method: "DELETE" }
      );

      setFeedback(result.message || "Registration removed.");

      await Promise.all([
        loadParticipants(viewing.id),
        loadEvents(),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function downloadEvents() {
    exportCSV(
      "UniBee_Events.csv",
      [
        "Event ID", "Title", "Category", "Date", "Start Time",
        "End Time", "Venue", "Organizer", "Audience", "Capacity",
        "Registered", "Status", "Deadline", "Description",
      ],
      filtered.map(e => [
        e.id, e.title, e.category, e.date, e.startTime,
        e.endTime, e.venue, e.organizer, e.audience, e.capacity,
        e.registrationCount || 0, e.status,
        e.registrationDeadline, e.description,
      ])
    );
  }

  function downloadParticipants() {
    if (!viewing) return;

    exportCSV(
      `UniBee_${viewing.title.replace(/[^a-z0-9]+/gi, "_")}_Participants.csv`,
      ["Registration ID", "Student ID", "Name", "Email", "Registered At"],
      participants.map(p => [
        idOf(p),
        p.student?.studentId,
        p.student?.fullName,
        p.student?.email,
        p.registeredAt,
      ])
    );
  }

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Campus Operations
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Events Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage campus events, schedules and student registrations through MongoDB.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadEvents}
            disabled={loading || busy}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/20 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-40"
          >
            <RefreshCw size={17}/>
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
          >
            <CalendarPlus size={18}/>
            Create Event
          </button>
        </div>
      </header>

      {feedback && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={18}/>
          {feedback}
        </p>
      )}

      {error && !eventModal && !registerId && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18}/>
          {error}
        </p>
      )}

      {loading && (
        <p className="rounded-xl bg-[#EAF2E8] p-4 text-sm text-[#234E43]">
          Loading MongoDB events...
        </p>
      )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total Events"
          value={events.length}
          detail="MongoDB event records"
          icon={CalendarDays}
        />
        <Stat
          label="Upcoming Events"
          value={upcoming}
          detail="Published upcoming and today's events"
          icon={CalendarCheck}
        />
        <Stat
          label="Published Events"
          value={published}
          detail="Visible to eligible portal users"
          icon={CheckCircle2}
        />
        <Stat
          label="Registrations"
          value={totalRegistrations}
          detail="Active registrations across events"
          icon={Ticket}
        />
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-[#234E43]">
          <Filter size={19}/>
          Search & Filter Events
        </h2>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input
              type="search"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search event, venue, organizer..."
              className={`${FIELD} pl-10`}
            />
          </div>

          <select
            aria-label="Category"
            className={FIELD}
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>

          <select
            aria-label="Status"
            className={FIELD}
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>

          <select
            aria-label="Period"
            className={FIELD}
            value={periodFilter}
            onChange={e => {
              setPeriodFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Periods</option>
            {["Upcoming", "Today", "Past", "Completed", "Cancelled"].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {filtered.length} matching events
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              <RotateCcw size={15}/>
              Clear Filters
            </button>

            <button
              type="button"
              onClick={downloadEvents}
              className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              <Download size={15}/>
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* EVENTS TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Event", "Date & Time", "Venue", "Organizer",
                  "Registrations", "Status", "Actions",
                ].map(h => (
                  <th key={h} className="px-5 py-4 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visible.map(e => {
                const count = Number(e.registrationCount || 0);

                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#234E43]">
                        {e.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {e.category} · {e.audience}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-600">
                        {showDate(e.date)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {e.startTime} – {e.endTime}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {e.venue}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {e.organizer}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-[#234E43]">
                        {count}/{e.capacity}
                      </p>
                      <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#D9A536]"
                          style={{
                            width: `${Math.min(100, 100*count/Math.max(1,e.capacity))}%`,
                          }}
                        />
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <Badge status={e.status}/>
                      <p className="mt-2 text-xs text-slate-400">
                        {eventPeriod(e)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          title="View event and participants"
                          onClick={() => openDetails(e)}
                          className="rounded-lg bg-slate-100 p-2 text-[#234E43]"
                        >
                          <Eye size={17}/>
                        </button>

                        <button
                          type="button"
                          title="Edit event"
                          onClick={() => openEdit(e)}
                          className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43]"
                        >
                          <Pencil size={17}/>
                        </button>

                        <button
                          type="button"
                          title="Register student"
                          disabled={busy || !e.registrationOpen}
                          onClick={() => {
                            setRegisterId(e.id);
                            setStudentId("");
                            setError("");
                          }}
                          className="rounded-lg bg-emerald-50 p-2 text-emerald-700 disabled:opacity-30"
                        >
                          <UserPlus size={17}/>
                        </button>

                        <button
                          type="button"
                          title="Delete event"
                          disabled={busy}
                          onClick={() => deleteEvent(e)}
                          className="rounded-lg bg-rose-50 p-2 text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 size={17}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && visible.length === 0 && (
            <p className="py-14 text-center text-sm text-slate-500">
              No matching events found.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {pages} · {filtered.length} events
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous page"
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18}/>
            </button>

            <button
              type="button"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronRight size={18}/>
            </button>
          </div>
        </div>
      </section>

      {/* CREATE / EDIT EVENT MODAL */}
      {eventModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Event form"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#234E43]">
                {editingId ? "Edit Event" : "Create Event"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setEventModal(false)}
              >
                <X size={21}/>
              </button>
            </div>

            <form onSubmit={saveEvent} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">
                  Event Title *
                </span>
                <input
                  required
                  minLength={5}
                  maxLength={180}
                  value={form.title}
                  onChange={e => update("title", e.target.value)}
                  className={FIELD}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Category</span>
                  <select
                    value={form.category}
                    onChange={e => update("category", e.target.value)}
                    className={FIELD}
                  >
                    {CATEGORIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Audience</span>
                  <select
                    value={form.audience}
                    onChange={e => update("audience", e.target.value)}
                    className={FIELD}
                  >
                    {AUDIENCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Event Date *</span>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={e => update("date", e.target.value)}
                    className={FIELD}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Venue *</span>
                  <input
                    required
                    maxLength={200}
                    value={form.venue}
                    onChange={e => update("venue", e.target.value)}
                    className={FIELD}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Start Time *</span>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={e => update("startTime", e.target.value)}
                    className={FIELD}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">End Time *</span>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={e => update("endTime", e.target.value)}
                    className={FIELD}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Organizer *</span>
                  <input
                    required
                    maxLength={180}
                    value={form.organizer}
                    onChange={e => update("organizer", e.target.value)}
                    className={FIELD}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Registration Capacity *</span>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    required
                    value={form.capacity}
                    onChange={e => update("capacity", e.target.value)}
                    className={FIELD}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Registration Deadline</span>
                  <input
                    type="datetime-local"
                    value={form.registrationDeadline}
                    onChange={e => update("registrationDeadline", e.target.value)}
                    className={FIELD}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Status</span>
                  <select
                    value={form.status}
                    onChange={e => update("status", e.target.value)}
                    className={FIELD}
                  >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold">
                  Event Description
                </span>
                <textarea
                  rows={4}
                  maxLength={3000}
                  value={form.description}
                  onChange={e => update("description", e.target.value)}
                  className={FIELD}
                />
              </label>

              {error && (
                <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Save size={17}/>
                {busy ? "Saving..." : editingId ? "Save Changes" : "Create Event"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* ADMIN REGISTER STUDENT MODAL */}
      {registering && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Register student"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#234E43]">
                  Register Student
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {registering.title}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setRegisterId(null)}
              >
                <X size={21}/>
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Enter an existing Student ID linked to an active student login.
              Name/email-only registrations are not accepted.
            </p>

            <form onSubmit={registerStudent} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Student ID *</span>
                <input
                  required
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className={FIELD}
                  placeholder="Enter university student ID"
                />
              </label>

              {error && (
                <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                <UserPlus size={18}/>
                {busy ? "Registering..." : "Confirm Registration"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* EVENT DETAILS AND PARTICIPANTS */}
      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Event details"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18A28]">
                  Campus Event
                </p>
                <h2 className="mt-2 text-xl font-bold text-[#234E43]">
                  {viewing.title}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setViewId(null)}
              >
                <X size={21}/>
              </button>
            </div>

            <div className="mt-4">
              <Badge status={viewing.status}/>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-600">
              {viewing.description || "No description provided."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Category", viewing.category, Tag],
                ["Date", showDate(viewing.date), CalendarDays],
                ["Time", `${viewing.startTime} – ${viewing.endTime}`, Clock3],
                ["Venue", viewing.venue, MapPin],
                ["Organizer", viewing.organizer, Building2],
                ["Audience", viewing.audience, Users],
                ["Capacity", viewing.capacity, Ticket],
                ["Registered", viewing.registrationCount || 0, CheckCircle2],
                ["Available Seats", viewing.availableSeats ?? (viewing.capacity - (viewing.registrationCount || 0)), Ticket],
                ["Registration Deadline", viewing.registrationDeadline ? new Date(viewing.registrationDeadline).toLocaleString() : "Until event starts", Clock3],
              ].map(([name, value, Icon]) => (
                <div key={name} className="rounded-xl bg-[#F6F8F3] p-3">
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Icon size={15}/>
                    {name}
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[#234E43]">
                Registered Students
              </h3>

              <button
                type="button"
                onClick={downloadParticipants}
                disabled={participantsBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43]"
              >
                <Download size={15}/>
                Export Registrations
              </button>
            </div>

            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {participantsBusy && (
                <p className="text-sm text-slate-500">
                  Loading registrations...
                </p>
              )}

              {!participantsBusy && participants.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">
                  No active registrations found.
                </p>
              )}

              {participants.map(p => (
                <div
                  key={idOf(p)}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#F6F8F3] p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#234E43]">
                      {p.student?.fullName || "Student"}
                      <span className="font-normal text-slate-500">
                        {" "}({p.student?.studentId || "—"})
                      </span>
                    </p>
                    <p className="break-words text-xs text-slate-500">
                      {p.student?.email || "—"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    title="Remove registration"
                    onClick={() => removeParticipant(p)}
                    className="rounded-lg bg-rose-50 p-2 text-rose-600 disabled:opacity-40"
                  >
                    <UserMinus size={17}/>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setViewId(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white"
            >
              Close Details
            </button>
          </section>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        UniBee Admin Events · MongoDB Connected
      </p>
    </div>
  );
}
