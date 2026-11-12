
import { useEffect, useMemo, useState } from "react";
import { getAuthToken } from "../../services/authApi";
import {
  getLibraryBooks,
  createLibraryBook,
  updateLibraryBook,
  deleteLibraryBook,
  getLibraryLoans,
} from "../../services/libraryApi";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  X,
  Save,
  LibraryBig,
  BookCheck,
  BookMarked,
  AlertTriangle,
  PackageX,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Database,
} from "lucide-react";

const BOOK_KEY = "unibee-admin-library-books-v1";
const LOAN_KEY = "unibee-admin-library-loans-v1";

const PAGE_SIZE = 10;
const LOW_STOCK_LIMIT = 3;

const CATEGORIES = [
  "Computer Science",
  "Engineering",
  "Business",
  "Accounting",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Pharmacy",
  "Economics",
  "Literature",
  "History",
  "General",
  "Other",
];

const EMPTY_FORM = {
  title: "",
  author: "",
  isbn: "",
  category: "Computer Science",
  publisher: "",
  edition: "",
  year: "",
  shelf: "",
  copies: 1,
  status: "Active",
  description: "",
};

function readArray(key) {
  try {
    const saved = localStorage.getItem(key);

    if (saved === null) {
      return { rows: [], state: "missing" };
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return { rows: [], state: "invalid" };
    }

    return { rows: parsed, state: "available" };
  } catch {
    return { rows: [], state: "invalid" };
  }
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `book-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function numeric(value) {
  return Math.max(0, Number(value) || 0);
}

function countActiveLoans(loans, bookId) {
  return loans.filter(
    (loan) =>
      String(loan.bookId) === String(bookId) &&
      !loan.returnDate
  ).length;
}

function getBookStats(book, loans) {
  const total = numeric(book.copies);
  const borrowed = countActiveLoans(loans, book.id);
  const available = Math.max(0, total - borrowed);

  let stockStatus = "Available";

  if (String(book.status).toLowerCase() !== "active") {
    stockStatus = "Inactive";
  } else if (available === 0) {
    stockStatus = "Out of Stock";
  } else if (available <= LOW_STOCK_LIMIT) {
    stockStatus = "Low Stock";
  }

  return {
    ...book,
    total,
    borrowed,
    available,
    stockStatus,
  };
}

function exportCSV(filename, headers, rows) {
  function escapeCSV(value) {
    let text = String(value ?? "");

    // Prevent spreadsheet formula injection.
    if (/^\s*[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  }

  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = "green",
}) {
  const tones = {
    green: "bg-[#A6C1A4]/25 text-[#234E43]",
    gold: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    blue: "bg-sky-50 text-sky-700",
  };

  return (
    <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>

          <p className="mt-3 text-3xl font-bold text-[#234E43]">
            {value}
          </p>
        </div>

        <div
          className={`rounded-xl p-3 ${
            tones[tone] || tones.green
          }`}
        >
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

function StockBadge({ status }) {
  const styles = {
    Available: "bg-emerald-50 text-emerald-700",
    "Low Stock": "bg-amber-50 text-amber-800",
    "Out of Stock": "bg-rose-50 text-rose-700",
    Inactive: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || styles.Inactive
      }`}
    >
      {status}
    </span>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  min,
  max,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#234E43]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
      />
    </label>
  );
}

