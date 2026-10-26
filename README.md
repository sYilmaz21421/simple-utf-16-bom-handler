# simple-utf-16-bom-handler

Detects, adds, and removes UTF-16 byte order marks and converts between UTF-16LE and UTF-16BE. All input and output is `Uint8Array`; there is no `Buffer` or `TextDecoder` dependency.

```js
import {
  hasBom,
  stripBom,
  addBomLE,
  toUTF16BE,
} from "simple-utf-16-bom-handler";

const le = new Uint8Array([0xff, 0xfe, 0x41, 0x00]); // LE BOM + "A"

if (hasBom(le)) {
  const be = toUTF16BE(le); // swap to big-endian, emit a BE BOM
  const body = stripBom(be); // drop the BOM for transport
  const tagged = addBomLE(body); // re-tag as little-endian
}
```

## Why

Dealing with UTF-16 files by hand means tripping over BOMs: a file may carry one, may carry the wrong endian, or may carry none and still be "little-endian by convention". This library makes one decision and sticks to it: if a BOM is present it is honoured, if one is absent the input is assumed to match the target endianness. There is no sniffing of content, no encoding detection beyond the two-byte BOM.

## Edge cases

- Input shorter than two bytes never matches as a BOM.
- `stripBom` returns the original array reference when there is nothing to strip, so wrapping clean data is free.
- `swapByteOrder` leaves a trailing odd byte in place rather than dropping it; callers can detect malformed UTF-16 by checking the output length.
- When a BOM is added to bytes that already carry one, the old BOM is replaced, never stacked.

## Exported names

`BOM_LE`, `BOM_BE`, `hasBom`, `hasBomLE`, `hasBomBE`, `stripBom`, `addBomLE`, `addBomBE`, `swapByteOrder`, `toUTF16LE`, `toUTF16BE`.

Run the tests with `node --test`.
