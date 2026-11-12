
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  CreditCard,
  Receipt,
  CircleCheck,
  Clock3,
  Search,
  CalendarDays,
  ArrowUpRight,
  Download,
  X,
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  RefreshCw,
  Database,
} from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import {
  getStudentFees,
  getStudentPayments,
  getFinanceSummary,
} from "../services/financeApi";

// ========================================
// HELPERS
// ========================================

const currency = (value) =>
  `৳${Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;

const getId = (item) =>
  String(item?._id || item?.id || "");

const formatDate = (value) => {
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
};

const statusStyles = {
  Paid: "bg-[#EAF2E8] text-[#427A67]",
  Partial: "bg-[#FFF4DC] text-[#A57921]",
  Unpaid: "bg-red-50 text-red-700",
  Overdue: "bg-red-50 text-red-700",
};

function getFeeStatus(fee) {
  if (fee.balance <= 0) return "Paid";

  if (fee.dueDate) {
    const today = new Date();
    const localToday = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    if (fee.dueDate < localToday) return "Overdue";
  }

  return fee.paid > 0 ? "Partial" : "Unpaid";
}

function downloadReceipt(payment, fee) {
  const rows = [
    "UNIBEE - RECORDED PAYMENT RECEIPT",
    "University Finance Management System",
    "----------------------------------------",
    `Transaction ID: ${getId(payment)}`,
    `Reference: ${payment.reference || "Not provided"}`,
    `Student ID: ${payment.studentId || ""}`,
    `Fee Type: ${fee?.title || "Student Fee"}`,
    `Semester: ${fee?.semester || "N/A"}`,
    `Amount: ${currency(payment.amount)}`,
    `Payment Method: ${payment.method || "N/A"}`,
    `Payment Date: ${payment.paymentDate || "N/A"}`,
    `Status: ${payment.status}`,
    "----------------------------------------",
    "System-generated accounting record.",
    "Not independent confirmation of bank settlement.",
  ];

  const blob = new Blob([rows.join("\n")], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `UniBee-Payment-${getId(payment)}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ========================================
// MAIN STUDENT FINANCE PAGE
// ========================================

