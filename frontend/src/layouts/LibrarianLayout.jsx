
import { useEffect, useRef, useState } from "react";
import {
  NavLink,
  Outlet,
  Link,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  ArrowLeftRight,
  PackageSearch,
  Megaphone,
  FileBarChart,
  Settings,
  LibraryBig,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Home,
  UserCircle2,
  Clock3,
  CheckCircle2,
} from "lucide-react";


const NAVIGATION = [
  {
    section: "Overview",
    items: [
      {
        label: "Dashboard",
        path: "/librarian/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    section: "Library Operations",
    items: [
      {
        label: "Book Inventory",
        path: "/librarian/books",
        icon: BookOpen,
      },
      {
        label: "Book Requests",
        path: "/librarian/requests",
        icon: ClipboardList,
      },
      {
        label: "Issue & Return",
        path: "/librarian/circulation",
        icon: ArrowLeftRight,
      },
      {
        label: "Stock Management",
        path: "/librarian/stock",
        icon: PackageSearch,
      },
    ],
  },
  {
    section: "Communication",
    items: [
      {
        label: "Announcements",
        path: "/librarian/announcements",
        icon: Megaphone,
      },
    ],
  },
  {
    section: "Management",
    items: [
      {
        label: "Settings",
        path: "/librarian/settings",
        icon: Settings,
      },
    ],
  },
];


const QUICK_LINKS = NAVIGATION.flatMap(
  (group) => group.items
);

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-[#234E43] text-white">
      {/* LOGO */}
      <div className="flex min-h-[88px] items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D9A536] text-[#234E43] shadow-lg">
          <LibraryBig size={25} strokeWidth={2.3} />
        </div>

        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight">
            UniBee
          </h1>
          <p className="text-[11px] font-medium tracking-wider text-[#A6C1A4]">
            LIBRARIAN PORTAL
          </p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav
        aria-label="Librarian navigation"
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5"
      >
        {NAVIGATION.map((group) => (
          <div key={group.section}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              {group.section}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[#A6C1A4] font-bold text-[#234E43]"
                          : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={19} className="shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* SIDEBAR FOOTER */}
      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/10 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-[#D9A536]">
            <CheckCircle2 size={15} />
            Library Workspace
          </p>

          <p className="mt-2 text-xs leading-5 text-white/65">
            Manage books, track circulation and organize
            library services.
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] text-white/40">
          UniBee Library · Frontend Demo
        </p>
      </div>
    </div>
  );
}

function HeaderDropdown({ onClose, onLogout }) {
  const navigate = useNavigate();

  function goToSettings() {
    onClose();
    navigate("/librarian/settings");
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-100 p-4">
        <p className="text-sm font-bold text-[#234E43]">
          Library Staff
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Librarian · Demo Account
        </p>
      </div>

      <div className="p-2">
        <button
          type="button"
          onClick={goToSettings}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700 hover:bg-[#F6F8F3]"
        >
          <Settings size={17} />
          Library Settings
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-rose-600 hover:bg-rose-50"
        >
          <LogOut size={17} />
          Exit Demo Portal
        </button>
      </div>
    </div>
  );
}

export default function LibrarianLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] =
    useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  const navigate = useNavigate();

  const searchMatches = QUICK_LINKS.filter((item) =>
    item.label
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase())
  );

  // Close floating panels with Escape.
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setProfileOpen(false);
        setNotificationOpen(false);
        setSearchOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () =>
      document.removeEventListener("keydown", handleEscape);
  }, []);

  // Close dropdowns when clicking outside.
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () =>
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
  }, []);

  function closeMobile() {
    setMobileOpen(false);
  }

  function exitPortal() {
    setProfileOpen(false);
    setMobileOpen(false);
    navigate("/login");
  }

  function goToSearchResult(path) {
    navigate(path);
    setSearchOpen(false);
    setSearchQuery("");
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#F6F8F3]">
      {/* DESKTOP SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[270px] lg:block">
        <SidebarContent onNavigate={closeMobile} />
      </aside>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close mobile navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          <aside className="relative z-10 h-full w-[270px] max-w-[85vw] shadow-2xl">
            <SidebarContent onNavigate={closeMobile} />

            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-5 rounded-lg bg-white/10 p-2 text-white"
            >
              <X size={19} />
            </button>
          </aside>
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <div className="min-h-screen lg:pl-[270px]">
        {/* TOP BAR */}
        <header className="sticky top-0 z-30 border-b border-[#234E43]/10 bg-white/95 backdrop-blur-md">
          <div className="flex h-[76px] items-center justify-between gap-3 px-4 md:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open librarian navigation"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl p-2 text-[#234E43] hover:bg-[#F6F8F3] lg:hidden"
              >
                <Menu size={23} />
              </button>

              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-[#234E43] md:text-lg">
                  Library Management
                </h2>

                <p className="hidden text-xs text-slate-500 sm:block">
                  UniBee Librarian Workspace
                </p>
              </div>
            </div>

            {/* HEADER ACTIONS */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* SEARCH */}
              <div className="relative">
                <button
                  type="button"
                  aria-label="Search librarian pages"
                  aria-expanded={searchOpen}
                  onClick={() => {
                    setSearchOpen((current) => !current);
                    setNotificationOpen(false);
                    setProfileOpen(false);
                  }}
                  className="rounded-xl p-2.5 text-[#234E43] hover:bg-[#F6F8F3]"
                >
                  <Search size={20} />
                </button>
              </div>

              {/* NOTIFICATIONS */}
              <div ref={notificationRef} className="relative">
                <button
                  type="button"
                  aria-label="Show notifications"
                  aria-expanded={notificationOpen}
                  onClick={() => {
                    setNotificationOpen((current) => !current);
                    setProfileOpen(false);
                    setSearchOpen(false);
                  }}
                  className="relative rounded-xl p-2.5 text-[#234E43] hover:bg-[#F6F8F3]"
                >
                  <Bell size={20} />
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 top-full z-50 mt-3 w-[min(340px,85vw)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <h3 className="text-sm font-bold text-[#234E43]">
                      Notifications
                    </h3>

                    <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-3">
                      <Clock3
                        size={19}
                        className="mt-0.5 shrink-0 text-[#B18A28]"
                      />

                      <div>
                        <p className="text-sm font-semibold text-[#234E43]">
                          Library Demo
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Live library notifications will be
                          connected in a later step.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PROFILE */}
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  aria-expanded={profileOpen}
                  aria-label="Open librarian profile menu"
                  onClick={() => {
                    setProfileOpen((current) => !current);
                    setNotificationOpen(false);
                    setSearchOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 px-2 py-2 hover:bg-[#F6F8F3] md:px-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A6C1A4]/35 text-[#234E43]">
                    <UserCircle2 size={23} />
                  </div>

                  <div className="hidden text-left md:block">
                    <p className="text-xs font-bold text-[#234E43]">
                      Library Staff
                    </p>

                    <p className="text-[11px] text-slate-500">
                      Librarian
                    </p>
                  </div>

                  <ChevronDown
                    size={15}
                    className="hidden text-slate-400 md:block"
                  />
                </button>

                {profileOpen && (
                  <HeaderDropdown
                    onClose={() => setProfileOpen(false)}
                    onLogout={exitPortal}
                  />
                )}
              </div>
            </div>
          </div>

          {/* SEARCH PANEL */}
          {searchOpen && (
            <div className="border-t border-slate-100 bg-white px-4 py-4 md:px-7">
              <div className="mx-auto max-w-2xl">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    autoFocus
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(event.target.value)
                    }
                    placeholder="Search librarian modules..."
                    aria-label="Search librarian modules"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#234E43]"
                  />
                </div>

                {searchQuery.trim() && (
                  <div className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-slate-100">
                    {searchMatches.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() =>
                            goToSearchResult(item.path)
                          }
                          className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm text-[#234E43] last:border-0 hover:bg-[#F6F8F3]"
                        >
                          <Icon size={17} />
                          {item.label}
                        </button>
                      );
                    })}

                    {searchMatches.length === 0 && (
                      <p className="p-4 text-center text-xs text-slate-500">
                        No matching librarian page found.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        {/* PAGE CONTENT */}
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-7 md:py-8">
          <Outlet />
        </main>

        {/* FOOTER */}
        <footer className="border-t border-[#234E43]/10 px-4 py-5 text-center text-xs text-slate-400 md:px-7">
          © {new Date().getFullYear()} UniBee · Librarian Portal
        </footer>
      </div>
    </div>
  );
}
