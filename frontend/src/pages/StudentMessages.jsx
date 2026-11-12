
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Search,
  Send,
  MessageSquare,
  Users,
  GraduationCap,
  CheckCheck,
  Check,
  ArrowLeft,
  Inbox,
  RefreshCw,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

import { getAuthToken } from "../services/authApi";

// ========================================
// UNIBEE STUDENT MESSAGING
// MongoDB + Faculty Integration
// ========================================

const API = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const REFRESH_INTERVAL = 12000;

// ========================================
// API HELPER
// ========================================

async function messageRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Your login session has expired. Please log in again."
    );
  }

  let response;

  try {
    response = await fetch(`${API}/api/messages${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      "Unable to connect to the UniBee backend."
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

  return String(
    value._id || value.id || ""
  );
}

function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "?";
}

function formatMessageTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  if (
    date.toDateString() ===
    now.toDateString()
  ) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeContact(contact) {
  return {
    id: getId(contact),
    name:
      contact.name ||
      contact.fullName ||
      "Faculty Member",
    role: contact.role || "faculty",
  };
}

// ========================================
// STUDENT MESSAGES COMPONENT
// ========================================

export default function StudentMessages() {
  // Faculty contacts from MongoDB
  const [contacts, setContacts] = useState([]);

  // Existing conversations
  const [conversations, setConversations] =
    useState([]);

  // Selected conversation messages
  const [messages, setMessages] = useState([]);

  const [selectedId, setSelectedId] =
    useState("");

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [mobileChatOpen, setMobileChatOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [feedback, setFeedback] =
    useState("");

  const bottomRef = useRef(null);
  const selectedIdRef = useRef("");

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // ========================================
  // FETCH CONTACTS
  // ========================================

  const loadContacts = useCallback(async () => {
    const response = await messageRequest(
      "/contacts"
    );

    const data = Array.isArray(response.data)
      ? response.data
      : [];

    setContacts(
      data
        .map(normalizeContact)
        .filter((contact) => contact.id)
    );
  }, []);

  // ========================================
  // FETCH CONVERSATIONS
  // ========================================

  const loadConversations = useCallback(
    async () => {
      const response = await messageRequest(
        "/conversations"
      );

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setConversations(data);
    },
    []
  );

  // ========================================
  // FETCH SELECTED CHAT
  // ========================================

  const loadMessages = useCallback(
    async (contactId, showLoader = false) => {
      if (!contactId) return;

      if (showLoader) {
        setLoadingMessages(true);
      }

      try {
        const response = await messageRequest(
          `/conversations/${encodeURIComponent(
            contactId
          )}`
        );

        if (
          selectedIdRef.current !== contactId
        ) {
          return;
        }

        setMessages(
          Array.isArray(response.data)
            ? response.data
            : []
        );
      } finally {
        if (showLoader) {
          setLoadingMessages(false);
        }
      }
    },
    []
  );

  // ========================================
  // MARK MESSAGES AS READ
  // ========================================

  const markConversationRead = useCallback(
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
  // INITIAL DATA LOAD
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
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [loadContacts, loadConversations]
  );

  useEffect(() => {
    refreshData(true);
  }, [refreshData]);

  // ========================================
  // LOAD SELECTED CONVERSATION
  // ========================================

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const fetchSelected = async () => {
      try {
        await loadMessages(selectedId, true);

        if (!cancelled) {
          await markConversationRead(
            selectedId
          );

          if (!cancelled) {
            await loadMessages(selectedId);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    };

    fetchSelected();

    return () => {
      cancelled = true;
    };
  }, [
    selectedId,
    loadMessages,
    markConversationRead,
  ]);

  // ========================================
  // PERIODIC REFRESH
  // ========================================

  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;

      try {
        await loadConversations();

        const currentId =
          selectedIdRef.current;

        if (currentId) {
          await loadMessages(currentId);

          await messageRequest(
            `/conversations/${encodeURIComponent(
              currentId
            )}/read`,
            {
              method: "PATCH",
            }
          );

          await loadConversations();
        }
      } catch {
        // Background refresh failures should
        // not interrupt the current conversation.
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(timer);
  }, [
    loadConversations,
    loadMessages,
  ]);

  // ========================================
  // CONTACTS + CONVERSATIONS
  // ========================================

  const chats = useMemo(() => {
    const conversationMap = new Map();

    for (const item of conversations) {
      const contactId = getId(
        item.contact
      );

      if (contactId) {
        conversationMap.set(contactId, item);
      }
    }

    const contactMap = new Map();

    for (const contact of contacts) {
      contactMap.set(contact.id, contact);
    }

    for (const item of conversations) {
      const contactId = getId(
        item.contact
      );

      if (
        contactId &&
        !contactMap.has(contactId)
      ) {
        contactMap.set(
          contactId,
          normalizeContact(item.contact)
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
          unread:
            Number(
              conversation?.unreadCount || 0
            ),
        };
      })
      .sort((a, b) => {
        const dateA = new Date(
          a.lastMessage?.createdAt || 0
        ).getTime();

        const dateB = new Date(
          b.lastMessage?.createdAt || 0
        ).getTime();

        return (
          dateB - dateA ||
          a.name.localeCompare(b.name)
        );
      });
  }, [contacts, conversations]);

  const selectedChat =
    chats.find(
      (chat) => chat.id === selectedId
    ) || null;

  const unreadTotal = conversations.reduce(
    (total, item) =>
      total +
      Number(item.unreadCount || 0),
    0
  );

  const conversationCount =
    conversations.length;

  const filteredChats = chats.filter(
    (chat) => {
      const query =
        search.trim().toLowerCase();

      return (
        chat.name
          .toLowerCase()
          .includes(query) ||
        chat.role
          .toLowerCase()
          .includes(query)
      );
    }
  );

  // ========================================
  // SELECT CHAT
  // ========================================

  function selectChat(contactId) {
    selectedIdRef.current = contactId;
    setSelectedId(contactId);
    setMessages([]);
    setMobileChatOpen(true);
    setError("");
    setFeedback("");
  }

  // ========================================
  // SEND REAL MESSAGE
  // ========================================

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();

    if (
      !text ||
      !selectedId ||
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
          receiverId: selectedId,
          text,
        }),
      });

      setMessage("");

      await Promise.all([
        loadMessages(selectedId),
        loadConversations(),
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  // ========================================
  // SCROLL TO LATEST MESSAGE
  // ========================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [
    selectedId,
    messages.length,
  ]);

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-7">

      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            CAMPUS COMMUNICATION
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            Messages
          </h1>

          <p className="mt-3 text-[#718579]">
            Stay connected with university
            faculty members through UniBee.
          </p>
        </div>

        <button
          type="button"
          onClick={async () => {
            await refreshData(true);

            if (selectedId) {
              try {
                await loadMessages(
                  selectedId,
                  true
                );
              } catch (err) {
                setError(err.message);
              }
            }
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm font-bold text-[#234E43] disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>
      </div>

      {/* ERROR / STATUS */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle
            size={19}
            className="shrink-0"
          />
          <span className="flex-1">
            {error}
          </span>
          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {feedback && (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          {feedback}
        </p>
      )}

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Conversations",
            value: conversationCount,
            icon: MessageSquare,
          },
          {
            label: "Unread Messages",
            value: unreadTotal,
            icon: Inbox,
          },
          {
            label: "Faculty Contacts",
            value: contacts.length,
            icon: Users,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="flex items-center gap-4 rounded-2xl border border-[#E2EADC] bg-white p-5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={23} />
              </div>

              <div>
                <p className="text-sm text-[#718579]">
                  {item.label}
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-[#234E43]">
                  {loading
                    ? "..."
                    : item.value}
                </h2>
              </div>
            </div>
          );
        })}
      </div>

      {/* MESSAGING LAYOUT */}
      <section className="flex h-[650px] min-h-0 overflow-hidden rounded-3xl border border-[#E2EADC] bg-white shadow-sm">

        {/* CONTACT LIST */}
        <aside
          className={`w-full shrink-0 border-r border-[#E2EADC] md:w-[320px] lg:w-[360px] ${
            mobileChatOpen
              ? "hidden md:flex"
              : "flex"
          } flex-col`}
        >
          <div className="border-b border-[#E2EADC] p-5">
            <h2 className="text-lg font-bold text-[#234E43]">
              Conversations
            </h2>

            <p className="mt-1 text-xs text-[#8A9F90]">
              Select a faculty member to chat
            </p>

            <div className="relative mt-5">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search faculty contacts..."
                aria-label="Search contacts"
                className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-11 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
              />
            </div>

            <p className="mt-3 text-xs text-[#8A9F90]">
              {chats.length} available contacts
            </p>
          </div>

          {/* CONTACTS */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#718579]">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Loading contacts...
              </div>
            ) : (
              <>
                {filteredChats.map((chat) => {
                  const active =
                    selectedId === chat.id;

                  const lastMessage =
                    chat.lastMessage;

                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() =>
                        selectChat(chat.id)
                      }
                      className={`mb-2 flex w-full items-center gap-3 rounded-2xl p-4 text-left transition ${
                        active
                          ? "bg-[#EAF2E8]"
                          : "hover:bg-[#F6F8F3]"
                      }`}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EAF2E8] font-bold text-[#234E43]">
                        {getInitials(
                          chat.name
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-[#234E43]">
                            {chat.name}
                          </p>

                          {chat.unread > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D9A536] px-1 text-[10px] font-bold text-[#234E43]">
                              {chat.unread}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 flex items-center gap-1 text-xs text-[#8A9F90]">
                          <GraduationCap size={13} />
                          Faculty
                        </p>

                        <p className="mt-2 truncate text-xs text-[#718579]">
                          {lastMessage?.text ||
                            "Start a conversation"}
                        </p>

                        {lastMessage?.createdAt && (
                          <p className="mt-1 text-[10px] text-[#8A9F90]">
                            {formatMessageTime(
                              lastMessage.createdAt
                            )}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredChats.length === 0 && (
                  <div className="py-12 text-center text-sm text-[#718579]">
                    <Users
                      size={35}
                      className="mx-auto mb-3 text-[#A6C1A4]"
                    />
                    {contacts.length === 0
                      ? "No faculty contacts available."
                      : "No matching contacts found."}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* ACTIVE CHAT */}
        <div
          className={`min-w-0 flex-1 flex-col ${
            mobileChatOpen
              ? "flex"
              : "hidden md:flex"
          }`}
        >
          {selectedChat ? (
            <>
              {/* CHAT HEADER */}
              <div className="flex items-center justify-between border-b border-[#E2EADC] p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setMobileChatOpen(false)
                    }
                    aria-label="Back to contacts"
                    className="rounded-lg p-2 text-[#234E43] hover:bg-[#F1F7EF] md:hidden"
                  >
                    <ArrowLeft size={21} />
                  </button>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF2E8] font-bold text-[#234E43]">
                    {getInitials(
                      selectedChat.name
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-[#234E43]">
                      {selectedChat.name}
                    </h3>

                    <p className="truncate text-xs text-[#718579]">
                      Faculty Member
                    </p>
                  </div>
                </div>

                <span className="hidden rounded-full bg-[#EAF2E8] px-3 py-1.5 text-xs font-semibold text-[#477764] sm:inline-flex">
                  Campus Contact
                </span>
              </div>

              {/* MESSAGES */}
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#FAFCF9] p-5 md:p-7">
                <div className="mb-7 text-center">
                  <span className="rounded-full bg-[#EAF2E8] px-4 py-2 text-xs font-semibold text-[#607B6C]">
                    UniBee Campus Conversation
                  </span>
                </div>

                {loadingMessages ? (
                  <div className="flex justify-center py-10">
                    <Loader2
                      size={24}
                      className="animate-spin text-[#234E43]"
                    />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <MessageSquare
                      size={42}
                      className="text-[#A6C1A4]"
                    />

                    <p className="mt-4 font-semibold text-[#234E43]">
                      No messages yet
                    </p>

                    <p className="mt-2 text-sm text-[#718579]">
                      Send a message to start
                      this conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((item) => {
                    const isMe =
                      getId(item.sender) !==
                      selectedId;

                    return (
                      <div
                        key={getId(item)}
                        className={`flex ${
                          isMe
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm md:max-w-[75%] ${
                            isMe
                              ? "rounded-br-sm bg-[#234E43] text-white"
                              : "rounded-bl-sm border border-[#E2EADC] bg-white text-[#234E43]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {item.text}
                          </p>

                          <div
                            className={`mt-3 flex items-center justify-end gap-1 text-[10px] ${
                              isMe
                                ? "text-[#C4DACC]"
                                : "text-[#8A9F90]"
                            }`}
                          >
                            {formatMessageTime(
                              item.createdAt
                            )}

                            {isMe &&
                              (item.isRead ? (
                                <CheckCheck
                                  size={14}
                                  aria-label="Read"
                                />
                              ) : (
                                <Check
                                  size={14}
                                  aria-label="Sent"
                                />
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={bottomRef} />
              </div>

              {/* MESSAGE COMPOSER */}
              <form
                onSubmit={sendMessage}
                className="border-t border-[#E2EADC] bg-white p-4 md:p-5"
              >
                <div className="flex items-end gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(event) =>
                      setMessage(
                        event.target.value
                      )
                    }
                    maxLength={1000}
                    placeholder="Type your message..."
                    aria-label="Write a message"
                    className="min-w-0 flex-1 rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-5 py-3.5 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
                  />

                  <button
                    type="submit"
                    disabled={
                      !message.trim() ||
                      sending
                    }
                    aria-label="Send message"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#234E43] text-white transition hover:bg-[#326657] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? (
                      <Loader2
                        size={20}
                        className="animate-spin"
                      />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>

                <p className="mt-3 text-center text-[11px] text-[#8A9F90]">
                  Messages are stored securely
                  in your UniBee database.
                </p>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[#718579]">
              <MessageSquare
                size={48}
                className="text-[#A6C1A4]"
              />

              <h3 className="mt-5 text-lg font-bold text-[#234E43]">
                Your Messages
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6">
                Select a faculty member from
                the contact list to start a
                conversation or continue an
                existing one.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Campus Messaging
      </div>
    </div>
  );
}
