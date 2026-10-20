
import { useMemo, useState } from "react";
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
  Filter,
  CalendarDays,
  UserRound,
  RotateCcw,
} from "lucide-react";

// Demo data. Later this will come from MongoDB.
const libraryBooks = [
  {
    id: 1,
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen et al.",
    category: "Computer Science",
    edition: "4th Edition",
    year: 2022,
    isbn: "9780262046305",
    available: 4,
    total: 7,
    shelf: "CS-A12",
    color: "#234E43",
    description:
      "A comprehensive introduction to algorithms, data structures, algorithm design, and computational complexity.",
  },
  {
    id: 2,
    title: "Database System Concepts",
    author: "Abraham Silberschatz et al.",
    category: "Database",
    edition: "7th Edition",
    year: 2019,
    isbn: "9780078022159",
    available: 3,
    total: 5,
    shelf: "DB-B04",
    color: "#426B72",
    description:
      "Explore relational database concepts, SQL, data modeling, transactions, and database architecture.",
  },
  {
    id: 3,
    title: "Computer Networking: A Top-Down Approach",
    author: "James Kurose and Keith Ross",
    category: "Networking",
    edition: "8th Edition",
    year: 2021,
    isbn: "9780136681557",
    available: 0,
    total: 4,
    shelf: "NET-C08",
    color: "#52677F",
    description:
      "Learn networking fundamentals through an application-layer-first approach.",
  },
  {
    id: 4,
    title: "Clean Code",
    author: "Robert C. Martin",
    category: "Programming",
    edition: "1st Edition",
    year: 2008,
    isbn: "9780132350884",
    available: 5,
    total: 8,
    shelf: "PR-D11",
    color: "#8B795E",
    description:
      "Discover practical principles for writing readable, maintainable, and well-structured software.",
  },
  {
    id: 5,
    title: "Artificial Intelligence: A Modern Approach",
    author: "Stuart Russell and Peter Norvig",
    category: "Artificial Intelligence",
    edition: "4th Edition",
    year: 2021,
    isbn: "9780134610993",
    available: 2,
    total: 5,
    shelf: "AI-E05",
    color: "#706A91",
    description:
      "An introduction to artificial intelligence, search, reasoning, machine learning, and intelligent agents.",
  },
  {
    id: 6,
    title: "Computer Security: Principles and Practice",
    author: "William Stallings and Lawrie Brown",
    category: "Cybersecurity",
    edition: "4th Edition",
    year: 2018,
    isbn: "9780134794105",
    available: 3,
    total: 6,
    shelf: "SEC-F02",
    color: "#596F5E",
    description:
      "Understand essential cybersecurity concepts, cryptography, access control, and network security.",
  },
];

const initialBorrowHistory = [
  {
    id: "BR-1001",
    book: "Clean Code",
    borrowed: "2026-09-12",
    due: "2026-09-26",
    returned: "2026-09-24",
    status: "Returned",
  },
  {
    id: "BR-1002",
    book: "Database System Concepts",
    borrowed: "2026-10-01",
    due: "2026-10-15",
    returned: null,
    status: "Borrowed",
  },
];

const categories = [
  "All",
  ...new Set(libraryBooks.map((book) => book.category)),
];

