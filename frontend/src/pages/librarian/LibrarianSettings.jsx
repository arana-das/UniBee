
import { useMemo, useRef, useState } from "react";
import {
  Settings,
  LibraryBig,
  BookOpen,
  Bell,
  Clock3,
  ShieldCheck,
  Database,
  Save,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  PackageSearch,
  ClipboardList,
  Info,
  ChevronRight,
} from "lucide-react";

const SETTINGS_KEY = "unibee-librarian-settings-v1";

const DEFAULT_SETTINGS = {
  library: {
    name: "UniBee Central Library",
    email: "library@unibee.example",
    phone: "+880 1700-000000",
    location: "Main Campus, Ground Floor",
    description:
      "Supporting academic learning, research and access to university knowledge resources.",
  },

  borrowing: {
    defaultLoanDays: 14,
    maxBooksPerStudent: 5,
    maxRenewals: 2,
    renewalDays: 7,
    allowRenewals: true,
    allowOverdueRenewal: false,
    blockIssueWithOverdue: true,
  },

  stock: {
    lowStockThreshold: 3,
    enableLowStockAlerts: true,
    autoDemandTracking: true,
    enablePurchasePlanning: true,
  },

  requests: {
    allowStudentRequests: true,
    allowOutOfStockRequests: true,
    requireLibrarianApproval: true,
    allowBookReservations: false,
  },

  notifications: {
    dueDateReminders: true,
    overdueAlerts: true,
    newBookNotifications: true,
    requestStatusUpdates: true,
    stockAlerts: true,
    announcementNotifications: true,
  },

  hours: {
    monday: { open: "09:00", close: "17:00", closed: false },
    tuesday: { open: "09:00", close: "17:00", closed: false },
    wednesday: { open: "09:00", close: "17:00", closed: false },
    thursday: { open: "09:00", close: "17:00", closed: false },
    friday: { open: "09:00", close: "17:00", closed: true },
    saturday: { open: "09:00", close: "17:00", closed: false },
    sunday: { open: "09:00", close: "17:00", closed: true },
  },
};

const TABS = [
  { id: "library", label: "Library Profile", icon: LibraryBig },
  { id: "borrowing", label: "Borrowing Policies", icon: BookOpen },
  { id: "stock", label: "Stock Preferences", icon: PackageSearch },
  { id: "requests", label: "Book Requests", icon: ClipboardList },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "hours", label: "Opening Hours", icon: Clock3 },
  { id: "data", label: "Data Management", icon: Database },
];

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function normalizeSettings(value) {
  const defaults = cloneDefaults();

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return defaults;
  }

  for (const section of [
    "library",
    "borrowing",
    "stock",
    "requests",
    "notifications",
  ]) {
    const incoming = value[section];

    if (
      incoming &&
      typeof incoming === "object" &&
      !Array.isArray(incoming)
    ) {
      for (const key of Object.keys(defaults[section])) {
        if (
          typeof incoming[key] ===
          typeof defaults[section][key]
        ) {
          defaults[section][key] = incoming[key];
        }
      }
    }
  }

  if (
    value.hours &&
    typeof value.hours === "object" &&
    !Array.isArray(value.hours)
  ) {
    for (const day of Object.keys(defaults.hours)) {
      const incoming = value.hours[day];

      if (!incoming || typeof incoming !== "object") {
        continue;
      }

      for (const key of ["open", "close"]) {
        if (
          typeof incoming[key] === "string" &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(incoming[key])
        ) {
          defaults.hours[day][key] = incoming[key];
        }
      }

      if (typeof incoming.closed === "boolean") {
        defaults.hours[day].closed = incoming.closed;
      }
    }
  }

  return defaults;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);

    if (!raw) return cloneDefaults();

    return normalizeSettings(JSON.parse(raw));
  } catch {
    return cloneDefaults();
  }
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  min,
  max,
  hint,
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
        min={min}
        max={max}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#234E43] focus:ring-2 focus:ring-[#A6C1A4]/20"
      />

      {hint && (
        <p className="mt-2 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </label>
  );
}

