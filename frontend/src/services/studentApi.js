
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

// ========================================
// UNIBEE STUDENT API SERVICE
// ========================================

async function request(path, token, options = {}) {
  if (!token) {
    throw new Error(
      "Authentication required. Please log in."
    );
  }

  const response = await fetch(
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

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Student API request failed."
    );
  }

  return result;
}

// ========================================
// GET ALL STUDENTS
// ========================================

export async function getStudents(token) {
  const result = await request(
    "/api/students",
    token
  );

  return result.data;
}

// ========================================
// CREATE STUDENT
// ========================================

export async function createStudent(token, data) {
  const result = await request(
    "/api/students",
    token,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  return result.data;
}

// ========================================
// UPDATE STUDENT
// ========================================

export async function updateStudent(
  token,
  studentId,
  data
) {
  const result = await request(
    `/api/students/${encodeURIComponent(studentId)}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );

  return result.data;
}

// ========================================
// DELETE STUDENT
// ========================================

export async function deleteStudent(token, studentId) {
  const result = await request(
    `/api/students/${encodeURIComponent(studentId)}`,
    token,
    {
      method: "DELETE",
    }
  );

  return result.data;
}
