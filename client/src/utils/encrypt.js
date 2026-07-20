import sodium from "libsodium-wrappers";

export async function encryptMessage(
  message,
  receiverPublicKey,
  senderPrivateKey,
  senderPublicKey,
) {
  await sodium.ready;

  const VARIANT = sodium.base64_variants.URLSAFE_NO_PADDING;

  // Ensure all keys are in correct format
  const receiverPubKeyBytes =
    typeof receiverPublicKey === "string"
      ? sodium.from_base64(receiverPublicKey, VARIANT)
      : receiverPublicKey;

  const senderPrivKeyBytes =
    typeof senderPrivateKey === "string"
      ? sodium.from_base64(senderPrivateKey, VARIANT)
      : senderPrivateKey;

  const senderPubKeyBytes =
    typeof senderPublicKey === "string"
      ? sodium.from_base64(senderPublicKey, VARIANT)
      : senderPublicKey;

  const senderPubKeyBase64 =
    typeof senderPublicKey === "string"
      ? senderPublicKey
      : sodium.to_base64(senderPublicKey, VARIANT);

  const messageBytes = sodium.from_string(message);

  // Two separate nonces (never reuse a nonce!)
  const nonceForReceiver = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const nonceForSender   = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

  // Encrypt for RECEIVER
  const cipherTextForReceiver = sodium.crypto_box_easy(
    messageBytes,
    nonceForReceiver,
    receiverPubKeyBytes,
    senderPrivKeyBytes,
  );

  // Encrypt for SENDER (self-copy so sender can decrypt after refresh)
  const cipherTextForSender = sodium.crypto_box_easy(
    messageBytes,
    nonceForSender,
    senderPubKeyBytes,
    senderPrivKeyBytes,
  );

  return {
    // Receiver's copy
    cipherText: sodium.to_base64(cipherTextForReceiver, VARIANT),
    nonce: sodium.to_base64(nonceForReceiver, VARIANT),
    senderPublicKey: senderPubKeyBase64,

    // Sender's self-copy
    cipherTextForSender: sodium.to_base64(cipherTextForSender, VARIANT),
    nonceForSender: sodium.to_base64(nonceForSender, VARIANT),
  };
}