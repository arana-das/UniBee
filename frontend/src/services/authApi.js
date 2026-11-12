
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const TOKEN_KEY = "unibee-auth-token";
const USER_KEY = "unibee-auth-user";

// ========================================
// UNIBEE AUTHENTICATION SERVICE
// ========================================

// Get the current login token
export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

// Get the currently stored user
export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ========================================
// LOGIN
// ========================================

export async function loginUser(email, password) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    }
  );

  const result = await response.json();

  if (
    !response.ok ||
    !result.success ||
    !result.token ||
    !result.user
  ) {
    throw new Error(
      result.message || "Unable to log in."
    );
  }

  sessionStorage.setItem(
    TOKEN_KEY,
    result.token
  );

  sessionStorage.setItem(
    USER_KEY,
    JSON.stringify(result.user)
  );

  return result.user;
}

// ========================================
// GET CURRENT USER FROM BACKEND
// ========================================

export async function fetchCurrentUser() {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Authentication required. Please log in."
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/auth/me`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    if (response.status === 401) {
      logoutUser();
    }

    throw new Error(
      result.message ||
      "Unable to verify login session."
    );
  }

  sessionStorage.setItem(
    USER_KEY,
    JSON.stringify(result.user)
  );

  return result.user;
}

// ========================================
// LOGOUT
// ========================================

export function logoutUser() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

// ========================================
// AUTHENTICATION STATUS
// ========================================

export function isAuthenticated() {
  return Boolean(getAuthToken());
}
