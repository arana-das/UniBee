
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MessageSquare,
  Search,
  Send,
  Users,
  ArrowLeft,
  Pin,
  PinOff,
  CheckCheck,
  Check,
  MessageCircle,
  Clock3,
  RefreshCw,
  Loader2,
  AlertCircle,
  X,
  Inbox,
} from "lucide-react";

import { getAuthToken } from "../../services/authApi";

// ========================================
// UNIBEE FACULTY MESSAGES
// STUDENT ↔ FACULTY MONGODB MESSAGING
// ========================================

const API = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const REFRESH_INTERVAL = 12000;
const PIN_STORAGE_KEY = "unibee-faculty-pinned-chats-v2";

// ========================================
// API REQUEST
// ========================================

async function messageRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Your login session is unavailable. Please log in again."
    );
  }

  let response;

  try {
    response = await fetch(
      `${API}/api/messages${path}`,
      {
        ...options,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...(options.headers || {}),
        },
      }
    );
  } catch {
    throw new Error(
      "Cannot connect to the UniBee backend."
    );
  }

  const payload = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    payload?.success === false
  ) {
    throw new Error(
      payload?.message ||
      `Message request failed (${response.status}).`
    );
  }

  return payload;
}

// ========================================
// HELPERS
// ========================================

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return String(value._id || value.id || "");
}

function getInitials(name) {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLastMessageTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (
    date.toDateString() ===
    new Date().toDateString()
  ) {
    return formatTime(value);
  }

  return formatDate(value);
}

function normalizeContact(contact) {
  return {
    id: getId(contact),
    name:
      contact?.name ||
      contact?.fullName ||
      "Student",
    role: contact?.role || "student",
  };
}

