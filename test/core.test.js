import { test } from "node:test";
import assert from "node:assert/strict";

import {
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
} from "../src/index.js";

const B = (...arr) => new Uint8Array(arr);

// UTF-16 LE encodes "A" (U+0041) as 41 00, "B" as 42 00, and the BOM as FF FE.
// UTF-16 BE encodes "A" as 00 41 and the BOM as FE FF.

// --- BOM detection -------------------------------------------------------

test("hasBomLE detects an LE BOM", () => {
  assert.equal(hasBomLE(B(0xff, 0xfe, 0x41, 0x00)), true);
});

test("hasBomLE does not fire on a BE BOM", () => {
  assert.equal(hasBomLE(B(0xfe, 0xff, 0x00, 0x41)), false);
});

test("hasBomBE detects a BE BOM", () => {
  assert.equal(hasBomBE(B(0xfe, 0xff, 0x00, 0x41)), true);
});

test("hasBom returns true for either endian", () => {
  assert.equal(hasBom(B(0xff, 0xfe)), true);
  assert.equal(hasBom(B(0xfe, 0xff)), true);
  assert.equal(hasBom(B(0x41, 0x00)), false);
});

test("BOM detection returns false when fewer than two bytes are present", () => {
  assert.equal(hasBom(B(0xff)), false);
  assert.equal(hasBomLE(B(0xff)), false);
  assert.equal(hasBomBE(B(0xfe)), false);
});

// --- stripBom -------------------------------------------------------------

test("stripBom removes an LE BOM", () => {
  assert.deepEqual(stripBom(B(0xff, 0xfe, 0x41, 0x00)), B(0x41, 0x00));
});

test("stripBom removes a BE BOM", () => {
  assert.deepEqual(stripBom(B(0xfe, 0xff, 0x00, 0x41)), B(0x00, 0x41));
});

test("stripBom leaves input without a BOM untouched by reference", () => {
  const input = B(0x41, 0x00, 0x42, 0x00);
  assert.equal(stripBom(input), input);
});

// --- addBomLE / addBomBE --------------------------------------------------

test("addBomLE prepends an LE BOM to clean input", () => {
  assert.deepEqual(addBomLE(B(0x41, 0x00)), B(0xff, 0xfe, 0x41, 0x00));
});

test("addBomLE replaces an existing BE BOM instead of stacking", () => {
  assert.deepEqual(addBomLE(B(0xfe, 0xff, 0x00, 0x41)), B(0xff, 0xfe, 0x00, 0x41));
});

test("addBomBE prepends a BE BOM to clean input", () => {
  assert.deepEqual(addBomBE(B(0x00, 0x41)), B(0xfe, 0xff, 0x00, 0x41));
});

test("addBomLE on just a BOM produces a single BOM", () => {
  assert.deepEqual(addBomLE(B(0xfe, 0xff)), B(0xff, 0xfe));
  assert.deepEqual(addBomLE(B(0xff, 0xfe)), B(0xff, 0xfe));
});

// --- swapByteOrder --------------------------------------------------------

test("swapByteOrder swaps every 16-bit unit", () => {
  assert.deepEqual(swapByteOrder(B(0x41, 0x00, 0x42, 0x00)), B(0x00, 0x41, 0x00, 0x42));
});

test("swapByteOrder carries a trailing odd byte untouched", () => {
  assert.deepEqual(swapByteOrder(B(0x41, 0x00, 0xff)), B(0x00, 0x41, 0xff));
});

test("swapByteOrder on an empty array returns an empty array", () => {
  assert.deepEqual(swapByteOrder(B()), B());
});

// --- toUTF16LE / toUTF16BE ------------------------------------------------

test("toUTF16LE byte-swaps a BE-coded body and emits an LE BOM", () => {
  const beBody = B(0xfe, 0xff, 0x00, 0x41); // BE BOM + "A"
  assert.deepEqual(toUTF16LE(beBody), B(0xff, 0xfe, 0x41, 0x00));
});

test("toUTF16BE byte-swaps an LE-coded body and emits a BE BOM", () => {
  const leBody = B(0xff, 0xfe, 0x41, 0x00); // LE BOM + "A"
  assert.deepEqual(toUTF16BE(leBody), B(0xfe, 0xff, 0x00, 0x41));
});

test("toUTF16LE on input with no BOM assumes LE and just adds a BOM", () => {
  assert.deepEqual(toUTF16LE(B(0x41, 0x00)), B(0xff, 0xfe, 0x41, 0x00));
});

test("toUTF16BE on input with no BOM assumes BE and just adds a BOM", () => {
  assert.deepEqual(toUTF16BE(B(0x00, 0x41)), B(0xfe, 0xff, 0x00, 0x41));
});

test("toUTF16LE on input that already has an LE BOM keeps endianness and re-emits the BOM", () => {
  const input = B(0xff, 0xfe, 0x41, 0x00);
  assert.deepEqual(toUTF16LE(input), B(0xff, 0xfe, 0x41, 0x00));
});

test("round-trip toUTF16LE(toUTF16BE(x)) preserves a LE-coded body", () => {
  const original = B(0xff, 0xfe, 0x41, 0x00, 0x42, 0x00); // LE BOM + "AB"
  const be = toUTF16BE(original);
  const back = toUTF16LE(be);
  assert.deepEqual(back, original);
});

test("toUTF16LE on a lone BE BOM produces a lone LE BOM", () => {
  assert.deepEqual(toUTF16LE(B(0xfe, 0xff)), B(0xff, 0xfe));
});

test("BOM constants are the expected two bytes", () => {
  assert.deepEqual(BOM_LE, B(0xff, 0xfe));
  assert.deepEqual(BOM_BE, B(0xfe, 0xff));
});
