const express = require("express");
const mongoose = require("mongoose");

const LibraryBook = require("../models/LibraryBook");
const LibraryLoan = require("../models/LibraryLoan");
const BookRequest = require("../models/BookRequest");
const LibraryPurchasePlan = require("../models/LibraryPurchasePlan");
const LibraryAnnouncement = require("../models/LibraryAnnouncement");
const Student = require("../models/Student");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require an authenticated user
router.use(protect);


  
// ========================================
// LIBRARIAN STUDENT LOOKUP
// Read-only student directory for book issuing
// ========================================

router.get(
  "/students",
  authorize("admin", "librarian"),
  async (req, res) => {
    try {
      const students = await Student.find({
        status: "Active",
      })
        .select("studentId fullName email department")
        .sort({ fullName: 1 })
        .lean();

      return res.json({
        success: true,
        data: students.map((student) => ({
          id: String(student._id),
          studentId: student.studentId,
          name: student.fullName,
          email: student.email,
          department: student.department,
        })),
      });
    } catch (error) {
      return sendError(
        res,
        error,
        "Library Student Lookup API"
      );
    }
  }
);


const allowedBookFields = [
  "title",
  "author",
  "isbn",
  "category",
  "publisher",
  "edition",
  "year",
  "shelf",
  "copies",
  "status",
  "description",
];

function pickBookFields(body) {
  const result = {};
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return result;
  }
  for (const field of allowedBookFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      result[field] = body[field];
    }
  }
  return result;
}

function formatDoc(doc) {
  const data = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    ...data,
    id: String(data._id),
  };
}

function sendError(res, error, prefix = "Library API") {
  console.error(`${prefix}:`, error.message);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate catalog information.",
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors)
        .map((item) => item.message)
        .join(" "),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID or data format.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Library operation failed.",
  });
}

// ========================================
// 1. BOOK CATALOG ENDPOINTS
// ========================================