export default function StudentFees() {
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summaryData, setSummaryData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [selectedFee, setSelectedFee] = useState(null);

  // ======================================
  // MONGODB LOADING
  // ======================================

  const loadFinance = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const [feeData, paymentData, summary] =
        await Promise.all([
          getStudentFees(),
          getStudentPayments(),
          getFinanceSummary(),
        ]);

      const normalizedFees = (
        Array.isArray(feeData) ? feeData : []
      )
        .filter((fee) => fee.status !== "Cancelled")
        .map((fee) => ({
          ...fee,
          id: getId(fee),
          title: fee.title || "Student Fee",
          semester: fee.semester || "Not specified",
          amount: Number(fee.amount || 0),
          paid: Number(fee.paid || 0),
          balance: Number(fee.balance || 0),
        }));

      const normalizedPayments = (
        Array.isArray(paymentData) ? paymentData : []
      ).map((payment) => ({
        ...payment,
        id: getId(payment),
        feeId: String(
          payment.fee?._id ||
          payment.fee ||
          ""
        ),
        amount: Number(payment.amount || 0),
      }));

      setFees(normalizedFees);
      setPayments(normalizedPayments);
      setSummaryData(summary);
    } catch (err) {
      setFees([]);
      setPayments([]);
      setSummaryData(null);

      setError(
        err.message ||
        "Could not load your financial information."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFinance();

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        loadFinance(true);
      }
    }

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      );
    };
  }, [loadFinance]);

  // ======================================
  // FINANCIAL SUMMARY
  // ======================================

  const totalFees = summaryData
    ? Number(summaryData.totalFees || 0)
    : fees.reduce((sum, fee) => sum + fee.amount, 0);

  const totalPaid = summaryData
    ? Number(summaryData.totalPaid || 0)
    : fees.reduce((sum, fee) => sum + fee.paid, 0);

  const totalDue = summaryData
    ? Number(summaryData.totalDue || 0)
    : fees.reduce((sum, fee) => sum + fee.balance, 0);

  const paymentPercentage =
    totalFees > 0
      ? Math.round((totalPaid / totalFees) * 100)
      : 0;

  const completedPayments = payments.filter(
    (payment) => payment.status === "Completed"
  );

  const summary = [
    {
      title: "Total Fees",
      value: currency(totalFees),
      icon: Wallet,
    },
    {
      title: "Total Paid",
      value: currency(totalPaid),
      icon: CircleCheck,
    },
    {
      title: "Outstanding Dues",
      value: currency(totalDue),
      icon: Clock3,
    },
    {
  title: "Approved Waivers",
  value: currency(
    summaryData?.totalWaived ??
      fees.reduce(
        (sum, fee) => sum + Number(fee.waived || 0),
        0
      )
  ),
  icon: GraduationCap,
},
    {
      title: "Completed Payments",
      value: completedPayments.length,
      icon: Receipt,
    },
  ];

  const chartData = [
    {
      name: "Paid",
      value: totalPaid,
      color: "#234E43",
    },
    {
      name: "Due",
      value: totalDue,
      color: "#D9A536",
    },
  ];

  const semesters = useMemo(
    () => [
      ...new Set(fees.map((fee) => fee.semester)),
    ],
    [fees]
  );

  const semesterChart = useMemo(
    () =>
      semesters.map((semester) => {
        const semesterFees = fees.filter(
          (fee) => fee.semester === semester
        );

        return {
          semester,
          paid: semesterFees.reduce(
            (sum, fee) => sum + fee.paid,
            0
          ),
          due: semesterFees.reduce(
            (sum, fee) => sum + fee.balance,
            0
          ),
        };
      }),
    [fees, semesters]
  );

  // ======================================
  // FILTERS
  // ======================================

  const filteredFees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return fees.filter((fee) => {
      const matchesSearch = [
        fee.title,
        fee.id,
        fee.studentId,
        fee.semester,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      const matchesStatus =
        statusFilter === "All" ||
        getFeeStatus(fee) === statusFilter;

      const matchesSemester =
        semesterFilter === "All" ||
        fee.semester === semesterFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSemester
      );
    });
  }, [fees, search, statusFilter, semesterFilter]);

  const feePayments = useMemo(() => {
    if (!selectedFee) return [];

    return payments
      .filter(
        (payment) =>
          payment.feeId === selectedFee.id
      )
      .sort((a, b) =>
        String(b.paymentDate || "").localeCompare(
          String(a.paymentDate || "")
        )
      );
  }, [payments, selectedFee]);

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            STUDENT FINANCE
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            Fees & Payments
          </h1>

          <p className="mt-3 text-[#718579]">
            Track your assigned fees, completed payments
            and outstanding balances from UniBee Finance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#DCE8DA] bg-white px-4 py-2 text-sm font-semibold text-[#45685B]">
            <ShieldCheck size={18} className="text-[#B78B28]" />
            Personal Finance
          </span>

          <button
            type="button"
            disabled={refreshing || loading}
            onClick={() => loadFinance(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#234E43] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            <RefreshCw size={16} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#E2EADC] bg-white p-12 text-center text-[#718579]">
          Loading your finance records from MongoDB...
        </div>
      ) : (
        <>
          {/* STATISTICS */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {summary.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:shadow-lg"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                    <Icon size={24} />
                  </div>

                  <p className="text-sm text-[#718579]">
                    {item.title}
                  </p>

                  <h2 className="mt-2 text-2xl font-extrabold text-[#234E43]">
                    {item.value}
                  </h2>
                </div>
              );
            })}
          </div>

          {/* ANALYTICS */}
          <div className="grid gap-6 xl:grid-cols-5">

            <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm xl:col-span-2">
              <h2 className="text-xl font-bold text-[#234E43]">
                Payment Overview
              </h2>

              <p className="mt-1 text-sm text-[#718579]">
                Paid and outstanding balance
              </p>

              <div className="relative mt-5 h-64">
                {totalFees > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={75}
                        outerRadius={105}
                        paddingAngle={3}
                      >
                        {chartData.map((item) => (
                          <Cell
                            key={item.name}
                            fill={item.color}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value) => currency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#718579]">
                    No assigned fees yet
                  </div>
                )}

                {totalFees > 0 && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-[#234E43]">
                      {paymentPercentage}%
                    </span>
                    <span className="text-xs text-[#718579]">
                      Paid
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-6 text-sm text-[#607B6C]">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#234E43]" />
                  Paid
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#D9A536]" />
                  Outstanding
                </span>
              </div>
            </section>

            <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm xl:col-span-3">
              <h2 className="text-xl font-bold text-[#234E43]">
                Semester-wise Payments
              </h2>

              <p className="mt-1 text-sm text-[#718579]">
                Paid amount versus outstanding dues
              </p>

              <div className="mt-7 h-72">
                {semesterChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={semesterChart}>
                      <CartesianGrid
                        stroke="#EDF1EB"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="semester"
                        tick={{ fontSize: 11 }}
                      />

                      <YAxis
                        tickFormatter={(value) =>
                          `${value / 1000}k`
                        }
                      />

                      <Tooltip
                        formatter={(value) => currency(value)}
                      />

                      <Bar
                        dataKey="paid"
                        fill="#234E43"
                        name="Paid"
                        radius={[5, 5, 0, 0]}
                      />

                      <Bar
                        dataKey="due"
                        fill="#D9A536"
                        name="Outstanding"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#718579]">
                    No semester fee records yet
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* FEE HISTORY */}
          <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#234E43]">
                Fee & Payment History
              </h2>

              <p className="mt-1 text-sm text-[#718579]">
                View your fees and recorded transactions
              </p>
            </div>

            <div className="mb-6 flex flex-col gap-3 lg:flex-row">

              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search fee records..."
                  className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-11 pr-4 text-sm text-[#234E43] outline-none"
                />
              </div>

              <select
                value={semesterFilter}
                onChange={(event) =>
                  setSemesterFilter(event.target.value)
                }
                className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
              >
                <option value="All">All Semesters</option>

                {semesters.map((semester) => (
                  <option key={semester} value={semester}>
                    {semester}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
                <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
                  <tr>
                    <th className="rounded-l-xl px-5 py-4">
                      Reference
                    </th>
                    <th className="px-5 py-4">Fee Details</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Paid</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="rounded-r-xl px-5 py-4">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredFees.map((fee) => {
                    const status = getFeeStatus(fee);

                    return (
                      <tr
                        key={fee.id}
                        className="border-b border-[#EDF1EB] text-sm"
                      >
                        <td className="px-5 py-4 font-bold text-[#234E43]">
                          {fee.id.slice(-10).toUpperCase()}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#234E43]">
                            {fee.title}
                          </p>

                          <p className="mt-1 text-xs text-[#8A9F90]">
                            {fee.semester}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-[#607B6C]">
                          {currency(fee.amount)}
                        </td>

                        <td className="px-5 py-4 text-[#607B6C]">
                          {currency(fee.paid)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                              statusStyles[status] ||
                              statusStyles.Unpaid
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedFee(fee)
                            }
                            className="inline-flex items-center gap-1 font-semibold text-[#477764] hover:text-[#B78B28]"
                          >
                            Details
                            <ArrowUpRight size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredFees.length === 0 && (
                <p className="py-10 text-center text-[#718579]">
                  No fee records match your filters.
                </p>
              )}
            </div>
          </section>

          {/* ACTUAL PAYMENT TRANSACTIONS */}
          <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-[#234E43]">
                Recorded Payment Transactions
              </h2>

              <p className="mt-1 text-sm text-[#718579]">
                Payments recorded by the Accounts Office
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Receipt</th>
                  </tr>
                </thead>

                <tbody>
                  {payments
                    .slice()
                    .sort((a, b) =>
                      String(b.paymentDate || "").localeCompare(
                        String(a.paymentDate || "")
                      )
                    )
                    .map((payment) => {
                      const fee = fees.find(
                        (item) => item.id === payment.feeId
                      );

                      return (
                        <tr
                          key={payment.id}
                          className="border-b border-[#EDF1EB]"
                        >
                          <td className="px-4 py-4">
                            {formatDate(payment.paymentDate)}
                          </td>

                          <td className="px-4 py-4">
                            {payment.reference || payment.id.slice(-8)}
                          </td>

                          <td className="px-4 py-4">
                            {payment.method}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {currency(payment.amount)}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={
                                payment.status === "Completed"
                                  ? "font-bold text-emerald-700"
                                  : "font-bold text-slate-500"
                              }
                            >
                              {payment.status}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              disabled={
                                payment.status !== "Completed"
                              }
                              onClick={() =>
                                downloadReceipt(payment, fee)
                              }
                              className="inline-flex items-center gap-1 font-semibold text-[#477764] disabled:opacity-40"
                            >
                              <Download size={15} />
                              Download
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {payments.length === 0 && (
                <p className="py-8 text-center text-sm text-[#718579]">
                  No recorded payments yet.
                </p>
              )}
            </div>
          </section>

          {/* FINANCE NOTICE */}
          <div className="flex items-start gap-4 rounded-2xl border border-[#E9DCAE] bg-[#FFF9E9] p-6">
            <AlertCircle
              size={24}
              className="shrink-0 text-[#A57921]"
            />

            <div>
              <h3 className="font-bold text-[#80651E]">
                Payment Information
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-[#8C773F]">
                This page displays finance records stored in
                UniBee MongoDB. Payments are recorded by the
                Accounts Office. Online payment processing is
                not enabled, and a recorded payment does not
                independently verify bank settlement.
              </p>
            </div>
          </div>
        </>
      )}

      {/* FEE DETAILS MODAL */}
      {selectedFee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedFee(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fee-dialog-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  STUDENT FEE RECORD
                </p>

                <h2
                  id="fee-dialog-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {selectedFee.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFee(null)}
                aria-label="Close fee details"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 space-y-4 rounded-2xl bg-[#F6F8F3] p-5 text-sm text-[#45685B]">
              <p>
                <strong>Student ID:</strong>{" "}
                {selectedFee.studentId}
              </p>

              <p>
                <strong>Semester:</strong>{" "}
                {selectedFee.semester}
              </p>

              <p>
                <strong>Total Fee:</strong>{" "}
                {currency(selectedFee.amount)}
              </p>

              <p>
                <strong>Amount Paid:</strong>{" "}
                {currency(selectedFee.paid)}
              </p>

              <p>
                <strong>Outstanding:</strong>{" "}
                {currency(selectedFee.balance)}
              </p>

              <p>
                <strong>Due Date:</strong>{" "}
                {formatDate(selectedFee.dueDate)}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {getFeeStatus(selectedFee)}
              </p>
            </div>

            <div className="mt-6">
              <h3 className="mb-3 font-bold text-[#234E43]">
                Transactions for This Fee
              </h3>

              {feePayments.length === 0 ? (
                <p className="text-sm text-[#718579]">
                  No payments recorded for this fee.
                </p>
              ) : (
                <div className="space-y-3">
                  {feePayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-xl border border-[#E2EADC] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-[#234E43]">
                          {currency(payment.amount)}
                        </p>

                        <span className="text-xs text-[#718579]">
                          {payment.status}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-[#718579]">
                        {formatDate(payment.paymentDate)}
                        {" · "}
                        {payment.method}
                      </p>

                      <p className="mt-1 break-all text-xs text-[#718579]">
                        {payment.reference || payment.id}
                      </p>

                      {payment.status === "Completed" && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadReceipt(payment, selectedFee)
                          }
                          className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#477764]"
                        >
                          <Download size={16} />
                          Download Recorded Receipt
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedFee(null)}
              className="mt-6 w-full rounded-xl bg-[#234E43] py-3 font-bold text-white"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Fees & Payments
      </div>
    </div>
  );
}
