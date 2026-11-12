
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, logoutUser } from "../services/authApi";

import {
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  Users,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Sprout,
  LibraryBig,
  Building2,
  Wallet,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";

// ========================================
// UNIBEE PORTAL ROLES
// ========================================

const roles = [
  {
    id: "student",
    label: "Student",
    icon: GraduationCap,
    path: "/student/dashboard",
    description: "Academic learning and student services",
  },
  {
    id: "faculty",
    label: "Faculty",
    icon: BookOpen,
    path: "/faculty/dashboard",
    description: "Teaching and academic management",
  },
  {
    id: "admin",
    label: "Admin",
    icon: ShieldCheck,
    path: "/admin/dashboard",
    description: "University administration",
  },
  {
    id: "librarian",
    label: "Librarian",
    icon: LibraryBig,
    path: "/librarian/dashboard",
    description: "Library and book management",
  },
  {
    id: "hod",
    label: "HOD",
    icon: Building2,
    path: "/hod/dashboard",
    description: "Department management",
  },
  {
    id: "accounts",
    label: "Accounts Officer",
    icon: Wallet,
    path: "/accounts/dashboard",
    description: "University finance management",
  },
  {
    id: "exam-controller",
    label: "Exam Controller",
    icon: ClipboardCheck,
    path: "/exam-controller/dashboard",
    description: "Examination administration",
  },
];

// ========================================
// MAIN LOGIN PAGE
// ========================================

export default function LoginPage() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const activeRole =
    roles.find((role) => role.id === selectedRole) ||
    roles[0];

  // ======================================
  // INPUT HANDLING
  // ======================================

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  function selectRole(roleId) {
    setSelectedRole(roleId);
    setError("");
  }

  // ======================================
  // REAL BACKEND AUTHENTICATION
  // ======================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const user = await loginUser(
        formData.email.trim(),
        formData.password
      );

      if (user.role !== selectedRole) {
        logoutUser();

        setError(
          "Your account does not have access to the selected portal. Please select your assigned role."
        );

        return;
      }

      const destination = roles.find(
        (role) => role.id === user.role
      );

      if (!destination) {
        logoutUser();
        setError("Unsupported account role.");
        return;
      }

      // Clear password from the form.
      setFormData((previous) => ({
        ...previous,
        password: "",
      }));

      // Retained for compatibility with the
      // existing login screen. Persistent-session
      // behavior depends on authApi implementation.
      void rememberMe;

      navigate(destination.path, {
        replace: true,
      });
    } catch (loginError) {
      setError(
        loginError.message || "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="min-h-screen bg-[#F6F8F3] lg:grid lg:grid-cols-2">

      {/* LEFT: BRANDING PANEL */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#234E43] p-12 text-white lg:flex xl:p-16">

        {/* Decorations */}
        <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full border-[65px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-10 -left-28 h-80 w-80 rounded-full bg-[#D9A536]/10 blur-3xl" />

        {/* Logo */}
        <Link
          to="/"
          className="relative z-10 flex w-fit items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <GraduationCap
              size={28}
              className="text-[#D9A536]"
            />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Uni<span className="text-[#D9A536]">Bee</span>
            </h1>

            <p className="text-[10px] tracking-[0.2em] text-[#BBD3C4]">
              LEARN. CONNECT. BLOOM.
            </p>
          </div>
        </Link>

        {/* Branding Content */}
        <div className="relative z-10 my-16 max-w-lg">

          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-[#D6E6DB]">
            <Sprout
              size={17}
              className="text-[#D9A536]"
            />
            Your connected campus experience
          </div>

          <h2 className="mt-8 text-5xl font-extrabold leading-[1.15] tracking-tight xl:text-6xl">
            Your journey
            <br />
            to something
            <br />
            <span className="text-[#E8BE62]">
              extraordinary.
            </span>
          </h2>

          <p className="mt-7 text-lg leading-relaxed text-[#C7DCCE]">
            One beautiful space for learning,
            collaboration, academic progress,
            and everything that makes university
            life meaningful.
          </p>

          {/* Feature Cards */}
          <div className="mt-12 grid grid-cols-2 gap-4">

            <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
              <BookOpen
                size={25}
                className="mb-4 text-[#E8BE62]"
              />

              <h3 className="text-lg font-bold">
                Smarter Learning
              </h3>

              <p className="mt-2 text-sm text-[#BDD3C4]">
                All your academic resources
                in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
              <Users
                size={25}
                className="mb-4 text-[#E8BE62]"
              />

              <h3 className="text-lg font-bold">
                Better Connection
              </h3>

              <p className="mt-2 text-sm text-[#BDD3C4]">
                Bringing your entire campus
                together.
              </p>
            </div>
          </div>

          {/* Portal Information */}
          <div className="mt-7 rounded-2xl border border-white/15 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck
                size={21}
                className="text-[#E8BE62]"
              />

              <h3 className="font-bold">
                One Campus. Seven Portals.
              </h3>
            </div>

            <p className="mt-3 text-sm leading-6 text-[#BDD3C4]">
              A connected university experience
              for students, faculty, administrators,
              librarians, department heads,
              accounts officers, and examination
              controllers.
            </p>
          </div>
        </div>

        {/* Bottom Caption */}
        <div className="relative z-10 flex items-center gap-3 border-t border-white/15 pt-7 text-sm text-[#C7DCCE]">
          <CheckCircle2
            size={18}
            className="text-[#D9A536]"
          />

          Learn together. Connect better.
          Bloom brighter.
        </div>
      </div>

      {/* RIGHT: LOGIN SECTION */}
      <div className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10 lg:px-12">
        <div className="w-full max-w-lg">

          {/* Mobile Branding */}
          <Link
            to="/"
            className="mb-10 flex items-center gap-3 lg:hidden"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#234E43]">
              <GraduationCap
                size={25}
                className="text-[#D9A536]"
              />
            </div>

            <span className="text-2xl font-extrabold text-[#234E43]">
              Uni<span className="text-[#D9A536]">Bee</span>
            </span>
          </Link>

          {/* Heading */}
          <div className="mb-8">

            <p className="mb-3 text-sm font-bold tracking-widest text-[#B18B37]">
              WELCOME BACK
            </p>

            <h2 className="text-3xl font-extrabold tracking-tight text-[#234E43] sm:text-4xl">
              Sign in to UniBee
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#718579]">
              Select your university portal
              to continue.
            </p>
          </div>

          {/* ROLE SELECTION */}
          <section className="mb-7">

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#45685B]">
                Choose your portal
              </p>

              <span className="rounded-full bg-[#EAF2E8] px-3 py-1 text-xs font-bold text-[#234E43]">
                7 Portals
              </span>
            </div>

            <div
              role="group"
              aria-label="University portal selection"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              {roles.map((role) => {
                const Icon = role.icon;
                const active = selectedRole === role.id;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => selectRole(role.id)}
                    aria-pressed={active}
                    className={`relative flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-xl border px-2 py-4 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#234E43] ${
                      active
                        ? "border-[#234E43] bg-[#EAF2E8] text-[#234E43] shadow-sm"
                        : "border-[#DFE8DC] bg-white text-[#718579] hover:border-[#A6C1A4] hover:bg-[#F9FBF7]"
                    }`}
                  >
                    {active && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#234E43] text-white">
                        <CheckCircle2 size={13} />
                      </span>
                    )}

                    <Icon size={23} />

                    <span className="text-xs font-bold sm:text-sm">
                      {role.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Role Information */}
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#DCE8D8] bg-[#EAF2E8] p-4">
              <div className="rounded-lg bg-white p-2 text-[#234E43]">
                {(() => {
                  const RoleIcon = activeRole.icon;
                  return <RoleIcon size={19} />;
                })()}
              </div>

              <div>
                <p className="text-sm font-extrabold text-[#234E43]">
                  {activeRole.label} Portal
                </p>

                <p className="mt-1 text-xs leading-5 text-[#607B6C]">
                  {activeRole.description}
                </p>
              </div>
            </div>
          </section>

          {/* LOGIN FORM */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-semibold text-[#45685B]"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8FA69A]"
                />

                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  className="w-full rounded-xl border border-[#DFE8DC] bg-white py-4 pl-12 pr-4 text-[#234E43] outline-none transition focus:border-[#A6C1A4] focus:ring-2 focus:ring-[#A6C1A4]/40"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-semibold text-[#45685B]"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8FA69A]"
                />

                <input
                  id="login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-[#DFE8DC] bg-white py-4 pl-12 pr-12 text-[#234E43] outline-none transition focus:border-[#A6C1A4] focus:ring-2 focus:ring-[#A6C1A4]/40"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#718579] hover:text-[#234E43]"
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* REMEMBER ME */}
            <div className="flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#607B6C]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 accent-[#234E43]"
                />

                Remember me
              </label>

              <span className="text-sm font-semibold text-[#718579]">
                Forgot password?
              </span>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-[#EAD9A8] bg-[#FFF8E8] p-4 text-sm leading-6 text-[#80651E]"
              >
                <AlertCircle
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                {error}
              </div>
            )}

            {/* REAL LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#234E43] px-6 py-4 font-bold text-white shadow-lg shadow-[#234E43]/15 transition hover:bg-[#326657] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing In..." : "Sign In"}
              {!loading && <ArrowRight size={19} />}
            </button>
          </form>

          {/* ACCOUNT REGISTRATION NOTICE */}
          <div className="mt-8 border-t border-[#DFE8DC] pt-7 text-center">
            <p className="text-sm text-[#718579]">
              New to UniBee?{" "}
              <span className="font-bold text-[#234E43]">
                Account registration coming soon
              </span>
            </p>
          </div>

          {/* BACK HOME */}
          <div className="mt-9 text-center">
            <Link
              to="/"
              className="text-sm font-semibold text-[#607B6C] transition hover:text-[#234E43]"
            >
              ← Back to Home
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
