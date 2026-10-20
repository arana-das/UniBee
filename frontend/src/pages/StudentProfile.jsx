
import { useMemo, useState } from "react";
import {
  UserRound,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  ShieldCheck,
  Pencil,
  Save,
  X,
  Camera,
  BookOpen,
  IdCard,
  CheckCircle2,
  School,
  AlertCircle,
} from "lucide-react";

const initialProfile = {
  name: "Ariana Rahman",
  studentId: "202312045",
  email: "ariana.rahman@student.unibee.edu",
  phone: "01712345678",
  department: "Information and Communication Technology",
  program: "Bachelor of Science in ICT",
  batch: "2023",
  semester: "6th Semester",
  section: "A",
  bloodGroup: "B+",
  dateOfBirth: "2003-05-18",
  gender: "Female",
  address: "Dhaka, Bangladesh",
  guardian: "Md. Rahman",
  emergencyContact: "01812345678",
  bio: "Passionate about technology, research, and building meaningful digital solutions.",
};

const editableFields = [
  { key: "name", label: "Full Name", type: "text" },
  { key: "phone", label: "Phone Number", type: "tel" },
  { key: "dateOfBirth", label: "Date of Birth", type: "date" },
  { key: "gender", label: "Gender", type: "select" },
  { key: "bloodGroup", label: "Blood Group", type: "select" },
  { key: "address", label: "Present Address", type: "text" },
  { key: "guardian", label: "Guardian Name", type: "text" },
  { key: "emergencyContact", label: "Emergency Contact", type: "tel" },
];

const fieldLabels = {
  name: "Full Name",
  studentId: "Student ID",
  email: "University Email",
  phone: "Phone Number",
  department: "Department",
  program: "Program",
  batch: "Batch",
  semester: "Semester",
  section: "Section",
  bloodGroup: "Blood Group",
  dateOfBirth: "Date of Birth",
  gender: "Gender",
  address: "Address",
  guardian: "Guardian",
  emergencyContact: "Emergency Contact",
  bio: "About Me",
};

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#EDF1EB] bg-[#FAFCF9] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#477764]">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-[#8A9F90]">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-[#234E43]">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

