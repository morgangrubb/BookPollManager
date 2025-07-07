// Utility for Discord signature verification

export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export async function verifyDiscordSignature(body, signature, timestamp, publicKey) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKey),
      { name: "Ed25519", namedCurve: "Ed25519" },
      false,
      ["verify"],
    );

    const data = encoder.encode(timestamp + body);
    const sig = hexToBytes(signature);

    return await crypto.subtle.verify("Ed25519", key, sig, data);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
