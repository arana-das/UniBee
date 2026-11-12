
import { useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  Phone,
  Building2,
  BriefcaseBusiness,
  GraduationCap,
  MapPin,
  CalendarDays,
  IdCard,
  ShieldCheck,
  Pencil,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Camera,
  Info,
  LockKeyhole,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const PROFILE_KEY =
  "unibee-exam-controller-profile-v1";

const DEFAULT_PROFILE = {
  fullName: "",
  employeeId: "",
  designation: "Controller of Examinations",
  department: "Examination Administration",
  email: "",
  phone: "",
  officeLocation: "",
  university: "",
  qualification: "",
  joiningDate: "",
  bio: "",
};

const INPUT =
  "w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none transition focus:border-[#234E43] focus:ring-2 focus:ring-[#234E43]/10";

function text(value) {
  return String(value ?? "").trim();
}

function loadProfile() {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);

    if (!saved) return { ...DEFAULT_PROFILE };

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ...DEFAULT_PROFILE };
    }

    return {
      ...DEFAULT_PROFILE,
      ...Object.fromEntries(
        Object.keys(DEFAULT_PROFILE).map((key) => [
          key,
          typeof parsed[key] === "string"
            ? parsed[key]
            : DEFAULT_PROFILE[key],
        ])
      ),
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function formatDate(value) {
  if (!value) return "Not provided";

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getInitials(name) {
  const parts = text(name)
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "EC";

  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function ProfileField({
  label,
  value,
  icon: Icon,
  onChange,
  placeholder,
  required = false,
  type = "text",
  disabled = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[#234E43]">
        <Icon size={16} />
        {label}
        {required && (
          <span className="text-rose-600">*</span>
        )}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={`${INPUT} ${
          disabled
            ? "cursor-not-allowed bg-[#F6F8F3]"
            : ""
        }`}
      />
    </label>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#E2EADC] p-4">
      <div className="shrink-0 rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-[#718579]">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-bold text-[#234E43]">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

export default function ExamControllerProfile() {
  const [profile, setProfile] = useState(
    loadProfile
  );

  const [form, setForm] = useState(
    loadProfile
  );

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  function refreshProfile() {
    const latest = loadProfile();

    setProfile(latest);

    if (!editing) {
      setForm(latest);
    }
  }

  useEffect(() => {
    function onStorage(event) {
      if (event.key === PROFILE_KEY) {
        const latest = loadProfile();
        setProfile(latest);
        setForm(latest);
      }
    }

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(
        "storage",
        onStorage
      );
    };
  }, []);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function startEditing() {
    setForm({ ...profile });
    setError("");
    setFeedback("");
    setEditing(true);
  }

  function cancelEditing() {
    setForm({ ...profile });
    setError("");
    setEditing(false);
  }

  function saveProfile(event) {
    event.preventDefault();

    if (!text(form.fullName)) {
      setError("Full name is required.");
      return;
    }

    if (!text(form.employeeId)) {
      setError("Employee ID is required.");
      return;
    }

    if (!text(form.designation)) {
      setError("Designation is required.");
      return;
    }

    if (!text(form.department)) {
      setError("Department is required.");
      return;
    }

    if (!text(form.email)) {
      setError("Email address is required.");
      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(text(form.email))) {
      setError("Enter a valid email address.");
      return;
    }

    if (
      text(form.phone) &&
      !/^[+0-9()\s-]{7,20}$/.test(
        text(form.phone)
      )
    ) {
      setError(
        "Enter a valid contact number."
      );
      return;
    }

    const cleaned = Object.fromEntries(
      Object.keys(DEFAULT_PROFILE).map((key) => [
        key,
        text(form[key]),
      ])
    );

    try {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(cleaned)
      );

      setProfile(cleaned);
      setForm(cleaned);

      setEditing(false);
      setError("");
      setFeedback(
        "Profile information saved successfully."
      );

      // Other tabs can respond to this event.
      // The layout will also read the saved
      // profile when it is reloaded.
      window.dispatchEvent(
        new CustomEvent(
          "unibee-exam-controller-profile-updated",
          { detail: cleaned }
        )
      );
    } catch {
      setError(
        "Unable to save your profile in browser storage."
      );
    }
  }

  const displayName =
    profile.fullName || "Exam Controller";

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            ACCOUNT MANAGEMENT
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            My Profile
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            View and manage your examination
            administration profile and contact
            information.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!editing && (
            <>
              <button
                type="button"
                onClick={() => {
                  refreshProfile();
                  setFeedback(
                    "Profile refreshed."
                  );
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
              >
                <RefreshCw size={17} />
                Refresh
              </button>

              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white hover:bg-[#193B33]"
              >
                <Pencil size={17} />
                Edit Profile
              </button>
            </>
          )}

          {editing && (
            <button
              type="button"
              onClick={cancelEditing}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43]"
            >
              <X size={17} />
              Cancel Editing
            </button>
          )}
        </div>
      </section>

      {/* FEEDBACK */}
      {feedback && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 size={19} />
          {feedback}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle
            size={19}
            className="shrink-0"
          />
          {error}
        </div>
      )}

      {/* PROFILE HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-6 text-white md:p-9">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border-[35px] border-white/5" />

        <div className="relative z-10 flex flex-wrap items-center gap-6">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white/20 bg-[#D9A536] text-3xl font-black text-[#234E43] shadow-lg md:h-28 md:w-28">
              {getInitials(displayName)}
            </div>

            <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border-4 border-[#234E43] bg-white text-[#234E43]">
              <ShieldCheck size={19} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
              <ShieldCheck size={15} />
              EXAM CONTROLLER
            </div>

            <h2 className="break-words text-2xl font-extrabold md:text-3xl">
              {displayName}
            </h2>

            <p className="mt-2 text-sm font-medium text-[#D0E2D7]">
              {profile.designation}
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#D0E2D7]">
              <span className="inline-flex items-center gap-2">
                <Building2 size={15} />
                {profile.department}
              </span>

              {profile.employeeId && (
                <span className="inline-flex items-center gap-2">
                  <IdCard size={15} />
                  {profile.employeeId}
                </span>
              )}

              {profile.email && (
                <span className="inline-flex items-center gap-2 break-all">
                  <Mail size={15} />
                  {profile.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* EDIT MODE */}
      {editing ? (
        <form
          onSubmit={saveProfile}
          className="space-y-6"
        >
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                <UserRound size={21} />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-[#234E43]">
                  Personal Information
                </h2>

                <p className="mt-1 text-xs text-[#718579]">
                  Update your basic profile details.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <ProfileField
                label="Full Name"
                icon={UserRound}
                value={form.fullName}
                onChange={(value) =>
                  updateField("fullName", value)
                }
                placeholder="Enter full name"
                required
              />

              <ProfileField
                label="Employee ID"
                icon={IdCard}
                value={form.employeeId}
                onChange={(value) =>
                  updateField("employeeId", value)
                }
                placeholder="e.g. EC-001"
                required
              />

              <ProfileField
                label="Email Address"
                icon={Mail}
                type="email"
                value={form.email}
                onChange={(value) =>
                  updateField("email", value)
                }
                placeholder="name@university.edu"
                required
              />

              <ProfileField
                label="Contact Number"
                icon={Phone}
                type="tel"
                value={form.phone}
                onChange={(value) =>
                  updateField("phone", value)
                }
                placeholder="Enter phone number"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                <BriefcaseBusiness size={21} />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-[#234E43]">
                  Professional Information
                </h2>

                <p className="mt-1 text-xs text-[#718579]">
                  Manage your institutional details.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <ProfileField
                label="Designation"
                icon={BriefcaseBusiness}
                value={form.designation}
                onChange={(value) =>
                  updateField("designation", value)
                }
                required
              />

              <ProfileField
                label="Department"
                icon={Building2}
                value={form.department}
                onChange={(value) =>
                  updateField("department", value)
                }
                required
              />

              <ProfileField
                label="University"
                icon={Building2}
                value={form.university}
                onChange={(value) =>
                  updateField("university", value)
                }
                placeholder="Institution name"
              />

              <ProfileField
                label="Office Location"
                icon={MapPin}
                value={form.officeLocation}
                onChange={(value) =>
                  updateField("officeLocation", value)
                }
                placeholder="Building / room"
              />

              <ProfileField
                label="Qualification"
                icon={GraduationCap}
                value={form.qualification}
                onChange={(value) =>
                  updateField("qualification", value)
                }
                placeholder="Highest qualification"
              />

              <ProfileField
                label="Joining Date"
                icon={CalendarDays}
                type="date"
                value={form.joiningDate}
                onChange={(value) =>
                  updateField("joiningDate", value)
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
            <h2 className="text-lg font-extrabold text-[#234E43]">
              Professional Biography
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Add a short description of your role or experience.
            </p>

            <textarea
              rows={5}
              maxLength={1500}
              value={form.bio}
              onChange={(event) =>
                updateField(
                  "bio",
                  event.target.value
                )
              }
              placeholder="Write your professional biography..."
              className={`${INPUT} mt-5 resize-y leading-7`}
            />

            <p className="mt-2 text-right text-xs text-[#718579]">
              {form.bio.length} / 1500 characters
            </p>
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-xl border border-[#E2EADC] bg-white px-6 py-3 text-sm font-bold text-[#234E43]"
            >
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
      ) : (
        <>
          {/* PERSONAL DETAILS */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                <UserRound size={21} />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-[#234E43]">
                  Personal Information
                </h2>

                <p className="mt-1 text-xs text-[#718579]">
                  Your saved profile and contact details.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
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
                label="Contact Number"
                value={profile.phone}
              />
            </div>
          </section>

          {/* PROFESSIONAL DETAILS */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                <BriefcaseBusiness size={21} />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-[#234E43]">
                  Professional Information
                </h2>

                <p className="mt-1 text-xs text-[#718579]">
                  Your examination administration role.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
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
                icon={Building2}
                label="University"
                value={profile.university}
              />

              <InfoItem
                icon={MapPin}
                label="Office Location"
                value={profile.officeLocation}
              />

              <InfoItem
                icon={GraduationCap}
                label="Qualification"
                value={profile.qualification}
              />

              <InfoItem
                icon={CalendarDays}
                label="Joining Date"
                value={
                  profile.joiningDate
                    ? formatDate(profile.joiningDate)
                    : "Not provided"
                }
              />
            </div>
          </section>

          {/* BIOGRAPHY */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                <FileTextIcon />
              </div>

              <h2 className="text-lg font-extrabold text-[#234E43]">
                Professional Biography
              </h2>
            </div>

            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-8 text-[#53695C]">
              {profile.bio ||
                "No professional biography has been added yet."}
            </p>
          </section>
        </>
      )}

      {/* ACCOUNT INFORMATION */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
            <LockKeyhole size={21} />
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-[#234E43]">
              Account Information
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Portal role and authentication information.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <InfoItem
            icon={ShieldCheck}
            label="Portal Role"
            value="Exam Controller"
          />

          <InfoItem
            icon={LockKeyhole}
            label="Authentication"
            value="Frontend Prototype"
          />
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-4">
          <Info
            size={19}
            className="mt-0.5 shrink-0 text-[#234E43]"
          />

          <p className="text-xs leading-6 text-[#718579]">
            Your profile is currently stored in this
            browser only. Institutional account
            verification, authenticated profile updates,
            profile photographs, password management,
            and role permissions will be implemented
            during backend integration.
          </p>
        </div>
      </section>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Exam Controller — My Profile
      </p>
    </div>
  );
}

// Simple biography icon.
function FileTextIcon() {
  return <UserRound size={21} />;
}