function StudentLibrary() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [availability, setAvailability] = useState("All");
  const [activeTab, setActiveTab] = useState("catalog");
  const [savedBooks, setSavedBooks] = useState([]);
  const [borrowHistory, setBorrowHistory] =
    useState(initialBorrowHistory);
  const [selectedBook, setSelectedBook] = useState(null);
  const [message, setMessage] = useState("");

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return libraryBooks.filter((book) => {
      const matchesSearch =
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.category.toLowerCase().includes(query);

      const matchesCategory =
        category === "All" || book.category === category;

      const matchesAvailability =
        availability === "All" ||
        (availability === "Available" && book.available > 0) ||
        (availability === "Unavailable" && book.available === 0);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability
      );
    });
  }, [search, category, availability]);

  const availableTitles = libraryBooks.filter(
    (book) => book.available > 0
  ).length;

  const activeBorrowings = borrowHistory.filter(
    (record) => record.status === "Borrowed"
  ).length;

  const toggleSave = (bookId) => {
    setSavedBooks((previous) =>
      previous.includes(bookId)
        ? previous.filter((id) => id !== bookId)
        : [...previous, bookId]
    );
  };

  const openBook = (book) => {
    setSelectedBook(book);
    setMessage("");
  };

  const requestBorrow = () => {
    if (!selectedBook) return;

    if (selectedBook.available === 0) {
      setMessage("This book is currently unavailable.");
      return;
    }

    setMessage(
      "Demo request only. No library reservation or borrowing record has been created."
    );
  };

  const summaryCards = [
    {
      label: "Library Titles",
      value: libraryBooks.length,
      icon: LibraryBig,
    },
    {
      label: "Available Titles",
      value: availableTitles,
      icon: CheckCircle2,
    },
    {
      label: "Saved Books",
      value: savedBooks.length,
      icon: BookmarkCheck,
    },
    {
      label: "Active Borrowings",
      value: activeBorrowings,
      icon: BookMarked,
    },
  ];

  const visibleBooks =
    activeTab === "saved"
      ? filteredBooks.filter((book) =>
          savedBooks.includes(book.id)
        )
      : filteredBooks;

  return (
    <div className="space-y-8">
      {/* Page Header */}
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

      {/* Summary Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={24} />
              </div>

              <p className="text-sm text-[#718579]">
                {item.label}
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
                {item.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Library Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-8 text-white md:p-10">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[40px] border-white/5" />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-[#DCE9DE]">
            <BookOpen size={16} className="text-[#D9A536]" />
            EXPLORE KNOWLEDGE
          </div>

          <h2 className="text-3xl font-extrabold md:text-4xl">
            Your next great idea
            <span className="text-[#E8BE62]"> starts here.</span>
          </h2>

          <p className="mt-4 leading-relaxed text-[#C9DDCF]">
            Find textbooks, explore learning resources,
            and discover materials that support your academic growth.
          </p>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-3">
        {[
          { id: "catalog", label: "Book Catalog", icon: BookOpen },
          { id: "saved", label: "Saved Books", icon: Bookmark },
          {
            id: "history",
            label: "Borrowing History",
            icon: Clock3,
          },
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

      {activeTab !== "history" ? (
        <>
          {/* Search & Filters */}
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
                {categories.map((item) => (
                  <option key={item}>{item}</option>
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
                <option value="All">All Availability</option>
                <option value="Available">Available</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </div>

            <p className="mt-4 text-sm text-[#718579]">
              Showing {visibleBooks.length} books
            </p>
          </div>

          {/* Book Catalog */}
          {visibleBooks.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleBooks.map((book) => {
                const isSaved = savedBooks.includes(book.id);

                return (
                  <article
                    key={book.id}
                    className="group overflow-hidden rounded-3xl border border-[#E2EADC] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#234E43]/10"
                  >
                    {/* Stylized Book Cover */}
                    <div
                      className="relative flex h-48 items-center justify-center overflow-hidden p-6"
                      style={{ backgroundColor: book.color }}
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

                      <button
                        type="button"
                        onClick={() => toggleSave(book.id)}
                        aria-label={
                          isSaved ? "Remove saved book" : "Save book"
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
                        <span>{book.edition}</span>
                        <span>{book.year}</span>
                      </div>

                      <div className="mt-5 border-t border-[#EDF1EB] pt-4">
                        {book.available > 0 ? (
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
            <div className="rounded-3xl border border-[#E2EADC] bg-white px-6 py-16 text-center">
              <BookOpen
                size={42}
                className="mx-auto text-[#A6C1A4]"
              />
              <h3 className="mt-5 text-xl font-bold text-[#234E43]">
                No Books Found
              </h3>
              <p className="mt-2 text-[#718579]">
                Try changing your search or filters.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                  setAvailability("All");
                }}
                className="mt-5 rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white"
              >
                Clear Filters
              </button>
            </div>
          )}
        </>
      ) : (
        /* Borrowing History */
        <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-[#234E43]">
              Borrowing History
            </h2>
            <p className="mt-2 text-sm text-[#718579]">
              Review your borrowed and returned books.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
                <tr>
                  <th className="rounded-l-xl px-5 py-4">Book</th>
                  <th className="px-5 py-4">Borrowed</th>
                  <th className="px-5 py-4">Due Date</th>
                  <th className="px-5 py-4">Returned</th>
                  <th className="rounded-r-xl px-5 py-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {borrowHistory.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-[#EDF1EB] text-sm"
                  >
                    <td className="px-5 py-4 font-semibold text-[#234E43]">
                      {record.book}
                    </td>
                    <td className="px-5 py-4 text-[#718579]">
                      {record.borrowed}
                    </td>
                    <td className="px-5 py-4 text-[#718579]">
                      {record.due}
                    </td>
                    <td className="px-5 py-4 text-[#718579]">
                      {record.returned || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          record.status === "Returned"
                            ? "bg-[#EAF2E8] text-[#477764]"
                            : "bg-[#FFF4DC] text-[#A57921]"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Book Details Modal */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedBook(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="library-book-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
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
                onClick={() => setSelectedBook(null)}
                aria-label="Close book details"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-[#F6F8F3] p-5 text-sm text-[#45685B] sm:grid-cols-2">
              <p><strong>Author:</strong> {selectedBook.author}</p>
              <p><strong>Edition:</strong> {selectedBook.edition}</p>
              <p><strong>Year:</strong> {selectedBook.year}</p>
              <p><strong>ISBN:</strong> {selectedBook.isbn}</p>
              <p><strong>Shelf:</strong> {selectedBook.shelf}</p>
              <p>
                <strong>Available:</strong>{" "}
                {selectedBook.available}/{selectedBook.total}
              </p>
            </div>

            <h3 className="mt-7 font-bold text-[#234E43]">
              About This Book
            </h3>

            <p className="mt-3 leading-relaxed text-[#718579]">
              {selectedBook.description}
            </p>

            {message && (
              <p
                role="status"
                className="mt-5 rounded-xl bg-[#FFF8E8] p-4 text-sm text-[#80651E]"
              >
                {message}
              </p>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => toggleSave(selectedBook.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#DCE8DA] px-5 py-3.5 font-bold text-[#234E43] hover:bg-[#F1F7EF]"
              >
                <Bookmark size={18} />
                {savedBooks.includes(selectedBook.id)
                  ? "Remove Saved"
                  : "Save Book"}
              </button>

              <button
                onClick={requestBorrow}
                disabled={selectedBook.available === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white hover:bg-[#326657] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BookOpen size={18} />
                Request Borrow (Demo)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Digital Library
      </div>
    </div>
  );
}

export default StudentLibrary;
