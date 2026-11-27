import { test } from "node:test";
import assert from "node:assert/strict";
import { PLL_DIAGRAMS } from "../diagram.js";

// Arrows per case in its cleanest orientation: a swap is one two-headed arrow,
// a 3-cycle is three arrows (G perms: a corner swap and an edge 3-cycle).
const ARROWS = {
  Aa: 3, Ab: 3, E: 2, F: 2, Ga: 5, Gb: 5, Gc: 5, Gd: 5, H: 2, Ja: 2, Jb: 2,
  Na: 2, Nb: 2, Ra: 2, Rb: 2, T: 2, Ua: 3, Ub: 3, V: 2, Y: 2, Z: 2,
};

test("each case diagram shows 20 stickers and its arrows", () => {
  for (const [name, svg] of Object.entries(PLL_DIAGRAMS)) {
    assert.equal(svg.match(/<rect /g).length, 1 + 9 + 12, `${name} stickers`);
    assert.equal(svg.match(/<line /g)?.length ?? 0, ARROWS[name], `${name} arrows`);
  }
});
