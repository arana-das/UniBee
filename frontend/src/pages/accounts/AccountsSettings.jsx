
import { useEffect, useState } from "react";
import {
  Settings,
  Bell,
  Palette,
  LayoutDashboard,
  Wallet,
  Database,
  Save,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  ShieldCheck,
  Eye,
  CalendarDays,
  Monitor,
  Info,
} from "lucide-react";

// ========================================
// STORAGE CONFIGURATION
// ========================================

const STORAGE_KEY =
  "unibee-accounts-settings-v1";

const DATA_KEYS = {
  studentFees: "unibee-accounts-student-fees-v1",
  payments: "unibee-accounts-payments-v1",
  dues: "unibee-accounts-dues-v1",
  scholarships: "unibee-accounts-scholarships-v1",
  invoices: "unibee-accounts-invoices-v1",
  refunds: "unibee-accounts-refunds-v1",
  expenses: "unibee-accounts-expenses-v1",
  notices: "unibee-accounts-notices-v1",
  profile: "unibee-accounts-officer-profile-v1",
};

const DEFAULT_SETTINGS = {
  appearance: {
    compactMode: false,
    reduceMotion: false,
    showPageDescriptions: true,
  },

  notifications: {
    paymentUpdates: true,
    overdueAlerts: true,
    scholarshipUpdates: true,
    refundUpdates: true,
    expenseApprovals: true,
    noticeUpdates: true,
  },

  financial: {
    currency: "BDT",
    decimalPlaces: 2,
    showZeroBalances: true,
    highlightOverdue: true,
    defaultReportPeriod: "All Time",
  },

  dashboard: {
    showFinancialSummary: true,
    showRecentPayments: true,
    showQuickActions: true,
    showRecentActivity: true,
  },
};

// ========================================
// UTILITIES
// ========================================

function cloneDefaults() {
  return {
    appearance: { ...DEFAULT_SETTINGS.appearance },
    notifications: { ...DEFAULT_SETTINGS.notifications },
    financial: { ...DEFAULT_SETTINGS.financial },
    dashboard: { ...DEFAULT_SETTINGS.dashboard },
  };
}

function sanitizeSettings(value) {
  const result = cloneDefaults();

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return result;
  }

  Object.keys(result).forEach((section) => {
    const source = value[section];

    if (
      !source ||
      typeof source !== "object" ||
      Array.isArray(source)
    ) {
      return;
    }

    Object.keys(result[section]).forEach((field) => {
      const defaultValue = result[section][field];
      const nextValue = source[field];

      if (
        typeof nextValue === typeof defaultValue
      ) {
        result[section][field] = nextValue;
      }
    });
  });

  if (![0, 2].includes(result.financial.decimalPlaces)) {
    result.financial.decimalPlaces = 2;
  }

  if (!["BDT"].includes(result.financial.currency)) {
    result.financial.currency = "BDT";
  }

  if (
    ![
      "All Time",
      "This Month",
      "Last 30 Days",
      "This Year",
    ].includes(result.financial.defaultReportPeriod)
  ) {
    result.financial.defaultReportPeriod = "All Time";
  }

  return result;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return cloneDefaults();

    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return cloneDefaults();
  }
}

function getDataCounts() {
  return Object.entries(DATA_KEYS).map(
    ([name, key]) => {
      try {
        const raw = localStorage.getItem(key);

        if (!raw) {
          return {
            name,
            key,
            count: 0,
            available: false,
          };
        }

        const parsed = JSON.parse(raw);

        return {
          name,
          key,
          count: Array.isArray(parsed)
            ? parsed.length
            : 1,
          available: true,
        };
      } catch {
        return {
          name,
          key,
          count: 0,
          available: false,
        };
      }
    }
  );
}

