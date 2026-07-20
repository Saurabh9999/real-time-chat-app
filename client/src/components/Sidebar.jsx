import { useEffect, useState, useRef } from "react";
import api from "../api/api";
import socket from "../socket";
import { decryptMessage } from "../utils/decrypt.js";
import { formatChatTime } from "../utils/format_time.js";
import { clearKeys } from "../utils/keymanager.js"; // ✅ new

export default function Sidebar({
  setCurrentRoom,
  setSelectedUser,
  isMobile,
  setShowSidebar,
}) {
  const [chats, setChats] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null); // ✅ new
  const [uploading, setUploading] = useState(false); // ✅ new
  const fileInputRef = useRef(null); // ✅ new

  const me = JSON.parse(localStorage.getItem("user"));
  if (!me) return null;

  // ✅ Load profile picture from localStorage on mount
  useEffect(() => {
    const savedPic = localStorage.getItem("profilePicture");
    if (savedPic) setProfilePicture(savedPic);
  }, []);

  const loadChats = async () => {
    try {
      const res = await api.get("/conversation/");

      const chatsWithDecrypted = await Promise.all(
        res.data.map(async (conv) => {
          if (!conv.lastMessage?.encryptedPayload) {
            return { ...conv, lastMessageText: "Start chatting" };
          }

          const isMine = conv.lastMessage.sender?._id === me._id;
          const lastMessageText = await decryptMessage(
            conv.lastMessage.encryptedPayload,
            isMine,
          );

          return { ...conv, lastMessageText };
        }),
      );

      setChats(chatsWithDecrypted);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setChats((prev) => [...prev]), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socket.on("onlineUsers", (users) => setOnlineUsers(users));
    socket.on("receiveMessage", loadChats);
    socket.on("messageDeleted", loadChats);

    return () => {
      socket.off("receiveMessage");
      socket.off("messageDeleted");
      socket.off("onlineUsers");
    };
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await api.get(`/user/search?query=${searchTerm}`);
        setSearchResults(res.data.filter((u) => u._id !== me._id));
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, [searchTerm, me._id]);

  /* ✅ Handle profile picture upload */
  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate on frontend too
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG, and WEBP images are allowed");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("profilePicture", file);

      const res = await api.post("/user/upload-profile-picture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newPicUrl = res.data.profilePicture;

      // Save to state and localStorage
      setProfilePicture(newPicUrl);
      localStorage.setItem("profilePicture", newPicUrl);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const selectChat = async (chatOrUser) => {
    if (chatOrUser.members) {
      const otherUser = chatOrUser.members.find((m) => m._id !== me._id);
      setCurrentRoom(chatOrUser._id);
      const res = await api.get(`/user/${otherUser._id}`);
      setSelectedUser({
        ...res.data,
        publicKey: res.data.devices?.[0]?.publicKey,
      });
      socket.emit("joinRoom", chatOrUser._id);
    } else {
      const res = await api.get(`/user/${chatOrUser._id}`);
      setSelectedUser(res.data);
      setCurrentRoom(null);
    }
    setSearchTerm("");
    if (isMobile) setShowSidebar(false);
  };

const handleLogout = async () => {
  await clearKeys();

  // ✅ Get deviceId BEFORE clearing
  const deviceId = localStorage.getItem("deviceId");
  
  // Clear everything except deviceId
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("profilePicture");
  // ❌ DO NOT call localStorage.clear()

  // deviceId stays in localStorage automatically
  window.location.href = "/login";
};

  const filteredChats = chats.filter((chat) => {
    const otherUser = chat.members.find((m) => m._id !== me._id);
    return otherUser.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div
      className={`${isMobile ? "w-full" : "w-80"} border-r bg-white flex flex-col h-screen relative`}
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-lg">Chats</div>

          {/* ✅ Profile button — shows picture if available, else initial */}
          <button
            onClick={() => setShowProfile(true)}
            className="w-9 h-9 rounded-full overflow-hidden bg-blue-500 text-white flex items-center justify-center font-semibold text-sm hover:opacity-90 transition cursor-pointer"
            title="My Profile"
          >
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="profile"
                className="w-full h-full object-cover"
              />
            ) : (
              me?.name?.[0]?.toUpperCase()
            )}
          </button>
        </div>

        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border rounded px-2 py-1 outline-none"
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {searchTerm
          ? searchResults.map((user) => (
              <div
                key={user._id}
                onClick={() => selectChat(user)}
                className="p-3 border-b cursor-pointer hover:bg-gray-100 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-medium">
                  {user.name[0].toUpperCase()}
                </div>
                <div>{user.name}</div>
              </div>
            ))
          : filteredChats.map((chat) => {
              const otherUser = chat.members.find((m) => m._id !== me._id);
              const isOnline = onlineUsers.some(
                (u) => u.id === otherUser._id && u.isOnline,
              );

              return (
                <div
                  key={chat._id}
                  onClick={() => selectChat(chat)}
                  className="p-3 border-b cursor-pointer hover:bg-gray-100 flex items-center gap-3"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-medium overflow-hidden">
                      {otherUser.profilePicture ? (
                        <img
                          src={otherUser.profilePicture}
                          alt={otherUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        otherUser.name[0].toUpperCase()
                      )}
                    </div>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{otherUser.name}</div>
                      <div className="text-xs text-gray-400 shrink-0 ml-2">
                        {formatChatTime(chat.lastMessage?.createdAt)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {chat.lastMessageText || "Start chatting"}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Profile Panel */}
      {showProfile && (
        <div className="absolute inset-0 bg-white z-10 flex flex-col">
          {/* Panel Header */}
          <div className="flex items-center gap-3 p-4 bg-blue-500 text-white">
            <button
              onClick={() => setShowProfile(false)}
              className="text-white text-xl font-bold hover:opacity-80 transition cursor-pointer"
            >
              ←
            </button>
            <div className="font-semibold text-lg">Profile</div>
          </div>

          {/* ✅ Avatar — clickable to change picture */}
          <div className="flex flex-col items-center py-8 bg-gray-50 border-b">
            <div
              className="relative cursor-pointer group"
              onClick={() => fileInputRef.current.click()}
            >
              <div className="w-24 h-24 rounded-full bg-blue-500 text-white flex items-center justify-center text-4xl font-bold overflow-hidden">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  me?.name?.[0]?.toUpperCase()
                )}
              </div>

              {/* ✅ Hover overlay — camera icon */}
              <div className="absolute inset-0 rounded-full bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                {uploading ? (
                  <div className="text-white text-xs">...</div>
                ) : (
                  <span className="text-white text-2xl">📷</span>
                )}
              </div>
            </div>

            {/* ✅ Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleProfilePictureChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            <div className="text-xs text-gray-400 mt-2">
              {uploading ? "Uploading..." : "Tap photo to change"}
            </div>

            <div className="text-xl font-semibold mt-2">{me?.name}</div>
            <div className="text-sm text-green-500 mt-1">● Online</div>
          </div>

          {/* Info Cards */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div className="bg-gray-50 rounded-xl p-4 border">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Name
              </div>
              <div className="font-medium text-gray-800">{me?.name}</div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Email
              </div>
              <div className="font-medium text-gray-800">{me?.email}</div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Security
              </div>
              <div className="font-medium text-green-600">
                🔐 End-to-End Encrypted
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Messages secured with libsodium · Keys stored on your device
                only
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="p-4 border-t shrink-0">
            <button
              onClick={handleLogout}
              className="w-full py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
