
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCog,
  Building2,
  BookOpen,
  UserPlus,
  FileCheck2,
  Award,
  Megaphone,
  Wallet,
  Library,
  CalendarRange,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
} from "lucide-react";

// ========================================
// UNIBEE ADMIN NAVIGATION
// ========================================
// Hidden: Analytics, Attendance, Timetable,
// Reports, Settings
//
// Existing pages and backend APIs are not
// deleted or modified.
// ========================================

const NAVIGATION = [
  {
    title: "OVERVIEW",
    items: [
      {
        label: "Dashboard",
        path: "/admin/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    title: "PEOPLE MANAGEMENT",
    items: [
      {
        label: "Students",
        path: "/admin/students",
        icon: GraduationCap,
      },
      {
        label: "Faculty Members",
        path: "/admin/faculty",
        icon: Users,
      },
      {
        label: "User Management",
        path: "/admin/users",
        icon: UserCog,
      },
    ],
  },

  {
    title: "ACADEMIC MANAGEMENT",
    items: [
      {
        label: "Departments",
        path: "/admin/departments",
        icon: Building2,
      },
      {
        label: "Courses",
        path: "/admin/courses",
        icon: BookOpen,
      },
      {
        label: "Enrollment",
        path: "/admin/enrollment",
        icon: UserPlus,
      },
      {
        label: "Examinations",
        path: "/admin/examinations",
        icon: FileCheck2,
      },
      {
        label: "Results",
        path: "/admin/results",
        icon: Award,
      },
    ],
  },

  {
    title: "CAMPUS OPERATIONS",
    items: [
      {
        label: "Notices",
        path: "/admin/notices",
        icon: Megaphone,
      },
      {
        label: "Finance",
        path: "/admin/finance",
        icon: Wallet,
      },
      {
        label: "Library",
        path: "/admin/library",
        icon: Library,
      },
      {
        label: "Events",
        path: "/admin/events",
        icon: CalendarRange,
      },
    ],
  },
];

// ========================================
// PAGE TITLE
// ========================================

const getPageTitle = (pathname) => {
  const allItems = NAVIGATION.flatMap(
    (section) => section.items
  );

  const page = allItems.find(
    (item) => item.path === pathname
  );

  return page?.label || "Admin Workspace";
};

// ========================================
// ADMIN SIDEBAR
// ========================================

function Sidebar({
  mobileOpen,
  closeMobile,
  collapsed,
  setCollapsed,
}) {
  return (
    <>
      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#234E43] text-white shadow-xl transition-all duration-300 ${
          collapsed ? "lg:w-[82px]" : "lg:w-[270px]"
        } w-[270px] ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* BRAND */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <NavLink
            to="/admin/dashboard"
            onClick={closeMobile}
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D9A536] font-extrabold text-[#234E43]">
              UB
            </div>

            <div
              className={`min-w-0 ${
                collapsed ? "lg:hidden" : ""
              }`}
            >
              <h1 className="text-xl font-bold tracking-tight">
                Uni
                <span className="text-[#D9A536]">
                  Bee
                </span>
              </h1>

              <p className="text-[11px] text-white/60">
                Administration
              </p>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close sidebar"
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
          >
            <X size={21} />
          </button>
        </div>

        {/* ADMIN IDENTITY */}
        <div
          className={`mx-3 mt-5 rounded-xl border border-white/10 bg-white/5 p-3 ${
            collapsed ? "lg:p-2" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D9A536]/20 text-[#D9A536]">
              <ShieldCheck size={20} />
            </div>

            <div
              className={`min-w-0 ${
                collapsed ? "lg:hidden" : ""
              }`}
            >
              <p className="truncate text-sm font-semibold">
                System Administrator
              </p>

              <p className="mt-1 text-[11px] text-white/55">
                Admin Workspace
              </p>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav
          className={`mt-4 flex-1 space-y-6 overflow-y-auto px-3 pb-5 ${
            collapsed ? "lg:px-2" : ""
          }`}
          aria-label="Admin navigation"
        >
          {NAVIGATION.map((section) => (
            <div key={section.title}>
              {/* SECTION TITLE */}
              <p
                className={`mb-2 px-3 text-[10px] font-bold tracking-[0.15em] text-white/40 ${
                  collapsed ? "lg:hidden" : ""
                }`}
              >
                {section.title}
              </p>

              {/* SECTION ITEMS */}
              <div className="space-y-1">
                {section.items.map(
                  ({ label, path, icon: Icon }) => (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={closeMobile}
                      title={
                        collapsed
                          ? label
                          : undefined
                      }
                      className={({ isActive }) =>
                        `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          isActive
                            ? "bg-[#D9A536] font-bold text-[#234E43]"
                            : "text-white/75 hover:bg-white/10 hover:text-white"
                        } ${
                          collapsed
                            ? "lg:justify-center lg:px-2"
                            : ""
                        }`
                      }
                    >
                      <Icon
                        size={19}
                        className="shrink-0"
                      />

                      <span
                        className={`truncate ${
                          collapsed
                            ? "lg:hidden"
                            : ""
                        }`}
                      >
                        {label}
                      </span>
                    </NavLink>
                  )
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="shrink-0 border-t border-white/10 p-3">
          {/* COLLAPSE / EXPAND */}
          <button
            type="button"
            onClick={() =>
              setCollapsed(!collapsed)
            }
            className="hidden w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/75 hover:bg-white/10 lg:flex"
            title={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            {collapsed ? (
              <PanelLeftOpen size={19} />
            ) : (
              <>
                <PanelLeftClose size={19} />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>

          {/* BACK TO LOGIN */}
          <NavLink
            to="/login"
            onClick={closeMobile}
            title="Back to Login"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/75 hover:bg-white/10"
          >
            <LogOut
              size={19}
              className="shrink-0"
            />

            <span
              className={
                collapsed ? "lg:hidden" : ""
              }
            >
              Back to Login
            </span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}

// ========================================
// ADMIN LAYOUT
// ========================================

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [collapsed, setCollapsed] =
    useState(false);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const location = useLocation();

  const pageTitle = getPageTitle(
    location.pathname
  );

  const matchingPages = NAVIGATION.flatMap(
    (section) => section.items
  ).filter((item) =>
    item.label
      .toLowerCase()
      .includes(
        search.trim().toLowerCase()
      )
  );

  return (
    <div className="min-h-screen bg-[#F6F8F3] text-[#234E43]">
      {/* SIDEBAR */}
      <Sidebar
        mobileOpen={mobileOpen}
        closeMobile={() =>
          setMobileOpen(false)
        }
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* MAIN CONTENT */}
      <div
        className={`min-w-0 transition-all duration-300 ${
          collapsed
            ? "lg:ml-[82px]"
            : "lg:ml-[270px]"
        }`}
      >
        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-[#234E43]/10 bg-white px-4 md:px-7">
          <div className="flex min-w-0 items-center gap-4">
            {/* MOBILE MENU BUTTON */}
            <button
              type="button"
              onClick={() =>
                setMobileOpen(true)
              }
              className="rounded-xl p-2 text-[#234E43] hover:bg-[#F6F8F3] lg:hidden"
              aria-label="Open admin navigation"
            >
              <Menu size={23} />
            </button>

            {/* PAGE TITLE */}
            <div className="min-w-0">
              <p className="hidden text-xs font-medium text-slate-400 sm:block">
                UniBee / Administration
              </p>

              <h2 className="truncate text-lg font-bold text-[#234E43] md:text-xl">
                {pageTitle}
              </h2>
            </div>
          </div>

          {/* HEADER ACTIONS */}
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {/* QUICK SEARCH */}
            <button
              type="button"
              onClick={() =>
                setSearchOpen(true)
              }
              aria-label="Search admin pages"
              title="Search pages"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-[#F6F8F3]"
            >
              <Search size={19} />
            </button>

            {/* NOTIFICATIONS */}
            <NavLink
              to="/admin/notices"
              aria-label="Open notices"
              title="Notices"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-[#F6F8F3]"
            >
              <Bell size={19} />
            </NavLink>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            {/* ADMIN PROFILE
                Settings was hidden, so this
                links to User Management. */}
            <NavLink
              to="/admin/users"
              title="Admin User Management"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-2 hover:bg-[#F6F8F3] md:px-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A6C1A4]/35 text-[#234E43]">
                <UserRound size={18} />
              </div>

              <span className="hidden text-sm font-semibold md:block">
                Admin
              </span>

              <ChevronDown
                size={15}
                className="hidden text-slate-400 md:block"
              />
            </NavLink>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="mx-auto w-full max-w-[1700px] p-4 md:p-7">
          <Outlet />
        </main>

        {/* FOOTER */}
        <footer className="border-t border-[#234E43]/10 px-5 py-5 text-center text-xs text-slate-400">
          UniBee University Management System · Admin Portal
        </footer>
      </div>

      {/* ==================================
          QUICK PAGE SEARCH
         ================================== */}

      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-4 pt-[10vh]"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSearchOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Search admin pages"
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* SEARCH INPUT */}
            <div className="flex items-center gap-3 border-b border-slate-100 p-4">
              <Search
                size={20}
                className="shrink-0 text-[#234E43]"
              />

              <input
                autoFocus
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search admin pages..."
                aria-label="Find an admin page"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  setSearchOpen(false)
                }
                aria-label="Close search"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            {/* SEARCH RESULTS */}
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {matchingPages.length > 0 ? (
                matchingPages.map(
                  ({
                    label,
                    path,
                    icon: Icon,
                  }) => (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearch("");
                        setMobileOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#234E43] hover:bg-[#F6F8F3]"
                    >
                      <Icon size={19} />

                      <span className="flex-1 font-medium">
                        {label}
                      </span>

                      <ChevronRight
                        size={17}
                        className="text-slate-400"
                      />
                    </NavLink>
                  )
                )
              ) : (
                <div className="p-8 text-center text-sm text-slate-500">
                  No matching pages found.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
