
import { useEffect, useMemo, useState } from "react";
import {
  getLibraryBooks,
  getLibraryRequests,
  createLibraryRequest,
  getLibraryAnnouncements,
} from "../services/libraryApi";
import {
  BookOpen,
  Search,
  LibraryBig,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock3,
  ArrowUpRight,
  X,
  BookMarked,
  UserRound,
  ClipboardList,
  Megaphone,
  AlertCircle,
  Send,
  RefreshCw,
} from "lucide-react";

// ========================================
// SHARED LIBRARY STORAGE
// ========================================

const KEYS = {
  books: "unibee-admin-library-books-v1",
  loans: "unibee-admin-library-loans-v1",
  requests: "unibee-librarian-book-requests-v1",
  announcements: "unibee-librarian-announcements-v1",
  identity: "unibee-student-library-identity-v1",
  settings: "unibee-librarian-settings-v1",
};

const COLORS = [
  "#234E43",
  "#426B72",
  "#52677F",
  "#8B795E",
  "#706A91",
  "#596F5E",
];

// ========================================
// STORAGE HELPERS
// ========================================

function readRows(key) {
  try {
    const saved = localStorage.getItem(key);

    if (saved === null) {
      return {
        rows: [],
        status: "missing",
      };
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return {
        rows: [],
        status: "invalid",
      };
    }

    return {
      rows: parsed,
      status: "available",
    };
  } catch {
    return {
      rows: [],
      status: "invalid",
    };
  }
}

function getSources() {
  return {
    books: readRows(KEYS.books),
    loans: readRows(KEYS.loans),
    requests: readRows(KEYS.requests),
    announcements: {
  rows: [],
  status: "loading",
},
  };
}

function getIdentity() {
  try {
    const raw = localStorage.getItem(KEYS.identity);

    if (!raw) {
      return {
        studentId: "",
        studentName: "",
      };
    }

    const value = JSON.parse(raw);

    return {
      studentId:
        typeof value?.studentId === "string"
          ? value.studentId
          : "",
      studentName:
        typeof value?.studentName === "string"
          ? value.studentName
          : "",
    };
  } catch {
    return {
      studentId: "",
      studentName: "",
    };
  }
}

function getSaved(studentId) {
  const id = String(studentId || "")
    .trim()
    .toLowerCase();

  if (!id) return [];

  try {
    const raw = localStorage.getItem(
      `unibee-student-library-saved-v1:${id}`
    );

    const parsed = JSON.parse(raw || "[]");

    return Array.isArray(parsed)
      ? parsed.map(String)
      : [];
  } catch {
    return [];
  }
}

function getSettings() {
  try {
    const raw = localStorage.getItem(KEYS.settings);
    const parsed = raw ? JSON.parse(raw) : {};

    return {
      allowStudentRequests:
        parsed?.requests?.allowStudentRequests !== false,
      allowOutOfStockRequests:
        parsed?.requests?.allowOutOfStockRequests !== false,
    };
  } catch {
    return {
      allowStudentRequests: true,
      allowOutOfStockRequests: true,
    };
  }
}

// ========================================
// GENERAL HELPERS
// ========================================

