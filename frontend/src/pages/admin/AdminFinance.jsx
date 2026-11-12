
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet, CreditCard, Receipt, TrendingUp, Search, Filter,
  Eye, X, Plus, Pencil, Save, RefreshCw, Download,
  AlertCircle, CheckCircle2, RotateCcw, Ban,
  GraduationCap, CalendarDays, Clock3
} from "lucide-react";

import {
  getFinanceStudents,
  getStudentFees,
  getStudentPayments,
  createStudentFee,
  updateStudentFee,
  createStudentPayment,
  voidStudentPayment,
} from "../../services/financeApi";

const PAGE_SIZE = 10;

const FEE_TYPES = [
  "Tuition Fee", "Admission Fee", "Semester Fee",
  "Registration Fee", "Examination Fee", "Library Fee",
  "Laboratory Fee", "Other"
];

const METHODS = [
  "Cash", "Bank Transfer", "Card", "Mobile Banking", "Other"
];

const EMPTY_FEE = {
  studentId: "",
  title: "Tuition Fee",
  semester: "Fall 2026",
  amount: "",
  dueDate: "",
  notes: "",
};

const EMPTY_PAYMENT = {
  feeId: "",
  amount: "",
  method: "Cash",
  reference: "",
  paymentDate: "",
  notes: "",
};

function localToday() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function idOf(value) {
  return String(value?._id || value?.id || "");
}

function money(value) {
  return `৳ ${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
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

function feeStatus(fee) {
  if (fee.status === "Cancelled") return "Cancelled";
  if (Number(fee.balance || 0) <= 0) return "Paid";
  if (Number(fee.paid || 0) > 0) return "Partial";
  return "Due";
}

function Badge({ status }) {
  const styles = {
    Paid: "bg-emerald-50 text-emerald-700",
    Completed: "bg-emerald-50 text-emerald-700",
    Partial: "bg-amber-50 text-amber-800",
    Due: "bg-rose-50 text-rose-700",
    Cancelled: "bg-slate-100 text-slate-600",
    Voided: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
      styles[status] || "bg-slate-100 text-slate-600"
    }`}>
      {status}
    </span>
  );
}

function StatCard({ title, value, detail, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-3 break-words text-2xl font-bold text-[#234E43]">
            {value}
          </h3>
        </div>
        <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        type={type}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? 0 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]"
      />
    </label>
  );
}

