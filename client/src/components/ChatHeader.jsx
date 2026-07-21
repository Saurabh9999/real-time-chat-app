import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ChatHeader({ user, onlineUsers, onBack }) {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false); // ✅ new

  if (!user) return <div className="text-gray-500 p-4">Select a chat</div>;

  const onlineUser = onlineUsers.find((u) => u.id === user._id);
  const isOnline = onlineUser ? onlineUser.isOnline : false;
  const lastSeen = onlineUser?.lastSeen ?? user?.lastSeen ?? "unknown";

  const getLastSeen = () => {
    if (isOnline) return "Online now";
    if (!lastSeen) return "Offline";

    const lastSeenDate = new Date(lastSeen);
    if (isNaN(lastSeenDate.getTime())) return "Offline";

    const diff = Math.floor((new Date() - lastSeenDate) / 1000);

    if (diff < 60) return `Last seen ${diff}s ago`;
    if (diff < 3600) return `Last seen ${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `Last seen ${Math.floor(diff / 3600)}h ago`;
    return `Last seen ${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <>
      {/* -------------------- HEADER -------------------- */}
      <div className="h-16 border-b flex items-center px-4 bg-white">
        <div className="flex items-center gap-3 w-full">
          {/* Back button (mobile) */}
          <button onClick={onBack} className="md:hidden text-xl">
            ←
          </button>

          {/* ✅ Clickable Avatar + Name */}
          <div
            className="flex items-center gap-3 cursor-pointer flex-1"
            onClick={() => setShowProfile(true)}
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.name[0].toUpperCase()
                )}
              </div>
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>

            {/* Name + Status */}
            <div>
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-gray-500">{getLastSeen()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------- PROFILE MODAL -------------------- */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-xl w-80 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center gap-3 p-4 bg-blue-500 text-white">
              <button
                onClick={() => setShowProfile(false)}
                className="text-white text-xl font-bold hover:opacity-80 transition"
              >
                ←
              </button>
              <div className="font-semibold text-lg">Profile</div>
            </div>

            {/* Avatar + Name */}
            <div className="flex flex-col items-center py-8 bg-gray-50 border-b">
              <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-4xl font-bold overflow-hidden mb-3">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    crossorigin="anonymous"
                  />
                ) : (
                  user.name[0].toUpperCase()
                )}
              </div>
              <div className="text-xl font-semibold">{user.name}</div>
              <div
                className={`text-sm mt-1 ${isOnline ? "text-green-500" : "text-gray-400"}`}
              >
                {isOnline ? "● Online" : getLastSeen()}
              </div>
            </div>

            {/* Info Cards */}
            <div className="p-4 flex flex-col gap-3">
              <div className="bg-gray-50 rounded-xl p-4 border">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Name
                </div>
                <div className="font-medium text-gray-800">{user.name}</div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Email
                </div>
                <div className="font-medium text-gray-800">{user.email}</div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  Status
                </div>
                <div
                  className={`font-medium ${isOnline ? "text-green-600" : "text-gray-500"}`}
                >
                  {isOnline ? "🟢 Online" : "⚫ Offline"}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="p-4 pt-0">
              <button
                onClick={() => setShowProfile(false)}
                className="w-full py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
