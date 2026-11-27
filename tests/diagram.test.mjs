import { test } from "node:test";
import assert from "node:assert/strict";
import { PLL_DIAGRAMS } from "../diagram.js";
import { PLL_NAMES } from "../pll.js";

test("each case has a diagram: background, 9 yellow stickers, 12 side stickers, no arrows", () => {
  assert.deepEqual(Object.keys(PLL_DIAGRAMS), PLL_NAMES);
  for (const [name, svg] of Object.entries(PLL_DIAGRAMS)) {
    assert.equal(svg.match(/<rect /g).length, 1 + 9 + 12, name);
    assert.equal(svg.match(/fill="#ffd500"/g).length, 9, `${name} yellow face`);
    assert.doesNotMatch(svg, /<line /, name);
  }
});

test("the 21 diagrams are all different", () => {
  assert.equal(new Set(Object.values(PLL_DIAGRAMS)).size, 21);
});
