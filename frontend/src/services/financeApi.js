
import { getAuthToken } from "./authApi";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

async function financeRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in first.");
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}/api/finance${path}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      }
    );
  } catch {
    throw new Error("Cannot connect to finance server.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
      `Finance request failed (${response.status}).`
    );
  }

  return result.data ?? result;
}

// ========================================
// STUDENT DIRECTORY
// ========================================

export function getFinanceStudents() {
  return financeRequest("/students");
}

// ========================================
// STUDENT FEES
// ========================================

export function getStudentFees() {
  return financeRequest("/fees");
}

export function createStudentFee(data) {
  return financeRequest("/fees", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateStudentFee(id, data) {
  return financeRequest(
    `/fees/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

// ========================================
// PAYMENTS
// ========================================

export function getStudentPayments() {
  return financeRequest("/payments");
}

export function createStudentPayment(data) {
  return financeRequest("/payments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ========================================
// DUES + FINANCE SUMMARY
// ========================================

export function getFinanceSummary() {
  return financeRequest("/summary");
}

export function voidStudentPayment(id) {
  return financeRequest(
    `/payments/${encodeURIComponent(id)}/void`,
    { method: "PUT" }
  );
}


 
// ========================================
// SCHOLARSHIPS & WAIVERS — MONGODB API
// ========================================

// Get scholarship records
export function getStudentScholarships() {
  return financeRequest("/scholarships");
}

// Create scholarship
export function createStudentScholarship(data) {
  return financeRequest("/scholarships", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Update scholarship / approve / reject
export function updateStudentScholarship(id, data) {
  return financeRequest(
    `/scholarships/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

// Cancel scholarship (preserve database history)
export function cancelStudentScholarship(id) {
  return financeRequest(
    `/scholarships/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}
