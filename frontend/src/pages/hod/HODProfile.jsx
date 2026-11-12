
import { useEffect, useMemo, useState } from "react";
import {
  UserRound,
  Building2,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  BriefcaseBusiness,
  Save,
  RefreshCw,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CalendarDays,
  Award,
  FileText,
  BadgeCheck,
  Globe,
  IdCard,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const KEYS = {
  departments: "unibee-admin-departments-v1",
  selectedDepartment:
    "unibee-hod-selected-department-v1",
  profiles: "unibee-hod-profiles-v1",
};

const EMPTY_PROFILE = {
  fullName: "",
  employeeId: "",
  designation: "Head of Department",
  email: "",
  phone: "",
  officeRoom: "",
  officeHours: "",
  qualification: "",
  specialization: "",
  researchInterests: "",
  experienceYears: "",
  joiningDate: "",
  website: "",
  biography: "",
};

// ========================================
// GENERAL HELPERS
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function first(...values) {
  return (
    values.find(
      (value) =>
        value !== undefined &&
        value !== null &&
        text(value) !== ""
    ) ?? ""
  );
}

function readArray(key) {
  try {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return {
        rows: [],
        status: "missing",
      };
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return {
        rows: [],
        status: "invalid",
      };
    }

    return {
      rows: parsed,
      status: "available",
    };
  } catch {
    return {
      rows: [],
      status: "invalid",
    };
  }
}

function getSelectedDepartmentId() {
  try {
    return (
      localStorage.getItem(
        KEYS.selectedDepartment
      ) || ""
    );
  } catch {
    return "";
  }
}

function loadData() {
  return {
    departments: readArray(KEYS.departments),
    profiles: readArray(KEYS.profiles),
    departmentId: getSelectedDepartmentId(),
  };
}

function departmentInfo(row, index) {
  return {
    id: text(
      first(
        row.id,
        row._id,
        row.code,
        `dept-${index}`
      )
    ),
    name: text(
      first(
        row.name,
        row.departmentName,
        row.title,
        row.code,
        "Unnamed Department"
      )
    ),
    code: text(row.code),
    head: text(
      first(
        row.head,
        row.headName,
        row.hod,
        row.hodName
      )
    ),
    email: text(
      first(row.email, row.departmentEmail)
    ),
    phone: text(
      first(row.phone, row.contact)
    ),
    original: row,
  };
}