function StudentProfile() {
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [avatar, setAvatar] = useState("");

  const completion = useMemo(() => {
    const values = Object.values(profile);
    const filled = values.filter((value) =>
      String(value).trim()
    ).length;

    return Math.round((filled / values.length) * 100);
  }, [profile]);

  const initials = profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const startEditing = () => {
    setDraft({ ...profile });
    setEditing(true);
    setNotice("");
  };

  const cancelEditing = () => {
    setDraft({ ...profile });
    setEditing(false);
  };

  const saveProfile = (event) => {
    event.preventDefault();

    if (!draft.name.trim()) return;

    setProfile({
      ...draft,
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      guardian: draft.guardian.trim(),
      emergencyContact: draft.emergencyContact.trim(),
      bio: draft.bio.trim(),
    });

    setEditing(false);

    setNotice(
      "Demo profile updated successfully. Changes are stored only in this page and will reset after refresh."
    );
  };

  const changeAvatar = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotice("Please choose a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setNotice("Profile image must be smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
        setNotice(
          "Demo profile photo updated. The image has not been uploaded to a server."
        );
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            STUDENT ACCOUNT
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            My Profile
          </h1>

          <p className="mt-3 text-[#718579]">
            View your academic identity and manage your personal details.
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657]"
          >
            <Pencil size={18} />
            Edit Profile
          </button>
        )}
      </div>

      {/* Status Message */}
      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-[#DCE8DA] bg-[#F1F7EF] p-4 text-sm text-[#45685B]"
        >
          <p>{notice}</p>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Profile Banner */}
      <section className="overflow-hidden rounded-3xl border border-[#E2EADC] bg-white shadow-sm">
        <div className="relative h-36 bg-[#234E43] sm:h-44">
          <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full border-[45px] border-white/5" />
          <div className="absolute right-8 top-8 text-xs font-bold tracking-[0.2em] text-[#D9A536]">
            UNIBEE STUDENT
          </div>
        </div>

        <div className="relative px-6 pb-7 md:px-8">
          <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative w-fit">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-[5px] border-white bg-[#A6C1A4] text-3xl font-extrabold text-[#234E43] shadow-lg">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Student profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <label
                title="Change profile photo"
                className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-4 border-white bg-[#D9A536] text-[#234E43]"
              >
                <Camera size={17} />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={changeAvatar}
                  aria-label="Change profile photo"
                  className="sr-only"
                />
              </label>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#EAF2E8] px-4 py-2 text-xs font-bold text-[#427A67]">
              <CheckCircle2 size={16} />
              Demo Student Account
            </span>
          </div>

          <div className="mt-5">
            <h2 className="text-2xl font-extrabold text-[#234E43] md:text-3xl">
              {profile.name}
            </h2>

            <p className="mt-2 text-sm text-[#718579]">
              {profile.department}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full bg-[#F1F7EF] px-4 py-2 text-xs font-bold text-[#45685B]">
                ID: {profile.studentId}
              </span>

              <span className="rounded-full bg-[#FFF4DC] px-4 py-2 text-xs font-bold text-[#A57921]">
                {profile.semester}
              </span>

              <span className="rounded-full bg-[#EAF0F8] px-4 py-2 text-xs font-bold text-[#456A94]">
                Batch {profile.batch}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Completion */}
        <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#234E43]">
            Profile Completion
          </h3>

          <p className="mt-2 text-sm text-[#718579]">
            Keep your information updated.
          </p>

          <div className="mt-7 flex items-center justify-center">
            <div
              className="flex h-40 w-40 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#234E43 ${completion}%, #EAF2E8 ${completion}% 100%)`,
              }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-4xl font-extrabold text-[#234E43]">
                  {completion}%
                </span>
                <span className="mt-1 text-xs text-[#8A9F90]">
                  Complete
                </span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[#8A9F90]">
            Based on completed demo profile fields.
          </p>
        </section>

        {/* Academic Snapshot */}
        <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-6 text-lg font-bold text-[#234E43]">
            Academic Snapshot
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoItem
              icon={IdCard}
              label="Student ID"
              value={profile.studentId}
            />
            <InfoItem
              icon={GraduationCap}
              label="Program"
              value={profile.program}
            />
            <InfoItem
              icon={School}
              label="Department"
              value={profile.department}
            />
            <InfoItem
              icon={BookOpen}
              label="Current Semester"
              value={profile.semester}
            />
          </div>
        </section>
      </div>

      {/* Details */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Personal Information */}
        <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm md:p-7">
          <div className="mb-6 flex items-center gap-3">
            <UserRound size={22} className="text-[#477764]" />
            <h3 className="text-xl font-bold text-[#234E43]">
              Personal Information
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoItem icon={UserRound} label="Full Name" value={profile.name} />
            <InfoItem icon={CalendarDays} label="Date of Birth" value={profile.dateOfBirth} />
            <InfoItem icon={UserRound} label="Gender" value={profile.gender} />
            <InfoItem icon={ShieldCheck} label="Blood Group" value={profile.bloodGroup} />
            <InfoItem icon={Phone} label="Phone Number" value={profile.phone} />
            <InfoItem icon={MapPin} label="Present Address" value={profile.address} />
          </div>
        </section>

        {/* Contact & Academic */}
        <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm md:p-7">
          <div className="mb-6 flex items-center gap-3">
            <Mail size={22} className="text-[#477764]" />
            <h3 className="text-xl font-bold text-[#234E43]">
              Contact & Academic Details
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoItem icon={Mail} label="University Email" value={profile.email} />
            <InfoItem icon={GraduationCap} label="Batch" value={profile.batch} />
            <InfoItem icon={BookOpen} label="Section" value={profile.section} />
            <InfoItem icon={UserRound} label="Guardian" value={profile.guardian} />
            <InfoItem icon={Phone} label="Emergency Contact" value={profile.emergencyContact} />
            <InfoItem icon={ShieldCheck} label="Student Status" value="Active (Demo)" />
          </div>
        </section>
      </div>

      {/* About Me */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-7 shadow-sm">
        <h3 className="text-xl font-bold text-[#234E43]">
          About Me
        </h3>

        <p className="mt-4 leading-8 text-[#607B6C]">
          {profile.bio || "No biography added yet."}
        </p>
      </section>

      {/* Edit Profile Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={cancelEditing}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  PERSONAL DETAILS
                </p>
                <h2
                  id="edit-profile-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  Edit Student Profile
                </h2>
              </div>

              <button
                type="button"
                onClick={cancelEditing}
                aria-label="Close profile editor"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={saveProfile} className="mt-7 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {editableFields.map((field) => (
                  <div key={field.key}>
                    <label
                      htmlFor={`profile-${field.key}`}
                      className="mb-2 block text-sm font-semibold text-[#234E43]"
                    >
                      {field.label}
                    </label>

                    {field.type === "select" ? (
                      <select
                        id={`profile-${field.key}`}
                        value={draft[field.key]}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            [field.key]: event.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#234E43]"
                      >
                        {(field.key === "gender"
                          ? ["Female", "Male", "Other", "Prefer not to say"]
                          : ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
                        ).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`profile-${field.key}`}
                        type={field.type}
                        value={draft[field.key]}
                        required={field.key === "name"}
                        maxLength={field.type === "tel" ? 20 : 150}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            [field.key]: event.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label
                  htmlFor="profile-bio"
                  className="mb-2 block text-sm font-semibold text-[#234E43]"
                >
                  About Me
                </label>

                <textarea
                  id="profile-bio"
                  rows={4}
                  maxLength={500}
                  value={draft.bio}
                  onChange={(event) =>
                    setDraft({ ...draft, bio: event.target.value })
                  }
                  placeholder="Write a short introduction..."
                  className="w-full resize-none rounded-xl border border-[#E2EADC] px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
                />
              </div>

              <div className="rounded-xl bg-[#FFF9E9] p-4 text-xs leading-relaxed text-[#80651E]">
                Student ID, university email, department, and
                academic program are read-only in this prototype.
                Any edits are local demonstrations only.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="flex-1 rounded-xl border border-[#DCE8DA] px-5 py-3.5 font-bold text-[#234E43]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white hover:bg-[#326657]"
                >
                  <Save size={18} />
                  Save Changes (Demo)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="rounded-2xl border border-[#E9DCAE] bg-[#FFF9E9] p-5 text-sm leading-relaxed text-[#80651E]">
        This page uses fictional student information for demonstration.
        Profile updates and selected photos are stored in browser memory only.
        They are not saved to MongoDB and will reset after refreshing.
      </div>

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — My Profile
      </div>
    </div>
  );
}

export default StudentProfile;
