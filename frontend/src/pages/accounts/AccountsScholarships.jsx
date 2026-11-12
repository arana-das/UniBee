
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  GraduationCap,
  Plus,
  Search,
  Pencil,
  Eye,
  X,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
  RotateCcw,
  Database,
  Wallet,
  BadgePercent,
  UserRound,
  ShieldCheck,
  Ban,
} from "lucide-react";

import {
  getStudentFees,
  getFinanceStudents,
  getStudentScholarships,
  createStudentScholarship,
  updateStudentScholarship,
  cancelStudentScholarship,
} from "../../services/financeApi";

const SCHOLARSHIP_TYPES = [
  "Merit Scholarship",
  "Need-Based Scholarship",
  "Tuition Fee Waiver",
  "Academic Excellence Award",
  "Sports Scholarship",
  "Research Scholarship",
  "Special Financial Assistance",
  "Other",
];

const STATUSES = [
  "Pending",
  "Under Review",
  "Approved",
  "Rejected",
  "Cancelled",
];

const EMPTY_FORM = {
  feeId: "",
  scholarshipType: "Merit Scholarship",
  scholarshipName: "",
  applicationDate: "",
  waiverType: "Percentage",
  waiverValue: "",
  status: "Pending",
  notes: "",
};

function todayLocal() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function idOf(item) {
  return String(item?._id || item?.id || "");
}

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";

  const raw = String(value);

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T12:00:00`
      : raw
  );

  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function calculateAward(record) {
  const tuition = Math.max(
    0,
    Number(record.tuitionAmount || 0)
  );

  const waiver = Math.max(
    0,
    Number(record.waiverValue || 0)
  );

  if (record.waiverType === "Percentage") {
    return Math.min(
      tuition,
      Math.round(tuition * waiver) / 100
    );
  }

  return Math.min(tuition, waiver);
}

function Badge({ status }) {
  const colors = {
    Pending: "bg-amber-50 text-amber-700",
    "Under Review": "bg-blue-50 text-blue-700",
    Approved: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-rose-50 text-rose-700",
    Cancelled: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        colors[status] || colors.Pending
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#718579]">
            {title}
          </p>

          <h3 className="mt-3 text-2xl font-extrabold text-[#234E43]">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-[#718579]">
        {subtitle}
      </p>
    </div>
  );
}

export default function AccountsScholarships() {
  const [scholarships, setScholarships] = useState([]);
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    applicationDate: todayLocal(),
  });

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function refreshData() {
    setLoading(true);

    try {
      const [scholarshipData, feeData, studentData] =
        await Promise.all([
          getStudentScholarships(),
          getStudentFees(),
          getFinanceStudents(),
        ]);

      const feeRows = Array.isArray(feeData)
        ? feeData
        : [];

      const studentRows = Array.isArray(studentData)
        ? studentData
        : [];

      const studentMap = new Map(
        studentRows.map((student) => [
          student.studentId,
          student,
        ])
      );

      const feeMap = new Map(
        feeRows.map((fee) => [idOf(fee), fee])
      );

      const rows = (
        Array.isArray(scholarshipData)
          ? scholarshipData
          : []
      ).map((record) => {
        const feeId = String(
          record.fee?._id ||
          record.fee ||
          ""
        );

        const student = studentMap.get(
          record.studentId
        );

        const fee = feeMap.get(feeId);

        return {
          ...record,
          id: idOf(record),
          feeId,
          studentName:
            record.studentName ||
            student?.fullName ||
            record.studentId,
          department:
            student?.department ||
            record.department ||
            "",
          semester:
            record.semester ||
            fee?.semester ||
            "",
          tuitionAmount: Number(
            record.tuitionAmount || 0
          ),
          waiverValue: Number(
            record.waiverValue || 0
          ),
          approvedAmount: Number(
            record.approvedAmount || 0
          ),
        };
      });

      setScholarships(rows);
      setFees(feeRows);
      setStudents(studentRows);
      setError("");
    } catch (err) {
      setError(
        err.message ||
        "Could not load scholarships from MongoDB."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  const summary = useMemo(() => {
    const approved = scholarships.filter(
      (item) => item.status === "Approved"
    );

    return {
      total: scholarships.length,
      approved: approved.length,
      pending: scholarships.filter(
        (item) =>
          item.status === "Pending" ||
          item.status === "Under Review"
      ).length,
      awardedAmount: approved.reduce(
        (sum, item) =>
          sum + Number(item.approvedAmount || 0),
        0
      ),
    };
  }, [scholarships]);

  const stats = [
    {
      title: "Total Applications",
      value: summary.total,
      subtitle: "MongoDB scholarship records",
      icon: GraduationCap,
    },
    {
      title: "Approved Applications",
      value: summary.approved,
      subtitle: "Approved student awards",
      icon: CheckCircle2,
    },
    {
      title: "Pending Review",
      value: summary.pending,
      subtitle: "Awaiting a decision",
      icon: Clock3,
    },
    {
      title: "Approved Award Value",
      value: money(summary.awardedAmount),
      subtitle: "Approved scholarship amount",
      icon: Wallet,
    },
  ];

  const filteredScholarships = useMemo(() => {
    const query = search.toLowerCase().trim();

    return scholarships.filter((record) => {
      const matchesSearch = [
        record.studentId,
        record.studentName,
        record.department,
        record.semester,
        record.scholarshipType,
        record.scholarshipName,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      return (
        matchesSearch &&
        (statusFilter === "All" ||
          record.status === statusFilter) &&
        (typeFilter === "All" ||
          record.scholarshipType === typeFilter)
      );
    });
  }, [
    scholarships,
    search,
    statusFilter,
    typeFilter,
  ]);

  const selectedFee = fees.find(
    (fee) => idOf(fee) === form.feeId
  );

  const selectedStudent = students.find(
    (student) =>
      student.studentId === selectedFee?.studentId
  );

  const preview = selectedFee
    ? calculateAward({
        tuitionAmount: selectedFee.amount,
        waiverType: form.waiverType,
        waiverValue: form.waiverValue,
      })
    : 0;

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      applicationDate: todayLocal(),
    });
    setFeedback("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditingId(record.id);

    setForm({
      feeId: record.feeId,
      scholarshipType: record.scholarshipType,
      scholarshipName: record.scholarshipName,
      applicationDate: record.applicationDate,
      waiverType: record.waiverType,
      waiverValue: String(record.waiverValue),
      status: record.status,
      notes: record.notes || "",
    });

    setFeedback("");
    setError("");
    setModalOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (saving) return;

    const fee = fees.find(
      (item) => idOf(item) === form.feeId
    );

    if (!fee || fee.status !== "Active") {
      setError("Select an active Student Fee.");
      return;
    }

    if (!form.scholarshipName.trim()) {
      setError("Scholarship name is required.");
      return;
    }

    const waiver = Number(form.waiverValue);

    if (!Number.isFinite(waiver) || waiver <= 0) {
      setError("Enter a valid waiver amount.");
      return;
    }

    if (
      form.waiverType === "Percentage" &&
      waiver > 100
    ) {
      setError(
        "Waiver percentage cannot exceed 100%."
      );
      return;
    }

    const record = {
      feeId: form.feeId,
      scholarshipType: form.scholarshipType,
      scholarshipName: form.scholarshipName.trim(),
      applicationDate: form.applicationDate,
      tuitionAmount: Number(fee.amount),
      waiverType: form.waiverType,
      waiverValue: waiver,
      status: form.status,
      notes: form.notes.trim(),
    };

    setSaving(true);
    setError("");

    try {
      if (editingId) {
        await updateStudentScholarship(
          editingId,
          record
        );
      } else {
        await createStudentScholarship(record);
      }

      await refreshData();

      setModalOpen(false);
      setEditingId(null);

      setFeedback(
        editingId
          ? "Scholarship updated in MongoDB."
          : "Scholarship created in MongoDB."
      );
    } catch (err) {
      setError(
        err.message ||
        "Could not save scholarship."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(record, status) {
    if (
      !window.confirm(
        `Change "${record.scholarshipName}" to ${status}?`
      )
    ) {
      return;
    }

    setProcessingId(record.id);
    setError("");

    try {
      await updateStudentScholarship(
        record.id,
        { status }
      );

      await refreshData();

      setFeedback(
        `Scholarship status changed to ${status}.`
      );
    } catch (err) {
      setError(
        err.message ||
        "Could not update scholarship."
      );
    } finally {
      setProcessingId("");
    }
  }

  async function cancelRecord(record) {
    if (
      !window.confirm(
        `Cancel "${record.scholarshipName}"? ` +
        "The history will remain in MongoDB."
      )
    ) {
      return;
    }

    setProcessingId(record.id);
    setError("");

    try {
      await cancelStudentScholarship(record.id);
      await refreshData();

      setFeedback(
        "Scholarship cancelled in MongoDB."
      );
    } catch (err) {
      setError(
        err.message ||
        "Could not cancel scholarship."
      );
    } finally {
      setProcessingId("");
    }
  }

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            STUDENT FINANCE
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43] md:text-3xl">
            Scholarships & Waivers
          </h1>

          <p className="mt-2 text-sm text-[#718579]">
            Manage student scholarships, tuition waivers
            and award decisions using MongoDB.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-semibold text-[#234E43]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 text-sm font-semibold text-white"
          >
            <Plus size={18} />
            Add Scholarship
          </button>
        </div>
      </section>

      {feedback && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="mr-2 inline" />
          {feedback}
        </div>
      )}

      {error && !modalOpen && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* HERO */}
      <section className="rounded-3xl bg-[#234E43] p-7 text-white md:p-9">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#D9A536]">
          <Award size={16} />
          ACCOUNTS OFFICER
        </div>

        <h2 className="mt-4 text-2xl font-extrabold">
          Student Scholarship Management
        </h2>

        <p className="mt-3 text-sm text-[#D0E2D7]">
          Review applications, approve eligible awards,
          and maintain scholarship records.
        </p>
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      {/* FILTERS */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Search size={18} />
          <h2 className="font-bold text-[#234E43]">
            Search & Filter Scholarships
          </h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <input
            type="search"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Student ID, name, scholarship..."
            className="rounded-xl border border-[#E2EADC] p-3 text-sm"
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            className="rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
          >
            <option value="All">All Statuses</option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value)
            }
            className="rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
          >
            <option value="All">
              All Scholarship Types
            </option>

            {SCHOLARSHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex justify-between gap-3 text-sm text-[#718579]">
          <span>
            Showing {filteredScholarships.length} of{" "}
            {scholarships.length} applications
          </span>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("All");
              setTypeFilter("All");
            }}
            className="inline-flex items-center gap-2 font-bold text-[#234E43]"
          >
            <RotateCcw size={15} />
            Reset
          </button>
        </div>
      </section>

      {/* RECORDS */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-[#234E43]">
          Scholarship Records
        </h2>

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-[#718579]">
            Loading scholarships from MongoDB...
          </div>
        ) : filteredScholarships.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EADC] bg-white p-12 text-center">
            <Database
              size={34}
              className="mx-auto text-[#A6C1A4]"
            />

            <p className="mt-4 font-bold text-[#234E43]">
              No Scholarship Records Found
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredScholarships.map((record) => (
              <article
                key={record.id}
                className="rounded-2xl border border-[#E2EADC] bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                      <UserRound size={22} />
                    </div>

                    <div>
                      <h3 className="font-bold text-[#234E43]">
                        {record.studentName}
                      </h3>

                      <p className="mt-1 text-xs text-[#718579]">
                        ID: {record.studentId}
                      </p>
                    </div>
                  </div>

                  <Badge status={record.status} />
                </div>

                <h4 className="mt-5 font-extrabold text-[#234E43]">
                  {record.scholarshipName}
                </h4>

                <p className="mt-1 text-xs text-[#718579]">
                  {record.scholarshipType}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-[#F6F8F3] p-4 text-sm">
                  <div>
                    <p className="text-xs text-[#718579]">
                      Department
                    </p>
                    <p className="mt-1 font-semibold">
                      {record.department || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Semester
                    </p>
                    <p className="mt-1 font-semibold">
                      {record.semester || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Waiver
                    </p>
                    <p className="mt-1 font-semibold">
                      {record.waiverType === "Percentage"
                        ? `${record.waiverValue}%`
                        : money(record.waiverValue)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#718579]">
                      Application Date
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatDate(record.applicationDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[#E2EADC] p-4">
                  <div>
                    <p className="text-xs text-[#718579]">
                      Calculated Award
                    </p>

                    <p className="mt-1 font-extrabold text-[#234E43]">
                      {money(calculateAward(record))}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-[#718579]">
                      Approved Amount
                    </p>

                    <p className="mt-1 font-extrabold text-emerald-700">
                      {money(record.approvedAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E2EADC] pt-4">
                  <button
                    type="button"
                    onClick={() => setViewing(record)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#234E43] px-3 py-2 text-xs font-bold text-white"
                  >
                    <Eye size={15} />
                    View
                  </button>

                  <button
                    type="button"
                    disabled={processingId === record.id ||
                      record.status === "Cancelled"}
                    onClick={() => openEdit(record)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2EADC] px-3 py-2 text-xs font-bold text-[#234E43] disabled:opacity-40"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  {record.status !== "Approved" &&
                    record.status !== "Cancelled" && (
                    <button
                      type="button"
                      disabled={Boolean(processingId)}
                      onClick={() =>
                        changeStatus(record, "Approved")
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-40"
                    >
                      <CheckCircle2 size={15} />
                      Approve
                    </button>
                  )}

                  {["Pending", "Under Review"].includes(
                    record.status
                  ) && (
                    <button
                      type="button"
                      disabled={Boolean(processingId)}
                      onClick={() =>
                        changeStatus(record, "Rejected")
                      }
                      className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  )}

                  {record.status !== "Cancelled" && (
                    <button
                      type="button"
                      disabled={Boolean(processingId)}
                      onClick={() => cancelRecord(record)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-40"
                    >
                      <Ban size={15} />
                      Cancel
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#234E43]">
                {editingId
                  ? "Edit Scholarship"
                  : "Add Scholarship"}
              </h2>

              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* FEE SELECTOR */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Select Student Fee *
                </label>

                <select
                  required
                  disabled={Boolean(editingId)}
                  value={form.feeId}
                  onChange={(event) =>
                    updateField("feeId", event.target.value)
                  }
                  className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm disabled:bg-slate-100"
                >
                  <option value="">
                    Select a registered Student Fee
                  </option>

                  {fees
                    .filter(
                      (fee) =>
                        fee.status === "Active" ||
                        idOf(fee) === form.feeId
                    )
                    .map((fee) => (
                      <option key={idOf(fee)} value={idOf(fee)}>
                        {fee.studentId} — {fee.studentName}
                        {" — "}
                        {fee.title}
                        {" — "}
                        {money(fee.amount)}
                      </option>
                    ))}
                </select>
              </div>

              {selectedFee && (
                <div className="grid gap-3 rounded-xl bg-[#F6F8F3] p-4 text-sm sm:grid-cols-2">
                  <p>
                    <strong>Student:</strong>{" "}
                    {selectedFee.studentName}
                  </p>

                  <p>
                    <strong>ID:</strong>{" "}
                    {selectedFee.studentId}
                  </p>

                  <p>
                    <strong>Department:</strong>{" "}
                    {selectedStudent?.department || "—"}
                  </p>

                  <p>
                    <strong>Semester:</strong>{" "}
                    {selectedFee.semester || "—"}
                  </p>

                  <p>
                    <strong>Fee Amount:</strong>{" "}
                    {money(selectedFee.amount)}
                  </p>

                  <p>
                    <strong>Current Due:</strong>{" "}
                    {money(selectedFee.balance)}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Scholarship Type
                  </span>

                  <select
                    value={form.scholarshipType}
                    onChange={(e) =>
                      updateField(
                        "scholarshipType",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                  >
                    {SCHOLARSHIP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Scholarship Name *
                  </span>

                  <input
                    required
                    value={form.scholarshipName}
                    onChange={(e) =>
                      updateField(
                        "scholarshipName",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Application Date *
                  </span>

                  <input
                    type="date"
                    required
                    value={form.applicationDate}
                    onChange={(e) =>
                      updateField(
                        "applicationDate",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Waiver Type
                  </span>

                  <select
                    value={form.waiverType}
                    onChange={(e) =>
                      updateField(
                        "waiverType",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                  >
                    <option value="Percentage">
                      Percentage
                    </option>

                    <option value="Fixed Amount">
                      Fixed Amount
                    </option>
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                    {form.waiverType === "Percentage"
                      ? "Waiver (%) *"
                      : "Waiver Amount (৳) *"}
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    max={
                      form.waiverType === "Percentage"
                        ? 100
                        : undefined
                    }
                    step="0.01"
                    required
                    value={form.waiverValue}
                    onChange={(e) =>
                      updateField(
                        "waiverValue",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                    Application Status
                  </span>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value)
                    }
                    className="w-full rounded-xl border border-[#E2EADC] bg-white p-3 text-sm"
                  >
                    {STATUSES.filter(
                      (status) =>
                        status !== "Cancelled" ||
                        form.status === "Cancelled"
                    ).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-xl bg-[#EAF2E8] p-4">
                <div className="flex items-center gap-2 font-bold text-[#234E43]">
                  <BadgePercent size={18} />
                  Calculated Waiver
                </div>

                <p className="mt-2 text-xl font-extrabold text-[#234E43]">
                  {money(preview)}
                </p>

                <p className="mt-2 text-xs text-[#718579]">
                  Final approval is validated by the backend
                  against the remaining eligible fee balance.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Notes
                </span>

                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    updateField("notes", e.target.value)
                  }
                  className="w-full rounded-xl border border-[#E2EADC] p-3 text-sm"
                />
              </label>

              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                <Save size={17} />
                {saving ? "Saving..." : "Save Scholarship"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* DETAILS MODAL */}
      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#234E43]">
                Scholarship Details
              </h2>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              {[
                ["Student", viewing.studentName],
                ["Student ID", viewing.studentId],
                ["Department", viewing.department],
                ["Semester", viewing.semester],
                ["Scholarship", viewing.scholarshipName],
                ["Type", viewing.scholarshipType],
                ["Status", viewing.status],
                ["Eligible Fee", money(viewing.tuitionAmount)],
                [
                  "Waiver",
                  viewing.waiverType === "Percentage"
                    ? `${viewing.waiverValue}%`
                    : money(viewing.waiverValue),
                ],
                [
                  "Approved Amount",
                  money(viewing.approvedAmount),
                ],
                [
                  "Application Date",
                  formatDate(viewing.applicationDate),
                ],
                [
                  "Approval Date",
                  formatDate(viewing.approvedDate),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b border-[#E2EADC] py-2"
                >
                  <span className="text-[#718579]">
                    {label}
                  </span>

                  <span className="text-right font-semibold text-[#234E43]">
                    {value || "—"}
                  </span>
                </div>
              ))}
            </div>

            {viewing.notes && (
              <p className="mt-4 rounded-xl bg-[#F6F8F3] p-4 text-sm text-[#45685B]">
                {viewing.notes}
              </p>
            )}

            <button
              type="button"
              onClick={() => setViewing(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 font-bold text-white"
            >
              Close
            </button>
          </section>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <ShieldCheck size={18} />

        <p>
          Scholarship applications are saved in MongoDB.
          Approval amounts are checked against the linked
          student fee. Fee balance deduction must also be
          enabled in the Finance API before treating the
          approved amount as a reduction in payable dues.
        </p>
      </div>

      <p className="text-center text-xs text-[#8AA092]">
        UniBee Accounts Officer — Scholarships & Waivers
      </p>
    </div>
  );
}
