
import { useState } from "react";
import {
  Settings,
  Bell,
  ShieldCheck,
  LockKeyhole,
  Palette,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Mail,
  Smartphone,
  BookOpen,
  CalendarDays,
  Megaphone,
  Moon,
  Sun,
  Monitor,
  UserRound,
} from "lucide-react";

// Demonstration settings. Backend integration will follow.
const defaultSettings = {
  emailNotifications: true,
  assignmentAlerts: true,
  academicNotices: true,
  eventReminders: false,
  messageAlerts: true,
  weeklySummary: false,
  profileVisibility: "university",
  showEmail: false,
  showPhone: false,
  appearance: "light",
  compactMode: false,
};

function SettingSwitch({ label, description, checked, onChange, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#EDF1EB] py-5 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#477764]">
          <Icon size={20} />
        </div>

        <div>
          <p className="font-semibold text-[#234E43]">{label}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#718579]">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-[#234E43]" : "bg-[#CBD5CE]"
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

function StudentSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState("notifications");
  const [notice, setNotice] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const updateSetting = (key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
    setNotice("");
  };

  const saveSettings = () => {
    setNotice(
      "Demo settings saved in this page. No account preferences have been updated on a server."
    );
  };

  const resetSettings = () => {
    setSettings({ ...defaultSettings });
    setNotice("Default demo settings restored.");
  };

  const handlePasswordChange = (event) => {
    event.preventDefault();
    setPasswordError("");

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setNotice(
      "Demo validation successful. Your actual account password has NOT been changed."
    );
  };

  const tabs = [
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: ShieldCheck },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "security", label: "Security", icon: LockKeyhole },
  ];

  const appearanceOptions = [
    { id: "light", label: "Light Mode", icon: Sun },
    { id: "dark", label: "Dark Mode", icon: Moon },
    { id: "system", label: "System Default", icon: Monitor },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
          STUDENT ACCOUNT
        </p>

        <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
          Account Settings
        </h1>

        <p className="mt-3 text-[#718579]">
          Customize your UniBee experience and manage your
          account preferences.
        </p>
      </div>

      {/* Account Overview */}
      <section className="flex flex-col gap-5 rounded-3xl bg-[#234E43] p-7 text-white sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#A6C1A4] text-2xl font-extrabold text-[#234E43]">
          AR
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-bold">
            Ariana Rahman
          </h2>

          <p className="mt-1 text-sm text-[#C9DDCF]">
            ariana.rahman@student.unibee.edu
          </p>

          <p className="mt-2 text-xs text-[#E8BE62]">
            Student Account · Demonstration
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
          <ShieldCheck size={17} className="text-[#D9A536]" />
          Account Preferences
        </div>
      </section>

      {/* Status Notice */}
      {notice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-[#DCE8DA] bg-[#F1F7EF] p-5 text-sm text-[#45685B]"
        >
          <CheckCircle2 size={20} className="shrink-0 text-[#477764]" />
          <p>{notice}</p>
        </div>
      )}

      {/* Settings Layout */}
      <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* Settings Navigation */}
        <nav className="rounded-2xl border border-[#E2EADC] bg-white p-3 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setNotice("");
                  setPasswordError("");
                }}
                className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[#234E43] text-white"
                    : "text-[#607B6C] hover:bg-[#F1F7EF]"
                }`}
              >
                <Icon size={19} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Main Settings Content */}
        <section className="min-w-0 rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm md:p-8">

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <div>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-[#234E43]">
                  Notification Preferences
                </h2>

                <p className="mt-2 text-sm text-[#718579]">
                  Choose which academic and campus notifications
                  you would like to receive.
                </p>
              </div>

              <SettingSwitch
                icon={Mail}
                label="Email Notifications"
                description="Allow UniBee to send important updates to your university email."
                checked={settings.emailNotifications}
                onChange={(value) =>
                  updateSetting("emailNotifications", value)
                }
              />

              <SettingSwitch
                icon={BookOpen}
                label="Assignment Alerts"
                description="Receive reminders about assignment deadlines and updates."
                checked={settings.assignmentAlerts}
                onChange={(value) =>
                  updateSetting("assignmentAlerts", value)
                }
              />

              <SettingSwitch
                icon={Megaphone}
                label="Academic Notices"
                description="Get notifications about examinations, results, and academic announcements."
                checked={settings.academicNotices}
                onChange={(value) =>
                  updateSetting("academicNotices", value)
                }
              />

              <SettingSwitch
                icon={CalendarDays}
                label="Event Reminders"
                description="Stay informed about upcoming campus events and club activities."
                checked={settings.eventReminders}
                onChange={(value) =>
                  updateSetting("eventReminders", value)
                }
              />

              <SettingSwitch
                icon={Smartphone}
                label="Message Alerts"
                description="Show notifications for messages from faculty and university offices."
                checked={settings.messageAlerts}
                onChange={(value) =>
                  updateSetting("messageAlerts", value)
                }
              />

              <SettingSwitch
                icon={Bell}
                label="Weekly Academic Summary"
                description="Receive a weekly overview of your academic activities."
                checked={settings.weeklySummary}
                onChange={(value) =>
                  updateSetting("weeklySummary", value)
                }
              />
            </div>
          )}

          {/* Privacy Settings */}
          {activeTab === "privacy" && (
            <div>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-[#234E43]">
                  Privacy Preferences
                </h2>

                <p className="mt-2 text-sm text-[#718579]">
                  Manage the visibility of your personal profile information.
                </p>
              </div>

              <div className="mb-7">
                <label
                  htmlFor="profile-visibility"
                  className="mb-3 block font-semibold text-[#234E43]"
                >
                  Profile Visibility
                </label>

                <select
                  id="profile-visibility"
                  value={settings.profileVisibility}
                  onChange={(event) =>
                    updateSetting("profileVisibility", event.target.value)
                  }
                  className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3.5 text-sm text-[#45685B] outline-none"
                >
                  <option value="university">University Members</option>
                  <option value="faculty">Faculty & Administration Only</option>
                  <option value="private">Private</option>
                </select>

                <p className="mt-3 text-xs text-[#8A9F90]">
                  Prototype setting. Visibility restrictions are not
                  enforced until authentication and backend rules are implemented.
                </p>
              </div>

              <SettingSwitch
                icon={Mail}
                label="Show Email Address"
                description="Allow permitted university members to see your email."
                checked={settings.showEmail}
                onChange={(value) =>
                  updateSetting("showEmail", value)
                }
              />

              <SettingSwitch
                icon={Smartphone}
                label="Show Phone Number"
                description="Allow permitted university members to see your phone number."
                checked={settings.showPhone}
                onChange={(value) =>
                  updateSetting("showPhone", value)
                }
              />

              <div className="mt-7 rounded-2xl border border-[#DCE8DA] bg-[#F1F7EF] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={22}
                    className="shrink-0 text-[#477764]"
                  />

                  <div>
                    <h3 className="font-bold text-[#234E43]">
                      Privacy Information
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-[#607B6C]">
                      These options are demonstration preferences.
                      Real profile visibility will require secure
                      backend authorization and access controls.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === "appearance" && (
            <div>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-[#234E43]">
                  Appearance Preferences
                </h2>

                <p className="mt-2 text-sm text-[#718579]">
                  Choose your preferred display settings.
                </p>
              </div>

              <h3 className="mb-4 font-semibold text-[#234E43]">
                Theme Preference
              </h3>

              <div className="grid gap-4 sm:grid-cols-3">
                {appearanceOptions.map((option) => {
                  const Icon = option.icon;
                  const active = settings.appearance === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        updateSetting("appearance", option.id)
                      }
                      aria-pressed={active}
                      className={`rounded-2xl border-2 p-5 text-left transition ${
                        active
                          ? "border-[#234E43] bg-[#F1F7EF]"
                          : "border-[#E2EADC] bg-white hover:border-[#A6C1A4]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon size={25} className="text-[#234E43]" />
                        {active && (
                          <CheckCircle2
                            size={19}
                            className="text-[#477764]"
                          />
                        )}
                      </div>

                      <p className="mt-5 text-sm font-bold text-[#234E43]">
                        {option.label}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-7">
                <SettingSwitch
                  icon={Monitor}
                  label="Compact Layout"
                  description="Choose whether you prefer a denser dashboard layout."
                  checked={settings.compactMode}
                  onChange={(value) =>
                    updateSetting("compactMode", value)
                  }
                />
              </div>

              <div className="mt-6 rounded-xl bg-[#FFF9E9] p-4 text-sm leading-relaxed text-[#80651E]">
                Theme and compact mode selections are currently
                saved as demo preferences only. Global visual
                theme switching will be added during layout integration.
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <div>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-[#234E43]">
                  Account Security
                </h2>

                <p className="mt-2 text-sm text-[#718579]">
                  Preview password validation in this frontend prototype.
                </p>
              </div>

              <div className="mb-7 flex items-start gap-3 rounded-xl border border-[#E9DCAE] bg-[#FFF9E9] p-5">
                <AlertCircle
                  size={22}
                  className="shrink-0 text-[#A57921]"
                />

                <p className="text-sm leading-relaxed text-[#80651E]">
                  This form does not authenticate or change passwords.
                  Use sample text only — do not enter a real password.
                </p>
              </div>

              <form
                onSubmit={handlePasswordChange}
                className="max-w-lg space-y-5"
              >
                {[
                  {
                    key: "currentPassword",
                    label: "Current Password (Demo)",
                  },
                  {
                    key: "newPassword",
                    label: "New Password (Demo)",
                  },
                  {
                    key: "confirmPassword",
                    label: "Confirm New Password (Demo)",
                  },
                ].map((field) => (
                  <div key={field.key}>
                    <label
                      htmlFor={field.key}
                      className="mb-2 block text-sm font-semibold text-[#234E43]"
                    >
                      {field.label}
                    </label>

                    <input
                      id={field.key}
                      type={showPasswords ? "text" : "password"}
                      autoComplete="off"
                      required
                      value={passwordForm[field.key]}
                      onChange={(event) =>
                        setPasswordForm((previous) => ({
                          ...previous,
                          [field.key]: event.target.value,
                        }))
                      }
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3.5 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="flex items-center gap-2 text-sm font-semibold text-[#477764]"
                >
                  {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                  {showPasswords ? "Hide Passwords" : "Show Passwords"}
                </button>

                {passwordError && (
                  <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    {passwordError}
                  </p>
                )}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657]"
                >
                  <LockKeyhole size={18} />
                  Validate Demo Password
                </button>
              </form>
            </div>
          )}

          {/* Save Actions */}
          {activeTab !== "security" && (
            <div className="mt-9 flex flex-wrap gap-3 border-t border-[#EDF1EB] pt-6">
              <button
                type="button"
                onClick={saveSettings}
                className="flex items-center gap-2 rounded-xl bg-[#234E43] px-6 py-3.5 font-bold text-white transition hover:bg-[#326657]"
              >
                <Save size={18} />
                Save Preferences (Demo)
              </button>

              <button
                type="button"
                onClick={resetSettings}
                className="flex items-center gap-2 rounded-xl border border-[#DCE8DA] px-6 py-3.5 font-bold text-[#234E43] hover:bg-[#F1F7EF]"
              >
                <RotateCcw size={18} />
                Reset Defaults
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Footer Notice */}
      <div className="rounded-2xl border border-[#E9DCAE] bg-[#FFF9E9] p-5 text-sm leading-relaxed text-[#80651E]">
        UniBee Account Settings currently uses frontend demonstration data.
        Preferences are stored in React state only and reset after refresh.
        Real notifications, privacy enforcement, theme application, and
        password management require backend integration.
      </div>

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Account Settings
      </div>
    </div>
  );
}

export default StudentSettings;
