/**
 * Core logic for simple-utf-16-bom-handler.
 *
 * All functions operate on `Uint8Array` rather than `Buffer` so the library is
 * portable across Node and browsers without pulling in a polyfill.
 *
 * The UTF-16 BOM is two bytes: 0xFF 0xFE marks little-endian, 0xFE 0xFF marks
 * big-endian. Everything else has no BOM from this library's point of view.
 */

/** UTF-16 little-endian byte order mark, 0xFF 0xFE. */
export const BOM_LE = new Uint8Array([0xff, 0xfe]);

/** UTF-16 big-endian byte order mark, 0xFE 0xFF. */
export const BOM_BE = new Uint8Array([0xfe, 0xff]);

/**
 * Returns true when `bytes` starts with `bom`.
 *
 * We compare byte-by-byte rather than slicing to avoid allocating a subarray
 * just to run a two-byte check; it keeps the hot path allocation-free.
 *
 * @param {Uint8Array} bytes
 * @param {Uint8Array} bom
 * @returns {boolean}
 */
export function startsWithBom(bytes, bom) {
  if (bytes.length < bom.length) return false;
  for (let i = 0; i < bom.length; i++) {
    if (bytes[i] !== bom[i]) return false;
  }
  return true;
}

/**
 * Returns true when `bytes` begins with a UTF-16 BOM (either endian).
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export function hasBom(bytes) {
  return hasBomLE(bytes) || hasBomBE(bytes);
}

/**
 * Returns true when `bytes` begins with the little-endian BOM (0xFF 0xFE).
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export function hasBomLE(bytes) {
  return startsWithBom(bytes, BOM_LE);
}

/**
 * Returns true when `bytes` begins with the big-endian BOM (0xFE 0xFF).
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export function hasBomBE(bytes) {
  return startsWithBom(bytes, BOM_BE);
}

/**
 * Returns a new `Uint8Array` with any leading UTF-16 BOM removed. If no BOM is
 * present the input is returned untouched (same reference) so callers can use
 * this unconditionally without paying for a copy on clean input.
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function stripBom(bytes) {
  if (hasBomLE(bytes) || hasBomBE(bytes)) {
    return bytes.subarray(2);
  }
  return bytes;
}

/**
 * Returns a new `Uint8Array` with the little-endian BOM prepended.
 * If a BOM of either endianness is already present, it is replaced rather than
 * stacked, so the result always carries exactly one BOM.
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function addBomLE(bytes) {
  const body = stripBom(bytes);
  const out = new Uint8Array(body.length + 2);
  out.set(BOM_LE, 0);
  out.set(body, 2);
  return out;
}

/**
 * Returns a new `Uint8Array` with the big-endian BOM prepended.
 * If a BOM of either endianness is already present, it is replaced rather than
 * stacked, so the result always carries exactly one BOM.
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function addBomBE(bytes) {
  const body = stripBom(bytes);
  const out = new Uint8Array(body.length + 2);
  out.set(BOM_BE, 0);
  out.set(body, 2);
  return out;
}

/**
 * Swaps the byte order of every 16-bit code unit in `bytes`. The input is
 * assumed to be a clean UTF-16 stream with no leading BOM; a trailing odd byte
 * is left untouched (carried over) rather than silently dropped, so callers
 * can detect malformed input by checking `out.length` afterwards.
 *
 * We deliberately do *not* strip a BOM here: `swapByteOrder` is the primitive
 * that `toUTF16LE` / `toUTF16BE` build on, and they need to know whether the
 * original had a BOM to decide what to emit. Folding BOM handling into the
 * swap would force an allocation and a re-scan for no benefit.
 *
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function swapByteOrder(bytes) {
  const pairs = bytes.length >>> 1; // floor(length / 2) without floating point
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < pairs; i++) {
    out[i * 2] = bytes[i * 2 + 1];
    out[i * 2 + 1] = bytes[i * 2];
  }
  if (bytes.length & 1) {
    out[bytes.length - 1] = bytes[bytes.length - 1];
  }
  return out;
}

/**
 * Converts a UTF-16 byte stream to little-endian.
 *
 * If a BOM is present it is honoured and the output gets a fresh LE BOM.
 * If no BOM is present the input is assumed to already be little-endian, so
 * the bytes are emitted unchanged with a new LE BOM prepended. If a BE BOM is
 * present (with or without a body) the remainder is byte-swapped.
 *
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function toUTF16LE(bytes) {
  if (hasBomBE(bytes)) {
    return addBomLE(swapByteOrder(bytes.subarray(2)));
  }
  if (hasBomLE(bytes)) {
    // Already LE with a BOM; normalise by re-adding a clean BOM over the old one.
    return addBomLE(bytes.subarray(2));
  }
  // No BOM: assume the body is already LE.
  return addBomLE(bytes);
}

/**
 * Converts a UTF-16 byte stream to big-endian. Mirrors `toUTF16LE`.
 *
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function toUTF16BE(bytes) {
  if (hasBomLE(bytes)) {
    return addBomBE(swapByteOrder(bytes.subarray(2)));
  }
  if (hasBomBE(bytes)) {
    return addBomBE(bytes.subarray(2));
  }
  // No BOM: assume the body is already BE.
  return addBomBE(bytes);
}