// GET /api/library/books (Accessible to all authenticated users)
router.get("/books", async (req, res) => {
  try {
    const books = await LibraryBook.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: books.map(formatDoc),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /api/library/books/:id
router.get("/books/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID.",
      });
    }

    const book = await LibraryBook.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.json({
      success: true,
      data: formatDoc(book),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// POST /api/library/books (Librarian & Admin only)
router.post("/books", authorize("admin", "librarian"), async (req, res) => {
  try {
    const data = pickBookFields(req.body);
    const book = await LibraryBook.create(data);

    return res.status(201).json({
      success: true,
      message: "Book added successfully.",
      data: formatDoc(book),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// PUT /api/library/books/:id
router.put("/books/:id", authorize("admin", "librarian"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID.",
      });
    }

    const updates = pickBookFields(req.body);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided.",
      });
    }

    const book = await LibraryBook.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.json({
      success: true,
      message: "Book updated successfully.",
      data: formatDoc(book),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// DELETE /api/library/books/:id
router.delete("/books/:id", authorize("admin", "librarian"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID.",
      });
    }

    // Check if there are active loans for this book before deletion
    const activeLoans = await LibraryLoan.countDocuments({
      book: req.params.id,
      status: "Borrowed",
    });

    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete book. It currently has ${activeLoans} active loan(s).`,
      });
    }

    const book = await LibraryBook.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.json({
      success: true,
      message: "Book deleted successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// ========================================
// 2. CIRCULATION / LOANS ENDPOINTS
// ========================================

// GET /api/library/loans
// Students see only their own loans; Librarian & Admin see all loans
router.get("/loans", async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "student") {
      // Find student record linked to user
      let studentId = req.user.userId;
      if (!studentId && req.user.profileId) {
        const student = await Student.findById(req.user.profileId);
        if (student) studentId = student.studentId;
      }
      if (!studentId) {
        const student = await Student.findOne({ email: req.user.email });
        if (student) studentId = student.studentId;
      }

      filter.$or = [
        { studentId: studentId || "NONE" },
        { studentEmail: req.user.email },
      ];
      if (req.user.profileId) {
        filter.$or.push({ student: req.user.profileId });
      }
    }

    const loans = await LibraryLoan.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: loans.map(formatDoc),
    });
  } catch (error) {
    return sendError(res, error, "Library Loans API");
  }
});

// POST /api/library/loans (Issue Book - Librarian & Admin only)
router.post("/loans", authorize("admin", "librarian"), async (req, res) => {
  try {
    const {
      bookId,
      studentId,
      studentName,
      studentEmail = "",
      issueDate,
      dueDate,
      notes = "",
    } = req.body || {};

    if (!bookId || !studentId || !studentName) {
      return res.status(400).json({
        success: false,
        message: "Book ID, Student ID, and Student Name are required.",
      });
    }

    let book;
    if (mongoose.isValidObjectId(bookId)) {
      book = await LibraryBook.findById(bookId);
    }
    if (!book) {
      book = await LibraryBook.findOne({
        $or: [{ title: bookId }, { isbn: bookId }],
      });
    }

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found in library catalog.",
      });
    }

    // Check available copies
    const activeBorrowedCount = await LibraryLoan.countDocuments({
      book: book._id,
      status: "Borrowed",
    });

    if (activeBorrowedCount >= Number(book.copies)) {
      return res.status(400).json({
        success: false,
        message: `All copies of "${book.title}" are currently issued. None available.`,
      });
    }

    // Link Student profile if exists
    const student = await Student.findOne({
      $or: [
        { studentId: studentId.trim().toUpperCase() },
        { email: studentEmail.trim().toLowerCase() },
      ],
    });

    const now = new Date();
    const formattedIssueDate =
      issueDate || now.toISOString().split("T")[0];
    const defaultDueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const loan = await LibraryLoan.create({
      book: book._id,
      bookTitle: book.title,
      student: student ? student._id : null,
      studentId: studentId.trim().toUpperCase(),
      studentName: studentName.trim(),
      studentEmail: studentEmail ? studentEmail.trim().toLowerCase() : (student?.email || ""),
      issueDate: formattedIssueDate,
      dueDate: dueDate || defaultDueDate,
      status: "Borrowed",
      issuedBy: req.user._id,
      notes,
    });

    // If there is an approved request for this student and book, mark it Issued
    await BookRequest.findOneAndUpdate(
      {
        book: book._id,
        studentId: studentId.trim().toUpperCase(),
        status: { $in: ["Pending", "Approved"] },
      },
      {
        status: "Issued",
        actionDate: new Date(),
        actionBy: req.user._id,
      }
    );

    return res.status(201).json({
      success: true,
      message: `Book "${book.title}" issued successfully to ${studentName}.`,
      data: formatDoc(loan),
    });
  } catch (error) {
    return sendError(res, error, "Issue Loan API");
  }
});

// PUT /api/library/loans/:id/return (Return Book - Librarian & Admin only)
router.put("/loans/:id/return", authorize("admin", "librarian"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan ID.",
      });
    }

    const loan = await LibraryLoan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan record not found.",
      });
    }

    if (loan.status === "Returned") {
      return res.status(400).json({
        success: false,
        message: "This book has already been marked as returned.",
      });
    }

    const returnDate =
      req.body.returnDate || new Date().toISOString().split("T")[0];
    const fine = Number(req.body.fine) || 0;

    loan.returnDate = returnDate;
    loan.status = "Returned";
    loan.fine = fine;
    loan.fineStatus = fine > 0 ? "Pending" : "None";
    if (req.body.notes) loan.notes = req.body.notes;

    await loan.save();

    return res.json({
      success: true,
      message: `Book "${loan.bookTitle}" marked as returned.`,
      data: formatDoc(loan),
    });
  } catch (error) {
    return sendError(res, error, "Return Loan API");
  }
});

// PUT /api/library/loans/:id/renew (Renew Loan - Librarian & Admin only)
router.put("/loans/:id/renew", authorize("admin", "librarian"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan ID.",
      });
    }

    const loan = await LibraryLoan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan record not found.",
      });
    }

    if (loan.status === "Returned") {
      return res.status(400).json({
        success: false,
        message: "Cannot renew a book that has already been returned.",
      });
    }

    // Add 14 days to existing dueDate
    const currentDue = new Date(`${loan.dueDate}T12:00:00`);
    currentDue.setDate(currentDue.getDate() + (Number(req.body.days) || 14));
    const newDueDate = currentDue.toISOString().split("T")[0];

    loan.dueDate = newDueDate;
    loan.renewCount = (loan.renewCount || 0) + 1;
    await loan.save();

    return res.json({
      success: true,
      message: `Loan renewed. New due date is ${newDueDate}.`,
      data: formatDoc(loan),
    });
  } catch (error) {
    return sendError(res, error, "Renew Loan API");
  }
});

// ========================================
// 3. BOOK REQUESTS ENDPOINTS
// ========================================

// GET /api/library/requests
router.get("/requests", async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "student") {
      let studentId = req.user.userId;
      if (!studentId && req.user.profileId) {
        const student = await Student.findById(req.user.profileId);
        if (student) studentId = student.studentId;
      }
      if (!studentId) {
        const student = await Student.findOne({ email: req.user.email });
        if (student) studentId = student.studentId;
      }

      filter.$or = [{ studentId: studentId || "NONE" }];
      if (req.user.profileId) {
        filter.$or.push({ student: req.user.profileId });
      }
    }

    const requests = await BookRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: requests.map(formatDoc),
    });
  } catch (error) {
    return sendError(res, error, "Book Requests API");
  }
});

// POST /api/library/requests (Student or Librarian creates request)
router.post("/requests", async (req, res) => {
  try {
    const {
      bookId,
      bookTitle,
      studentId,
      studentName,
      reason = "",
      quantity = 1,
    } = req.body || {};

    let book;
    if (mongoose.isValidObjectId(bookId)) {
      book = await LibraryBook.findById(bookId);
    }
    if (!book && bookTitle) {
      book = await LibraryBook.findOne({ title: bookTitle.trim() });
    }

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    const reqStudentId =
      req.user.role === "student"
        ? (req.user.userId || studentId || "STUDENT")
        : (studentId || "STUDENT");

    const reqStudentName =
      req.user.role === "student"
        ? (req.user.fullName || studentName)
        : studentName;

    const request = await BookRequest.create({
      book: book._id,
      bookTitle: book.title,
      student: req.user.profileId || null,
      studentId: reqStudentId,
      studentName: reqStudentName,
      reason,
      quantity: Number(quantity) || 1,
      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      message: "Book request submitted successfully.",
      data: formatDoc(request),
    });
  } catch (error) {
    return sendError(res, error, "Create Book Request API");
  }
});

// PATCH /api/library/requests/:id (Approve / Reject - Librarian & Admin only)
router.patch("/requests/:id", authorize("admin", "librarian"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID.",
      });
    }

    const { status, notes = "" } = req.body;
    if (!["Approved", "Rejected", "Cancelled", "Issued"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value.",
      });
    }

    const request = await BookRequest.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          notes,
          actionDate: new Date(),
          actionBy: req.user._id,
        },
      },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Book request not found.",
      });
    }

    return res.json({
      success: true,
      message: `Request status updated to ${status}.`,
      data: formatDoc(request),
    });
  } catch (error) {
    return sendError(res, error, "Update Book Request API");
  }
});


  
// ========================================
// 4. LIBRARY PURCHASE PLANS - MONGODB CRUD
// ========================================

// GET /api/library/purchase-plans
router.get(
  "/purchase-plans",
  authorize("admin", "librarian"),
  async (req, res) => {
    try {
      const plans = await LibraryPurchasePlan.find()
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        data: plans.map(formatDoc),
      });
    } catch (error) {
      return sendError(res, error, "Get Purchase Plans API");
    }
  }
);

// POST /api/library/purchase-plans
router.post(
  "/purchase-plans",
  authorize("admin", "librarian"),
  async (req, res) => {
    try {
      const {
        bookId = "",
        bookTitle,
        requiredCopies,
        unitPrice = null,
        priority = "Medium",
        status = "Planned",
        notes = "",
      } = req.body || {};

      const quantity = Number(requiredCopies);

      if (
        !String(bookTitle || "").trim() ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Book title and valid required copies are mandatory.",
        });
      }

      let book = null;

      if (bookId && mongoose.isValidObjectId(bookId)) {
        book = await LibraryBook.findById(bookId);
        if (!book) {
          return res.status(404).json({
            success: false,
            message: "Selected book not found.",
          });
        }
      }

      const plan = await LibraryPurchasePlan.create({
        book: book?._id || null,
        bookId: book ? String(book._id) : String(bookId || ""),
        bookTitle: String(bookTitle).trim(),
        requiredCopies: quantity,
        unitPrice:
          unitPrice === "" || unitPrice == null
            ? null
            : Number(unitPrice),
        priority,
        status,
        notes,
        createdBy: req.user._id,
        updatedBy: req.user._id,
      });

      return res.status(201).json({
        success: true,
        message: "Purchase plan saved to MongoDB.",
        data: formatDoc(plan),
      });
    } catch (error) {
      return sendError(res, error, "Create Purchase Plan API");
    }
  }
);

// PUT /api/library/purchase-plans/:id
router.put(
  "/purchase-plans/:id",
  authorize("admin", "librarian"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase plan ID.",
        });
      }

      const allowedFields = [
        "bookId",
        "bookTitle",
        "requiredCopies",
        "unitPrice",
        "priority",
        "status",
        "notes",
      ];

      const updates = {};

      for (const field of allowedFields) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body || {},
            field
          )
        ) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No update fields provided.",
        });
      }

      if ("requiredCopies" in updates) {
        updates.requiredCopies = Number(updates.requiredCopies);
      }

      if ("unitPrice" in updates) {
        updates.unitPrice =
          updates.unitPrice === "" || updates.unitPrice == null
            ? null
            : Number(updates.unitPrice);
      }

      if ("bookTitle" in updates) {
        updates.bookTitle = String(updates.bookTitle || "").trim();
      }

      if ("bookId" in updates) {
        const bookId = String(updates.bookId || "");

        if (bookId && mongoose.isValidObjectId(bookId)) {
          const book = await LibraryBook.findById(bookId);

          if (!book) {
            return res.status(404).json({
              success: false,
              message: "Selected book not found.",
            });
          }

          updates.book = book._id;
          updates.bookId = String(book._id);
        } else {
          updates.book = null;
        }
      }

      updates.updatedBy = req.user._id;

      const plan = await LibraryPurchasePlan.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Purchase plan not found.",
        });
      }

      return res.json({
        success: true,
        message: "Purchase plan updated successfully.",
        data: formatDoc(plan),
      });
    } catch (error) {
      return sendError(res, error, "Update Purchase Plan API");
    }
  }
);

// DELETE /api/library/purchase-plans/:id
router.delete(
  "/purchase-plans/:id",
  authorize("admin", "librarian"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase plan ID.",
        });
      }

      const deleted = await LibraryPurchasePlan.findByIdAndDelete(
        req.params.id
      );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Purchase plan not found.",
        });
      }

      return res.json({
        success: true,
        message: "Purchase plan deleted successfully.",
      });
    } catch (error) {
      return sendError(res, error, "Delete Purchase Plan API");
    }
  }
);


 
// ========================================
// 5. LIBRARY ANNOUNCEMENTS — MONGODB CRUD
// ========================================

const announcementManagers = authorize("admin", "librarian");

const announcementFields = [
  "title",
  "category",
  "audience",
  "content",
  "publishDate",
  "expiryDate",
  "priority",
  "status",
  "featured",
];

function pickAnnouncementFields(body) {
  const result = {};

  for (const field of announcementFields) {
    if (
      Object.prototype.hasOwnProperty.call(
        body || {},
        field
      )
    ) {
      result[field] = body[field];
    }
  }

  return result;
}

// GET — Librarian sees all; Student sees eligible published notices
router.get("/announcements", async (req, res) => {
  try {
    const role = req.user.role;
    const filter = {};

    if (!["admin", "librarian"].includes(role)) {
      const today = new Date().toISOString().slice(0, 10);

      filter.status = "Published";

      if (role === "student") {
        filter.audience = {
          $in: [
            "All Students",
            "Students & Faculty",
            "Everyone",
          ],
        };
      } else if (role === "faculty") {
        filter.audience = {
          $in: [
            "Faculty Only",
            "Students & Faculty",
            "Everyone",
          ],
        };
      } else {
        return res.status(403).json({
          success: false,
          message: "Announcements are not available for this role.",
        });
      }

      filter.$and = [
        {
          $or: [
            { publishDate: "" },
            { publishDate: { $lte: today } },
          ],
        },
        {
          $or: [
            { expiryDate: "" },
            { expiryDate: { $gte: today } },
          ],
        },
      ];
    }

    const announcements = await LibraryAnnouncement.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: announcements.map(formatDoc),
    });
  } catch (error) {
    return sendError(res, error, "Get Announcements API");
  }
});

// POST — Create announcement
router.post(
  "/announcements",
  announcementManagers,
  async (req, res) => {
    try {
      const data = pickAnnouncementFields(req.body);

      const announcement = await LibraryAnnouncement.create({
        ...data,
        createdBy: req.user._id,
      });

      return res.status(201).json({
        success: true,
        message: "Library announcement saved to MongoDB.",
        data: formatDoc(announcement),
      });
    } catch (error) {
      return sendError(res, error, "Create Announcement API");
    }
  }
);

// PUT — Edit announcement
router.put(
  "/announcements/:id",
  announcementManagers,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid announcement ID.",
        });
      }

      const updates = pickAnnouncementFields(req.body);

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields to update.",
        });
      }

      const announcement =
        await LibraryAnnouncement.findByIdAndUpdate(
          req.params.id,
          { $set: updates },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: "Announcement not found.",
        });
      }

      return res.json({
        success: true,
        message: "Announcement updated in MongoDB.",
        data: formatDoc(announcement),
      });
    } catch (error) {
      return sendError(res, error, "Update Announcement API");
    }
  }
);

// DELETE — Delete announcement
router.delete(
  "/announcements/:id",
  announcementManagers,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid announcement ID.",
        });
      }

      const deleted =
        await LibraryAnnouncement.findByIdAndDelete(req.params.id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Announcement not found.",
        });
      }

      return res.json({
        success: true,
        message: "Announcement deleted from MongoDB.",
      });
    } catch (error) {
      return sendError(res, error, "Delete Announcement API");
    }
  }
);


module.exports = router;
