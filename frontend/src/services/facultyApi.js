
import { getAuthToken } from "./authApi";

// ========================================
// UNIBEE FACULTY MANAGEMENT API
// ========================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

// ========================================
// SHARED AUTHENTICATED REQUEST
// ========================================

async function facultyRequest(
  endpoint,
  options = {}
) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Authentication required. Please sign in."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/faculty${endpoint}`,
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
      "Cannot connect to UniBee backend. Check that the server is running."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      "Invalid response received from server."
    );
  }

  if (!response.ok || result.success === false) {
    if (response.status === 401) {
      throw new Error(
        "Your login session has expired. Please sign in again."
      );
    }

    if (response.status === 403) {
      throw new Error(
        result.message ||
          "You do not have permission to manage faculty."
      );
    }

    throw new Error(
      result.message ||
        "Faculty API request failed."
    );
  }

  return result;
}

// ========================================
// GET ALL FACULTY
// ========================================

export async function getFaculty() {
  const result = await facultyRequest("");

  return result.data;
}

// ========================================
// GET SINGLE FACULTY
// ========================================

export async function getFacultyById(id) {
  const result = await facultyRequest(
    `/${encodeURIComponent(id)}`
  );

  return result.data;
}

// ========================================
// CREATE FACULTY
// ========================================

export async function createFaculty(data) {
  const result = await facultyRequest("", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return result.data;
}

// ========================================
// UPDATE FACULTY
// ========================================

export async function updateFaculty(id, data) {
  const result = await facultyRequest(
    `/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );

  return result.data;
}

// ========================================
// DELETE FACULTY
// ========================================

export async function deleteFaculty(id) {
  const result = await facultyRequest(
    `/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );

  return result.data;
}
