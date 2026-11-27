// Run with: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { SOLVED, applyAlg, isPllState } from "../cube.js";
import { PLLS, identifyPll, toHostFrame } from "../pll.js";

test("basic move identities", () => {
  for (const f of "URFDLB") assert.equal(applyAlg(SOLVED, `${f} ${f} ${f} ${f}`), SOLVED);
  assert.equal(applyAlg(SOLVED, "R U R' U' ".repeat(6)), SOLVED);
  assert.notEqual(applyAlg(SOLVED, "R U R' U' ".repeat(3)), SOLVED);
  assert.equal(applyAlg(applyAlg(SOLVED, "R U F2 D' L B"), "B' L' D F2 U' R'"), SOLVED);
});

test("Kociemba layout: U turn moves F top row to L, R turn moves F right column to U", () => {
  const afterU = applyAlg(SOLVED, "U");
  assert.equal(afterU.slice(36, 39), "FFF"); // L top row now green
  assert.equal(afterU.slice(18, 21), "RRR"); // F top row now red
  const afterR = applyAlg(SOLVED, "R");
  assert.equal([2, 5, 8].map((i) => afterR[i]).join(""), "FFF"); // U right column now green
});

test("every reference alg is a PLL from solved and is not an AUF", () => {
  for (const { name, alg } of PLLS) {
    const s = applyAlg(SOLVED, toHostFrame(alg));
    assert.ok(isPllState(s), `${name} leaves F2L/OLL broken`);
    assert.equal(identifyPll(SOLVED, s), name, `${name} is identified as ${identifyPll(SOLVED, s)}`);
  }
});

test("the 21 cases plus AUF partition all 288 last-layer permutations", () => {
  const seen = new Set([SOLVED]);
  const queue = [SOLVED];
  const gens = [...PLLS.map((p) => toHostFrame(p.alg)), "D"];
  while (queue.length) {
    const s = queue.pop();
    for (const g of gens) {
      const t = applyAlg(s, g);
      if (!seen.has(t)) { seen.add(t); queue.push(t); }
    }
  }
  assert.equal(seen.size, 288);
  const counts = {};
  for (const s of seen) {
    const name = identifyPll(SOLVED, s);
    assert.ok(name, "unclassified state");
    counts[name] = (counts[name] || 0) + 1;
  }
  assert.equal(Object.keys(counts).length, 22);
  // Number of last-layer states per case (post-AUF included): 4x the usual "n/72".
  const expected = { AUF: 4, H: 4, Z: 8, E: 8, Na: 4, Nb: 4, V: 16, Y: 16, T: 16, F: 16,
    Aa: 16, Ab: 16, Ja: 16, Jb: 16, Ra: 16, Rb: 16, Ua: 16, Ub: 16, Ga: 16, Gb: 16, Gc: 16, Gd: 16 };
  assert.deepEqual(counts, expected);
});

// Edges-only and corners-only cases, checked against piece movement to catch a
// wrongly transcribed reference alg.
test("edge-only and corner-only cases move only edges / corners", () => {
  const edgeSides = [25, 43, 16, 52]; // side stickers of the yellow-layer edges
  const cornerSides = [24, 26, 15, 17, 51, 53, 42, 44];
  // Mark every sticker uniquely, apply alg + every post-AUF.
  const marked = Array.from({ length: 54 }, (_, i) => String.fromCharCode(48 + i)).join("");
  for (const { name, alg } of PLLS) {
    const results = ["", "D", "D2", "D'"].map((auf) => applyAlg(marked, `${toHostFrame(alg)} ${auf}`));
    const edgesFixed = results.some((r) => edgeSides.every((i) => r[i] === marked[i]));
    const cornersFixed = results.some((r) => cornerSides.every((i) => r[i] === marked[i]));
    assert.equal(cornersFixed, ["Ua", "Ub", "H", "Z"].includes(name), `${name} corners`);
    assert.equal(edgesFixed, ["Aa", "Ab", "E", "H"].includes(name), `${name} edges`); // H + U2 only moves corners
  }
});

test("Ua and Ub are inverses, Aa and Ab are inverses, from either side", () => {
  const ua = applyAlg(SOLVED, toHostFrame("R U' R U R U R U' R' U' R2"));
  assert.equal(identifyPll(ua, SOLVED), "Ub");
  const aa = applyAlg(SOLVED, toHostFrame("R' F R' B2 R F' R' B2 R2"));
  assert.equal(identifyPll(aa, SOLVED), "Ab");
});

test("detection is independent of AUF, the starting state and y rotations", () => {
  const start = applyAlg(SOLVED, toHostFrame("R U R' U' R' F R2 U' R' U' R U R' F' U")); // T + AUF
  // Jb done from the back (y2 = relabel R<->L, F<->B in the player's frame)
  const jbFromBack = "L U L' B' L U L' U' L' B L2 U' L'";
  const after = applyAlg(start, toHostFrame(`U2 ${jbFromBack} U'`));
  assert.equal(identifyPll(start, after), "Jb");
  // Ja done with a different alg than the reference: R' U L' U2 R U' R' U2 R L
  const ja = applyAlg(start, toHostFrame("R' U L' U2 R U' R' U2 R L"));
  assert.equal(identifyPll(start, ja), "Ja");
});