function today() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function showDate(value) {
  if (!value) return "—";

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? `${value}T12:00:00`
      : value
  );

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `request-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function getLoanStatus(loan) {
  if (loan.returnDate) return "Returned";

  if (loan.dueDate && loan.dueDate < today()) {
    return "Overdue";
  }

  return "Borrowed";
}

function isStudentAnnouncement(item) {
  if (item.status !== "Published") return false;

  if (
    item.publishDate &&
    item.publishDate > today()
  ) {
    return false;
  }

  if (
    item.expiryDate &&
    item.expiryDate < today()
  ) {
    return false;
  }

  return [
    "All Students",
    "Students & Faculty",
    "Everyone",
  ].includes(item.audience);
}

// ========================================
// REUSABLE UI COMPONENTS
// ========================================

function StatusBadge({ status }) {
  const colors = {
    Pending: "bg-amber-50 text-amber-800",
    Approved: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-rose-50 text-rose-700",
    Fulfilled: "bg-sky-50 text-sky-700",
    Borrowed: "bg-sky-50 text-sky-700",
    Overdue: "bg-rose-50 text-rose-700",
    Returned: "bg-[#EAF2E8] text-[#477764]",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
        colors[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="rounded-3xl border border-[#E2EADC] bg-white px-6 py-14 text-center">
      <Icon
        size={40}
        className="mx-auto text-[#A6C1A4]"
      />

      <h3 className="mt-4 text-lg font-bold text-[#234E43]">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#718579]">
        {description}
      </p>
    </div>
  );
}

// ========================================
// MAIN STUDENT LIBRARY
// ========================================

export default function StudentLibrary() {
  // ======================================
  // STATE
  // ======================================

  const [sources, setSources] = useState(getSources);

  const [settings, setSettings] = useState(getSettings);

  const [identity, setIdentity] = useState(getIdentity);

  const [savedBooks, setSavedBooks] = useState(() =>
    getSaved(getIdentity().studentId)
  );

  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("All");

  const [availability, setAvailability] = useState("All");

  const [activeTab, setActiveTab] = useState("catalog");

  const [selectedBookId, setSelectedBookId] = useState(null);

  const [requestReason, setRequestReason] = useState("");

  const [requestQuantity, setRequestQuantity] = useState(1);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  
  // ==========================================
  // STUDENT LIBRARY ANNOUNCEMENTS — MONGODB
  // ==========================================

  const [announcementRefresh, setAnnouncementRefresh] =
    useState(0);

  useEffect(() => {
    if (activeTab !== "announcements") return;

    let active = true;

    async function loadAnnouncements() {
      try {
        const data = await getLibraryAnnouncements();

        if (!active) return;

        const normalized = (
          Array.isArray(data) ? data : []
        ).map((item) => ({
          ...item,
          id: String(item._id || item.id),
        }));

        setSources((previous) => ({
          ...previous,
          announcements: {
            rows: normalized,
            status: "available",
          },
        }));

        setError("");
      } catch (err) {
        if (!active) return;

        setSources((previous) => ({
          ...previous,
          announcements: {
            rows: [],
            status: "invalid",
          },
        }));

        setError(
          err.message ||
          "Could not load library announcements."
        );
      }
    }

    loadAnnouncements();

    return () => {
      active = false;
    };
  }, [activeTab, announcementRefresh]);


  // ========================================
  // STUDENT BOOK REQUESTS — MONGODB SYNC
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadMongoRequests() {
      try {
        const data = await getLibraryRequests();

        if (!active) return;

        setSources((previous) => ({
          ...previous,
          requests: {
            rows: Array.isArray(data) ? data : [],
            status: "available",
          },
        }));
      } catch (err) {
        if (!active) return;

        setSources((previous) => ({
          ...previous,
          requests: {
            rows: [],
            status: "invalid",
          },
        }));

        setError(
          err.message ||
          "Could not load requests from MongoDB."
        );
      }
    }

    loadMongoRequests();

    return () => {
      active = false;
    };
  }, [activeTab]);


  // ======================================
  // REFRESH WHEN STORAGE CHANGES
  // ======================================

  useEffect(() => {
  let active = true;

  async function syncBooks() {
    try {
      const books = await getLibraryBooks();

      if (!active) return;

      setSources((previous) => ({
        ...previous,
        books: {
          rows: Array.isArray(books) ? books : [],
          status: "available",
        },
      }));
    } catch (err) {
      if (!active) return;

      setSources((previous) => ({
        ...previous,
        books: {
          rows: [],
          status: "invalid",
        },
      }));

      setError(err.message || "Failed to load books from MongoDB.");
    }
  }

  function refresh() {
    setSettings(getSettings());
    syncBooks();
  }

  refresh();

  window.addEventListener("storage", refresh);
  document.addEventListener("visibilitychange", refresh);

  return () => {
    active = false;
    window.removeEventListener("storage", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}, []);

  // ======================================
  // STUDENT IDENTITY
  // ======================================

  const studentId = identity.studentId.trim();

  const studentName = identity.studentName.trim();

  const identityReady = Boolean(
    studentId && studentName
  );

  const booksReady =
    sources.books.status === "available";

  const loansReady =
    sources.loans.status === "available";

  const requestsReady =
    sources.requests.status !== "invalid";

  // ======================================
  // BOOK INVENTORY
  // ======================================

  
  // ======================================
  // BOOK INVENTORY — MONGODB CONNECTED
  // ======================================

  const books = useMemo(() => {
    return sources.books.rows.map((book, index) => {
      const id = String(book.id || book._id || "");

      const total = Math.max(
        0,
        Number(book.copies) || 0
      );

      const borrowed = sources.loans.rows.filter(
        (loan) =>
          String(loan.bookId) === id &&
          !loan.returnDate
      ).length;

      const enabled =
        String(book.status || "Active").toLowerCase() ===
        "active";

      // MongoDB is now the catalog source.
      // Until loans are API-connected, do not treat
      // browser loan records as authoritative.
      const available = Math.max(0, total);

      return {
        ...book,
        id,
        title: book.title || "Untitled Book",
        author: book.author || "Unknown Author",
        category: book.category || "General",
        total,
        borrowed,
        available,
        enabled,
        color: COLORS[index % COLORS.length],
      };
    });
  }, [sources.books.rows, sources.loans.rows]);


  const bookMap = useMemo(
    () =>
      new Map(
        books.map((book) => [
          book.id,
          book,
        ])
      ),
    [books]
  );

  const selectedBook = selectedBookId
    ? bookMap.get(String(selectedBookId))
    : null;

  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        books.map((book) => book.category)
      ),
    ],
    [books]
  );

  // ======================================
  // SEARCH AND FILTER
  // ======================================

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return books.filter((book) => {
      const matchesSearch = [
        book.title,
        book.author,
        book.category,
        book.isbn,
        book.id,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      const matchesCategory =
        category === "All" ||
        book.category === category;

      const matchesAvailability =
        availability === "All" ||
        (availability === "Available" &&
          book.enabled &&
          book.available !== null &&
          book.available > 0) ||
        (availability === "Unavailable" &&
          (book.available === 0 || !book.enabled));

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability
      );
    });
  }, [
    books,
    search,
    category,
    availability,
  ]);

  // ======================================
  // BORROWING HISTORY
  // ======================================

  const myLoans = useMemo(() => {
    if (!studentId) return [];

    return sources.loans.rows
      .filter(
        (loan) =>
          String(loan.studentId || "")
            .trim()
            .toLowerCase() === studentId.toLowerCase()
      )
      .map((loan) => ({
        ...loan,
        bookTitle:
          bookMap.get(String(loan.bookId))?.title ||
          loan.bookTitle ||
          String(loan.bookId || "Unknown Book"),
        calculatedStatus: getLoanStatus(loan),
      }))
      .sort((a, b) =>
        String(b.issueDate || "").localeCompare(
          String(a.issueDate || "")
        )
      );
  }, [
    studentId,
    sources.loans.rows,
    bookMap,
  ]);

  // ======================================
  // STUDENT REQUESTS
  // ======================================

    const myRequests = useMemo(() => {
    return [...sources.requests.rows]
      .sort((a, b) =>
        new Date(b.createdAt || b.requestedAt || 0) -
        new Date(a.createdAt || a.requestedAt || 0)
      );
  }, [sources.requests.rows]);

  // ======================================
  // LIBRARY ANNOUNCEMENTS
  // ======================================

  const announcements = useMemo(() => {
    return sources.announcements.rows
      .filter(isStudentAnnouncement)
      .sort(
        (a, b) =>
          Number(Boolean(b.featured)) -
            Number(Boolean(a.featured)) ||
          String(b.publishDate || "").localeCompare(
            String(a.publishDate || "")
          )
      );
  }, [sources.announcements.rows]);

  // ======================================
  // SAVED BOOKS
  // ======================================

  const visibleBooks =
    activeTab === "saved"
      ? filteredBooks.filter((book) =>
          savedBooks.includes(book.id)
        )
      : filteredBooks;

  // ======================================
  // DASHBOARD SUMMARY
  // ======================================

  const summaryCards = [
    {
      label: "Library Titles",
      value: booksReady ? books.length : "—",
      icon: LibraryBig,
    },
    {
      label: "Available Titles",
      value:
        booksReady && loansReady
          ? books.filter(
              (book) =>
                book.enabled &&
                book.available > 0
            ).length
          : "—",
      icon: CheckCircle2,
    },
    {
      label: "Saved Books",
      value: savedBooks.length,
      icon: BookmarkCheck,
    },
    {
      label: "Active Borrowings",
      value:
        identityReady && loansReady
          ? myLoans.filter(
              (loan) => !loan.returnDate
            ).length
          : "—",
      icon: BookMarked,
    },
  ];

  // ======================================
  // STUDENT IDENTITY UPDATE
  // ======================================

  function updateIdentity(field, value) {
    const next = {
      ...identity,
      [field]: value,
    };

    setIdentity(next);

    setSavedBooks(
      getSaved(next.studentId)
    );

    setMessage("");
    setError("");

    try {
      localStorage.setItem(
        KEYS.identity,
        JSON.stringify(next)
      );
    } catch {
      setError(
        "Browser storage could not save student details."
      );
    }
  }

  // ======================================
  // BOOKMARK MANAGEMENT
  // ======================================

  function toggleSave(bookId) {
    if (!studentId) {
      setError(
        "Enter your Student ID to save a personal book list."
      );
      return;
    }

    const key =
      `unibee-student-library-saved-v1:${studentId.toLowerCase()}`;

    const next = savedBooks.includes(bookId)
      ? savedBooks.filter(
          (id) => id !== bookId
        )
      : [...savedBooks, bookId];

    try {
      localStorage.setItem(
        key,
        JSON.stringify(next)
      );

      setSavedBooks(next);
      setError("");
    } catch {
      setError(
        "Could not save your reading list."
      );
    }
  }

  // ======================================
  // BOOK DETAILS
  // ======================================

  function openBook(book) {
    setSelectedBookId(book.id);

    setRequestReason("");
    setRequestQuantity(1);

    setMessage("");
    setError("");
  }

  // ======================================
  // SUBMIT BOOK REQUEST
  // ======================================

  
  // ========================================
  // SUBMIT BOOK REQUEST TO MONGODB
  // ========================================

  async function submitRequest() {
    setError("");
    setMessage("");

    if (!selectedBook) {
      setError("Please select a book first.");
      return;
    }

    if (!selectedBook.enabled) {
      setError("This book is currently inactive.");
      return;
    }

    if (!settings.allowStudentRequests) {
      setError("Book requests are currently disabled.");
      return;
    }

    if (
      selectedBook.available === 0 &&
      !settings.allowOutOfStockRequests
    ) {
      setError("This book is out of stock.");
      return;
    }

    const quantity = Number(requestQuantity);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      setError("Quantity must be between 1 and 100.");
      return;
    }

    try {
      // Read actual requests from MongoDB.
      const existing = await getLibraryRequests();

      const requests = Array.isArray(existing)
        ? existing
        : [];

      const alreadyRequested = requests.some((request) => {
        const requestBookId = String(
          request.book?._id ||
          request.book ||
          request.bookId ||
          ""
        );

        return (
          requestBookId === String(selectedBook.id) &&
          ["Pending", "Approved"].includes(request.status)
        );
      });

      if (alreadyRequested) {
        setError(
          "You already have a pending or approved request for this book."
        );
        return;
      }

      // Server identifies the student from the real login.
      await createLibraryRequest({
        bookId: selectedBook.id,
        quantity,
        reason: requestReason.trim(),
      });

      // Fetch saved data again to confirm persistence.
      const updated = await getLibraryRequests();

      setSources((previous) => ({
        ...previous,
        requests: {
          rows: Array.isArray(updated) ? updated : [],
          status: "available",
        },
      }));

      setRequestReason("");
      setRequestQuantity(1);

      setMessage(
        "Book request submitted successfully to MongoDB. The Librarian can now review it."
      );
    } catch (err) {
      setError(
        err.message ||
        "Book request could not be saved to MongoDB."
      );
    }
  }

  // ======================================
  // REFRESH ALL LIBRARY DATA
  // ======================================

  async function refreshData() {
  setError("");
  setMessage("");

  try {
    const books = await getLibraryBooks();

    setSources((previous) => ({
      ...previous,
      books: {
        rows: Array.isArray(books) ? books : [],
        status: "available",
      },
    }));

    setSettings(getSettings());
    setSavedBooks(getSaved(studentId));

    setMessage("Book catalog refreshed from MongoDB.");
  } catch (err) {
    setSources((previous) => ({
      ...previous,
      books: {
        rows: [],
        status: "invalid",
      },
    }));

    setError(err.message || "Could not refresh book catalog.");
  }
}

  // ======================================
  // NAVIGATION TABS
  // ======================================

  const tabs = [
    {
      id: "catalog",
      label: "Book Catalog",
      icon: BookOpen,
    },
    {
      id: "saved",
      label: "Saved Books",
      icon: Bookmark,
    },
    {
      id: "history",
      label: "Borrowing History",
      icon: Clock3,
    },
    {
      id: "requests",
      label: "My Requests",
      icon: ClipboardList,
    },
    {
      id: "announcements",
      label: "Announcements",
      icon: Megaphone,
    },
  ];

  // ======================================
  // PAGE UI
  // ======================================

  return (
    <div className="space-y-8">

      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            CAMPUS RESOURCES
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            Digital Library
          </h1>

          <p className="mt-3 text-[#718579]">
            Discover academic resources, explore books,
            and organize your reading journey.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
  refreshData();
  setAnnouncementRefresh((value) => value + 1);
}}
          className="flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43]"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(
          ({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={24} />
              </div>

              <p className="text-sm text-[#718579]">
                {label}
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
                {value}
              </h2>
            </div>
          )
        )}
      </div>

      {/* LIBRARY HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-8 text-white md:p-10">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[40px] border-white/5" />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-[#DCE9DE]">
            <BookOpen
              size={16}
              className="text-[#D9A536]"
            />
            EXPLORE KNOWLEDGE
          </div>

          <h2 className="text-3xl font-extrabold md:text-4xl">
            Your next great idea{" "}
            <span className="text-[#E8BE62]">
              starts here.
            </span>
          </h2>

          <p className="mt-4 leading-relaxed text-[#C9DDCF]">
            Find textbooks, explore learning resources,
            and discover materials that support your
            academic growth.
          </p>
        </div>
      </section>

      {/* STUDENT DETAILS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-[#234E43]">
          <UserRound size={19} />

          <h2 className="font-bold">
            Student Details
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-xs font-bold text-[#45685B]">
            Student ID

            <input
              type="text"
              value={identity.studentId}
              onChange={(event) =>
                updateIdentity(
                  "studentId",
                  event.target.value
                )
              }
              placeholder="Enter your Student ID"
              className="mt-2 w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm outline-none focus:border-[#A6C1A4]"
            />
          </label>

          <label className="block text-xs font-bold text-[#45685B]">
            Full Name

            <input
              type="text"
              value={identity.studentName}
              onChange={(event) =>
                updateIdentity(
                  "studentName",
                  event.target.value
                )
              }
              placeholder="Enter your full name"
              className="mt-2 w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm outline-none focus:border-[#A6C1A4]"
            />
          </label>
        </div>

        <p className="mt-3 text-xs leading-5 text-[#718579]">
          Frontend demo only: Student ID is entered manually
          and is not verified. Do not use sensitive personal
          information for testing.
        </p>
      </section>

      {/* DATA WARNINGS */}
      {(!booksReady || !loansReady) && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {!booksReady
            ? "The Librarian has not saved a valid book catalog in this browser. "
            : ""}

          {!loansReady
            ? "Loan data is unavailable, so book availability and borrowing history cannot be verified."
            : ""}
        </p>
      )}

      {/* FEEDBACK */}
      {message && (
        <p
          role="status"
          className="rounded-xl bg-[#EAF2E8] p-4 text-sm font-semibold text-[#234E43]"
        >
          {message}
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

      {/* NAVIGATION */}
      <div className="flex flex-wrap gap-3">
        {tabs.map(
          ({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                setMessage("");
                setError("");
              }}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
                activeTab === id
                  ? "bg-[#234E43] text-white"
                  : "border border-[#E2EADC] bg-white text-[#607B6C] hover:bg-[#F1F7EF]"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          )
        )}
      </div>

      {/* ================================= */}
      {/* BOOK CATALOG / SAVED BOOKS        */}
      {/* ================================= */}

      {(activeTab === "catalog" ||
        activeTab === "saved") && (
        <>
          {/* SEARCH FILTERS */}
          <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search books, authors, or subjects..."
                  className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
                />
              </div>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                aria-label="Filter books by category"
                className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
              >
                {categories.map((value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ))}
              </select>

              <select
                value={availability}
                onChange={(event) =>
                  setAvailability(event.target.value)
                }
                aria-label="Filter books by availability"
                className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
              >
                <option value="All">
                  All Availability
                </option>

                <option value="Available">
                  Available
                </option>

                <option value="Unavailable">
                  Unavailable
                </option>
              </select>
            </div>

            <p className="mt-4 text-sm text-[#718579]">
              Showing {visibleBooks.length} books
            </p>
          </div>

          {/* BOOK CARDS */}
          {visibleBooks.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleBooks.map((book) => {
                const isSaved =
                  savedBooks.includes(book.id);

                return (
                  <article
                    key={book.id}
                    className="group overflow-hidden rounded-3xl border border-[#E2EADC] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#234E43]/10"
                  >
                    {/* BOOK COVER */}
                    <div
                      className="relative flex h-48 items-center justify-center overflow-hidden p-6"
                      style={{
                        backgroundColor: book.color,
                      }}
                    >
                      <div className="absolute -right-14 -top-20 h-48 w-48 rounded-full border-[30px] border-white/10" />

                      <div className="relative z-10 flex h-32 w-28 flex-col justify-between rounded-lg border-l-[7px] border-black/20 bg-white/15 p-4 shadow-2xl">
                        <BookOpen
                          size={29}
                          className="text-white"
                        />

                        <div className="space-y-2">
                          <div className="h-1.5 w-full rounded bg-white/70" />
                          <div className="h-1.5 w-3/4 rounded bg-white/40" />
                          <div className="h-1.5 w-1/2 rounded bg-white/40" />
                        </div>
                      </div>

                      {/* SAVE BOOK */}
                      <button
                        type="button"
                        onClick={() =>
                          toggleSave(book.id)
                        }
                        aria-label={
                          isSaved
                            ? "Remove saved book"
                            : "Save book"
                        }
                        aria-pressed={isSaved}
                        className="absolute right-4 top-4 rounded-xl bg-white p-2.5 text-[#234E43] shadow-sm transition hover:scale-105"
                      >
                        {isSaved ? (
                          <BookmarkCheck size={19} />
                        ) : (
                          <Bookmark size={19} />
                        )}
                      </button>
                    </div>

                    {/* BOOK INFORMATION */}
                    <div className="p-6">
                      <span className="rounded-full bg-[#EAF2E8] px-3 py-1.5 text-xs font-bold text-[#477764]">
                        {book.category}
                      </span>

                      <h3 className="mt-5 min-h-[56px] text-xl font-bold leading-snug text-[#234E43]">
                        {book.title}
                      </h3>

                      <p className="mt-2 text-sm text-[#718579]">
                        {book.author}
                      </p>

                      <div className="mt-5 flex items-center justify-between text-xs text-[#718579]">
                        <span>
                          {book.edition || "—"}
                        </span>

                        <span>
                          {book.year || "—"}
                        </span>
                      </div>

                      {/* AVAILABILITY */}
                      <div className="mt-5 border-t border-[#EDF1EB] pt-4">
                        {!book.enabled ? (
                          <span className="text-sm font-semibold text-slate-500">
                            Not active in library catalog
                          </span>
                        ) : book.available === null ? (
                          <span className="text-sm font-semibold text-amber-700">
                            Availability not verified
                          </span>
                        ) : book.available > 0 ? (
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#477764]">
                            <CheckCircle2 size={17} />
                            {book.available} copies available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
                            <Clock3 size={17} />
                            Currently unavailable
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => openBook(book)}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-4 py-3.5 font-bold text-white transition hover:bg-[#326657]"
                      >
                        View Book Details
                        <ArrowUpRight size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title={
                activeTab === "saved"
                  ? "No Saved Books Found"
                  : "No Books Found"
              }
              description={
                booksReady
                  ? "Try changing your filters, or ask the librarian to update the catalog."
                  : "Library inventory is not saved in this browser yet."
              }
            />
          )}
        </>
      )}

      {/* ================================= */}
      {/* BORROWING HISTORY                 */}
      {/* ================================= */}

      {activeTab === "history" && (
        <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#234E43]">
            Borrowing History
          </h2>

          <p className="mt-2 text-sm text-[#718579]">
            Review your borrowed and returned books.
          </p>

          {!identityReady || !loansReady ? (
            <div className="mt-5">
              <EmptyState
                icon={UserRound}
                title="Borrowing History Unavailable"
                description="Enter your Student ID and name, and ensure loan data has been saved by the librarian."
              />
            </div>
          ) : myLoans.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
                  <tr>
                    <th className="px-5 py-4">
                      Book
                    </th>

                    <th className="px-5 py-4">
                      Borrowed
                    </th>

                    <th className="px-5 py-4">
                      Due Date
                    </th>

                    <th className="px-5 py-4">
                      Returned
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {myLoans.map((loan) => (
                    <tr
                      key={loan.id}
                      className="border-b border-[#EDF1EB] text-sm"
                    >
                      <td className="px-5 py-4 font-semibold text-[#234E43]">
                        {loan.bookTitle}
                      </td>

                      <td className="px-5 py-4 text-[#718579]">
                        {showDate(loan.issueDate)}
                      </td>

                      <td className="px-5 py-4 text-[#718579]">
                        {showDate(loan.dueDate)}
                      </td>

                      <td className="px-5 py-4 text-[#718579]">
                        {showDate(loan.returnDate)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={loan.calculatedStatus}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={Clock3}
                title="No Borrowing Records"
                description="No saved borrowing records were found for this Student ID."
              />
            </div>
          )}
        </section>
      )}

      {/* ================================= */}
      {/* MY BOOK REQUESTS                  */}
      {/* ================================= */}

      {activeTab === "requests" && (
        <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#234E43]">
            My Book Requests
          </h2>

          <p className="mt-2 text-sm text-[#718579]">
            Track the requests reviewed by the Librarian.
            Approval does not mean a book has been issued.
          </p>

          {!identityReady ? (
            <div className="mt-5">
              <EmptyState
                icon={UserRound}
                title="Student Details Required"
                description="Enter your Student ID and full name to view your requests."
              />
            </div>
          ) : sources.requests.status === "invalid" ? (
            <div className="mt-5">
              <EmptyState
                icon={AlertCircle}
                title="Request Records Unavailable"
                description="Saved request data is invalid. Please contact the librarian."
              />
            </div>
          ) : myRequests.length > 0 ? (
            <div className="mt-6 space-y-3">
              {myRequests.map((request) => (
                <article
                  key={request.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-[#F6F8F3] p-5"
                >
                  <div>
                    <h3 className="font-bold text-[#234E43]">
                      {request.bookTitle}
                    </h3>

                    <p className="mt-2 text-xs text-[#718579]">
                      Quantity: {request.quantity || 1}
                      {" · "}
                      Requested:{" "}
                      {showDate(request.requestedAt)}
                    </p>

                    {request.reason && (
                      <p className="mt-2 text-xs text-[#718579]">
                        Reason: {request.reason}
                      </p>
                    )}

                    {request.reviewNote && (
                      <p className="mt-3 text-xs leading-6 text-[#607B6C]">
                        Librarian Remarks:{" "}
                        {request.reviewNote}
                      </p>
                    )}

                    {request.reviewedAt && (
                      <p className="mt-2 text-xs text-[#718579]">
                        Reviewed:{" "}
                        {showDate(request.reviewedAt)}
                      </p>
                    )}
                  </div>

                  <StatusBadge
                    status={request.status}
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={ClipboardList}
                title="No Requests Yet"
                description="Open a book from the catalog and submit your first request."
              />
            </div>
          )}
        </section>
      )}

      {/* ================================= */}
      {/* LIBRARY ANNOUNCEMENTS             */}
      {/* ================================= */}

      {activeTab === "announcements" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#234E43]">
              Library Announcements
            </h2>

            <p className="mt-2 text-sm text-[#718579]">
              Published library updates for students.
            </p>
          </div>

          {announcements.length > 0 ? (
            announcements.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#EAF2E8] px-3 py-1 text-xs font-bold text-[#477764]">
                    {item.category}
                  </span>

                  {item.featured && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      Featured
                    </span>
                  )}

                  <span className="text-xs text-[#718579]">
                    {showDate(item.publishDate)}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-[#234E43]">
                  {item.title}
                </h3>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#607B6C]">
                  {item.content}
                </p>
              </article>
            ))
          ) : (
            <EmptyState
              icon={Megaphone}
              title="No Published Announcements"
              description="Announcements published for students will appear here."
            />
          )}
        </section>
      )}

      {/* ================================= */}
      {/* BOOK DETAILS MODAL                */}
      {/* ================================= */}

      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedBookId(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="library-book-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
          >
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  LIBRARY RESOURCE
                </p>

                <h2
                  id="library-book-title"
                  className="mt-3 text-2xl font-extrabold text-[#234E43]"
                >
                  {selectedBook.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedBookId(null)
                }
                aria-label="Close book details"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            {/* DETAILS */}
            <div className="mt-6 grid gap-4 rounded-2xl bg-[#F6F8F3] p-5 text-sm text-[#45685B] sm:grid-cols-2">
              <p>
                <strong>Author:</strong>{" "}
                {selectedBook.author}
              </p>

              <p>
                <strong>Edition:</strong>{" "}
                {selectedBook.edition || "—"}
              </p>

              <p>
                <strong>Year:</strong>{" "}
                {selectedBook.year || "—"}
              </p>

              <p>
                <strong>ISBN:</strong>{" "}
                {selectedBook.isbn || "—"}
              </p>

              <p>
                <strong>Shelf:</strong>{" "}
                {selectedBook.shelf || "—"}
              </p>

              <p>
                <strong>Available:</strong>{" "}
                {selectedBook.enabled
                  ? selectedBook.available ?? "Unknown"
                  : "Inactive"}
                /{selectedBook.total}
              </p>
            </div>

            {/* ABOUT */}
            <h3 className="mt-7 font-bold text-[#234E43]">
              About This Book
            </h3>

            <p className="mt-3 leading-relaxed text-[#718579]">
              {selectedBook.description ||
                "No description provided yet."}
            </p>

            {/* REQUEST FORM */}
            <div className="mt-6 space-y-3 rounded-2xl border border-[#E2EADC] p-4">
              <p className="text-sm font-bold text-[#234E43]">
                Request This Book
              </p>

              <p className="text-xs leading-5 text-[#718579]">
                Submit a book request for Librarian review.
                This does not automatically reserve or issue
                a copy.
              </p>

              <label className="block text-xs font-semibold text-[#45685B]">
                Copies Requested

                <input
                  type="number"
                  min="1"
                  max="100"
                  value={requestQuantity}
                  onChange={(event) =>
                    setRequestQuantity(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm"
                />
              </label>

              <label className="block text-xs font-semibold text-[#45685B]">
                Reason (Optional)

                <textarea
                  rows={3}
                  maxLength={1000}
                  value={requestReason}
                  onChange={(event) =>
                    setRequestReason(event.target.value)
                  }
                  placeholder="Why do you need this book?"
                  className="mt-2 w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm"
                />
              </label>

              {!selectedBook.enabled && (
                <p className="text-xs font-semibold text-rose-700">
                  This book is inactive and cannot be requested.
                </p>
              )}

              {selectedBook.available === 0 && (
                <p className="text-xs font-semibold text-amber-700">
                  This book is currently unavailable.
                  {settings.allowOutOfStockRequests
                    ? " You can still submit a request."
                    : " New requests are disabled for out-of-stock books."}
                </p>
              )}
            </div>

            {/* MODAL FEEDBACK */}
            {message && (
              <p
                role="status"
                className="mt-5 rounded-xl bg-[#EAF2E8] p-4 text-sm text-[#234E43]"
              >
                {message}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
              >
                {error}
              </p>
            )}

            {/* ACTION BUTTONS */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  toggleSave(selectedBook.id)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#DCE8DA] px-5 py-3.5 font-bold text-[#234E43] hover:bg-[#F1F7EF]"
              >
                <Bookmark size={18} />

                {savedBooks.includes(selectedBook.id)
                  ? "Remove Saved"
                  : "Save Book"}
              </button>

              <button
                type="button"
                onClick={submitRequest}
                disabled={
                  !identityReady ||
                  !requestsReady ||
                  !settings.allowStudentRequests ||
                  !selectedBook.enabled ||
                  (selectedBook.available === 0 &&
                    !settings.allowOutOfStockRequests)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white hover:bg-[#326657] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={18} />
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="border-t border-[#E2EADC] pt-5 text-xs leading-6 text-[#8A9F90]">
        UniBee Student Portal — Digital Library.
        Browser-only demo: data is not synchronized
        across devices, and Student ID is not authenticated.
      </div>
    </div>
  );
}
