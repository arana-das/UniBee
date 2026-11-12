
const EDITABLE_FIELDS = [
  "studentId",
  "name",
  "email",
  "phone",
  "department",
  "program",
  "batch",
  "semester",
  "section",
  "status",
  "enrolledAt",
  "academicSession",
];

const FIELD_MAP = {
  name: "fullName",
};

// Convert frontend data into MongoDB fields
function toStudentDatabase(input = {}) {
  const result = {};

  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return result;
  }

  for (const field of EDITABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      continue;
    }

    const databaseField = FIELD_MAP[field] || field;
    const value = input[field];

    // Let Mongoose validate invalid value types.
    result[databaseField] =
      typeof value === "string" ? value.trim() : value;
  }

  if (typeof result.studentId === "string") {
    result.studentId = result.studentId.toUpperCase();
  }

  if (typeof result.email === "string") {
    result.email = result.email.toLowerCase();
  }

  return result;
}

// Convert MongoDB records into existing frontend fields
function toStudentFrontend(student) {
  if (!student) return null;

  const data =
    typeof student.toObject === "function"
      ? student.toObject()
      : student;

  const { fullName, ...rest } = data;

  return {
    ...rest,
    id: String(data._id || data.id || ""),
    name: fullName || "",
  };
}

module.exports = {
  toStudentDatabase,
  toStudentFrontend,
};