function exportCSV(rows) {
  const headers = [
    "Fee ID", "Student ID", "Student Name", "Department",
    "Semester", "Fee Type", "Total", "Paid", "Due",
    "Due Date", "Status",
  ];

  const values = rows.map((row) => [
    row.id, row.studentId, row.studentName,
    row.department, row.semester, row.title,
    row.amount, row.paid, row.balance,
    row.dueDate, feeStatus(row),
  ]);

  const escape = (value) => {
    let text = String(value ?? "");
    if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = "\uFEFF" +
    [headers, ...values].map((row) => row.map(escape).join(","))
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = "UniBee_Admin_Finance.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminFinance() {
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [tab, setTab] = useState("fees");
  const [query, setQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [feeFilter, setFeeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [viewing, setViewing] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [feeForm, setFeeForm] = useState({ ...EMPTY_FEE });
  const [paymentForm, setPaymentForm] = useState({
    ...EMPTY_PAYMENT,
    paymentDate: localToday(),
  });

  const loadFinance = useCallback(async () => {
    setLoading(true);

    try {
      const [feeData, paymentData, studentData] =
        await Promise.all([
          getStudentFees(),
          getStudentPayments(),
          getFinanceStudents(),
        ]);

      const studentRows = Array.isArray(studentData)
        ? studentData : [];

      const studentMap = new Map(
        studentRows.map((student) => [
          student.studentId,
          student,
        ])
      );

      const feeRows = (Array.isArray(feeData) ? feeData : [])
        .map((fee) => {
          const student = studentMap.get(fee.studentId);
          return {
            ...fee,
            id: idOf(fee),
            studentName:
              fee.studentName ||
              student?.fullName ||
              fee.studentId,
            department: student?.department || "",
            amount: Number(fee.amount || 0),
            paid: Number(fee.paid || 0),
            balance: Number(fee.balance || 0),
          };
        });

      const feeMap = new Map(
        feeRows.map((fee) => [fee.id, fee])
      );

      const paymentRows = (
        Array.isArray(paymentData) ? paymentData : []
      ).map((payment) => {
        const feeId = String(
          payment.fee?._id || payment.fee || ""
        );
        const fee = feeMap.get(feeId);

        return {
          ...payment,
          id: idOf(payment),
          feeId,
          feeTitle: fee?.title || "Student Fee",
          studentName:
            fee?.studentName ||
            studentMap.get(payment.studentId)?.fullName ||
            payment.studentId,
        };
      });

      setFees(feeRows);
      setPayments(paymentRows);
      setStudents(studentRows);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load finance data.");
      setFees([]);
      setPayments([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  const activeFees = fees.filter(
    (fee) => fee.status !== "Cancelled"
  );

  const totals = useMemo(() => {
    const billed = activeFees.reduce(
      (sum, fee) => sum + Math.round(fee.amount * 100), 0
    ) / 100;

    const paid = activeFees.reduce(
      (sum, fee) => sum + Math.round(fee.paid * 100), 0
    ) / 100;

    const due = activeFees.reduce(
      (sum, fee) => sum + Math.round(fee.balance * 100), 0
    ) / 100;

    return {
      billed,
      paid,
      due,
      rate: billed > 0
        ? Math.round((paid / billed) * 100)
        : 0,
      completed: payments.filter(
        (item) => item.status === "Completed"
      ).length,
    };
  }, [fees, payments]);

  const semesters = useMemo(
    () => [...new Set(activeFees.map(
      (fee) => fee.semester
    ).filter(Boolean))],
    [fees]
  );

  const types = useMemo(
    () => [...new Set(activeFees.map(
      (fee) => fee.title
    ).filter(Boolean))],
    [fees]
  );

  const visibleFees = useMemo(() => {
    const q = query.toLowerCase().trim();

    return activeFees.filter((fee) => {
      const matchSearch = [
        fee.studentId,
        fee.studentName,
        fee.department,
        fee.title,
        fee.semester,
        fee.id,
      ].some((item) =>
        String(item || "").toLowerCase().includes(q)
      );

      return matchSearch &&
        (semesterFilter === "All" ||
          fee.semester === semesterFilter) &&
        (feeFilter === "All" || fee.title === feeFilter) &&
        (statusFilter === "All" ||
          feeStatus(fee) === statusFilter);
    });
  }, [
    activeFees, query, semesterFilter,
    feeFilter, statusFilter,
  ]);

  const visiblePayments = useMemo(() => {
    const q = query.toLowerCase().trim();

    return payments.filter((payment) =>
      [
        payment.studentId,
        payment.studentName,
        payment.feeTitle,
        payment.reference,
      ].some((value) =>
        String(value || "").toLowerCase().includes(q)
      ) &&
      (statusFilter === "All" ||
        payment.status === statusFilter)
    );
  }, [payments, query, statusFilter]);

  const filtered = tab === "fees"
    ? visibleFees
    : visiblePayments;

  const totalPages = Math.max(
    1, Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function changeTab(next) {
    setTab(next);
    setQuery("");
    setStatusFilter("All");
    setSemesterFilter("All");
    setFeeFilter("All");
    setPage(1);
  }

  function openCreateFee() {
    setFeeForm({ ...EMPTY_FEE });
    setEditingId(null);
    setFormMode("fee");
    setError("");
  }

  function openEditFee(fee) {
    setFeeForm({
      studentId: fee.studentId,
      title: fee.title,
      semester: fee.semester || "",
      amount: String(fee.amount),
      dueDate: fee.dueDate || "",
      notes: fee.notes || "",
    });
    setEditingId(fee.id);
    setFormMode("fee");
    setError("");
  }

  function openCreatePayment() {
    setPaymentForm({
      ...EMPTY_PAYMENT,
      paymentDate: localToday(),
    });
    setFormMode("payment");
    setError("");
  }

  async function saveFee(event) {
    event.preventDefault();
    if (saving) return;

    const student = students.find(
      (row) => row.studentId ===
        feeForm.studentId.trim().toUpperCase()
    );

    if (!student) {
      setError("Select a registered student.");
      return;
    }

    const amount = Number(feeForm.amount);

    if (!Number.isFinite(amount) || amount < 0 ||
        Math.round(amount * 100) !== amount * 100) {
      setError("Enter a valid fee amount.");
      return;
    }

    if (!feeForm.title.trim() || !feeForm.dueDate) {
      setError("Fee type and due date are required.");
      return;
    }

    const data = {
      studentId: student.studentId,
      title: feeForm.title.trim(),
      semester: feeForm.semester.trim(),
      amount,
      dueDate: feeForm.dueDate,
      notes: feeForm.notes.trim(),
    };

    setSaving(true);
    setError("");

    try {
      if (editingId) {
        const { studentId, ...updates } = data;
        await updateStudentFee(editingId, updates);
      } else {
        await createStudentFee(data);
      }

      await loadFinance();
      setFormMode(null);
      setEditingId(null);
      setFeedback(
        editingId
          ? "Fee updated in MongoDB."
          : "Fee assigned in MongoDB."
      );
    } catch (err) {
      setError(err.message || "Could not save fee.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelFee(fee) {
    if (!window.confirm(
      `Cancel "${fee.title}" for ${fee.studentName}?`
    )) return;

    try {
      await updateStudentFee(fee.id, {
        status: "Cancelled",
      });
      await loadFinance();
      setFeedback("Fee cancelled in MongoDB.");
    } catch (err) {
      setError(err.message || "Could not cancel fee.");
    }
  }

  async function savePayment(event) {
    event.preventDefault();
    if (saving) return;

    const fee = activeFees.find(
      (row) => row.id === paymentForm.feeId
    );

    const amount = Number(paymentForm.amount);

    if (!fee || fee.balance <= 0) {
      setError("Select a fee with an outstanding balance.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0 ||
        Math.round(amount * 100) !== amount * 100 ||
        amount > fee.balance) {
      setError("Enter an amount within the fee balance.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createStudentPayment({
        feeId: fee.id,
        amount,
        method: paymentForm.method,
        reference: paymentForm.reference.trim(),
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes.trim(),
      });

      await loadFinance();
      setFormMode(null);
      setFeedback("Payment recorded in MongoDB.");
    } catch (err) {
      setError(err.message || "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  async function voidPayment(payment) {
    if (payment.status === "Voided") return;

    if (!window.confirm(
      `Void payment ${money(payment.amount)}?`
    )) return;

    try {
      await voidStudentPayment(payment.id);
      await loadFinance();
      setFeedback("Payment voided in MongoDB.");
    } catch (err) {
      setError(err.message || "Could not void payment.");
    }
  }

  const buttonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold";

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#234E43]";

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B18B37]">
            UNIVERSITY ADMINISTRATION
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-[#234E43]">
            Finance Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            University finance overview from shared MongoDB records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadFinance}
            disabled={loading}
            className={`${buttonClass} border border-slate-200 bg-white text-[#234E43] disabled:opacity-50`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => exportCSV(visibleFees)}
            className={`${buttonClass} border border-slate-200 bg-white text-[#234E43]`}
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={openCreateFee}
            className={`${buttonClass} bg-[#234E43] text-white`}
          >
            <Plus size={16} />
            Assign Fee
          </button>
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={18} />
          {feedback}
          <button
            onClick={() => setFeedback("")}
            className="ml-auto"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
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

      {/* SUMMARY */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Fees"
          value={money(totals.billed)}
          detail="Active student fee assessments"
          icon={Wallet}
        />
        <StatCard
          title="Total Collected"
          value={money(totals.paid)}
          detail={`${totals.completed} completed transactions`}
          icon={CreditCard}
        />
        <StatCard
          title="Outstanding Dues"
          value={money(totals.due)}
          detail="Remaining unpaid fees"
          icon={Clock3}
        />
        <StatCard
          title="Collection Rate"
          value={`${totals.rate}%`}
          detail="Collected amount / total assigned fees"
          icon={TrendingUp}
        />
        <StatCard
  title="Approved Waivers"
  value={money(
    fees
      .filter((fee) => fee.status !== "Cancelled")
      .reduce(
        (sum, fee) => sum + Number(fee.waived || 0),
        0
      )
  )}
  detail="Approved scholarships reducing student dues"
  icon={GraduationCap}
/>
      </div>

      {/* WORKSPACE */}
      <section className="overflow-hidden rounded-2xl border border-[#E2EADC] bg-white shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2EADC] p-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => changeTab("fees")}
              className={`${buttonClass} ${
                tab === "fees"
                  ? "bg-[#234E43] text-white"
                  : "bg-[#F6F8F3] text-[#234E43]"
              }`}
            >
              <Wallet size={16} />
              Student Fees
            </button>

            <button
              type="button"
              onClick={() => changeTab("payments")}
              className={`${buttonClass} ${
                tab === "payments"
                  ? "bg-[#234E43] text-white"
                  : "bg-[#F6F8F3] text-[#234E43]"
              }`}
            >
              <Receipt size={16} />
              Payment Records
            </button>
          </div>

          <button
            type="button"
            onClick={openCreatePayment}
            className={`${buttonClass} border border-[#E2EADC] text-[#234E43]`}
          >
            <Plus size={16} />
            Record Payment
          </button>
        </div>

        {/* SEARCH + FILTER */}
        <div className="grid gap-3 border-b border-[#E2EADC] p-5 md:grid-cols-2 xl:grid-cols-4">

          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-3.5 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search students or finance..."
              className={`${inputClass} pl-10`}
            />
          </div>

          {tab === "fees" ? (
            <>
              <select
                value={semesterFilter}
                onChange={(e) => {
                  setSemesterFilter(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="All">All Semesters</option>
                {semesters.map((semester) => (
                  <option key={semester} value={semester}>
                    {semester}
                  </option>
                ))}
              </select>

              <select
                value={feeFilter}
                onChange={(e) => {
                  setFeeFilter(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="All">All Fee Types</option>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="text-sm text-slate-500 xl:col-span-2">
              Payments recorded by Admin and Accounts Officer
            </div>
          )}

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="All">All Statuses</option>
            {(tab === "fees"
              ? ["Paid", "Partial", "Due"]
              : ["Completed", "Voided"]
            ).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          {tab === "fees" ? (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#F6F8F3] text-xs uppercase text-slate-500">
                <tr>
                  {[
                    "Student", "Fee", "Total", "Paid",
                    "Outstanding", "Status", "Actions"
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-4">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pageRows.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#234E43]">
                        {fee.studentName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {fee.studentId}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p>{fee.title}</p>
                      <p className="text-xs text-slate-500">
                        {fee.semester}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      {money(fee.amount)}
                    </td>
                    <td className="px-4 py-4">
                      {money(fee.paid)}
                    </td>
                    <td className="px-4 py-4 font-bold text-rose-700">
                      {money(fee.balance)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge status={feeStatus(fee)} />
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setViewing({
                            ...fee, kind: "fee"
                          })}
                          title="View fee"
                          className="rounded-lg border border-slate-200 p-2 text-[#234E43]"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditFee(fee)}
                          title="Edit fee"
                          className="rounded-lg border border-slate-200 p-2 text-[#234E43]"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelFee(fee)}
                          title="Cancel fee"
                          className="rounded-lg border border-rose-200 p-2 text-rose-600"
                        >
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-[#F6F8F3] text-xs uppercase text-slate-500">
                <tr>
                  {[
                    "Student", "Fee", "Amount", "Method",
                    "Date", "Status", "Actions"
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-4">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pageRows.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#234E43]">
                        {payment.studentName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {payment.studentId}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {payment.feeTitle}
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {money(payment.amount)}
                    </td>
                    <td className="px-4 py-4">
                      {payment.method}
                    </td>
                    <td className="px-4 py-4">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge status={payment.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setViewing({
                            ...payment, kind: "payment"
                          })}
                          className="rounded-lg border border-slate-200 p-2 text-[#234E43]"
                          title="View payment"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={payment.status === "Voided"}
                          onClick={() => voidPayment(payment)}
                          className="rounded-lg border border-rose-200 p-2 text-rose-600 disabled:opacity-30"
                          title="Void payment"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && pageRows.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-500">
              No finance records found.
            </div>
          )}

          {loading && (
            <div className="p-12 text-center text-slate-500">
              Loading finance records from MongoDB...
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between border-t border-[#E2EADC] p-4 text-sm text-slate-500">
          <span>
            Showing {pageRows.length} of {filtered.length} records
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="disabled:opacity-30"
            >
              Previous
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* FEE FORM */}
      {formMode === "fee" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={saveFee}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#234E43]">
                {editingId ? "Edit Student Fee" : "Assign Student Fee"}
              </h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => setFormMode(null)}
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  Student *
                </span>
                <select
                  required
                  disabled={Boolean(editingId)}
                  value={feeForm.studentId}
                  onChange={(e) => setFeeForm({
                    ...feeForm, studentId: e.target.value
                  })}
                  className={inputClass}
                >
                  <option value="">Select Student</option>
                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.studentId}
                    >
                      {student.studentId} — {student.fullName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  Fee Type *
                </span>
                <select
                  value={feeForm.title}
                  onChange={(e) => setFeeForm({
                    ...feeForm, title: e.target.value
                  })}
                  className={inputClass}
                >
                  {FEE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <Field
                label="Semester"
                value={feeForm.semester}
                onChange={(value) => setFeeForm({
                  ...feeForm, semester: value
                })}
              />

              <Field
                label="Amount (৳) *"
                type="number"
                required
                value={feeForm.amount}
                onChange={(value) => setFeeForm({
                  ...feeForm, amount: value
                })}
              />

              <Field
                label="Due Date *"
                type="date"
                required
                value={feeForm.dueDate}
                onChange={(value) => setFeeForm({
                  ...feeForm, dueDate: value
                })}
              />

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  Notes
                </span>
                <textarea
                  rows={3}
                  value={feeForm.notes}
                  onChange={(e) => setFeeForm({
                    ...feeForm, notes: e.target.value
                  })}
                  className={inputClass}
                />
              </label>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`${buttonClass} mt-6 w-full bg-[#234E43] text-white disabled:opacity-50`}
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save to MongoDB"}
            </button>
          </form>
        </div>
      )}

      {/* PAYMENT FORM */}
      {formMode === "payment" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={savePayment}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#234E43]">
                Record Student Payment
              </h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => setFormMode(null)}
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  Select Outstanding Fee *
                </span>
                <select
                  required
                  value={paymentForm.feeId}
                  onChange={(e) => setPaymentForm({
                    ...paymentForm,
                    feeId: e.target.value,
                    amount: "",
                  })}
                  className={inputClass}
                >
                  <option value="">Choose Student Fee</option>
                  {activeFees
                    .filter((fee) => fee.balance > 0)
                    .map((fee) => (
                      <option key={fee.id} value={fee.id}>
                        {fee.studentId} — {fee.studentName} —
                        {fee.title} — Due {money(fee.balance)}
                      </option>
                    ))}
                </select>
              </label>

              <Field
                label="Payment Amount (৳) *"
                type="number"
                required
                value={paymentForm.amount}
                onChange={(value) => setPaymentForm({
                  ...paymentForm, amount: value
                })}
              />

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  Payment Method
                </span>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({
                    ...paymentForm, method: e.target.value
                  })}
                  className={inputClass}
                >
                  {METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="Payment Date *"
                type="date"
                required
                value={paymentForm.paymentDate}
                onChange={(value) => setPaymentForm({
                  ...paymentForm, paymentDate: value
                })}
              />

              <Field
                label="Transaction Reference"
                value={paymentForm.reference}
                onChange={(value) => setPaymentForm({
                  ...paymentForm, reference: value
                })}
              />

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  Notes
                </span>
                <textarea
                  rows={3}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({
                    ...paymentForm, notes: e.target.value
                  })}
                  className={inputClass}
                />
              </label>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`${buttonClass} mt-6 w-full bg-[#234E43] text-white disabled:opacity-50`}
            >
              <Save size={16} />
              {saving ? "Saving..." : "Record Payment"}
            </button>
          </form>
        </div>
      )}

      {/* DETAILS MODAL */}
      {viewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#234E43]">
                {viewing.kind === "fee"
                  ? "Fee Details"
                  : "Payment Details"}
              </h2>
              <button
                type="button"
                onClick={() => setViewing(null)}
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <p><strong>Student:</strong> {viewing.studentName}</p>
              <p><strong>Student ID:</strong> {viewing.studentId}</p>
              <p>
                <strong>Fee:</strong>{" "}
                {viewing.title || viewing.feeTitle}
              </p>

              {viewing.kind === "fee" ? (
                <>
                  <p><strong>Total:</strong> {money(viewing.amount)}</p>
                  <p><strong>Paid:</strong> {money(viewing.paid)}</p>
                  <p><strong>Due:</strong> {money(viewing.balance)}</p>
                  <p>
                    <strong>Due Date:</strong>{" "}
                    {formatDate(viewing.dueDate)}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <Badge status={feeStatus(viewing)} />
                  </p>
                </>
              ) : (
                <>
                  <p><strong>Amount:</strong> {money(viewing.amount)}</p>
                  <p><strong>Method:</strong> {viewing.method}</p>
                  <p><strong>Reference:</strong> {viewing.reference || "—"}</p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {formatDate(viewing.paymentDate)}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <Badge status={viewing.status} />
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewing(null)}
              className={`${buttonClass} mt-6 w-full bg-[#234E43] text-white`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-500">
        UniBee Admin Finance · Shared MongoDB Financial Records
      </p>
    </div>
  );
}
