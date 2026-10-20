
import {
  BookOpen,
  ClipboardCheck,
  ChartNoAxesCombined,
  CalendarDays,
  MessageSquareText,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Smart Course Management",
    description:
      "Access courses, learning materials, assignments, and academic resources from one organized workspace.",
    number: "01",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance Tracking",
    description:
      "Monitor attendance, review course-wise records, and stay informed about your academic participation.",
    number: "02",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Academic Analytics",
    description:
      "Visualize grades, semester performance, CGPA trends, and academic progress through interactive insights.",
    number: "03",
  },
  {
    icon: CalendarDays,
    title: "Smart Scheduling",
    description:
      "Stay organized with class routines, examination schedules, important deadlines, and campus events.",
    number: "04",
  },
  {
    icon: MessageSquareText,
    title: "Campus Communication",
    description:
      "Connect students, faculty, and administrators through announcements and university communication.",
    number: "05",
  },
  {
    icon: Sparkles,
    title: "Smart Academic Assistance",
    description:
      "Explore academic guidance, personalized recommendations, and intelligent university support tools.",
    number: "06",
  },
];

function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative bg-white py-24 lg:py-32 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F6F8F3] border border-[#E0E9DC] text-[#45685B] text-sm font-semibold mb-6">
            <Sparkles size={16} className="text-[#D9A536]" />
            THE UNIBEE EXPERIENCE
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold text-[#234E43] tracking-tight leading-tight">
            Everything you need to
            <span className="text-[#D9A536]"> thrive.</span>
          </h2>

          <p className="mt-6 text-lg text-[#708579] leading-relaxed">
            One connected digital campus designed to simplify academic
            life, strengthen collaboration, and support every step
            of your university journey.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.number}
                className="group relative bg-[#F9FAF7] border border-[#E6ECE3] rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#234E43]/10 hover:border-[#A6C1A4]"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-[#E9F1E7] flex items-center justify-center group-hover:bg-[#234E43] transition-colors duration-300">
                    <Icon
                      size={27}
                      className="text-[#234E43] group-hover:text-[#D9A536] transition-colors duration-300"
                    />
                  </div>

                  <span className="text-sm font-bold text-[#A6B8AA]">
                    {feature.number}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#234E43] mb-4">
                  {feature.title}
                </h3>

                <p className="text-[#718579] leading-relaxed text-sm">
                  {feature.description}
                </p>

                <div className="mt-8 pt-5 border-t border-[#E1E9DF] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#45685B]">
                    Explore capability
                  </span>

                  <div className="w-9 h-9 rounded-full border border-[#DDE7DA] flex items-center justify-center group-hover:bg-[#D9A536] group-hover:border-[#D9A536] transition-all duration-300">
                    <ArrowUpRight
                      size={17}
                      className="text-[#234E43]"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Bottom Message */}
        <div className="mt-16 text-center">
          <p className="text-[#708579]">
            Built for students, faculty, and administrators.
            <span className="font-bold text-[#234E43]">
              {" "}Connected by UniBee.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
