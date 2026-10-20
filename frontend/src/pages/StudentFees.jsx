
import { useMemo, useState } from "react";
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
  Banknote,
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

// Demonstration data only.
// Actual financial records will be fetched from MongoDB.

const initialPayments = [
  {
    id: "UB-PAY-1001",
    semester: "Spring 2026",
    type: "Tuition Fee",
    amount: 24000,
    paid: 24000,
    date: "2026-02-15",
    dueDate: "2026-02-20",
    method: "Bank Transfer",
    status: "Paid",
  },
  {
    id: "UB-PAY-1002",
    semester: "Spring 2026",
    type: "Registration Fee",
    amount: 3000,
    paid: 3000,
    date: "2026-02-17",
    dueDate: "2026-02-20",
    method: "Bank Transfer",
    status: "Paid",
  },
  {
    id: "UB-PAY-1003",
    semester: "Summer 2026",
    type: "Tuition Fee",
    amount: 24000,
    paid: 24000,
    date: "2026-06-10",
    dueDate: "2026-06-20",
    method: "Mobile Banking",
    status: "Paid",
  },
  {
    id: "UB-PAY-1004",
    semester: "Summer 2026",
    type: "Library Fee",
    amount: 1500,
    paid: 1500,
    date: "2026-06-12",
    dueDate: "2026-06-20",
    method: "Bank Transfer",
    status: "Paid",
  },
  {
    id: "UB-PAY-1005",
    semester: "Fall 2026",
    type: "Tuition Fee",
    amount: 24000,
    paid: 10000,
    date: "2026-09-20",
    dueDate: "2026-10-25",
    method: "Bank Transfer",
    status: "Partial",
  },
  {
    id: "UB-PAY-1006",
    semester: "Fall 2026",
    type: "Registration Fee",
    amount: 3000,
    paid: 0,
    date: null,
    dueDate: "2026-10-25",
    method: "Not Paid",
    status: "Unpaid",
  },
];

const currency = (amount) =>
  `৳${Number(amount).toLocaleString("en-BD")}`;

const statusStyles = {
  Paid: "bg-[#EAF2E8] text-[#427A67]",
  Partial: "bg-[#FFF4DC] text-[#A57921]",
  Unpaid: "bg-red-50 text-red-700",
};

