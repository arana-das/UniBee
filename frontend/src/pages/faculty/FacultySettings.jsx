
import { useState } from "react";
import {
  Settings,
  Bell,
  ShieldCheck,
  Palette,
  Globe,
  GraduationCap,
  Mail,
  MessageSquare,
  CalendarDays,
  FileText,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Clock3,
  LockKeyhole,
  Info,
} from "lucide-react";

const STORAGE_KEY = "unibee-faculty-settings-v1";

const DEFAULT_SETTINGS = {
  emailNotifications: true,
  messageNotifications: true,
  assignmentNotifications: true,
  scheduleReminders: true,
  announcementNotifications: true,

  profileVisibility: "University Members",
  showEmail: true,
  showPhone: false,

  appearance: "Light",
  language: "English",
  timezone: "Asia/Dhaka",

  defaultCourse: "CSE 321",
  attendanceReminder: true,
  gradingReminder: true,
  defaultDashboard: "Overview",
};

const COURSES = [
  {
    code: "CSE 321",
    name: "Database Management Systems",
  },
  {
    code: "CSE 331",
    name: "Software Engineering",
  },
  {
    code: "CSE 351",
    name: "Computer Networks",
  },
  {
    code: "CSE 221",
    name: "Data Structures and Algorithms",
  },
  {
    code: "CSE 411",
    name: "Artificial Intelligence",
  },
];

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ...DEFAULT_SETTINGS };
    }

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
        <Icon size={21} />
      </div>

      <div>
        <h2 className="text-lg font-bold text-[#234E43]">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function ToggleSetting({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 text-[#234E43]">
          <Icon size={19} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#234E43]" : "bg-slate-300"
        }`}
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

function SelectSetting({
  label,
  description,
  value,
  onChange,
  options,
}) {
  return (
    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-center">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">
          {label}
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43] sm:w-56"
      >
        {options.map((option) => {
          const item =
            typeof option === "string"
              ? { value: option, label: option }
              : option;

          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export default function FacultySettings() {
  const [settings, setSettings] = useState(loadSettings);
  const [savedSettings, setSavedSettings] = useState(loadSettings);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const hasChanges =
    JSON.stringify(settings) !== JSON.stringify(savedSettings);

  function updateSetting(key, value) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setFeedback("");
    setError("");
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );

      setSavedSettings({ ...settings });
      setFeedback("Faculty preferences saved successfully.");
      setError("");
    } catch {
      setError(
        "Unable to save settings. Check your browser storage."
      );
    }
  }

  function discardChanges() {
    setSettings({ ...savedSettings });
    setFeedback("Unsaved changes discarded.");
    setError("");
  }

  function resetSettings() {
    const confirmed = window.confirm(
      "Reset all faculty preferences to their default values?"
    );

    if (!confirmed) return;

    try {
      const defaults = { ...DEFAULT_SETTINGS };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(defaults)
      );

      setSettings(defaults);
      setSavedSettings(defaults);
      setFeedback("Default settings restored.");
      setError("");
    } catch {
      setError("Could not restore default settings.");
    }
  }

  return (
    <div className="space-y-7">

      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Faculty Account
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Settings & Preferences
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Customize your faculty workspace,
            notifications, privacy, and academic preferences.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-[#A6C1A4]/25 px-4 py-3 text-sm font-semibold text-[#234E43]">
          <Settings size={19} />
          Faculty Preferences
        </div>
      </section>

      {/* SAVE STATUS */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-bold text-[#234E43]">
            Your Preferences
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {hasChanges
              ? "You have unsaved changes."
              : "Your current preferences are up to date."}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            hasChanges
              ? "bg-amber-50 text-amber-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {hasChanges ? "Unsaved Changes" : "No Pending Changes"}
        </span>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">

        {/* NOTIFICATIONS */}
        <section className="rounded-2xl border border-[#234E43]/10 bg-white p-6 shadow-sm">
          <SectionHeader
            icon={Bell}
            title="Notification Preferences"
            description="Choose which academic activities should generate notifications."
          />

          <ToggleSetting
            icon={Mail}
            title="Email Notifications"
            description="Receive academic notifications by email when supported."
            checked={settings.emailNotifications}
            onChange={(value) =>
              updateSetting("emailNotifications", value)
            }
          />

          <ToggleSetting
            icon={MessageSquare}
            title="New Message Alerts"
            description="Notifications for new student messages."
            checked={settings.messageNotifications}
            onChange={(value) =>
              updateSetting("messageNotifications", value)
            }
          />

          <ToggleSetting
            icon={FileText}
            title="Assignment Notifications"
            description="Updates about assignments and submissions."
            checked={settings.assignmentNotifications}
            onChange={(value) =>
              updateSetting("assignmentNotifications", value)
            }
          />

          <ToggleSetting
            icon={CalendarDays}
            title="Class Schedule Reminders"
            description="Reminders about upcoming teaching sessions."
            checked={settings.scheduleReminders}
            onChange={(value) =>
              updateSetting("scheduleReminders", value)
            }
          />

          <ToggleSetting
            icon={Bell}
            title="Academic Announcements"
            description="Notifications for new academic notices."
            checked={settings.announcementNotifications}
            onChange={(value) =>
              updateSetting("announcementNotifications", value)
            }
          />
        </section>

        {/* PRIVACY */}
        <section className="rounded-2xl border border-[#234E43]/10 bg-white p-6 shadow-sm">
          <SectionHeader
            icon={ShieldCheck}
            title="Privacy & Security"
            description="Manage demo profile visibility and contact preferences."
          />

          <SelectSetting
            label="Profile Visibility"
            description="Preferred audience for your faculty profile."
            value={settings.profileVisibility}
            onChange={(value) =>
              updateSetting("profileVisibility", value)
            }
            options={[
              "University Members",
              "Students in My Courses",
              "Private",
            ]}
          />

          <ToggleSetting
            icon={Eye}
            title="Show Email Address"
            description="Allow your email to appear in your profile."
            checked={settings.showEmail}
            onChange={(value) =>
              updateSetting("showEmail", value)
            }
          />

          <ToggleSetting
            icon={LockKeyhole}
            title="Show Phone Number"
            description="Allow your phone number to appear in your profile."
            checked={settings.showPhone}
            onChange={(value) =>
              updateSetting("showPhone", value)
            }
          />

          <div className="mt-6 rounded-xl bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <Info size={17} />
              Security Notice
            </div>

            <p className="mt-2 text-xs leading-6 text-amber-900">
              These are local frontend preferences only.
              They do not enforce profile access restrictions
              or change account security. Authentication and
              real privacy controls will require backend support.
            </p>
          </div>
        </section>

        {/* APPEARANCE */}
        <section className="rounded-2xl border border-[#234E43]/10 bg-white p-6 shadow-sm">
          <SectionHeader
            icon={Palette}
            title="Appearance & Localization"
            description="Choose your preferred display and regional settings."
          />

          <SelectSetting
            label="Appearance"
            description="Preferred application color mode."
            value={settings.appearance}
            onChange={(value) =>
              updateSetting("appearance", value)
            }
            options={["Light", "Dark", "System"]}
          />

          <SelectSetting
            label="Language"
            description="Preferred interface language."
            value={settings.language}
            onChange={(value) =>
              updateSetting("language", value)
            }
            options={["English", "Bangla"]}
          />

          <SelectSetting
            label="Timezone"
            description="Preferred timezone for academic activities."
            value={settings.timezone}
            onChange={(value) =>
              updateSetting("timezone", value)
            }
            options={[
              {
                value: "Asia/Dhaka",
                label: "Dhaka (UTC+06:00)",
              },
              {
                value: "Asia/Kolkata",
                label: "Kolkata (UTC+05:30)",
              },
              {
                value: "Asia/Dubai",
                label: "Dubai (UTC+04:00)",
              },
              {
                value: "Europe/London",
                label: "London",
              },
              {
                value: "Pacific/Auckland",
                label: "Auckland",
              },
            ]}
          />

          <p className="mt-5 rounded-xl bg-[#F6F8F3] p-4 text-xs leading-6 text-slate-600">
            <Globe size={16} className="mb-2 text-[#234E43]" />
            Display preferences are stored for future
            implementation. Changing language, timezone,
            or appearance here does not yet update all pages.
          </p>
        </section>

        {/* ACADEMIC */}
        <section className="rounded-2xl border border-[#234E43]/10 bg-white p-6 shadow-sm">
          <SectionHeader
            icon={GraduationCap}
            title="Academic Preferences"
            description="Set defaults for your teaching workflow."
          />

          <SelectSetting
            label="Default Course"
            description="Preferred course when opening academic tools."
            value={settings.defaultCourse}
            onChange={(value) =>
              updateSetting("defaultCourse", value)
            }
            options={COURSES.map((course) => ({
              value: course.code,
              label: `${course.code} — ${course.name}`,
            }))}
          />

          <SelectSetting
            label="Dashboard Starting View"
            description="Choose the preferred overview section."
            value={settings.defaultDashboard}
            onChange={(value) =>
              updateSetting("defaultDashboard", value)
            }
            options={[
              "Overview",
              "Today's Classes",
              "Recent Activity",
            ]}
          />

          <ToggleSetting
            icon={Clock3}
            title="Attendance Reminders"
            description="Preference for attendance-taking reminders."
            checked={settings.attendanceReminder}
            onChange={(value) =>
              updateSetting("attendanceReminder", value)
            }
          />

          <ToggleSetting
            icon={FileText}
            title="Grading Reminders"
            description="Preference for pending assessment reminders."
            checked={settings.gradingReminder}
            onChange={(value) =>
              updateSetting("gradingReminder", value)
            }
          />
        </section>
      </div>

      {/* ACTIONS */}
      <section className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-[#234E43]">
              Save Your Preferences
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Settings will be saved in this browser.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetSettings}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw size={17} />
              Restore Defaults
            </button>

            <button
              type="button"
              onClick={discardChanges}
              disabled={!hasChanges}
              className="rounded-xl border border-[#234E43]/20 px-4 py-3 text-sm font-semibold text-[#234E43] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Discard Changes
            </button>

            <button
              type="button"
              onClick={saveSettings}
              disabled={!hasChanges}
              className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193B33] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save size={17} />
              Save Settings
            </button>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* DEMO NOTICE */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <strong>Frontend Demo:</strong> Preferences are saved
        locally in this browser. Actual notifications,
        access restrictions, authentication settings,
        dark mode, and language switching are not yet active.
      </div>

      <p className="text-center text-xs text-slate-400">
        UniBee Faculty Settings · Frontend Demo
      </p>
    </div>
  );
}
