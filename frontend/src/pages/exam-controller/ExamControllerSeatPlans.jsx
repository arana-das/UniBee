
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Armchair,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Users,
  X,
  AlertCircle,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ========================================
// UNIBEE MONGODB SEAT PLAN MANAGEMENT
// ========================================

const API = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const INPUT =
  "w-full rounded-xl border border-[#DCE6DC] bg-white px-4 py-3 text-sm text-[#234E43] outline-none focus:border-[#234E43]";

const BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-40";

const makeBatch = () => ({
  key: crypto.randomUUID(),
  batch: "",
  students: "",
  startId: "",
  endId: "",
});

const makeForm = () => ({
  room: "",
  building: "",
  examDate: "",
  session: "Morning",
  capacity: "40",
  batches: [makeBatch()],
});

const text = (value) =>
  String(value ?? "").trim();

const lower = (value) =>
  text(value).toLowerCase();

const totalOf = (batches) =>
  batches.reduce(
    (sum, batch) =>
      sum + (Number(batch.students) || 0),
    0
  );

const dateText = (date) =>
  date
    ? new Date(
        `${date}T12:00:00`
      ).toLocaleDateString("en-GB")
    : "—";

function safeHTML(value) {
  return text(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]
  );
}

function parseId(value) {
  const match = /^(.*?)(\d+)$/.exec(
    text(value).toUpperCase()
  );

  if (!match) return null;

  return {
    prefix: match[1],
    number: BigInt(match[2]),
    width: match[2].length,
  };
}

// ========================================
// AUTHENTICATED API REQUEST
// ========================================

async function api(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to your Exam Controller account."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API}/api/seat-plans${path}`,
      {
        method: options.method || "GET",
        signal: options.signal,
        cache: "no-store",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",

          ...(options.body !== undefined
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
        },

        ...(options.body !== undefined
          ? {
              body: JSON.stringify(
                options.body
              ),
            }
          : {}),
      }
    );
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error(
      "Cannot connect to UniBee Backend. Check port 5000 and CORS."
    );
  }

  const result = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    result?.success !== true
  ) {
    throw new Error(
      result?.message ||
      `Seat Plan API error (${response.status})`
    );
  }

  return result;
}

// ========================================
// FRONTEND VALIDATION
// ========================================

function validate(form) {
  if (!text(form.room)) {
    return "Room Number is required.";
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      form.examDate
    )
  ) {
    return "Select Examination Date.";
  }

  const capacity = Number(
    form.capacity
  );

  if (
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    capacity > 10000
  ) {
    return (
      "Room Capacity must be " +
      "between 1 and 10000."
    );
  }

  if (!form.batches.length) {
    return "Add at least one batch.";
  }

  const allocated = totalOf(
    form.batches
  );

  if (allocated > capacity) {
    return (
      "Allocated students exceed " +
      "Room Capacity."
    );
  }

  if (allocated === 0) {
    return "Enter at least one student.";
  }

  for (
    const [index, batch] of
    form.batches.entries()
  ) {
    const first = parseId(
      batch.startId
    );

    const last = parseId(
      batch.endId
    );

    const count = Number(
      batch.students
    );

    if (!text(batch.batch)) {
      return (
        `Batch ${index + 1}: ` +
        "Batch / Year is required."
      );
    }

    if (
      !Number.isSafeInteger(count) ||
      count < 1
    ) {
      return (
        `Batch ${batch.batch}: ` +
        "Invalid student count."
      );
    }

    if (
      !first ||
      !last ||
      first.prefix !== last.prefix ||
      first.width !== last.width ||
      first.number > last.number
    ) {
      return (
        `Batch ${batch.batch}: ` +
        "Invalid Student ID range."
      );
    }

    const rangeCount =
      last.number - first.number + 1n;

    if (
      rangeCount !== BigInt(count)
    ) {
      return (
        `Batch ${batch.batch}: ` +
        `The ID range contains ${rangeCount} ` +
        `students, but count is ${count}.`
      );
    }
  }

  return "";
}