function downloadJSON(filename, data) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    {
      type: "application/json;charset=utf-8",
    }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function dateStamp() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#E2EADC] py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#234E43]">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-[#718579]">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-[#234E43]" : "bg-[#CBD5CF]"
        } ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked
              ? "translate-x-1"
              : "-translate-x-4"
          }`}
        />
      </button>
    </div>
  );
}

function SelectField({
  label,
  description,
  value,
  options,
  onChange,
  disabled = false,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2EADC] py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#234E43]">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-[#718579]">
          {description}
        </p>
      </div>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        disabled={disabled}
        aria-label={label}
        className="min-w-[150px] rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option
            key={String(option.value)}
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
// MAIN COMPONENT
// ========================================

export default function AccountsSettings() {
  const [settings, setSettings] =
    useState(loadSettings);

  const [savedSettings, setSavedSettings] =
    useState(loadSettings);

  const [dataCounts, setDataCounts] =
    useState(getDataCounts);

  const [feedback, setFeedback] =
    useState("");

  const [error, setError] =
    useState("");

  // ======================================
  // CHANGE DETECTION
  // ========================================

  const hasChanges =
    JSON.stringify(settings) !==
    JSON.stringify(savedSettings);

  // ======================================
  // REFRESH
  // ========================================

  useEffect(() => {
    function refreshCounts() {
      setDataCounts(getDataCounts());
    }

    window.addEventListener(
      "storage",
      refreshCounts
    );

    window.addEventListener(
      "focus",
      refreshCounts
    );

    return () => {
      window.removeEventListener(
        "storage",
        refreshCounts
      );

      window.removeEventListener(
        "focus",
        refreshCounts
      );
    };
  }, []);

  // ======================================
  // SETTINGS ACTIONS
  // ========================================

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
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );

      setSavedSettings(
        sanitizeSettings(settings)
      );

      setFeedback(
        "Accounts Officer settings saved successfully."
      );

      setError("");
    } catch {
      setError(
        "Unable to save settings in browser storage."
      );
    }
  }

  function discardChanges() {
    setSettings(
      sanitizeSettings(savedSettings)
    );

    setFeedback(
      "Unsaved changes discarded."
    );

    setError("");
  }

  function resetSettings() {
    if (
      !window.confirm(
        "Reset all Accounts Officer settings to their defaults?"
      )
    ) {
      return;
    }

    setSettings(cloneDefaults());

    setFeedback(
      "Default settings loaded. Click Save Settings to apply them."
    );

    setError("");
  }

  function refreshSettings() {
    if (
      hasChanges &&
      !window.confirm(
        "Discard unsaved changes and reload saved settings?"
      )
    ) {
      return;
    }

    const latest = loadSettings();

    setSettings(latest);
    setSavedSettings(latest);
    setDataCounts(getDataCounts());

    setFeedback(
      "Saved settings and data counts refreshed."
    );

    setError("");
  }

  // ======================================
  // DATA BACKUP
  // ========================================

  function exportBackup() {
    try {
      const records = {};

      Object.entries(DATA_KEYS).forEach(
        ([name, key]) => {
          const raw = localStorage.getItem(key);

          if (raw !== null) {
            records[name] = JSON.parse(raw);
          }
        }
      );

      const backup = {
        app: "UniBee",
        module: "Accounts Officer",
        version: 1,
        exportedAt:
          new Date().toISOString(),
        settings:
          loadSettings(),
        records,
      };

      downloadJSON(
        `unibee-accounts-backup-${dateStamp()}.json`,
        backup
      );

      setFeedback(
        "Accounts Officer backup exported successfully."
      );

      setError("");
    } catch {
      setError(
        "Unable to export the backup. Check that saved data is valid."
      );
    }
  }

  // ======================================
  // DATA IMPORT
  // ========================================

  async function importBackup(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(
          "Backup file must be smaller than 5 MB."
        );
      }

      const content = await file.text();
      const backup = JSON.parse(content);

      if (
        backup.app !== "UniBee" ||
        backup.module !== "Accounts Officer" ||
        backup.version !== 1 ||
        !backup.records ||
        typeof backup.records !== "object" ||
        Array.isArray(backup.records)
      ) {
        throw new Error(
          "This is not a valid UniBee Accounts Officer backup."
        );
      }

      // Validate all records before writing anything.
      const nextRecords = [];

      for (const [name, value] of Object.entries(
        backup.records
      )) {
        if (!Object.prototype.hasOwnProperty.call(
          DATA_KEYS,
          name
        )) {
          continue;
        }

        if (name === "profile") {
          if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
          ) {
            throw new Error(
              "Backup contains an invalid profile."
            );
          }
        } else if (
          !Array.isArray(value) ||
          value.some(
            (item) =>
              !item ||
              typeof item !== "object" ||
              Array.isArray(item)
          )
        ) {
          throw new Error(
            `Backup contains invalid records for ${name}.`
          );
        }

        nextRecords.push([
          DATA_KEYS[name],
          JSON.stringify(value),
        ]);
      }

      const nextSettings =
        sanitizeSettings(backup.settings);

      const confirmed = window.confirm(
        "Importing this backup will overwrite matching Accounts Officer data currently saved in this browser. Continue?"
      );

      if (!confirmed) return;

      const writes = [
        ...nextRecords,
        [
          STORAGE_KEY,
          JSON.stringify(nextSettings),
        ],
      ];

      // Snapshot old values for rollback if a write fails.
      const previousValues = writes.map(
        ([key]) => [
          key,
          localStorage.getItem(key),
        ]
      );

      try {
        writes.forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      } catch {
        previousValues.forEach(
          ([key, oldValue]) => {
            try {
              if (oldValue === null) {
                localStorage.removeItem(key);
              } else {
                localStorage.setItem(
                  key,
                  oldValue
                );
              }
            } catch {
              // Storage recovery can fail if unavailable.
            }
          }
        );

        throw new Error(
          "Import could not be completed. Previous data restoration was attempted."
        );
      }

      setSettings(nextSettings);
      setSavedSettings(nextSettings);
      setDataCounts(getDataCounts());

      setFeedback(
        "Accounts Officer backup imported. Reload other open Accounts pages to see the restored records."
      );

      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to import backup."
      );
    } finally {
      event.target.value = "";
    }
  }

  // ======================================
  // VIEW DATA COUNTS
  // ========================================

  const totalSavedRecords = dataCounts
    .filter((item) => item.name !== "profile")
    .reduce(
      (total, item) => total + item.count,
      0
    );

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
            Accounts Settings
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Manage Accounts Officer preferences,
            financial display options, notifications,
            and local data backups.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshSettings}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43] hover:bg-[#F1F7EF]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={saveSettings}
            disabled={!hasChanges}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#193B33] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={18} />
            Save Settings
          </button>
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

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
            <Settings size={16} />
            ACCOUNTS OFFICER
          </div>

          <h2 className="mt-4 text-2xl font-extrabold md:text-3xl">
            Finance Workspace Preferences
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Configure your preferred working
            environment and manage the saved
            prototype data for this portal.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold">
              Bee & Sage Theme
            </span>

            <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold">
              BDT Currency
            </span>

            <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold">
              Local Prototype
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border-[35px] border-white/5" />
      </section>

      {/* UNSAVED CHANGES */}
      {hasChanges && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            You have unsaved settings changes.
          </p>

          <button
            type="button"
            onClick={discardChanges}
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 hover:underline"
          >
            <RotateCcw size={15} />
            Discard Changes
          </button>
        </div>
      )}

      {/* APPEARANCE */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <SectionHeader
          icon={Palette}
          title="Appearance Preferences"
          description="Saved preferences for the Accounts workspace"
        />

        <ToggleRow
          label="Compact Layout Preference"
          description="Remember a preference for denser spacing. Layout integration will be added later."
          checked={settings.appearance.compactMode}
          onChange={(value) =>
            updateSetting(
              "appearance",
              "compactMode",
              value
            )
          }
        />

        <ToggleRow
          label="Reduced Motion Preference"
          description="Remember a preference for fewer animations. Component-level integration is pending."
          checked={settings.appearance.reduceMotion}
          onChange={(value) =>
            updateSetting(
              "appearance",
              "reduceMotion",
              value
            )
          }
        />

        <ToggleRow
          label="Show Page Descriptions Preference"
          description="Save whether you prefer descriptive text on Accounts pages."
          checked={
            settings.appearance.showPageDescriptions
          }
          onChange={(value) =>
            updateSetting(
              "appearance",
              "showPageDescriptions",
              value
            )
          }
        />
      </section>

      {/* NOTIFICATIONS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <SectionHeader
          icon={Bell}
          title="Notification Preferences"
          description="Choose which financial events you want to be notified about after integration"
        />

        {[
          {
            field: "paymentUpdates",
            label: "Payment Updates",
            description:
              "Student payment and transaction activity",
          },
          {
            field: "overdueAlerts",
            label: "Overdue Fee Alerts",
            description:
              "Student balances past their due dates",
          },
          {
            field: "scholarshipUpdates",
            label: "Scholarship Updates",
            description:
              "Scholarship application and award decisions",
          },
          {
            field: "refundUpdates",
            label: "Refund Updates",
            description:
              "Refund requests and processing changes",
          },
          {
            field: "expenseApprovals",
            label: "Expense Approvals",
            description:
              "Expense review and approval decisions",
          },
          {
            field: "noticeUpdates",
            label: "Financial Notice Updates",
            description:
              "Financial announcements and publication changes",
          },
        ].map((item) => (
          <ToggleRow
            key={item.field}
            label={item.label}
            description={item.description}
            checked={
              settings.notifications[item.field]
            }
            onChange={(value) =>
              updateSetting(
                "notifications",
                item.field,
                value
              )
            }
          />
        ))}

        <p className="mt-4 rounded-xl bg-[#F6F8F3] p-4 text-xs leading-6 text-[#718579]">
          These toggles save notification
          preferences only. Email, push, and
          in-app notification delivery are not
          active in this frontend prototype.
        </p>
      </section>

      {/* FINANCIAL PREFERENCES */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <SectionHeader
          icon={Wallet}
          title="Financial Preferences"
          description="Configure currency and financial display preferences"
        />

        <SelectField
          label="Display Currency"
          description="The current Accounts modules use Bangladeshi Taka."
          value={settings.financial.currency}
          options={[
            {
              label: "BDT (৳)",
              value: "BDT",
            },
          ]}
          onChange={(value) =>
            updateSetting(
              "financial",
              "currency",
              value
            )
          }
        />

        <SelectField
          label="Decimal Places Preference"
          description="Preferred currency precision for future report formatting integration."
          value={settings.financial.decimalPlaces}
          options={[
            { label: "0 decimal places", value: 0 },
            { label: "2 decimal places", value: 2 },
          ]}
          onChange={(value) =>
            updateSetting(
              "financial",
              "decimalPlaces",
              Number(value)
            )
          }
        />

        <SelectField
          label="Default Reporting Period"
          description="Preferred period for future automatic report filtering."
          value={
            settings.financial.defaultReportPeriod
          }
          options={[
            {
              label: "All Time",
              value: "All Time",
            },
            {
              label: "This Month",
              value: "This Month",
            },
            {
              label: "Last 30 Days",
              value: "Last 30 Days",
            },
            {
              label: "This Year",
              value: "This Year",
            },
          ]}
          onChange={(value) =>
            updateSetting(
              "financial",
              "defaultReportPeriod",
              value
            )
          }
        />

        <ToggleRow
          label="Show Zero Balances"
          description="Remember whether zero-value balances should be displayed."
          checked={
            settings.financial.showZeroBalances
          }
          onChange={(value) =>
            updateSetting(
              "financial",
              "showZeroBalances",
              value
            )
          }
        />

        <ToggleRow
          label="Highlight Overdue Balances"
          description="Remember your preference for visually highlighting overdue amounts."
          checked={
            settings.financial.highlightOverdue
          }
          onChange={(value) =>
            updateSetting(
              "financial",
              "highlightOverdue",
              value
            )
          }
        />
      </section>

      {/* DASHBOARD PREFERENCES */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <SectionHeader
          icon={LayoutDashboard}
          title="Dashboard Preferences"
          description="Save which dashboard sections you prefer to display"
        />

        {[
          {
            field: "showFinancialSummary",
            label: "Financial Summary",
            description:
              "Summary cards for collections and balances",
          },
          {
            field: "showRecentPayments",
            label: "Recent Payments",
            description:
              "Recent student payment records",
          },
          {
            field: "showQuickActions",
            label: "Quick Actions",
            description:
              "Shortcuts to Accounts management modules",
          },
          {
            field: "showRecentActivity",
            label: "Recent Activity",
            description:
              "Recent financial record activity",
          },
        ].map((item) => (
          <ToggleRow
            key={item.field}
            label={item.label}
            description={item.description}
            checked={
              settings.dashboard[item.field]
            }
            onChange={(value) =>
              updateSetting(
                "dashboard",
                item.field,
                value
              )
            }
          />
        ))}

        <p className="mt-4 rounded-xl bg-[#F6F8F3] p-4 text-xs leading-6 text-[#718579]">
          These preferences are stored now.
          The Accounts Dashboard will use them
          once the settings integration step is
          implemented.
        </p>
      </section>

      {/* LOCAL DATA MANAGEMENT */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <SectionHeader
          icon={Database}
          title="Local Data Management"
          description="Review and back up prototype Accounts Officer records"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[#F6F8F3] p-5">
            <p className="text-xs text-[#718579]">
              Saved Module Records
            </p>

            <p className="mt-2 text-2xl font-extrabold text-[#234E43]">
              {totalSavedRecords}
            </p>
          </div>

          <div className="rounded-xl bg-[#F6F8F3] p-5">
            <p className="text-xs text-[#718579]">
              Data Collections
            </p>

            <p className="mt-2 text-2xl font-extrabold text-[#234E43]">
              {dataCounts.filter(
                (item) => item.available
              ).length}
              <span className="ml-1 text-sm font-medium text-[#718579]">
                / {dataCounts.length}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {dataCounts.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#E2EADC] p-4"
            >
              <div>
                <p className="text-sm font-bold capitalize text-[#234E43]">
                  {item.name.replace(
                    /([A-Z])/g,
                    " $1"
                  )}
                </p>

                <p className="mt-1 text-xs text-[#718579]">
                  {item.available
                    ? item.name === "profile"
                      ? "Profile saved"
                      : `${item.count} records`
                    : "No saved data"}
                </p>
              </div>

              {item.available ? (
                <CheckCircle2
                  size={18}
                  className="text-emerald-600"
                />
              ) : (
                <AlertCircle
                  size={18}
                  className="text-amber-600"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportBackup}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white hover:bg-[#193B33]"
          >
            <Download size={18} />
            Export Backup
          </button>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#D5E3D5] bg-white px-5 py-3 text-sm font-bold text-[#234E43] hover:bg-[#F1F7EF]">
            <Upload size={18} />
            Import Backup

            <input
              type="file"
              accept=".json,application/json"
              onChange={importBackup}
              className="sr-only"
              aria-label="Import Accounts backup JSON"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setDataCounts(getDataCounts());
              setFeedback(
                "Saved data information refreshed."
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#D5E3D5] bg-white px-5 py-3 text-sm font-bold text-[#234E43] hover:bg-[#F1F7EF]"
          >
            <RefreshCw size={17} />
            Refresh Data
          </button>
        </div>

        <p className="mt-4 text-xs leading-6 text-[#718579]">
          Export Backup downloads a JSON file
          containing the locally saved Accounts
          records and settings. Import Backup
          overwrites matching local data after
          confirmation. Keep backup files private,
          as they may contain personal or
          financial information.
        </p>
      </section>

      {/* RESET SETTINGS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
        <SectionHeader
          icon={RotateCcw}
          title="Restore Default Settings"
          description="Reset interface preferences without deleting financial records"
        />

        <button
          type="button"
          onClick={resetSettings}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-900 hover:bg-amber-100"
        >
          <RotateCcw size={17} />
          Restore Defaults
        </button>

        <p className="mt-3 text-xs text-[#718579]">
          This loads default preferences into
          the form. Click Save Settings to
          store the defaults. Financial records,
          notices, and profile details are not
          deleted.
        </p>
      </section>

      {/* INFORMATION */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <Info
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Settings
          are saved locally in the current
          browser. Notification delivery,
          dashboard visibility, compact layout,
          financial number formatting, and
          reduced-motion preferences are not
          yet applied across other modules.
          Those connections will be completed
          during integration. Backup export
          and import work locally and do not
          upload data to a server.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Accounts Officer — Settings
      </p>
    </div>
  );
}
