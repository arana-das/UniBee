
import { useEffect, useMemo, useState } from "react";
import {
  UserRound,
  Building2,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  BriefcaseBusiness,
  ShieldCheck,
  Pencil,
  Save,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BadgeCheck,
  Landmark,
  GraduationCap,
  IdCard,
  FileText,
  Clock3,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const STORAGE_KEY =
  "unibee-accounts-officer-profile-v1";

const DEFAULT_PROFILE = {
  fullName: "",
  employeeId: "",
  designation: "Accounts Officer",
  department: "Accounts & Finance",
  email: "",
  phone: "",
  officeLocation: "",
  joiningDate: "",
  qualification: "",
  specialization: "",
  employmentType: "Full-Time",
  bio: "",
};

const EMPLOYMENT_TYPES = [
  "Full-Time",
  "Part-Time",
  "Contractual",
  "Other",
];

// ========================================
// UTILITIES
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { ...DEFAULT_PROFILE };
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ...DEFAULT_PROFILE };
    }

    const result = { ...DEFAULT_PROFILE };

    Object.keys(DEFAULT_PROFILE).forEach((key) => {
      if (typeof parsed[key] === "string") {
        result[key] = parsed[key];
      }
    });

    return result;
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function formatDate(value) {
  if (!value) return "Not provided";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getInitials(fullName) {
  const words = text(fullName)
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "AO";

  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function InfoItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl bg-[#F6F8F3] p-4">
      <div className="shrink-0 rounded-lg bg-[#EAF2E8] p-2.5 text-[#234E43]">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-[#718579]">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-bold text-[#234E43]">
          {text(value) || "Not provided"}
        </p>
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  maxLength = 150,
}) {
  return (
    <div>
      <label
        htmlFor={`accounts-profile-${name}`}
        className="mb-2 block text-sm font-semibold text-[#234E43]"
      >
        {label}
        {required && (
          <span className="ml-1 text-rose-600">
            *
          </span>
        )}
      </label>

      <input
        id={`accounts-profile-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={(event) =>
          onChange(name, event.target.value)
        }
        placeholder={placeholder}
        required={required}
        maxLength={
          type === "date" ? undefined : maxLength
        }
        className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none transition focus:border-[#234E43] focus:ring-2 focus:ring-[#234E43]/10"
      />
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
        <Icon size={20} />
      </div>

      <div>
        <h2 className="text-lg font-extrabold text-[#234E43]">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-[#718579]">
          {description}
        </p>
      </div>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function AccountsProfile() {
  const [profile, setProfile] =
    useState(loadProfile);

  const [form, setForm] = useState(() =>
    loadProfile()
  );

  const [editing, setEditing] =
    useState(false);

  const [feedback, setFeedback] =
    useState("");

  const [error, setError] =
    useState("");

  // ======================================
  // REFRESH PROFILE
  // ========================================

  useEffect(() => {
    function refresh() {
      const latest = loadProfile();

      setProfile(latest);

      setForm((current) =>
        editing ? current : latest
      );
    }

    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(
        "storage",
        refresh
      );
    };
  }, [editing]);

  // ======================================
  // PROFILE COMPLETION
  // ========================================

  const completion = useMemo(() => {
    const fields = [
      "fullName",
      "employeeId",
      "designation",
      "department",
      "email",
      "phone",
      "officeLocation",
      "joiningDate",
      "qualification",
      "specialization",
      "employmentType",
      "bio",
    ];

    const completed = fields.filter(
      (field) => text(profile[field]) !== ""
    ).length;

    return {
      completed,
      total: fields.length,
      percentage: Math.round(
        (completed / fields.length) * 100
      ),
    };
  }, [profile]);

  // ========================================
  // PROFILE ACTIONS
  // ========================================

  function startEditing() {
    setForm({ ...profile });
    setEditing(true);
    setFeedback("");
    setError("");
  }

  function cancelEditing() {
    setForm({ ...profile });
    setEditing(false);
    setError("");
  }

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleSave(event) {
    event.preventDefault();

    const fullName = text(form.fullName);
    const employeeId = text(form.employeeId);
    const email = text(form.email);
    const phone = text(form.phone);

    if (!fullName || !employeeId) {
      setError(
        "Full name and Employee ID are required."
      );
      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    if (
      phone &&
      !/^[+]?[0-9 ()-]{7,20}$/.test(phone)
    ) {
      setError(
        "Please enter a valid phone number."
      );
      return;
    }

    const next = {
      ...DEFAULT_PROFILE,
    };

    Object.keys(DEFAULT_PROFILE).forEach(
      (key) => {
        next[key] = text(form[key]);
      }
    );

    next.updatedAt =
      new Date().toISOString();

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      setProfile(next);
      setForm(next);
      setEditing(false);

      setFeedback(
        "Profile information saved successfully."
      );

      setError("");
    } catch {
      setError(
        "Unable to save profile information in browser storage."
      );
    }
  }

  function refreshProfile() {
    const latest = loadProfile();

    setProfile(latest);

    if (!editing) {
      setForm(latest);
    }

    setFeedback(
      "Saved profile information refreshed."
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            ACCOUNT MANAGEMENT
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            My Profile
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Manage your Accounts Officer profile,
            professional information, and contact
            details.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshProfile}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] hover:bg-[#F1F7EF]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white hover:bg-[#193B33]"
            >
              <Pencil size={17} />
              Edit Profile
            </button>
          )}
        </div>
      </section>

      {/* FEEDBACK */}
      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </div>
      )}

      {error && !editing && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* PROFILE HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border-[35px] border-white/5" />

        <div className="relative z-10 flex flex-wrap items-center gap-5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-4 border-white/15 bg-[#D9A536] text-3xl font-extrabold text-[#234E43]">
            {getInitials(profile.fullName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#D9A536]">
              <Landmark size={15} />
              ACCOUNTS OFFICER PORTAL
            </div>

            <h2 className="break-words text-2xl font-extrabold md:text-3xl">
              {profile.fullName ||
                "Accounts Officer"}
            </h2>

            <p className="mt-2 text-sm text-[#D0E2D7]">
              {profile.designation}
              {" · "}
              {profile.department}
            </p>

            <p className="mt-2 text-xs text-[#A6C1B4]">
              Employee ID:{" "}
              {profile.employeeId ||
                "Not provided"}
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 p-4">
            <div className="flex items-center gap-2 text-[#D9A536]">
              <ShieldCheck size={19} />
              <span className="text-xs font-bold">
                PROFILE WORKSPACE
              </span>
            </div>

            <p className="mt-2 text-xs leading-6 text-[#D0E2D7]">
              University Finance Department
            </p>
          </div>
        </div>
      </section>

      {/* PROFILE COMPLETION */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#234E43]">
              Profile Completion
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              {completion.completed} of{" "}
              {completion.total} profile fields completed
            </p>
          </div>

          <p className="text-2xl font-extrabold text-[#234E43]">
            {completion.percentage}%
          </p>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#EAF2E8]">
          <div
            className="h-full rounded-full bg-[#D9A536] transition-all duration-300"
            style={{
              width: `${completion.percentage}%`,
            }}
          />
        </div>

        <p className="mt-3 text-xs leading-5 text-[#718579]">
          Add your personal and professional
          information to complete this profile.
        </p>
      </section>

      {/* VIEW MODE */}
      {!editing && (
        <>
          {/* PERSONAL INFORMATION */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
            <SectionTitle
              icon={UserRound}
              title="Personal Information"
              description="Basic identity and contact details"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InfoItem
                icon={UserRound}
                label="Full Name"
                value={profile.fullName}
              />

              <InfoItem
                icon={IdCard}
                label="Employee ID"
                value={profile.employeeId}
              />

              <InfoItem
                icon={Mail}
                label="Email Address"
                value={profile.email}
              />

              <InfoItem
                icon={Phone}
                label="Phone Number"
                value={profile.phone}
              />
            </div>
          </section>

          {/* PROFESSIONAL INFORMATION */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
            <SectionTitle
              icon={BriefcaseBusiness}
              title="Professional Information"
              description="University employment and office details"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InfoItem
                icon={BriefcaseBusiness}
                label="Designation"
                value={profile.designation}
              />

              <InfoItem
                icon={Building2}
                label="Department"
                value={profile.department}
              />

              <InfoItem
                icon={MapPin}
                label="Office Location"
                value={profile.officeLocation}
              />

              <InfoItem
                icon={CalendarDays}
                label="Joining Date"
                value={formatDate(profile.joiningDate)}
              />

              <InfoItem
                icon={BadgeCheck}
                label="Employment Type"
                value={profile.employmentType}
              />

              <InfoItem
                icon={Landmark}
                label="Assigned Portal"
                value="Accounts Officer"
              />
            </div>
          </section>

          {/* QUALIFICATIONS */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
            <SectionTitle
              icon={GraduationCap}
              title="Education & Expertise"
              description="Qualifications and professional specialization"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InfoItem
                icon={GraduationCap}
                label="Highest Qualification"
                value={profile.qualification}
              />

              <InfoItem
                icon={FileText}
                label="Professional Specialization"
                value={profile.specialization}
              />
            </div>

            <div className="mt-5 rounded-xl bg-[#F6F8F3] p-5">
              <p className="text-xs font-bold text-[#718579]">
                Professional Bio
              </p>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#234E43]">
                {profile.bio ||
                  "No professional biography added yet."}
              </p>
            </div>
          </section>
        </>
      )}

      {/* EDIT MODE */}
      {editing && (
        <form
          onSubmit={handleSave}
          className="space-y-6"
        >
          {/* PERSONAL DETAILS */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
            <SectionTitle
              icon={UserRound}
              title="Edit Personal Information"
              description="Update your identity and contact details"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Full Name"
                name="fullName"
                value={form.fullName}
                onChange={updateField}
                placeholder="Enter your full name"
                required
              />

              <FormField
                label="Employee ID"
                name="employeeId"
                value={form.employeeId}
                onChange={updateField}
                placeholder="Enter employee ID"
                required
              />

              <FormField
                label="Email Address"
                name="email"
                value={form.email}
                onChange={updateField}
                type="email"
                placeholder="name@university.edu"
              />

              <FormField
                label="Phone Number"
                name="phone"
                value={form.phone}
                onChange={updateField}
                type="tel"
                placeholder="Enter phone number"
              />
            </div>
          </section>

          {/* PROFESSIONAL DETAILS */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
            <SectionTitle
              icon={BriefcaseBusiness}
              title="Edit Professional Information"
              description="Maintain your university employment details"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Designation"
                name="designation"
                value={form.designation}
                onChange={updateField}
                placeholder="Accounts Officer"
              />

              <FormField
                label="Department"
                name="department"
                value={form.department}
                onChange={updateField}
                placeholder="Accounts & Finance"
              />

              <FormField
                label="Office Location"
                name="officeLocation"
                value={form.officeLocation}
                onChange={updateField}
                placeholder="Building / Room Number"
              />

              <FormField
                label="Joining Date"
                name="joiningDate"
                value={form.joiningDate}
                onChange={updateField}
                type="date"
              />

              <div>
                <label
                  htmlFor="accounts-employment-type"
                  className="mb-2 block text-sm font-semibold text-[#234E43]"
                >
                  Employment Type
                </label>

                <select
                  id="accounts-employment-type"
                  value={form.employmentType}
                  onChange={(event) =>
                    updateField(
                      "employmentType",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43]"
                >
                  {EMPLOYMENT_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* EDUCATION */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
            <SectionTitle
              icon={GraduationCap}
              title="Edit Education & Expertise"
              description="Add qualifications and professional experience"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Highest Qualification"
                name="qualification"
                value={form.qualification}
                onChange={updateField}
                placeholder="e.g. MBA in Finance"
              />

              <FormField
                label="Professional Specialization"
                name="specialization"
                value={form.specialization}
                onChange={updateField}
                placeholder="e.g. Financial Accounting"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="accounts-profile-bio"
                className="mb-2 block text-sm font-semibold text-[#234E43]"
              >
                Professional Bio
              </label>

              <textarea
                id="accounts-profile-bio"
                rows={5}
                maxLength={1500}
                value={form.bio}
                onChange={(event) =>
                  updateField(
                    "bio",
                    event.target.value
                  )
                }
                placeholder="Write a brief professional introduction..."
                className="w-full resize-y rounded-xl border border-[#E2EADC] p-4 text-sm leading-7 text-[#234E43] outline-none focus:border-[#234E43]"
              />

              <p className="mt-2 text-right text-xs text-[#718579]">
                {form.bio.length}/1500 characters
              </p>
            </div>
          </section>

          {/* VALIDATION ERROR */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
            >
              <AlertCircle
                size={18}
                className="shrink-0"
              />

              {error}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={cancelEditing}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-6 py-3 text-sm font-bold text-[#234E43] hover:bg-[#F6F8F3]"
            >
              <X size={18} />
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-6 py-3 text-sm font-bold text-white hover:bg-[#193B33]"
            >
              <Save size={18} />
              Save Profile
            </button>
          </div>
        </form>
      )}

      {/* PROFILE NOTE */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <AlertCircle
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Profile
          information is stored in this browser's
          localStorage. It is not connected to a
          verified employee account, authentication
          system, or university HR database.
          Avoid entering real sensitive information
          during prototype testing. Profile identity
          verification and secure backend integration
          will be added later.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Accounts Officer — My Profile
      </p>
    </div>
  );
}
