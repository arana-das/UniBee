
import {
  GraduationCap,
  Users,
  Sprout,
  CheckCircle2,
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  BarChart3,
  Hexagon,
} from "lucide-react";

const values = [
  {
    icon: GraduationCap,
    title: "Learn",
    description: "Discover knowledge and track your academic journey.",
  },
  {
    icon: Users,
    title: "Connect",
    description: "Bring students, faculty, and administration together.",
  },
  {
    icon: Sprout,
    title: "Bloom",
    description: "Grow your skills and unlock new opportunities.",
  },
];

function AboutSection() {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-[#F6F8F3] py-24 lg:py-32"
    >
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#D9A536]/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: Visual Illustration */}
          <div className="relative max-w-xl mx-auto w-full">
            <div className="absolute -inset-4 bg-[#A6C1A4]/25 rounded-[3rem] -rotate-3" />

            <div className="relative bg-white border border-[#E0E9DC] rounded-[2rem] p-6 md:p-8 shadow-xl shadow-[#234E43]/5">

              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-[#8A9F90]">
                    A CONNECTED CAMPUS
                  </p>
                  <h3 className="text-2xl font-extrabold text-[#234E43] mt-2">
                    Your UniBee Space
                  </h3>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-[#FFF4DC] flex items-center justify-center">
                  <Hexagon size={25} className="text-[#D9A536]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F1F7EF] rounded-2xl p-5">
                  <BookOpen className="text-[#234E43] mb-4" size={25} />
                  <p className="text-lg font-bold text-[#234E43]">
                    Courses
                  </p>
                  <p className="text-xs text-[#718579] mt-2">
                    Learning in one place
                  </p>
                </div>

                <div className="bg-[#FFF7E7] rounded-2xl p-5">
                  <CalendarCheck className="text-[#B78B28] mb-4" size={25} />
                  <p className="text-lg font-bold text-[#234E43]">
                    Schedules
                  </p>
                  <p className="text-xs text-[#718579] mt-2">
                    Stay organized daily
                  </p>
                </div>

                <div className="bg-[#FFF7E7] rounded-2xl p-5">
                  <Users className="text-[#B78B28] mb-4" size={25} />
                  <p className="text-lg font-bold text-[#234E43]">
                    Community
                  </p>
                  <p className="text-xs text-[#718579] mt-2">
                    Connect across campus
                  </p>
                </div>

                <div className="bg-[#F1F7EF] rounded-2xl p-5">
                  <BarChart3 className="text-[#234E43] mb-4" size={25} />
                  <p className="text-lg font-bold text-[#234E43]">
                    Progress
                  </p>
                  <p className="text-xs text-[#718579] mt-2">
                    Grow with insights
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-[#234E43] rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-[#D9E9DF] text-xs mb-2">
                    ONE CONNECTED UNIVERSITY
                  </p>
                  <h4 className="text-white text-lg font-bold">
                    Learn. Connect. Bloom.
                  </h4>
                </div>
                <Sprout className="text-[#D9A536]" size={29} />
              </div>
            </div>
          </div>

          {/* Right: About Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#DEE8DA] text-[#45685B] text-sm font-semibold mb-7">
              <span className="w-2 h-2 rounded-full bg-[#D9A536]" />
              ABOUT UNIBEE
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold text-[#234E43] tracking-tight leading-tight">
              A smarter campus.
              <br />
              <span className="text-[#D9A536]">
                A brighter future.
              </span>
            </h2>

            <p className="mt-7 text-lg text-[#607B6C] leading-relaxed">
              UniBee is a unified digital university platform designed
              to simplify academic life and connect the entire campus
              community through one seamless experience.
            </p>

            <p className="mt-4 text-[#718579] leading-relaxed">
              From course management and academic analytics to communication,
              campus services, and personalized support, UniBee creates
              a connected environment for students, faculty, and administrators.
            </p>

            <div className="mt-8 space-y-4">
              {[
                "One centralized academic ecosystem",
                "Dedicated student, faculty, and admin portals",
                "Modern, accessible, and responsive experience",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2
                    size={20}
                    className="text-[#4D8A68] shrink-0"
                  />
                  <span className="font-medium text-[#45685B]">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-9 inline-flex items-center gap-2 font-bold text-[#234E43]">
              Built to help every learner thrive
              <ArrowUpRight size={20} className="text-[#D9A536]" />
            </div>
          </div>
        </div>

        {/* Brand Values */}
        <div className="grid md:grid-cols-3 gap-6 mt-24">
          {values.map((value) => {
            const Icon = value.icon;

            return (
              <div
                key={value.title}
                className="bg-white border border-[#E2EADC] rounded-2xl p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-[#F1F7EF] rounded-xl flex items-center justify-center mb-5">
                  <Icon className="text-[#234E43]" size={24} />
                </div>

                <h3 className="text-xl font-bold text-[#234E43]">
                  {value.title}
                </h3>

                <p className="text-[#718579] mt-3 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
