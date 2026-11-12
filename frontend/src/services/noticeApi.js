import { getAuthToken } from "./authApi";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

// ========================================
// UNIBEE NOTICE API SERVICE
// ========================================

async function request(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Authentication required. Please log in.");
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot connect to server. Check that the backend is running.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Invalid response received from server.");
  }

  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Notice API request failed (${response.status}).`);
  }

  return result.data ?? result;
}

// Get all notices visible to the logged-in role
export function getNotices() {
  return request("/api/notices");
}

// Get single notice
export function getNoticeById(id) {
  return request(`/api/notices/${encodeURIComponent(id)}`);
}

// Create new notice (Admin / HOD)
export function createNotice(data) {
  return request("/api/notices", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Update notice (Admin / HOD)
export function updateNotice(id, data) {
  return request(`/api/notices/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Delete notice (Admin / HOD)
export function deleteNotice(id) {
  return request(`/api/notices/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
