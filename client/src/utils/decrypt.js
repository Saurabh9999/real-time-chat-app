import sodium from "libsodium-wrappers";
import { getPrivateKey, getPublicKey } from "./keymanager.js";

const VARIANT = sodium.base64_variants.URLSAFE_NO_PADDING;

const keyCache = {
  privateKey: null,
  publicKey: null,
};

export async function loadKeys() {
  if (!keyCache.privateKey || !keyCache.publicKey) {
    const privateKey = await getPrivateKey();
    const publicKey = await getPublicKey();
    if (!privateKey || !publicKey) throw new Error("Encryption keys missing");
    keyCache.privateKey = privateKey;
    keyCache.publicKey = publicKey;
  }
  return keyCache;
}

export async function decryptMessage(encryptedPayload, isMine) {
  await sodium.ready;

  try {
    const keys = await loadKeys();

    if (isMine) {
      if (!encryptedPayload?.cipherTextForSender || !encryptedPayload?.nonceForSender) {
        return "[Unable to decrypt]";
      }

      const decrypted = sodium.crypto_box_open_easy(
        sodium.from_base64(encryptedPayload.cipherTextForSender, VARIANT),
        sodium.from_base64(encryptedPayload.nonceForSender, VARIANT),
        keys.publicKey,
        keys.privateKey,
      );

      return sodium.to_string(decrypted);
    }

    if (!encryptedPayload?.cipherText || !encryptedPayload?.nonce || !encryptedPayload?.senderPublicKey) {
      return "[Invalid message]";
    }

    const decrypted = sodium.crypto_box_open_easy(
      sodium.from_base64(encryptedPayload.cipherText, VARIANT),
      sodium.from_base64(encryptedPayload.nonce, VARIANT),
      sodium.from_base64(encryptedPayload.senderPublicKey, VARIANT),
      keys.privateKey,
    );

    return sodium.to_string(decrypted);

  } catch (err) {
    console.error("❌ Decryption failed:", err);
    return "[Unable to decrypt]";
  }
}