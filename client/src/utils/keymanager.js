import sodium from "libsodium-wrappers";
import { openDB } from "idb";

const dbPromise = openDB("chat-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("keys")) {
      db.createObjectStore("keys");
    }
  },
});

const VARIANT = sodium.base64_variants.URLSAFE_NO_PADDING;

export async function getPrivateKey() {
  await sodium.ready;
  const db = await dbPromise;
  const key = await db.get("keys", "privateKey");
  if (!key) return null;
  if (typeof key === "string") return sodium.from_base64(key, VARIANT);
  if (key instanceof Uint8Array) return key;
  throw new Error("Invalid privateKey format in DB");
}

export async function getPublicKey() {
  await sodium.ready;
  const db = await dbPromise;
  const key = await db.get("keys", "publicKey");
  if (!key) return null;
  if (typeof key === "string") return sodium.from_base64(key, VARIANT);
  if (key instanceof Uint8Array) return key;
  throw new Error("Invalid publicKey format in DB");
}

export async function clearKeys() {
  const db = await dbPromise;
  await db.delete("keys", "privateKey");
  await db.delete("keys", "publicKey");
}

export async function saveKeys(privateKeyBytes, publicKeyBytes) {
  await sodium.ready;
  const db = await dbPromise;
  await db.put(
    "keys",
    sodium.to_base64(privateKeyBytes, VARIANT),
    "privateKey",
  );
  await db.put("keys", sodium.to_base64(publicKeyBytes, VARIANT), "publicKey");
}
