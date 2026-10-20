
import { useState } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";

const roles = [
  { id: "student", label: "Student", icon: GraduationCap },
  { id: "faculty", label: "Faculty", icon: BookOpen },
  { id: "admin", label: "Admin", icon: ShieldCheck },
];

function LoginPage() {
  const [selectedRole, setSelectedRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!formData.email.trim() || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    // UI demo only: real authentication will use the backend.
    setError(
      "Login authentication will be available after backend integration."
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F8F3] lg:grid lg:grid-cols-2">

      {/* LEFT: Branding Panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#234E43] p-12 xl:p-16 text-white">

        {/* Decorative elements */}
        <div className="absolute -top-28 -right-28 h-96 w-96 rounded-full border-[65px] border-white/5 pointer-events-none" />
        <div className="absolute bottom-0 -left-28 h-80 w-80 rounded-full bg-[#D9A536]/10 blur-3xl pointer-events-none" />

        <Link to="/" className="relative z-10 flex items-center gap-3 w-fit">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <GraduationCap size={28} className="text-[#D9A536]" />
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

        <div className="relative z-10 max-w-lg my-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-[#D6E6DB]">
            <Sprout size={17} className="text-[#D9A536]" />
            Your connected campus experience
          </div>

          <h2 className="mt-8 text-5xl xl:text-6xl font-extrabold leading-[1.15] tracking-tight">
            Your journey
            <br />
            to something
            <br />
            <span className="text-[#E8BE62]">extraordinary.</span>
          </h2>

          <p className="mt-7 text-lg leading-relaxed text-[#C7DCCE]">
            One beautiful space for learning, collaboration,
            academic progress, and everything that makes
            university life meaningful.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
              <BookOpen size={25} className="mb-4 text-[#E8BE62]" />
              <h3 className="font-bold text-lg">Smarter Learning</h3>
              <p className="mt-2 text-sm text-[#BDD3C4]">
                All your academic resources in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
              <Users size={25} className="mb-4 text-[#E8BE62]" />
              <h3 className="font-bold text-lg">Better Connection</h3>
              <p className="mt-2 text-sm text-[#BDD3C4]">
                Bringing your entire campus together.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 border-t border-white/15 pt-7 text-sm text-[#C7DCCE]">
          <CheckCircle2 size={18} className="text-[#D9A536]" />
          Learn together. Connect better. Bloom brighter.
        </div>
      </div>

      {/* RIGHT: Login Form */}
      <div className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10 lg:px-12">
        <div className="w-full max-w-md">

          {/* Mobile Branding */}
          <Link to="/" className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#234E43]">
              <GraduationCap size={25} className="text-[#D9A536]" />
            </div>
            <span className="text-2xl font-extrabold text-[#234E43]">
              Uni<span className="text-[#D9A536]">Bee</span>
            </span>
          </Link>

          <div className="mb-9">
            <p className="mb-3 text-sm font-bold tracking-widest text-[#B18B37]">
              WELCOME BACK
            </p>

            <h2 className="text-4xl font-extrabold tracking-tight text-[#234E43]">
              Sign in to UniBee
            </h2>

            <p className="mt-3 text-[#718579]">
              Access your personal university workspace.
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-7">
            <p className="mb-3 text-sm font-semibold text-[#45685B]">
              Choose your portal
            </p>

            <div className="grid grid-cols-3 gap-3">
              {roles.map((role) => {
                const Icon = role.icon;
                const active = selectedRole === role.id;

                return (
                  <button
                    type="button"
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-4 transition-all duration-200 ${
                      active
                        ? "border-[#234E43] bg-[#EAF2E8] text-[#234E43] shadow-sm"
                        : "border-[#DFE8DC] bg-white text-[#718579] hover:border-[#A6C1A4]"
                    }`}
                  >
                    <Icon size={23} />
                    <span className="text-sm font-semibold">
                      {role.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

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
                  type={showPassword ? "text" : "password"}
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
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#718579] hover:text-[#234E43]"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#607B6C]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 accent-[#234E43]"
                />
                Remember me
              </label>

              <span className="text-sm font-semibold text-[#234E43]">
                Forgot password?
              </span>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-[#EAD9A8] bg-[#FFF8E8] p-4 text-sm text-[#80651E]"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#234E43] px-6 py-4 font-bold text-white shadow-lg shadow-[#234E43]/15 transition hover:-translate-y-0.5 hover:bg-[#326657]"
            >
              Sign In
              <ArrowRight size={19} />
            </button>
          </form>

          <div className="mt-8 border-t border-[#DFE8DC] pt-7 text-center">
            <p className="text-sm text-[#718579]">
              New to UniBee?{" "}
              <span className="font-bold text-[#234E43]">
                Account registration coming soon
              </span>
            </p>
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/"
              className="text-sm font-semibold text-[#607B6C] hover:text-[#234E43] transition"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
