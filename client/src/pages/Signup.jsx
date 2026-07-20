import React, { useState } from "react";
import api from "../api/api.jsx";
import sodium from "libsodium-wrappers";
import { useNavigate } from "react-router-dom";
import { openDB } from "idb";

const VARIANT = sodium.base64_variants.URLSAFE_NO_PADDING; // ✅ consistent variant

function getDeviceId() {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

const dbPromise = openDB("chat-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("keys")) {
      db.createObjectStore("keys");
    }
  },
});

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      await sodium.ready;

      const deviceId = getDeviceId();

      // 🔐 Generate keypair
      const keyPair = sodium.crypto_box_keypair();

      // ✅ Always use VARIANT consistently
      const publicKeyB64 = sodium.to_base64(keyPair.publicKey, VARIANT);
      const privateKeyB64 = sodium.to_base64(keyPair.privateKey, VARIANT);

      // 🔐 Encrypt private key with password for server backup
      const passwordKey = sodium.crypto_generichash(
        32,
        sodium.from_string(password),
      );
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
      const encryptedPrivKey = sodium.crypto_secretbox_easy(
        keyPair.privateKey,
        nonce,
        passwordKey,
      );

      const encryptedPrivKeyB64 = sodium.to_base64(encryptedPrivKey, VARIANT);
      const nonceB64 = sodium.to_base64(nonce, VARIANT);

      // 💾 Save to IndexedDB using consistent VARIANT
      const db = await dbPromise;
      await db.put("keys", privateKeyB64, "privateKey");
      await db.put("keys", publicKeyB64, "publicKey");

      // 📤 Send to backend
      await api.post("/user/register", {
        name,
        email,
        password,
        deviceId,
        publicKey: publicKeyB64,
        encryptedPrivateKey: encryptedPrivKeyB64,
        privateKeyNonce: nonceB64,
      });

      navigate("/login");
    } catch (error) {
      console.error("Signup failed:", error);
      alert("Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-xl font-bold mb-4 text-center">Create Account</h2>

        <input
          type="text"
          placeholder="Name"
          className="w-full border p-2 mb-3 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 mb-3 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-4 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSignup}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>

        <button
          onClick={() => navigate("/login")}
          className="w-full mt-2 bg-gray-500 text-white p-2 rounded"
        >
          Already have an account? Login
        </button>
      </div>
    </div>
  );
}
