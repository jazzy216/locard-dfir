(function () {
  'use strict';
  /* Pure-JS MD5, SHA-1 and SHA-256 over Uint8Array. Synchronous, no secure-context requirement. */
  const H = (App.hash = {});
  H.utf8 = (s) => new TextEncoder().encode(s);
  const hex = (words, le) => words.map((w) => {
    let s = '';
    for (let i = 0; i < 4; i++) { const b = le ? (w >>> (8 * i)) & 255 : (w >>> (24 - 8 * i)) & 255; s += b.toString(16).padStart(2, '0'); }
    return s;
  }).join('');
  function padBE(bytes) {
    const n = bytes.length, bits = n * 8, total = ((n + 9 + 63) >> 6) << 6;
    const m = new Uint8Array(total); m.set(bytes); m[n] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(total - 8, Math.floor(bits / 4294967296)); dv.setUint32(total - 4, bits >>> 0);
    return dv;
  }
  const K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  H.sha256 = function (bytes) {
    const dv = padBE(bytes), w = new Uint32Array(64);
    let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < dv.byteLength; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25), ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + K256[i] + w[i]) >>> 0;
        const S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h = [h[0] + a, h[1] + b, h[2] + c, h[3] + d, h[4] + e, h[5] + f, h[6] + g, h[7] + hh].map((x) => x >>> 0);
    }
    return hex(h);
  };
  H.sha1 = function (bytes) {
    const dv = padBE(bytes), w = new Uint32Array(80);
    let h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
    const rl = (x, n) => (x << n) | (x >>> (32 - n));
    for (let off = 0; off < dv.byteLength; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 80; i++) w[i] = rl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1) >>> 0;
      let [a, b, c, d, e] = h;
      for (let i = 0; i < 80; i++) {
        const f = i < 20 ? (b & c) | (~b & d) : i < 40 ? b ^ c ^ d : i < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d;
        const k = i < 20 ? 0x5a827999 : i < 40 ? 0x6ed9eba1 : i < 60 ? 0x8f1bbcdc : 0xca62c1d6;
        const t = (rl(a, 5) + f + e + k + w[i]) >>> 0;
        e = d; d = c; c = rl(b, 30) >>> 0; b = a; a = t;
      }
      h = [h[0] + a, h[1] + b, h[2] + c, h[3] + d, h[4] + e].map((x) => x >>> 0);
    }
    return hex(h);
  };
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const KM = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);
  H.md5 = function (bytes) {
    const n = bytes.length, total = ((n + 9 + 63) >> 6) << 6, m = new Uint8Array(total);
    m.set(bytes); m[n] = 0x80;
    const dv = new DataView(m.buffer), bits = n * 8;
    dv.setUint32(total - 8, bits >>> 0, true); dv.setUint32(total - 4, Math.floor(bits / 4294967296), true);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    const M = new Uint32Array(16);
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + KM[i] + M[g]) >>> 0;
        A = D; D = C; C = B; B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    return hex([a0, b0, c0, d0], true);
  };
  H.all = (bytes) => ({ md5: H.md5(bytes), sha1: H.sha1(bytes), sha256: H.sha256(bytes) });
  H.bitsDiff = (x, y) => {
    let d = 0;
    for (let i = 0; i < Math.min(x.length, y.length); i++) { let v = parseInt(x[i], 16) ^ parseInt(y[i], 16); while (v) { d += v & 1; v >>= 1; } }
    return d;
  };
  /* Render a hash with the characters that differ from a reference highlighted. */
  H.diffHtml = (h, ref) => ref ? h.split('').map((c, i) => c === ref[i] ? `<span>${c}</span>` : `<mark>${c}</mark>`).join('') : h;
  H.entropy = (s) => {
    if (!s.length) return 0;
    const f = {}; for (const c of s) f[c] = (f[c] || 0) + 1;
    return Object.values(f).reduce((e, n) => { const p = n / s.length; return e - p * Math.log2(p); }, 0);
  };
})();
