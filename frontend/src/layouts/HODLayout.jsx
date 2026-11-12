
import { useEffect, useState } from "react";

import {
  NavLink,
  Outlet,
  useLocation,
  Link,
} from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileCheck2,
  UserRound,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Building2,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

// ========================================
// HOD NAVIGATION — CORE FEATURES ONLY
// ========================================

const navigationGroups = [
  {
    title: "OVERVIEW",
    items: [
      {
        name: "Dashboard",
        path: "/hod/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "DEPARTMENT MANAGEMENT",
    items: [
      {
        name: "Faculty Members",
        path: "/hod/faculty",
        icon: Users,
      },
      {
        name: "Students",
        path: "/hod/students",
        icon: GraduationCap,
      },
      {
        name: "Course Allocation",
        path: "/hod/course-allocation",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "ACADEMIC MANAGEMENT",
    items: [
      {
        name: "Academic Approvals",
        path: "/hod/approvals",
        icon: FileCheck2,
      },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      {
        name: "My Profile",
        path: "/hod/profile",
        icon: UserRound,
      },
    ],
  },
];

// ========================================
// SIDEBAR NAVIGATION ITEM
// ========================================

function SidebarItem({
  item,
  collapsed,
  onNavigate,
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end
      title={collapsed ? item.name : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex min-h-[46px] items-center rounded-xl transition-all duration-200 ${
          collapsed
            ? "justify-center px-2"
            : "gap-3 px-4"
        } ${
          isActive
            ? "bg-[#D9A536] font-bold text-[#234E43] shadow-sm"
            : "text-[#D0E2D7] hover:bg-white/10 hover:text-white"
        }`
      }
    >
      <Icon
        size={20}
        strokeWidth={1.9}
        className="shrink-0"
      />

      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-sm">
            {item.name}
          </span>

          <ChevronRight
            size={15}
            className="shrink-0 opacity-50"
          />
        </>
      )}
    </NavLink>
  );
}

// ========================================
// HOD SIDEBAR COMPONENT
// ========================================

function HODSidebar({
  collapsed,
  mobileOpen,
  setMobileOpen,
  setCollapsed,
}) {
  return (
    <>
      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#234E43] text-white shadow-xl transition-all duration-300 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        } lg:translate-x-0 ${
          collapsed
            ? "w-[88px]"
            : "w-[280px]"
        }`}
      >
        {/* LOGO */}
        <div
          className={`flex h-[90px] shrink-0 items-center border-b border-white/10 ${
            collapsed
              ? "justify-center px-3"
              : "justify-between px-5"
          }`}
        >
          <Link
            to="/hod/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D9A536] text-lg font-extrabold text-[#234E43]">
              UB
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight">
                  Uni
                  <span className="text-[#D9A536]">
                    Bee
                  </span>
                </h1>

                <p className="mt-0.5 text-[11px] tracking-wide text-[#C8DCD0]">
                  HOD PORTAL
                </p>
              </div>
            )}

          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* HOD ROLE CARD */}
        {!collapsed ? (
          <div className="mx-4 mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D9A536]/15 text-[#D9A536]">
                <Building2 size={24} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  Head of Department
                </p>

                <p className="mt-1 text-xs text-[#A6C1B4]">
                  Academic Leadership
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#D9A536]">
            <Building2 size={23} />
          </div>
        )}

        {/* NAVIGATION */}
        <nav
          aria-label="HOD navigation"
          className="mt-5 min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-6"
        >
          {navigationGroups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.15em] text-[#8DAFA0]">
                  {group.title}
                </p>
              )}

              {collapsed && (
                <div className="mx-auto mb-3 h-px w-8 bg-white/15" />
              )}

              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <SidebarItem
                    key={item.path}
                    item={item}
                    collapsed={collapsed}
                    onNavigate={() =>
                      setMobileOpen(false)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="shrink-0 space-y-2 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() =>
              setCollapsed((previous) => !previous)
            }
            className="hidden w-full items-center justify-center gap-3 rounded-xl px-3 py-3 text-sm text-[#D0E2D7] hover:bg-white/10 lg:flex"
            title={
              collapsed
                ? "Expand Sidebar"
                : "Collapse Sidebar"
            }
          >
            {collapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <>
                <PanelLeftClose size={20} />
                Collapse Sidebar
              </>
            )}
          </button>

          <Link
            to="/login"
            onClick={() => setMobileOpen(false)}
            title="Back to Login"
            className={`flex items-center rounded-xl px-3 py-3 text-sm text-[#D0E2D7] hover:bg-white/10 hover:text-white ${
              collapsed
                ? "justify-center"
                : "gap-3"
            }`}
          >
            <ArrowLeft
              size={19}
              className="shrink-0"
            />

            {!collapsed && (
              <span>Back to Login</span>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}

// ========================================
// MAIN HOD LAYOUT
// ========================================

export default function HODLayout() {
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile navigation after route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Determine active page from navigation.
  const activeItem = navigationGroups
    .flatMap((group) => group.items)
    .find(
      (item) => item.path === location.pathname
    );

  const activePageTitle =
    activeItem?.name || "HOD Portal";

  return (
    <div className="min-h-screen bg-[#F6F8F3]">
      {/* SIDEBAR */}
      <HODSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        setCollapsed={setCollapsed}
      />

      {/* MAIN AREA */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          collapsed
            ? "lg:ml-[88px]"
            : "lg:ml-[280px]"
        }`}
      >
        {/* TOP BAR */}
        <header className="sticky top-0 z-30 flex h-[78px] items-center justify-between gap-3 border-b border-[#E2EADC] bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          {/* LEFT SIDE */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-xl border border-[#E2EADC] p-2.5 text-[#234E43] hover:bg-[#F1F7EF] lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div className="min-w-0">
              <p className="hidden text-xs font-semibold uppercase tracking-wider text-[#8AA092] sm:block">
                University / Head of Department
              </p>

              <h2 className="truncate text-lg font-extrabold text-[#234E43] md:text-xl">
                {activePageTitle}
              </h2>
            </div>
          </div>

          {/* PROFILE SHORTCUT */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              to="/hod/profile"
              className="flex items-center gap-3 rounded-xl border border-[#E2EADC] px-2 py-1.5 transition hover:bg-[#F1F7EF] sm:pr-4"
              title="My Profile"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF2E8] text-[#234E43]">
                <UserRound size={19} />
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-[#234E43]">
                  Department Head
                </p>

                <p className="mt-0.5 text-[11px] text-[#718579]">
                  HOD Workspace
                </p>
              </div>
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="min-h-[calc(100vh-78px)] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-[#E2EADC] bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#8AA092]">
              UniBee © {new Date().getFullYear()}
            </p>

            <div className="flex items-center gap-2 text-xs text-[#8AA092]">
              <ShieldCheck size={15} />
              Head of Department Portal
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
