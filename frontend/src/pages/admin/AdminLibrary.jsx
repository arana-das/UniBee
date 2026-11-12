
import { useMemo, useState } from "react";
import {
  BookOpen,
  BookPlus,
  LibraryBig,
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ArrowLeftRight,
  CalendarDays,
  BookMarked,
  RotateCw,
} from "lucide-react";

const BOOK_KEY = "unibee-admin-library-books-v1";
const LOAN_KEY = "unibee-admin-library-loans-v1";
const STUDENT_KEY = "unibee-admin-students-v1";
const PAGE_SIZE = 8;

const CATEGORIES = [
  "Computer Science",
  "Engineering",
  "Business",
  "Economics",
  "Literature",
  "Science",
  "Mathematics",
  "General",
];

const SAMPLE_BOOKS = [
  ["BK-001", "Database System Concepts", "Abraham Silberschatz", "Computer Science", "9780073523323", 12, "Shelf A-01"],
  ["BK-002", "Software Engineering", "Ian Sommerville", "Computer Science", "9780133943030", 10, "Shelf A-02"],
  ["BK-003", "Computer Networking: A Top-Down Approach", "James Kurose", "Computer Science", "9780136681557", 8, "Shelf A-03"],
  ["BK-004", "Artificial Intelligence: A Modern Approach", "Stuart Russell", "Computer Science", "9780134610993", 7, "Shelf A-04"],
  ["BK-005", "Principles of Management", "Stephen Robbins", "Business", "9780134527604", 15, "Shelf B-01"],
  ["BK-006", "Microeconomics", "N. Gregory Mankiw", "Economics", "9780357722862", 9, "Shelf B-02"],
  ["BK-007", "Engineering Mechanics: Statics", "R. C. Hibbeler", "Engineering", "9780133918922", 11, "Shelf C-01"],
  ["BK-008", "Introduction to Algorithms", "Thomas H. Cormen", "Computer Science", "9780262046305", 6, "Shelf A-05"],
  ["BK-009", "English Grammar in Use", "Raymond Murphy", "Literature", "9781108457651", 14, "Shelf D-01"],
].map(([id, title, author, category, isbn, copies, location]) => ({
  id,
  title,
  author,
  category,
  isbn,
  copies,
  location,
  publisher: "",
  year: "",
  description: "",
  status: "Active",
}));

const SAMPLE_STUDENTS = [
  { studentId: "UB-0001", name: "Ayesha Rahman" },
  { studentId: "UB-0002", name: "Tanvir Ahmed" },
  { studentId: "UB-0003", name: "Nusrat Jahan" },
  { studentId: "UB-0004", name: "Mahmud Hasan" },
  { studentId: "UB-0005", name: "Sadia Islam" },
  { studentId: "UB-0006", name: "Fahim Chowdhury" },
];

const SAMPLE_LOANS = [
  {
    id: "LOAN-001",
    bookId: "BK-001",
    studentId: "UB-0001",
    issueDate: "2026-10-20",
    dueDate: "2026-11-03",
    returnDate: "",
  },
  {
    id: "LOAN-002",
    bookId: "BK-002",
    studentId: "UB-0002",
    issueDate: "2026-10-15",
    dueDate: "2026-10-29",
    returnDate: "",
  },
  {
    id: "LOAN-003",
    bookId: "BK-005",
    studentId: "UB-0004",
    issueDate: "2026-10-05",
    dueDate: "2026-10-19",
    returnDate: "2026-10-18",
  },
  {
    id: "LOAN-004",
    bookId: "BK-008",
    studentId: "UB-0003",
    issueDate: "2026-10-22",
    dueDate: "2026-11-05",
    returnDate: "",
  },
];

const EMPTY_BOOK = {
  title: "",
  author: "",
  category: "General",
  isbn: "",
  copies: 1,
  location: "",
  publisher: "",
  year: "",
  description: "",
  status: "Active",
};