function loadPinnedIds() {
  try {
    const value = JSON.parse(
      localStorage.getItem(PIN_STORAGE_KEY) ||
        "[]"
    );

    return Array.isArray(value)
      ? value.filter(
          (id) => typeof id === "string"
        )
      : [];
  } catch {
    return [];
  }
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function FacultyMessages() {
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] =
    useState([]);
  const [messages, setMessages] = useState([]);

  const [selectedId, setSelectedId] =
    useState("");

  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] =
    useState("All");

  const [draft, setDraft] = useState("");
  const [pinnedIds, setPinnedIds] =
    useState(loadPinnedIds);

  const [mobileChatOpen, setMobileChatOpen] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] =
    useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const messagesEndRef = useRef(null);
  const selectedIdRef = useRef("");
  const requestVersionRef = useRef(0);

  // ========================================
  // CONTACTS FROM MONGODB
  // ========================================

  const loadContacts = useCallback(async () => {
    const response = await messageRequest(
      "/contacts"
    );

    if (!Array.isArray(response.data)) {
      throw new Error(
        "Invalid student contacts response."
      );
    }

    setContacts(
      response.data
        .map(normalizeContact)
        .filter((contact) => contact.id)
    );
  }, []);

  // ========================================
  // CONVERSATION SUMMARY
  // ========================================

  const loadConversations = useCallback(
    async () => {
      const response = await messageRequest(
        "/conversations"
      );

      if (!Array.isArray(response.data)) {
        throw new Error(
          "Invalid conversation response."
        );
      }

      setConversations(response.data);
    },
    []
  );

  // ========================================
  // MESSAGE HISTORY
  // ========================================

  const loadMessages = useCallback(
    async (
      contactId,
      showLoader = false
    ) => {
      if (!contactId) return;

      const requestVersion =
        ++requestVersionRef.current;

      if (showLoader) {
        setLoadingMessages(true);
      }

      try {
        const response = await messageRequest(
          `/conversations/${encodeURIComponent(
            contactId
          )}`
        );

        if (!Array.isArray(response.data)) {
          throw new Error(
            "Invalid message history response."
          );
        }

        if (
          selectedIdRef.current !== contactId ||
          requestVersion !==
            requestVersionRef.current
        ) {
          return;
        }

        setMessages(response.data);
      } finally {
        if (
          showLoader &&
          requestVersion ===
            requestVersionRef.current
        ) {
          setLoadingMessages(false);
        }
      }
    },
    []
  );

  // ========================================
  // MARK CONVERSATION READ
  // ========================================

  const markAsRead = useCallback(
    async (contactId) => {
      if (!contactId) return;

      await messageRequest(
        `/conversations/${encodeURIComponent(
          contactId
        )}/read`,
        {
          method: "PATCH",
        }
      );

      await loadConversations();
    },
    [loadConversations]
  );

  // ========================================
  // INITIAL LOAD / MANUAL REFRESH
  // ========================================

  const refreshData = useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      }

      try {
        await Promise.all([
          loadContacts(),
          loadConversations(),
        ]);

        setError("");
      } catch (err) {
        if (showLoader) {
          setError(err.message);
        }

        throw err;
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [loadContacts, loadConversations]
  );

  useEffect(() => {
    refreshData(true).catch(() => {});
  }, [refreshData]);

  // ========================================
  // SELECTED CONVERSATION
  // ========================================

  useEffect(() => {
    if (!selectedId) {
      requestVersionRef.current += 1;
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function openConversation() {
      try {
        await loadMessages(selectedId, true);

        if (cancelled) return;

        await markAsRead(selectedId);

        if (cancelled) return;

        await loadMessages(selectedId);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    }

    openConversation();

    return () => {
      cancelled = true;
    };
  }, [selectedId, loadMessages, markAsRead]);

  // ========================================
  // AUTOMATIC REFRESH
  // ========================================

  useEffect(() => {
    let busy = false;

    const timer = setInterval(async () => {
      if (document.hidden || busy) return;

      busy = true;

      try {
        await loadConversations();

        const contactId =
          selectedIdRef.current;

        if (contactId) {
          await loadMessages(contactId);

          if (
            selectedIdRef.current === contactId
          ) {
            await messageRequest(
              `/conversations/${encodeURIComponent(
                contactId
              )}/read`,
              { method: "PATCH" }
            );

            await loadConversations();
          }
        }
      } catch {
        // Background updates do not
        // interrupt composing a message.
      } finally {
        busy = false;
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(timer);
  }, [loadConversations, loadMessages]);

  // ========================================
  // MERGE CONTACTS AND CONVERSATIONS
  // ========================================

  const chats = useMemo(() => {
    const contactMap = new Map();
    const conversationMap = new Map();

    for (const contact of contacts) {
      contactMap.set(contact.id, contact);
    }

    for (const conversation of conversations) {
      const contactId = getId(
        conversation.contact
      );

      if (!contactId) continue;

      conversationMap.set(
        contactId,
        conversation
      );

      if (!contactMap.has(contactId)) {
        contactMap.set(
          contactId,
          normalizeContact(
            conversation.contact
          )
        );
      }
    }

    return [...contactMap.values()]
      .map((contact) => {
        const conversation =
          conversationMap.get(contact.id);

        return {
          ...contact,
          lastMessage:
            conversation?.lastMessage || null,
          unreadCount: Number(
            conversation?.unreadCount || 0
          ),
          pinned: pinnedIds.includes(
            contact.id
          ),
        };
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }

        const aDate = new Date(
          a.lastMessage?.createdAt || 0
        ).getTime();

        const bDate = new Date(
          b.lastMessage?.createdAt || 0
        ).getTime();

        return (
          bDate - aDate ||
          a.name.localeCompare(b.name)
        );
      });
  }, [contacts, conversations, pinnedIds]);

  const selectedContact =
    chats.find(
      (contact) => contact.id === selectedId
    ) || null;

  const unreadCount = conversations.reduce(
    (sum, conversation) =>
      sum +
      Number(conversation.unreadCount || 0),
    0
  );

  const unreadConversationCount =
    conversations.filter(
      (conversation) =>
        Number(
          conversation.unreadCount || 0
        ) > 0
    ).length;

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();

    return chats.filter((contact) => {
      const matchesSearch = [
        contact.name,
        contact.lastMessage?.text,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      );

      const matchesFilter =
        contactFilter === "All" ||
        (contactFilter === "Unread" &&
          contact.unreadCount > 0) ||
        (contactFilter === "Pinned" &&
          contact.pinned);

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [chats, search, contactFilter]);

  // ========================================
  // SELECT STUDENT
  // ========================================

  function selectContact(contactId) {
    requestVersionRef.current += 1;
    selectedIdRef.current = contactId;

    setSelectedId(contactId);
    setMessages([]);
    setDraft("");
    setMobileChatOpen(true);
    setError("");
    setFeedback("");
    setLoadingMessages(true);
  }

  // ========================================
  // PIN / UNPIN
  // Browser-local preference only.
  // Messages themselves remain in MongoDB.
  // ========================================

  function togglePin(contactId) {
    if (!contactId) return;

    setPinnedIds((previous) => {
      const next = previous.includes(
        contactId
      )
        ? previous.filter(
            (id) => id !== contactId
          )
        : [...previous, contactId];

      try {
        localStorage.setItem(
          PIN_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // Pinning is optional.
      }

      return next;
    });
  }

  // ========================================
  // SEND MESSAGE TO STUDENT
  // ========================================

  async function sendMessage(event) {
    event?.preventDefault?.();

    const text = draft.trim();
    const receiverId = selectedId;

    if (
      !text ||
      !receiverId ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError("");
    setFeedback("");

    try {
      await messageRequest("", {
        method: "POST",
        body: JSON.stringify({
          receiverId,
          text,
        }),
      });

      // Do not erase a draft written while
      // the previous message was sending.
      setDraft((current) =>
        current === draft ? "" : current
      );

      await Promise.all([
        loadMessages(receiverId),
        loadConversations(),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  // ========================================
  // SCROLL CHAT
  // ========================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [selectedId, messages.length]);

  // ========================================
  // UI
  // ========================================

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B18A28]">
            Faculty Communication
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#234E43] md:text-3xl">
            Messages & Conversations
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Stay connected with students
            through UniBee messaging.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            try {
              await refreshData(true);

              if (selectedIdRef.current) {
                await loadMessages(
                  selectedIdRef.current,
                  true
                );
              }
            } catch (err) {
              setError(err.message);
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#234E43] hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              loading ? "animate-spin" : ""
            }
          />
          Refresh Messages
        </button>
      </section>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />
          <span className="flex-1">
            {error}
          </span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {feedback}
        </p>
      )}

      {/* SUMMARY */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Student Contacts",
            value: chats.length,
            icon: Users,
          },
          {
            label: "Unread Messages",
            value: unreadCount,
            icon: Inbox,
          },
          {
            label: "Conversations",
            value: conversations.length,
            icon: MessageSquare,
          },
        ].map(
          ({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-2xl border border-[#234E43]/10 bg-white p-5 shadow-sm"
            >
              <div>
                <p className="text-sm text-slate-500">
                  {label}
                </p>

                <h2 className="mt-2 text-2xl font-bold text-[#234E43]">
                  {loading ? "..." : value}
                </h2>
              </div>

              <div className="rounded-xl bg-[#A6C1A4]/25 p-3 text-[#234E43]">
                <Icon size={22} />
              </div>
            </div>
          )
        )}
      </section>

      {/* CHAT LAYOUT */}
      <section className="overflow-hidden rounded-2xl border border-[#234E43]/10 bg-white shadow-sm lg:grid lg:h-[650px] lg:grid-cols-[320px_minmax(0,1fr)]">

        {/* CONVERSATION LIST */}
        <div
          className={`min-w-0 border-r border-slate-100 ${
            mobileChatOpen
              ? "hidden lg:flex"
              : "flex"
          } flex-col`}
        >
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#234E43]">
                Conversations
              </h2>

              {unreadConversationCount > 0 && (
                <span className="rounded-full bg-[#D9A536]/20 px-2.5 py-1 text-xs font-bold text-[#234E43]">
                  {unreadConversationCount} unread
                </span>
              )}
            </div>

            <div className="relative mt-4">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search student contacts..."
                aria-label="Search conversations"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-[#234E43]"
              />
            </div>

            <select
              value={contactFilter}
              onChange={(event) =>
                setContactFilter(
                  event.target.value
                )
              }
              aria-label="Filter conversations"
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#234E43]"
            >
              <option value="All">
                All Students
              </option>
              <option value="Unread">
                Unread Conversations
              </option>
              <option value="Pinned">
                Pinned Conversations
              </option>
            </select>
          </div>

          {/* CONTACT LIST */}
          <div className="max-h-[540px] min-h-[360px] flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Loading student contacts...
              </div>
            ) : (
              <>
                {filteredChats.map((contact) => {
                  const active =
                    selectedId === contact.id;

                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() =>
                        selectContact(contact.id)
                      }
                      className={`flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left transition-colors hover:bg-[#F6F8F3] ${
                        active
                          ? "bg-[#A6C1A4]/20"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#234E43] text-sm font-bold text-white">
                        {getInitials(
                          contact.name
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-sm font-bold text-[#234E43]">
                            {contact.name}
                          </h3>

                          {contact.unreadCount > 0 && (
                            <span className="flex min-w-5 items-center justify-center rounded-full bg-[#D9A536] px-1.5 py-1 text-[10px] font-bold text-[#234E43]">
                              {contact.unreadCount}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          Student
                        </p>

                        <p className="mt-2 truncate text-xs text-slate-400">
                          {contact.lastMessage?.text ||
                            "Start a conversation"}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">
                            {formatLastMessageTime(
                              contact.lastMessage?.createdAt
                            )}
                          </span>

                          {contact.pinned && (
                            <Pin
                              size={13}
                              className="text-[#B18A28]"
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {filteredChats.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {contacts.length === 0 &&
                    conversations.length === 0
                      ? "No active student contacts found."
                      : "No matching conversations found."}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ACTIVE CONVERSATION */}
        <div
          className={`min-w-0 ${
            mobileChatOpen
              ? "flex"
              : "hidden lg:flex"
          } h-[550px] flex-col lg:h-auto`}
        >
          {selectedContact ? (
            <>
              {/* CHAT HEADER */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setMobileChatOpen(false)
                    }
                    className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A6C1A4]/35 text-sm font-bold text-[#234E43]">
                    {getInitials(
                      selectedContact.name
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-[#234E43]">
                      {selectedContact.name}
                    </h2>

                    <p className="truncate text-xs text-slate-500">
                      Student · UniBee Campus
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    togglePin(selectedId)
                  }
                  title={
                    pinnedIds.includes(selectedId)
                      ? "Unpin conversation"
                      : "Pin conversation"
                  }
                  className="rounded-lg border border-slate-200 p-2 text-[#234E43] hover:bg-[#F6F8F3]"
                >
                  {pinnedIds.includes(selectedId) ? (
                    <PinOff size={19} />
                  ) : (
                    <Pin size={19} />
                  )}
                </button>
              </div>

              {/* MESSAGE HISTORY */}
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#F6F8F3] p-4 md:p-6">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2
                      size={24}
                      className="animate-spin text-[#234E43]"
                    />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <MessageCircle
                      size={38}
                      className="text-[#A6C1A4]"
                    />

                    <h3 className="mt-3 font-bold text-[#234E43]">
                      Start a Conversation
                    </h3>

                    <p className="mt-2 max-w-xs text-sm text-slate-500">
                      Send a message to begin
                      a conversation with this student.
                    </p>
                  </div>
                ) : (
                  messages.map((item) => {
                    // If sender is the selected
                    // student, this is incoming.
                    // Otherwise it is faculty's
                    // outgoing message.
                    const own =
                      getId(item.sender) !==
                      selectedId;

                    return (
                      <div
                        key={getId(item)}
                        className={`flex ${
                          own
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                            own
                              ? "rounded-br-sm bg-[#234E43] text-white"
                              : "rounded-bl-sm bg-white text-slate-700"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">
                            {item.text}
                          </p>

                          <div
                            className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${
                              own
                                ? "text-white/60"
                                : "text-slate-400"
                            }`}
                          >
                            <Clock3 size={11} />

                            {formatTime(
                              item.createdAt
                            )}

                            {own &&
                              (item.isRead ? (
                                <CheckCheck
                                  size={13}
                                  aria-label="Read"
                                />
                              ) : (
                                <Check
                                  size={13}
                                  aria-label="Sent"
                                />
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* MESSAGE COMPOSER */}
              <form
                onSubmit={sendMessage}
                className="border-t border-slate-100 bg-white p-4"
              >
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(event) =>
                      setDraft(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();

                        if (
                          draft.trim() &&
                          !sending
                        ) {
                          sendMessage(event);
                        }
                      }
                    }}
                    rows={2}
                    maxLength={1000}
                    placeholder="Type your message..."
                    aria-label="Type a message"
                    className="max-h-32 min-h-[52px] min-w-0 flex-1 resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#234E43]"
                  />

                  <button
                    type="submit"
                    disabled={
                      !draft.trim() ||
                      sending
                    }
                    className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-[#234E43] text-white hover:bg-[#193B33] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Send message"
                  >
                    {sending ? (
                      <Loader2
                        size={19}
                        className="animate-spin"
                      />
                    ) : (
                      <Send size={19} />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Enter to send · Shift+Enter for
                  new line · Maximum 1000 characters
                </p>
              </form>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
              <MessageSquare
                size={42}
                className="text-[#A6C1A4]"
              />

              <h3 className="mt-4 font-bold text-[#234E43]">
                Your Messages
              </h3>

              <p className="mt-2 max-w-sm text-sm">
                Select a student to view messages
                or start a new conversation.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <p className="text-center text-xs text-slate-400">
        UniBee Faculty Messages · MongoDB-connected
        Student Communication
      </p>

      <p className="text-center text-xs text-slate-400">
        Conversations refresh every 12 seconds.
        Pinned conversations are saved locally
        in this browser.
      </p>
    </div>
  );
}
