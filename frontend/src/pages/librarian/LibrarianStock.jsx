import { useEffect, useMemo, useState } from "react";
import {
  getLibraryBooks,
  getLibraryLoans,
  getLibraryRequests,
    getLibraryPurchasePlans,
  createLibraryPurchasePlan,
  updateLibraryPurchasePlan,
  deleteLibraryPurchasePlan,
} from "../../services/libraryApi";
import {
  PackageSearch,
  PackagePlus,
  PackageX,
  BookOpen,
  BookCheck,
  AlertTriangle,
  ClipboardList,
  ShoppingCart,
  Wallet,
  Search,
  RefreshCw,
  Download,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

const BOOK_KEY = "unibee-admin-library-books-v1";
const LOAN_KEY = "unibee-admin-library-loans-v1";
const REQUEST_KEY = "unibee-librarian-book-requests-v1";
const STOCK_KEY = "unibee-librarian-stock-v1";

const LOW_STOCK_LIMIT = 3;
const PAGE_SIZE = 8;

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = [
  "Planned",
  "Requested",
  "Approved",
  "Ordered",
  "Received",
  "Cancelled",
];

const EMPTY_FORM = {
  bookId: "",
  bookTitle: "",
  requiredCopies: 1,
  unitPrice: "",
  priority: "Medium",
  status: "Planned",
  notes: "",
};

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
    requests: readArray(REQUEST_KEY),
    stock: readArray(STOCK_KEY),
  };
}

function createId() {
  return typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `stock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function positive(value) {
  return Math.max(0, Number(value) || 0);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-BD");
}

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function availableCopies(book, loans) {
  const borrowed = loans.filter(
    (loan) =>
      String(loan.bookId) === String(book.id) &&
      !loan.returnDate
  ).length;

  return Math.max(0, positive(book.copies) - borrowed);
}

function getAvailability(book, loans, loansReady) {
  if (!loansReady) return null;

  return availableCopies(book, loans);
}

function stockLevel(book, available) {
  if (String(book.status || "").toLowerCase() !== "active") {
    return "Inactive";
  }

  if (available === null) return "Unknown";
  if (available === 0) return "Out of Stock";
  if (available <= LOW_STOCK_LIMIT) return "Low Stock";

  return "Available";
}

function exportCSV(filename, headers, rows) {
  function escapeValue(value) {
    let text = String(value ?? "");

    if (/^\s*[=+\-@\t\r]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  }

  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map(escapeValue).join(","))
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "green",
}) {
  const colors = {
    green: "bg-[#A6C1A4]/25 text-[#234E43]",
    gold: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    blue: "bg-sky-50 text-sky-700",
  };

  return (
    <article className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-3 break-words text-2xl font-bold text-[#234E43]">
            {value}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${colors[tone]}`}>
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">{subtitle}</p>
    </article>
  );
}