function BookModal({
  mode,
  form,
  setForm,
  onClose,
  onSave,
  borrowedCount,
}) {
  const isEditing = mode === "edit";

  function update(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          isEditing ? "Edit library book" : "Add library book"
        }
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              {isEditing ? "Edit Book" : "Add New Book"}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Manage your library catalog information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close book form"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={21} />
          </button>
        </div>

        <form
          id="librarian-book-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
          className="flex-1 space-y-5 overflow-y-auto p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField
                label="Book Title *"
                value={form.title}
                required
                placeholder="Enter book title"
                onChange={(event) =>
                  update("title", event.target.value)
                }
              />
            </div>

            <FormField
              label="Author *"
              value={form.author}
              required
              placeholder="Enter author name"
              onChange={(event) =>
                update("author", event.target.value)
              }
            />

            <FormField
              label="ISBN"
              value={form.isbn}
              placeholder="ISBN number"
              onChange={(event) =>
                update("isbn", event.target.value)
              }
            />

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Category *
              </span>

              <select
                value={form.category}
                onChange={(event) =>
                  update("category", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              >
                {!CATEGORIES.includes(form.category) && (
                  <option value={form.category}>
                    {form.category}
                  </option>
                )}

                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <FormField
              label="Publisher"
              value={form.publisher}
              onChange={(event) =>
                update("publisher", event.target.value)
              }
            />

            <FormField
              label="Edition"
              value={form.edition}
              onChange={(event) =>
                update("edition", event.target.value)
              }
            />

            <FormField
              label="Publication Year"
              type="number"
              value={form.year}
              min="1000"
              max="2100"
              onChange={(event) =>
                update("year", event.target.value)
              }
            />

            <FormField
              label="Shelf Location"
              value={form.shelf}
              placeholder="Example: A-03"
              onChange={(event) =>
                update("shelf", event.target.value)
              }
            />

            <FormField
              label="Total Copies *"
              type="number"
              value={form.copies}
              required
              min={borrowedCount}
              max="100000"
              onChange={(event) =>
                update("copies", event.target.value)
              }
            />

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Catalog Status
              </span>

              <select
                value={form.status}
                onChange={(event) =>
                  update("status", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Book Description
            </span>

            <textarea
              rows={4}
              maxLength={2000}
              value={form.description}
              onChange={(event) =>
                update("description", event.target.value)
              }
              placeholder="Optional description..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-[#234E43]"
            />
          </label>

          {borrowedCount > 0 && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              This book currently has {borrowedCount} active
              loan(s). Total Copies cannot be reduced below
              that number.
            </p>
          )}
        </form>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>

          <button
            form="librarian-book-form"
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
          >
            <Save size={17} />
            {isEditing ? "Save Changes" : "Add Book"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookDetails({ book, onClose, onEdit }) {
  const fields = [
    ["Book ID", book.id],
    ["Title", book.title],
    ["Author", book.author],
    ["ISBN", book.isbn],
    ["Category", book.category],
    ["Publisher", book.publisher],
    ["Edition", book.edition],
    ["Publication Year", book.year],
    ["Shelf Location", book.shelf],
    ["Total Copies", book.total],
    ["Borrowed Copies", book.borrowed],
    ["Available Copies", book.available],
    ["Catalog Status", book.status],
    ["Description", book.description],
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Book details"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
              Library Catalog
            </p>

            <h2 className="mt-2 text-xl font-bold text-[#234E43]">
              Book Details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close book details"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-[#F6F8F3] p-5">
          <BookOpen size={32} className="text-[#234E43]" />

          <h3 className="mt-3 text-lg font-bold text-[#234E43]">
            {book.title}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {book.author}
          </p>

          <div className="mt-3">
            <StockBadge status={book.stockStatus} />
          </div>
        </div>

        <div className="mt-5 divide-y divide-slate-100">
          {fields.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-wrap justify-between gap-2 py-3"
            >
              <span className="text-xs font-medium text-slate-500">
                {label}
              </span>

              <span className="max-w-xs break-words text-right text-xs font-semibold text-[#234E43]">
                {value ?? "—"}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] py-3 text-sm font-semibold text-white"
        >
          <Pencil size={17} />
          Edit This Book
        </button>
      </div>
    </div>
  );
}

export default function LibrarianBooks() {
  const [booksSource, setBooksSource] = useState({ rows: [], state: "loading" });
  const [loansSource, setLoansSource] = useState({ rows: [], state: "loading" });
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [stockFilter, setStockFilter] = useState("All");

  const [page, setPage] = useState(1);

  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState(null);

  const [viewingBook, setViewingBook] = useState(null);

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    const token = getAuthToken();
    if (!token) {
      setDemoMode(true);
      setBooksSource(readArray(BOOK_KEY));
      setLoansSource(readArray(LOAN_KEY));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [books, loans] = await Promise.all([
        getLibraryBooks(),
        getLibraryLoans().catch(() => []),
      ]);
      setBooksSource({ rows: books, state: "available" });
      setLoansSource({ rows: loans, state: "available" });
      setDemoMode(false);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load library catalog from MongoDB.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const books = booksSource.rows;
  const loans = loansSource.rows;

  const inventory = useMemo(
    () => books.map((book) => getBookStats(book, loans)),
    [books, loans]
  );

  const categories = useMemo(
    () =>
      [...new Set(
        books.map((book) => book.category).filter(Boolean)
      )].sort(),
    [books]
  );

  const totals = useMemo(() => {
    const totalCopies = inventory.reduce(
      (sum, book) => sum + book.total,
      0
    );

    const availableCopies = inventory.reduce(
      (sum, book) => sum + book.available,
      0
    );

    return {
      titles: inventory.length,
      copies: totalCopies,
      available: availableCopies,
      borrowed: inventory.reduce(
        (sum, book) => sum + book.borrowed,
        0
      ),
      lowStock: inventory.filter(
        (book) => book.stockStatus === "Low Stock"
      ).length,
      outOfStock: inventory.filter(
        (book) => book.stockStatus === "Out of Stock"
      ).length,
    };
  }, [inventory]);

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return inventory.filter((book) => {
      const matchesSearch = [
        book.title,
        book.author,
        book.isbn,
        book.id,
        book.publisher,
        book.shelf,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      const matchesCategory =
        categoryFilter === "All" ||
        book.category === categoryFilter;

      const matchesStock =
        stockFilter === "All" ||
        book.stockStatus === stockFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock
      );
    });
  }, [inventory, search, categoryFilter, stockFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBooks.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleBooks = filteredBooks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const editBorrowed = editingId
    ? countActiveLoans(loans, editingId)
    : 0;

  function refreshData() {
    if (demoMode) {
      setBooksSource(readArray(BOOK_KEY));
      setLoansSource(readArray(LOAN_KEY));
      setFeedback("Book inventory refreshed.");
      setError("");
      return;
    }
    loadData();
    setFeedback("Catalog refreshed from MongoDB.");
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setModalMode("add");
    setError("");
  }

  function openEdit(book) {
    setForm({
      ...EMPTY_FORM,
      ...book,
    });

    setEditingId(book.id);
    setViewingBook(null);
    setModalMode("edit");
    setError("");
  }

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
  }

  async function saveBook() {
    const title = String(form.title || "").trim();
    const author = String(form.author || "").trim();
    const isbn = String(form.isbn || "").trim();

    const copies = Number(form.copies);

    if (!title || !author) {
      setError("Book title and author are required.");
      return;
    }

    if (
      !Number.isInteger(copies) ||
      copies < 0 ||
      copies > 100000
    ) {
      setError(
        "Total copies must be a whole number between 0 and 100000."
      );
      return;
    }

    if (copies < editBorrowed) {
      setError(
        `This book has ${editBorrowed} active loans. Total copies cannot be lower.`
      );
      return;
    }

    const sameISBN = books.some(
      (book) =>
        isbn &&
        String(book.isbn || "").trim().toLowerCase() ===
          isbn.toLowerCase() &&
        book.id !== editingId
    );

    if (sameISBN) {
      setError(
        "A different catalog record already uses this ISBN."
      );
      return;
    }

    const record = {
      ...form,
      title,
      author,
      isbn,
      copies,
      publisher: String(form.publisher || "").trim(),
      edition: String(form.edition || "").trim(),
      shelf: String(form.shelf || "").trim(),
      description: String(form.description || "").trim(),
    };

    if (demoMode) {
      const demoRecord = {
        ...record,
        id: editingId || createId(),
        updatedAt: new Date().toISOString(),
      };

      const next = editingId
        ? books.map((book) =>
            book.id === editingId
              ? { ...book, ...demoRecord }
              : book
          )
        : [
            ...books,
            {
              ...demoRecord,
              createdAt: new Date().toISOString(),
            },
          ];

      try {
        localStorage.setItem(
          BOOK_KEY,
          JSON.stringify(next)
        );

        setBooksSource({
          rows: next,
          state: "available",
        });

        closeModal();
        setPage(1);
        setFeedback(
          editingId
            ? "Book updated successfully."
            : "New book added successfully."
        );
        setError("");
      } catch {
        setError(
          "Unable to save book data. Check browser storage."
        );
      }
      return;
    }

    // LIVE MONGODB MODE
    try {
      if (editingId) {
        const updated = await updateLibraryBook(editingId, record);
        setBooksSource((prev) => ({
          ...prev,
          rows: prev.rows.map((b) => (b.id === editingId ? updated : b)),
        }));
        setFeedback(`Book "${title}" updated in MongoDB.`);
      } else {
        const created = await createLibraryBook(record);
        setBooksSource((prev) => ({
          ...prev,
          rows: [created, ...prev.rows],
        }));
        setFeedback(`Book "${title}" added to MongoDB library catalog.`);
      }
      closeModal();
      setPage(1);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to save book to MongoDB.");
    }
  }

  async function deleteBook(book) {
    const activeLoans = countActiveLoans(
      loans,
      book.id
    );

    if (activeLoans > 0) {
      setError(
        "This book has active loans and cannot be deleted. Return its borrowed copies first."
      );
      return;
    }

    if (
      !window.confirm(
        `Delete "${book.title}" from the library catalog?`
      )
    ) {
      return;
    }

    if (demoMode) {
      const next = books.filter(
        (item) => item.id !== book.id
      );

      try {
        localStorage.setItem(
          BOOK_KEY,
          JSON.stringify(next)
        );

        setBooksSource({
          rows: next,
          state: "available",
        });

        setViewingBook(null);
        setFeedback("Book deleted successfully.");
        setError("");
      } catch {
        setError("Unable to delete this book.");
      }
      return;
    }

    // LIVE MONGODB MODE
    try {
      await deleteLibraryBook(book.id);
      setBooksSource((prev) => ({
        ...prev,
        rows: prev.rows.filter((b) => b.id !== book.id),
      }));
      setViewingBook(null);
      setFeedback(`Book "${book.title}" deleted from MongoDB.`);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to delete book from MongoDB.");
    }
  }

  function downloadInventory() {
    const headers = [
      "Book ID",
      "Title",
      "Author",
      "ISBN",
      "Category",
      "Publisher",
      "Edition",
      "Year",
      "Shelf",
      "Total Copies",
      "Borrowed",
      "Available",
      "Stock Status",
      "Catalog Status",
    ];

    const rows = filteredBooks.map((book) => [
      book.id,
      book.title,
      book.author,
      book.isbn,
      book.category,
      book.publisher,
      book.edition,
      book.year,
      book.shelf,
      book.total,
      book.borrowed,
      book.available,
      book.stockStatus,
      book.status,
    ]);

    exportCSV(
      "UniBee_Library_Book_Inventory.csv",
      headers,
      rows
    );

    setFeedback("Book inventory exported as CSV.");
  }

  function resetFilters() {
    setSearch("");
    setCategoryFilter("All");
    setStockFilter("All");
    setPage(1);
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
              Book Inventory
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
            Manage library books, inventory quantities,
            and stock availability.
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
            onClick={downloadInventory}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33]"
          >
            <Plus size={18} />
            Add Book
          </button>
        </div>
      </section>

      {/* DATA SOURCE NOTICE */}
      {(booksSource.state !== "available" ||
        loansSource.state !== "available") && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Database
            size={19}
            className="mt-0.5 shrink-0 text-amber-700"
          />

          <p className="text-xs leading-6 text-amber-900">
            {booksSource.state !== "available"
              ? "No valid saved book inventory was found. You can start by adding a book. "
              : ""}
            {loansSource.state !== "available"
              ? "Saved borrowing data is unavailable, so available-copy calculations cannot be fully verified until loan records are saved."
              : ""}
          </p>
        </div>
      )}

      {/* FEEDBACK */}
      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={19} />
          {feedback}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={19} />
          {error}
        </div>
      )}

      {/* KPI CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Book Titles"
          value={totals.titles}
          subtitle="Unique catalog records"
          icon={LibraryBig}
        />

        <MetricCard
          label="Total Copies"
          value={totals.copies}
          subtitle="Physical copies in catalog"
          icon={BookOpen}
          tone="blue"
        />

        <MetricCard
          label="Available Copies"
          value={
            loansSource.state === "available"
              ? totals.available
              : "—"
          }
          subtitle="Copies not currently borrowed"
          icon={BookCheck}
        />

        <MetricCard
          label="Borrowed Copies"
          value={
            loansSource.state === "available"
              ? totals.borrowed
              : "—"
          }
          subtitle="Currently active book loans"
          icon={BookMarked}
          tone="gold"
        />

        <MetricCard
          label="Low Stock Titles"
          value={
            loansSource.state === "available"
              ? totals.lowStock
              : "—"
          }
          subtitle={`1–${LOW_STOCK_LIMIT} available copies`}
          icon={AlertTriangle}
          tone="gold"
        />

        <MetricCard
          label="Out of Stock Titles"
          value={
            loansSource.state === "available"
              ? totals.outOfStock
              : "—"
          }
          subtitle="Zero available copies"
          icon={PackageX}
          tone="red"
        />
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#234E43]">
            Library Catalog
          </h2>

          <span className="rounded-full bg-[#F6F8F3] px-3 py-1 text-xs font-semibold text-[#234E43]">
            {filteredBooks.length} Books
          </span>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto]">
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
              placeholder="Search title, author, ISBN, ID..."
              aria-label="Search library books"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter book category"
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-[#234E43]"
          >
            <option value="All">All Categories</option>

            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(event) => {
              setStockFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter stock status"
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-[#234E43]"
          >
            <option value="All">All Stock Status</option>
            <option value="Available">Available</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Inactive">Inactive</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
          >
            Clear
          </button>
        </div>

        {/* TABLE */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-4 font-semibold">
                  Book Information
                </th>
                <th className="px-4 py-4 font-semibold">
                  Category
                </th>
                <th className="px-4 py-4 font-semibold">
                  Total
                </th>
                <th className="px-4 py-4 font-semibold">
                  Borrowed
                </th>
                <th className="px-4 py-4 font-semibold">
                  Available
                </th>
                <th className="px-4 py-4 font-semibold">
                  Stock Status
                </th>
                <th className="px-4 py-4 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleBooks.map((book) => (
                <tr
                  key={book.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-[#A6C1A4]/20 p-3 text-[#234E43]">
                        <BookOpen size={20} />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-[240px] truncate text-sm font-bold text-[#234E43]">
                          {book.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {book.author || "Unknown Author"}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {book.isbn || book.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-600">
                    {book.category || "—"}
                  </td>

                  <td className="px-4 py-4 text-sm font-semibold text-[#234E43]">
                    {book.total}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {loansSource.state === "available"
                      ? book.borrowed
                      : "—"}
                  </td>

                  <td className="px-4 py-4 text-sm font-bold text-[#234E43]">
                    {loansSource.state === "available"
                      ? book.available
                      : "—"}
                  </td>

                  <td className="px-4 py-4">
                    {loansSource.state === "available" ? (
                      <StockBadge status={book.stockStatus} />
                    ) : (
                      <span className="text-xs text-slate-400">
                        Unknown
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        title="View book"
                        aria-label={`View ${book.title}`}
                        onClick={() => setViewingBook(book)}
                        className="rounded-lg bg-[#F6F8F3] p-2 text-[#234E43]"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        title="Edit book"
                        aria-label={`Edit ${book.title}`}
                        onClick={() => openEdit(book)}
                        className="rounded-lg bg-sky-50 p-2 text-sky-700"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        title="Delete book"
                        aria-label={`Delete ${book.title}`}
                        onClick={() => deleteBook(book)}
                        className="rounded-lg bg-rose-50 p-2 text-rose-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visibleBooks.length === 0 && (
            <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
              <BookOpen
                size={34}
                className="text-[#A6C1A4]"
              />

              <p className="mt-4 text-sm font-semibold text-[#234E43]">
                No books found
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Add a new book or adjust your filters.
              </p>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} ·{" "}
            {filteredBooks.length} records
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous page"
              className="rounded-lg border border-slate-200 p-2 text-[#234E43] disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
              className="rounded-lg border border-slate-200 p-2 text-[#234E43] disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* INFO */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> This inventory uses
        the shared Admin Library browser storage. Available
        copies are calculated as Total Copies minus Active
        Loans. All changes in this browser can also be
        read by Admin Library after refreshing that page.
        Cross-device student synchronization requires
        backend integration.
      </div>

      {/* ADD / EDIT MODAL */}
      {modalMode && (
        <BookModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          borrowedCount={editBorrowed}
          onClose={closeModal}
          onSave={saveBook}
        />
      )}

      {/* BOOK DETAILS */}
      {viewingBook && (
        <BookDetails
          book={viewingBook}
          onClose={() => setViewingBook(null)}
          onEdit={() => openEdit(viewingBook)}
        />
      )}
    </div>
  );
}