function Toggle({
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-5 last:border-0">
      <div className="min-w-0 flex-1">
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
        aria-label={title}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-[#234E43]" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function SectionTitle({
  title,
  description,
  icon: Icon,
}) {
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

export default function LibrarianSettings() {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(loadSettings);

  const [activeTab, setActiveTab] = useState("library");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileRef = useRef(null);

  const dirty = useMemo(
    () =>
      JSON.stringify(settings) !==
      JSON.stringify(saved),
    [settings, saved]
  );

  const update = (section, key, value) => {
    setSettings((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        [key]: value,
      },
    }));

    setMessage("");
    setError("");
  };

  function updateHours(day, field, value) {
    setSettings((previous) => ({
      ...previous,
      hours: {
        ...previous.hours,
        [day]: {
          ...previous.hours[day],
          [field]: value,
        },
      },
    }));

    setMessage("");
    setError("");
  }

  function validate(value) {
    if (
      !value.library.name.trim() ||
      !value.library.email.trim()
    ) {
      return "Library name and email are required.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value.library.email
      )
    ) {
      return "Enter a valid library email address.";
    }

    const limits = [
      ["defaultLoanDays", 1, 365],
      ["maxBooksPerStudent", 1, 100],
      ["maxRenewals", 0, 20],
      ["renewalDays", 1, 365],
    ];

    for (const [key, minimum, maximum] of limits) {
      const number = Number(value.borrowing[key]);

      if (
        !Number.isInteger(number) ||
        number < minimum ||
        number > maximum
      ) {
        return `${key} must be a whole number between ${minimum} and ${maximum}.`;
      }
    }

    const threshold = Number(
      value.stock.lowStockThreshold
    );

    if (
      !Number.isInteger(threshold) ||
      threshold < 0 ||
      threshold > 1000
    ) {
      return "Low stock threshold must be between 0 and 1000.";
    }

    for (const [day, hours] of Object.entries(value.hours)) {
      if (
        !hours.closed &&
        hours.open >= hours.close
      ) {
        return `Closing time must be later than opening time on ${day}.`;
      }
    }

    return "";
  }

  function saveSettings() {
    const validationError = validate(settings);

    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    const next = {
      ...settings,
      borrowing: {
        ...settings.borrowing,
        defaultLoanDays: Number(
          settings.borrowing.defaultLoanDays
        ),
        maxBooksPerStudent: Number(
          settings.borrowing.maxBooksPerStudent
        ),
        maxRenewals: Number(
          settings.borrowing.maxRenewals
        ),
        renewalDays: Number(
          settings.borrowing.renewalDays
        ),
      },
      stock: {
        ...settings.stock,
        lowStockThreshold: Number(
          settings.stock.lowStockThreshold
        ),
      },
    };

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(next)
      );

      setSettings(next);
      setSaved(JSON.parse(JSON.stringify(next)));
      setMessage("Library settings saved successfully.");
      setError("");
    } catch {
      setError("Unable to save settings to browser storage.");
      setMessage("");
    }
  }

  function discardChanges() {
    if (!dirty) return;

    if (
      !window.confirm(
        "Discard all unsaved changes?"
      )
    ) {
      return;
    }

    setSettings(JSON.parse(JSON.stringify(saved)));
    setMessage("Unsaved changes discarded.");
    setError("");
  }

  function resetSettings() {
    if (
      !window.confirm(
        "Restore all default Librarian settings? Existing custom settings will be replaced."
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
      setSaved(cloneDefaults());
      setMessage("Default library settings restored.");
      setError("");
    } catch {
      setError("Unable to restore defaults.");
    }
  }

  function exportSettings() {
    const backup = {
      format: "UniBee-Librarian-Settings",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
    };

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "UniBee_Librarian_Settings.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setMessage("Library settings backup downloaded.");
    setError("");
  }

  async function importSettings(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      if (file.size > 1024 * 1024) {
        throw new Error(
          "Settings file must be smaller than 1 MB."
        );
      }

      const parsed = JSON.parse(await file.text());

      if (
        parsed.format !==
          "UniBee-Librarian-Settings" ||
        parsed.version !== 1 ||
        !parsed.settings ||
        typeof parsed.settings !== "object" ||
        Array.isArray(parsed.settings)
      ) {
        throw new Error("Invalid settings backup.");
      }

      for (const section of Object.keys(DEFAULT_SETTINGS)) {
        if (
          !parsed.settings[section] ||
          typeof parsed.settings[section] !== "object" ||
          Array.isArray(parsed.settings[section])
        ) {
          throw new Error(
            `Missing or invalid settings section: ${section}.`
          );
        }
      }

      const restored = normalizeSettings(
        parsed.settings
      );

      const validationError = validate(restored);

      if (validationError) {
        throw new Error(validationError);
      }

      if (
        !window.confirm(
          "Import and replace your current Librarian settings?"
        )
      ) {
        return;
      }

      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(restored)
      );

      setSettings(restored);
      setSaved(
        JSON.parse(JSON.stringify(restored))
      );

      setMessage("Library settings restored from backup.");
      setError("");
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Unable to import settings."
      );
      setMessage("");
    } finally {
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  const borrowing = settings.borrowing;
  const stock = settings.stock;
  const requests = settings.requests;
  const notifications = settings.notifications;

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Library Administration
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Librarian Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage library preferences, borrowing rules,
            inventory thresholds and operational settings.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={discardChanges}
            disabled={!dirty}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] disabled:opacity-40"
          >
            <RotateCcw size={17} />
            Discard
          </button>

          <button
            type="button"
            onClick={saveSettings}
            disabled={!dirty}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Save size={17} />
            Save Settings
          </button>
        </div>
      </section>

      {dirty && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle size={18} />
          You have unsaved settings changes.
        </div>
      )}

      {message && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {message}
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

      {/* MAIN SETTINGS LAYOUT */}
      <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* NAVIGATION */}
        <aside className="rounded-2xl border border-[#234E43]/10 bg-white p-3 shadow-sm">
          <p className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Settings Sections
          </p>

          <nav
            aria-label="Librarian settings sections"
            className="space-y-1"
          >
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
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

        {/* CONTENT */}
        <main className="min-w-0 rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm md:p-7">
          {/* LIBRARY PROFILE */}
          {activeTab === "library" && (
            <div>
              <SectionTitle
                title="Library Profile"
                description="General information about the university library."
                icon={LibraryBig}
              />

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field
                  label="Library Name *"
                  required
                  value={settings.library.name}
                  onChange={(e) =>
                    update(
                      "library",
                      "name",
                      e.target.value
                    )
                  }
                />

                <Field
                  label="Library Email *"
                  required
                  type="email"
                  value={settings.library.email}
                  onChange={(e) =>
                    update(
                      "library",
                      "email",
                      e.target.value
                    )
                  }
                />

                <Field
                  label="Contact Number"
                  value={settings.library.phone}
                  onChange={(e) =>
                    update(
                      "library",
                      "phone",
                      e.target.value
                    )
                  }
                />

                <Field
                  label="Library Location"
                  value={settings.library.location}
                  onChange={(e) =>
                    update(
                      "library",
                      "location",
                      e.target.value
                    )
                  }
                />
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Library Description
                </span>

                <textarea
                  rows={5}
                  maxLength={2000}
                  value={settings.library.description}
                  onChange={(e) =>
                    update(
                      "library",
                      "description",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-[#234E43]"
                />
              </label>

              <div className="mt-6 rounded-xl bg-[#F6F8F3] p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
                  Library Profile Preview
                </p>

                <h3 className="mt-3 text-xl font-bold text-[#234E43]">
                  {settings.library.name}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {settings.library.description}
                </p>

                <div className="mt-5 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                  <p className="flex items-center gap-2">
                    <Mail size={16} />
                    {settings.library.email}
                  </p>

                  <p className="flex items-center gap-2">
                    <Phone size={16} />
                    {settings.library.phone}
                  </p>

                  <p className="flex items-center gap-2 sm:col-span-2">
                    <MapPin size={16} />
                    {settings.library.location}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* BORROWING POLICIES */}
          {activeTab === "borrowing" && (
            <div>
              <SectionTitle
                title="Borrowing Policies"
                description="Define preferred book issue, return and renewal rules."
                icon={BookOpen}
              />

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field
                  label="Default Loan Duration (Days)"
                  type="number"
                  min="1"
                  max="365"
                  value={borrowing.defaultLoanDays}
                  onChange={(e) =>
                    update(
                      "borrowing",
                      "defaultLoanDays",
                      e.target.value
                    )
                  }
                />

                <Field
                  label="Maximum Books per Student"
                  type="number"
                  min="1"
                  max="100"
                  value={borrowing.maxBooksPerStudent}
                  onChange={(e) =>
                    update(
                      "borrowing",
                      "maxBooksPerStudent",
                      e.target.value
                    )
                  }
                />

                <Field
                  label="Maximum Renewals"
                  type="number"
                  min="0"
                  max="20"
                  value={borrowing.maxRenewals}
                  onChange={(e) =>
                    update(
                      "borrowing",
                      "maxRenewals",
                      e.target.value
                    )
                  }
                />

                <Field
                  label="Renewal Duration (Days)"
                  type="number"
                  min="1"
                  max="365"
                  value={borrowing.renewalDays}
                  onChange={(e) =>
                    update(
                      "borrowing",
                      "renewalDays",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="mt-6">
                <Toggle
                  title="Allow Book Renewals"
                  description="Preference to let students extend eligible book loans."
                  checked={borrowing.allowRenewals}
                  onChange={(value) =>
                    update(
                      "borrowing",
                      "allowRenewals",
                      value
                    )
                  }
                />

                <Toggle
                  title="Allow Renewal of Overdue Books"
                  description="Preference to allow overdue loans to be renewed."
                  checked={borrowing.allowOverdueRenewal}
                  onChange={(value) =>
                    update(
                      "borrowing",
                      "allowOverdueRenewal",
                      value
                    )
                  }
                />

                <Toggle
                  title="Block New Issues for Overdue Students"
                  description="Preference to prevent further borrowing until overdue loans are returned."
                  checked={borrowing.blockIssueWithOverdue}
                  onChange={(value) =>
                    update(
                      "borrowing",
                      "blockIssueWithOverdue",
                      value
                    )
                  }
                />
              </div>
            </div>
          )}

          {/* STOCK */}
          {activeTab === "stock" && (
            <div>
              <SectionTitle
                title="Stock Preferences"
                description="Manage inventory alert and acquisition preferences."
                icon={PackageSearch}
              />

              <div className="mt-6 max-w-sm">
                <Field
                  label="Low Stock Threshold"
                  type="number"
                  min="0"
                  max="1000"
                  value={stock.lowStockThreshold}
                  onChange={(e) =>
                    update(
                      "stock",
                      "lowStockThreshold",
                      e.target.value
                    )
                  }
                  hint="Example: 3 means an active book with 1–3 available copies is considered low stock."
                />
              </div>

              <div className="mt-6">
                <Toggle
                  title="Low Stock Alerts"
                  description="Preference to highlight books approaching low stock."
                  checked={stock.enableLowStockAlerts}
                  onChange={(value) =>
                    update(
                      "stock",
                      "enableLowStockAlerts",
                      value
                    )
                  }
                />

                <Toggle
                  title="Student Demand Tracking"
                  description="Preference to include active student requests in stock planning."
                  checked={stock.autoDemandTracking}
                  onChange={(value) =>
                    update(
                      "stock",
                      "autoDemandTracking",
                      value
                    )
                  }
                />

                <Toggle
                  title="Purchase Planning"
                  description="Preference to allow additional book acquisition plans."
                  checked={stock.enablePurchasePlanning}
                  onChange={(value) =>
                    update(
                      "stock",
                      "enablePurchasePlanning",
                      value
                    )
                  }
                />
              </div>
            </div>
          )}

          {/* BOOK REQUESTS */}
          {activeTab === "requests" && (
            <div>
              <SectionTitle
                title="Book Request Preferences"
                description="Define how student book requests should be handled."
                icon={ClipboardList}
              />

              <div className="mt-5">
                <Toggle
                  title="Enable Student Book Requests"
                  description="Preference to accept book requests from students."
                  checked={requests.allowStudentRequests}
                  onChange={(value) =>
                    update(
                      "requests",
                      "allowStudentRequests",
                      value
                    )
                  }
                />

                <Toggle
                  title="Allow Out-of-Stock Requests"
                  description="Preference to let students request books even when no copies are available."
                  checked={requests.allowOutOfStockRequests}
                  onChange={(value) =>
                    update(
                      "requests",
                      "allowOutOfStockRequests",
                      value
                    )
                  }
                />

                <Toggle
                  title="Require Librarian Approval"
                  description="Preference to review book requests before fulfillment."
                  checked={requests.requireLibrarianApproval}
                  onChange={(value) =>
                    update(
                      "requests",
                      "requireLibrarianApproval",
                      value
                    )
                  }
                />

                <Toggle
                  title="Allow Book Reservations"
                  description="Future option to reserve a copy for pickup. Reservations are not implemented yet."
                  checked={requests.allowBookReservations}
                  onChange={(value) =>
                    update(
                      "requests",
                      "allowBookReservations",
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
              <SectionTitle
                title="Notification Preferences"
                description="Configure future library communication preferences."
                icon={Bell}
              />

              <div className="mt-5">
                {[
                  [
                    "dueDateReminders",
                    "Due Date Reminders",
                    "Remind students before borrowing deadlines.",
                  ],
                  [
                    "overdueAlerts",
                    "Overdue Notifications",
                    "Notify students about overdue books.",
                  ],
                  [
                    "newBookNotifications",
                    "New Book Arrivals",
                    "Inform students when new books become available.",
                  ],
                  [
                    "requestStatusUpdates",
                    "Request Status Updates",
                    "Notify students when their requests are reviewed.",
                  ],
                  [
                    "stockAlerts",
                    "Stock Alerts",
                    "Notify librarians about low inventory.",
                  ],
                  [
                    "announcementNotifications",
                    "Library Announcements",
                    "Inform eligible users about published notices.",
                  ],
                ].map(([key, title, description]) => (
                  <Toggle
                    key={key}
                    title={title}
                    description={description}
                    checked={notifications[key]}
                    onChange={(value) =>
                      update(
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

          {/* OPENING HOURS */}
          {activeTab === "hours" && (
            <div>
              <SectionTitle
                title="Library Opening Hours"
                description="Set the weekly library operating schedule."
                icon={CalendarDays}
              />

              <div className="mt-6 space-y-3">
                {Object.entries(settings.hours).map(
                  ([day, hours]) => (
                    <div
                      key={day}
                      className="grid items-center gap-3 rounded-xl bg-[#F6F8F3] p-4 sm:grid-cols-[120px_1fr_1fr_auto]"
                    >
                      <p className="text-sm font-bold capitalize text-[#234E43]">
                        {day}
                      </p>

                      <label>
                        <span className="mb-1 block text-xs text-slate-500">
                          Opening
                        </span>

                        <input
                          type="time"
                          disabled={hours.closed}
                          value={hours.open}
                          onChange={(e) =>
                            updateHours(
                              day,
                              "open",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm disabled:opacity-40"
                        />
                      </label>

                      <label>
                        <span className="mb-1 block text-xs text-slate-500">
                          Closing
                        </span>

                        <input
                          type="time"
                          disabled={hours.closed}
                          value={hours.close}
                          onChange={(e) =>
                            updateHours(
                              day,
                              "close",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm disabled:opacity-40"
                        />
                      </label>

                      <label className="flex items-center gap-2 text-xs font-semibold text-[#234E43]">
                        <input
                          type="checkbox"
                          checked={hours.closed}
                          onChange={(e) =>
                            updateHours(
                              day,
                              "closed",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 accent-[#234E43]"
                        />
                        Closed
                      </label>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* DATA MANAGEMENT */}
          {activeTab === "data" && (
            <div>
              <SectionTitle
                title="Data Management"
                description="Back up or restore Librarian configuration preferences."
                icon={Database}
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-5">
                  <Download
                    size={25}
                    className="text-[#234E43]"
                  />

                  <h3 className="mt-4 text-sm font-bold text-[#234E43]">
                    Export Settings
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    Download your current Librarian settings
                    as a JSON file.
                  </p>

                  <button
                    type="button"
                    onClick={exportSettings}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-semibold text-white"
                  >
                    <Download size={17} />
                    Download JSON
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 p-5">
                  <Upload
                    size={25}
                    className="text-[#234E43]"
                  />

                  <h3 className="mt-4 text-sm font-bold text-[#234E43]">
                    Import Settings
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    Restore a previously exported
                    Librarian settings JSON file.
                  </p>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={importSettings}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      fileRef.current?.click()
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#234E43]/20 px-4 py-3 text-sm font-semibold text-[#234E43]"
                  >
                    <Upload size={17} />
                    Choose JSON
                  </button>
                </div>
              </div>

              <div className="mt-7 border-t border-slate-100 pt-6">
                <h3 className="text-sm font-bold text-rose-700">
                  Restore Default Settings
                </h3>

                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Reset Librarian preferences to their
                  original values. Books, loans, requests,
                  announcements and purchase plans will
                  remain unchanged.
                </p>

                <button
                  type="button"
                  onClick={resetSettings}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700"
                >
                  <RotateCcw size={17} />
                  Restore Defaults
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* INTEGRATION NOTICE */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <Info size={19} className="mt-0.5 shrink-0" />

        <p>
          <strong>Frontend Demo:</strong> These settings are
          saved under the LocalStorage key{" "}
          <code>unibee-librarian-settings-v1</code>.
          Borrowing limits, renewal rules, stock thresholds,
          reservations and notifications are configuration
          preferences. Existing modules still use their
          current built-in behavior until these preferences
          are integrated. No real emails or automatic
          reminders are sent.
        </p>
      </div>

      <p className="text-center text-xs text-slate-400">
        UniBee Librarian Settings · Frontend Demo
      </p>
    </div>
  );
}