function Pill({ value }) {
  const styles = {
    "Out of Stock": "bg-rose-50 text-rose-700",
    "Low Stock": "bg-amber-50 text-amber-800",
    Available: "bg-emerald-50 text-emerald-700",
    Inactive: "bg-slate-100 text-slate-600",
    Unknown: "bg-slate-100 text-slate-600",
    Urgent: "bg-rose-50 text-rose-700",
    High: "bg-orange-50 text-orange-700",
    Medium: "bg-amber-50 text-amber-700",
    Low: "bg-slate-100 text-slate-600",
    Planned: "bg-slate-100 text-slate-700",
    Requested: "bg-blue-50 text-blue-700",
    Approved: "bg-emerald-50 text-emerald-700",
    Ordered: "bg-indigo-50 text-indigo-700",
    Received: "bg-emerald-50 text-emerald-700",
    Cancelled: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        styles[value] || "bg-slate-100 text-slate-600"
      }`}
    >
      {value}
    </span>
  );
}

function StockForm({
  form,
  setForm,
  books,
  onSave,
  onClose,
  editing,
}) {
  function update(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function chooseBook(bookId) {
    const book = books.find(
      (item) => String(item.id) === String(bookId)
    );

    setForm((previous) => ({
      ...previous,
      bookId,
      bookTitle: book?.title || previous.bookTitle,
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
        aria-label={editing ? "Edit purchase plan" : "Add purchase plan"}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-[#234E43]">
              {editing ? "Edit Purchase Plan" : "New Purchase Plan"}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Record additional copies required for the library.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close purchase form"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form
          id="librarian-stock-form"
          className="flex-1 space-y-5 overflow-y-auto p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Select Existing Book
            </span>

            <select
              value={form.bookId}
              onChange={(event) => chooseBook(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
            >
              <option value="">New Book / Not in Catalog</option>

              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} — {book.author || "Unknown Author"}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Book Title *
            </span>

            <input
              required
              value={form.bookTitle}
              readOnly={Boolean(form.bookId)}
              onChange={(event) =>
                update("bookTitle", event.target.value)
              }
              placeholder="Enter the book to purchase"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#234E43] read-only:bg-slate-50"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Required Copies *
              </span>

              <input
                required
                type="number"
                min="1"
                max="100000"
                value={form.requiredCopies}
                onChange={(event) =>
                  update("requiredCopies", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Estimated Unit Price (BDT)
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={(event) =>
                  update("unitPrice", event.target.value)
                }
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Purchase Priority
              </span>

              <select
                value={form.priority}
                onChange={(event) =>
                  update("priority", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                Purchase Status
              </span>

              <select
                value={form.status}
                onChange={(event) =>
                  update("status", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl bg-[#F6F8F3] p-4">
            <p className="text-xs text-slate-500">
              Estimated Purchase Cost
            </p>

            <p className="mt-2 text-2xl font-bold text-[#234E43]">
              {form.unitPrice === ""
                ? "Not estimated"
                : money(
                    positive(form.requiredCopies) *
                      positive(form.unitPrice)
                  )}
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#234E43]">
              Notes / Purchase Justification
            </span>

            <textarea
              rows={4}
              maxLength={1500}
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="Reason for purchasing additional copies..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-[#234E43]"
            />
          </label>

          <p className="rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900">
            Purchase planning does not automatically add physical
            books to inventory. New copies must be recorded in
            Book Inventory after they are received.
          </p>
        </form>

        <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="librarian-stock-form"
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
          >
            <Save size={17} />
            {editing ? "Save Changes" : "Create Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LibrarianStock() {
  const [sources, setSources] = useState(readSources);

  const [view, setView] = useState("inventory");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  
  // ========================================
  // PURCHASE PLANS — LOAD FROM MONGODB
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadPurchasePlans() {
      try {
        const data = await getLibraryPurchasePlans();

        if (!active) return;

        const plans = (Array.isArray(data) ? data : []).map(
          (plan) => ({
            ...plan,
            id: String(plan._id || plan.id),
            bookId: String(plan.bookId || ""),
          })
        );

        setSources((previous) => ({
          ...previous,
          stock: {
            rows: plans,
            state: "available",
          },
        }));
      } catch (err) {
        if (!active) return;

        setSources((previous) => ({
          ...previous,
          stock: {
            rows: [],
            state: "invalid",
          },
        }));

        setError(
          err.message ||
          "Could not load purchase plans from MongoDB."
        );
      }
    }

    loadPurchasePlans();

    return () => {
      active = false;
    };
  }, []);



  // ========================================
  // STOCK MANAGEMENT — MONGODB DATA SYNC
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadStockData() {
      try {
        const [bookData, loanData, requestData] =
          await Promise.all([
            getLibraryBooks(),
            getLibraryLoans(),
            getLibraryRequests(),
          ]);

        if (!active) return;

        const normalizedBooks = bookData.map((book) => ({
          ...book,
          id: String(book._id || book.id),
        }));

        const normalizedLoans = loanData.map((loan) => ({
          ...loan,
          id: String(loan._id || loan.id),
          bookId: String(
            loan.book?._id ||
            loan.book ||
            loan.bookId ||
            ""
          ),
          returnDate:
            loan.status === "Returned"
              ? loan.returnDate || "Returned"
              : loan.returnDate || null,
        }));

        const normalizedRequests = requestData.map(
          (request) => ({
            ...request,
            id: String(request._id || request.id),
            bookId: String(
              request.book?._id ||
              request.book ||
              request.bookId ||
              ""
            ),
          })
        );

        setSources((previous) => ({
          ...previous,
          books: {
            rows: normalizedBooks,
            state: "available",
          },
          loans: {
            rows: normalizedLoans,
            state: "available",
          },
          requests: {
            rows: normalizedRequests,
            state: "available",
          },
        }));

        setError("");
      } catch (err) {
        if (!active) return;

        setSources((previous) => ({
          ...previous,
          books: { rows: [], state: "invalid" },
          loans: { rows: [], state: "invalid" },
          requests: { rows: [], state: "invalid" },
        }));

        setError(
          err.message ||
          "Could not load library stock from MongoDB."
        );
      }
    }

    loadStockData();

    return () => {
      active = false;
    };
  }, []);


  const books = sources.books.rows;
  const loans = sources.loans.rows;
  const requests = sources.requests.rows;
  const plans = sources.stock.rows;

  const loansReady = sources.loans.state === "available";

  const inventory = useMemo(
    () =>
      books.map((book) => {
        const available = getAvailability(
          book,
          loans,
          loansReady
        );

        const pending = requests.filter(
          (request) =>
            request.bookId &&
            String(request.bookId) === String(book.id) &&
            ["Pending", "Approved"].includes(request.status)
        );

        return {
          ...book,
          total: positive(book.copies),
          available,
          borrowed:
            available === null
              ? null
              : positive(book.copies) - available,
          demand: pending.reduce(
            (sum, request) =>
              sum + (Number(request.quantity) || 1),
            0
          ),
          stockLevel: stockLevel(book, available),
        };
      }),
    [books, loans, loansReady, requests]
  );

  const requestDemand = useMemo(() => {
    const groups = new Map();

    requests
      .filter((request) =>
        ["Pending", "Approved"].includes(request.status)
      )
      .forEach((request) => {
        const key = request.bookId
          ? `id:${request.bookId}`
          : `title:${String(request.bookTitle || "")
              .trim()
              .toLowerCase()}`;

        if (key === "title:") return;

        const previous = groups.get(key) || {
          key,
          bookId: request.bookId || "",
          bookTitle: request.bookTitle,
          studentRequests: 0,
          requestedCopies: 0,
        };

        groups.set(key, {
          ...previous,
          studentRequests: previous.studentRequests + 1,
          requestedCopies:
            previous.requestedCopies +
            (Number(request.quantity) || 1),
        });
      });

    return [...groups.values()].sort(
      (a, b) => b.requestedCopies - a.requestedCopies
    );
  }, [requests]);

  const metrics = useMemo(() => {
    const activePlans = plans.filter(
      (plan) =>
        !["Received", "Cancelled"].includes(plan.status)
    );

    const pricedPlans = activePlans.filter(
      (plan) =>
        plan.unitPrice !== "" &&
        plan.unitPrice !== null &&
        plan.unitPrice !== undefined &&
        Number.isFinite(Number(plan.unitPrice))
    );

    return {
      titles: inventory.length,
      lowStock: inventory.filter(
        (book) => book.stockLevel === "Low Stock"
      ).length,
      outOfStock: inventory.filter(
        (book) => book.stockLevel === "Out of Stock"
      ).length,
      activePlans: activePlans.length,
      requiredCopies: activePlans.reduce(
        (sum, plan) =>
          sum + positive(plan.requiredCopies),
        0
      ),
      estimatedBudget: pricedPlans.reduce(
        (sum, plan) =>
          sum +
          positive(plan.requiredCopies) *
            positive(plan.unitPrice),
        0
      ),
      unpricedPlans:
        activePlans.length - pricedPlans.length,
      demand: requestDemand.reduce(
        (sum, item) => sum + item.requestedCopies,
        0
      ),
    };
  }, [inventory, plans, requestDemand]);

  const rows = useMemo(() => {
    if (view === "plans") {
      return [...plans]
        .filter((plan) => {
          const text = [
            plan.bookTitle,
            plan.bookId,
            plan.priority,
            plan.status,
            plan.notes,
          ]
            .join(" ")
            .toLowerCase();

          return (
            text.includes(search.toLowerCase()) &&
            (filter === "All" || plan.status === filter)
          );
        })
        .sort((a, b) =>
          String(b.updatedAt || b.createdAt || "").localeCompare(
            String(a.updatedAt || a.createdAt || "")
          )
        );
    }

    if (view === "demand") {
      return requestDemand.filter((item) =>
        String(item.bookTitle || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    return inventory.filter((book) => {
      const text = [
        book.title,
        book.author,
        book.isbn,
        book.id,
        book.category,
      ]
        .join(" ")
        .toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (filter === "All" || book.stockLevel === filter)
      );
    });
  }, [
    view,
    plans,
    inventory,
    requestDemand,
    search,
    filter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  async function refresh() {
  try {
    setError("");
    await reloadPurchasePlans();
    setFeedback("Purchase plans refreshed from MongoDB.");
  } catch (err) {
    setError(err.message || "Refresh failed.");
  }
}

  
  async function reloadPurchasePlans() {
    const data = await getLibraryPurchasePlans();

    const plans = (Array.isArray(data) ? data : []).map(
      (plan) => ({
        ...plan,
        id: String(plan._id || plan.id),
        bookId: String(plan.bookId || ""),
      })
    );

    setSources((previous) => ({
      ...previous,
      stock: {
        rows: plans,
        state: "available",
      },
    }));

    return plans;
  }


  function openNew(book = null) {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      bookId: book?.id || "",
      bookTitle: book?.title || "",
      priority:
        book?.stockLevel === "Out of Stock"
          ? "Urgent"
          : book?.stockLevel === "Low Stock"
          ? "High"
          : "Medium",
      requiredCopies: Math.max(
        1,
        book?.demand || 1
      ),
    });
    setFormOpen(true);
    setError("");
  }

  function editPlan(plan) {
    setEditingId(plan.id);
    setForm({
      ...EMPTY_FORM,
      ...plan,
    });
    setFormOpen(true);
    setError("");
  }

  async function savePlan() {
    const title = String(form.bookTitle || "").trim();
    const required = Number(form.requiredCopies);

    if (!title) {
      setError("Book title is required.");
      return;
    }

    if (
      !Number.isInteger(required) ||
      required < 1 ||
      required > 100000
    ) {
      setError(
        "Required copies must be an integer from 1 to 100000."
      );
      return;
    }

    if (
      form.unitPrice !== "" &&
      (!Number.isFinite(Number(form.unitPrice)) ||
        Number(form.unitPrice) < 0)
    ) {
      setError("Enter a valid non-negative unit price.");
      return;
    }

    if (
      !PRIORITIES.includes(form.priority) ||
      !STATUSES.includes(form.status)
    ) {
      setError("Invalid purchase priority or status.");
      return;
    }

    if (form.bookId) {
      const catalogBook = books.find(
        (book) => String(book.id) === String(form.bookId)
      );

      if (!catalogBook) {
        setError("The selected catalog book no longer exists.");
        return;
      }
    }

    const duplicateActive = plans.some(
      (plan) =>
        plan.id !== editingId &&
        !["Received", "Cancelled"].includes(plan.status) &&
        !["Received", "Cancelled"].includes(form.status) &&
        (form.bookId
          ? String(plan.bookId) === String(form.bookId)
          : !plan.bookId &&
            String(plan.bookTitle || "")
              .trim()
              .toLowerCase() === title.toLowerCase())
    );

    if (duplicateActive) {
      setError(
        "An active purchase plan already exists for this book. Edit that plan instead."
      );
      return;
    }

  
    const record = {
      bookId: String(form.bookId || ""),
      bookTitle: title,
      requiredCopies: required,
      unitPrice:
        form.unitPrice === ""
          ? null
          : Number(form.unitPrice),
      priority: form.priority,
      status: form.status,
      notes: String(form.notes || "").trim(),
    };

    try {
      setError("");

      if (editingId) {
        await updateLibraryPurchasePlan(
          editingId,
          record
        );
      } else {
        await createLibraryPurchasePlan(record);
      }

      await reloadPurchasePlans();

      setFeedback(
        editingId
          ? "Purchase plan updated in MongoDB."
          : "Purchase plan saved to MongoDB."
      );

      setFormOpen(false);
      setEditingId(null);
      setPage(1);
    } catch (err) {
      setError(
        err.message ||
        "Could not save purchase plan to MongoDB."
      );
      setFeedback("");
    }
  }


  
  async function deletePlan(plan) {
    if (
      !window.confirm(
        `Delete the purchase plan for "${plan.bookTitle}"?`
      )
    ) {
      return;
    }

    try {
      setError("");

      await deleteLibraryPurchasePlan(plan.id);
      await reloadPurchasePlans();

      setFeedback(
        "Purchase plan deleted from MongoDB."
      );
    } catch (err) {
      setError(
        err.message ||
        "Could not delete purchase plan."
      );
      setFeedback("");
    }
  }


  function exportCurrentView() {
    let headers;
    let exportRows;

    if (view === "inventory") {
      headers = [
        "Book ID",
        "Title",
        "Category",
        "Total Copies",
        "Borrowed",
        "Available",
        "Active Demand",
        "Stock Level",
      ];

      exportRows = rows.map((book) => [
        book.id,
        book.title,
        book.category,
        book.total,
        book.borrowed ?? "",
        book.available ?? "",
        book.demand,
        book.stockLevel,
      ]);
    } else if (view === "demand") {
      headers = [
        "Book Title",
        "Book ID",
        "Student Requests",
        "Requested Copies",
      ];

      exportRows = rows.map((item) => [
        item.bookTitle,
        item.bookId,
        item.studentRequests,
        item.requestedCopies,
      ]);
    } else {
      headers = [
        "Plan ID",
        "Book Title",
        "Book ID",
        "Required Copies",
        "Unit Price (BDT)",
        "Estimated Cost (BDT)",
        "Priority",
        "Status",
        "Notes",
        "Created",
        "Updated",
      ];

      exportRows = rows.map((plan) => [
        plan.id,
        plan.bookTitle,
        plan.bookId,
        plan.requiredCopies,
        plan.unitPrice,
        plan.unitPrice === ""
          ? ""
          : positive(plan.unitPrice) *
            positive(plan.requiredCopies),
        plan.priority,
        plan.status,
        plan.notes,
        plan.createdAt,
        plan.updatedAt,
      ]);
    }

    exportCSV(
      `UniBee_Library_${view}_Stock.csv`,
      headers,
      exportRows
    );

    setFeedback("CSV exported successfully.");
  }

  const tabs = [
    { id: "inventory", label: "Stock Overview" },
    { id: "demand", label: "Student Demand" },
    { id: "plans", label: "Purchase Plans" },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Library Operations
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Stock Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor inventory shortages, analyze book
            demand, and plan new purchases.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportCurrentView}
            className="inline-flex items-center gap-2 rounded-xl border border-[#234E43]/15 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => openNew()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
          >
            <Plus size={18} />
            New Purchase Plan
          </button>
        </div>
      </section>

      {/* DATA WARNINGS */}
      {(sources.books.state !== "available" ||
        sources.loans.state !== "available" ||
        sources.requests.state !== "available") && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
          <Database size={19} className="mt-0.5 shrink-0" />

          <p>
            Some inventory, loan, or student request data
            has not been saved yet. Availability and demand
            figures may be incomplete. Missing information
            is displayed as unknown where necessary.
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

      {/* KPI CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Book Titles"
          value={
            sources.books.state === "available"
              ? formatNumber(metrics.titles)
              : "—"
          }
          subtitle="Catalog entries"
          icon={BookOpen}
        />

        <MetricCard
          title="Low Stock"
          value={
            sources.books.state === "available" && loansReady
              ? metrics.lowStock
              : "—"
          }
          subtitle="Active titles with 1–3 available copies"
          icon={AlertTriangle}
          tone="gold"
        />

        <MetricCard
          title="Out of Stock"
          value={
            sources.books.state === "available" && loansReady
              ? metrics.outOfStock
              : "—"
          }
          subtitle="Active titles with zero available copies"
          icon={PackageX}
          tone="red"
        />

        <MetricCard
          title="Student Demand"
          value={
            sources.requests.state === "available"
              ? metrics.demand
              : "—"
          }
          subtitle="Requested copies, not guaranteed purchases"
          icon={TrendingUp}
          tone="blue"
        />

        <MetricCard
          title="Copies to Purchase"
          value={
            sources.stock.state === "available"
              ? metrics.requiredCopies
              : "—"
          }
          subtitle="Required copies in active purchase plans"
          icon={PackagePlus}
        />

        <MetricCard
          title="Estimated Budget"
          value={
            sources.stock.state === "available"
              ? money(metrics.estimatedBudget)
              : "—"
          }
          subtitle={
            metrics.unpricedPlans > 0
              ? `${metrics.unpricedPlans} active plan(s) have no unit price`
              : "Sum of priced active purchase plans"
          }
          icon={Wallet}
          tone="gold"
        />
      </section>

      {/* TABS */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setView(tab.id);
                  setSearch("");
                  setFilter("All");
                  setPage(1);
                }}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  view === tab.id
                    ? "bg-[#234E43] text-white"
                    : "bg-[#F6F8F3] text-[#234E43] hover:bg-[#A6C1A4]/25"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#234E43]">
                {view === "inventory"
                  ? "Inventory Stock Overview"
                  : view === "demand"
                  ? "Student Book Demand"
                  : "Purchase Planning Records"}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {view === "inventory"
                  ? "Current stock levels calculated from saved loans"
                  : view === "demand"
                  ? "Demand calculated from pending and approved requests"
                  : "Additional book requirements and purchasing progress"}
              </p>
            </div>

            <span className="rounded-full bg-[#F6F8F3] px-3 py-1.5 text-xs font-semibold text-[#234E43]">
              {rows.length} Records
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_210px]">
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
                placeholder="Search books or purchase plans..."
                aria-label="Search stock records"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
              />
            </div>

            {view !== "demand" ? (
              <select
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter stock records"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#234E43]"
              >
                <option value="All">All Statuses</option>

                {(view === "plans"
                  ? STATUSES
                  : [
                      "Available",
                      "Low Stock",
                      "Out of Stock",
                      "Inactive",
                      "Unknown",
                    ]
                ).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center justify-center rounded-xl bg-[#F6F8F3] px-4 text-xs font-semibold text-[#234E43]">
                Active Requests Only
              </div>
            )}
          </div>
        </div>

        {/* INVENTORY TABLE */}
        {view === "inventory" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Book",
                    "Total",
                    "Borrowed",
                    "Available",
                    "Demand",
                    "Stock Status",
                    "Action",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-5 py-4 font-semibold"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="max-w-[250px] truncate text-sm font-bold text-[#234E43]">
                        {book.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {book.author || book.id}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {book.total}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {book.borrowed ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-[#234E43]">
                      {book.available ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {sources.requests.state === "available"
                        ? book.demand
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <Pill value={book.stockLevel} />
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openNew(book)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#A6C1A4]/25 px-3 py-2 text-xs font-semibold text-[#234E43]"
                      >
                        <Plus size={15} />
                        Plan Purchase
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DEMAND TABLE */}
        {view === "demand" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left">
              <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Requested Book",
                    "Student Requests",
                    "Requested Copies",
                    "Catalog Status",
                    "Action",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-5 py-4 font-semibold"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((item) => {
                  const book = inventory.find(
                    (entry) =>
                      String(entry.id) === String(item.bookId)
                  );

                  return (
                    <tr key={item.key} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-[#234E43]">
                          {item.bookTitle}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {item.bookId || "Not linked to catalog"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.studentRequests}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-[#234E43]">
                        {item.requestedCopies}
                      </td>

                      <td className="px-5 py-4">
                        <Pill
                          value={
                            book
                              ? book.stockLevel
                              : "Unknown"
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            openNew({
                              id: item.bookId,
                              title: item.bookTitle,
                              demand: item.requestedCopies,
                              stockLevel: book?.stockLevel,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-[#A6C1A4]/25 px-3 py-2 text-xs font-semibold text-[#234E43]"
                        >
                          <ShoppingCart size={15} />
                          Create Plan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PURCHASE PLANS TABLE */}
        {view === "plans" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-[#F6F8F3] text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Book",
                    "Required",
                    "Unit Price",
                    "Estimated Cost",
                    "Priority",
                    "Status",
                    "Updated",
                    "Actions",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-5 py-4 font-semibold"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="max-w-[220px] truncate text-sm font-bold text-[#234E43]">
                        {plan.bookTitle}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {plan.bookId || "New acquisition"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-[#234E43]">
                      {plan.requiredCopies}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      {plan.unitPrice === ""
                        ? "Not priced"
                        : money(plan.unitPrice)}
                    </td>

                    <td className="px-5 py-4 text-xs font-semibold text-[#234E43]">
                      {plan.unitPrice === ""
                        ? "—"
                        : money(
                            positive(plan.requiredCopies) *
                              positive(plan.unitPrice)
                          )}
                    </td>

                    <td className="px-5 py-4">
                      <Pill value={plan.priority} />
                    </td>

                    <td className="px-5 py-4">
                      <Pill value={plan.status} />
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-500">
                      {formatDate(
                        plan.updatedAt || plan.createdAt
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editPlan(plan)}
                          aria-label={`Edit plan for ${plan.bookTitle}`}
                          className="rounded-lg bg-sky-50 p-2 text-sky-700"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => deletePlan(plan)}
                          aria-label={`Delete plan for ${plan.bookTitle}`}
                          className="rounded-lg bg-rose-50 p-2 text-rose-700"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {visibleRows.length === 0 && (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <PackageSearch size={34} className="text-[#A6C1A4]" />

            <p className="mt-3 text-sm font-semibold text-[#234E43]">
              No records found
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Add a purchase plan or adjust your filters.
            </p>
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} · {rows.length} records
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

      {/* EXPLANATION */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Important:</strong> Student demand is calculated from
        pending and approved requests, but that does not automatically
        mean every requested copy must be purchased. Librarians
        decide the purchase quantity. Marking a plan as "Received"
        closes the purchasing requirement but does not modify the
        Book Inventory. Update or add the received copies through
        Book Inventory separately.
      </section>

      {/* MODAL */}
      {formOpen && (
        <StockForm
          form={form}
          setForm={setForm}
          books={books}
          editing={Boolean(editingId)}
          onSave={savePlan}
          onClose={() => {
            setFormOpen(false);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}
