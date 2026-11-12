
import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  ClipboardList,
  Armchair,
  ListChecks,
  GraduationCap,
  Megaphone,
  UserRound,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Bell,
  Search,
} from "lucide-react";


// ========================================
// EXAM CONTROLLER NAVIGATION
// ========================================


const NAV_SECTIONS = [
  {
    title: "OVERVIEW",
    items: [
      {
        label: "Dashboard",
        path: "/exam-controller/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    title: "EXAMINATION OPERATIONS",
    items: [
      {
        label: "Exam Management",
        path: "/exam-controller/exams",
        icon: ClipboardList,
      },
      {
        label: "Seat Plans",
        path: "/exam-controller/seat-plans",
        icon: Armchair,
      },
    ],
  },

  {
    title: "RESULTS & COMMUNICATION",
    items: [
      {
        label: "Marks Management",
        path: "/exam-controller/marks",
        icon: ListChecks,
      },
      {
        label: "Results & Publishing",
        path: "/exam-controller/results",
        icon: GraduationCap,
      },
      {
        label: "Exam Notices",
        path: "/exam-controller/notices",
        icon: Megaphone,
      },
    ],
  },

  {
    title: "ACCOUNT",
    items: [
      {
        label: "My Profile",
        path: "/exam-controller/profile",
        icon: UserRound,
      },
      {
        label: "Settings",
        path: "/exam-controller/settings",
        icon: Settings,
      },
    ],
  },
];


const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(
  (section) => section.items
);

const PROFILE_STORAGE_KEY =
  "unibee-exam-controller-profile-v1";

// ========================================
// PROFILE HELPERS
// ========================================

function loadProfile() {
  try {
    const raw = localStorage.getItem(
      PROFILE_STORAGE_KEY
    );

    if (!raw) {
      return {
        fullName: "",
        designation: "Exam Controller",
        employeeId: "",
      };
    }

    const data = JSON.parse(raw);

    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      return {
        fullName: "",
        designation: "Exam Controller",
        employeeId: "",
      };
    }

    return {
      fullName:
        typeof data.fullName === "string"
          ? data.fullName
          : "",
      designation:
        typeof data.designation === "string"
          ? data.designation
          : "Exam Controller",
      employeeId:
        typeof data.employeeId === "string"
          ? data.employeeId
          : "",
    };
  } catch {
    return {
      fullName: "",
      designation: "Exam Controller",
      employeeId: "",
    };
  }
}

function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "EC";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

// ========================================
// SIDEBAR NAVIGATION ITEM
// ========================================

function SidebarLink({
  item,
  collapsed,
  onNavigate,
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "group flex items-center rounded-xl",
          "transition-all duration-200",
          collapsed
            ? "justify-center px-2 py-3"
            : "gap-3 px-3 py-3",
          isActive
            ? "bg-[#D9A536] font-bold text-[#234E43] shadow-sm"
            : "text-[#D9E8DF] hover:bg-white/10 hover:text-white",
        ].join(" ")
      }
    >
      <Icon
        size={19}
        className="shrink-0"
      />

      {!collapsed && (
        <span className="min-w-0 flex-1 truncate text-sm">
          {item.label}
        </span>
      )}
    </NavLink>
  );
}

// ========================================
// MAIN EXAM CONTROLLER LAYOUT
// ========================================

