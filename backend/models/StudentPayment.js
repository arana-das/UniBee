
const mongoose = require("mongoose");

const studentPaymentSchema = new mongoose.Schema(
  {
    fee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentFee",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    studentId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    method: {
      type: String,
      enum: [
        "Cash",
        "Bank Transfer",
        "Card",
        "Mobile Banking",
        "Other",
      ],
      default: "Cash",
    },
    reference: {
      type: String,
      default: "",
      trim: true,
    },
    paymentDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    status: {
      type: String,
      enum: ["Completed", "Voided"],
      default: "Completed",
    },
    notes: {
      type: String,
      default: "",
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "studentpayments",
  }
);

studentPaymentSchema.index({ fee: 1, status: 1 });
studentPaymentSchema.index({ studentId: 1 });

module.exports =
  mongoose.models.StudentPayment ||
  mongoose.model("StudentPayment", studentPaymentSchema);
