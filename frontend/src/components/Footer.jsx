
import { Link } from "react-router-dom";
import {
  GraduationCap,
  ArrowUpRight,
  Mail,
  MapPin,
  Heart,
  Hexagon,
} from "lucide-react";

const quickLinks = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "About UniBee", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const portalLinks = [
  { label: "Student Portal", href: "/login" },
  { label: "Faculty Portal", href: "/login" },
  { label: "Admin Portal", href: "/login" },
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-[#234E43] text-white">
      {/* Subtle Decorations */}
      <Hexagon
        size={230}
        strokeWidth={0.5}
        className="absolute -right-16 -top-16 text-white/5 pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-16">

          {/* Branding */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <GraduationCap
                  size={27}
                  className="text-[#D9A536]"
                />
              </div>

              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">
                  Uni<span className="text-[#D9A536]">Bee</span>
                </h2>
                <p className="text-[10px] tracking-[0.18em] text-[#B9D0C2]">
                  LEARN. CONNECT. BLOOM.
                </p>
              </div>
            </Link>

            <p className="mt-7 max-w-md text-[#C5D9CC] leading-relaxed">
              A unified digital university experience that brings
              learning, communication, academic management, and
              campus opportunities together in one connected space.
            </p>

            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-[#D5E5D9]">
              <Heart size={16} className="text-[#D9A536]" />
              Built for a smarter campus
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6">
              Quick Links
            </h3>

            <ul className="space-y-4">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-flex items-center gap-2 text-[#C5D9CC] hover:text-[#D9A536] transition-colors"
                  >
                    <ArrowUpRight size={15} />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h3 className="text-lg font-bold mb-6">
              Our Portals
            </h3>

            <ul className="space-y-4">
              {portalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="inline-flex items-center gap-2 text-[#C5D9CC] hover:text-[#D9A536] transition-colors"
                  >
                    <ArrowUpRight size={15} />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="border-t border-white/15 py-7 flex flex-col md:flex-row gap-5 md:gap-10">
          <div className="flex items-start gap-3 text-sm text-[#C5D9CC]">
            <MapPin
              size={19}
              className="text-[#D9A536] shrink-0"
            />
            <span>
              Bangladesh University of Professionals,
              Mirpur Cantonment, Dhaka
            </span>
          </div>

          <a
            href="#contact"
            className="inline-flex items-center gap-3 text-sm text-[#C5D9CC] hover:text-[#D9A536] transition"
          >
            <Mail size={19} className="text-[#D9A536]" />
            Contact UniBee
          </a>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/15 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#B9D0C2] text-center sm:text-left">
            © {currentYear} UniBee. All rights reserved.
          </p>

          <p className="text-sm text-[#B9D0C2] flex items-center gap-2">
            Learn
            <span className="text-[#D9A536]">✦</span>
            Connect
            <span className="text-[#D9A536]">✦</span>
            Bloom
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