function formatDate(value) {
  if (!value) return "—";

  const input = text(value);

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(input)
      ? `${input}T12:00:00`
      : input
  );

  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name) {
  const parts = text(name)
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "HOD";

  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `hod-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

// ========================================
// INPUT COMPONENT
// ========================================

function ProfileInput({
  label,
  name,
  value,
  onChange,
  disabled,
  icon: Icon,
  type = "text",
  placeholder = "",
  maxLength = 150,
  required = false,
  min,
  max,
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#234E43]">
        {Icon && (
          <Icon
            size={16}
            className="text-[#71917F]"
          />
        )}

        {label}
      </span>

      <input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={(event) =>
          onChange(name, event.target.value)
        }
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        min={min}
        max={max}
        className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none transition focus:border-[#A6C1A4] disabled:cursor-default disabled:bg-[#F6F8F3] disabled:text-[#607B6C]"
      />
    </label>
  );
}

// ========================================
// INFORMATION DISPLAY
// ========================================

function InfoItem({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-4">
      <div className="rounded-lg bg-[#EAF2E8] p-2.5 text-[#234E43]">
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-[#718579]">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
          {value || "Not specified"}
        </p>
      </div>
    </div>
  );
}

// ========================================
// MAIN PROFILE PAGE
// ========================================

export default function HODProfile() {
  const [data, setData] = useState(loadData);

  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState(() => getSelectedDepartmentId());

  const [form, setForm] = useState({
    ...EMPTY_PROFILE,
  });

  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // ======================================
  // DEPARTMENT OPTIONS
  // ======================================

  const departments = useMemo(
    () =>
      data.departments.rows.map(
        (row, index) =>
          departmentInfo(row, index)
      ),
    [data.departments.rows]
  );

  const department = departments.find(
    (item) =>
      item.id === selectedDepartmentId
  );

  // ======================================
  // SAVED PROFILE
  // ======================================

  const savedProfile = useMemo(() => {
    if (!department) return null;

    return (
      data.profiles.rows.find(
        (profile) =>
          text(profile.departmentId) ===
          department.id
      ) || null
    );
  }, [
    data.profiles.rows,
    department,
  ]);

  // ======================================
  // LOAD FORM
  // ======================================

  useEffect(() => {
    const profile =
      data.profiles.rows.find(
        (row) =>
          text(row.departmentId) ===
          selectedDepartmentId
      ) || null;

    const next = {};

    Object.keys(EMPTY_PROFILE).forEach(
      (key) => {
        next[key] = text(
          profile?.[key] ??
          EMPTY_PROFILE[key]
        );
      }
    );

    setForm(next);
    setEditing(false);
  }, [
    selectedDepartmentId,
    data.profiles.rows,
  ]);

  // ======================================
  // REFRESH EVENTS
  // ======================================

  useEffect(() => {
    function reload() {
      setData(loadData());
      setSelectedDepartmentId(
        getSelectedDepartmentId()
      );
    }

    function onVisible() {
      if (
        document.visibilityState === "visible"
      ) {
        reload();
      }
    }

    window.addEventListener(
      "storage",
      reload
    );

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.removeEventListener(
        "storage",
        reload
      );

      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  // ======================================
  // FORM ACTIONS
  // ======================================

  function updateField(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function changeDepartment(id) {
    setSelectedDepartmentId(id);
    setEditing(false);
    setError("");
    setFeedback("");

    try {
      if (id) {
        localStorage.setItem(
          KEYS.selectedDepartment,
          id
        );
      } else {
        localStorage.removeItem(
          KEYS.selectedDepartment
        );
      }
    } catch {
      setError(
        "Department selection could not be saved."
      );
    }
  }

  function refreshData() {
    setData(loadData());

    setSelectedDepartmentId(
      getSelectedDepartmentId()
    );

    setError("");
    setFeedback(
      "Profile data refreshed."
    );
  }

  function cancelEditing() {
    const restored = {};

    Object.keys(EMPTY_PROFILE).forEach(
      (key) => {
        restored[key] = text(
          savedProfile?.[key] ??
          EMPTY_PROFILE[key]
        );
      }
    );

    setForm(restored);
    setEditing(false);
    setError("");
  }

  function validateForm() {
    if (!text(form.fullName)) {
      return "Full name is required.";
    }

    if (!text(form.employeeId)) {
      return "Employee ID is required.";
    }

    if (!text(form.email)) {
      return "Email address is required.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        text(form.email)
      )
    ) {
      return "Enter a valid email address.";
    }

    if (
      form.experienceYears &&
      (
        !Number.isFinite(
          Number(form.experienceYears)
        ) ||
        Number(form.experienceYears) < 0 ||
        Number(form.experienceYears) > 80
      )
    ) {
      return "Enter a valid number of experience years.";
    }

    if (text(form.website)) {
      try {
        const url = new URL(
          text(form.website)
        );

        if (
          !["https:", "http:"].includes(
            url.protocol
          )
        ) {
          return "Website must use HTTP or HTTPS.";
        }
      } catch {
        return "Enter a valid website URL.";
      }
    }

    return "";
  }

  function saveProfile(event) {
    event.preventDefault();
    setError("");
    setFeedback("");

    if (!department) {
      setError(
        "Select a valid department before saving."
      );
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const latest = readArray(
      KEYS.profiles
    );

    if (latest.status === "invalid") {
      setError(
        "Stored HOD profile data is invalid. No changes were made."
      );
      return;
    }

    const existing =
      latest.rows.find(
        (profile) =>
          text(profile.departmentId) ===
          department.id
      ) || null;

    const now = new Date().toISOString();

    const cleanForm = {};

    Object.keys(EMPTY_PROFILE).forEach(
      (key) => {
        cleanForm[key] = text(form[key]);
      }
    );

    const record = {
      ...existing,
      id: existing?.id || makeId(),
      departmentId: department.id,
      departmentName: department.name,
      departmentCode: department.code,
      ...cleanForm,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const next = [
      ...latest.rows.filter(
        (profile) =>
          text(profile.departmentId) !==
          department.id
      ),
      record,
    ];

    try {
      localStorage.setItem(
        KEYS.profiles,
        JSON.stringify(next)
      );

      setData((previous) => ({
        ...previous,
        profiles: {
          rows: next,
          status: "available",
        },
      }));

      setEditing(false);

      setFeedback(
        "HOD profile saved successfully."
      );
    } catch {
      setError(
        "Unable to save profile to browser storage."
      );
    }
  }

  // ======================================
  // DISPLAY VALUES
  // ======================================

  const displayName =
    text(form.fullName) ||
    "Department Head";

  const displayDesignation =
    text(form.designation) ||
    "Head of Department";

  const profileCompleted =
    Boolean(savedProfile);

  // ======================================
  // RENDER
  // ======================================

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
            Manage your professional information,
            academic background and contact details.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshData}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] hover:bg-[#F1F7EF]"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </section>

      {/* DEPARTMENT SELECTOR */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
            <Building2 size={22} />
          </div>

          <div>
            <h2 className="font-bold text-[#234E43]">
              Current Department
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Select a department for frontend profile testing.
            </p>
          </div>
        </div>

        <select
          aria-label="Select HOD department"
          value={
            department
              ? selectedDepartmentId
              : ""
          }
          onChange={(event) =>
            changeDepartment(
              event.target.value
            )
          }
          disabled={
            data.departments.status !==
            "available"
          }
          className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] sm:w-72"
        >
          <option value="">
            Select Department
          </option>

          {departments.map((item) => (
            <option
              key={item.id}
              value={item.id}
            >
              {item.name}
            </option>
          ))}
        </select>
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

      {!department && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>
            Select an existing Admin Department to
            view or create its HOD demo profile.
          </p>
        </div>
      )}

      {/* PROFILE HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-6 text-white md:p-8">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border-[30px] border-white/5" />

        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-4 border-white/20 bg-[#D9A536] text-3xl font-extrabold text-[#234E43]">
            {initials(displayName)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D9A536]">
              HEAD OF DEPARTMENT
            </p>

            <h2 className="mt-2 break-words text-2xl font-extrabold md:text-3xl">
              {displayName}
            </h2>

            <p className="mt-2 text-sm text-[#D0E2D7]">
              {displayDesignation}
            </p>

            <p className="mt-2 flex items-center gap-2 text-sm text-[#D0E2D7]">
              <Building2 size={16} />

              {department?.name ||
                "Department not selected"}
            </p>
          </div>

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-[#F3E0A7]">
              {profileCompleted ? (
                <BadgeCheck size={16} />
              ) : (
                <AlertCircle size={16} />
              )}

              {profileCompleted
                ? "Profile Saved"
                : "Profile Not Completed"}
            </span>
          </div>
        </div>
      </section>

      {/* PROFILE + DEPARTMENT INFORMATION */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">

        {/* MAIN PROFILE */}
        <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#234E43]">
                Professional Profile
              </h2>

              <p className="mt-1 text-xs text-[#718579]">
                Personal and academic information
              </p>
            </div>

            {!editing ? (
              <button
                type="button"
                disabled={
                  !department ||
                  data.profiles.status ===
                    "invalid"
                }
                onClick={() => {
                  setEditing(true);
                  setError("");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              >
                <Edit3 size={16} />
                {profileCompleted
                  ? "Edit Profile"
                  : "Create Profile"}
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] px-4 py-2.5 text-sm font-bold text-[#234E43]"
              >
                <X size={16} />
                Cancel
              </button>
            )}
          </div>

          <form
            onSubmit={saveProfile}
            className="mt-6 space-y-7"
          >
            {/* PERSONAL INFORMATION */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <UserRound
                  size={20}
                  className="text-[#234E43]"
                />

                <h3 className="font-bold text-[#234E43]">
                  Personal Information
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileInput
                  label="Full Name *"
                  name="fullName"
                  value={form.fullName}
                  onChange={updateField}
                  disabled={!editing}
                  icon={UserRound}
                  placeholder="Enter your full name"
                  required
                />

                <ProfileInput
                  label="Employee ID *"
                  name="employeeId"
                  value={form.employeeId}
                  onChange={updateField}
                  disabled={!editing}
                  icon={IdCard}
                  placeholder="Enter employee ID"
                  required
                />

                <ProfileInput
                  label="Designation"
                  name="designation"
                  value={form.designation}
                  onChange={updateField}
                  disabled={!editing}
                  icon={BriefcaseBusiness}
                />

                <ProfileInput
                  label="Joining Date"
                  name="joiningDate"
                  type="date"
                  value={form.joiningDate}
                  onChange={updateField}
                  disabled={!editing}
                  icon={CalendarDays}
                />
              </div>
            </div>

            {/* CONTACT INFORMATION */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Mail
                  size={20}
                  className="text-[#234E43]"
                />

                <h3 className="font-bold text-[#234E43]">
                  Contact Information
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileInput
                  label="Email Address *"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  disabled={!editing}
                  icon={Mail}
                  placeholder="name@university.edu"
                  required
                />

                <ProfileInput
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateField}
                  disabled={!editing}
                  icon={Phone}
                  placeholder="Contact number"
                />

                <ProfileInput
                  label="Office Room"
                  name="officeRoom"
                  value={form.officeRoom}
                  onChange={updateField}
                  disabled={!editing}
                  icon={MapPin}
                  placeholder="Example: Room 405"
                />

                <ProfileInput
                  label="Office Hours"
                  name="officeHours"
                  value={form.officeHours}
                  onChange={updateField}
                  disabled={!editing}
                  icon={CalendarDays}
                  placeholder="Example: Sun–Thu, 10 AM–2 PM"
                />

                <div className="sm:col-span-2">
                  <ProfileInput
                    label="Professional Website"
                    name="website"
                    type="url"
                    value={form.website}
                    onChange={updateField}
                    disabled={!editing}
                    icon={Globe}
                    placeholder="https://example.com"
                    maxLength={300}
                  />
                </div>
              </div>
            </div>

            {/* ACADEMIC INFORMATION */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <GraduationCap
                  size={20}
                  className="text-[#234E43]"
                />

                <h3 className="font-bold text-[#234E43]">
                  Academic Background
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileInput
                  label="Highest Qualification"
                  name="qualification"
                  value={form.qualification}
                  onChange={updateField}
                  disabled={!editing}
                  icon={GraduationCap}
                  placeholder="Example: PhD in Computer Science"
                  maxLength={250}
                />

                <ProfileInput
                  label="Years of Experience"
                  name="experienceYears"
                  value={form.experienceYears}
                  onChange={updateField}
                  disabled={!editing}
                  icon={Award}
                  type="number"
                  min="0"
                  max="80"
                />

                <div className="sm:col-span-2">
                  <ProfileInput
                    label="Area of Specialization"
                    name="specialization"
                    value={form.specialization}
                    onChange={updateField}
                    disabled={!editing}
                    icon={BookOpen}
                    placeholder="Example: Artificial Intelligence"
                    maxLength={300}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Research Interests
                    </span>

                    <textarea
                      rows={3}
                      maxLength={1500}
                      value={form.researchInterests}
                      onChange={(event) =>
                        updateField(
                          "researchInterests",
                          event.target.value
                        )
                      }
                      disabled={!editing}
                      placeholder="Research areas, projects and interests..."
                      className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#A6C1A4] disabled:bg-[#F6F8F3]"
                    />
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                      Professional Biography
                    </span>

                    <textarea
                      rows={5}
                      maxLength={3000}
                      value={form.biography}
                      onChange={(event) =>
                        updateField(
                          "biography",
                          event.target.value
                        )
                      }
                      disabled={!editing}
                      placeholder="Write a short professional biography..."
                      className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#A6C1A4] disabled:bg-[#F6F8F3]"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* FORM ERROR */}
            {editing && error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
              >
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* SAVE ACTIONS */}
            {editing && (
              <div className="flex flex-wrap justify-end gap-3 border-t border-[#E2EADC] pt-5">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-xl border border-[#E2EADC] px-5 py-3 text-sm font-bold text-[#234E43]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-6 py-3 text-sm font-bold text-white"
                >
                  <Save size={17} />
                  Save Profile
                </button>
              </div>
            )}
          </form>
        </section>

        {/* SIDE INFORMATION */}
        <div className="space-y-6">

          {/* DEPARTMENT INFORMATION */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Building2
                size={21}
                className="text-[#234E43]"
              />

              <h2 className="font-bold text-[#234E43]">
                Department Information
              </h2>
            </div>

            <p className="mt-2 text-xs leading-6 text-[#718579]">
              Official department information from
              the Admin Portal.
            </p>

            <div className="mt-5 space-y-3">
              <InfoItem
                label="Department Name"
                value={department?.name}
                icon={Building2}
              />

              <InfoItem
                label="Department Code"
                value={department?.code}
                icon={IdCard}
              />

              <InfoItem
                label="Registered Department Head"
                value={department?.head}
                icon={UserRound}
              />

              <InfoItem
                label="Department Email"
                value={department?.email}
                icon={Mail}
              />

              <InfoItem
                label="Department Contact"
                value={department?.phone}
                icon={Phone}
              />
            </div>

            <div className="mt-5 rounded-xl bg-[#EAF2E8] p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={18}
                  className="text-[#234E43]"
                />

                <p className="text-sm font-bold text-[#234E43]">
                  Admin-Controlled Records
                </p>
              </div>

              <p className="mt-2 text-xs leading-6 text-[#607B6C]">
                Official department information cannot
                be changed here. The Admin Portal
                remains its source of truth.
              </p>
            </div>
          </section>

          {/* PROFILE INFORMATION */}
          <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText
                size={21}
                className="text-[#234E43]"
              />

              <h2 className="font-bold text-[#234E43]">
                Profile Information
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              <InfoItem
                label="Profile Status"
                value={
                  profileCompleted
                    ? "Saved"
                    : "Not Created"
                }
                icon={BadgeCheck}
              />

              <InfoItem
                label="Created On"
                value={formatDate(
                  savedProfile?.createdAt
                )}
                icon={CalendarDays}
              />

              <InfoItem
                label="Last Updated"
                value={formatDate(
                  savedProfile?.updatedAt
                )}
                icon={RefreshCw}
              />

              <InfoItem
                label="Assigned Role"
                value="Head of Department"
                icon={ShieldCheck}
              />
            </div>
          </section>
        </div>
      </div>

      {/* IMPORTANT NOTICE */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <AlertCircle
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> HOD profiles
          are stored in{" "}
          <code>unibee-hod-profiles-v1</code>,
          one demo profile per selected department.
          These records are not yet linked to
          authenticated user accounts. The department
          selector is for testing only. In the backend
          implementation, each profile will belong
          to a specific HOD user ID with verified
          department access.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Head of Department Portal —
        Profile Management
      </p>
    </div>
  );
}
