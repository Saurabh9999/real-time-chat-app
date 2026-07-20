import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import ChatHeader from "../components/ChatHeader";
import socket from "../socket";
import api from "../api/api";
import sodium from "libsodium-wrappers";

import { encryptMessage } from "../utils/encrypt.js";
import { getPrivateKey, getPublicKey } from "../utils/keymanager.js";

const VARIANT = sodium.base64_variants.URLSAFE_NO_PADDING;

/* -------------------- KEY CACHE -------------------- */
const keyCache = {
  privateKey: null,
  publicKey: null,
};

const loadKeys = async () => {
  if (!keyCache.privateKey || !keyCache.publicKey) {
    const privateKey = await getPrivateKey();
    const publicKey = await getPublicKey();
    if (!privateKey || !publicKey) throw new Error("Encryption keys missing");
    keyCache.privateKey = privateKey;
    keyCache.publicKey = publicKey;
  }
};

/* -------------------- DECRYPT -------------------- */
const decryptMessage = async (encryptedPayload, isMine) => {
  await sodium.ready;

  try {
    await loadKeys();

    // ✅ FIX: If sender's own message, use self-copy
    if (isMine) {
      if (!encryptedPayload?.cipherTextForSender || !encryptedPayload?.nonceForSender) {
        return "[Unable to decrypt]";
      }

      const cipherText = sodium.from_base64(encryptedPayload.cipherTextForSender, VARIANT);
      const nonce = sodium.from_base64(encryptedPayload.nonceForSender, VARIANT);

      const decrypted = sodium.crypto_box_open_easy(
        cipherText,
        nonce,
        keyCache.publicKey,   // sender's own public key
        keyCache.privateKey,  // sender's own private key
      );

      return sodium.to_string(decrypted);
    }

    // Receiver's copy (unchanged)
    if (
      !encryptedPayload?.cipherText ||
      !encryptedPayload?.nonce ||
      !encryptedPayload?.senderPublicKey
    ) {
      return "[Invalid message]";
    }

    const senderPublicKey = sodium.from_base64(encryptedPayload.senderPublicKey, VARIANT);
    const cipherText = sodium.from_base64(encryptedPayload.cipherText, VARIANT);
    const nonce = sodium.from_base64(encryptedPayload.nonce, VARIANT);

    const decrypted = sodium.crypto_box_open_easy(
      cipherText,
      nonce,
      senderPublicKey,
      keyCache.privateKey,
    );

    return sodium.to_string(decrypted);

  } catch (err) {
    console.error("❌ Decryption failed:", err);
    return "[Unable to decrypt]";
  }
};