export default function ExamControllerLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [profileMenuOpen, setProfileMenuOpen] =
    useState(false);

  const [profile, setProfile] =
    useState(loadProfile);

  const [search, setSearch] =
    useState("");

  // ======================================
  // ACTIVE PAGE
  // ======================================

  const activeItem =
    ALL_NAV_ITEMS.find(
      (item) =>
        location.pathname === item.path
    ) ||
    ALL_NAV_ITEMS.find((item) =>
      location.pathname.startsWith(
        `${item.path}/`
      )
    );

  const activePageTitle =
    activeItem?.label || "Exam Controller";

  // ======================================
  // EFFECTS
  // ======================================

  useEffect(() => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
    setSearch("");
  }, [location.pathname]);

  useEffect(() => {
    function refreshProfile() {
      setProfile(loadProfile());
    }

    window.addEventListener(
      "storage",
      refreshProfile
    );

    window.addEventListener(
      "focus",
      refreshProfile
    );

    return () => {
      window.removeEventListener(
        "storage",
        refreshProfile
      );

      window.removeEventListener(
        "focus",
        refreshProfile
      );
    };
  }, []);

  // ======================================
  // QUICK NAVIGATION SEARCH
  // ======================================

  function handleSearch(event) {
    event.preventDefault();

    const query = search.trim().toLowerCase();

    if (!query) return;

    const matched = ALL_NAV_ITEMS.find(
      (item) =>
        item.label.toLowerCase().includes(query)
    );

    if (matched) {
      navigate(matched.path);
      setSearch("");
    }
  }

  // ======================================
  // LOGOUT NAVIGATION
  // ======================================

  function handleLogout() {
    setProfileMenuOpen(false);
    setMobileOpen(false);

    // Frontend-only navigation.
    // Authentication and session logout
    // will be implemented during backend integration.
    navigate("/login");
  }

  // ======================================
  // SIDEBAR CONTENT
  // ======================================

  function SidebarContent({
    isCollapsed,
    closeMobile,
  }) {
    return (
      <div className="flex h-full flex-col">
        {/* BRAND */}
        <div
          className={`flex min-h-[84px] items-center border-b border-white/10 ${
            isCollapsed
              ? "justify-center px-2"
              : "justify-between px-5"
          }`}
        >
          <button
            type="button"
            onClick={() =>
              navigate("/exam-controller/dashboard")
            }
            title="Exam Controller Dashboard"
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#D9A536] font-extrabold text-[#234E43] shadow-sm">
              UB
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xl font-extrabold tracking-tight text-white">
                  UniBee
                </p>

                <p className="mt-0.5 truncate text-[11px] font-semibold tracking-wide text-[#C9DED2]">
                  EXAM CONTROLLER
                </p>
              </div>
            )}
          </button>

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="hidden rounded-lg p-2 text-[#D9E8DF] hover:bg-white/10 lg:inline-flex"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* EXPAND CONTROL */}
        {isCollapsed && (
          <div className="hidden justify-center border-b border-white/10 py-3 lg:flex">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="rounded-lg p-2 text-[#D9E8DF] hover:bg-white/10"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* NAVIGATION */}
        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              {!isCollapsed ? (
                <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.18em] text-[#9EBDAE]">
                  {section.title}
                </p>
              ) : (
                <div className="mx-3 mb-3 border-t border-white/10" />
              )}

              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarLink
                    key={item.path}
                    item={item}
                    collapsed={isCollapsed}
                    onNavigate={closeMobile}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => {
              closeMobile();
              navigate("/exam-controller/profile");
            }}
            className={`flex w-full items-center rounded-xl bg-white/10 text-left text-white hover:bg-white/15 ${
              isCollapsed
                ? "justify-center p-2"
                : "gap-3 p-3"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D9A536] text-sm font-extrabold text-[#234E43]">
              {getInitials(profile.fullName)}
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {profile.fullName || "Exam Controller"}
                </p>

                <p className="truncate text-xs text-[#C9DED2]">
                  {profile.designation || "Exam Controller"}
                </p>
              </div>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="min-h-screen bg-[#F6F8F3] text-[#234E43]">
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden bg-[#234E43] transition-all duration-300 lg:block ${
          collapsed ? "w-[84px]" : "w-[270px]"
        }`}
      >
        <SidebarContent
          isCollapsed={collapsed}
          closeMobile={() => {}}
        />
      </aside>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MOBILE SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-[#234E43] shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="absolute right-3 top-4 z-10 rounded-lg bg-white/10 p-2 text-white"
        >
          <X size={20} />
        </button>

        <SidebarContent
          isCollapsed={false}
          closeMobile={() => setMobileOpen(false)}
        />
      </aside>

      {/* MAIN AREA */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          collapsed
            ? "lg:ml-[84px]"
            : "lg:ml-[270px]"
        }`}
      >
        {/* TOP BAR */}
        <header className="sticky top-0 z-30 border-b border-[#E2EADC] bg-white/95 backdrop-blur">
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 md:px-6 xl:px-8">
            {/* LEFT */}
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                className="rounded-xl border border-[#E2EADC] p-2.5 text-[#234E43] lg:hidden"
              >
                <Menu size={21} />
              </button>

              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B18B37]">
                  Examination Administration
                </p>

                <h1 className="truncate text-lg font-extrabold text-[#234E43] md:text-xl">
                  {activePageTitle}
                </h1>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-3">
              {/* QUICK SEARCH */}
              <form
                onSubmit={handleSearch}
                className="relative hidden md:block"
              >
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA092]"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Find a page..."
                  aria-label="Find an Exam Controller page"
                  className="w-48 rounded-xl border border-[#E2EADC] bg-[#F6F8F3] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#234E43] xl:w-64"
                />
              </form>

              {/* NOTICES SHORTCUT */}
              <button
                type="button"
                onClick={() =>
                  navigate("/exam-controller/notices")
                }
                aria-label="Open examination notices"
                title="Exam Notices"
                className="rounded-xl border border-[#E2EADC] bg-white p-2.5 text-[#234E43] hover:bg-[#F6F8F3]"
              >
                <Bell size={19} />
              </button>

              {/* PROFILE MENU */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setProfileMenuOpen((value) => !value)
                  }
                  aria-expanded={profileMenuOpen}
                  aria-label="Open profile menu"
                  className="flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white p-1.5 pr-2 hover:bg-[#F6F8F3]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF2E8] text-xs font-extrabold text-[#234E43]">
                    {getInitials(profile.fullName)}
                  </span>

                  <span className="hidden max-w-32 truncate text-sm font-bold text-[#234E43] xl:block">
                    {profile.fullName || "Exam Controller"}
                  </span>

                  <ChevronDown size={16} />
                </button>

                {profileMenuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close profile menu"
                      onClick={() => setProfileMenuOpen(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />

                    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-2xl border border-[#E2EADC] bg-white p-2 shadow-xl">
                      <div className="border-b border-[#E2EADC] px-3 py-3">
                        <p className="truncate text-sm font-bold text-[#234E43]">
                          {profile.fullName || "Exam Controller"}
                        </p>

                        <p className="mt-1 text-xs text-[#718579]">
                          {profile.employeeId || "Examination Office"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate("/exam-controller/profile");
                        }}
                        className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#234E43] hover:bg-[#F6F8F3]"
                      >
                        <UserRound size={17} />
                        My Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate("/exam-controller/settings");
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#234E43] hover:bg-[#F6F8F3]"
                      >
                        <Settings size={17} />
                        Settings
                      </button>

                      <div className="my-2 border-t border-[#E2EADC]" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut size={17} />
                        Back to Login
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6 xl:p-8">
          <Outlet />
        </main>

        {/* FOOTER */}
        <footer className="border-t border-[#E2EADC] px-4 py-5 text-center text-xs text-[#718579] md:px-6">
          UniBee — Exam Controller Portal
          <span className="mx-2">•</span>
          Bee & Sage
        </footer>
      </div>
    </div>
  );
}
