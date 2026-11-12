
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList, Plus, Search, RefreshCw, Download,
  Check, X, Eye, BookOpen, Clock3, CheckCircle2,
  XCircle, AlertCircle, ChevronLeft, ChevronRight,
  Database
} from "lucide-react";

import {
  getLibraryBooks,
  getLibraryRequests,
  createLibraryRequest,
  updateLibraryRequestStatus,
} from "../../services/libraryApi";

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  studentId: "",
  studentName: "",
  bookId: "",
  quantity: 1,
  reason: "",
};

function getId(item) {
  return String(item?.id || item?._id || "");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function StatusBadge({ status }) {
  const colors = {
    Pending: "bg-amber-50 text-amber-800",
    Approved: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-rose-50 text-rose-700",
    Issued: "bg-blue-50 text-blue-700",
    Cancelled: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
      colors[status] || "bg-slate-100 text-slate-600"
    }`}>
      {status || "Unknown"}
    </span>
  );
}

function MetricCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#234E43]">
            {value}
          </p>
        </div>
        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function exportCSV(requests) {
  const headers = [
    "Student ID",
    "Student Name",
    "Book Title",
    "Quantity",
    "Status",
    "Reason",
    "Created At",
  ];

  const rows = requests.map((request) => [
    request.studentId,
    request.studentName,
    request.bookTitle,
    request.quantity,
    request.status,
    request.reason,
    request.createdAt,
  ]);

  const safe = (value) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+\-@]/.test(text)) {
      text = "'" + text;
    }
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map(safe).join(","))
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "UniBee_Library_Requests.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function LibrarianRequests() {
  const [requests, setRequests] = useState([]);
  const [books, setBooks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [viewing, setViewing] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [reviewNote, setReviewNote] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [requestData, bookData] = await Promise.all([
        getLibraryRequests(),
        getLibraryBooks(),
      ]);

      setRequests(
        Array.isArray(requestData) ? requestData : []
      );

      setBooks(
        Array.isArray(bookData) ? bookData : []
      );
    } catch (err) {
      setError(
        err.message || "Failed to load library requests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(
      (item) => item.status === "Pending"
    ).length,
    approved: requests.filter(
      (item) => item.status === "Approved"
    ).length,
    rejected: requests.filter(
      (item) => item.status === "Rejected"
    ).length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((item) => {
      const matchSearch = [
        item.studentId,
        item.studentName,
        item.bookTitle,
        item.status,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

      const matchStatus =
        statusFilter === "All" ||
        item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [requests, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleRequests = filteredRequests.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  async function handleCreate(event) {
    event.preventDefault();

    const studentId = form.studentId.trim();
    const studentName = form.studentName.trim();

    if (!studentId || !studentName || !form.bookId) {
      setError(
        "Student ID, Student Name and Book are required."
      );
      return;
    }

    const quantity = Number(form.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    const book = books.find(
      (item) => getId(item) === form.bookId
    );

    if (!book) {
      setError("Please select a valid book.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createLibraryRequest({
        studentId,
        studentName,
        bookId: form.bookId,
        bookTitle: book.title,
        quantity,
        reason: form.reason.trim(),
      });

      setFeedback("Book request saved to MongoDB.");
      setAddOpen(false);
      setForm({ ...EMPTY_FORM });
      setPage(1);

      await loadData();
    } catch (err) {
      setError(
        err.message || "Failed to create book request."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(request, status) {
    const id = getId(request);

    if (!id) {
      setError("Request ID is missing.");
      return;
    }

    if (request.status !== "Pending") {
      setError("Only pending requests can be reviewed.");
      return;
    }

    if (
      status === "Rejected" &&
      !reviewNote.trim()
    ) {
      setError("Please write a reason for rejection.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateLibraryRequestStatus(
        id,
        status,
        reviewNote.trim()
      );

      setFeedback(`Request ${status.toLowerCase()} successfully.`);
      setViewing(null);
      setReviewNote("");

      await loadData();
    } catch (err) {
      setError(
        err.message || "Failed to update request."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]";

  const buttonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50";

  return (
    <div className="space-y-6 p-4 md:p-6">

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="text-[#234E43]" />
            <h1 className="text-2xl font-bold text-[#234E43]">
              Book Requests
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Manage student book reservations using MongoDB.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading || saving}
            className={`${buttonClass} border border-slate-200 bg-white text-slate-700`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => exportCSV(filteredRequests)}
            className={`${buttonClass} border border-slate-200 bg-white text-slate-700`}
          >
            <Download size={16} />
            Export
          </button>

          <button
            type="button"
            onClick={() => {
              setError("");
              setForm({ ...EMPTY_FORM });
              setAddOpen(true);
            }}
            className={`${buttonClass} bg-[#234E43] text-white`}
          >
            <Plus size={16} />
            New Request
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Database size={14} />
        Data source: UniBee MongoDB API
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <Check size={18} />
          {feedback}
          <button
            type="button"
            onClick={() => setFeedback("")}
            className="ml-auto"
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Requests"
          value={stats.total}
          icon={ClipboardList}
        />
        <MetricCard
          title="Pending"
          value={stats.pending}
          icon={Clock3}
        />
        <MetricCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={17}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search student or book..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className={inputClass + " max-w-[180px]"}
          >
            {[
              "All",
              "Pending",
              "Approved",
              "Rejected",
              "Issued",
              "Cancelled",
            ].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Student",
                  "Book",
                  "Quantity",
                  "Requested",
                  "Status",
                  "Action",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-4">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">
                    Loading from MongoDB...
                  </td>
                </tr>
              ) : visibleRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">
                    No requests found.
                  </td>
                </tr>
              ) : visibleRequests.map((request) => (
                <tr key={getId(request)} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">
                      {request.studentName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {request.studentId}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-[#234E43]" />
                      <span>{request.bookTitle}</span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {request.quantity}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {formatDate(request.createdAt)}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={request.status} />
                  </td>

                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setViewing(request);
                        setReviewNote(request.notes || "");
                      }}
                      className="rounded-lg border border-slate-200 p-2 text-[#234E43] hover:bg-slate-50"
                      title="View request"
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm text-slate-500">
          <span>
            Showing {visibleRequests.length} of {filteredRequests.length}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#234E43]">
                Create Book Request
              </h2>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
              >
                <X size={22} />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
              <label className="block text-sm font-medium">
                Student ID *
                <input
                  required
                  value={form.studentId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      studentId: event.target.value,
                    })
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Enter registered Student ID"
                />
              </label>

              <label className="block text-sm font-medium">
                Student Name *
                <input
                  required
                  value={form.studentName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      studentName: event.target.value,
                    })
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Enter student name"
                />
              </label>

              <label className="block text-sm font-medium">
                Select Book *
                <select
                  required
                  value={form.bookId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      bookId: event.target.value,
                    })
                  }
                  className={`${inputClass} mt-2`}
                >
                  <option value="">Choose a book</option>
                  {books.map((book) => (
                    <option key={getId(book)} value={getId(book)}>
                      {book.title} — {book.author}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Quantity *
                <input
                  required
                  type="number"
                  min="1"
                  max="100"
                  value={form.quantity}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      quantity: event.target.value,
                    })
                  }
                  className={`${inputClass} mt-2`}
                />
              </label>

              <label className="block text-sm font-medium">
                Reason / Notes
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      reason: event.target.value,
                    })
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Optional"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setAddOpen(false)}
                className={`${buttonClass} border border-slate-200`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`${buttonClass} bg-[#234E43] text-white`}
              >
                <Plus size={16} />
                {saving ? "Saving..." : "Save to MongoDB"}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#234E43]">
                Request Details
              </h2>
              <button
                type="button"
                onClick={() => setViewing(null)}
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <p><b>Student:</b> {viewing.studentName}</p>
              <p><b>Student ID:</b> {viewing.studentId}</p>
              <p><b>Book:</b> {viewing.bookTitle}</p>
              <p><b>Quantity:</b> {viewing.quantity}</p>
              <p><b>Reason:</b> {viewing.reason || "—"}</p>
              <p><b>Created:</b> {formatDate(viewing.createdAt)}</p>
              <p>
                <b>Status:</b>{" "}
                <StatusBadge status={viewing.status} />
              </p>
            </div>

            {viewing.status === "Pending" && (
              <>
                <label className="mt-5 block text-sm font-medium">
                  Review Note
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={(event) =>
                      setReviewNote(event.target.value)
                    }
                    className={`${inputClass} mt-2`}
                    placeholder="Required when rejecting"
                  />
                </label>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      handleStatus(viewing, "Approved")
                    }
                    className={`${buttonClass} bg-green-700 text-white`}
                  >
                    <Check size={16} />
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      handleStatus(viewing, "Rejected")
                    }
                    className={`${buttonClass} bg-red-600 text-white`}
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setViewing(null)}
              className={`${buttonClass} mt-5 w-full border border-slate-200`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
