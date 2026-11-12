
import { getAuthToken } from "./authApi";

// ========================================
// UNIBEE USER MANAGEMENT API SERVICE
// ========================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

// ========================================
// SHARED AUTHENTICATED REQUEST
// ========================================

async function request(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Authentication required. Please sign in as Admin."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
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
      "The server returned an invalid response."
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
          "You do not have permission to manage users."
      );
    }

    throw new Error(
      result.message ||
        "User Management request failed."
    );
  }

  return result;
}

// ========================================
// GET ALL USERS
// ========================================

export async function getUsers() {
  const result = await request("/api/users");

  return result.data;
}

// ========================================
// GET ONE USER
// ========================================

export async function getUserById(id) {
  const result = await request(
    `/api/users/${encodeURIComponent(id)}`
  );

  return result.data;
}

// ========================================
// CREATE USER
// ========================================

export async function createUser(data) {
  const result = await request(
    "/api/users",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  return result.data;
}

// ========================================
// UPDATE USER
// ========================================

export async function updateUser(id, data) {
  const result = await request(
    `/api/users/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );

  return result.data;
}

// ========================================
// ACTIVATE / SUSPEND / MARK PENDING
// ========================================

export async function changeUserStatus(
  id,
  status
) {
  const result = await request(
    `/api/users/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );

  return result.data;
}

// ========================================
// DELETE USER
// ========================================

export async function deleteUser(id) {
  const result = await request(
    `/api/users/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );

  return result.data;
}
