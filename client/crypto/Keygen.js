import sodium from "libsodium-wrappers";

export const generateKeyPair = async () => {
  // wait for WASM to load
  await sodium.ready;

  // generate public + private key pair
  const keyPair = sodium.crypto_box_keypair();

  // convert binary → base64 (for storage / sending)
  const publicKey = sodium.to_base64(keyPair.publicKey);
  const privateKey = sodium.to_base64(keyPair.privateKey);

  return {
    publicKey,
    privateKey
  };
};