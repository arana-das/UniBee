
import { useEffect, useRef, useState } from "react";
import {
  Search,
  Send,
  MessageSquare,
  Users,
  GraduationCap,
  Paperclip,
  MoreVertical,
  CheckCheck,
  Circle,
  ArrowLeft,
  Inbox,
} from "lucide-react";

// Demonstration conversations.
// Later messages will come from MongoDB and backend APIs.

const initialChats = [
  {
    id: 1,
    name: "Dr. Sarah Ahmed",
    role: "Faculty",
    department: "Web Technologies",
    initials: "SA",
    color: "#EAF2E8",
    unread: 2,
    messages: [
      {
        id: 1,
        sender: "them",
        text: "Hello! Please review the assignment instructions before submission.",
        time: "09:30 AM",
      },
      {
        id: 2,
        sender: "me",
        text: "Thank you, Ma'am. I will check the requirements.",
        time: "09:35 AM",
      },
      {
        id: 3,
        sender: "them",
        text: "The React component assignment deadline is approaching.",
        time: "10:15 AM",
      },
    ],
  },
  {
    id: 2,
    name: "Md. Rahim Hasan",
    role: "Faculty",
    department: "Database Management",
    initials: "RH",
    color: "#FFF4DC",
    unread: 1,
    messages: [
      {
        id: 1,
        sender: "them",
        text: "The database schema guidelines are available in the course materials.",
        time: "11:10 AM",
      },
      {
        id: 2,
        sender: "me",
        text: "Thank you, Sir. I will review them.",
        time: "11:20 AM",
      },
    ],
  },
  {
    id: 3,
    name: "Academic Office",
    role: "Administration",
    department: "Student Affairs",
    initials: "AO",
    color: "#EAF0F8",
    unread: 0,
    messages: [
      {
        id: 1,
        sender: "them",
        text: "Welcome to UniBee! You can contact us regarding academic support.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: 4,
    name: "Dr. Nusrat Jahan",
    role: "Faculty",
    department: "Computer Networks",
    initials: "NJ",
    color: "#F3EAF5",
    unread: 0,
    messages: [
      {
        id: 1,
        sender: "them",
        text: "Please prepare for the upcoming networking lab session.",
        time: "Monday",
      },
    ],
  },
];

function StudentMessages() {
  const [chats, setChats] = useState(initialChats);
  const [selectedId, setSelectedId] = useState(1);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const bottomRef = useRef(null);

  const selectedChat = chats.find((chat) => chat.id === selectedId);

  const unreadTotal = chats.reduce(
    (sum, chat) => sum + chat.unread,
    0
  );

  const filteredChats = chats.filter((chat) => {
    const query = search.trim().toLowerCase();

    return (
      chat.name.toLowerCase().includes(query) ||
      chat.department.toLowerCase().includes(query) ||
      chat.role.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, chats]);

  const selectChat = (id) => {
    setSelectedId(id);
    setMobileChatOpen(true);

    setChats((previous) =>
      previous.map((chat) =>
        chat.id === id ? { ...chat, unread: 0 } : chat
      )
    );
  };

  const sendMessage = (event) => {
    event.preventDefault();

    const text = message.trim();

    if (!text || !selectedChat) return;

    const newMessage = {
      id: Date.now(),
      sender: "me",
      text,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChats((previous) =>
      previous.map((chat) =>
        chat.id === selectedId
          ? {
              ...chat,
              messages: [...chat.messages, newMessage],
            }
          : chat
      )
    );

    setMessage("");
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
          CAMPUS COMMUNICATION
        </p>

        <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
          Messages
        </h1>

        <p className="mt-3 text-[#718579]">
          Stay connected with faculty members and university offices.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Conversations",
            value: chats.length,
            icon: MessageSquare,
          },
          {
            label: "Unread Messages",
            value: unreadTotal,
            icon: Inbox,
          },
          {
            label: "Campus Contacts",
            value: chats.length,
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
                <p className="text-sm text-[#718579]">{item.label}</p>
                <h2 className="mt-1 text-2xl font-extrabold text-[#234E43]">
                  {item.value}
                </h2>
              </div>
            </div>
          );
        })}
      </div>

      {/* Messaging Layout */}
      <section className="flex h-[650px] min-h-0 overflow-hidden rounded-3xl border border-[#E2EADC] bg-white shadow-sm">

        {/* Conversation List */}
        <aside
          className={`w-full shrink-0 border-r border-[#E2EADC] md:w-[320px] lg:w-[360px] ${
            mobileChatOpen ? "hidden md:flex" : "flex"
          } flex-col`}
        >
          <div className="border-b border-[#E2EADC] p-5">
            <h2 className="text-lg font-bold text-[#234E43]">
              Conversations
            </h2>

            <p className="mt-1 text-xs text-[#8A9F90]">
              Select a conversation to get started
            </p>

            <div className="relative mt-5">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search contacts..."
                aria-label="Search conversations"
                className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3 pl-11 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {filteredChats.map((chat) => {
              const lastMessage = chat.messages.at(-1);
              const active = selectedId === chat.id;

              return (
                <button
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={`mb-2 flex w-full items-center gap-3 rounded-2xl p-4 text-left transition ${
                    active
                      ? "bg-[#EAF2E8]"
                      : "hover:bg-[#F6F8F3]"
                  }`}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold text-[#234E43]"
                    style={{ backgroundColor: chat.color }}
                  >
                    {chat.initials}
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

                    <p className="mt-1 text-xs text-[#8A9F90]">
                      {chat.role} • {chat.department}
                    </p>

                    <p className="mt-2 truncate text-xs text-[#718579]">
                      {lastMessage?.text}
                    </p>
                  </div>
                </button>
              );
            })}

            {filteredChats.length === 0 && (
              <p className="py-12 text-center text-sm text-[#718579]">
                No conversations found.
              </p>
            )}
          </div>
        </aside>

        {/* Active Conversation */}
        <div
          className={`min-w-0 flex-1 flex-col ${
            mobileChatOpen ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-[#E2EADC] p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={() => setMobileChatOpen(false)}
                    aria-label="Back to conversations"
                    className="rounded-lg p-2 text-[#234E43] hover:bg-[#F1F7EF] md:hidden"
                  >
                    <ArrowLeft size={21} />
                  </button>

                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-[#234E43]"
                    style={{ backgroundColor: selectedChat.color }}
                  >
                    {selectedChat.initials}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-[#234E43]">
                      {selectedChat.name}
                    </h3>

                    <p className="truncate text-xs text-[#718579]">
                      {selectedChat.role} • {selectedChat.department}
                    </p>
                  </div>
                </div>

                <span className="hidden rounded-full bg-[#EAF2E8] px-3 py-1.5 text-xs font-semibold text-[#477764] sm:inline-flex">
                  Campus Contact
                </span>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 space-y-5 overflow-y-auto bg-[#FAFCF9] p-5 md:p-7">
                <div className="mb-7 text-center">
                  <span className="rounded-full bg-[#EAF2E8] px-4 py-2 text-xs font-semibold text-[#607B6C]">
                    Demo Conversation
                  </span>
                </div>

                {selectedChat.messages.map((item) => {
                  const isMe = item.sender === "me";

                  return (
                    <div
                      key={item.id}
                      className={`flex ${
                        isMe ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm md:max-w-[75%] ${
                          isMe
                            ? "rounded-br-sm bg-[#234E43] text-white"
                            : "rounded-bl-sm border border-[#E2EADC] bg-white text-[#234E43]"
                        }`}
                      >
                        <p className="break-words text-sm leading-relaxed">
                          {item.text}
                        </p>

                        <div
                          className={`mt-3 flex items-center justify-end gap-1 text-[10px] ${
                            isMe ? "text-[#C4DACC]" : "text-[#8A9F90]"
                          }`}
                        >
                          {item.time}

                          {isMe && <CheckCheck size={14} />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>

              {/* Message Composer */}
              <form
                onSubmit={sendMessage}
                className="border-t border-[#E2EADC] bg-white p-4 md:p-5"
              >
                <div className="flex items-end gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(event) =>
                      setMessage(event.target.value)
                    }
                    maxLength={1000}
                    placeholder="Type your message..."
                    aria-label="Write a message"
                    className="min-w-0 flex-1 rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-5 py-3.5 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
                  />

                  <button
                    type="submit"
                    disabled={!message.trim()}
                    aria-label="Send message"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#234E43] text-white transition hover:bg-[#326657] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send size={20} />
                  </button>
                </div>

                <p className="mt-3 text-center text-[11px] text-[#8A9F90]">
                  Frontend demo only — messages are not delivered.
                </p>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-[#718579]">
              <MessageSquare size={45} />
              <p className="mt-4">Select a conversation</p>
            </div>
          )}
        </div>
      </section>

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Campus Messaging
      </div>
    </div>
  );
}

export default StudentMessages;
