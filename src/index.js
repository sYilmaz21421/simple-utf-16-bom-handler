/**
 * @module simple-utf-16-bom-handler
 *
 * Public surface for the UTF-16 BOM handler. We keep a tiny core and re-export
 * a handful of names so consumers import everything from the package root.
 */
export {
  BOM_LE,
  BOM_BE,
  hasBom,
  hasBomLE,
  hasBomBE,
  stripBom,
  addBomLE,
  addBomBE,
  swapByteOrder,
  toUTF16LE,
  toUTF16BE,
} from "./core.js";
