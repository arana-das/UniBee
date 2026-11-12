
const express = require("express");
const mongoose = require("mongoose");

const Message = require("../models/Message");
const User = require("../models/User");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// UNIBEE MESSAGING API
// Student ↔ Faculty
// ========================================

router.use(protect);
router.use(authorize("student", "faculty"));

// ========================================
// HELPERS
// ========================================

function getUserId(req) {
  return req.user._id;
}

function getRole(user) {
  return String(user?.role || "").toLowerCase();
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function getSafeUser(user) {
  if (!user) return null;

  const item =
    typeof user.toObject === "function"
      ? user.toObject()
      : user;

  const firstName = item.firstName || "";
  const lastName = item.lastName || "";

  return {
    _id: item._id,
    name:
      item.fullName ||
      item.name ||
      `${firstName} ${lastName}`.trim() ||
      item.username ||
      (item.role === "faculty"
        ? "Faculty Member"
        : "Student"),
    role: item.role,
  };
}

function getSafeMessage(message) {
  const item =
    typeof message.toObject === "function"
      ? message.toObject()
      : message;

  return {
    _id: item._id,
    sender: item.sender,
    receiver: item.receiver,
    text: item.text,
    isRead: item.isRead,
    readAt: item.readAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function handleError(res, error) {
  console.error("Message API Error:", error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message:
        Object.values(error.errors)
          .map((item) => item.message)
          .join(" ") ||
        "Invalid message data.",
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Unable to process the message request.",
  });
}

async function findContact(id, currentRole) {
  if (!isValidId(id)) {
    return null;
  }

  const requiredRole =
    currentRole === "student" ? "faculty" : "student";

  return User.findOne({
    _id: id,
    role: requiredRole,
    isActive: { $ne: false },
  }).select(
    "_id role fullName name firstName lastName username"
  );
}

function conversationFilter(userId, contactId) {
  return {
    $or: [
      {
        sender: userId,
        receiver: contactId,
      },
      {
        sender: contactId,
        receiver: userId,
      },
    ],
  };
}

// ========================================
// GET AVAILABLE CONTACTS
// GET /api/messages/contacts
// ========================================

router.get("/contacts", async (req, res) => {
  try {
    const currentRole = getRole(req.user);

    const targetRole =
      currentRole === "student"
        ? "faculty"
        : "student";

    const contacts = await User.find({
      role: targetRole,
      isActive: { $ne: false },
      _id: { $ne: getUserId(req) },
    })
      .select(
        "_id role fullName name firstName lastName username"
      )
      .sort({ fullName: 1, name: 1 })
      .lean();

    return res.json({
      success: true,
      data: contacts.map(getSafeUser),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// GET MY CONVERSATIONS
// GET /api/messages/conversations
// ========================================

router.get("/conversations", async (req, res) => {
  try {
    const myId = getUserId(req);
    const myIdString = String(myId);

    const messages = await Message.find({
      $or: [
        { sender: myId },
        { receiver: myId },
      ],
    })
      .sort({ createdAt: -1 })
      .select(
        "_id sender receiver text isRead createdAt"
      )
      .lean();

    const conversations = new Map();

    for (const message of messages) {
      const sentByMe =
        String(message.sender) === myIdString;

      const contactId = String(
        sentByMe ? message.receiver : message.sender
      );

      if (!conversations.has(contactId)) {
        conversations.set(contactId, {
          contactId,
          lastMessage: getSafeMessage(message),
          unreadCount: 0,
        });
      }

      if (
        !sentByMe &&
        message.isRead === false
      ) {
        conversations.get(contactId).unreadCount += 1;
      }
    }

    const contactIds = [
      ...conversations.keys(),
    ];

    const users = await User.find({
      _id: { $in: contactIds },
    })
      .select(
        "_id role fullName name firstName lastName username isActive"
      )
      .lean();

    const userMap = new Map(
      users.map((user) => [
        String(user._id),
        getSafeUser(user),
      ])
    );

    const data = [...conversations.values()]
      .filter((item) =>
        userMap.has(item.contactId)
      )
      .map((item) => ({
        contact: userMap.get(item.contactId),
        lastMessage: item.lastMessage,
        unreadCount: item.unreadCount,
      }));

    return res.json({
      success: true,
      data,
      totalUnread: data.reduce(
        (sum, item) => sum + item.unreadCount,
        0
      ),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// GET CONVERSATION MESSAGES
// GET /api/messages/conversations/:contactId
// ========================================

router.get(
  "/conversations/:contactId",
  async (req, res) => {
    try {
      const myId = getUserId(req);
      const contactId = req.params.contactId;

      const contact = await findContact(
        contactId,
        getRole(req.user)
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: "Contact not found.",
        });
      }

      const page = Math.max(
        1,
        Number.parseInt(req.query.page, 10) || 1
      );

      const limit = 50;
      const skip = (page - 1) * limit;

      const filter = conversationFilter(
        myId,
        contact._id
      );

      const [total, messages] = await Promise.all([
        Message.countDocuments(filter),

        Message.find(filter)
          .sort({
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      return res.json({
        success: true,
        contact: getSafeUser(contact),
        data: messages
          .reverse()
          .map(getSafeMessage),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// SEND MESSAGE
// POST /api/messages
// BODY: { receiverId, text }
// ========================================

router.post("/", async (req, res) => {
  try {
    const senderId = getUserId(req);

    const receiverId = String(
      req.body?.receiverId || ""
    );

    const text =
      typeof req.body?.text === "string"
        ? req.body.text.trim()
        : "";

    if (!receiverId || !isValidId(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "A valid receiver is required.",
      });
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty.",
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        message:
          "Message cannot exceed 1000 characters.",
      });
    }

    if (String(senderId) === receiverId) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot message yourself.",
      });
    }

    const contact = await findContact(
      receiverId,
      getRole(req.user)
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message:
          "The selected student or faculty contact is unavailable.",
      });
    }

    const message = await Message.create({
      sender: senderId,
      receiver: contact._id,
      text,
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: getSafeMessage(message),
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// ========================================
// MARK CONVERSATION AS READ
// PATCH /api/messages/conversations/:contactId/read
// ========================================

router.patch(
  "/conversations/:contactId/read",
  async (req, res) => {
    try {
      const myId = getUserId(req);
      const contactId = req.params.contactId;

      const contact = await findContact(
        contactId,
        getRole(req.user)
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: "Contact not found.",
        });
      }

      const result = await Message.updateMany(
        {
          sender: contact._id,
          receiver: myId,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        }
      );

      return res.json({
        success: true,
        message: "Messages marked as read.",
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// GET TOTAL UNREAD COUNT
// GET /api/messages/unread-count
// ========================================

router.get(
  "/unread-count",
  async (req, res) => {
    try {
      const count = await Message.countDocuments({
        receiver: getUserId(req),
        isRead: false,
      });

      return res.json({
        success: true,
        count,
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
);

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;
