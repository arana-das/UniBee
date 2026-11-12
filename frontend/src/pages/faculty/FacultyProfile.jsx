
import { useEffect, useRef, useState } from "react";
import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  BriefcaseBusiness,
  GraduationCap,
  BookOpen,
  Clock3,
  Camera,
  Pencil,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Award,
  Globe,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const PROFILE_API = `${API_BASE}/api/faculty/me`;

const EMPTY_PROFILE = {
  fullName: "",
  facultyId: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  qualification: "",
  specialization: "",
  experience: 0,
  office: "",
  officeHours: "",
  biography: "",
  teachingInterests: "",
  researchAreas: "",
  website: "",
  avatar: "",
};

const EDITABLE_FIELDS = [
  "phone",
  "office",
  "officeHours",
  "qualification",
  "specialization",
  "experience",
  "biography",
  "teachingInterests",
  "researchAreas",
  "website",
];

async function request(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in to your Faculty account.");
  }

  let response;

  try {
    response = await fetch(`${PROFILE_API}${path}`, {
      method: options.method || "GET",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Could not connect to UniBee backend.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.message ||
      `Request failed (${response.status}).`
    );
  }

  return result;
}

function getInitials(name) {
  return (
    String(name || "Faculty")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "F"
  );
}

// Resize before sending to the backend.
// Result stays within the existing Express JSON limit.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        file.type
      )
    ) {
      reject(new Error("Select a JPG, PNG, or WebP image."));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("Image must be smaller than 5 MB."));
      return;
    }

    const image = new Image();
    const objectURL = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectURL);

      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Image processing is unavailable."));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, 256, 256);

      // Crop to a centered square.
      const side = Math.min(image.width, image.height);
      const sourceX = (image.width - side) / 2;
      const sourceY = (image.height - side) / 2;

      context.drawImage(
        image,
        sourceX,
        sourceY,
        side,
        side,
        0,
        0,
        256,
        256
      );

      let output = "";

      for (const quality of [0.8, 0.65, 0.5, 0.35]) {
        output = canvas.toDataURL("image/jpeg", quality);

        if (output.length <= 80000) {
          resolve(output);
          return;
        }
      }

      reject(
        new Error(
          "Could not compress this picture enough. Try another image."
        )
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error("Could not read the selected image."));
    };

    image.src = objectURL;
  });
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#F6F8F3] p-4">
      <div className="rounded-lg bg-white p-2 text-[#234E43]">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
          {value === 0 ? "0" : value || "Not provided"}
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
  type = "text",
  readOnly = false,
}) {
  return (
    <div>
      <label
        htmlFor={`faculty-${name}`}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <input
        id={`faculty-${name}`}
        name={name}
        type={type}
        min={type === "number" ? 0 : undefined}
        max={type === "number" ? 70 : undefined}
        value={value ?? ""}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#234E43] ${
          readOnly
            ? "bg-slate-100 text-slate-500"
            : "bg-white"
        }`}
      />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  maxLength = 1000,
}) {
  return (
    <div>
      <label
        htmlFor={`faculty-${name}`}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <textarea
        id={`faculty-${name}`}
        name={name}
        rows={4}
        maxLength={maxLength}
        value={value || ""}
        onChange={onChange}
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
      />
    </div>
  );
}

export default function FacultyProfile() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [form, setForm] = useState(EMPTY_PROFILE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const result = await request("/profile", {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const next = {
          ...EMPTY_PROFILE,
          ...result.data,
        };

        setProfile(next);
        setForm(next);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => controller.abort();
  }, [refreshKey]);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFeedback("");
  };

  const startEditing = () => {
    setForm({ ...profile });
    setEditing(true);
    setError("");
    setFeedback("");
  };

  const cancelEditing = () => {
    setForm({ ...profile });
    setEditing(false);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (saving || uploading) return;

    setSaving(true);
    setError("");
    setFeedback("");

    try {
      const body = {};

      for (const field of EDITABLE_FIELDS) {
        body[field] = form[field] ?? "";
      }

      if (body.website) {
        const url = new URL(body.website);

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Website must be an HTTP or HTTPS URL.");
        }
      }

      const result = await request("/profile", {
        method: "PATCH",
        body,
      });

      const next = {
        ...EMPTY_PROFILE,
        ...result.data,
      };

      setProfile(next);
      setForm(next);
      setEditing(false);
      setFeedback("Profile saved successfully in MongoDB.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || uploading || saving) return;

    setUploading(true);
    setError("");
    setFeedback("");

    try {
      const avatar = await compressImage(file);

      const result = await request("/photo", {
        method: "PATCH",
        body: { avatar },
      });

      const savedAvatar = result.data.avatar;

      setProfile((previous) => ({
        ...previous,
        avatar: savedAvatar,
      }));

      setForm((previous) => ({
        ...previous,
        avatar: savedAvatar,
      }));

      setFeedback("Profile picture saved in MongoDB.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (saving || uploading) return;

    if (!window.confirm("Remove your profile picture?")) {
      return;
    }

    setUploading(true);
    setError("");
    setFeedback("");

    try {
      await request("/photo", {
        method: "PATCH",
        body: { avatar: "" },
      });

      setProfile((previous) => ({
        ...previous,
        avatar: "",
      }));

      setForm((previous) => ({
        ...previous,
        avatar: "",
      }));

      setFeedback("Profile picture removed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* PAGE HEADING */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Faculty Account
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            My Faculty Profile
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Your academic profile and picture are
            securely linked to your Faculty account.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setRefreshKey((value) => value + 1)
            }
            disabled={loading || saving || uploading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          {!editing && !loading && (
            <button
              type="button"
              onClick={startEditing}
              className="flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
            >
              <Pencil size={17} />
              Edit Profile
            </button>
          )}
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {feedback}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-14 text-sm text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          Loading faculty profile from MongoDB...
        </div>
      ) : (
        <>
          {/* PROFILE HEADER */}
          <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm">
            <div className="h-32 bg-[#234E43] md:h-40" />

            <div className="px-5 pb-6 md:px-8">
              <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-[#A6C1A4] text-2xl font-bold text-[#234E43] shadow-sm md:h-28 md:w-28">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt="Faculty profile picture"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(profile.fullName)
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={uploading || saving}
                    aria-label="Upload profile picture"
                    title="Change profile picture"
                    className="absolute -bottom-2 -right-2 rounded-xl bg-[#D9A536] p-2.5 text-[#234E43] shadow-sm disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <Camera size={18} />
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {profile.avatar && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    disabled={uploading || saving}
                    className="flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Remove Photo
                  </button>
                )}
              </div>

              <div className="mt-5">
                <h2 className="text-2xl font-extrabold text-[#234E43]">
                  {profile.fullName}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {profile.designation}
                  {" · "}
                  {profile.department}
                </p>

                <p className="mt-2 text-xs font-semibold text-[#477764]">
                  Faculty ID: {profile.facultyId}
                </p>
              </div>
            </div>
          </section>

          {!editing ? (
            <>
              {/* PERSONAL INFORMATION */}
              <section className="rounded-2xl border border-[#234E43]/10 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-bold text-[#234E43]">
                  Personal Information
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoItem
                    icon={UserRound}
                    label="Full Name"
                    value={profile.fullName}
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

                  <InfoItem
                    icon={MapPin}
                    label="Office Location"
                    value={profile.office}
                  />

                  <InfoItem
                    icon={Clock3}
                    label="Office Hours"
                    value={profile.officeHours}
                  />

                  <InfoItem
                    icon={Building2}
                    label="Department"
                    value={profile.department}
                  />
                </div>
              </section>

              {/* ACADEMIC INFORMATION */}
              <section className="rounded-2xl border border-[#234E43]/10 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-bold text-[#234E43]">
                  Academic Information
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoItem
                    icon={BriefcaseBusiness}
                    label="Designation"
                    value={profile.designation}
                  />

                  <InfoItem
                    icon={GraduationCap}
                    label="Qualification"
                    value={profile.qualification}
                  />

                  <InfoItem
                    icon={BookOpen}
                    label="Specialization"
                    value={profile.specialization}
                  />

                  <InfoItem
                    icon={Award}
                    label="Teaching Experience"
                    value={`${profile.experience} Years`}
                  />
                </div>
              </section>

              {/* PROFESSIONAL OVERVIEW */}
              <section className="rounded-2xl border border-[#234E43]/10 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-bold text-[#234E43]">
                  Professional Overview
                </h2>

                <div className="space-y-5">
                  <div>
                    <h3 className="font-semibold text-[#234E43]">
                      Biography
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {profile.biography ||
                        "No biography added."}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#234E43]">
                      Teaching Interests
                    </h3>

                    <p className="mt-2 text-sm text-slate-600">
                      {profile.teachingInterests ||
                        "Not provided"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#234E43]">
                      Research Areas
                    </h3>

                    <p className="mt-2 text-sm text-slate-600">
                      {profile.researchAreas ||
                        "Not provided"}
                    </p>
                  </div>

                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-[#234E43]">
                      <Globe size={17} />
                      Website
                    </h3>

                    {profile.website ? (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block break-all text-sm text-[#477764] underline"
                      >
                        {profile.website}
                      </a>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Not provided
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </>
          ) : (
            /* EDIT FORM */
            <form onSubmit={handleSave} className="space-y-6">
              <section className="rounded-2xl border border-[#234E43]/10 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-bold text-[#234E43]">
                  Personal Information
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Full Name (Admin controlled)"
                    name="fullName"
                    value={form.fullName}
                    readOnly
                  />

                  <FormField
                    label="Faculty ID (Admin controlled)"
                    name="facultyId"
                    value={form.facultyId}
                    readOnly
                  />

                  <FormField
                    label="Email (Admin controlled)"
                    name="email"
                    value={form.email}
                    readOnly
                  />

                  <FormField
                    label="Department (Admin controlled)"
                    name="department"
                    value={form.department}
                    readOnly
                  />

                  <FormField
                    label="Phone Number"
                    name="phone"
                    value={form.phone}
                    onChange={updateField}
                  />

                  <FormField
                    label="Office Location"
                    name="office"
                    value={form.office}
                    onChange={updateField}
                  />

                  <FormField
                    label="Office Hours"
                    name="officeHours"
                    value={form.officeHours}
                    onChange={updateField}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-[#234E43]/10 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-bold text-[#234E43]">
                  Academic Information
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Designation (Admin controlled)"
                    name="designation"
                    value={form.designation}
                    readOnly
                  />

                  <FormField
                    label="Qualification"
                    name="qualification"
                    value={form.qualification}
                    onChange={updateField}
                  />

                  <FormField
                    label="Specialization"
                    name="specialization"
                    value={form.specialization}
                    onChange={updateField}
                  />

                  <FormField
                    label="Experience in Years"
                    name="experience"
                    type="number"
                    value={form.experience}
                    onChange={updateField}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-[#234E43]/10 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-bold text-[#234E43]">
                  Professional Overview
                </h2>

                <div className="space-y-4">
                  <TextAreaField
                    label="Biography"
                    name="biography"
                    value={form.biography}
                    maxLength={2000}
                    onChange={updateField}
                  />

                  <TextAreaField
                    label="Teaching Interests"
                    name="teachingInterests"
                    value={form.teachingInterests}
                    onChange={updateField}
                  />

                  <TextAreaField
                    label="Research Areas"
                    name="researchAreas"
                    value={form.researchAreas}
                    onChange={updateField}
                  />

                  <FormField
                    label="Professional Website"
                    name="website"
                    type="url"
                    value={form.website}
                    onChange={updateField}
                  />
                </div>
              </section>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancelEditing}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600"
                >
                  <X size={18} />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#234E43] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={18} />
                  )}

                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-slate-400">
            UniBee Faculty Profile · MongoDB
          </p>
        </>
      )}
    </div>
  );
}
