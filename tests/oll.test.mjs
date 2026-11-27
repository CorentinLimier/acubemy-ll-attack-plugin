import { test } from "node:test";
import assert from "node:assert/strict";
import { SOLVED, applyAlg, isF2LState, toHostFrame } from "../cube.js";
import { OLL_CASES, OLL_NAMES, identifyOll, yellowMask } from "../oll.js";
import { OLL_ALGS, PLL_ALGS, faceTurns, invert } from "./algs.mjs";

const host = (alg) => toHostFrame(faceTurns(alg));

test("faceTurns: wide, slice moves and rotations as a smart cube sees them", () => {
  assert.equal(faceTurns("r U r'"), "L F L'"); // after r, the player's U is the cube's F
  assert.equal(faceTurns("M2 U M2"), "R2 L2 D R2 L2");
  assert.equal(faceTurns("y R U R'"), "B U B'");
  assert.equal(faceTurns("x y x'"), "");
  // M U M' U and its face-turn version give the same cube.
  assert.equal(applyAlg(SOLVED, host("M' U M U2 M' U M")), applyAlg(SOLVED, host("R' L x U R L' x' U2 R' L x U R L' x'")));
});

test("each case pattern is the state its known alg solves", () => {
  assert.deepEqual(OLL_NAMES, OLL_ALGS.map((a) => a.name));
  assert.equal(new Set(Object.values(OLL_CASES)).size, 57);
  for (const { name, alg } of OLL_ALGS) {
    const state = applyAlg(SOLVED, invert(host(alg)));
    assert.ok(isF2LState(state), `${name}: the alg keeps F2L`);
    assert.equal(yellowMask(state), OLL_CASES[name], `OLL ${name}`);
    assert.equal(identifyOll(state, SOLVED), name);
  }
});

test("the 57 cases plus 'oriented' cover all 216 last-layer orientations", () => {
  const byMask = new Map([[yellowMask(SOLVED), SOLVED]]);
  const queue = [SOLVED];
  const gens = [...OLL_ALGS.map((a) => host(a.alg)), "D"];
  while (queue.length) {
    const s = queue.pop();
    for (const g of gens) {
      const t = applyAlg(s, g);
      if (!byMask.has(yellowMask(t))) { byMask.set(yellowMask(t), t); queue.push(t); }
    }
  }
  assert.equal(byMask.size, 8 * 27); // edge flips x corner twists
  const names = new Set();
  for (const s of byMask.values()) {
    const name = identifyOll(s, SOLVED);
    if (yellowMask(s).startsWith("xxxxxxxxx")) assert.equal(name, null);
    else names.add(name);
  }
  assert.deepEqual([...names].sort(), [...OLL_NAMES].sort());
});

test("detection works from any F2L state, with AUFs and y rotations", () => {
  const start = applyAlg(SOLVED, host("R U R' U R U2 R' U R U R' U' R' F R2 U' R' U' R U R' F'")); // Sune + T perm
  for (const { name, alg } of OLL_ALGS) {
    assert.equal(identifyOll(start, applyAlg(start, host(`U ${alg} U2`))), name, `OLL ${name}`);
    assert.equal(identifyOll(start, applyAlg(start, host(`y2 ${alg} y2`))), name, `OLL ${name} from the back`);
  }
});

test("orientation unchanged: an AUF or a PLL is not an OLL", () => {
  assert.equal(identifyOll(SOLVED, applyAlg(SOLVED, "D")), null);
  for (const { alg } of PLL_ALGS) assert.equal(identifyOll(SOLVED, applyAlg(SOLVED, toHostFrame(alg))), null);
});
