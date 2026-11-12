
import { useMemo, useRef, useState } from "react";
import {
  Settings,
  Building2,
  GraduationCap,
  Bell,
  ShieldCheck,
  Palette,
  Database,
  Info,
  Save,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Mail,
  Globe,
  MapPin,
  Phone,
  CalendarDays,
  Clock3,
  LockKeyhole,
  Eye,
  EyeOff,
  HardDrive,
  ChevronRight,
  Check,
} from "lucide-react";

const SETTINGS_KEY = "unibee-admin-settings-v1";

const DEFAULT_SETTINGS = {
  university: {
    name: "UniBee University",
    shortName: "UniBee",
    email: "info@unibee.example",
    phone: "+880 1700-000000",
    website: "https://unibee.example",
    address: "Dhaka, Bangladesh",
    description:
      "A modern university management platform for students, faculty, and administrators.",
  },
  academic: {
    currentSemester: "Fall 2026",
    academicYear: "2026-2027",
    gradingScale: "4.00",
    attendanceThreshold: 75,
    defaultCourseCapacity: 40,
    registrationOpen: true,
    resultPublicationEnabled: false,
  },
  notifications: {
    emailNotifications: true,
    academicUpdates: true,
    examinationAlerts: true,
    paymentReminders: true,
    libraryReminders: true,
    eventAnnouncements: true,
    systemAlerts: true,
  },
  security: {
    sessionTimeout: 30,
    requireStrongPassword: true,
    twoFactorRequired: false,
    loginAlerts: true,
    auditLogging: true,
  },
  appearance: {
    theme: "Bee & Sage",
    density: "Comfortable",
    sidebarCompact: false,
    showWelcomeMessage: true,
    animationsEnabled: true,
  },
};

const SEMESTERS = [
  "Spring 2026",
  "Summer 2026",
  "Fall 2026",
  "Spring 2027",
  "Summer 2027",
  "Fall 2027",
  "Spring 2028",
];

const TABS = [
  { id: "university", label: "University Profile", icon: Building2 },
  { id: "academic", label: "Academic Settings", icon: GraduationCap },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "data", label: "Data Management", icon: Database },
  { id: "about", label: "System Information", icon: Info },
];

const BACKUP_KEYS = [
  "unibee-admin-students-v1",
  "unibee-admin-faculty-v1",
  "unibee-admin-users-v1",
  "unibee-admin-departments-v1",
  "unibee-admin-courses-v1",
  "unibee-admin-enrollment-v1",
  "unibee-admin-attendance-v1",
  "unibee-admin-examinations-v1",
  "unibee-admin-results-v1",
  "unibee-admin-timetable-v1",
  "unibee-admin-notices-v1",
  "unibee-admin-finance-v1",
  "unibee-admin-library-books-v1",
  "unibee-admin-library-loans-v1",
  "unibee-admin-events-v1",
  "unibee-admin-event-registrations-v1",
  "unibee-admin-report-history-v1",
  SETTINGS_KEY,
];

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return cloneDefaults();

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return cloneDefaults();
    }

    return Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS).map(([section, values]) => [
        section,
        {
          ...values,
          ...(parsed[section] &&
          typeof parsed[section] === "object" &&
          !Array.isArray(parsed[section])
            ? Object.fromEntries(
                Object.keys(values)
                  .filter((key) =>
                    Object.prototype.hasOwnProperty.call(
                      parsed[section],
                      key
                    )
                  )
                  .map((key) => [key, parsed[section][key]])
              )
            : {}),
        },
      ])
    );
  } catch {
    return cloneDefaults();
  }
}

