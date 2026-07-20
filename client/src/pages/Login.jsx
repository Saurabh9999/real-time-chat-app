import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import sodium from "libsodium-wrappers";
import { openDB } from "idb";

const VARIANT = sodium.base64_variants.URLSAFE_NO_PADDING; // ✅ consistent

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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await sodium.ready;

      const deviceId = getDeviceId();

      // 🔐 Login request
      const res = await api.post("/user/login", { email, password, deviceId });
      const { token, user } = res.data;

      console.log("USER DEVICES FROM SERVER:", user.devices);
      console.log("DEVICE ID USED:", deviceId);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      const db = await dbPromise;

      // 🔍 Check if keys already in IndexedDB
      const existingPrivKey = await db.get("keys", "privateKey");
      const existingPubKey = await db.get("keys", "publicKey");

      if (!existingPrivKey || !existingPubKey) {
        // Keys missing — restore from server backup
       // ✅ Fix — find any device that has a backup, ignore deviceId
const device = user.devices?.find((d) => d.encryptedPrivateKey) ?? user.devices?.[0];

        if (!device || !device.encryptedPrivateKey || !device.privateKeyNonce) {
          // ❌ No backup found — user must signup again
          alert("No key backup found for this device. Please sign up again.");
          navigate("/signup");
          return;
        }

        // ✅ Decrypt private key using password
        const passwordKey = sodium.crypto_generichash(
          32,
          sodium.from_string(password),
        );

        const decryptedPrivKey = sodium.crypto_secretbox_open_easy(
          sodium.from_base64(device.encryptedPrivateKey, VARIANT),
          sodium.from_base64(device.privateKeyNonce, VARIANT),
          passwordKey,
        );

        // ✅ Save restored keys to IndexedDB using consistent VARIANT
        await db.put(
          "keys",
          sodium.to_base64(decryptedPrivKey, VARIANT),
          "privateKey",
        );
        await db.put("keys", device.publicKey, "publicKey");
      }

      window.dispatchEvent(new Event("authChange"));
      navigate("/chat");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded-lg shadow-md w-80"
      >
        <h2 className="text-2xl font-semibold mb-4 text-center">Login</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="button"
          onClick={() => navigate("/forgot-password")}
          className="w-full text-blue-500 hover:underline text-left mb-3 cursor-pointer"
        >
          Forgot Password?
        </button>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/signup")}
          className="w-full mt-2 bg-gray-500 text-white p-2 rounded"
        >
          Create Account
        </button>
      </form>
    </div>
  );
}
