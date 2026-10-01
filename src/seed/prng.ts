// Deterministic helpers for the seed. Nothing here is cryptographic: the "hashes" only look
// like hashes so the demo screens have realistic values.

/** A seeded pseudo-random generator (mulberry32) returning numbers in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function pick<T>(random: () => number, list: readonly T[]): T {
  return list[Math.floor(random() * list.length)] as T;
}

function fnv1a(text: string, salt: number): string {
  let h = 0x811c9dc5 ^ salt;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** A 64-hex-digit fake digest of a string. */
export function fakeHash(text: string): string {
  return Array.from({ length: 8 }, (_, i) => fnv1a(text, i * 0x9e3779b1)).join('');
}