function today() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function readArray(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function createId(prefix) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loanStatus(loan) {
  if (loan.returnDate) return "Returned";
  if (loan.dueDate < today()) return "Overdue";
  return "Borrowed";
}

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-emerald-50 text-emerald-700",
    Inactive: "bg-slate-100 text-slate-600",
    Borrowed: "bg-sky-50 text-sky-700",
    Returned: "bg-emerald-50 text-emerald-700",
    Overdue: "bg-rose-50 text-rose-700",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || styles.Inactive}`}>
      {status}
    </span>
  );
}

function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold text-[#234E43]">{value}</p>
        </div>
        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function exportCSV(filename, headers, rows) {
  const quote = (value) => {
    let text = String(value ?? "");
    if (/^\s*[=+\-@\t\r]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = "\uFEFF" +
    [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]";

export default function AdminLibrary() {
  const [books, setBooks] = useState(() =>
    readArray(BOOK_KEY, SAMPLE_BOOKS)
  );
  const [loans, setLoans] = useState(() =>
    readArray(LOAN_KEY, SAMPLE_LOANS)
  );
  const [students] = useState(() =>
    readArray(STUDENT_KEY, SAMPLE_STUDENTS)
  );

  const [tab, setTab] = useState("Books");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [bookModal, setBookModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState(null);
  const [bookForm, setBookForm] = useState(EMPTY_BOOK);
  const [viewingBook, setViewingBook] = useState(null);

  const [issueModal, setIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    bookId: "",
    studentId: "",
    issueDate: today(),
    dueDate: addDays(today(), 14),
  });
  const [viewingLoan, setViewingLoan] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const activeLoanCount = (bookId) =>
    loans.filter((loan) => loan.bookId === bookId && !loan.returnDate).length;

  const availableCopies = (book) =>
    Math.max(0, Number(book.copies || 0) - activeLoanCount(book.id));

  const bookRows = useMemo(() =>
    books.map((book) => ({
      ...book,
      borrowed: loans.filter(
        (loan) => loan.bookId === book.id && !loan.returnDate
      ).length,
    })),
    [books, loans]
  );

  const enrichedLoans = useMemo(() =>
    loans.map((loan) => ({
      ...loan,
      bookTitle: books.find((b) => b.id === loan.bookId)?.title || "Unknown Book",
      studentName:
        students.find((s) => s.studentId === loan.studentId)?.name ||
        "Unknown Student",
      status: loanStatus(loan),
    })),
    [loans, books, students]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (tab === "Books") {
      return bookRows.filter((book) =>
        [book.id, book.title, book.author, book.isbn, book.location]
          .some((value) => String(value || "").toLowerCase().includes(q)) &&
        (categoryFilter === "All" || book.category === categoryFilter) &&
        (statusFilter === "All" || book.status === statusFilter)
      );
    }

    return enrichedLoans.filter((loan) =>
      [loan.id, loan.bookTitle, loan.studentId, loan.studentName]
        .some((value) => String(value || "").toLowerCase().includes(q)) &&
      (statusFilter === "All" || loan.status === statusFilter)
    );
  }, [tab, bookRows, enrichedLoans, search, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const totalCopies = books.reduce(
    (sum, book) => sum + Number(book.copies || 0), 0
  );
  const borrowedCopies = loans.filter((loan) => !loan.returnDate).length;
  const overdueLoans = enrichedLoans.filter(
    (loan) => loan.status === "Overdue"
  ).length;

  function saveBooks(next, message) {
    try {
      localStorage.setItem(BOOK_KEY, JSON.stringify(next));
      setBooks(next);
      setFeedback(message);
      setError("");
      return true;
    } catch {
      setError("Unable to save book records in browser storage.");
      return false;
    }
  }

  function saveLoans(next, message) {
    try {
      localStorage.setItem(LOAN_KEY, JSON.stringify(next));
      setLoans(next);
      setFeedback(message);
      setError("");
      return true;
    } catch {
      setError("Unable to save borrowing records in browser storage.");
      return false;
    }
  }

  function openCreateBook() {
    setEditingBookId(null);
    setBookForm({ ...EMPTY_BOOK });
    setError("");
    setFeedback("");
    setBookModal(true);
  }

  function openEditBook(book) {
    setEditingBookId(book.id);
    setBookForm({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn,
      copies: book.copies,
      location: book.location,
      publisher: book.publisher || "",
      year: book.year || "",
      description: book.description || "",
      status: book.status,
    });
    setError("");
    setBookModal(true);
  }

  function saveBook(event) {
    event.preventDefault();

    const clean = {
      ...bookForm,
      title: bookForm.title.trim(),
      author: bookForm.author.trim(),
      isbn: bookForm.isbn.trim(),
      location: bookForm.location.trim(),
      publisher: bookForm.publisher.trim(),
      year: String(bookForm.year).trim(),
      description: bookForm.description.trim(),
      copies: Number(bookForm.copies),
    };

    if (!clean.title || !clean.author || !clean.isbn) {
      setError("Book title, author and ISBN are required.");
      return;
    }

    if (!/^(?:\d[\d-]{8,18}\d)$/.test(clean.isbn)) {
      setError("Enter an ISBN-10 or ISBN-13 using digits and optional hyphens.");
      return;
    }

    const isbnDigits = clean.isbn.replace(/-/g, "");
    if (![10, 13].includes(isbnDigits.length)) {
      setError("ISBN must contain 10 or 13 digits.");
      return;
    }

    if (
      !Number.isInteger(clean.copies) ||
      clean.copies < 0 ||
      clean.copies > 100000
    ) {
      setError("Total copies must be a non-negative whole number.");
      return;
    }

    if (editingBookId && clean.copies < activeLoanCount(editingBookId)) {
      setError("Total copies cannot be lower than currently borrowed copies.");
      return;
    }

    const duplicate = books.some(
      (book) =>
        book.id !== editingBookId &&
        book.isbn.replace(/-/g, "") === isbnDigits
    );

    if (duplicate) {
      setError("A book with this ISBN already exists.");
      return;
    }

    const next = editingBookId
      ? books.map((book) =>
          book.id === editingBookId ? { ...book, ...clean } : book
        )
      : [{ id: createId("BK"), ...clean }, ...books];

    if (saveBooks(next, editingBookId ? "Book updated." : "Book added.")) {
      setBookModal(false);
      setPage(1);
    }
  }

  function deleteBook(book) {
    if (loans.some((loan) => loan.bookId === book.id)) {
      setError(
        "This book has borrowing history. Keep its record to preserve the loan history."
      );
      setFeedback("");
      return;
    }

    if (!window.confirm(`Delete "${book.title}"?`)) return;

    saveBooks(
      books.filter((item) => item.id !== book.id),
      "Book deleted."
    );
  }

  function openIssue() {
    const firstBook = books.find(
      (book) => book.status === "Active" && availableCopies(book) > 0
    );
    const issueDate = today();

    setIssueForm({
      bookId: firstBook?.id || "",
      studentId: students[0]?.studentId || "",
      issueDate,
      dueDate: addDays(issueDate, 14),
    });
    setError("");
    setIssueModal(true);
  }

  function issueBook(event) {
    event.preventDefault();

    const book = books.find((item) => item.id === issueForm.bookId);
    const student = students.find(
      (item) => item.studentId === issueForm.studentId
    );

    if (!book || !student) {
      setError("Choose a valid book and student.");
      return;
    }

    if (book.status !== "Active" || availableCopies(book) <= 0) {
      setError("This book is not currently available.");
      return;
    }

    if (!issueForm.issueDate || !issueForm.dueDate ||
        issueForm.dueDate <= issueForm.issueDate) {
      setError("Due date must be later than issue date.");
      return;
    }

    const duplicate = loans.some(
      (loan) =>
        loan.bookId === issueForm.bookId &&
        loan.studentId === issueForm.studentId &&
        !loan.returnDate
    );

    if (duplicate) {
      setError("This student already has an active loan for this book.");
      return;
    }

    const next = [
      {
        id: createId("LOAN"),
        ...issueForm,
        returnDate: "",
      },
      ...loans,
    ];

    if (saveLoans(next, "Book issued successfully.")) {
      setIssueModal(false);
      setTab("Loans");
      setStatusFilter("All");
      setCategoryFilter("All");
      setSearch("");
      setPage(1);
    }
  }

  function returnBook(loan) {
    if (loan.returnDate) return;

    if (!window.confirm(`Mark "${loan.bookTitle}" as returned?`)) return;

    saveLoans(
      loans.map((item) =>
        item.id === loan.id
          ? { ...item, returnDate: today() }
          : item
      ),
      "Book marked as returned."
    );
  }

  function clearFilters() {
    setSearch("");
    setCategoryFilter("All");
    setStatusFilter("All");
    setPage(1);
  }

  function changeTab(value) {
    setTab(value);
    clearFilters();
  }

  function resetDemo() {
    if (!window.confirm(
      "Restore sample library books and borrowing records? This overwrites locally saved library changes."
    )) return;

    try {
      localStorage.setItem(BOOK_KEY, JSON.stringify(SAMPLE_BOOKS));
      localStorage.setItem(LOAN_KEY, JSON.stringify(SAMPLE_LOANS));
      setBooks(SAMPLE_BOOKS);
      setLoans(SAMPLE_LOANS);
      setFeedback("Sample library records restored.");
      setError("");
      clearFilters();
    } catch {
      setError("Unable to restore demo library data in browser storage.");
    }
  }

  function downloadCurrent() {
    if (tab === "Books") {
      exportCSV(
        "UniBee_Library_Books.csv",
        ["Book ID", "Title", "Author", "ISBN", "Category", "Total Copies", "Borrowed", "Available", "Location", "Status"],
        filtered.map((book) => [
          book.id, book.title, book.author, book.isbn,
          book.category, book.copies, book.borrowed,
          Math.max(0, book.copies - book.borrowed),
          book.location, book.status,
        ])
      );
    } else {
      exportCSV(
        "UniBee_Library_Loans.csv",
        ["Loan ID", "Book", "Student ID", "Student Name", "Issue Date", "Due Date", "Return Date", "Status"],
        filtered.map((loan) => [
          loan.id, loan.bookTitle, loan.studentId,
          loan.studentName, loan.issueDate, loan.dueDate,
          loan.returnDate, loan.status,
        ])
      );
    }
  }

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Campus Operations
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Library Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Maintain book inventory, monitor borrowing, and manage returns.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openIssue}
            disabled={!students.length || !books.some(
              (book) => book.status === "Active" && availableCopies(book) > 0
            )}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/20 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-40"
          >
            <ArrowLeftRight size={18} />
            Issue Book
          </button>
          <button
            type="button"
            onClick={openCreateBook}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
          >
            <BookPlus size={18} />
            Add Book
          </button>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Book Titles"
          value={books.length}
          detail="Total catalog records"
          icon={LibraryBig}
        />
        <MetricCard
          label="Total Copies"
          value={totalCopies}
          detail="Physical copies recorded"
          icon={BookOpen}
        />
        <MetricCard
          label="Currently Borrowed"
          value={borrowedCopies}
          detail="Copies not yet returned"
          icon={BookMarked}
        />
        <MetricCard
          label="Overdue Loans"
          value={overdueLoans}
          detail="Loans past their due date"
          icon={Clock3}
        />
      </section>

      {/* TAB & FILTER PANEL */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex rounded-xl bg-[#F6F8F3] p-1">
            {["Books", "Loans"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => changeTab(value)}
                className={`rounded-lg px-5 py-2 text-sm font-semibold ${
                  tab === value
                    ? "bg-[#234E43] text-white"
                    : "text-slate-600"
                }`}
              >
                {value === "Books" ? "Book Inventory" : "Borrowing Records"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadCurrent}
              className="inline-flex items-center gap-2 rounded-lg border border-[#234E43]/20 px-3 py-2 text-xs font-semibold text-[#234E43]"
            >
              <Download size={15} />
              Export CSV
            </button>

            <button
              type="button"
              onClick={resetDemo}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
            >
              <RotateCcw size={15} />
              Reset Demo
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={tab === "Books" ? "Search title, ISBN, author..." : "Search book or student..."}
              aria-label="Search library records"
              className={`${fieldClass} pl-10`}
            />
          </div>

          {tab === "Books" ? (
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter book category"
              className={fieldClass}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          ) : (
            <div className="flex items-center rounded-xl bg-[#F6F8F3] px-4 text-xs text-slate-500">
              Loan history and active borrowing
            </div>
          )}

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter record status"
            className={fieldClass}
          >
            <option value="All">All Statuses</option>
            {(tab === "Books"
              ? ["Active", "Inactive"]
              : ["Borrowed", "Overdue", "Returned"]
            ).map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex justify-between gap-3">
          <p className="text-xs text-slate-500">
            {filtered.length} matching {tab.toLowerCase()} records
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#234E43]"
          >
            <RotateCcw size={14} />
            Clear Filters
          </button>
        </div>
      </section>

      {/* BOOK INVENTORY */}
      {tab === "Books" && (
        <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {["Book", "Category", "ISBN", "Copies", "Location", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="px-5 py-4 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#234E43]">{book.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{book.author}</p>
                      <p className="mt-1 text-xs text-slate-400">{book.id}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{book.category}</td>
                    <td className="px-5 py-4 text-xs text-slate-600">{book.isbn}</td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-[#234E43]">
                        {Math.max(0, book.copies - book.borrowed)} available
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {book.borrowed} borrowed / {book.copies} total
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{book.location || "—"}</td>
                    <td className="px-5 py-4"><StatusBadge status={book.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setViewingBook(book)} title="View book" aria-label={`View ${book.title}`} className="rounded-lg bg-slate-100 p-2 text-[#234E43]">
                          <Eye size={17} />
                        </button>
                        <button type="button" onClick={() => openEditBook(book)} title="Edit book" aria-label={`Edit ${book.title}`} className="rounded-lg bg-[#A6C1A4]/25 p-2 text-[#234E43]">
                          <Pencil size={17} />
                        </button>
                        <button type="button" onClick={() => deleteBook(book)} title="Delete book" aria-label={`Delete ${book.title}`} className="rounded-lg bg-rose-50 p-2 text-rose-600">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <p className="py-14 text-center text-sm text-slate-500">No books found.</p>
            )}
          </div>
          <Pagination current={currentPage} total={totalPages} count={filtered.length} onChange={setPage} />
        </section>
      )}

      {/* BORROWING TABLE */}
      {tab === "Loans" && (
        <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {["Book", "Student", "Issued", "Due Date", "Returned", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="px-5 py-4 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#234E43]">{loan.bookTitle}</p>
                      <p className="mt-1 text-xs text-slate-400">{loan.id}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-600">{loan.studentName}</p>
                      <p className="mt-1 text-xs text-slate-400">{loan.studentId}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{loan.issueDate}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{loan.dueDate}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{loan.returnDate || "—"}</td>
                    <td className="px-5 py-4"><StatusBadge status={loan.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setViewingLoan(loan)} title="View loan" aria-label={`View ${loan.id}`} className="rounded-lg bg-slate-100 p-2 text-[#234E43]">
                          <Eye size={17} />
                        </button>
                        {!loan.returnDate && (
                          <button type="button" onClick={() => returnBook(loan)} title="Mark returned" aria-label={`Return ${loan.bookTitle}`} className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                            <RotateCw size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <p className="py-14 text-center text-sm text-slate-500">No borrowing records found.</p>
            )}
          </div>
          <Pagination current={currentPage} total={totalPages} count={filtered.length} onChange={setPage} />
        </section>
      )}

      {feedback && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={18} /> {feedback}
        </p>
      )}

      {error && !bookModal && !issueModal && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} /> {error}
        </p>
      )}

      {/* ADD / EDIT BOOK */}
      {bookModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setBookModal(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="book-form-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="book-form-title" className="text-xl font-bold text-[#234E43]">
                {editingBookId ? "Edit Book" : "Add New Book"}
              </h2>
              <button type="button" onClick={() => setBookModal(false)} aria-label="Close form"><X size={21} /></button>
            </div>

            <form onSubmit={saveBook} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Book Title *", "title", "text"],
                  ["Author *", "author", "text"],
                  ["ISBN *", "isbn", "text"],
                  ["Shelf / Location", "location", "text"],
                  ["Publisher", "publisher", "text"],
                  ["Publication Year", "year", "number"],
                  ["Total Copies *", "copies", "number"],
                ].map(([label, key, type]) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
                    <input
                      type={type}
                      value={bookForm[key]}
                      required={label.includes("*")}
                      min={type === "number" ? "0" : undefined}
                      onChange={(e) => {
                        setBookForm((prev) => ({ ...prev, [key]: e.target.value }));
                        setError("");
                      }}
                      className={fieldClass}
                    />
                  </label>
                ))}

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Category</span>
                  <select value={bookForm.category} onChange={(e) => setBookForm((prev) => ({ ...prev, category: e.target.value }))} className={fieldClass}>
                    {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Status</span>
                  <select value={bookForm.status} onChange={(e) => setBookForm((prev) => ({ ...prev, status: e.target.value }))} className={fieldClass}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Description</span>
                <textarea rows={3} maxLength={1000} value={bookForm.description} onChange={(e) => setBookForm((prev) => ({ ...prev, description: e.target.value }))} className={fieldClass} />
              </label>

              {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white">
                <Save size={18} /> {editingBookId ? "Save Changes" : "Add Book"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* ISSUE BOOK */}
      {issueModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setIssueModal(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="issue-form-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="issue-form-title" className="text-xl font-bold text-[#234E43]">Issue Book</h2>
              <button type="button" onClick={() => setIssueModal(false)} aria-label="Close"><X size={21} /></button>
            </div>

            <form onSubmit={issueBook} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Book *</span>
                <select required value={issueForm.bookId} onChange={(e) => setIssueForm((prev) => ({ ...prev, bookId: e.target.value }))} className={fieldClass}>
                  {books.filter((book) => book.status === "Active" && availableCopies(book) > 0).map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} — {availableCopies(book)} available
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Student *</span>
                <select required value={issueForm.studentId} onChange={(e) => setIssueForm((prev) => ({ ...prev, studentId: e.target.value }))} className={fieldClass}>
                  {students.map((student) => (
                    <option key={student.studentId} value={student.studentId}>
                      {student.name} ({student.studentId})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Issue Date *</span>
                  <input type="date" value={issueForm.issueDate} required onChange={(e) => setIssueForm((prev) => ({ ...prev, issueDate: e.target.value }))} className={fieldClass} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Due Date *</span>
                  <input type="date" value={issueForm.dueDate} required onChange={(e) => setIssueForm((prev) => ({ ...prev, dueDate: e.target.value }))} className={fieldClass} />
                </label>
              </div>

              {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white">
                <ArrowLeftRight size={18} /> Confirm Book Issue
              </button>
            </form>
          </section>
        </div>
      )}

      {/* DETAILS */}
      {(viewingBook || viewingLoan) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setViewingBook(null);
            setViewingLoan(null);
          }
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="library-details-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-[#B18A28]">LIBRARY RECORD</p>
                <h2 id="library-details-title" className="mt-2 text-xl font-bold text-[#234E43]">
                  {viewingBook?.title || viewingLoan?.bookTitle}
                </h2>
              </div>
              <button type="button" onClick={() => {
                setViewingBook(null);
                setViewingLoan(null);
              }} aria-label="Close details"><X size={21} /></button>
            </div>

            <div className="mt-5 space-y-3">
              {(viewingBook
                ? [
                    ["Book ID", viewingBook.id],
                    ["Author", viewingBook.author],
                    ["ISBN", viewingBook.isbn],
                    ["Category", viewingBook.category],
                    ["Copies", viewingBook.copies],
                    ["Borrowed", viewingBook.borrowed],
                    ["Location", viewingBook.location],
                    ["Publisher", viewingBook.publisher],
                    ["Year", viewingBook.year],
                    ["Status", viewingBook.status],
                    ["Description", viewingBook.description],
                  ]
                : [
                    ["Loan ID", viewingLoan.id],
                    ["Student", viewingLoan.studentName],
                    ["Student ID", viewingLoan.studentId],
                    ["Issued", viewingLoan.issueDate],
                    ["Due", viewingLoan.dueDate],
                    ["Returned", viewingLoan.returnDate || "Not returned"],
                    ["Status", viewingLoan.status],
                  ]
              ).map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 rounded-xl bg-[#F6F8F3] p-3 text-sm">
                  <span className="shrink-0 text-slate-500">{label}</span>
                  <span className="break-words text-right font-semibold text-[#234E43]">{value || "—"}</span>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => {
              setViewingBook(null);
              setViewingLoan(null);
            }} className="mt-6 w-full rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white">
              Close Details
            </button>
          </section>
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> Book inventory and borrowing records are stored in this browser. Available copies decrease when a book is issued and increase when returned. These are illustrative records, not connected to a real library database or student accounts.
      </div>
    </div>
  );
}

function Pagination({ current, total, count, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
      <p className="text-xs text-slate-500">
        Page {current} of {total} · {count} records
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={current === 1}
          onClick={() => onChange(current - 1)}
          aria-label="Previous page"
          className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          disabled={current === total}
          onClick={() => onChange(current + 1)}
          aria-label="Next page"
          className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