function localTimestamp() {
  return new Date().toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  hint = "",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#234E43]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#234E43] focus:ring-2 focus:ring-[#A6C1A4]/20"
      />

      {hint && (
        <span className="mt-1.5 block text-xs text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

function SelectField({ label, value, onChange, options, hint = "" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#234E43]">
        {label}
      </span>

      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#234E43]"
      >
        {options.map((option) => {
          const value =
            typeof option === "string" ? option : option.value;

          const text =
            typeof option === "string" ? option : option.label;

          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>

      {hint && (
        <span className="mt-1.5 block text-xs text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

function ToggleSetting({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 py-5 last:border-0">
      <div className="max-w-lg">
        <p className="text-sm font-semibold text-[#234E43]">
          {title}
        </p>

        <p className="mt-1 text-xs leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-[#234E43]" : "bg-slate-300"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function PanelTitle({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
      <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
        <Icon size={22} />
      </div>

      <div>
        <h2 className="text-xl font-bold text-[#234E43]">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-4 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>

      <span className="break-words text-right text-sm font-semibold text-[#234E43]">
        {value}
      </span>
    </div>
  );
}

export default function AdminSettings() {
  const [settings, setSettings] = useState(loadSettings);
  const [savedSettings, setSavedSettings] = useState(loadSettings);
  const [activeTab, setActiveTab] = useState("university");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [showBackupPreview, setShowBackupPreview] = useState(false);
  const [backupCount, setBackupCount] = useState(0);
  const fileInputRef = useRef(null);

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings]
  );

  function updateSetting(section, field, value) {
    setSettings((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        [field]: value,
      },
    }));

    setFeedback("");
    setError("");
  }

  function saveSettings() {
    const university = settings.university;
    const academic = settings.academic;

    if (
      !university.name.trim() ||
      !university.shortName.trim() ||
      !university.email.trim()
    ) {
      setError(
        "University name, short name and email are required."
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(university.email)
    ) {
      setError("Enter a valid university email address.");
      return;
    }

    if (
      !Number.isInteger(Number(academic.attendanceThreshold)) ||
      Number(academic.attendanceThreshold) < 0 ||
      Number(academic.attendanceThreshold) > 100
    ) {
      setError(
        "Attendance threshold must be between 0 and 100."
      );
      return;
    }

    if (
      !Number.isInteger(Number(academic.defaultCourseCapacity)) ||
      Number(academic.defaultCourseCapacity) < 1 ||
      Number(academic.defaultCourseCapacity) > 1000
    ) {
      setError(
        "Default course capacity must be between 1 and 1000."
      );
      return;
    }

    const clean = {
      ...settings,
      university: {
        ...settings.university,
        name: university.name.trim(),
        shortName: university.shortName.trim(),
        email: university.email.trim(),
        address: university.address.trim(),
        description: university.description.trim(),
      },
      academic: {
        ...academic,
        attendanceThreshold: Number(
          academic.attendanceThreshold
        ),
        defaultCourseCapacity: Number(
          academic.defaultCourseCapacity
        ),
      },
    };

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(clean)
      );

      setSettings(clean);
      setSavedSettings(clean);
      setFeedback("Settings saved in this browser.");
      setError("");
    } catch {
      setError("Unable to save settings in browser storage.");
    }
  }

  function discardChanges() {
    if (!isDirty) return;

    if (!window.confirm("Discard unsaved settings changes?")) {
      return;
    }

    setSettings(
      JSON.parse(JSON.stringify(savedSettings))
    );
    setFeedback("Unsaved changes discarded.");
    setError("");
  }

  function resetSettings() {
    if (
      !window.confirm(
        "Restore default system settings? This will replace saved custom settings."
      )
    ) {
      return;
    }

    const defaults = cloneDefaults();

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(defaults)
      );

      setSettings(defaults);
      setSavedSettings(defaults);
      setFeedback("Default settings restored.");
      setError("");
    } catch {
      setError("Unable to restore default settings.");
    }
  }

  function buildBackup() {
    const data = {};

    BACKUP_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);

      if (raw !== null) {
        try {
          // Store parsed data instead of raw JSON strings.
          data[key] = JSON.parse(raw);
        } catch {
          // Ignore malformed local data.
        }
      }
    });

    return {
      format: "UniBee-Admin-LocalBackup",
      version: 1,
      exportedAt: new Date().toISOString(),
      modules: data,
    };
  }

  function downloadBackup() {
    try {
      const backup = buildBackup();

      const json = JSON.stringify(backup, null, 2);
      const url = URL.createObjectURL(
        new Blob([json], {
          type: "application/json;charset=utf-8",
        })
      );

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `UniBee_Admin_Backup_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setBackupCount(Object.keys(backup.modules).length);
      setFeedback(
        "Local demo backup exported successfully."
      );
      setError("");
    } catch {
      setError("Unable to export local backup.");
    }
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(
          "Backup file is too large. Maximum supported size is 5 MB."
        );
      }

      const content = await file.text();
      const parsed = JSON.parse(content);

      if (
        parsed?.format !== "UniBee-Admin-LocalBackup" ||
        parsed?.version !== 1 ||
        !parsed.modules ||
        typeof parsed.modules !== "object" ||
        Array.isArray(parsed.modules)
      ) {
        throw new Error("Invalid UniBee backup format.");
      }

      const entries = Object.entries(parsed.modules);

      if (!entries.length) {
        throw new Error("Backup contains no module data.");
      }

      const invalidKey = entries.find(
        ([key]) => !BACKUP_KEYS.includes(key)
      );

      if (invalidKey) {
        throw new Error(
          "Backup contains an unsupported module key."
        );
      }

      for (const [key, value] of entries) {
        if (key === SETTINGS_KEY) {
          if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value) ||
            !value.university ||
            !value.academic
          ) {
            throw new Error(
              "Backup contains invalid settings."
            );
          }
        } else if (!Array.isArray(value)) {
          throw new Error(
            `Invalid records for ${key}.`
          );
        }
      }

      if (
        !window.confirm(
          `Restore ${entries.length} modules from this backup? Matching browser records will be overwritten.`
        )
      ) {
        return;
      }

      // Keep previous values for rollback on storage failure.
      const previous = Object.fromEntries(
        entries.map(([key]) => [
          key,
          localStorage.getItem(key),
        ])
      );

      try {
        for (const [key, value] of entries) {
          localStorage.setItem(
            key,
            JSON.stringify(value)
          );
        }
      } catch {
        for (const [key, original] of Object.entries(previous)) {
          try {
            if (original === null) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, original);
            }
          } catch {
            // Browser storage can fail independently.
          }
        }

        throw new Error(
          "Import failed. Previous values were restored where possible."
        );
      }

      const current = loadSettings();
      setSettings(current);
      setSavedSettings(current);

      setFeedback(
        `Backup imported: ${entries.length} module(s). Reload other Admin pages to see restored data.`
      );
      setError("");
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Unable to import backup."
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function previewBackup() {
    const backup = buildBackup();
    setBackupCount(Object.keys(backup.modules).length);
    setShowBackupPreview(true);
  }

  const university = settings.university;
  const academic = settings.academic;
  const notifications = settings.notifications;
  const security = settings.security;
  const appearance = settings.appearance;

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            System Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            System Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage university preferences, academic defaults,
            and local demo configuration.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={discardChanges}
            disabled={!isDirty}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-40"
          >
            <RotateCcw size={17} />
            Discard
          </button>

          <button
            type="button"
            onClick={saveSettings}
            disabled={!isDirty}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save size={17} />
            Save Settings
          </button>
        </div>
      </section>

      {isDirty && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          <AlertCircle size={18} />
          You have unsaved changes.
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </p>
      )}

      {/* SETTINGS LAYOUT */}
      <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* SIDEBAR */}
        <aside className="rounded-2xl border border-[#234E43]/10 bg-white p-3 shadow-sm">
          <p className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Settings Sections
          </p>

          <nav className="space-y-1" aria-label="Settings sections">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setFeedback("");
                  setError("");
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                  activeTab === id
                    ? "bg-[#234E43] text-white"
                    : "text-slate-600 hover:bg-[#F6F8F3]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} />
                  {label}
                </span>

                <ChevronRight size={15} />
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-w-0 rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm md:p-7">
          {/* UNIVERSITY PROFILE */}
          {activeTab === "university" && (
            <div>
              <PanelTitle
                icon={Building2}
                title="University Profile"
                description="Basic information about your university."
              />

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <TextField
                  label="University Name *"
                  value={university.name}
                  required
                  onChange={(e) =>
                    updateSetting(
                      "university",
                      "name",
                      e.target.value
                    )
                  }
                />

                <TextField
                  label="Short Name *"
                  value={university.shortName}
                  required
                  onChange={(e) =>
                    updateSetting(
                      "university",
                      "shortName",
                      e.target.value
                    )
                  }
                />

                <TextField
                  label="Official Email *"
                  type="email"
                  value={university.email}
                  required
                  onChange={(e) =>
                    updateSetting(
                      "university",
                      "email",
                      e.target.value
                    )
                  }
                />

                <TextField
                  label="Contact Number"
                  value={university.phone}
                  onChange={(e) =>
                    updateSetting(
                      "university",
                      "phone",
                      e.target.value
                    )
                  }
                />

                <TextField
                  label="Website"
                  type="url"
                  value={university.website}
                  onChange={(e) =>
                    updateSetting(
                      "university",
                      "website",
                      e.target.value
                    )
                  }
                />

                <TextField
                  label="Location / Address"
                  value={university.address}
                  onChange={(e) =>
                    updateSetting(
                      "university",
                      "address",
                      e.target.value
                    )
                  }
                />
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                  University Description
                </span>

                <textarea
                  rows={5}
                  maxLength={2000}
                  value={university.description}
                  onChange={(e) =>
                    updateSetting(
                      "university",
                      "description",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-[#234E43]"
                />
              </label>

              <div className="mt-6 rounded-xl bg-[#F6F8F3] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#B18A28]">
                  Profile Preview
                </p>

                <h3 className="mt-3 text-xl font-bold text-[#234E43]">
                  {university.name || "University Name"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {university.description}
                </p>

                <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                  <p className="flex items-center gap-2">
                    <Mail size={16} />
                    {university.email}
                  </p>

                  <p className="flex items-center gap-2">
                    <Phone size={16} />
                    {university.phone}
                  </p>

                  <p className="flex items-center gap-2">
                    <Globe size={16} />
                    {university.website}
                  </p>

                  <p className="flex items-center gap-2">
                    <MapPin size={16} />
                    {university.address}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ACADEMIC SETTINGS */}
          {activeTab === "academic" && (
            <div>
              <PanelTitle
                icon={GraduationCap}
                title="Academic Settings"
                description="Configure academic defaults for the frontend demo."
              />

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Current Semester"
                  value={academic.currentSemester}
                  options={SEMESTERS}
                  onChange={(e) =>
                    updateSetting(
                      "academic",
                      "currentSemester",
                      e.target.value
                    )
                  }
                />

                <TextField
                  label="Academic Year"
                  value={academic.academicYear}
                  onChange={(e) =>
                    updateSetting(
                      "academic",
                      "academicYear",
                      e.target.value
                    )
                  }
                  placeholder="2026-2027"
                />

                <SelectField
                  label="Grading Scale"
                  value={academic.gradingScale}
                  options={[
                    { value: "4.00", label: "4.00 Scale" },
                    { value: "5.00", label: "5.00 Scale" },
                    { value: "100", label: "Percentage Scale" },
                  ]}
                  onChange={(e) =>
                    updateSetting(
                      "academic",
                      "gradingScale",
                      e.target.value
                    )
                  }
                  hint="Demo preference only. Result calculation still uses its existing scale."
                />

                <TextField
                  label="Minimum Attendance (%)"
                  type="number"
                  value={academic.attendanceThreshold}
                  onChange={(e) =>
                    updateSetting(
                      "academic",
                      "attendanceThreshold",
                      e.target.value
                    )
                  }
                />

                <TextField
                  label="Default Course Capacity"
                  type="number"
                  value={academic.defaultCourseCapacity}
                  onChange={(e) =>
                    updateSetting(
                      "academic",
                      "defaultCourseCapacity",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="mt-6">
                <ToggleSetting
                  title="Course Registration Open"
                  description="Demo preference for whether course registration is enabled. Enrollment page enforcement is not connected yet."
                  checked={academic.registrationOpen}
                  onChange={(value) =>
                    updateSetting(
                      "academic",
                      "registrationOpen",
                      value
                    )
                  }
                />

                <ToggleSetting
                  title="Result Publication Enabled"
                  description="Demo preference for academic result publication. Does not currently control the Results page."
                  checked={academic.resultPublicationEnabled}
                  onChange={(value) =>
                    updateSetting(
                      "academic",
                      "resultPublicationEnabled",
                      value
                    )
                  }
                />
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div>
              <PanelTitle
                icon={Bell}
                title="Notification Preferences"
                description="Choose which notification categories should be enabled in the future."
              />

              <div className="mt-5">
                {[
                  [
                    "emailNotifications",
                    "Email Notifications",
                    "Allow email notification preference for the university system.",
                  ],
                  [
                    "academicUpdates",
                    "Academic Updates",
                    "Notifications about academic schedules and courses.",
                  ],
                  [
                    "examinationAlerts",
                    "Examination Alerts",
                    "Alerts for examination schedules and changes.",
                  ],
                  [
                    "paymentReminders",
                    "Payment Reminders",
                    "Reminders about tuition and outstanding balances.",
                  ],
                  [
                    "libraryReminders",
                    "Library Reminders",
                    "Notifications about borrowed books and due dates.",
                  ],
                  [
                    "eventAnnouncements",
                    "Event Announcements",
                    "Alerts for campus events and activities.",
                  ],
                  [
                    "systemAlerts",
                    "System Alerts",
                    "Administrative and system status notifications.",
                  ],
                ].map(([key, title, description]) => (
                  <ToggleSetting
                    key={key}
                    title={title}
                    description={description}
                    checked={notifications[key]}
                    onChange={(value) =>
                      updateSetting(
                        "notifications",
                        key,
                        value
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === "security" && (
            <div>
              <PanelTitle
                icon={ShieldCheck}
                title="Security Preferences"
                description="Illustrative security policies for future backend integration."
              />

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <strong>Demo Only:</strong> These switches do not enable
                authentication, MFA, audit logging, or server-side
                security controls.
              </div>

              <div className="mt-6">
                <SelectField
                  label="Preferred Session Timeout"
                  value={String(security.sessionTimeout)}
                  options={[
                    { value: "15", label: "15 minutes" },
                    { value: "30", label: "30 minutes" },
                    { value: "60", label: "60 minutes" },
                    { value: "120", label: "120 minutes" },
                  ]}
                  onChange={(e) =>
                    updateSetting(
                      "security",
                      "sessionTimeout",
                      Number(e.target.value)
                    )
                  }
                />

                <div className="mt-5">
                  {[
                    [
                      "requireStrongPassword",
                      "Strong Password Policy",
                      "Preference to require stronger passwords in a future authentication service.",
                    ],
                    [
                      "twoFactorRequired",
                      "Two-Factor Authentication",
                      "Preference for additional authentication verification.",
                    ],
                    [
                      "loginAlerts",
                      "Login Alerts",
                      "Preference to alert users about login activity.",
                    ],
                    [
                      "auditLogging",
                      "Audit Logging",
                      "Preference to record administrative activity in a future server-side audit log.",
                    ],
                  ].map(([key, title, description]) => (
                    <ToggleSetting
                      key={key}
                      title={title}
                      description={description}
                      checked={security[key]}
                      onChange={(value) =>
                        updateSetting("security", key, value)
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE */}
          {activeTab === "appearance" && (
            <div>
              <PanelTitle
                icon={Palette}
                title="Appearance"
                description="Choose your preferred UniBee visual settings."
              />

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Theme Preference"
                  value={appearance.theme}
                  options={[
                    "Bee & Sage",
                    "Classic Green",
                    "Light Minimal",
                  ]}
                  onChange={(e) =>
                    updateSetting(
                      "appearance",
                      "theme",
                      e.target.value
                    )
                  }
                  hint="Theme selection is a stored preference. Global CSS is not modified yet."
                />

                <SelectField
                  label="Layout Density"
                  value={appearance.density}
                  options={[
                    "Comfortable",
                    "Compact",
                    "Spacious",
                  ]}
                  onChange={(e) =>
                    updateSetting(
                      "appearance",
                      "density",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="mt-6">
                <ToggleSetting
                  title="Compact Sidebar"
                  description="Preference for a smaller navigation sidebar."
                  checked={appearance.sidebarCompact}
                  onChange={(value) =>
                    updateSetting(
                      "appearance",
                      "sidebarCompact",
                      value
                    )
                  }
                />

                <ToggleSetting
                  title="Show Welcome Message"
                  description="Preference to display introductory dashboard messages."
                  checked={appearance.showWelcomeMessage}
                  onChange={(value) =>
                    updateSetting(
                      "appearance",
                      "showWelcomeMessage",
                      value
                    )
                  }
                />

                <ToggleSetting
                  title="Enable Animations"
                  description="Preference for motion and transition effects."
                  checked={appearance.animationsEnabled}
                  onChange={(value) =>
                    updateSetting(
                      "appearance",
                      "animationsEnabled",
                      value
                    )
                  }
                />
              </div>

              <div className="mt-6 rounded-xl bg-[#F6F8F3] p-5">
                <p className="text-sm font-bold text-[#234E43]">
                  Bee & Sage Color Palette
                </p>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    ["Forest", "#234E43"],
                    ["Sage", "#A6C1A4"],
                    ["Gold", "#D9A536"],
                  ].map(([label, color]) => (
                    <div key={label}>
                      <div
                        className="h-16 rounded-xl border border-black/5"
                        style={{ backgroundColor: color }}
                      />

                      <p className="mt-2 text-xs font-semibold text-[#234E43]">
                        {label}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        {color}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DATA MANAGEMENT */}
          {activeTab === "data" && (
            <div>
              <PanelTitle
                icon={Database}
                title="Data Management"
                description="Export or restore your local UniBee Admin demonstration data."
              />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-5">
                  <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43] w-fit">
                    <Download size={22} />
                  </div>

                  <h3 className="mt-4 font-bold text-[#234E43]">
                    Export Backup
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    Save supported Admin module records and settings
                    to a JSON file on your computer.
                  </p>

                  <button
                    type="button"
                    onClick={downloadBackup}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
                  >
                    <Download size={17} />
                    Download Backup
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 p-5">
                  <div className="w-fit rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
                    <Upload size={22} />
                  </div>

                  <h3 className="mt-4 font-bold text-[#234E43]">
                    Restore Backup
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    Import a previously exported UniBee Admin JSON backup.
                    Matching browser records will be overwritten.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={importBackup}
                    className="hidden"
                    aria-label="Choose UniBee backup file"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#234E43]/25 px-4 py-3 text-sm font-semibold text-[#234E43]"
                  >
                    <Upload size={17} />
                    Choose Backup File
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                <strong>Important:</strong> Backup and restore
                affect only the supported Admin LocalStorage keys.
                They do not include actual server databases,
                user passwords, or uploaded files. Keep exported
                JSON files private because they may contain
                information entered into the demo.
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#F6F8F3] p-5">
                <div>
                  <h3 className="text-sm font-bold text-[#234E43]">
                    Backup Contents
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Preview how many supported Admin modules currently
                    have saved records.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={previewBackup}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[#234E43]"
                >
                  <Eye size={16} />
                  Preview Backup
                </button>
              </div>

              {showBackupPreview && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[#234E43]">
                      Backup Preview
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setShowBackupPreview(false)
                      }
                      aria-label="Close backup preview"
                    >
                      <EyeOff size={18} />
                    </button>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    {backupCount} saved module(s) will be included.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {BACKUP_KEYS.filter(
                      (key) =>
                        localStorage.getItem(key) !== null
                    ).map((key) => (
                      <span
                        key={key}
                        className="rounded-lg bg-[#F6F8F3] px-3 py-2 text-xs text-[#234E43]"
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-7 border-t border-slate-100 pt-6">
                <h3 className="font-bold text-rose-700">
                  Reset Settings
                </h3>

                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Restore default University, Academic, Notification,
                  Security and Appearance settings. Other Admin module
                  records will not be deleted.
                </p>

                <button
                  type="button"
                  onClick={resetSettings}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <RotateCcw size={17} />
                  Restore Default Settings
                </button>
              </div>
            </div>
          )}

          {/* SYSTEM INFORMATION */}
          {activeTab === "about" && (
            <div>
              <PanelTitle
                icon={Info}
                title="System Information"
                description="Information about the UniBee frontend demonstration."
              />

              <div className="mt-6 rounded-2xl bg-[#234E43] p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D9A536] text-xl font-black text-[#234E43]">
                    B
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">
                      UniBee
                    </h3>

                    <p className="text-sm text-white/70">
                      University Management System
                    </p>
                  </div>
                </div>

                <p className="mt-5 max-w-lg text-sm leading-7 text-white/75">
                  A frontend demonstration for managing university
                  academic activities, students, faculty, administration
                  and campus operations.
                </p>
              </div>

              <div className="mt-5">
                <InfoRow
                  label="Application"
                  value="UniBee University Management System"
                />

                <InfoRow
                  label="Build Stage"
                  value="Frontend Development"
                />

                <InfoRow
                  label="Frontend Framework"
                  value="React + Vite"
                />

                <InfoRow
                  label="Styling"
                  value="Tailwind CSS"
                />

                <InfoRow
                  label="Icons"
                  value="Lucide React"
                />

                <InfoRow
                  label="Demo Data Storage"
                  value="Browser LocalStorage"
                />

                <InfoRow
                  label="Authentication"
                  value="Not yet integrated"
                />

                <InfoRow
                  label="Backend"
                  value="Not yet connected"
                />

                <InfoRow
                  label="Database"
                  value="Not yet connected"
                />

                <InfoRow
                  label="Current Theme"
                  value={appearance.theme}
                />
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-4">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-[#234E43]"
                />

                <p className="text-xs leading-6 text-slate-600">
                  Student, Faculty and Admin frontend modules
                  are being developed as separate interfaces.
                  Their shared data synchronization, authentication
                  and backend services will be added later.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FOOTER */}
      <p className="text-center text-xs text-slate-400">
        UniBee Admin Settings · Frontend Demo
      </p>
    </div>
  );
}
