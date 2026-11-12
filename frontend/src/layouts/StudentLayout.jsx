
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  CalendarDays,
  Bell,
  CreditCard,
  LibraryBig,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  Hexagon,
} from "lucide-react";

// ========================================
// STUDENT NAVIGATION
// ========================================

const mainNavigation = [
  {
    label: "Dashboard",
    path: "/student/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Courses",
    path: "/student/courses",
    icon: BookOpen,
  },
  {
    label: "Attendance",
    path: "/student/attendance",
    icon: ClipboardCheck,
  },
  {
    label: "Assignments",
    path: "/student/assignments",
    icon: FileText,
  },
  {
    label: "Results & CGPA",
    path: "/student/results",
    icon: GraduationCap,
  },
  {
    label: "Class Routine",
    path: "/student/routine",
    icon: CalendarDays,
  },
  {
    label: "Notices",
    path: "/student/notices",
    icon: Bell,
  },
];

// ========================================
// CAMPUS SERVICES
// Research, Internship, Help & Support removed
// ========================================

const servicesNavigation = [
  {
    label: "Fees & Payments",
    path: "/student/fees",
    icon: CreditCard,
  },
  {
    label: "Digital Library",
    path: "/student/library",
    icon: LibraryBig,
  },
  {
    label: "Messages",
    path: "/student/messages",
    icon: MessageSquare,
  },
  {
    label: "Clubs & Events",
    path: "/student/events",
    icon: Users,
  },
];

// ========================================
// STUDENT LAYOUT
// ========================================

export default function StudentLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const student = {
    name: "Demo Student",
    id: "STU-001",
    department: "ICT",
    initials: "DS",
  };

  // ========================================
  // SIDEBAR LINK
  // ========================================

  const SidebarLink = ({ item }) => {
    const Icon = item.icon;

    return (
      <NavLink
        to={item.path}
        end
        onClick={() => setMobileOpen(false)}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
            isActive
              ? "bg-[#D9A536] text-[#234E43] shadow-sm"
              : "text-[#C6D9CD] hover:bg-white/10 hover:text-white"
          } ${collapsed ? "justify-center" : ""}`
        }
      >
        <Icon size={20} className="shrink-0" />

        {!collapsed && (
          <span className="truncate">
            {item.label}
          </span>
        )}
      </NavLink>
    );
  };

  // ========================================
  // SIDEBAR CONTENT
  // ========================================

  const SidebarContent = () => (
    <>
      {/* LOGO */}
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <Link
          to="/"
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Hexagon
              size={24}
              className="text-[#D9A536]"
            />
          </div>

          {!collapsed && (
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Uni
                <span className="text-[#D9A536]">
                  Bee
                </span>
              </h1>

              <p className="text-[9px] tracking-[0.15em] text-[#BBD0C2]">
                LEARN. CONNECT. BLOOM.
              </p>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={22} />
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        {/* ACADEMICS */}
        <div>
          {!collapsed && (
            <p className="mb-3 px-3 text-[11px] font-bold tracking-[0.15em] text-[#88AB97]">
              ACADEMICS
            </p>
          )}

          <div className="space-y-1">
            {mainNavigation.map((item) => (
              <SidebarLink
                key={item.path}
                item={item}
              />
            ))}
          </div>
        </div>

        {/* CAMPUS SERVICES */}
        <div>
          {!collapsed && (
            <p className="mb-3 px-3 text-[11px] font-bold tracking-[0.15em] text-[#88AB97]">
              CAMPUS SERVICES
            </p>
          )}

          <div className="space-y-1">
            {servicesNavigation.map((item) => (
              <SidebarLink
                key={item.path}
                item={item}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* SIDEBAR BOTTOM */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          to="/"
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#C6D9CD] transition hover:bg-white/10 hover:text-white ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={20} />

          {!collapsed && (
            <span>Back to Home</span>
          )}
        </Link>
      </div>
    </>
  );

  // ========================================
  // LAYOUT
  // ========================================

  return (
    <div className="min-h-screen bg-[#F6F8F3]">
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-[#234E43] transition-all duration-300 lg:flex ${
          collapsed ? "w-[82px]" : "w-[265px]"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* MOBILE SIDEBAR */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />

          <aside className="relative flex h-full w-[280px] max-w-[85vw] flex-col bg-[#234E43] shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* MAIN AREA */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          collapsed
            ? "lg:ml-[82px]"
            : "lg:ml-[265px]"
        }`}
      >
        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#E2EADC] bg-white/95 px-5 backdrop-blur-md md:px-8">
          {/* LEFT */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileOpen(true);
                } else {
                  setCollapsed((value) => !value);
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2EADC] text-[#234E43] transition hover:bg-[#F1F7EF]"
              aria-label="Toggle sidebar"
            >
              <Menu size={21} />
            </button>

            <div className="hidden sm:block">
              <p className="text-xs font-medium text-[#8AA092]">
                Student Workspace
              </p>

              <h2 className="text-lg font-bold text-[#234E43]">
                My Dashboard
              </h2>
            </div>
          </div>

          {/* HEADER ACTIONS */}
          <div className="flex items-center gap-3 md:gap-5">
            {/* SEARCH */}
            <div className="hidden items-center gap-3 rounded-xl border border-[#E2EADC] bg-[#F8FAF6] px-4 py-2.5 md:flex">
              <Search
                size={18}
                className="text-[#8AA092]"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Search UniBee..."
                aria-label="Search UniBee"
                className="w-40 bg-transparent text-sm text-[#234E43] outline-none placeholder:text-[#9BAFA1] xl:w-56"
              />
            </div>

            {/* NOTIFICATIONS */}
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#45685B] transition hover:bg-[#F1F7EF]"
              aria-label="Notifications"
              title="Notifications coming soon"
            >
              <Bell size={21} />

              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#D9A536]" />
            </button>

            {/* PROFILE */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setProfileOpen((value) => !value)
                }
                aria-expanded={profileOpen}
                className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-[#F1F7EF]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5EFE3] font-bold text-[#234E43]">
                  {student.initials}
                </div>

                <div className="hidden text-left md:block">
                  <p className="text-sm font-bold text-[#234E43]">
                    {student.name}
                  </p>

                  <p className="text-xs text-[#8AA092]">
                    {student.department} Student
                  </p>
                </div>

                <ChevronDown
                  size={16}
                  className="hidden text-[#8AA092] md:block"
                />
              </button>

              {/* PROFILE MENU */}
              {profileOpen && (
                <div className="absolute right-0 top-14 z-50 w-56 rounded-2xl border border-[#E2EADC] bg-white p-2 shadow-xl">
                  <div className="border-b border-[#EDF1EB] px-3 py-3">
                    <p className="font-bold text-[#234E43]">
                      {student.name}
                    </p>

                    <p className="text-xs text-[#718579]">
                      {student.id}
                    </p>
                  </div>

                  <Link
                    to="/student/profile"
                    onClick={() => setProfileOpen(false)}
                    className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#45685B] hover:bg-[#F1F7EF]"
                  >
                    <Users size={17} />
                    My Profile
                  </Link>

                  <Link
                    to="/student/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#45685B] hover:bg-[#F1F7EF]"
                  >
                    <Settings size={17} />
                    Settings
                  </Link>

                  <Link
                    to="/"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#B45353] hover:bg-red-50"
                  >
                    <LogOut size={17} />
                    Back to Home
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="mx-auto max-w-[1600px] p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
