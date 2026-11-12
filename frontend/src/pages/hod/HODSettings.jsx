
import { useEffect, useMemo, useState } from "react";
import {
  Settings,
  Building2,
  Bell,
  ShieldCheck,
  ClipboardCheck,
  GraduationCap,
  Palette,
  Save,
  RefreshCw,
  RotateCcw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Info,
  Mail,
  CalendarDays,
  Monitor,
  Database,
  SlidersHorizontal,
  Clock3,
} from "lucide-react";

// ========================================
// CONFIGURATION
// ========================================

const KEYS = {
  departments: "unibee-admin-departments-v1",
  selectedDepartment:
    "unibee-hod-selected-department-v1",
  settings: "unibee-hod-settings-v1",
};

const DEFAULT_SETTINGS = {
  attendanceThreshold: 75,
  cgpaThreshold: 2.5,
  attendanceAlerts: true,
  academicRiskAlerts: true,
  pendingApprovalAlerts: true,
  courseAllocationAlerts: true,
  scheduleConflictAlerts: true,
  departmentNoticeAlerts: true,
  emailNotifications: false,
  dashboardCompact: false,
  showQuickActions: true,
  defaultScheduleView: "week",
  preferredStartDay: "Sunday",
  recordsPerPage: 10,
};

const WEEK_DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// ========================================
// STORAGE HELPERS
// ========================================

function text(value) {
  return String(value ?? "").trim();
}

