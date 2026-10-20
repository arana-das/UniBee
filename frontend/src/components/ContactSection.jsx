
import { useState } from "react";
import {
  Mail,
  MapPin,
  MessageCircle,
  Send,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setSubmitted(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Frontend demo only. Backend submission will be added later.
    setSubmitted(true);
  };

  const inputStyle =
    "w-full px-5 py-3.5 rounded-xl border border-[#DFE8DC] bg-[#F9FBF8] text-[#234E43] placeholder:text-[#9AACA0] focus:outline-none focus:ring-2 focus:ring-[#A6C1A4] focus:border-[#A6C1A4] transition";

  return (
    <section
      id="contact"
      className="relative bg-white py-24 lg:py-32 overflow-hidden"
    >
      <div className="absolute -right-24 top-10 w-80 h-80 rounded-full bg-[#D9A536]/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F6F8F3] border border-[#E0E9DC] text-[#45685B] text-sm font-semibold mb-6">
            <MessageCircle size={16} className="text-[#D9A536]" />
            GET IN TOUCH
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#234E43]">
            Let's start a{" "}
            <span className="text-[#D9A536]">conversation.</span>
          </h2>

          <p className="mt-6 text-lg text-[#718579] leading-relaxed">
            Have a question about UniBee? We'd love to hear from you.
            Reach out and connect with our team.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10 items-start">
          {/* Left: Contact Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#234E43] rounded-3xl p-8 text-white">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-7">
                <Mail size={27} className="text-[#D9A536]" />
              </div>

              <h3 className="text-2xl font-bold mb-3">
                We're here to help.
              </h3>

              <p className="text-[#D0E0D5] leading-relaxed">
                Whether you have a question, suggestion, or feedback,
                UniBee is all about keeping our campus connected.
              </p>

              <div className="mt-8 pt-7 border-t border-white/15">
                <p className="text-sm text-[#BDD2C4] mb-2">
                  Contact email
                </p>
                <p className="font-semibold">
                  Contact details coming soon
                </p>
              </div>
            </div>

            <div className="bg-[#F6F8F3] border border-[#E2EADC] rounded-2xl p-6 flex gap-4">
              <div className="w-12 h-12 shrink-0 bg-white rounded-xl flex items-center justify-center">
                <MapPin size={23} className="text-[#234E43]" />
              </div>

              <div>
                <h4 className="font-bold text-[#234E43] mb-2">
                  Our University
                </h4>
                <p className="text-sm text-[#718579] leading-relaxed">
                  Bangladesh University of Professionals
                  <br />
                  Mirpur Cantonment, Dhaka, Bangladesh
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[#45685B] text-sm px-2">
              <CheckCircle2 size={18} className="text-[#4D8A68]" />
              Designed to keep the UniBee community connected
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-[#E2EADC] rounded-3xl p-7 md:p-10 shadow-xl shadow-[#234E43]/5">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-[#234E43]">
                  Send us a message
                </h3>
                <p className="text-[#718579] mt-2">
                  Fill out the form below to prepare your message.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-sm font-semibold text-[#45685B] mb-2"
                    >
                      Full Name
                    </label>

                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      required
                      maxLength={100}
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      className={inputStyle}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-sm font-semibold text-[#45685B] mb-2"
                    >
                      Email Address
                    </label>

                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      required
                      maxLength={254}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-subject"
                    className="block text-sm font-semibold text-[#45685B] mb-2"
                  >
                    Subject
                  </label>

                  <input
                    id="contact-subject"
                    type="text"
                    name="subject"
                    required
                    maxLength={150}
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="What is your message about?"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-semibold text-[#45685B] mb-2"
                  >
                    Your Message
                  </label>

                  <textarea
                    id="contact-message"
                    name="message"
                    rows={6}
                    required
                    maxLength={3000}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Write your message here..."
                    className={`${inputStyle} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#D9A536] text-[#234E43] px-8 py-4 rounded-xl font-bold hover:bg-[#E5B64B] hover:-translate-y-0.5 transition-all duration-300"
                >
                  Prepare Message
                  <Send size={18} />
                </button>

                {submitted && (
                  <p
                    role="status"
                    className="text-sm text-[#45685B] bg-[#F1F7EF] border border-[#DCE8DA] rounded-xl p-4"
                  >
                    Your message is ready. Online submission will
                    be available when the backend is connected.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="mt-16 bg-[#F6F8F3] rounded-2xl px-7 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h4 className="font-bold text-[#234E43] text-lg">
              UniBee — Learn. Connect. Bloom.
            </h4>
            <p className="text-sm text-[#718579] mt-1">
              Building a smarter, more connected university experience.
            </p>
          </div>

          <a
            href="#home"
            className="inline-flex items-center gap-2 text-[#234E43] font-semibold hover:text-[#B78B28] transition"
          >
            Back to Top <ArrowUpRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