export default function Chat() {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [receiverKey, setReceiverKey] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const messagesEndRef = useRef(null);
  const me = JSON.parse(localStorage.getItem("user"));

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  /* -------------------- RESPONSIVE -------------------- */
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setShowSidebar(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* -------------------- SOCKET -------------------- */
  useEffect(() => {
    socket.auth = { token: localStorage.getItem("token") };
    socket.connect();
    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("onlineUsers", setOnlineUsers);
    return () => socket.disconnect();
  }, []);

  /* -------------------- FETCH USER PUBLIC KEY -------------------- */
  const fetchUserPublicKey = (userId) => {
    socket.emit("getUserPublicKey", userId, (res) => {
      if (res.error) { console.error(res.error); return; }
      if (!res.publicKey) { console.error("Public key missing"); return; }
      setReceiverKey(res.publicKey);
      setSelectedUser((prev) => ({ ...prev, publicKey: res.publicKey }));
    });
  };

  /* -------------------- LOAD MESSAGES -------------------- */
  useEffect(() => {
    if (!currentRoom) return;

    const loadMessages = async () => {
      try {
        await loadKeys(); // ✅ ensure keys are loaded before decrypting

        const res = await api.get(`/user/message/${currentRoom}`);

        const decrypted = await Promise.all(
          res.data.map(async (msg) => {
            const isMine = msg.sender?._id === me._id; // ✅ check if sender is me

            const text = msg.encryptedPayload
              ? await decryptMessage(msg.encryptedPayload, isMine) // ✅ pass isMine
              : "[No message]";

            return { ...msg, text };
          }),
        );

        setMessages(decrypted);
        scrollToBottom();
      } catch (err) {
        console.error(err);
      }
    };

    loadMessages();
    socket.emit("joinRoom", currentRoom);

    const handleMessage = async ({ encryptedPayload, sender, _id, createdAt, conversation }) => {
      if (conversation._id !== currentRoom) return;
      if (sender._id === me._id) return;

      const text = await decryptMessage(encryptedPayload, false); // always receiver here

      setMessages((prev) => [
        ...prev,
        { _id, text, sender, createdAt, status: "delivered" },
      ]);

      scrollToBottom();
    };

    socket.on("receiveMessage", handleMessage);
    return () => socket.off("receiveMessage", handleMessage);
  }, [currentRoom]);

  /* -------------------- SEND MESSAGE -------------------- */
  const handleSendMessage = async (text) => {
    if (!text?.trim()) return;
    if (!selectedUser?._id) return;

    let roomId = currentRoom;

    if (!roomId) {
      try {
        const res = await api.post("/conversation/", { userId: selectedUser._id });
        roomId = res.data._id;
        setCurrentRoom(roomId);
      } catch (err) {
        console.error(err); return;
      }
    }

    try {
      await sodium.ready;
      await loadKeys();

      const finalReceiverKey = receiverKey || selectedUser?.publicKey;
      if (!finalReceiverKey) { console.error("Receiver public key missing"); return; }

      const encryptedPayload = await encryptMessage(
        text,
        finalReceiverKey,
        keyCache.privateKey,
        keyCache.publicKey,
      );

      // ✅ FIX: Store plain text for immediate display (it's already known to sender)
      setMessages((prev) => [
        ...prev,
        {
          _id: Date.now(),
          text,              // plain text is fine here — sender just typed it
          sender: me,
          createdAt: new Date().toISOString(),
          status: "sending",
        },
      ]);

      scrollToBottom();

      socket.emit("sendMessage", { roomId, encryptedPayload });
    } catch (err) {
      console.error("Encryption failed:", err);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {(showSidebar || !isMobile) && (
        <div className="w-full md:w-80 border-r bg-white">
          <Sidebar
            setCurrentRoom={(room) => {
              setCurrentRoom(room);
              if (isMobile) setShowSidebar(false);
            }}
            setSelectedUser={(user) => {
              setSelectedUser(user);
              fetchUserPublicKey(user._id);
            }}
          />
        </div>
      )}

      {(!showSidebar || !isMobile) && (
        <div className="flex-1 flex flex-col">
          <ChatHeader
            user={selectedUser}
            onlineUsers={onlineUsers}
            onBack={() => setShowSidebar(true)}
            isMobile={isMobile}
          />

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-gray-50">
            {!selectedUser ? (
              <div className="text-gray-400 text-center mt-10">Select a chat</div>
            ) : messages.length === 0 ? (
              <div className="text-gray-400 text-center mt-10">Say hi 👋</div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender?._id === me._id;
                const time = new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={msg._id}
                    className={`px-4 py-2 rounded-2xl max-w-[75%] md:max-w-xs shadow ${
                      isMine
                        ? "bg-blue-500 text-white self-end"
                        : "bg-white text-gray-800 self-start"
                    }`}
                  >
                    {!isMine && (
                      <div className="text-sm font-semibold mb-1">{msg.sender?.name}</div>
                    )}
                    <div>{msg.text}</div>
                    <div className="text-xs mt-1 text-right opacity-70">
                      {time} · {msg.status}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="h-16 border-t flex items-center px-4 bg-white gap-2">
            {selectedUser ? (
              <MessageInput onSend={handleSendMessage} />
            ) : (
              <div className="text-gray-400">Select user</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- INPUT -------------------- */
function MessageInput({ onSend }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Type a message..."
        className="flex-1 border rounded-full px-4 py-2 outline-none"
      />
      <button
        onClick={handleSend}
        className="bg-blue-500 text-white px-5 py-2 rounded-full"
      >
        Send
      </button>
    </>
  );
}