function readRows(key) {
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

function readDepartmentId() {
  try {
    return (
      localStorage.getItem(KEYS.selectedDepartment) ||
      ""
    );
  } catch {
    return "";
  }
}

function loadData() {
  return {
    departments: readRows(KEYS.departments),
    settings: readRows(KEYS.settings),
  };
}

function getDepartment(row, index) {
  return {
    id: text(
      row.id ??
        row._id ??
        row.code ??
        `department-${index}`
    ),

    name: text(
      row.name ??
        row.departmentName ??
        row.title ??
        row.code ??
        "Unnamed Department"
    ),

    code: text(row.code),
  };
}

function getSettingsForDepartment(rows, departmentId) {
  const saved = rows.find(
    (row) =>
      text(row.departmentId) === departmentId
  );

  return {
    ...DEFAULT_SETTINGS,
    ...(saved?.preferences || {}),
  };
}

function validateSettings(settings) {
  const attendance = Number(
    settings.attendanceThreshold
  );

  const cgpa = Number(
    settings.cgpaThreshold
  );

  const pageSize = Number(
    settings.recordsPerPage
  );

  if (
    !Number.isFinite(attendance) ||
    attendance < 0 ||
    attendance > 100
  ) {
    return "Attendance threshold must be between 0 and 100%.";
  }

  if (
    !Number.isFinite(cgpa) ||
    cgpa < 0 ||
    cgpa > 4
  ) {
    return "CGPA threshold must be between 0 and 4.00.";
  }

  if (![5, 10, 15, 20, 25, 50].includes(pageSize)) {
    return "Select a valid number of records per page.";
  }

  if (!WEEK_DAYS.includes(settings.preferredStartDay)) {
    return "Select a valid starting day.";
  }

  if (
    !["week", "day"].includes(
      settings.defaultScheduleView
    )
  ) {
    return "Select a valid schedule view.";
  }

  return "";
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

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// ========================================
// UI COMPONENTS
// ========================================

function SectionHeader({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
        <Icon size={21} />
      </div>

      <div>
        <h2 className="text-lg font-extrabold text-[#234E43]">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-[#718579]">
          {description}
        </p>
      </div>
    </div>
  );
}

function SettingToggle({
  title,
  description,
  checked,
  onChange,
  disabled,
  icon: Icon,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EDF1EB] py-4 last:border-0">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {Icon && (
          <div className="rounded-lg bg-[#F6F8F3] p-2.5 text-[#234E43]">
            <Icon size={18} />
          </div>
        )}

        <div>
          <p className="text-sm font-bold text-[#234E43]">
            {title}
          </p>

          <p className="mt-1 max-w-xl text-xs leading-6 text-[#718579]">
            {description}
          </p>
        </div>
      </div>

      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={Boolean(checked)}
          onChange={(event) =>
            onChange(event.target.checked)
          }
          disabled={disabled}
          aria-label={title}
        />

        <span className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-[#234E43] peer-focus-visible:ring-2 peer-focus-visible:ring-[#D9A536] peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />

        <span className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

function NumberSetting({
  title,
  description,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  disabled,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EDF1EB] py-5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#234E43]">
          {title}
        </p>

        <p className="mt-1 max-w-xl text-xs leading-6 text-[#718579]">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          disabled={disabled}
          aria-label={title}
          className="w-24 rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-3 py-3 text-center text-sm font-bold text-[#234E43] outline-none focus:border-[#A6C1A4] disabled:opacity-50"
        />

        <span className="w-8 text-sm font-semibold text-[#718579]">
          {suffix}
        </span>
      </div>
    </div>
  );
}

// ========================================
// MAIN PAGE
// ========================================

export default function HODSettings() {
  const [data, setData] = useState(loadData);

  const [departmentId, setDepartmentId] =
    useState(readDepartmentId);

  const [settings, setSettings] = useState({
    ...DEFAULT_SETTINGS,
  });

  const [activeTab, setActiveTab] =
    useState("academic");

  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // ======================================
  // DEPARTMENT LOOKUP
  // ======================================

  const departments = useMemo(
    () =>
      data.departments.rows.map(
        (row, index) =>
          getDepartment(row, index)
      ),
    [data.departments.rows]
  );

  const department = departments.find(
    (item) => item.id === departmentId
  );

  // ======================================
  // LOAD SAVED SETTINGS
  // ======================================

  useEffect(() => {
    const next = getSettingsForDepartment(
      data.settings.rows,
      departmentId
    );

    setSettings(next);
    setDirty(false);
  }, [
    departmentId,
    data.settings.rows,
  ]);

  // ======================================
  // REFRESH EVENTS
  // ======================================

  useEffect(() => {
    function reload() {
      setData(loadData());
      setDepartmentId(readDepartmentId());
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        reload();
      }
    }

    window.addEventListener("storage", reload);

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
  // ACTIONS
  // ======================================

  function updateSetting(key, value) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setDirty(true);
    setError("");
    setFeedback("");
  }

  function changeDepartment(id) {
    if (dirty) {
      const proceed = window.confirm(
        "You have unsaved settings. Switch departments and discard those changes?"
      );

      if (!proceed) return;
    }

    setDepartmentId(id);
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

  function refreshSettings() {
    if (
      dirty &&
      !window.confirm(
        "Discard unsaved changes and reload saved settings?"
      )
    ) {
      return;
    }

    const latest = loadData();

    setData(latest);
    setDepartmentId(readDepartmentId());

    setSettings(
      getSettingsForDepartment(
        latest.settings.rows,
        departmentId
      )
    );

    setDirty(false);
    setError("");
    setFeedback("Settings refreshed.");
  }

  function saveSettings() {
    if (!department) {
      setError(
        "Select an existing Admin department first."
      );
      return;
    }

    const validationError = validateSettings(settings);

    if (validationError) {
      setError(validationError);
      return;
    }

    const latest = readRows(KEYS.settings);

    if (latest.status === "invalid") {
      setError(
        "Existing settings storage is invalid. No data was overwritten."
      );
      return;
    }

    const existing = latest.rows.find(
      (row) =>
        text(row.departmentId) === department.id
    );

    const now = new Date().toISOString();

    const cleanSettings = {
      ...settings,
      attendanceThreshold: Number(
        settings.attendanceThreshold
      ),
      cgpaThreshold: Number(
        settings.cgpaThreshold
      ),
      recordsPerPage: Number(
        settings.recordsPerPage
      ),
    };

    const record = {
      ...existing,
      departmentId: department.id,
      departmentName: department.name,
      preferences: cleanSettings,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const next = [
      ...latest.rows.filter(
        (row) =>
          text(row.departmentId) !== department.id
      ),
      record,
    ];

    try {
      localStorage.setItem(
        KEYS.settings,
        JSON.stringify(next)
      );

      setData((previous) => ({
        ...previous,
        settings: {
          rows: next,
          status: "available",
        },
      }));

      setSettings(cleanSettings);
      setDirty(false);
      setError("");
      setFeedback(
        "Department settings saved successfully."
      );
    } catch {
      setError(
        "Unable to save settings to browser storage."
      );
    }
  }

  function resetSettings() {
    if (!department) return;

    const confirmed = window.confirm(
      "Restore default settings for this department? You must save afterward to keep these defaults."
    );

    if (!confirmed) return;

    setSettings({
      ...DEFAULT_SETTINGS,
    });

    setDirty(true);
    setError("");
    setFeedback(
      "Default values restored in the editor. Click Save Changes to apply them."
    );
  }

  function discardChanges() {
    setSettings(
      getSettingsForDepartment(
        data.settings.rows,
        departmentId
      )
    );

    setDirty(false);
    setError("");
    setFeedback("Unsaved changes discarded.");
  }

  function exportSettings() {
    if (!department) return;

    const validationError = validateSettings(settings);

    if (validationError) {
      setError(validationError);
      return;
    }

    downloadJSON(
      `UniBee_HOD_Settings_${department.code || department.id}.json`,
      {
        application: "UniBee",
        module: "HOD Settings",
        departmentId: department.id,
        departmentName: department.name,
        exportedAt: new Date().toISOString(),
        saved: !dirty,
        preferences: settings,
      }
    );

    setFeedback(
      dirty
        ? "Current unsaved settings exported. Save Changes to persist them in the application."
        : "Department settings exported successfully."
    );
  }

  // ======================================
  // TAB CONFIGURATION
  // ======================================

  const tabs = [
    {
      id: "academic",
      name: "Academic Monitoring",
      icon: GraduationCap,
    },
    {
      id: "notifications",
      name: "Notifications",
      icon: Bell,
    },
    {
      id: "workspace",
      name: "Workspace",
      icon: Monitor,
    },
    {
      id: "data",
      name: "Data & Preferences",
      icon: Database,
    },
  ];

  const disabled = !department;

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-7">

      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            ACCOUNT & PREFERENCES
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            HOD Settings
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#718579]">
            Configure academic monitoring, department
            notifications and workspace preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshSettings}
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
              Department Preferences
            </h2>

            <p className="mt-1 text-xs text-[#718579]">
              Each department has separate saved settings.
            </p>
          </div>
        </div>

        <select
          aria-label="Select HOD department"
          value={department ? departmentId : ""}
          onChange={(event) =>
            changeDepartment(event.target.value)
          }
          disabled={
            data.departments.status !== "available"
          }
          className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm font-semibold text-[#234E43] outline-none focus:border-[#A6C1A4] sm:w-72"
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

      {/* NOTIFICATIONS */}
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
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {!department && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>
            Select an existing Admin Department
            before configuring HOD preferences.
          </p>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-6 text-white md:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[36px] border-white/5" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
            <ShieldCheck size={16} />
            DEPARTMENT WORKSPACE
          </div>

          <h2 className="mt-5 text-2xl font-extrabold md:text-3xl">
            {department?.name ||
              "Head of Department Settings"}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#D0E2D7]">
            Customize department academic monitoring
            and your HOD workspace. Official university
            records remain under Admin management.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold">
              {department?.code || "No Department Code"}
            </span>

            <span className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold">
              {dirty
                ? "Unsaved Changes"
                : "No Unsaved Changes"}
            </span>
          </div>
        </div>
      </section>

      {/* SETTINGS NAVIGATION */}
      <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">

        <aside className="self-start rounded-2xl border border-[#E2EADC] bg-white p-3 shadow-sm">
          <p className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-[#8AA092]">
            SETTINGS MENU
          </p>

          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-[#234E43] text-white"
                      : "text-[#607B6C] hover:bg-[#F6F8F3]"
                  }`}
                >
                  <Icon size={19} />

                  {tab.name}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">

          {/* ================================= */}
          {/* ACADEMIC MONITORING               */}
          {/* ================================= */}

          {activeTab === "academic" && (
            <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
              <SectionHeader
                icon={GraduationCap}
                title="Academic Monitoring"
                description="Configure thresholds used to identify academic performance and attendance concerns."
              />

              <div className="space-y-1">
                <NumberSetting
                  title="Minimum Attendance Threshold"
                  description="Students below this attendance percentage can be flagged for HOD review."
                  value={settings.attendanceThreshold}
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  disabled={disabled}
                  onChange={(value) =>
                    updateSetting(
                      "attendanceThreshold",
                      value
                    )
                  }
                />

                <NumberSetting
                  title="Academic Risk CGPA Threshold"
                  description="A CGPA below this threshold can trigger an academic performance warning."
                  value={settings.cgpaThreshold}
                  min={0}
                  max={4}
                  step={0.1}
                  suffix="/4"
                  disabled={disabled}
                  onChange={(value) =>
                    updateSetting(
                      "cgpaThreshold",
                      value
                    )
                  }
                />
              </div>

              <div className="mt-6 rounded-xl bg-[#F6F8F3] p-5">
                <div className="flex items-center gap-2">
                  <ClipboardCheck
                    size={20}
                    className="text-[#234E43]"
                  />

                  <h3 className="text-sm font-bold text-[#234E43]">
                    Current Monitoring Thresholds
                  </h3>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-[#718579]">
                      Attendance
                    </p>

                    <p className="mt-2 text-2xl font-extrabold text-[#234E43]">
                      {settings.attendanceThreshold}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-[#718579]">
                      Academic Risk CGPA
                    </p>

                    <p className="mt-2 text-2xl font-extrabold text-[#234E43]">
                      {Number(
                        settings.cgpaThreshold
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-5 flex items-start gap-2 text-xs leading-6 text-[#718579]">
                <Info
                  size={17}
                  className="mt-0.5 shrink-0"
                />

                These are demo monitoring preferences,
                not official university academic
                policies. The HOD Attendance and
                Performance pages currently have
                their own default thresholds.
                We'll connect them to these settings
                during final integration.
              </p>
            </section>
          )}

          {/* ================================= */}
          {/* NOTIFICATION SETTINGS            */}
          {/* ================================= */}

          {activeTab === "notifications" && (
            <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
              <SectionHeader
                icon={Bell}
                title="Notification Preferences"
                description="Choose which department activities should generate future HOD alerts."
              />

              <SettingToggle
                icon={ClipboardCheck}
                title="Low Attendance Alerts"
                description="Notify the HOD when attendance falls below the configured threshold."
                checked={settings.attendanceAlerts}
                disabled={disabled}
                onChange={(value) =>
                  updateSetting(
                    "attendanceAlerts",
                    value
                  )
                }
              />

              <SettingToggle
                icon={GraduationCap}
                title="Academic Risk Alerts"
                description="Receive alerts for students requiring academic performance review."
                checked={settings.academicRiskAlerts}
                disabled={disabled}
                onChange={(value) =>
                  updateSetting(
                    "academicRiskAlerts",
                    value
                  )
                }
              />

              <SettingToggle
                icon={Clock3}
                title="Pending Approval Alerts"
                description="Receive notifications for new academic requests awaiting review."
                checked={settings.pendingApprovalAlerts}
                disabled={disabled}
                onChange={(value) =>
                  updateSetting(
                    "pendingApprovalAlerts",
                    value
                  )
                }
              />

              <SettingToggle
                icon={BookOpen}
                title="Course Allocation Alerts"
                description="Monitor changes to faculty course allocations."
                checked={settings.courseAllocationAlerts}
                disabled={disabled}
                onChange={(value) =>
                  updateSetting(
                    "courseAllocationAlerts",
                    value
                  )
                }
              />

              <SettingToggle
                icon={CalendarDays}
                title="Schedule Conflict Alerts"
                description="Receive warnings about overlapping classes, faculty assignments and rooms."
                checked={settings.scheduleConflictAlerts}
                disabled={disabled}
                onChange={(value) =>
                  updateSetting(
                    "scheduleConflictAlerts",
                    value
                  )
                }
              />

              <SettingToggle
                icon={Bell}
                title="Department Notice Alerts"
                description="Receive notifications about newly published department announcements."
                checked={settings.departmentNoticeAlerts}
                disabled={disabled}
                onChange={(value) =>
                  updateSetting(
                    "departmentNoticeAlerts",
                    value
                  )
                }
              />

              <SettingToggle
                icon={Mail}
                title="Email Notifications"
                description="Preference for future email notification integration. Email sending is not available in this frontend demo."
                checked={settings.emailNotifications}
                disabled={disabled}
                onChange={(value) =>
                  updateSetting(
                    "emailNotifications",
                    value
                  )
                }
              />
            </section>
          )}

          {/* ================================= */}
          {/* WORKSPACE SETTINGS               */}
          {/* ================================= */}

          {activeTab === "workspace" && (
            <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
              <SectionHeader
                icon={Palette}
                title="Workspace Preferences"
                description="Configure the preferred layout and display of your HOD workspace."
              />

              <SettingToggle
                icon={Monitor}
                title="Compact Dashboard Layout"
                description="Preference for a more condensed dashboard with reduced spacing."
                checked={settings.dashboardCompact}
                disabled={disabled}
                onChange={(value) =>
                  updateSetting(
                    "dashboardCompact",
                    value
                  )
                }
              />

              <SettingToggle
                icon={SlidersHorizontal}
                title="Show Quick Actions"
                description="Display frequently used academic management shortcuts on the dashboard."
                checked={settings.showQuickActions}
                disabled={disabled}
                onChange={(value) =>
                  updateSetting(
                    "showQuickActions",
                    value
                  )
                }
              />

              <div className="grid gap-5 border-t border-[#EDF1EB] pt-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#234E43]">
                    Default Schedule View
                  </span>

                  <select
                    value={settings.defaultScheduleView}
                    onChange={(event) =>
                      updateSetting(
                        "defaultScheduleView",
                        event.target.value
                      )
                    }
                    disabled={disabled}
                    className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] disabled:opacity-50"
                  >
                    <option value="week">
                      Weekly View
                    </option>

                    <option value="day">
                      Daily View
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#234E43]">
                    Preferred Starting Day
                  </span>

                  <select
                    value={settings.preferredStartDay}
                    onChange={(event) =>
                      updateSetting(
                        "preferredStartDay",
                        event.target.value
                      )
                    }
                    disabled={disabled}
                    className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] disabled:opacity-50"
                  >
                    {WEEK_DAYS.map((day) => (
                      <option
                        key={day}
                        value={day}
                      >
                        {day}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#234E43]">
                    Preferred Records Per Page
                  </span>

                  <select
                    value={settings.recordsPerPage}
                    onChange={(event) =>
                      updateSetting(
                        "recordsPerPage",
                        Number(event.target.value)
                      )
                    }
                    disabled={disabled}
                    className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43] disabled:opacity-50"
                  >
                    {[5, 10, 15, 20, 25, 50].map(
                      (number) => (
                        <option
                          key={number}
                          value={number}
                        >
                          {number} Records
                        </option>
                      )
                    )}
                  </select>
                </label>
              </div>

              <div className="mt-6 rounded-xl bg-[#F6F8F3] p-4">
                <p className="text-sm font-bold text-[#234E43]">
                  Bee & Sage Theme
                </p>

                <div className="mt-4 flex items-center gap-3">
                  {[
                    "#234E43",
                    "#A6C1A4",
                    "#D9A536",
                    "#F6F8F3",
                  ].map((color) => (
                    <div
                      key={color}
                      className="h-10 w-10 rounded-xl border border-black/10"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                <p className="mt-3 text-xs leading-6 text-[#718579]">
                  UniBee's existing theme remains
                  unchanged. Workspace display preferences
                  will take effect after integration
                  with the other HOD components.
                </p>
              </div>
            </section>
          )}

          {/* ================================= */}
          {/* DATA & RESET                     */}
          {/* ================================= */}

          {activeTab === "data" && (
            <section className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm md:p-6">
              <SectionHeader
                icon={Database}
                title="Data & Preferences"
                description="Export, restore and review department workspace settings."
              />

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#F6F8F3] p-5">
                  <div>
                    <p className="text-sm font-bold text-[#234E43]">
                      Export Current Settings
                    </p>

                    <p className="mt-2 text-xs leading-6 text-[#718579]">
                      Download a JSON backup of
                      this department's current preferences.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={exportSettings}
                    disabled={disabled}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                  >
                    <Download size={17} />
                    Export JSON
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#F6F8F3] p-5">
                  <div>
                    <p className="text-sm font-bold text-[#234E43]">
                      Restore Default Settings
                    </p>

                    <p className="mt-2 text-xs leading-6 text-[#718579]">
                      Reset the preference editor
                      to UniBee's default values.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetSettings}
                    disabled={disabled}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 disabled:opacity-40"
                  >
                    <RotateCcw size={17} />
                    Restore Defaults
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-[#E2EADC] p-5">
                <h3 className="text-sm font-bold text-[#234E43]">
                  Storage Information
                </h3>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-[#718579]">
                      Storage Type
                    </span>

                    <span className="font-semibold text-[#234E43]">
                      Browser LocalStorage
                    </span>
                  </div>

                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-[#718579]">
                      Settings Key
                    </span>

                    <code className="break-all text-xs text-[#234E43]">
                      {KEYS.settings}
                    </code>
                  </div>

                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-[#718579]">
                      Source Status
                    </span>

                    <span className="font-semibold text-[#234E43]">
                      {data.settings.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-[#718579]">
                      Selected Department
                    </span>

                    <span className="font-semibold text-[#234E43]">
                      {department?.name || "None"}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ================================= */}
          {/* SAVE ACTIONS                     */}
          {/* ================================= */}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-bold text-[#234E43]">
                {dirty
                  ? "Unsaved Preferences"
                  : "Workspace Preferences"}
              </p>

              <p className="mt-1 text-xs text-[#718579]">
                {dirty
                  ? "Save your changes to keep them after refreshing."
                  : "Make changes to update your preferences."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {dirty && (
                <button
                  type="button"
                  onClick={discardChanges}
                  className="rounded-xl border border-[#E2EADC] px-4 py-3 text-sm font-bold text-[#234E43]"
                >
                  Discard
                </button>
              )}

              <button
                type="button"
                disabled={
                  disabled ||
                  data.settings.status === "invalid" ||
                  !dirty
                }
                onClick={saveSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save size={17} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* IMPORTANT INFORMATION */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <Info
          size={19}
          className="mt-0.5 shrink-0"
        />

        <p>
          <strong>Frontend Demo:</strong> Settings
          are stored under{" "}
          <code>unibee-hod-settings-v1</code>,
          separately for each department.
          Notification toggles only save preferences;
          they do not yet trigger messages or emails.
          Monitoring thresholds, dashboard layout and
          scheduling preferences will be connected
          to the relevant HOD modules during final
          integration. This page never deletes
          Student, Faculty, Admin, Library or
          academic records.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Head of Department Portal —
        Workspace Settings
      </p>
    </div>
  );
}
