
import { useEffect, useMemo, useState } from "react";
import { getAuthToken } from "../../services/authApi";
import {
  getLibraryBooks,
  getLibraryLoans,
  issueLibraryLoan,
  returnLibraryLoan,
  renewLibraryLoan,
  getLibraryStudents,
} from "../../services/libraryApi";

import {
  ArrowLeftRight,
  BookOpen,
  BookCheck,
  BookMarked,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock3,
  Download,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Save,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Database,
  Users,
  CalendarDays,
} from "lucide-react";

const BOOK_KEY = "unibee-admin-library-books-v1";
const LOAN_KEY = "unibee-admin-library-loans-v1";
const STUDENT_KEY = "unibee-admin-students-v1";
const REQUEST_KEY = "unibee-librarian-book-requests-v1";

const PAGE_SIZE = 10;
const DEFAULT_LOAN_DAYS = 14;

function readArray(key) {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return { rows: [], state: "missing" };
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return { rows: [], state: "invalid" };
    }

    return { rows: parsed, state: "available" };
  } catch {
    return { rows: [], state: "invalid" };
  }
}

function readSources() {
  return {
    books: readArray(BOOK_KEY),
    loans: readArray(LOAN_KEY),
    students: readArray(STUDENT_KEY),
    requests: readArray(REQUEST_KEY),
  };
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `loan-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function today() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + Number(days));

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? `${value}T12:00:00`
      : value
  );

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function activeLoan(loan) {
  return !loan.returnDate;
}

function loanStatus(loan, currentDate) {
  if (loan.returnDate) return "Returned";

  if (loan.dueDate && loan.dueDate < currentDate) {
    return "Overdue";
  }

  return "Borrowed";
}

function availableCopies(book, loans) {
  if (!book) return 0;

  const total = Math.max(0, Number(book.copies) || 0);

  const borrowed = loans.filter(
    (loan) =>
      String(loan.bookId) === String(book.id) &&
      activeLoan(loan)
  ).length;

  return Math.max(0, total - borrowed);
}

function csvExport(filename, headers, rows) {
  const safeCell = (value) => {
    let text = String(value ?? "");

    if (/^\s*[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map(safeCell).join(","))
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: "text/csv;charset=utf-8",
    })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const styles = {
    green: "bg-[#A6C1A4]/25 text-[#234E43]",
    gold: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    blue: "bg-sky-50 text-sky-700",
  };

  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold text-[#234E43]">
            {value}
          </p>
        </div>

        <div
          className={`rounded-xl p-3 ${
            styles[color] || styles.green
          }`}
        >
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {subtitle}
      </p>
    </article>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Borrowed: "bg-sky-50 text-sky-700",
    Returned: "bg-emerald-50 text-emerald-700",
    Overdue: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function IssueModal({
  form,
  setForm,
  books,
  students,
  loans,
  onSave,
  onClose,
}) {
  const selectedBook = books.find(
    (book) => String(book.id) === String(form.bookId)
  );

  const remaining = availableCopies(selectedBook, loans);

  function update(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function selectStudent(studentId) {
    const student = students.find(
      (item) =>
        String(item.studentId) === String(studentId)
    );

    setForm((previous) => ({
      ...previous,
      studentId,
      studentName: student
        ? student.name
        : previous.studentName,
    }));
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Issue library book"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              Issue Book
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Record a new student book loan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close issue form"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form
          id="librarian-issue-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
          className="flex-1 space-y-5 overflow-y-auto p-5"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Select Book *
            </span>

            <select
              required
              value={form.bookId}
              onChange={(event) =>
                update("bookId", event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
            >
              <option value="">Choose a library book</option>

              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} — {availableCopies(book, loans)} available
                </option>
              ))}
            </select>
          </label>

          {selectedBook && (
            <div
              className={`rounded-xl p-4 text-sm ${
                remaining > 0 &&
                String(selectedBook.status).toLowerCase() === "active"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              <p className="font-bold">
                {selectedBook.title}
              </p>

              <p className="mt-1 text-xs">
                Total Copies: {Number(selectedBook.copies) || 0}
                {" · "}
                Available: {remaining}
              </p>

              {remaining === 0 && (
                <p className="mt-2 text-xs font-semibold">
                  This book is currently out of stock.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Student ID *
              </span>

              <input
                required
                list="librarian-loan-students"
                value={form.studentId}
                onChange={(event) =>
                  selectStudent(event.target.value)
                }
                placeholder="Enter Student ID"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              />

              <datalist id="librarian-loan-students">
                {students.map((student) => (
                  <option
                    key={student.id || student.studentId}
                    value={student.studentId}
                    label={student.name}
                  />
                ))}
              </datalist>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Student Name *
              </span>

              <input
                required
                value={form.studentName}
                onChange={(event) =>
                  update("studentName", event.target.value)
                }
                placeholder="Student full name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Issue Date *
              </span>

              <input
                type="date"
                required
                max={today()}
                value={form.issueDate}
                onChange={(event) => {
                  const issueDate = event.target.value;

                  setForm((previous) => ({
                    ...previous,
                    issueDate,
                    dueDate: issueDate
                      ? addDays(issueDate, DEFAULT_LOAN_DAYS)
                      : "",
                  }));
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Due Date *
              </span>

              <input
                type="date"
                required
                min={form.issueDate}
                value={form.dueDate}
                onChange={(event) =>
                  update("dueDate", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Loan Notes
            </span>

            <textarea
              rows={3}
              maxLength={1000}
              value={form.notes}
              onChange={(event) =>
                update("notes", event.target.value)
              }
              placeholder="Optional borrowing notes..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-[#234E43]"
            />
          </label>

          <div className="rounded-xl bg-[#F6F8F3] p-4 text-xs leading-6 text-slate-600">
            Each issue record represents one physical copy.
            To issue two copies, create two separate loan records.
          </div>
        </form>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="librarian-issue-form"
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
          >
            <BookMarked size={17} />
            Issue Book
          </button>
        </div>
      </div>
    </div>
  );
}

function LoanDetails({
  loan,
  onClose,
  onReturn,
  onExtend,
}) {
  const [newDueDate, setNewDueDate] = useState(
    loan.dueDate || ""
  );

  const [returnDate, setReturnDate] = useState(today());

  const currentStatus = loanStatus(loan, today());

  const fields = [
    ["Loan ID", loan.id],
    ["Book", loan.bookTitle],
    ["Student ID", loan.studentId],
    ["Student Name", loan.studentName],
    ["Issued", formatDate(loan.issueDate)],
    ["Due", formatDate(loan.dueDate)],
    ["Returned", formatDate(loan.returnDate)],
    ["Status", currentStatus],
    ["Notes", loan.notes || "—"],
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Loan details"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl md:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
              Circulation Record
            </p>

            <h2 className="mt-2 text-xl font-bold text-[#234E43]">
              Loan Details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close loan details"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-[#F6F8F3] p-5">
          <BookOpen size={30} className="text-[#234E43]" />

          <p className="mt-3 text-lg font-bold text-[#234E43]">
            {loan.bookTitle}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Borrowed by {loan.studentName}
          </p>

          <div className="mt-3">
            <StatusBadge status={currentStatus} />
          </div>
        </div>

        <div className="mt-5 divide-y divide-slate-100">
          {fields.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-wrap justify-between gap-3 py-3"
            >
              <span className="text-xs text-slate-500">
                {label}
              </span>

              <span className="max-w-xs break-words text-right text-xs font-semibold text-[#234E43]">
                {value ?? "—"}
              </span>
            </div>
          ))}
        </div>

        {!loan.returnDate && (
          <>
            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-[#234E43]">
                Extend Loan Due Date
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Choose a later date to extend this loan.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="date"
                  value={newDueDate}
                  min={addDays(
                    loan.dueDate > today()
                      ? loan.dueDate
                      : today(),
                    1
                  )}
                  onChange={(event) =>
                    setNewDueDate(event.target.value)
                  }
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#234E43]"
                />

                <button
                  type="button"
                  onClick={() => onExtend(newDueDate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/20 px-4 py-3 text-sm font-semibold text-[#234E43]"
                >
                  <CalendarClock size={16} />
                  Extend
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-100 p-4">
              <h3 className="text-sm font-bold text-[#234E43]">
                Return This Book
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Confirm when the physical book was received.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="date"
                  min={loan.issueDate}
                  max={today()}
                  value={returnDate}
                  onChange={(event) =>
                    setReturnDate(event.target.value)
                  }
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#234E43]"
                />

                <button
                  type="button"
                  onClick={() => onReturn(returnDate)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
                >
                  <BookCheck size={17} />
                  Confirm Return
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LibrarianCirculation() {
  const [sources, setSources] = useState({
    books: { rows: [], state: "loading" },
    loans: { rows: [], state: "loading" },
    students: { rows: [], state: "loading" },
    requests: { rows: [], state: "loading" },
  });
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [issueOpen, setIssueOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);

  const [issueForm, setIssueForm] = useState({
    bookId: "",
    studentId: "",
    studentName: "",
    issueDate: today(),
    dueDate: addDays(today(), DEFAULT_LOAN_DAYS),
    notes: "",
  });

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    const token = getAuthToken();
    if (!token) {
      setDemoMode(true);
      setSources(readSources());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [books, loans, students] = await Promise.all([
        getLibraryBooks(),
        getLibraryLoans(),
        getLibraryStudents(),
      ]);

      setSources({
        books: { rows: books, state: "available" },
        loans: {
  rows: loans.map((loan) => ({
    ...loan,
    bookId: String(loan.bookId || loan.book || ""),
  })),
  state: "available",
},
        students: { rows: students, state: "available" },
        requests: { rows: [], state: "available" },
      });
      setDemoMode(false);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load circulation records from MongoDB.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const books = sources.books.rows;
  const loans = sources.loans.rows;
  const students = sources.students.rows;

  const currentDate = today();

  const enrichedLoans = useMemo(
    () =>
      loans.map((loan) => {
        const book = books.find(
          (item) =>
            String(item.id) === String(loan.bookId)
        );

        const student = students.find(
          (item) =>
            String(item.studentId) ===
            String(loan.studentId)
        );

        return {
          ...loan,
          bookTitle:
            book?.title ||
            loan.bookTitle ||
            loan.bookId ||
            "Unknown Book",
          studentName:
            student?.name ||
            loan.studentName ||
            loan.studentId ||
            "Unknown Student",
          calculatedStatus: loanStatus(
            loan,
            currentDate
          ),
        };
      }),
    [loans, books, students, currentDate]
  );

  const stats = useMemo(
    () => ({
      total: loans.length,
      borrowed: enrichedLoans.filter(
        (loan) => loan.calculatedStatus === "Borrowed"
      ).length,
      overdue: enrichedLoans.filter(
        (loan) => loan.calculatedStatus === "Overdue"
      ).length,
      returned: enrichedLoans.filter(
        (loan) => loan.calculatedStatus === "Returned"
      ).length,
    }),
    [loans, enrichedLoans]
  );

  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return enrichedLoans
      .filter((loan) => {
        const searchable = [
          loan.id,
          loan.bookTitle,
          loan.studentId,
          loan.studentName,
          loan.bookId,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

        const matchesStatus =
          filter === "All" ||
          loan.calculatedStatus === filter;

        return searchable && matchesStatus;
      })
      .sort((a, b) =>
        String(b.issueDate || "").localeCompare(
          String(a.issueDate || "")
        )
      );
  }, [enrichedLoans, search, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLoans.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleLoans = filteredLoans.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const selectedLoan = enrichedLoans.find(
    (loan) => loan.id === viewingId
  );

  const catalogReady =
    sources.books.state === "available";

  const loansValid =
    sources.loans.state !== "invalid";

  function refreshData() {
    if (demoMode) {
      setSources(readSources());
      setFeedback("Circulation records refreshed.");
      setError("");
      return;
    }
    loadData();
    setFeedback("Circulation refreshed from MongoDB.");
  }

  function persistLoans(next, successMessage) {
    try {
      localStorage.setItem(
        LOAN_KEY,
        JSON.stringify(next)
      );

      setSources((previous) => ({
        ...previous,
        loans: {
          rows: next,
          state: "available",
        },
      }));

      setFeedback(successMessage);
      setError("");

      return true;
    } catch {
      setError("Unable to save borrowing records.");
      setFeedback("");

      return false;
    }
  }

  function openIssue() {
    setIssueForm({
      bookId: "",
      studentId: "",
      studentName: "",
      issueDate: today(),
      dueDate: addDays(today(), DEFAULT_LOAN_DAYS),
      notes: "",
    });

    setError("");
    setIssueOpen(true);
  }

  async function issueBook() {
    const book = books.find(
      (item) =>
        String(item.id) === String(issueForm.bookId)
    );

    const studentId = String(
      issueForm.studentId || ""
    ).trim();

    const studentName = String(
      issueForm.studentName || ""
    ).trim();

    if (!book) {
      setError("Select a valid book from the catalog.");
      setIssueOpen(false);
      return;
    }

    if (
      String(book.status || "").toLowerCase() !==
      "active"
    ) {
      setError("Inactive books cannot be issued.");
      setIssueOpen(false);
      return;
    }

    if (!studentId || !studentName) {
      setError(
        "Student ID and Student Name are required."
      );
      setIssueOpen(false);
      return;
    }

    if (demoMode) {
      if (availableCopies(book, loans) < 1) {
        setError(
          "This book is out of stock. It cannot be issued."
        );
        setIssueOpen(false);
        return;
      }

      const duplicate = loans.some(
        (loan) =>
          String(loan.studentId).toLowerCase() ===
            studentId.toLowerCase() &&
          String(loan.bookId) === String(book.id) &&
          activeLoan(loan)
      );

      if (duplicate) {
        setError(
          "This student already has an active loan for this book."
        );
        setIssueOpen(false);
        return;
      }

      const record = {
        id: createId(),
        bookId: book.id,
        studentId,
        studentName,
        issueDate: issueForm.issueDate,
        dueDate: issueForm.dueDate,
        returnDate: "",
        notes: String(issueForm.notes || "").trim(),
        createdAt: new Date().toISOString(),
      };

      if (
        persistLoans(
          [record, ...loans],
          `"${book.title}" issued to ${studentName}.`
        )
      ) {
        setIssueOpen(false);
        setPage(1);
      }
      return;
    }

    // LIVE MONGODB MODE
    try {
      const loanData = {
        bookId: book.id,
        studentId,
        studentName,
        issueDate: issueForm.issueDate,
        dueDate: issueForm.dueDate,
        notes: issueForm.notes,
      };

      const created = await issueLibraryLoan(loanData);
      setSources((prev) => ({
        ...prev,
        loans: {
          rows: [created, ...prev.loans.rows],
          state: "available",
        },
      }));
      setFeedback(`"${book.title}" issued to ${studentName} and saved to MongoDB.`);
      setIssueOpen(false);
      setPage(1);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to issue book in MongoDB.");
    }
  }

  async function returnBook(loan, returnDate) {
    if (loan.returnDate) {
      setError("This book has already been returned.");
      return;
    }

    if (
      !returnDate ||
      returnDate < loan.issueDate ||
      returnDate > today()
    ) {
      setError(
        "Return date must be between the issue date and today."
      );
      return;
    }

    if (
      !window.confirm(
        `Confirm return of "${loan.bookTitle}" from ${loan.studentName}?`
      )
    ) {
      return;
    }

    if (demoMode) {
      const updated = loans.map((item) =>
        item.id === loan.id
          ? {
              ...item,
              returnDate,
              updatedAt: new Date().toISOString(),
            }
          : item
      );

      if (
        persistLoans(
          updated,
          `"${loan.bookTitle}" returned successfully.`
        )
      ) {
        setViewingId(null);
      }
      return;
    }

    // LIVE MONGODB MODE
    try {
      const updated = await returnLibraryLoan(loan.id, { returnDate, notes: loan.notes });
      setSources((prev) => ({
        ...prev,
        loans: {
          rows: prev.loans.rows.map((l) => (l.id === loan.id ? updated : l)),
          state: "available",
        },
      }));
      setViewingId(null);
      setFeedback(`"${loan.bookTitle}" returned successfully in MongoDB.`);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to record book return in MongoDB.");
    }
  }

  async function extendLoan(loan, nextDate) {
    if (loan.returnDate) {
      setError("Returned books cannot be extended.");
      return;
    }

    const minimumDate =
      loan.dueDate > today() ? loan.dueDate : today();

    if (!nextDate || nextDate <= minimumDate) {
      setError(
        "The new due date must be later than the current due date and today."
      );
      return;
    }

    if (demoMode) {
      const updated = loans.map((item) =>
        item.id === loan.id
          ? {
              ...item,
              dueDate: nextDate,
              updatedAt: new Date().toISOString(),
            }
          : item
      );

      if (
        persistLoans(
          updated,
          `Due date extended to ${formatDate(nextDate)}.`
        )
      ) {
        setViewingId(null);
      }
      return;
    }

    // LIVE MONGODB MODE
    try {
      const updated = await renewLibraryLoan(loan.id, 14);
      setSources((prev) => ({
        ...prev,
        loans: {
          rows: prev.loans.rows.map((l) => (l.id === loan.id ? updated : l)),
          state: "available",
        },
      }));
      setViewingId(null);
      setFeedback(`Due date extended in MongoDB.`);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to extend loan in MongoDB.");
    }
  }

  function exportRecords() {
    csvExport(
      "UniBee_Library_Circulation.csv",
      [
        "Loan ID",
        "Book ID",
        "Book Title",
        "Student ID",
        "Student Name",
        "Issue Date",
        "Due Date",
        "Return Date",
        "Status",
        "Notes",
      ],
      filteredLoans.map((loan) => [
        loan.id,
        loan.bookId,
        loan.bookTitle,
        loan.studentId,
        loan.studentName,
        loan.issueDate,
        loan.dueDate,
        loan.returnDate,
        loan.calculatedStatus,
        loan.notes,
      ])
    );

    setFeedback("Circulation records exported as CSV.");
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Library Operations
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[#234E43] md:text-3xl">
              Issue & Return
            </h1>

            {demoMode ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                <AlertCircle size={14} />
                Demo Mode
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Database size={14} />
                Live MongoDB
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Manage borrowed books, return deadlines,
            overdue records and circulation history.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportRecords}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={openIssue}
            disabled={!catalogReady || !loansValid}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={18} />
            Issue Book
          </button>
        </div>
      </section>

      {/* DATA NOTICE */}
      {(!catalogReady ||
        sources.loans.state !== "available") && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
          <Database size={19} className="mt-0.5 shrink-0" />

          <p>
            {!catalogReady
              ? "The book catalog is not available. Save books from Librarian Books first. "
              : ""}
            {sources.loans.state === "missing"
              ? "No borrowing history is saved yet. The first issued book will create it."
              : sources.loans.state === "invalid"
              ? "The loan data is invalid and must be corrected before recording new loans."
              : ""}
          </p>
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </p>
      )}

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Loan Records"
          value={sources.loans.state === "invalid" ? "—" : stats.total}
          subtitle="Complete borrowing history"
          icon={ArrowLeftRight}
          color="blue"
        />

        <StatCard
          title="Currently Borrowed"
          value={sources.loans.state === "invalid" ? "—" : stats.borrowed}
          subtitle="Active loans within due date"
          icon={BookMarked}
          color="green"
        />

        <StatCard
          title="Overdue Loans"
          value={sources.loans.state === "invalid" ? "—" : stats.overdue}
          subtitle="Active loans past the due date"
          icon={AlertTriangle}
          color="red"
        />

        <StatCard
          title="Returned Books"
          value={sources.loans.state === "invalid" ? "—" : stats.returned}
          subtitle="Completed borrowing records"
          icon={BookCheck}
          color="gold"
        />
      </section>

      {/* QUICK NOTICE */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#234E43] p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 p-3 text-[#D9A536]">
            <CalendarClock size={25} />
          </div>

          <div>
            <p className="font-bold">
              Default Loan Duration
            </p>

            <p className="mt-1 text-sm text-white/70">
              New loans default to {DEFAULT_LOAN_DAYS} days.
              Librarians can choose another due date.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openIssue}
          disabled={!catalogReady || !loansValid}
          className="rounded-xl bg-[#D9A536] px-5 py-3 text-sm font-bold text-[#234E43] disabled:opacity-40"
        >
          Issue a Book
        </button>
      </section>

      {/* LOAN TABLE */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#234E43]">
                Circulation Records
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Track student borrowing and returns
              </p>
            </div>

            <span className="rounded-full bg-[#F6F8F3] px-3 py-1.5 text-xs font-semibold text-[#234E43]">
              {filteredLoans.length} Records
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search books, students or loan IDs..."
                aria-label="Search circulation records"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
              />
            </div>

            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter borrowing status"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Borrowed">Borrowed</option>
              <option value="Overdue">Overdue</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">
                  Book
                </th>
                <th className="px-5 py-4 font-semibold">
                  Student
                </th>
                <th className="px-5 py-4 font-semibold">
                  Issue Date
                </th>
                <th className="px-5 py-4 font-semibold">
                  Due Date
                </th>
                <th className="px-5 py-4 font-semibold">
                  Return Date
                </th>
                <th className="px-5 py-4 font-semibold">
                  Status
                </th>
                <th className="px-5 py-4 text-right font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleLoans.map((loan) => (
                <tr
                  key={loan.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="max-w-[220px] truncate text-sm font-bold text-[#234E43]">
                      {loan.bookTitle}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {loan.bookId}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-700">
                      {loan.studentName}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {loan.studentId}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-600">
                    {formatDate(loan.issueDate)}
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-600">
                    {formatDate(loan.dueDate)}
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-600">
                    {formatDate(loan.returnDate)}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={loan.calculatedStatus} />
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingId(loan.id);
                        setError("");
                      }}
                      aria-label={`View loan for ${loan.bookTitle}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#A6C1A4]/25 px-3 py-2 text-xs font-semibold text-[#234E43]"
                    >
                      <Eye size={16} />
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visibleLoans.length === 0 && (
            <div className="flex flex-col items-center justify-center p-14 text-center">
              <BookOpen size={34} className="text-[#A6C1A4]" />

              <p className="mt-3 text-sm font-semibold text-[#234E43]">
                No circulation records found
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Issue a book or adjust the search filters.
              </p>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} ·{" "}
            {filteredLoans.length} records
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous page"
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* FRONTEND NOTE */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> Circulation records
        are saved using the Admin Library loan storage key.
        Issuing a book creates an active loan, reducing
        calculated available copies by one. Returning it
        closes the loan and restores availability. This
        demo does not yet enforce a student's real identity,
        apply fines or synchronize data across devices.
      </div>

      {/* ISSUE MODAL */}
      {issueOpen && (
        <IssueModal
          form={issueForm}
          setForm={setIssueForm}
          books={books}
          students={students}
          loans={loans}
          onSave={issueBook}
          onClose={() => setIssueOpen(false)}
        />
      )}

      {/* LOAN DETAILS */}
      {selectedLoan && (
        <LoanDetails
          key={selectedLoan.id}
          loan={selectedLoan}
          onClose={() => setViewingId(null)}
          onReturn={(date) => returnBook(selectedLoan, date)}
          onExtend={(date) => extendLoan(selectedLoan, date)}
        />
      )}
    </div>
  );
}
