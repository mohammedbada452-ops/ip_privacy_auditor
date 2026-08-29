/**
 * Client-side Privacy-Safe Deterministic Hash Utilities
 * Stage 8 Browser Intelligence
 */

/**
 * 32-bit FNV-1a Hash
 * Fast, non-cryptographic, deterministic string hash.
 */
export function fnv1a32(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  // Convert to 8-character unsigned hexadecimal string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * SHA-256 Digest using SubtleCrypto when available, with deterministic FNV-1a fallback.
 */
export async function sha256Digest(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const msgUint8 = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Pure deterministic fallback
  const p1 = fnv1a32(str);
  const p2 = fnv1a32(str.split('').reverse().join(''));
  const p3 = fnv1a32(`${str}_salt_audit`);
  return `${p1}${p2}${p3}`;
}
