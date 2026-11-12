
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  CalendarDays,
  Megaphone,
  MessageSquare,
  UserRound,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    path: "/faculty/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Courses",
    path: "/faculty/courses",
    icon: BookOpen,
  },
  {
    label: "Attendance",
    path: "/faculty/attendance",
    icon: ClipboardCheck,
  },
  {
    label: "Assignments",
    path: "/faculty/assignments",
    icon: FileText,
  },
  {
    label: "Grading",
    path: "/faculty/grading",
    icon: GraduationCap,
  },
  {
    label: "Class Schedule",
    path: "/faculty/schedule",
    icon: CalendarDays,
  },
  {
    label: "Notices",
    path: "/faculty/notices",
    icon: Megaphone,
  },
  {
    label: "Messages",
    path: "/faculty/messages",
    icon: MessageSquare,
  },
  {
    label: "My Profile",
    path: "/faculty/profile",
    icon: UserRound,
  },
  {
    label: "Settings",
    path: "/faculty/settings",
    icon: Settings,
  },
];

export default function FacultyLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F8F3] text-[#234E43]">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#234E43] text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* LOGO */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/15 px-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Uni
              <span className="text-[#D9A536]">
                Bee
              </span>
            </h1>

            <p className="mt-1 text-xs text-white/60">
              Faculty Portal
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={22} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {menuItems.map(
            ({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-[#D9A536] font-semibold text-[#234E43]"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />

                <span>{label}</span>
              </NavLink>
            )
          )}
        </nav>

        {/* BOTTOM ACTION */}
        <div className="shrink-0 border-t border-white/15 px-3 py-4">
          <NavLink
            to="/login"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            <LogOut size={19} />
            <span>Back to Login</span>
          </NavLink>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="min-w-0 lg:ml-64">

        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#234E43]/10 bg-white px-5 md:px-8">

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={24} />
            </button>

            <div>
              <h2 className="text-lg font-semibold">
                Faculty Workspace
              </h2>

              <p className="hidden text-xs text-gray-500 sm:block">
                Teaching, learning and academic management
              </p>
            </div>
          </div>

          {/* PROFILE ICON */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A6C1A4]/40">
            <UserRound size={20} />
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="mx-auto w-full max-w-[1600px] p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