function StudentFees() {
  const [payments, setPayments] = useState(initialPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  const totalFees = payments.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const totalPaid = payments.reduce(
    (sum, item) => sum + item.paid,
    0
  );

  const totalDue = totalFees - totalPaid;

  const paymentPercentage =
    totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0;

  const paidCount = payments.filter(
    (item) => item.status === "Paid"
  ).length;

  const summary = [
    { title: "Total Fees", value: currency(totalFees), icon: Wallet },
    { title: "Total Paid", value: currency(totalPaid), icon: CircleCheck },
    { title: "Outstanding Dues", value: currency(totalDue), icon: Clock3 },
    { title: "Completed Payments", value: paidCount, icon: Receipt },
  ];

  const chartData = [
    { name: "Paid", value: totalPaid, color: "#234E43" },
    { name: "Due", value: totalDue, color: "#D9A536" },
  ];

  const semesters = [...new Set(payments.map((item) => item.semester))];

  const semesterChart = semesters.map((semester) => {
    const records = payments.filter(
      (item) => item.semester === semester
    );

    return {
      semester: semester.replace(" 2026", ""),
      paid: records.reduce((sum, item) => sum + item.paid, 0),
      due: records.reduce(
        (sum, item) => sum + item.amount - item.paid,
        0
      ),
    };
  });

  const filteredPayments = useMemo(() => {
    const query = search.toLowerCase().trim();

    return payments.filter((payment) => {
      const matchesSearch =
        payment.type.toLowerCase().includes(query) ||
        payment.id.toLowerCase().includes(query) ||
        payment.semester.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || payment.status === statusFilter;

      const matchesSemester =
        semesterFilter === "All" ||
        payment.semester === semesterFilter;

      return matchesSearch && matchesStatus && matchesSemester;
    });
  }, [payments, search, statusFilter, semesterFilter]);

  const openDetails = (payment) => {
    setSelectedPayment(payment);
    setPaymentMessage("");
  };

  const closeDetails = () => {
    setSelectedPayment(null);
    setShowPaymentModal(false);
    setPaymentMessage("");
  };

  const handleDemoPayment = () => {
    if (!selectedPayment) return;

    setPaymentMessage(
      "Demo payment request only. No money was transferred and no financial record was changed."
    );
    setShowPaymentModal(false);
  };

  const downloadReceipt = (payment) => {
    if (payment.paid === 0) {
      setPaymentMessage("No payment receipt is available for this fee.");
      return;
    }

    // Demo receipt generated from sample data.
    // Not an official university financial document.
    const receipt = [
      "UNIBEE - DEMONSTRATION RECEIPT",
      "Not an official payment confirmation",
      "--------------------------------",
      `Reference: ${payment.id}`,
      `Semester: ${payment.semester}`,
      `Fee Type: ${payment.type}`,
      `Fee Amount: ${currency(payment.amount)}`,
      `Paid Amount: ${currency(payment.paid)}`,
      `Outstanding: ${currency(payment.amount - payment.paid)}`,
      `Date: ${payment.date || "N/A"}`,
      `Method: ${payment.method}`,
      `Status: ${payment.status}`,
    ].join("\n");

    const blob = new Blob([receipt], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${payment.id}-demo-receipt.txt`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            STUDENT FINANCE
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            Fees & Payments
          </h1>

          <p className="mt-3 text-[#718579]">
            Track your semester fees, payment history, and
            outstanding balances in one place.
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#DCE8DA] bg-white px-4 py-2 text-sm font-semibold text-[#45685B]">
          <ShieldCheck size={18} className="text-[#B78B28]" />
          Financial Overview
        </span>
      </div>

      {/* Statistics */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={24} />
              </div>

              <p className="text-sm text-[#718579]">{item.title}</p>

              <h2 className="mt-2 text-2xl font-extrabold text-[#234E43]">
                {item.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Analytics */}
      <div className="grid gap-6 xl:grid-cols-5">
        <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-xl font-bold text-[#234E43]">
            Payment Overview
          </h2>
          <p className="mt-1 text-sm text-[#718579]">
            Paid and outstanding balance
          </p>

          <div className="relative mt-5 h-64">
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
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => currency(value)} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-[#234E43]">
                {paymentPercentage}%
              </span>
              <span className="text-xs text-[#718579]">Paid</span>
            </div>
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semesterChart}>
                <CartesianGrid
                  stroke="#EDF1EB"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis dataKey="semester" />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip formatter={(value) => currency(value)} />
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
          </div>
        </section>
      </div>

      {/* Payment History */}
      <section className="rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#234E43]">
            Payment History
          </h2>

          <p className="mt-1 text-sm text-[#718579]">
            Review your fee records and payment details
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search payment records..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-11 pr-4 text-sm text-[#234E43] outline-none"
            />
          </div>

          <select
            value={semesterFilter}
            onChange={(event) => setSemesterFilter(event.target.value)}
            aria-label="Filter by semester"
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
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by payment status"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
          >
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left">
            <thead className="bg-[#F6F8F3] text-xs uppercase text-[#718579]">
              <tr>
                <th className="rounded-l-xl px-5 py-4">Reference</th>
                <th className="px-5 py-4">Fee Details</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Paid</th>
                <th className="px-5 py-4">Status</th>
                <th className="rounded-r-xl px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-[#EDF1EB] text-sm"
                >
                  <td className="px-5 py-4 font-bold text-[#234E43]">
                    {payment.id}
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-semibold text-[#234E43]">
                      {payment.type}
                    </p>
                    <p className="mt-1 text-xs text-[#8A9F90]">
                      {payment.semester}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-[#607B6C]">
                    {currency(payment.amount)}
                  </td>

                  <td className="px-5 py-4 text-[#607B6C]">
                    {currency(payment.paid)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        statusStyles[payment.status]
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <button
                      onClick={() => openDetails(payment)}
                      className="inline-flex items-center gap-1 font-semibold text-[#477764] hover:text-[#B78B28]"
                    >
                      Details
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPayments.length === 0 && (
            <p className="py-10 text-center text-[#718579]">
              No payment records match your filters.
            </p>
          )}
        </div>
      </section>

      {/* Financial Notice */}
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
            Financial information on this page is demonstration data.
            Online payment processing is not enabled. Please do not
            enter real payment credentials.
          </p>
        </div>
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDetails}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-dialog-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  PAYMENT RECORD
                </p>

                <h2
                  id="payment-dialog-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {selectedPayment.type}
                </h2>
              </div>

              <button
                onClick={closeDetails}
                aria-label="Close payment details"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 space-y-4 rounded-2xl bg-[#F6F8F3] p-5 text-sm text-[#45685B]">
              <p><strong>Reference:</strong> {selectedPayment.id}</p>
              <p><strong>Semester:</strong> {selectedPayment.semester}</p>
              <p><strong>Total Fee:</strong> {currency(selectedPayment.amount)}</p>
              <p><strong>Amount Paid:</strong> {currency(selectedPayment.paid)}</p>
              <p>
                <strong>Outstanding:</strong>{" "}
                {currency(selectedPayment.amount - selectedPayment.paid)}
              </p>
              <p><strong>Due Date:</strong> {selectedPayment.dueDate}</p>
              <p><strong>Payment Method:</strong> {selectedPayment.method}</p>
              <p><strong>Status:</strong> {selectedPayment.status}</p>
            </div>

            {selectedPayment.paid > 0 && (
              <button
                onClick={() => downloadReceipt(selectedPayment)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCE8DA] px-5 py-3.5 font-bold text-[#234E43] hover:bg-[#F1F7EF]"
              >
                <Download size={18} />
                Download Demo Receipt
              </button>
            )}

            {selectedPayment.status !== "Paid" && (
              <button
                onClick={() => {
                  setShowPaymentModal(true);
                  setPaymentMessage("");
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white hover:bg-[#326657]"
              >
                <CreditCard size={18} />
                Payment Options (Demo)
              </button>
            )}

            {showPaymentModal && (
              <div className="mt-5 rounded-2xl border border-[#E2EADC] p-5">
                <h3 className="font-bold text-[#234E43]">
                  Demonstration Payment
                </h3>

                <p className="mt-2 text-sm text-[#718579]">
                  No real payment gateway is connected.
                  This button only simulates a payment request.
                </p>

                <button
                  onClick={handleDemoPayment}
                  className="mt-4 rounded-xl bg-[#D9A536] px-5 py-3 font-bold text-[#234E43]"
                >
                  Simulate Payment Request
                </button>
              </div>
            )}

            {paymentMessage && (
              <p
                role="status"
                className="mt-4 rounded-xl bg-[#EAF2E8] p-4 text-sm text-[#234E43]"
              >
                {paymentMessage}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Fees & Payments
      </div>
    </div>
  );
}

export default StudentFees;
