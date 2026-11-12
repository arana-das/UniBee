import { getAuthToken } from "./authApi";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

async function libraryRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Please log in to access the library."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}/api/library${path}`,
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
    throw new Error(
      "Cannot connect to the library server."
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
      `Library request failed (${response.status}).`
    );
  }

  return result.data ?? result;
}

// ========================================
// BOOK MANAGEMENT
// ========================================

// Get all books from MongoDB
export function getLibraryBooks() {
  return libraryRequest("/books");
}

// Get single book
export function getLibraryBook(id) {
  return libraryRequest(
    `/books/${encodeURIComponent(id)}`
  );
}

// Add new book
export function createLibraryBook(data) {
  return libraryRequest("/books", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Update existing book
export function updateLibraryBook(id, data) {
  return libraryRequest(
    `/books/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

// Delete book
export function deleteLibraryBook(id) {
  return libraryRequest(
    `/books/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

// ========================================
// CIRCULATION / LOANS MANAGEMENT
// ========================================

// Get all loans (Filtered by student on backend for student role)
export function getLibraryLoans() {
  return libraryRequest("/loans");
}

// Issue a book to a student
export function issueLibraryLoan(data) {
  return libraryRequest("/loans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Return an issued book
export function returnLibraryLoan(id, data = {}) {
  return libraryRequest(
    `/loans/${encodeURIComponent(id)}/return`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

// Renew a book loan
export function renewLibraryLoan(id, days = 14) {
  return libraryRequest(
    `/loans/${encodeURIComponent(id)}/renew`,
    {
      method: "PUT",
      body: JSON.stringify({ days }),
    }
  );
}

// ========================================
// BOOK RESERVATION REQUESTS
// ========================================

// Get requests (Librarian gets all; Student gets own)
export function getLibraryRequests() {
  return libraryRequest("/requests");
}

// Submit a new book request
export function createLibraryRequest(data) {
  return libraryRequest("/requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Approve / Reject a book request (Librarian only)
export function updateLibraryRequestStatus(id, status, notes = "") {
  return libraryRequest(
    `/requests/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    }
  );
}

// Get active students for Librarian book circulation
export function getLibraryStudents() {
  return libraryRequest("/students");
}


 
// ========================================
// LIBRARY PURCHASE PLANS — MONGODB CRUD
// ========================================

// Get all purchase plans
export function getLibraryPurchasePlans() {
  return libraryRequest("/purchase-plans");
}

// Create a purchase plan
export function createLibraryPurchasePlan(data) {
  return libraryRequest("/purchase-plans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Update an existing purchase plan
export function updateLibraryPurchasePlan(id, data) {
  return libraryRequest(
    `/purchase-plans/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

// Delete a purchase plan
export function deleteLibraryPurchasePlan(id) {
  return libraryRequest(
    `/purchase-plans/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}


 
// ========================================
// LIBRARY ANNOUNCEMENTS — MONGODB API
// ========================================

// Get announcements
// Librarian: all announcements
// Student: only published announcements for students
export function getLibraryAnnouncements() {
  return libraryRequest("/announcements");
}

// Create new announcement
export function createLibraryAnnouncement(data) {
  return libraryRequest("/announcements", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Update existing announcement
export function updateLibraryAnnouncement(id, data) {
  return libraryRequest(
    `/announcements/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

// Delete announcement
export function deleteLibraryAnnouncement(id) {
  return libraryRequest(
    `/announcements/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}
