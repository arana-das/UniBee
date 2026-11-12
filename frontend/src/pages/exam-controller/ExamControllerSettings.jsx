
import { useEffect, useState } from "react";
import {
  Settings,
  Bell,
  Palette,
  ShieldCheck,
  ClipboardList,
  Save,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertCircle,
  Info,
  Monitor,
  Eye,
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  GraduationCap,
  Database,
  Volume2,
  Clock3,
  FileText,
  LockKeyhole,
  SlidersHorizontal,
  Check,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const SETTINGS_KEY =
  "unibee-exam-controller-settings-v1";

const EXAM_CONTROLLER_DATA_KEYS = {
  examinations: "unibee-exam-controller-exams-v1",
  schedules: "unibee-exam-controller-schedule-v1",
  registrations: "unibee-exam-controller-registration-v1",
  admitCards: "unibee-exam-controller-admit-cards-v1",
  seatPlans: "unibee-exam-controller-seat-plans-v1",
  invigilation: "unibee-exam-controller-invigilation-v1",
  marks: "unibee-exam-controller-marks-v1",
  results: "unibee-exam-controller-results-v1",
  notices: "unibee-exam-controller-notices-v1",
  profile: "unibee-exam-controller-profile-v1",
};

const DEFAULT_SETTINGS = {
  examNotifications: true,
  scheduleNotifications: true,
  registrationNotifications: true,
  marksNotifications: true,
  resultNotifications: true,
  noticeNotifications: true,

  theme: "bee-sage",
  density: "comfortable",
  textSize: "normal",
  reducedMotion: false,

  defaultLandingPage: "dashboard",
  confirmDestructiveActions: true,
  showWorkflowGuidance: true,
  defaultRecordsPerPage: "10",
};

const INPUT =
  "w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43] focus:ring-2 focus:ring-[#234E43]/10";

// ========================================
// HELPERS
// ========================================

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);

    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ...DEFAULT_SETTINGS };
    }

    const valid = {};

    for (const [key, defaultValue] of Object.entries(
      DEFAULT_SETTINGS
    )) {
      const savedValue = parsed[key];

      valid[key] =
        typeof savedValue === typeof defaultValue
          ? savedValue
          : defaultValue;
    }

    return {
      ...DEFAULT_SETTINGS,
      ...valid,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function readDataForExport() {
  const result = {};
  const errors = [];

  for (const [name, key] of Object.entries(
    EXAM_CONTROLLER_DATA_KEYS
  )) {
    try {
      const raw = localStorage.getItem(key);

      result[name] = raw ? JSON.parse(raw) : null;
    } catch {
      result[name] = null;
      errors.push(name);
    }
  }

  return { result, errors };
}

function downloadJSON(filename, data) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    {
      type: "application/json;charset=utf-8",
    }
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// ========================================
// REUSABLE COMPONENTS
// ========================================

function SectionHeader({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="shrink-0 rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
        <Icon size={21} />
      </div>

      <div>
        <h2 className="text-lg font-extrabold text-[#234E43]">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-6 text-[#718579]">
          {description}
        </p>
      </div>
    </div>
  );
}

function SettingToggle({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#E2EADC] py-4 last:border-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="shrink-0 rounded-xl bg-[#F6F8F3] p-2.5 text-[#234E43]">
          <Icon size={19} />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[#234E43]">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-[#718579]">
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
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A536] ${
          checked ? "bg-[#234E43]" : "bg-[#CBD5CB]"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "left-1 translate-x-5" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function SelectSetting({
  label,
  description,
  icon: Icon,
  value,
  onChange,
  options,
}) {
  return (
    <div className="grid gap-3 border-b border-[#E2EADC] py-4 last:border-0 md:grid-cols-2 md:items-center">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-[#F6F8F3] p-2.5 text-[#234E43]">
          <Icon size={19} />
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#234E43]">
            {label}
          </h3>

          <p className="mt-1 text-xs leading-5 text-[#718579]">
            {description}
          </p>
        </div>
      </div>

      <select
        aria-label={label}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={INPUT}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ========================================
// MAIN SETTINGS PAGE
// ========================================

export default function ExamControllerSettings() {
  const [settings, setSettings] = useState(
    loadSettings
  );

  const [savedSettings, setSavedSettings] = useState(
    loadSettings
  );

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const hasChanges =
    JSON.stringify(settings) !==
    JSON.stringify(savedSettings);

  // ======================================
  // REFRESH FROM OTHER TABS
  // ========================================

  useEffect(() => {
    function onStorage(event) {
      if (
        event.key === SETTINGS_KEY ||
        event.key === null
      ) {
        const updated = loadSettings();

        setSettings(updated);
        setSavedSettings(updated);
      }
    }

    window.addEventListener(
      "storage",
      onStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        onStorage
      );
    };
  }, []);

  // ======================================
  // UPDATE FIELD
  // ========================================

  function updateSetting(field, value) {
    setSettings((previous) => ({
      ...previous,
      [field]: value,
    }));

    setFeedback("");
    setError("");
  }

  // ======================================
  // SAVE SETTINGS
  // ========================================

  function saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );

      setSavedSettings({
        ...settings,
      });

      setError("");
      setFeedback(
        "Exam Controller settings saved successfully."
      );

      window.dispatchEvent(
        new CustomEvent(
          "unibee-exam-controller-settings-updated",
          {
            detail: { ...settings },
          }
        )
      );
    } catch {
      setError(
        "Unable to save settings. Check your browser storage permissions."
      );
    }
  }

  // ======================================
  // DISCARD UNSAVED CHANGES
  // ========================================

  function discardChanges() {
    setSettings({
      ...savedSettings,
    });

    setError("");
    setFeedback(
      "Unsaved settings changes discarded."
    );
  }

  // ======================================
  // RESET SETTINGS
  // ========================================

  function resetSettings() {
    const confirmed = window.confirm(
      "Restore all Exam Controller settings to their defaults?\n\nThis will not delete examinations, schedules, marks, results, notices, or profile information."
    );

    if (!confirmed) return;

    try {
      const defaults = {
        ...DEFAULT_SETTINGS,
      };

      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(defaults)
      );

      setSettings(defaults);
      setSavedSettings(defaults);

      setError("");
      setFeedback(
        "Default settings restored successfully."
      );

      window.dispatchEvent(
        new CustomEvent(
          "unibee-exam-controller-settings-updated",
          {
            detail: defaults,
          }
        )
      );
    } catch {
      setError(
        "Unable to restore default settings."
      );
    }
  }

  // ======================================
  // EXPORT SETTINGS
  // ========================================

  function exportSettings() {
    try {
      downloadJSON(
        "unibee-exam-controller-settings.json",
        {
          app: "UniBee",
          module: "Exam Controller Settings",
          exportedAt: new Date().toISOString(),
          settings: {
            ...settings,
          },
        }
      );

      setError("");
      setFeedback(
        "Settings exported as a JSON file."
      );
    } catch {
      setError(
        "Unable to export settings."
      );
    }
  }

  // ======================================
  // EXPORT EXAM CONTROLLER DATA
  // ========================================

  function exportAllData() {
    const confirmed = window.confirm(
      "Export all saved Exam Controller data?\n\nThe file may include student IDs, assessment marks, faculty contact information, and other personal details. Store it securely."
    );

    if (!confirmed) return;

    try {
      const { result, errors } = readDataForExport();

      if (errors.length > 0) {
        setError(
          `Some saved collections contain invalid data: ${errors.join(
            ", "
          )}. Export cancelled to avoid an incomplete backup.`
        );
        return;
      }

      downloadJSON(
        "unibee-exam-controller-backup.json",
        {
          app: "UniBee",
          portal: "Exam Controller",
          version: 1,
          exportedAt: new Date().toISOString(),
          settings: { ...savedSettings },
          data: result,
        }
      );

      setError("");
      setFeedback(
        "Exam Controller data exported successfully."
      );
    } catch {
      setError(
        "Unable to export Exam Controller data."
      );
    }
  }

  // ======================================
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
            Settings
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Customize your Exam Controller workspace,
            notification preferences, display options,
            and workflow defaults.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetSettings}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] hover:bg-[#F6F8F3]"
          >
            <RotateCcw size={17} />
            Reset Defaults
          </button>

          <button
            type="button"
            onClick={saveSettings}
            disabled={!hasChanges}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white hover:bg-[#193B33] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={17} />
            Save Settings
          </button>
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

      {hasChanges && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertCircle size={18} />
            You have unsaved settings changes.
          </p>

          <button
            type="button"
            onClick={discardChanges}
            className="text-sm font-bold text-amber-900 underline"
          >
            Discard Changes
          </button>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="pointer-events-none absolute -right-12 -top-12 h-60 w-60 rounded-full border-[35px] border-white/5" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
            <ShieldCheck size={16} />
            EXAM CONTROLLER
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            Workspace Preferences
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Configure your examination administration
            experience and prepare your workspace for
            the connected UniBee system.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold">
              Bee & Sage Design
            </span>

            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold">
              Local Preferences
            </span>

            <span className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold">
              Frontend Prototype
            </span>
          </div>
        </div>
      </section>

      {/* NOTIFICATION SETTINGS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
        <SectionHeader
          icon={Bell}
          title="Notification Preferences"
          description="Choose which categories of examination updates you want to receive when notifications are integrated."
        />

        <div>
          <SettingToggle
            icon={ClipboardList}
            title="Examination Updates"
            description="Changes to examination status and administration records."
            checked={settings.examNotifications}
            onChange={(value) =>
              updateSetting(
                "examNotifications",
                value
              )
            }
          />

          <SettingToggle
            icon={CalendarDays}
            title="Exam Schedule Changes"
            description="Examination timetable and venue updates."
            checked={settings.scheduleNotifications}
            onChange={(value) =>
              updateSetting(
                "scheduleNotifications",
                value
              )
            }
          />

          <SettingToggle
            icon={CheckCircle2}
            title="Registration Updates"
            description="Student examination registrations and eligibility reviews."
            checked={settings.registrationNotifications}
            onChange={(value) =>
              updateSetting(
                "registrationNotifications",
                value
              )
            }
          />

          <SettingToggle
            icon={ListChecks}
            title="Marks Verification"
            description="Submitted marks, pending reviews, and approval updates."
            checked={settings.marksNotifications}
            onChange={(value) =>
              updateSetting(
                "marksNotifications",
                value
              )
            }
          />

          <SettingToggle
            icon={GraduationCap}
            title="Result Publication"
            description="Result preparation, publishing, and withdrawal updates."
            checked={settings.resultNotifications}
            onChange={(value) =>
              updateSetting(
                "resultNotifications",
                value
              )
            }
          />

          <SettingToggle
            icon={Bell}
            title="Examination Notices"
            description="Important examination announcements and notice updates."
            checked={settings.noticeNotifications}
            onChange={(value) =>
              updateSetting(
                "noticeNotifications",
                value
              )
            }
          />
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-4">
          <Info
            size={18}
            className="mt-0.5 shrink-0 text-[#234E43]"
          />

          <p className="text-xs leading-6 text-[#718579]">
            Notification preferences are saved locally.
            Email, browser push notifications,
            and cross-stakeholder notifications are not
            active yet. We'll connect these preferences
            when the notification system is implemented.
          </p>
        </div>
      </section>

      {/* APPEARANCE */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
        <SectionHeader
          icon={Palette}
          title="Appearance & Accessibility"
          description="Set your preferred display and accessibility options."
        />

        <SelectSetting
          icon={Palette}
          label="Color Theme"
          description="Choose the preferred portal color scheme."
          value={settings.theme}
          onChange={(value) =>
            updateSetting("theme", value)
          }
          options={[
            {
              label: "Bee & Sage — Default",
              value: "bee-sage",
            },
            {
              label: "Light — Planned",
              value: "light",
            },
            {
              label: "Dark — Planned",
              value: "dark",
            },
          ]}
        />

        <SelectSetting
          icon={Monitor}
          label="Display Density"
          description="Preferred spacing for cards and tables."
          value={settings.density}
          onChange={(value) =>
            updateSetting("density", value)
          }
          options={[
            {
              label: "Comfortable",
              value: "comfortable",
            },
            {
              label: "Compact",
              value: "compact",
            },
            {
              label: "Spacious",
              value: "spacious",
            },
          ]}
        />

        <SelectSetting
          icon={Eye}
          label="Text Size"
          description="Preferred text size across the portal."
          value={settings.textSize}
          onChange={(value) =>
            updateSetting("textSize", value)
          }
          options={[
            {
              label: "Small",
              value: "small",
            },
            {
              label: "Normal",
              value: "normal",
            },
            {
              label: "Large",
              value: "large",
            },
          ]}
        />

        <SettingToggle
          icon={Volume2}
          title="Reduce Animation"
          description="Prefer fewer interface animations and transitions."
          checked={settings.reducedMotion}
          onChange={(value) =>
            updateSetting(
              "reducedMotion",
              value
            )
          }
        />

        <p className="mt-4 text-xs leading-6 text-[#718579]">
          These are saved display preferences.
          The current portal remains in Bee & Sage;
          applying theme, density, and text-size
          changes across every page is part of
          frontend integration.
        </p>
      </section>

      {/* WORKFLOW PREFERENCES */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
        <SectionHeader
          icon={SlidersHorizontal}
          title="Examination Workflow Preferences"
          description="Configure preferred defaults for the Exam Controller workspace."
        />

        <SelectSetting
          icon={LayoutDashboard}
          label="Default Landing Page"
          description="Preferred first page after Exam Controller login."
          value={settings.defaultLandingPage}
          onChange={(value) =>
            updateSetting(
              "defaultLandingPage",
              value
            )
          }
          options={[
            {
              label: "Dashboard",
              value: "dashboard",
            },
            {
              label: "Exam Management",
              value: "exams",
            },
            {
              label: "Exam Schedule",
              value: "schedule",
            },
            {
              label: "Marks Management",
              value: "marks",
            },
            {
              label: "Results & Publishing",
              value: "results",
            },
          ]}
        />

        <SelectSetting
          icon={ClipboardList}
          label="Default Records Per Page"
          description="Preferred pagination size for examination record tables."
          value={settings.defaultRecordsPerPage}
          onChange={(value) =>
            updateSetting(
              "defaultRecordsPerPage",
              value
            )
          }
          options={[
            {
              label: "5 Records",
              value: "5",
            },
            {
              label: "10 Records",
              value: "10",
            },
            {
              label: "20 Records",
              value: "20",
            },
            {
              label: "50 Records",
              value: "50",
            },
          ]}
        />

        <SettingToggle
          icon={ShieldCheck}
          title="Confirm Destructive Actions"
          description="Require confirmation before deleting or withdrawing records."
          checked={
            settings.confirmDestructiveActions
          }
          onChange={(value) =>
            updateSetting(
              "confirmDestructiveActions",
              value
            )
          }
        />

        <SettingToggle
          icon={FileText}
          title="Show Workflow Guidance"
          description="Display guidance about examination administration workflows."
          checked={settings.showWorkflowGuidance}
          onChange={(value) =>
            updateSetting(
              "showWorkflowGuidance",
              value
            )
          }
        />

        <p className="mt-4 text-xs leading-6 text-[#718579]">
          These preferences are stored but not yet
          applied across the other Exam Controller pages.
          Destructive-action confirmations currently
          remain enabled regardless of this preference.
          Integration will connect supported settings
          while preserving required safety checks.
        </p>
      </section>

      {/* DATA MANAGEMENT */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
        <SectionHeader
          icon={Database}
          title="Data Management"
          description="Export your saved settings or create a backup of Exam Controller frontend records."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#E2EADC] p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
              <Settings size={22} />
            </div>

            <h3 className="mt-4 font-extrabold text-[#234E43]">
              Export Settings
            </h3>

            <p className="mt-2 text-xs leading-6 text-[#718579]">
              Download your currently selected settings
              as a JSON file.
            </p>

            <button
              type="button"
              onClick={exportSettings}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#234E43] px-4 py-2.5 text-sm font-bold text-[#234E43] hover:bg-[#F6F8F3]"
            >
              <Download size={17} />
              Export Settings
            </button>
          </div>

          <div className="rounded-xl border border-[#E2EADC] p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
              <Database size={22} />
            </div>

            <h3 className="mt-4 font-extrabold text-[#234E43]">
              Export Exam Controller Data
            </h3>

            <p className="mt-2 text-xs leading-6 text-[#718579]">
              Download saved examination records,
              schedules, registrations, marks, results,
              notices, and profile information.
            </p>

            <button
              type="button"
              onClick={exportAllData}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#193B33]"
            >
              <Download size={17} />
              Export Data Backup
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs leading-6 text-[#718579]">
          The backup downloads a JSON file but does not
          provide automatic restoration. Keep backups
          secure, especially when they include student
          assessment records or personal information.
        </p>
      </section>

      {/* SECURITY INFORMATION */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-7">
        <SectionHeader
          icon={LockKeyhole}
          title="Account & Security"
          description="Current security implementation and future integration requirements."
        />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-4">
            <ShieldCheck
              size={21}
              className="shrink-0 text-[#234E43]"
            />

            <div>
              <h3 className="text-sm font-bold text-[#234E43]">
                Assigned Portal Role
              </h3>

              <p className="mt-2 text-sm text-[#718579]">
                Exam Controller
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-4">
            <Clock3
              size={21}
              className="shrink-0 text-[#234E43]"
            />

            <div>
              <h3 className="text-sm font-bold text-[#234E43]">
                Authentication Status
              </h3>

              <p className="mt-2 text-sm text-[#718579]">
                Frontend Prototype
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0 text-amber-800"
          />

          <p className="text-xs leading-6 text-amber-900">
            Settings are saved in browser localStorage
            and are not a security or permissions
            system. Password management, authenticated
            account access, notification delivery,
            role-based authorization, and centralized
            preferences will be implemented during
            backend integration.
          </p>
        </div>
      </section>

      {/* BOTTOM ACTIONS */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
        <div>
          <h3 className="font-bold text-[#234E43]">
            Exam Controller Preferences
          </h3>

          <p className="mt-1 text-xs text-[#718579]">
            {hasChanges
              ? "You have unsaved changes."
              : "All current changes have been saved or match the saved defaults."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasChanges && (
            <button
              type="button"
              onClick={discardChanges}
              className="rounded-xl border border-[#E2EADC] px-5 py-3 text-sm font-bold text-[#234E43]"
            >
              Discard
            </button>
          )}

          <button
            type="button"
            onClick={saveSettings}
            disabled={!hasChanges}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            <Save size={17} />
            Save Settings
          </button>
        </div>
      </section>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Exam Controller — Settings
      </p>
    </div>
  );
}
