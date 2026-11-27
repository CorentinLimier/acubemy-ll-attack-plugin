import { test } from "node:test";
import assert from "node:assert/strict";
import { COLORS } from "../cube.js";
import { DIAGRAMS } from "../diagram.js";
import { MODES } from "../attack.js";

const yellow = (svg) => svg.match(new RegExp(`fill="${COLORS.D}"`, "g"))?.length ?? 0;

test("each case has a diagram: background, 9 top stickers, 12 side stickers", () => {
  for (const [key, mode] of Object.entries(MODES)) {
    assert.deepEqual(Object.keys(DIAGRAMS[key]), mode.names);
    for (const [name, svg] of Object.entries(DIAGRAMS[key])) assert.equal(svg.match(/<rect /g).length, 1 + 9 + 12, name);
    assert.equal(new Set(Object.values(DIAGRAMS[key])).size, mode.names.length, `${key} diagrams all different`);
  }
});

test("PLL diagrams have a yellow face; OLL diagrams 9 yellow stickers (one per top piece)", () => {
  for (const svg of Object.values(DIAGRAMS.PLL)) assert.equal(yellow(svg), 9);
  for (const [name, svg] of Object.entries(DIAGRAMS.OLL)) assert.equal(yellow(svg), 9, `OLL ${name}`);
});
