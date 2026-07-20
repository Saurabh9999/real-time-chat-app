import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import ChatHeader from "../components/ChatHeader";
import socket from "../socket";
import api from "../api/api";

export default function Chat() {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTyping, setIsTyping] = useState(false); // ✅ typing indicator

  const messagesEndRef = useRef(null);
  const me = JSON.parse(localStorage.getItem("user"));

  // ✅ Scroll
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // ✅ Handle resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setShowSidebar(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Socket connect
  useEffect(() => {
    socket.auth = { token: localStorage.getItem("token") };
    socket.connect();

    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("onlineUsers", setOnlineUsers);

    return () => {
      socket.disconnect();
    };
  }, []);

  // ✅ Handle room change
  useEffect(() => {
    if (!currentRoom) return;

    // Load messages
    const loadMessages = async () => {
      try {
        const res = await api.get(`/user/message/${currentRoom}`);
        setMessages(res.data);
        scrollToBottom();
      } catch (err) {
        console.error(err);
      }
    };
    loadMessages();

    // Join room
    socket.emit("joinRoom", currentRoom);

    // Listen for new messages
    const handleMessage = ({ message, conversation }) => {
      if (conversation._id === currentRoom) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      }
    };

    socket.on("receiveMessage", handleMessage);

    return () => {
      socket.off("receiveMessage", handleMessage);
    };
  }, [currentRoom]);

  // ✅ Handle typing events
  useEffect(() => {
    if (!currentRoom) return;

    const handleTyping = ({ senderName }) => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [currentRoom]);

  // ✅ Send message
  const handleSendMessage = async (text) => {
    if (!text.trim() || !selectedUser) return;

    let roomId = currentRoom;

    // Create room if not exists
    if (!roomId) {
      try {
        const res = await api.post("/conversation/", {
          userId: selectedUser._id,
        });
        roomId = res.data._id;
        setCurrentRoom(roomId);
        socket.emit("joinRoom", roomId);
      } catch (err) {
        console.error(err);
        return;
      }
    }

    // Emit message
    socket.emit("sendMessage", { roomId, text });
    // Stop typing after sending
    socket.emit("stopTyping", { roomId });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      {(showSidebar || !isMobile) && (
        <div className="w-full md:w-80 border-r bg-white">
          <Sidebar
            setCurrentRoom={(room) => {
              setCurrentRoom(room);
              if (isMobile) setShowSidebar(false);
            }}
            setSelectedUser={setSelectedUser}
          />
        </div>
      )}

      {/* Chat */}
      {(!showSidebar || !isMobile) && (
        <div className="flex-1 flex flex-col">
          <ChatHeader
            user={selectedUser}
            onlineUsers={onlineUsers}
            onBack={() => setShowSidebar(true)}
            isMobile={isMobile}
          />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-gray-50">
            {!selectedUser ? (
              <div className="text-gray-400 text-center mt-10">
                Select a chat
              </div>
            ) : messages.length === 0 ? (
              <div className="text-gray-400 text-center mt-10">Say hi 👋</div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender._id === me._id;
                const time = new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={msg._id}
                    className={`px-4 py-2 rounded-2xl max-w-[75%] md:max-w-xs wrap-break-words shadow ${
                      isMine
                        ? "bg-blue-500 text-white self-end rounded-br-none"
                        : "bg-white text-gray-800 self-start rounded-bl-none"
                    }`}
                  >
                    {!isMine && (
                      <div className="text-sm font-semibold mb-1">
                        {msg.sender.name}
                      </div>
                    )}

                    <div>{msg.text}</div>

                    <div className="text-xs mt-1 text-right opacity-70">
                      {time}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {isTyping && selectedUser && (
              <div className="text-gray-500 text-sm px-4 mb-1">
                {selectedUser.name} is typing...
              </div>
            )}

            <div ref={messagesEndRef}></div>
          </div>

          {/* Input */}
          <div className="h-16 border-t flex items-center px-4 bg-white gap-2">
            {selectedUser ? (
              <MessageInput onSend={handleSendMessage} roomId={currentRoom} />
            ) : (
              <div className="text-gray-400">Select user</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Message input with typing events
function MessageInput({ onSend, roomId }) {
  const [text, setText] = useState("");
  const typingTimeout = useRef(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");

    // Stop typing after sending
    socket.emit("stopTyping", { roomId });
    clearTimeout(typingTimeout.current);
  };

  const handleChange = (e) => {
    setText(e.target.value);

    // Emit typing event
    socket.emit("typing", { roomId });

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("stopTyping", { roomId });
    }, 1500); // stop typing after 1.5s of inactivity
  };

  return (
    <>
      <input
        value={text}
        onChange={handleChange}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Type a message..."
        className="flex-1 border rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-blue-400"
      />

      <button
        onClick={handleSend}
        className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full"
      >
        Send
      </button>
    </>
  );
}