// ========================================
// REUSABLE UI
// ========================================

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#234E43]">
        {label}
      </span>

      {children}
    </label>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[#DCE6DC] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#718579]">
            {label}
          </p>

          <p className="mt-2 text-3xl font-extrabold text-[#234E43]">
            {value}
          </p>
        </div>

        <Icon
          className="text-[#234E43]"
          size={24}
        />
      </div>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function ExamControllerSeatPlans() {
  const [plans, setPlans] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [formOpen, setFormOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [form, setForm] =
    useState(makeForm);

  const capacity =
    Number(form.capacity) || 0;

  const allocated =
    totalOf(form.batches);

  const remaining =
    capacity - allocated;

  // ======================================
  // LOAD MONGODB RECORDS
  // ======================================

  const load = useCallback(
    async (signal) => {
      setLoading(true);

      try {
        const result = await api(
          "/",
          { signal }
        );

        if (!signal?.aborted) {
          setPlans(result.data || []);
          setError("");
        }
      } catch (err) {
        if (
          err.name !== "AbortError"
        ) {
          setError(err.message);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller =
      new AbortController();

    load(controller.signal);

    return () =>
      controller.abort();
  }, [load]);

  // ======================================
  // OPEN CREATE FORM
  // ======================================

  function newPlan() {
    setForm(makeForm());
    setEditingId(null);
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  // ======================================
  // OPEN EDIT FORM
  // ======================================

  function editPlan(plan) {
    setEditingId(
      plan.id || plan._id
    );

    setForm({
      room: plan.room,
      building:
        plan.building || "",
      examDate:
        plan.examDate,
      session:
        plan.session,
      capacity:
        String(plan.capacity),

      batches: plan.batches.map(
        (batch) => ({
          ...batch,
          key: crypto.randomUUID(),
        })
      ),
    });

    setError("");
    setFormOpen(true);
  }

  function setField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
  }

  function setBatch(
    key,
    field,
    value
  ) {
    setForm((previous) => ({
      ...previous,

      batches:
        previous.batches.map(
          (batch) =>
            batch.key === key
              ? {
                  ...batch,
                  [field]: value,
                }
              : batch
        ),
    }));

    setError("");
  }

  function addBatch() {
    setForm((previous) => ({
      ...previous,

      batches: [
        ...previous.batches,
        makeBatch(),
      ],
    }));
  }

  function removeBatch(key) {
    setForm((previous) => ({
      ...previous,

      batches:
        previous.batches.filter(
          (batch) =>
            batch.key !== key
        ),
    }));
  }

  // ======================================
  // CREATE OR UPDATE MONGODB
  // ======================================

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    const validation =
      validate(form);

    if (validation) {
      setError(validation);
      return;
    }

    const body = {
      room: text(form.room),
      building:
        text(form.building),
      examDate:
        form.examDate,
      session:
        form.session,
      capacity:
        Number(form.capacity),

      batches:
        form.batches.map(
          (batch) => ({
            batch:
              text(batch.batch),
            students:
              Number(batch.students),
            startId:
              text(batch.startId),
            endId:
              text(batch.endId),
          })
        ),
    };

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await api(
        editingId
          ? `/${editingId}`
          : "/",
        {
          method:
            editingId
              ? "PUT"
              : "POST",

          body,
        }
      );

      setFormOpen(false);

      await load();

      setSuccess(
        result.message
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ======================================
  // DELETE MONGODB RECORD
  // ======================================

  async function remove(plan) {
    if (
      !window.confirm(
        `Delete Seat Plan for Room ${plan.room}?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await api(
        `/${plan.id || plan._id}`,
        {
          method: "DELETE",
        }
      );

      await load();

      setSuccess(
        result.message
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ======================================
  // CSV EXPORT
  // ======================================

  function exportCSV(plan) {
    const rows = [
      [
        "Room",
        "Building",
        "Exam Date",
        "Session",
        "Capacity",
        "Batch",
        "Student Count",
        "Starting ID",
        "Ending ID",
      ],

      ...plan.batches.map(
        (batch) => [
          plan.room,
          plan.building,
          plan.examDate,
          plan.session,
          plan.capacity,
          batch.batch,
          batch.students,
          batch.startId,
          batch.endId,
        ]
      ),
    ];

    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((value) => {
              let cell =
                text(value);

              if (
                /^[=+\-@\t\r]/.test(
                  cell
                )
              ) {
                cell =
                  "'" + cell;
              }

              return (
                `"${cell.replace(
                  /"/g,
                  '""'
                )}"`
              );
            })
            .join(",")
        )
        .join("\r\n");

    const blob = new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8",
      }
    );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href = url;

    anchor.download =
      `UniBee_SeatPlan_${plan.room}_${plan.examDate}.csv`;

    document.body.appendChild(
      anchor
    );

    anchor.click();
    anchor.remove();

    setTimeout(
      () =>
        URL.revokeObjectURL(
          url
        ),
      1000
    );
  }

  // ======================================
  // PRINT SEAT PLAN
  // ======================================

  function printPlan(plan) {
    const popup = window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

    if (!popup) {
      setError(
        "Allow browser popups to print."
      );
      return;
    }

    const rows =
      plan.batches.map(
        (batch, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${safeHTML(
              batch.batch
            )}</td>
            <td>${batch.students}</td>
            <td>${safeHTML(
              batch.startId
            )}</td>
            <td>${safeHTML(
              batch.endId
            )}</td>
          </tr>
        `
      ).join("");

    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>UniBee Seat Plan</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
          }
          h1, h2, .info {
            text-align: center;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 25px;
          }
          th, td {
            border: 1px solid #333;
            padding: 10px;
            text-align: left;
          }
          th {
            background: #eee;
          }
          .sign {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
          }
        </style>
      </head>
      <body>
        <h1>UNIBEE UNIVERSITY</h1>
        <h2>EXAMINATION SEAT PLAN</h2>
        <div class="info">
          Building:
          ${safeHTML(
            plan.building || "—"
          )}
          |
          Room:
          ${safeHTML(plan.room)}
          <br/>
          Date:
          ${safeHTML(
            plan.examDate
          )}
          |
          Session:
          ${safeHTML(
            plan.session
          )}
          |
          Capacity:
          ${plan.capacity}
        </div>

        <table>
          <thead>
            <tr>
              <th>SL</th>
              <th>Batch / Year</th>
              <th>Students</th>
              <th>Starting ID</th>
              <th>Ending ID</th>
            </tr>
          </thead>

          <tbody>${rows}</tbody>

          <tfoot>
            <tr>
              <th colspan="2">
                Total
              </th>
              <th>
                ${plan.total}
              </th>
              <th colspan="2">
                Remaining:
                ${plan.capacity - plan.total}
              </th>
            </tr>
          </tfoot>
        </table>

        <div class="sign">
          <span>
            Prepared by:
            ____________
          </span>

          <span>
            Exam Controller:
            ____________
          </span>
        </div>
      </body>
      </html>
    `);

    popup.document.close();

    popup.onload = () => {
      popup.focus();
      popup.print();
    };
  }

  // ======================================
  // SEARCH AND STATISTICS
  // ======================================

  const filtered = useMemo(
    () =>
      plans.filter(
        (plan) =>
          [
            plan.room,
            plan.building,
            plan.examDate,
            plan.session,

            ...plan.batches.flatMap(
              (batch) => [
                batch.batch,
                batch.startId,
                batch.endId,
              ]
            ),
          ].some((value) =>
            lower(value).includes(
              lower(search)
            )
          )
      ),
    [plans, search]
  );

  const countStudents =
    plans.reduce(
      (sum, plan) =>
        sum +
        Number(
          plan.total || 0
        ),
      0
    );

  const countSeats =
    plans.reduce(
      (sum, plan) =>
        sum +
        Number(
          plan.capacity || 0
        ),
      0
    );

  const rooms = new Set(
    plans.map(
      (plan) =>
        `${lower(
          plan.building
        )}:${lower(
          plan.room
        )}`
    )
  ).size;

  const batches = new Set(
    plans.flatMap(
      (plan) =>
        plan.batches.map(
          (batch) =>
            lower(
              batch.batch
            )
        )
    )
  ).size;

  // ======================================
  // PAGE RENDER
  // ======================================

  return (
    <div className="space-y-7 pb-12">
      {/* HEADER */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18B37]">
            EXAM CONTROLLER
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-[#234E43]">
            Seat Plan Management
          </h1>

          <p className="mt-2 text-sm text-[#718579]">
            Room-wise Batch Distribution ·
            Saved in MongoDB
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => load()}
            disabled={busy || loading}
            className={`${BTN} border bg-white text-[#234E43]`}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={newPlan}
            className={`${BTN} bg-[#234E43] text-white`}
          >
            <Plus size={17} />
            Create Room Seat Plan
          </button>
        </div>
      </header>

      {/* LOADING */}
      {loading && (
        <p className="flex items-center gap-2 rounded-xl bg-white p-4 text-sm">
          <Loader2
            size={18}
            className="animate-spin"
          />
          Loading MongoDB Seat Plans...
        </p>
      )}

      {/* ERROR */}
      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </p>
      )}

      {/* SUCCESS */}
      {success && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {success}
        </p>
      )}

      {/* HERO */}
      <section className="rounded-3xl bg-[#234E43] p-7 text-white">
        <p className="text-xs font-bold text-[#E8C26A]">
          ROOM-WISE SEATING
        </p>

        <h2 className="mt-3 text-2xl font-extrabold">
          Batch-Based Examination Seat Planning
        </h2>

        <p className="mt-2 text-sm text-[#D0E2D7]">
          Room Number → Maximum Capacity →
          Batch → Students → Starting and
          Ending IDs. Plans are stored in MongoDB.
        </p>
      </section>

      {/* STATISTICS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Building2}
          label="Unique Rooms"
          value={rooms}
        />

        <Stat
          icon={Users}
          label="Allocated Students"
          value={countStudents}
        />

        <Stat
          icon={Armchair}
          label="Planned Capacity"
          value={countSeats}
        />

        <Stat
          icon={CalendarDays}
          label="Different Batches"
          value={batches}
        />
      </section>

      {/* SEARCH */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#718579]"
          size={18}
        />

        <input
          className={`${INPUT} pl-11`}
          placeholder="Search room, batch, date or Student ID..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
        />
      </div>

      {/* EMPTY STATE */}
      {!loading && !filtered.length && (
        <div className="rounded-2xl border bg-white p-10 text-center text-[#718579]">
          No Seat Plans found. Click
          Create Room Seat Plan.
        </div>
      )}

      {/* SAVED ROOM PLANS */}
      {filtered.map((plan) => (
        <article
          key={plan.id || plan._id}
          className="overflow-hidden rounded-2xl border border-[#DCE6DC] bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div>
              <p className="text-xs font-bold text-[#B18B37]">
                ROOM SEAT PLAN
              </p>

              <h3 className="mt-2 text-2xl font-extrabold text-[#234E43]">
                Room {plan.room}
              </h3>

              <p className="mt-1 text-sm text-[#718579]">
                {plan.building || "Campus"}
                {" · "}
                {dateText(plan.examDate)}
                {" · "}
                {plan.session}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  editPlan(plan)
                }
                className={`${BTN} bg-[#EAF2E8] text-[#234E43]`}
              >
                <Edit3 size={16} />
                Edit
              </button>

              <button
                type="button"
                onClick={() =>
                  printPlan(plan)
                }
                className={`${BTN} bg-[#234E43] text-white`}
              >
                <Printer size={16} />
                Print
              </button>

              <button
                type="button"
                onClick={() =>
                  exportCSV(plan)
                }
                className={`${BTN} border text-[#234E43]`}
              >
                <Download size={16} />
                CSV
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  remove(plan)
                }
                className={`${BTN} bg-rose-50 text-rose-700`}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-5">
            {[
              [
                "Capacity",
                plan.capacity,
              ],
              [
                "Allocated",
                plan.total,
              ],
              [
                "Remaining",
                plan.capacity -
                  plan.total,
              ],
            ].map(
              ([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-[#F5F8F3] p-3 text-center"
                >
                  <p className="text-xs text-[#718579]">
                    {label}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-[#234E43]">
                    {value}
                  </p>
                </div>
              )
            )}
          </div>

          {/* CAPACITY BAR */}
          <div className="px-5">
            <div className="h-3 overflow-hidden rounded-full bg-[#E7EDE5]">
              <div
                className="h-full bg-[#234E43]"
                style={{
                  width: `${
                    Math.min(
                      100,
                      (plan.total /
                        plan.capacity) *
                        100
                    )
                  }%`,
                }}
              />
            </div>
          </div>

          {/* BATCH TABLE */}
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[550px] text-left text-sm">
              <thead className="bg-[#F5F8F3] text-[#234E43]">
                <tr>
                  <th className="p-3">
                    Batch / Year
                  </th>

                  <th className="p-3">
                    Students
                  </th>

                  <th className="p-3">
                    Starting ID
                  </th>

                  <th className="p-3">
                    Ending ID
                  </th>
                </tr>
              </thead>

              <tbody>
                {plan.batches.map(
                  (batch, index) => (
                    <tr
                      key={index}
                      className="border-t"
                    >
                      <td className="p-3 font-bold">
                        {batch.batch}
                      </td>

                      <td className="p-3">
                        {batch.students}
                      </td>

                      <td className="p-3">
                        {batch.startId}
                      </td>

                      <td className="p-3">
                        {batch.endId}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </article>
      ))}

      {/* CREATE / EDIT MODAL */}
      {formOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3">
          <form
            onSubmit={save}
            className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl md:p-8"
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  EXAM CONTROLLER
                </p>

                <h2 className="mt-2 text-2xl font-extrabold text-[#234E43]">
                  {editingId
                    ? "Edit"
                    : "Create"}{" "}
                  Room Seat Plan
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFormOpen(false)
                }
                aria-label="Close"
                className="rounded-lg bg-[#F5F8F3] p-2"
              >
                <X size={20} />
              </button>
            </div>

            {/* ROOM DETAILS */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Room Number *">
                <input
                  required
                  className={INPUT}
                  placeholder="301"
                  value={form.room}
                  onChange={(event) =>
                    setField(
                      "room",
                      event.target.value
                    )
                  }
                />
              </Field>

              <Field label="Maximum Room Capacity *">
                <input
                  required
                  type="number"
                  min="1"
                  max="10000"
                  className={INPUT}
                  value={
                    form.capacity
                  }
                  onChange={(event) =>
                    setField(
                      "capacity",
                      event.target.value
                    )
                  }
                />
              </Field>

              <Field label="Building / Venue">
                <input
                  className={INPUT}
                  value={
                    form.building
                  }
                  placeholder="Academic Building"
                  onChange={(event) =>
                    setField(
                      "building",
                      event.target.value
                    )
                  }
                />
              </Field>

              <Field label="Exam Date *">
                <input
                  required
                  type="date"
                  className={INPUT}
                  value={
                    form.examDate
                  }
                  onChange={(event) =>
                    setField(
                      "examDate",
                      event.target.value
                    )
                  }
                />
              </Field>

              <Field label="Session">
                <select
                  className={INPUT}
                  value={
                    form.session
                  }
                  onChange={(event) =>
                    setField(
                      "session",
                      event.target.value
                    )
                  }
                >
                  <option>
                    Morning
                  </option>

                  <option>
                    Afternoon
                  </option>

                  <option>
                    Evening
                  </option>
                </select>
              </Field>
            </div>

            {/* BATCH DISTRIBUTION */}
            <div className="mt-7 flex items-center justify-between gap-3 border-t pt-6">
              <div>
                <h3 className="text-xl font-bold text-[#234E43]">
                  Batch-wise Distribution
                </h3>

                <p className="text-xs text-[#718579]">
                  ID range must contain exactly
                  the entered number of students.
                </p>
              </div>

              <button
                type="button"
                onClick={addBatch}
                className={`${BTN} bg-[#EAF2E8] text-[#234E43]`}
              >
                <Plus size={17} />
                Add Batch
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {form.batches.map(
                (batch, index) => (
                  <div
                    key={batch.key}
                    className="rounded-xl border bg-[#F8FAF7] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <strong className="text-[#234E43]">
                        Batch {index + 1}
                      </strong>

                      <button
                        type="button"
                        disabled={
                          form.batches.length === 1
                        }
                        onClick={() =>
                          removeBatch(
                            batch.key
                          )
                        }
                        className="rounded-lg bg-rose-50 p-2 text-rose-700 disabled:opacity-40"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <Field label="Batch / Year *">
                        <input
                          required
                          className={INPUT}
                          value={
                            batch.batch
                          }
                          placeholder="2023"
                          onChange={(event) =>
                            setBatch(
                              batch.key,
                              "batch",
                              event.target.value
                            )
                          }
                        />
                      </Field>

                      <Field label="Number of Students *">
                        <input
                          required
                          type="number"
                          min="1"
                          step="1"
                          className={INPUT}
                          value={
                            batch.students
                          }
                          placeholder="15"
                          onChange={(event) =>
                            setBatch(
                              batch.key,
                              "students",
                              event.target.value
                            )
                          }
                        />
                      </Field>

                      <Field label="Starting Student ID *">
                        <input
                          required
                          className={INPUT}
                          value={
                            batch.startId
                          }
                          placeholder="23001"
                          onChange={(event) =>
                            setBatch(
                              batch.key,
                              "startId",
                              event.target.value
                            )
                          }
                        />
                      </Field>

                      <Field label="Ending Student ID *">
                        <input
                          required
                          className={INPUT}
                          value={
                            batch.endId
                          }
                          placeholder="23015"
                          onChange={(event) =>
                            setBatch(
                              batch.key,
                              "endId",
                              event.target.value
                            )
                          }
                        />
                      </Field>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* ROOM SUMMARY */}
            <div className="mt-6 rounded-xl bg-[#F5F8F3] p-5">
              <h3 className="font-bold text-[#234E43]">
                Room Capacity Summary
              </h3>

              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  [
                    "Capacity",
                    capacity,
                  ],
                  [
                    "Allocated",
                    allocated,
                  ],
                  [
                    "Remaining",
                    remaining,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-white p-3 text-center"
                    >
                      <p className="text-xs text-[#718579]">
                        {label}
                      </p>

                      <p
                        className={`mt-2 text-2xl font-bold ${
                          value < 0
                            ? "text-rose-700"
                            : "text-[#234E43]"
                        }`}
                      >
                        {value}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormOpen(false)
                }
                className={`${BTN} border text-[#234E43]`}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  busy ||
                  remaining < 0 ||
                  allocated < 1
                }
                className={`${BTN} bg-[#234E43] text-white`}
              >
                {busy ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={18} />
                )}

                Save to MongoDB
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
