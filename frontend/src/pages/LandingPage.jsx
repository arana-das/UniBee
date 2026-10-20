import { Link } from "react-router-dom";
import FeaturesSection from "../components/FeaturesSection";
import { GraduationCap, Menu, ArrowRight } from "lucide-react";
import AboutSection from "../components/AboutSection";
import ContactSection from "../components/ContactSection";
import Footer from "../components/Footer";


function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F6F8F3]">
      {/* Navbar */}
      <nav className="bg-white border-b border-[#E2E9E1]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#234E43] rounded-xl flex items-center justify-center">
              <GraduationCap className="text-[#D9A536]" size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold text-[#234E43] tracking-tight">
                Uni<span className="text-[#D9A536]">Bee</span>
              </h1>
              <p className="text-[10px] text-[#6E8779] tracking-widest">
                LEARN. CONNECT. BLOOM.
              </p>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#45685B]">
            <a href="#home" className="hover:text-[#D9A536] transition">
              Home
            </a>
            <a href="#features" className="hover:text-[#D9A536] transition">
              Features
            </a>
            <a href="#about" className="hover:text-[#D9A536] transition">
              About
            </a>
            <a href="#contact" className="hover:text-[#D9A536] transition">
              Contact
            </a>
          </div>

          {/* Login Button */}
          <Link
            to="/login"
            className="hidden md:flex items-center gap-2 bg-[#234E43] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#326657] transition"
          >
            Get Started
            <ArrowRight size={17} />
          </Link>

          {/* Mobile Menu Icon */}
          <button
            className="md:hidden text-[#234E43]"
            aria-label="Open navigation menu"
          >
            <Menu size={26} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
<section id="home" className="relative overflow-hidden">
  {/* Background decorations */}
  <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#D9A536]/10 blur-3xl pointer-events-none" />
  <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-[#A6C1A4]/30 blur-3xl pointer-events-none" />

  <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
    <div className="grid lg:grid-cols-2 gap-14 items-center">

      {/* Left Content */}
      <div>
        <div className="inline-flex items-center gap-2 bg-white border border-[#DCE8DA] px-4 py-2 rounded-full text-sm font-medium text-[#45685B] mb-7">
          <span className="w-2 h-2 rounded-full bg-[#D9A536]" />
          Your Campus. One Connected Platform.
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.12] text-[#234E43]">
          Learn Together.
          <br />
          Grow Smarter.
          <br />
          <span className="text-[#D9A536]">Bloom Beyond.</span>
        </h1>

        <p className="mt-7 text-lg text-[#607B6C] leading-relaxed max-w-xl">
          Experience a smarter way to manage university life.
          From courses and academic progress to campus connections,
          UniBee brings everything together in one beautiful space.
        </p>

        <div className="flex flex-wrap gap-4 mt-9">
          <a
            href="#features"
            className="bg-[#234E43] text-white px-7 py-4 rounded-xl font-semibold hover:bg-[#326657] transition shadow-lg shadow-[#234E43]/15"
          >
            Explore Features →
          </a>

          <a
            href="#about"
            className="bg-white border border-[#DCE8DA] text-[#234E43] px-7 py-4 rounded-xl font-semibold hover:border-[#234E43] transition"
          >
            Discover UniBee
          </a>
        </div>

        <div className="mt-12 flex items-center gap-4">
          <div className="flex -space-x-3">
            {["S", "F", "A"].map((role, index) => (
              <div
                key={role}
                className={`w-11 h-11 rounded-full border-4 border-[#F6F8F3] flex items-center justify-center text-sm font-bold ${
                  index === 0
                    ? "bg-[#234E43] text-white"
                    : index === 1
                    ? "bg-[#D9A536] text-[#234E43]"
                    : "bg-[#A6C1A4] text-[#234E43]"
                }`}
              >
                {role}
              </div>
            ))}
          </div>

          <div>
            <p className="font-bold text-[#234E43]">
              One Digital Campus
            </p>
            <p className="text-sm text-[#607B6C]">
              Students • Faculty • Administrators
            </p>
          </div>
        </div>
      </div>

      {/* Right Content */}
      <div className="relative">
        <div className="absolute -inset-5 bg-[#A6C1A4]/20 rounded-[3rem] rotate-3" />

        <div className="relative bg-white rounded-[2rem] p-7 md:p-9 shadow-2xl shadow-[#234E43]/10 border border-[#E3EBDF]">

          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-[#7B9184]">
                Welcome to
              </p>
              <h3 className="text-3xl font-extrabold text-[#234E43]">
                Uni<span className="text-[#D9A536]">Bee</span>
              </h3>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-[#F9F0D8] flex items-center justify-center text-3xl">
              ✦
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                title: "Student Portal",
                subtitle: "Learn, track and achieve",
                icon: "🎓",
                color: "bg-[#EAF3EC]",
              },
              {
                title: "Faculty Portal",
                subtitle: "Teach, guide and inspire",
                icon: "📚",
                color: "bg-[#FFF4DC]",
              },
              {
                title: "Admin Portal",
                subtitle: "Manage, analyze and connect",
                icon: "🏛️",
                color: "bg-[#EEF1F8]",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-4 p-4 rounded-2xl border border-[#EDF1EB] hover:border-[#D9A536] hover:shadow-md transition-all duration-300 group"
              >
                <div className={`w-14 h-14 rounded-xl ${item.color} flex items-center justify-center text-2xl`}>
                  {item.icon}
                </div>

                <div className="flex-1">
                  <h4 className="font-bold text-[#234E43]">
                    {item.title}
                  </h4>
                  <p className="text-sm text-[#7B9184] mt-1">
                    {item.subtitle}
                  </p>
                </div>

                <span className="text-[#D9A536] text-xl group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-xl bg-[#234E43] p-5 text-white">
            <p className="text-sm text-[#BBD0C5]">
              Your academic journey
            </p>
            <div className="flex items-center justify-between mt-2">
              <h4 className="font-bold text-lg">
                Starts Here.
              </h4>
              <span className="text-[#D9A536] text-xl">✦</span>
            </div>
          </div>
        </div>
      </div>

    
<Link
  to="/student/dashboard"
  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D9A536] px-7 py-3.5 text-sm font-bold text-[#234E43] shadow-md transition duration-300 hover:-translate-y-0.5 hover:bg-[#E8BB55] hover:shadow-lg"
>
  Explore Student Portal
  <span aria-hidden="true">→</span>
</Link>


    </div>
  </div>
</section>
<FeaturesSection />
<AboutSection />
<ContactSection />
<Footer />
    </div>
  );
}

export default LandingPage;